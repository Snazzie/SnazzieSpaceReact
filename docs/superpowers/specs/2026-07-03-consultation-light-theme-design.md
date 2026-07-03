# Consultation page: light/dark theme toggle

**Date:** 2026-07-03
**Scope:** `/consultation` page only (`Website/src/pages/consultation/index.astro` + `Website/src/components/consultation/*`). `tos.astro`, main page, articles, radio, stealthvault: unchanged.

## Goal

Add a light theme to the consultation page with a nav toggle. **Light is the default** for first-time visitors; the toggle switches to dark and the choice persists in `localStorage` (key `snz-theme`). No tracking, pure client-side. Dark mode must remain pixel-identical to today.

## Approach

Semantic CSS variables + mechanical replacement (approach A from brainstorm).

### 1. Palette variables

Defined once in the consultation page's global style block. `:root` holds the light palette; `html[data-theme="dark"]` holds today's exact dark values.

| Variable | Dark (today's values) | Light (new) |
|---|---|---|
| `--bg0` | `#0a0a0a` | `#f4f3ee` (page) |
| `--bg1` | `#0b0b0b` | `#f1f0ea` |
| `--bg2` | `#0c0c0c` | `#edece6` (cards) |
| `--bg3` | `#0e0e0e` | `#e9e8e1` |
| `--bg4` | `#101010` | `#e5e4dd` (hover) |
| `--bg5` | `#141414` | `#e0dfd8` (inputs/url pill) |
| `--ink0` | `#f2f0ea` | `#141410` (headlines) |
| `--ink1` | `#cfcfc7` | `#33332c` (body) |
| `--ink2` | `#c4c4bc` | `#3d3d35` |
| `--ink3` | `#9a9a92` | `#55554c` (muted) |
| `--ink4` | `#8a8a82` | `#5e5e55` |
| `--ink5` | `#7c7c74` | `#6a6a60` (dim) |
| `--ink6` | `#6a6a62` | `#787870` (labels) |
| `--ink7` | `#3a3a36` | `#b5b4ac` (faintest) |
| `--line-rgb` | `255,255,255` | `12,12,8` (border/line alpha base) |
| `--accent` | `#C6F432` (unchanged) | `#C6F432` (fills/buttons, dark ink on top) |
| `--accent-rgb` | `198,244,50` | `112,140,10` (tints/glows, darker so washes read on paper) |
| `--accent-text` | `#C6F432` | `#5f7d0c` (small text/kickers, contrast-safe on light bg) |
| `--ink` (button text on accent) | `#0a0a0a` (unchanged) | `#0a0a0a` |

Light values are starting points; final values tuned visually in the browser during implementation. Comparison tone colors (`#c9a227` mid, `#9a3b3b` bad) get light-legible variants (`--tone-mid`, `--tone-bad`).

### 2. Mechanical replacement

Across all consultation `.astro` files, `BuildFlow.css`, `buildflow.ts`:

- `rgba(255,255,255,` and `rgba(255, 255, 255,` → `rgba(var(--line-rgb),` (~300 sites)
- `rgba(198,244,50,` → `rgba(var(--accent-rgb),` (~90 sites)
- Each grey/bg hex → its variable (case-insensitive)
- `text-[var(--accent)]` kicker/label usages → `text-[var(--accent-text)]`; accent as background/fill stays `var(--accent)`
- Gradients from dark hexes (e.g. verdict bands `linear-gradient(90deg, rgba(198,244,50,.1), #0a0a0a)`) become var-based and inherit both themes

### 3. JS-applied colors (`buildflow.ts`)

- Colors set as DOM/SVG style strings or attributes: replace with `var(--x)` strings (browsers resolve them in styles; `stroke`/`fill` presentation attributes move to `style` where needed).
- Colors used in contexts that can't resolve `var()` (canvas 2D, GSAP color interpolation targets): read via `getComputedStyle(document.documentElement).getPropertyValue()` at boot and re-read on theme change (custom `snz-theme-change` event dispatched by the toggle).

### 4. Toggle

- Sun/moon icon button in consultation `Nav.astro` (also reachable on mobile), `aria-label` swaps, no layout shift.
- Click: flips `data-theme` on `<html>`, writes `localStorage.snz-theme`, dispatches `snz-theme-change`.
- **No-flash boot:** tiny inline `<script>` in `<head>` of `consultation/index.astro`, before CSS paint: read `localStorage.snz-theme`; `dark` → set `data-theme="dark"`; anything else → light (default). Also set `color-scheme` accordingly.
- `<meta name="theme-color">` updated per theme if present.

### 5. Things that need eyes, not sed

- Wireframe wall (`WireColumns` + `#snz-wbg`): line opacities tuned for dark; re-tune light.
- BuildFlow pinned scene (SVG flow, progress bars, phase captions): verify every stage legible in light.
- Statement section ghost text + slide rows.
- Hero, grain/vignette overlays if any.
- Media cards (RaceIQ video, screenshots): dark media in framed cards on light bg is fine; verify borders.
- `PICK ME` / `HANDS-OFF` accent chips: lime bg + dark text works on both; verify.

## Error handling

- `localStorage` unavailable (private mode): toggle still flips the class for the session, persist attempt wrapped in try/catch.
- No-JS: page renders light (default `:root` palette), toggle simply doesn't work. Acceptable.
- `prefers-reduced-motion` paths unaffected.

## Testing

- `bun run build` passes.
- Manual browser pass (Chrome DevTools MCP): both themes, full scroll through BuildFlow, mobile viewport, toggle persistence across reload, no FOUC on hard reload in both saved states.
- Dark mode diff check: computed colors of key elements match today's values.

## Out of scope

- `consultation/tos.astro` (separate shadcn token system, stays dark)
- System `prefers-color-scheme` detection (explicit user decision: default light)
- Any other page
