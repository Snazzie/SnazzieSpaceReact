# Handover: Snazzie FM Radio — Audio Generation

**Date:** 2026-06-05
**Branch:** `snazzie-fm-radio`
**Goal:** Generate the multi-voice FLAC audio for "The Truth Hour" episode so the `/radio` page plays back with synced transcript highlighting.

---

## Tasks

| # | Task | Status |
|---|------|--------|
| 1 | Cast voice configs (`scripts/cast.json`) | ✅ done |
| 2 | Episode script (`Website/src/data/radio/the-truth-hour.json`) | ✅ done |
| 3 | Multi-track TTS pipeline (`scripts/generate-radio.py`) | ✅ done |
| 4 | TypeScript types + data (`Website/src/data/radio.ts`) | ✅ done |
| 5 | RadioStation UI component | ✅ done |
| 6 | `/radio` page + Nav link | ✅ done |
| 7 | Generate audio for The Truth Hour | ⬜ not started |
| 8 | Verify playback + transcript sync in browser | ⬜ not started |

---

## Last Implemented

Full `/radio` page is live on branch `snazzie-fm-radio`. The page uses `RadioStation.tsx` — a dark full-screen UI with episode sidebar, seekable waveform canvas, and script-style transcript. The transcript shows all 29 lines of "The Truth Hour" (pigeon conspiracy episode with Ronnie, Barry, Frank). The waveform area currently shows `run: bun radio the-truth-hour` because no audio has been generated yet. All timestamps in `the-truth-hour.json` are 0 — they get written back by the generator after audio is produced.

---

## Known Issues / Blockers

- OmniVoice (`k2-fsa/OmniVoice`) must be installed in the Python environment. Check with `python -c "from omnivoice import OmniVoice; print('ok')"`.
- All 14 characters currently share the same reference audio (`scripts/voices/seedtts_ref.wav`) — voice differentiation comes from the `instruct` string only. This is v1; real per-character ref wavs can be dropped into `scripts/voices/` and wired up in `scripts/cast.json` later.
- Generation takes time — each of the 29 lines needs a separate TTS pass. Expect ~5–15 min on CPU, much faster on GPU/MPS.

---

## Next Step

Run the audio generator from the repo root on Windows:

```bash
python scripts/generate-radio.py the-truth-hour
```

This will:
1. Generate 29 voice clips (one per transcript line, each with its character's voice instruct)
2. Mix them into a single FLAC with natural overlaps at `Website/public/audio/radio/the-truth-hour.flac`
3. Compute `Website/public/audio/radio/the-truth-hour-waveform.json` (200 bars)
4. Write real `timestamp` and `duration` values back into `Website/src/data/radio/the-truth-hour.json`

## Up Next (ordered)

1. Commit the generated assets: `git add Website/public/audio/radio/ Website/src/data/radio/the-truth-hour.json && git commit -m "feat(radio): generated audio for The Truth Hour"`
2. Push: `git push`
3. Start dev server (`cd Website && bun dev`) and verify at `http://localhost:4321/radio` — waveform should render, pressing play should work, transcript lines should highlight as audio plays and clicking a line should seek to that timestamp
4. If voices sound too similar (same ref audio), record or source distinct `.wav` files per character, place in `scripts/voices/`, update `ref_audio` paths in `scripts/cast.json`, regenerate
5. Once validated, write the remaining 5 episode scripts (crypto, AI, wellness, conspiracy v2, sports) following the same JSON format as `the-truth-hour.json`
