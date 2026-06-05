---
name: radio-episodes
description: Write, generate, and tune Snazzie FM radio episodes — multi-voice TTS dialogue with per-clip audio, a shared-timeline player, and a dev timeline editor. Use when creating a new episode, editing an episode script, regenerating voices, tuning timing/overlap, or working on the /radio page.
---

# Snazzie FM Radio Episodes

Multi-voice call-in radio comedy. Each episode is a JSON script of timed dialogue
lines. Every line renders to its **own** audio clip; the browser schedules the clips
on a shared timeline via the Web Audio API. There is **no merged master track** — so
retiming a line only edits its `timestamp`, never the audio.

## Files

| Path | Role |
|------|------|
| `Website/src/data/radio/<slug>.json` | Episode script (authored + generated fields) |
| `Website/src/data/radio.ts` | `CAST` map + `EPISODES` loader / TS types |
| `Website/public/audio/radio/<slug>/<i>.flac` | One clip per line (generated) |
| `Website/public/audio/radio/<slug>/.clips.json` | Per-clip content-hash cache manifest |
| `scripts/generate-radio.py` | TTS render + placement pipeline |
| `scripts/cast.json` | Voice config per character |
| `scripts/download-voices.py` | Pull reference voices from LibriSpeech |
| `Website/src/components/RadioStation.tsx` | Player + multitrack debug UI |

## Episode JSON shape

```json
{
  "slug": "the-truth-hour",
  "title": "The Truth Hour",
  "description": "…",
  "lines": [
    { "speaker": "ronnie", "text": "…", "overlap": 0, "timestamp": 0, "duration": 0, "audio": "" }
  ]
}
```

- **Author**: `speaker`, `text`, `overlap`. Set `timestamp`/`duration` to `0` and omit `audio`.
- **Generated** (written back by the script): `timestamp`, `duration`, `audio`. Real values
  only appear after running the generator; `0`s in between are expected, not a bug.
- `speaker` must be a key in `scripts/cast.json` **and** `CAST` in `radio.ts`.

## Script-writing rules

1. **Address the right person.** If a line names someone, it must name whoever it is
   actually replying to — usually the previous speaker. e.g. if Barry just spoke, Frank's
   rebuttal says "…Barry!", not "…Ronnie!". Re-check every name against the line above it.
2. **Stay in character.** Frank is a *serious* conspiracist — paranoid, certain, menacing
   ("You think that's a coincidence?", "They scrubbed it"). Not quirky, not "fun facts".
   Ronnie = smooth credulous host; Barry = anxious skeptical co-host.
3. **Emotion comes through text, not config.** OmniVoice has no emotion/delivery instruct
   tokens — only timbre/accent/age/pitch. Convey feeling with interjections ("Ohhh", "Huh"),
   ellipses, em-dash stammers ("That is — that is not…"), emphasis/caps, and `!`/`?`.
4. **Natural cadence over staccato.** Dramatic one-word-sentences ("Pigeons. Are not. Real.")
   render robotic. Prefer commas, contractions, and conversational fillers ("okay", "see",
   "come on", "would ya") unless the staccato beat is the joke.
5. **Pauses** — insert real silence inside a line with a token: `<p>` = 0.5s, `<p:0.8>` =
   0.8s. The UI strips tokens from the transcript; the generator turns them into silence.
6. **Overlap / pacing** (`overlap`, seconds, relative to previous clip end):
   - `0` → default 0.15s gap
   - negative (e.g. `-0.2`) → that much gap after the previous clip (calm, sequential)
   - positive (e.g. `0.4`) → talk *over* the previous clip; clamped so the previous keeps
     ≥0.6s solo (`MIN_SOLO`). Heavy positive overlap = people talking over each other.
   - Keep timestamps monotonic — the placement pass guarantees it as long as overlaps are
     sane; very large positive values just get clamped.

## Voice / cast config (`scripts/cast.json`)

Per character: `name`, `color`, `role`, `instruct`, `speed`, `phone_filter`, `ref_audio`, `ref_text`.

- **`instruct`** — comma-separated, **only** from OmniVoice's fixed English vocab:
  `american/australian/british/canadian/chinese/indian/japanese/korean/portuguese/russian accent`,
  `male/female`, `child/teenager/young adult/middle-aged/elderly`,
  `very low/low/moderate/high/very high pitch`, `whisper`. Anything else errors out.
- **`ref_audio` + `ref_text`** — the cloned voice + its transcript. **Delivery/cadence comes
  from the reference clip**, not `instruct`. To change *how* someone talks (vs timbre), swap
  the reference. Callers share generic refs; distinct LibriSpeech speakers give distinct voices.
- **`speed`** — ~1.0 natural; higher = faster/manic.
- **`phone_filter: true`** — 300–3400 Hz bandpass + light noise = telephone sound. On for callers.
- Refresh references with `python scripts/download-voices.py` (pulls LibriSpeech test-clean,
  one speaker per character, writes wav+txt and updates `cast.json`).

## Generation workflow

```bash
# from repo root (NOT Website/)
python scripts/generate-radio.py the-truth-hour      # render/refresh one episode
python scripts/generate-radio.py --all               # every episode
python scripts/generate-radio.py the-truth-hour --remix   # placement only, never loads model
```

- **Caching**: a clip re-renders only when its content hash changes — i.e. when that line's
  `text`, or its character's `instruct`/`speed`/`phone_filter`/`ref_audio`/`ref_text`, changes.
  So editing one line, or one character's voice, re-renders just the affected clips; everyone
  else is reused from `.clips.json`. The model loads lazily, only if something must render.
- After rendering, the script writes `timestamp`/`duration`/`audio` back into the episode JSON.
- Needs OmniVoice + ffmpeg installed; GPU (CUDA) auto-detected, falls back to CPU (slow).
- Run via background task — full render of ~30 lines takes minutes.

## UI / timeline editing (`/radio`)

- Web Audio scheduler plays each clip as its own source on a shared clock — real parallel
  playback and overlap. Spacebar toggles play/pause; click the waveform lanes or a transcript
  line to seek.
- **TRACKS** (debug lanes, on by default): one row per speaker, blocks = clips by timestamp.
- **Dev only** (`import.meta.env.DEV`): drag a clip block to retime it; recomputes that line's
  `overlap` vs the previous clip. A single click seeks (drag threshold avoids accidental moves).
  Press **SAVE** to persist edits to the episode JSON via the dev-only Vite endpoint
  `/api/radio-save` (defined in `astro.config.mjs`, never shipped to production).
- Dragging changes only timestamps — **no regeneration needed**. Re-run the generator only when
  you change text or voices.

## Adding a new episode

1. Create `Website/src/data/radio/<slug>.json` with authored lines (timestamps `0`).
2. Add any new characters to `scripts/cast.json` **and** `CAST` in `radio.ts`.
3. Import + add the episode in `EPISODES` (`radio.ts`).
4. `python scripts/generate-radio.py <slug>` to render clips and fill timestamps.
5. `cd Website && bun run build` to verify, then commit the JSON, the `<slug>/` clip dir
   (including `.clips.json`), and any cast/voice changes.
