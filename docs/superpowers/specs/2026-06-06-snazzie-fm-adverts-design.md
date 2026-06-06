# Snazzie FM Adverts — Design

**Date:** 2026-06-06
**Status:** Approved (pending spec review)

## Summary

Introduce short (~13s) parody radio adverts to Snazzie FM — diabolical GTA-radio-style
spots (e.g. a hemorrhoid cream) that play as an interstitial in the `/radio` playlist.
Ads use brand-new voices (never host/caller voices), are rendered with **Dia2** (single
track, 2 speakers), follow an **announcer + disclaimer** format, and are **unskippable**.
Ship one seed ad and a dedicated `radio-adverts` skill.

## Decisions

| Question | Decision |
|----------|----------|
| Playlist placement | Episode → music → **ad** → next episode |
| Voice format | Announcer + disclaimer, 2 voices |
| Engine | **OmniVoice** (per-line clips; revised from Dia2 — Dia2 quality was poor). `startAd` schedules per-clip, keeps `track` as a fallback. |
| Voices | Two brand-new voices, NOT any existing host/caller. `ad-disclaimer` is a single recurring "disclaimer man" reused across all ads (distinct from the announcer). |
| Seed count | 1 ad — the hemorrhoid cream |
| Skip behaviour | **Skippable** — skip during an ad jumps to the next episode (revised from unskippable per user) |
| Behind-the-scenes | Ads also shown in the `RadioStation` debug player on `/snazziefm/behindthescenes`, as a labeled ADS section |
| Content edge | Both tiers allowed (PG-13 gross-out → harder R); seed ad ~PG-13/R gross-out |

## Content model

- New exported `ADS: Episode[]` in `Website/src/data/radio.ts`, parallel to `MUSIC_TRACKS`.
- Each ad reuses the `Episode` shape:
  - `type: "ad"`, `engine: "dia2"`, top-level `track` (single FLAC), `lines[]` for transcript.
  - `lines` strictly alternate `[S1]`/`[S2]` per Dia2 rules (start `[S1]`).
- Seed ad slug: `ad-soothe-master`. Clips dir: `public/audio/radio/ad-soothe-master/`.
- `engine: "dia2"` lives in the ad **JSON** (the Dia2 generator reads it). The TS `Episode`
  interface does NOT need it — the player branches on `episode.track`, so a single-track ad
  already takes the right path. No `Episode` type change needed for the engine.

## Voices (`scripts/cast.json` + `CAST` in `radio.ts`)

Two new cast entries, distinct from every existing voice:

- `ad-announcer` — bright, hard-sell male pitchman. Fast (`speed` ~1.4). New ref clip.
- `ad-disclaimer` — flat, lower, breakneck fine-print reader. Faster (`speed` ~1.6) and/or
  `prefix_stretch` tuned for the rattled-off legal tail. New ref clip.

Both need: `name`, `color`, `role`, `instruct`, `speed`, `ref_audio`, `ref_text`, `gender`,
and (Dia2) a per-speaker prefix. `CAST` in `radio.ts` gets matching color/role entries.
`role` reuses an existing union member (e.g. `"Guest Expert"`) or the union is widened —
TBD-free: reuse `"Guest Expert"` to avoid a type change.

Refs must be genuinely new voices (not the LibriSpeech host set). Source two suitable
clips (a punchy ad-style male; a dry monotone). Credit any sourced audio.

## Playlist integration (`Website/src/components/useRadioAudio.ts`)

Current chain (line ~152): episode end → `startInterstitial(music)` → music `onended`
→ next episode.

New chain: episode end → music → **ad** → next episode.

- Hook signature gains `ads: Episode[]` (3rd param). `RadioLanding` passes it; `index.astro`
  passes `ADS`.
- Refactor the single-track playback in `startInterstitial` into a reusable helper
  `playSingleTrack(url, gen, { onDone })` so music and ad share decode/schedule logic.
- After music `onended`, if `ads.length > 0`, play a random ad via `playSingleTrack`, whose
  `onDone` advances to the next episode. If no ads, behave as today (straight to next ep).
- New state `adIdx: number | null` + `adPlaying: boolean` so the now-playing label reads the
  ad's title/description (not the music's). Mirror the existing `musicIdx`/`musicPlaying`
  pattern.
- **Skippable (revised):** skipping during an ad behaves like skipping during music — clear
  `adPlaying`/`adIdx` and go straight to the next episode. `nextTrack()` gains an ad branch
  mirroring the music branch; the skip button stays enabled during an ad.

## UI (`RadioLanding.tsx`)

- Now-playing panel: when `adPlaying`, show ad title + description (reuse the music-break
  panel branch, fed by `adIdx`/ADS). A small "AD" tag distinguishes it from a music break.
- Skip button stays enabled while `adPlaying` (ads are skippable).
- No ad entries added to the landing episode/music list sidebars (ads are interstitial-only
  on the landing page).

## Behind-the-scenes (`RadioStation.tsx` / `behindthescenes.astro`)

- The debug player on `/snazziefm/behindthescenes` should also list ads so they can be
  inspected/played. `RadioStation` already supports single-track Dia2 playback (the ad's
  `track`), so ads slot into its selectable list.
- Add an optional `ads?: Episode[]` prop to `RadioStation`; render a labeled **ADS** section
  in the sidebar beneath the EPISODES list, sharing one selection index space
  (`[...episodes, ...ads]`). `behindthescenes.astro` passes `ADS`.

## The seed ad — `ad-soothe-master`

- ~13 seconds. Brand: **"Soothe-Master 5000"**, a diabolical hemorrhoid cream.
- `[S1]` announcer hard-sells (too-good promises, manic enthusiasm).
- `[S2]` disclaimer machine-guns the horrifying side-effects / legal fine print.
- Gross-out parody, GTA-radio tone. TTS-safe text (no em-dashes, ASCII punctuation).
- Authored as a Dia2 episode JSON; generated with the Dia2 pipeline.

## Generation

```bash
# from repo root, in the dia2 uv env
uv run --project ../dia2 python scripts/generate-radio-dia2.py ad-soothe-master
```

Writes `track` + per-line timestamps back into the ad JSON. `generate-radio.py --all`
already skips `engine: dia*`, so ads are excluded from the OmniVoice batch.

## New skill — `radio-adverts`

A dedicated skill capturing the tight advert format so future ads are one-shot:
- Format: ~13s, 2-voice Dia2, announcer + disclaimer formula, unskippable interstitial.
- The ad cast (`ad-announcer` / `ad-disclaimer`) and how to add more ad voices.
- The `ADS` array + playlist slot (episode → music → ad → episode).
- Content tiers (PG-13 gross-out → harder R), TTS-safe rules, generation command.
- References `radio-episodes` for the shared Dia2 pipeline rather than duplicating it.

## Out of scope (YAGNI)

- Per-episode ad targeting / linked ads (random pick is enough for one ad).
- Ad frequency config / "skip after N seconds".
- Multiple ad voices beyond the two needed now.

## Verification

- `cd Website && bun run build` passes.
- `/radio`: play an episode through to the end → music → ad airs → next episode starts.
- Skip button disabled during the ad; enabled otherwise.
- Ad transcript + title render correctly in the now-playing panel.
