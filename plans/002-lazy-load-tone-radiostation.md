# Plan 002: `tone` loads lazily, off RadioStation's hydration critical path

> **Executor instructions**: Follow this plan step by step. Run every verification
> command and confirm the expected result before moving on. If a "STOP condition"
> occurs, stop and report. When done, update the status row for plan 002 in
> `plans/README.md`.
>
> **Drift check (run first)**: from the repo root,
> `git diff --stat 351c7dc..HEAD -- Website/src/projects/snazziefm/RadioStation.tsx Website/src/pages/snazziefm/behindthescenes.astro`
> If either changed, compare the "Current state" excerpts below against the live
> code before proceeding; on a real structural mismatch, STOP.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: perf
- **Planned at**: commit `351c7dc`, 2026-06-22

## Why this matters

`RadioStation.tsx` is the only module importing `tone` (a large Web-Audio library).
It mounts as a React island on the `/snazziefm/behindthescenes` page with
`client:load`, so the browser must download AND parse the entire `tone` bundle
before the island hydrates, blocking interactivity on that page. The audio engine
is not needed until the user actually presses play. Two changes move the cost off
the critical path without changing playback behaviour: (1) hydrate the island at
idle instead of immediately, and (2) load `tone` as an async chunk the first time
audio is built rather than at module-eval time. Types stay static (`import type`),
so there is zero type-safety loss.

## Current state

### `Website/src/pages/snazziefm/behindthescenes.astro`

Line 20 mounts the player eagerly:

```astro
<RadioStation client:load episodes={EPISODES} ads={ADS} cast={CAST} />
```

(For reference, `/snazziefm/index.astro` uses `RadioLanding` which does NOT import
`tone` — it is out of scope.)

### `Website/src/projects/snazziefm/RadioStation.tsx`

Line 2 imports the whole library at module scope (eager, blocks the chunk):

```ts
import * as Tone from "tone";
```

`Tone` is used in two ways in this file:

1. **Type positions only** (erased at build, no runtime cost): the `Tone.ToneAudioBuffer`
   param of `normalizeDb` (line 35), and the `useRef<Tone.Gain | null>` / `Tone.Compressor`
   / `Tone.Limiter` / `Tone.Player` ref type annotations (lines 163-168), and the
   `ensureChain(): Tone.Compressor` return type (line 209).
2. **Runtime values** — the calls that actually need the library loaded:
   - `new Tone.Gain(...)`, `new Tone.Limiter(...)`, `new Tone.Compressor(...)` in
     `ensureChain()` (lines 211-216).
   - `Tone.ToneAudioBuffer.fromUrl(url)` and `buf.get()` in the episode-load effect
     (lines 250-251) and `normalizeDb` (line 36).
   - `new Tone.Player(...)`, `.sync()`, `.start()` (lines 260-269).
   - `Tone.getTransport()` (many: play/pause/seek/select/RAF/unmount, e.g. 245, 281,
     289, 302, 314, 341-342, 372).
   - `Tone.start()` in `play()` (line 280) and the "warm" effect (line 361).

The library is first needed inside the **episode-load effect** (line 242, runs on
mount and on `episode.slug` change) because it builds buffers/players there. So the
lazy load must resolve before that effect's body runs.

Repo convention: this project's memory/notes prefer **static top-of-file imports and
avoid dynamic `import()` unless necessary**. This is one of those necessary cases
(deferring a heavy audio bundle); keep the dynamic import to exactly one module-level
helper, not scattered call sites.

## Commands you will need

| Purpose   | Command (from `Website/`)   | Expected on success |
|-----------|-----------------------------|---------------------|
| Typecheck | `bunx astro check`          | 0 type errors in RadioStation.tsx |
| Build     | `bun run build`             | exit 0, build completes |
| Tests     | `bun test`                  | all pass (unchanged) |

## Scope

**In scope** (modify only these):
- `Website/src/projects/snazziefm/RadioStation.tsx`
- `Website/src/pages/snazziefm/behindthescenes.astro`

**Out of scope** (do NOT touch):
- `useRadioAudio.ts`, `RadioLanding.tsx`, `RadioReceiver.tsx` — they do not import `tone`.
- Playback logic, the dynamics chain values, volume/normalization math — preserve
  exactly. This is a load-timing change, not a behaviour change.

## Git workflow

- Work in the worktree the harness gives you.
- Commit message: `Lazy-load tone and defer RadioStation hydration`.
- Do NOT push or open a PR.

## Steps

### Step 1: Defer hydration to idle

In `behindthescenes.astro` line 20, change `client:load` to `client:idle`:

```astro
<RadioStation client:idle episodes={EPISODES} ads={ADS} cast={CAST} />
```

**Verify**: `bun run build` → exit 0.

### Step 2: Convert the `tone` import to type-only + a lazy runtime loader

In `RadioStation.tsx`:

1. Replace line 2 `import * as Tone from "tone";` with a **type-only** import so all
   the `Tone.X` type annotations keep compiling with zero runtime weight:

   ```ts
   import type * as Tone from "tone";
   ```

2. Add a module-level lazy loader near the top of the file (after imports), caching
   the dynamic import promise so the chunk loads at most once:

   ```ts
   // tone is a large audio bundle; load it lazily on first use so it never blocks
   // this island's hydration. Types stay static via `import type * as Tone`.
   let tonePromise: Promise<typeof import("tone")> | null = null;
   function loadTone(): Promise<typeof import("tone")> {
     return (tonePromise ??= import("tone"));
   }
   ```

3. `normalizeDb` uses `Tone.ToneAudioBuffer` only as a *type* and calls `buf.get()`
   (a method on the instance, not on the namespace) — it needs NO change.

4. Make the runtime entry points async. The cleanest seam: the **episode-load effect**
   (line 242) is already a promise chain; load `tone` at its head and thread the
   loaded module through. Replace the eager `Tone.*` references in that effect with a
   local `const Tone = await loadTone();` Because effects can't be `async` directly,
   wrap the body:

   ```ts
   useEffect(() => {
     let cancelled = false;
     setReady(false);
     (async () => {
       const Tone = await loadTone();
       if (cancelled) return;
       const transport = Tone.getTransport();
       transport.stop();
       transport.seconds = 0;
       disposePlayers();
       const input = ensureChain(Tone);
       // ... rest of the existing load logic, using this local `Tone` ...
     })();
     return () => { cancelled = true; };
   }, [episode.slug]);
   ```

5. The other `Tone.*` users (`ensureChain`, `play`, `pause`, `togglePlay`, `seek`,
   `selectEpisode`, the spacebar/warm/RAF/unmount effects) run only **after** the
   load effect has resolved at least once (the UI gates play behind `ready`, set in
   the load effect). Give them access to the loaded module without re-importing per
   call. Recommended approach — store the loaded namespace in a ref:

   ```ts
   const toneRef = useRef<typeof import("tone") | null>(null);
   ```

   Set `toneRef.current = Tone;` inside the load effect right after `await loadTone()`.
   Then convert `ensureChain()` to take the module as a param (`ensureChain(Tone)`),
   and in every other handler read `const Tone = toneRef.current; if (!Tone) return;`
   before touching `Tone.getTransport()` etc. The `warm` effect (line 360) should
   call `loadTone().then(T => T.start())` instead of `Tone.start()`. The unmount
   cleanup effect (line 371) should guard with `toneRef.current?.getTransport().stop()`.

   Keep all timing/volume/normalization numbers identical.

**Verify**: `bunx astro check` → 0 type errors in this file. `bun run build` → exit 0.

### Step 3: Confirm `tone` is a separate async chunk

After build, confirm `tone` is no longer in the page's eager island chunk:

**Verify**: `bun run build` succeeds, and
`grep -rl "tone" Website/dist/_astro/*.js | head` shows `tone` code in its own
chunk (a dynamic-import chunk), not inlined into the main client entry. If you
cannot determine this from filenames, it is acceptable to report "build succeeds;
chunk split not independently confirmed" rather than guess.

## Test plan

- No new automated tests (the audio engine has no test harness in this repo; adding
  one is out of scope — see plan notes). Verification is typecheck + build + a manual
  smoke note.
- Manual smoke (describe in your report, do not block on it): on
  `/snazziefm/behindthescenes`, the player UI renders, pressing play starts audio,
  seek/volume/episode-switch still work. The executor may not have a browser; if so,
  state that the smoke test was not run and must be done by the human.

## Done criteria

ALL must hold:

- [ ] `RadioStation.tsx` line 2 is `import type * as Tone from "tone";` (type-only).
- [ ] Exactly one `import("tone")` dynamic call exists, inside `loadTone()`.
- [ ] `bunx astro check` → 0 type errors in RadioStation.tsx.
- [ ] `bun run build` → exit 0.
- [ ] `bun test` → all pass (unchanged).
- [ ] `behindthescenes.astro` uses `client:idle`.
- [ ] `git status` shows only the two in-scope files modified.
- [ ] `plans/README.md` row 002 updated to DONE.

## STOP conditions

Stop and report (do not improvise) if:

- Threading the loaded `Tone` module through the handlers would require touching a
  file outside the in-scope list.
- `astro check` surfaces a type error that can't be resolved without changing
  playback logic or the public props.
- You find a `Tone.*` runtime call that executes *before* the load effect resolves
  (would NPE on a null ref) and can't be safely guarded — report it rather than
  reordering playback logic.

## Maintenance notes

- The whole audio engine now assumes `toneRef.current` is populated before any play
  action; the `ready` state gate enforces this. A future change that lets a handler
  fire before the first load effect must add its own `loadTone()` await.
- If audio playback regresses, the first suspects are: the load effect's async wrap
  (a missing `cancelled` check) or a handler that read `toneRef.current` before it
  was set. A reviewer should scrutinise that every former `Tone.` call site now has
  a non-null module reference.
- Deferred out of scope: a real component test harness (jsdom + RTL) for the player.
</content>
