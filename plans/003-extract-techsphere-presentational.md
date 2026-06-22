# Plan 003: TechSphere's presentational pieces are extracted into focused components

> **Executor instructions**: Follow this plan step by step. Run every verification
> command and confirm the expected result before moving on. If a "STOP condition"
> occurs, stop and report. When done, update the status row for plan 003 in
> `plans/README.md`.
>
> **Drift check (run first)**: from the repo root,
> `git diff --stat 351c7dc..HEAD -- Website/src/components/TechStack.tsx`
> If it changed, compare the "Current state" excerpts below against the live code
> before proceeding; on a real structural mismatch, STOP.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: tech-debt
- **Planned at**: commit `351c7dc`, 2026-06-22

## Why this matters

`Website/src/components/TechStack.tsx` is ~798 lines, almost all of it in one inner
component, `TechSphere` (~lines 83-749). That component mixes three concerns: a
stateful imperative animation core (canvas render loop, pointer-drag physics, the
`itemsRef` per-node state, the focus/constellation refs) and two **purely
presentational** surfaces driven by props/state (the filter UI — constellation rail,
category chips, search box — and the right-hand details card with its three views:
empty / constellation / focused-tech). The presentational surfaces are large, JSX-
heavy, and risk-free to move; isolating them shrinks `TechSphere` to its actual hard
part and makes future edits to the panel or filters local and reviewable.

**This plan deliberately does NOT touch the animation core.** There is no React
component test harness in this repo, so the canvas/drag logic cannot be safely
refactored without a regression net. We extract only the low-risk presentational
JSX, passing the same values down as props, leaving every ref, effect, and the
render loop exactly where they are.

## Current state

`TechStack.tsx` structure today:

- Module-level helpers/data: `GROUP_SHORT`, `PROJECT_BY_TITLE`, `RAIL`,
  `CONST_PROJECTS`, `REVERSE_RELATED`, `usedInFor`, `ItemState` interface (lines 25-81).
- `function TechSphere()` (lines 83-749) — all state/refs/effects, then a single
  `return (<> ... </>)` (lines 473-747) containing, in order:
  1. **Constellation rail** (lines 475-502): `<div className={RAIL}...>` mapping
     `CONST_PROJECTS` to toggle buttons, calling `selectConstellation`.
  2. **Chips + search row** (lines 504-533): category chips from `chips` (computed
     at 457-464) calling `setCat`, plus the search `<input>` bound to `query`/`setQuery`.
  3. **Sphere stage** (lines 535-577): `wrapRef` div, `<canvas ref={canvasRef}>`, and
     the `FLAT.map` of draggable tech buttons wiring `itemsRef.current[i].el`,
     `onPointerDown`, `onClick` → `focusTech`/`clearFocus`. **This is the animation
     core. DO NOT extract or alter it.**
  4. **Details card** (lines 579-741): one `<div aria-live="polite">` with three
     mutually-exclusive views — empty hint (`!focusedTech && !constProject`),
     constellation view (`!focusedTech && constProject`), focused-tech view
     (`focusedTech`). Uses `focusedTech`, `constProject`, `constSet`, `meta`,
     `usedIn`, `relatedSet`, and the callbacks `release`, `clearFocus`, `focusTech`,
     `setModalProject`, `setModalOpen`.
  5. `{modalProject && <ProjectModal .../>}` (lines 744-746).
- `function StaticStack()` (lines 752-781) — reduced-motion fallback, already separate.
- `export function TechStack()` (lines 783-798) — section wrapper, picks
  `reduce ? <StaticStack/> : <TechSphere/>`.

Conventions to match (from this same file and folder):
- Components are plain function declarations, props typed via an inline object type
  or a named `interface ...Props`. See `TrackLanes` in
  `src/projects/snazziefm/RadioStation.tsx:74` for the inline-prop-object style this
  repo uses.
- Tailwind classes inline; the shared `RAIL` constant is reused for horizontal rails.
- Imports use the `@/` alias for `src/*`.

## Commands you will need

| Purpose   | Command (from `Website/`) | Expected on success |
|-----------|---------------------------|---------------------|
| Typecheck | `bunx astro check`        | 0 type errors in changed files |
| Build     | `bun run build`           | exit 0 |
| Tests     | `bun test`                | all pass (unchanged) |

## Scope

**In scope** (modify/create only these):
- `Website/src/components/TechStack.tsx` (remove the extracted JSX, render the new
  components in its place, pass props).
- `Website/src/components/TechDetailsPanel.tsx` (CREATE — the details card, item 4).
- `Website/src/components/TechFilters.tsx` (CREATE — the constellation rail + chips +
  search, items 1 and 2).

**Out of scope** (do NOT touch, even though they're in the same file/region):
- The sphere stage / animation core (item 3, lines 535-577): `wrapRef`, `canvasRef`,
  the `FLAT.map` draggable buttons, `onOrbPointerDown`, and every ref/effect
  (`itemsRef`, `rot`, `drag`, the render-loop `useEffect`, pointer handlers). These
  stay verbatim inside `TechSphere`.
- `sphereCommon.tsx`, `ProjectModal.tsx`, `StaticStack`, `data/*`.
- Any change to behaviour, animation timing, or class names.

## Git workflow

- Work in the worktree the harness gives you.
- Commit message: `Extract TechDetailsPanel and TechFilters from TechSphere`.
- Do NOT push or open a PR.

## Steps

### Step 1: Extract the details card into `TechDetailsPanel.tsx`

Create `Website/src/components/TechDetailsPanel.tsx`. Move the JSX from
`TechStack.tsx` lines 579-741 (the `<div aria-live="polite"> ... </div>`) verbatim
into a new presentational component. It needs these props (all already computed in
`TechSphere`; pass them down unchanged):

- `focusedTech` (the `BY_NAME.get(...)` entry or `undefined`)
- `constProject: Project | null`
- `constSet: Set<string>`
- `meta` (the `focusedTech?.tech.meta`)
- `usedIn: string[]`
- `relatedSet: Set<string>`
- callbacks: `release: () => void`, `clearFocus: () => void`,
  `focusTech: (name: string) => void`,
  `onViewProject: (project: Project) => void` — wrap the existing inline
  "View project" handler (lines 637-648) so the panel doesn't need `setModalProject`/
  `setModalOpen` directly; `TechSphere` passes a closure that runs the same logic.

Keep `PROJECT_BY_TITLE`, `projectSlug`, `BY_NAME` usages working — import them into
the new file from their existing sources (`@/components/FeaturedShowcase` for
`projectSlug`, `@/components/sphereCommon` for `BY_NAME`, and rebuild
`PROJECT_BY_TITLE` locally or export it). Prefer importing `projects` and building
the map in the new file to avoid changing `TechStack.tsx`'s module-level constants.

In `TechStack.tsx`, replace lines 579-741 with
`<TechDetailsPanel focusedTech={focusedTech} constProject={constProject} constSet={constSet} meta={meta} usedIn={usedIn} relatedSet={relatedSet} release={release} clearFocus={clearFocus} focusTech={focusTech} onViewProject={...} />`.

**Verify**: `bunx astro check` → 0 errors; `bun run build` → exit 0.

### Step 2: Extract the filter UI into `TechFilters.tsx`

Create `Website/src/components/TechFilters.tsx`. Move JSX from lines 475-533 (the
constellation rail AND the chips+search row — they are adjacent siblings) into a
presentational component with props:

- `constProject: Project | null`, `selectConstellation: (p: Project | null) => void`
- `cat: string`, `setCat: (c: string) => void`
- `query: string`, `setQuery: (q: string) => void`
- `chips: { key: string; label: string; color: string }[]` — pass the already-computed
  `chips` array down (keep its computation, lines 457-464, in `TechSphere`).

`CONST_PROJECTS` and `RAIL` are module-level; import/redeclare `RAIL` and
`CONST_PROJECTS` in the new file from their sources (`RAIL` is a local const — move a
copy or export it; `CONST_PROJECTS` derives from `projects` + `BY_NAME`, rebuild it
in the new file). Do not change the markup or classes.

In `TechStack.tsx`, replace lines 475-533 with the `<TechFilters .../>` element.

**Verify**: `bunx astro check` → 0 errors; `bun run build` → exit 0.

### Step 3: Confirm the animation core is untouched

**Verify**: `git diff Website/src/components/TechStack.tsx` shows NO changes between
the sphere stage markers (the `wrapRef` div through the closing of the `FLAT.map`
buttons, original lines 535-577) and NO changes to any `useRef`/`useEffect`/handler
in `TechSphere`. If that region changed, revert it — it must stay verbatim.

### Step 4: Full verification

**Verify**:
- `bunx astro check` → 0 type errors.
- `bun run build` → exit 0.
- `bun test` → all pass (unchanged).

## Test plan

- No new automated tests (no React test harness here; adding one is a separate
  effort). This is a behaviour-preserving extraction verified by typecheck + build.
- Manual smoke (note in report; may require a human with a browser): on the home
  page `#stack` section — drag spins the sphere, clicking a tech focuses it and draws
  related lines, the constellation chips light up a project's techs, search filters,
  and the details card shows the right view. Confirm reduced-motion still shows
  `StaticStack`.

## Done criteria

ALL must hold:

- [ ] `Website/src/components/TechDetailsPanel.tsx` and `TechFilters.tsx` exist and
      contain the moved JSX.
- [ ] `TechStack.tsx` renders `<TechFilters/>` and `<TechDetailsPanel/>` in place of
      the moved blocks; the sphere stage and all refs/effects are unchanged.
- [ ] `bunx astro check` → 0 type errors.
- [ ] `bun run build` → exit 0; `bun test` → all pass.
- [ ] `git status` shows only `TechStack.tsx` modified plus the two new files.
- [ ] `plans/README.md` row 003 updated to DONE.

## STOP conditions

Stop and report (do not improvise) if:

- Extracting a block would require lifting a `ref` or effect out of `TechSphere`
  (the animation core must not move) — if a presentational block turns out to depend
  on a ref, leave that block in place and report it.
- `astro check` shows a type error that can only be fixed by changing the sphere
  core or animation logic.
- The diff in the sphere-stage region (lines ~535-577) is non-empty after Step 3.

## Maintenance notes

- After this, `TechSphere` owns state + the imperative animation core only; the panel
  and filters are pure props. New panel/filter features go in the new files.
- A reviewer should verify the extraction is purely mechanical: same props in, same
  DOM out, zero change to the canvas/drag code. Diff the sphere region specifically.
- Deferred: a jsdom + Testing Library harness to characterise the focus/constellation
  interactions before anyone refactors the animation core itself.
</content>
