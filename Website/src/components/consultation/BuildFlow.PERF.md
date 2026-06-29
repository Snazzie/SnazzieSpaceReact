# BuildFlow — scroll performance notes

The consultation "THE BUILD" section (`BuildFlow.astro` + `BuildFlow.css` + `buildflow.ts`) is a
scroll-driven SVG/DOM story with a full-screen animated marquee. It is the heaviest thing on the
site to run while scrolling. This documents what costs what, the fixes already applied, and how to
re-profile so future changes do not regress it.

## How to profile (chrome-devtools MCP)

The standard cold-load Core-Web-Vitals workflow is the WRONG tool here — the cost is **runtime,
during scroll**, not load. Profile like this:

1. `bun dev`, navigate to `/consultation`.
2. `emulate({cpuThrottlingRate: 4})` (or 6) — this Mac runs the section at ~87fps unthrottled, so
   throttling is required to expose the cost.
3. Park the scroll inside the section first — the ENGINE overlay (`#snz-purpose`) only fades in
   while scrolling through p≈0.10–0.45, and its opacity is GSAP-eased, so stepped `scrollTo`
   sampling won't see it. Hold a position with a `requestAnimationFrame` loop to let gates settle.
4. `performance_start_trace({reload:false, autoStop:false})`, run a scripted slow scroll across the
   region of interest, `performance_stop_trace()`.
5. `performance_analyze_insight(ForcedReflow)` and check `DOMSize`.

**Gotcha:** an `evaluate_script` scroll harness that calls `getComputedStyle`/`offsetWidth` each
frame forces its own reflows and shows up as `step @ pptr:evaluateHandle` in the trace — that is the
measurement, not the app. Ignore those entries. Likewise, eval-loop fps numbers are too noisy
run-to-run (thermal) to trust for small deltas — trust the trace.

## Root cause of the scroll-transition lag: forced reflows (NOT paint)

The "lags when scrolling through each animation change" symptom was **synchronous forced layout** on
a large DOM (`DOMSize` was also flagged), not the marquee paint. Two culprits, both fixed:

1. **`apply()` read layout every frame for values it rarely used.** `gCore`/`purProdi`
   `getBoundingClientRect()` + `offsetWidth/offsetHeight` were read at the top of every frame, but
   they are consumed ONLY in the view4→card handoff branch (`hand > 0`, p ≥ 0.50). The whole ENGINE
   phase (p ≈ 0.10–0.45, where the stage transitions are) forced a full-DOM layout each frame for
   nothing. **Fix:** gate the reads behind `(p >= 0.49 || purHandLast > 0.001)` where `purHandLast`
   is the previous frame's `hand` value (so it stays alive while the handoff eases back on scroll-up).
2. **`purPlop` forced a sync reflow on every stage flip.** It restarted the `.pur-pl` pop animations
   with `void offsetWidth`, which re-laid-out the whole sticky section (incl. the 230vmax marquee) —
   the spike frame at each transition. **Fix:** restart by removing `.go` then re-adding it across a
   double-`requestAnimationFrame` (no synchronous layout; pop just retriggers ~1 frame later).

After both, the `ForcedReflow` insight no longer lists `apply` or `purPlop` during the ENGINE phase.

## Other fixes applied (same investigation)

- **Scroll smoothing (scrub).** The ticker drove the scrubbed camera/backend seeks off raw
  `st.progress`, which advances in uneven bursts under trackpad/wheel input → the morph stuttered
  even at full fps. Now `pSmooth += (st.progress - pSmooth) * min(1, dt/SCRUB)` (SCRUB = 0.3s,
  GSAP-scrub feel) drives all of `apply()`; snaps onto the target when idle. Tune SCRUB up = smoother
  but laggier.
- **DATA-stage disco → one-shot reveal cascade.** `data-cat="all"` used to run an infinite per-word
  `pur-disco` color pulse on all ~416 clipped-text words = continuous repaint. Now `pur-reveal`
  runs ONCE: words start black, flash white on a staggered `--fd` delay, latch lit (lime) via
  `both` fill-mode. Once the cascade finishes (~4.8s) nothing animates → zero steady-state repaint.
- **No gray flash on category switches.** The `.pur-it` hidden state used a gray fill, so words
  transitioned lime→gray on the way out (e.g. all→cms) = visible gray flash. Hidden fill is now the
  lit colour (text transparent → gradient shows; icon accent), so fade-outs stay lime. Also removed
  `-webkit-text-fill-color` from the `.pur-it` transition (opacity-only) so a stage flip does not
  re-raster all 416 clipped words for 0.5s.

## Steady-state cost (the marquee) — separate, mostly intrinsic

Independently of transitions, the marquee `#snz-purpose .pur-bg` is ~85% of the per-frame scroll
cost (hiding it: ~20fps → ~119fps at 6×). Measured dead-ends, **do not retry**:

- `will-change:transform` on `.pur-row` → 4× worse raster (rows are ~13000px wide → giant GPU
  texture). Never promote the rows.
- Swapping the shimmer's `--shim` custom-prop animation for a `background-position` keyframe → no-op.
- `content-visibility:auto` on rows → no-op (all rows sit in the central masked strip, none cullable).
- Removing the radial `mask-image` → negligible (~5%).

The only large wins there cost the visual (fewer rows/words, or dropping the per-word shimmer), so
they are left to a deliberate design call. The reveal-cascade change above already removed the
DATA-stage disco repaint, which was the worst offender.

## Invariants to preserve

- Keep marquee rows narrow (16 items ×2) — a row wider than the GPU max texture (~16384px) gets
  clipped and glyphs past the limit render black. Density comes from MORE ROWS, not wider rows.
- Per-word `background-clip:text` (not per-row) — a row-level clip becomes one oversized texture and
  hits the same clip bug.
- Don't push the per-frame-rect handoff, the eased trigger gates, or the geometry-coupled bar reveals
  into GSAP — they are a scroll-driven state machine, not tweens. See the engine split note.
