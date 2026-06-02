# Tech Stack — Isometric Snap-Grid Redesign

**Date:** 2026-06-02
**Component:** `Website/src/components/TechStack.tsx`
**Status:** Approved design, pending implementation plan

## Goal

Redesign the Tech Stack section so the group cards read as modular slabs on a
subtle isometric pegboard, and animate them "clicking into place" — a slow,
resistive approach that ends in a stiff snap. The snap feel applies both on
scroll-into-view (entrance) and on hover (interaction).

## Decisions (locked)

- **Scope:** Full section redesign (layout + motion). Tech tiles inside cards
  keep their current styling/hover spotlight; the redesign targets the
  *container* and the *cards*, not the tiles.
- **Modular unit:** The group cards are the pieces that click into place.
- **Resistance-then-snap trigger:** Both — entrance choreography on scroll, plus
  a retained snap feel on hover.
- **Visual metaphor:** Snap-grid / pegboard, rendered on a subtle isometric plane.
- **Isometric intensity:** Subtle lean (~14°), legible without counter-rotating
  text. Flattens to 2D on mobile and reduced-motion.
- **Slab depth:** Thin extruded edge (a few px) — physical but minimal.

## Visual design

### Pegboard floor
- A faint dotted grid drawn with a CSS `radial-gradient` background (dot pattern),
  edge-faded using a `mask-image` radial/linear fade so it dissolves at the
  section borders.
- The grid sits on the tilted plane (see isometric transform below) as a
  backplate behind the cards. New small sub-component, e.g. `Pegboard`.

### Isometric transform
- Applied to the grid container: `perspective(...)` on the parent +
  `rotateX(~14deg) rotateZ(~-4deg)` on the plane.
- Angle chosen so text/icons stay readable without counter-rotation.
- Tokenized in `src/lib/motion.ts` (e.g. `ISO` angle constants) for tunability.

### Slabs (group cards)
- Reuse current card markup (label, count pill, tech tile list).
- Add one **thin extruded edge** via a pseudo-element (`::before`) offset a few
  px down/right with a darker fill, giving a physical module edge.
- Slight per-card `translateZ` variation so cards do not all sit on the exact
  same plane (subtle depth layering).

### Tiles
- Unchanged. Keep existing spotlight gradient + hover scale/brand-color behavior.

## Motion design

### Entrance (resistance → snap), per card, staggered
1. **Resistance phase:** Card starts offset above its slot (raised on Z, lowered
   opacity), drifting down on a slow ease-out — decelerating as if pulled through
   resistance, with a brief hesitation near the end.
2. **Snap phase:** Final gap closes with a stiff, low-damping spring → small
   overshoot → settle.
3. **Lock cue on snap:** Pegboard dots beneath the card flash briefly; a 1px ring
   pulses around the slab; optional tiny scale-pop "tick". No audio.

Implementation: choreographed via Motion variant keyframes + `times` (or a
`useAnimate` sequence) — deterministic, identical each play, transform/opacity
only. Staggered across the 6 cards.

### Hover (reuses the same spring)
- Pointer-enter lifts the slab a few px on Z (rises off the floor).
- Pointer can nudge the slab slightly with elastic resistance (capped travel).
- Pointer-leave snaps it back to its slot with the same stiff spring as the
  entrance snap — consistent feel.

### Shared motion config
- Add to `src/lib/motion.ts`: `SNAP_SPRING` (stiff, low-damping spring config),
  isometric angle tokens, and any resistance-phase duration/ease tokens.

## Responsiveness & accessibility
- `< md` breakpoint **and** `prefers-reduced-motion`: drop the isometric
  transform and all snap motion. Render a flat 2D pegboard grid; cards fade in.
- Existing `useReducedMotion()` wiring is reused.
- All motion is transform/opacity only — GPU-cheap, no layout shift.

## Code shape
- Rewrite `Website/src/components/TechStack.tsx`.
- New sub-component for the pegboard backplate.
- Slab = wrapper around existing card markup with the extruded-edge pseudo layer.
- Extend `src/lib/motion.ts` with `SNAP_SPRING`, `ISO` angle tokens, resistance
  tokens.
- `src/data/stack.ts` unchanged.

## Verification
- `cd Website && bun run build` (astro + tsc strict).
- `bun test` (vitest).
- Manual: check entrance snap, hover snap, mobile flatten, reduced-motion fallback.

## Out of scope
- No change to tile styling/data.
- No audio.
- No new dependencies (Motion is already present).
