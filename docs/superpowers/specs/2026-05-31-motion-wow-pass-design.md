# Motion "Wow" Pass — Design

**Date:** 2026-05-31
**Status:** Approved (pending spec review)
**Branch:** astro-shadcn-migration

## Goal

Redesign the personal site into the layout validated in the browser mockups, elevated with
motion and craft, while staying in the current minimal-black aesthetic. No color/theme change
and no literal space motif. The hero is rebuilt (wordmark dropped, large kinetic "Aaron" lede,
eyebrow + tagline) and the projects section adopts logo-tile cards (first featured full-width).
The wow comes from choreographed entrances, a subtle interactive cursor field, kinetic
typography, scroll-driven reveals, and consistent micro-interactions.

**Correction (post-review):** the first implementation pass layered motion onto the *old*
layout. The user wanted the page rebuilt to match the approved mockups — this spec and the
implementation were revised accordingly.

Validated interactively via browser mockups (hero + projects); the user approved the feel
and intensity of both.

## Constraints

- **Theme:** Minimal black (current). Wow via craft, not decoration. No space/cosmic imagery.
- **Match the mockups:** Hero and projects layout follow the approved browser mockups.
- **Preserve semantics:** Same projects/data, same sections (Nav, Intro, Projects); the
  compact-card tap-to-expand and supersede behavior in `ProjectCard` is kept.
- **Performance:** One dependency only. No layout thrash; animate transform/opacity.
- **Accessibility:** Every motion path honors `prefers-reduced-motion`.
- **Verification:** `tsc -b && vite build` must pass (CI parity). No `any` types.

## Stack & Dependency

- Existing: Astro + React 19 + Tailwind v4 + shadcn, always-dark (`.dark` on `<html>`).
- Add one dependency: `motion` (the current package; import from `motion/react`).
  Installed with Bun (`bun add motion`).

## Motion System (shared tokens)

A single module `src/lib/motion.ts` exports the shared vocabulary so every component moves
on the same curve:

- `EASE` — the primary easing tuple `[0.2, 0.7, 0.2, 1]` (matches the mockups).
- `rise` — reusable variant: `{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }`.
- `stagger(delayChildren?, staggerChildren?)` — helper returning a container transition.
- Duration constants (`D.fast`, `D.base`, `D.slow`).

Reduced motion: components call `useReducedMotion()` from `motion/react`. When true, reveals
resolve to their final state with no transform and zero/instant duration, the cursor field
does not mount, and the portrait orbit/breathe loops are disabled.

## Components

### New — `CursorField` (`src/components/CursorField.tsx`)

- Fixed, full-viewport layer rendered once in `index.astro` with `client:load`, positioned
  behind all content (`z-0`, `pointer-events-none`).
- Two stacked layers driven by pointer position (CSS custom properties `--mx`, `--my` set on
  a `pointermove` listener, throttled via `requestAnimationFrame`):
  - **Dot grid:** `radial-gradient` dots, revealed only near the cursor via a radial
    `mask-image` centered on `--mx/--my`.
  - **Glow:** a soft radial highlight following the cursor.
- Does not mount (renders `null`) when `prefers-reduced-motion` is set or the primary pointer
  is coarse (`matchMedia('(pointer: coarse)')`) — i.e. touch devices get a clean static page.
- Self-contained: no props, no external state. Cleans up its listener on unmount.

### Rework — `Intro` (`src/components/Intro.tsx`)

- Hydration changes from static to `client:load` in `index.astro` (above the fold; entrance
  must run immediately).
- Choreographed entrance sequence on mount, all on `EASE`:
  1. Eyebrow label ("Software Developer · England") rises.
  2. **Kinetic name** — "Aaron" splits into characters, each rising from an `overflow:hidden`
     clip with a per-character delay.
  3. Role line types in (steps animation) with a blinking caret that then disappears.
  4. Bio paragraph rises.
  5. Skill badges stagger in.
  6. CTA row rises.
- Portrait: breathing radial glow + a slow rotating ring (`22s` linear), both loop-disabled
  under reduced motion.
- Micro-interactions: badges lift on hover; CTA lifts + soft glow + arrow nudge on hover.
- Preserve all existing content, links, and the responsive two-column → stacked layout.
- Existing structure preserved: `id="home"`, `id="aboutme"` anchor targets stay.

### Enhance — `Projects` (`src/components/Projects.tsx`) and `ProjectCard`

- `Projects` stays `client:visible`. Existing grids unchanged: featured grid
  (`sm:grid-cols-2 lg:grid-cols-3`), "More projects" grid (`sm:grid-cols-2`), and the
  section headings.
- **Scroll reveal:** each card wrapped so it rises + fades in when it enters the viewport
  (motion `whileInView`, `viewport={{ once: true, amount: 0.2 }}`), with a small per-item
  stagger. Section headings reveal too.
- **Card hover (featured):** lift + border brighten already partly present — keep and refine;
  add a `→` (or reuse existing `ArrowUpRight`) that slides in on hover.
- **Cursor spotlight:** a soft radial highlight tracks the pointer *inside* each card
  (CSS custom props `--cx/--cy` set on the card's `pointermove`, shown only on hover).
- **Compact cards:** the existing tap-to-expand / supersede badge logic is untouched; only the
  reveal-on-scroll wrapper and the spotlight are added. Hook order in `ProjectCard` stays stable.
- All reveals and the spotlight are gated by reduced motion (reveal → immediate final state;
  spotlight listener not attached).

### Subtle — `Nav` (`src/components/Nav.tsx`)

- Becomes a client component (`client:load`) for the small enhancements:
  - Slides down from the top on load.
  - Active-link indicator (underline / brightened text) tracks the section in view via an
    IntersectionObserver over `#home` / `#aboutme` / `#projects`.
- Keep the fixed, blurred, bordered bar and existing links exactly. Reduced motion skips the
  slide-in (renders in place); the active-link tracking remains (it is not motion).

## Hydration Strategy

| Component   | Directive       | Why                                              |
|-------------|-----------------|--------------------------------------------------|
| CursorField | `client:load`   | Global pointer layer, present from first paint   |
| Nav         | `client:load`   | Slide-in + active tracking from first paint      |
| Intro       | `client:load`   | Above-the-fold entrance must run immediately     |
| Projects    | `client:visible`| Below the fold; hydrate when scrolled near       |

## Accessibility & Performance

- `prefers-reduced-motion: reduce` → no entrance transforms, no loops, no cursor field; the
  page is fully usable and identical in content.
- Touch / coarse-pointer devices skip the cursor field entirely.
- Animate only `transform` and `opacity`; use `will-change` sparingly on the portrait/glow.
- Pointer handlers throttled with `requestAnimationFrame`; listeners cleaned up on unmount.
- No CLS: reserved space for the hero/portrait; reveals animate opacity/transform, not layout.

## Testing & Verification

- `tsc -b && vite build` passes (no `any`, strict types) — the project's CI-parity gate.
- Existing `projects.test.ts` (vitest) continues to pass; no data-layer changes.
- Manual check: entrance plays once; reduced-motion path renders instantly; touch device has
  no cursor field; scroll reveals fire once; hover spotlight tracks correctly.

## Out of Scope

- New sections or new projects; data-model changes.
- Color or theme changes; any space/cosmic visual motif.
- SEO or routing changes.
