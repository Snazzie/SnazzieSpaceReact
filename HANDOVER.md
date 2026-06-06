# Handover: Radio episode "The Cat Special" + real SFX pipeline

**Date:** 2026-06-06
**Branch:** radio/the-cat-special (pushed to origin, tracking set, NO PR)
**Goal:** A playable radio episode where Ronnie calls a Chinese restaurant over a cat rumor; owner denies it while the kitchen erupts with real meowing + clattering metal. Done = episode renders audio and plays on the site.

---

## Tasks

| # | Task | Status |
|---|------|--------|
| 1 | Author episode transcript `the-cat-special.json` | ✅ done |
| 2 | Add `sfx` line support to generate-radio.py | ✅ done |
| 3 | Source/build CC0+PD SFX (cat, ring, hangup, chaos bed) | ✅ done |
| 4 | Wire episode + voices into radio.ts / cast.json | ✅ done |
| 5 | Verify placement math (long bed under overlapping dialogue) | ✅ done |
| 6 | Commit + push to branch | ✅ done (commit 624a568) |
| 7 | Render audio (TTS for Ronnie/Chen + sfx clips) | ⬜ not started — needs model env |
| 8 | Commit rendered audio + redeploy | ⬜ not started |

---

## Last Implemented

Episode `Website/src/data/radio/the-cat-special.json` (21 lines). New pipeline feature in `scripts/generate-radio.py`: `render_sfx()` + `sfx_hash()`, and a branch in `generate_episode()`'s loop (before the cast lookup) that handles any line with an `sfx` field — loads a real 24k mono wav instead of TTS, applying per-line `phone_filter`/`distant`/`gain`/`trim`. `place()` was NOT modified. The long "kitchen chaos" effect uses one premixed bed line (`scripts/sfx/bg-kitchen.wav`, 16s) followed by a dialogue line carrying a large `overlap` (15.5) that pulls the chaos talk back over the bed; verified by rendering sfx + hand-tracing `place()` (bed 68.9–85.0s, chaos lines 15–17 land inside it). SFX in `scripts/sfx/` (all CC0/PD, credited in `scripts/sfx/CREDITS.txt`): cat-pleading, cat-impatient (Wikimedia PD), phone-ring (US ringback CC0), phone-hangup (ffmpeg-synth busy tone), bg-kitchen (premixed meows + synth metal clank). `radio.ts` got `caller-chen` voice + `cat`/`cat-loud`/`phone` display labels and the episode registered in EPISODES; `cast.json` got the `caller-chen` TTS voice (reuses todd.wav chinese-accent ref, phone_filter on).

---

## Known Issues / Blockers

- **Episode is silent until rendered.** No `audio` fields yet; player's `.filter(l => l.audio)` drops every line. Expected for any pre-render episode.
- Render needs the omnivoice/torch Python env, which is NOT on this machine (only a throwaway venv at /tmp/sfxvenv with numpy/soundfile/scipy was used for placement verification).
- Bed is fixed 16s; real TTS clip lengths differ from the estimates used in the trace, so the chaos timing has margin (line 18 "No cat, do not call" may land slightly after the bed tail). Acceptable; re-check after render.

---

## Next Step

Run the TTS render (in the env that has omnivoice/torch): `cd Website && bun run radio the-cat-special` — this populates `timestamp`/`duration`/`audio` and writes per-line `.flac` clips (sfx lines render through `render_sfx` too).

## Up Next (ordered)

1. Play the episode locally (`bun dev`) and sanity-check: faint meows are audible, the 16s bed underlays the overlapping chaos dialogue, ring + busy-tone hangup land right.
2. Adjust gains/trims/overlap in `the-cat-special.json` if the bed is too loud/soft or timing drifts, then re-run the render (cached clips skip; only changed ones re-render).
3. Commit rendered `.flac` clips + updated JSON on `radio/the-cat-special`, push. (Note: prior FLAC gitignore gotcha — ensure radio audio isn't gitignored.)
