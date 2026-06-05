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
6. **Overlap / pacing** (`overlap`, seconds, measured between the **speech** of adjacent lines):
   - `0` → default 0.15s gap between speech
   - negative (e.g. `-0.2`) → that much gap after the previous line's speech (calm, sequential)
   - positive (e.g. `0.4`) → next line's speech starts that early (talk-over); clamped so the
     previous keeps ≥0.6s solo speech (`MIN_SOLO`).
   - Clips are stored **full (untrimmed)** — the generator measures each clip's speech start/end
     (`speech_bounds`) and places clips so speech flows; the silent edges just overlap harmlessly
     in the mix. No silence is ever cut from the audio. Onsets stay monotonic.

## TTS-safe text (pronunciation rules)

Line `text` is sent **verbatim** to OmniVoice — no markdown/marker stripping (unlike the
article pipeline). So write only what should be spoken, and avoid characters the model
mispronounces:

- **No em-dashes or `--`.** OmniVoice reads `—` as "euro". Use `...` (also a natural pause)
  or a comma instead.
- **Encoding is UTF-8.** The generator reads/writes the episode JSON as UTF-8 explicitly;
  keep it that way. A wrong-encoding read (Windows cp1252) mangles `—`, smart quotes, `…`
  — another source of the "euro"/garbage artifact.
- **No raw URLs** — say the words ("snazzie dot space"), don't paste `https://…`.
- **Acronyms**: spell them how they should sound (e.g. "F-B-I" → write `F B I`), or avoid.
  Radio text does **not** support the article's `word[PHONEME]` markers — that's a separate
  MDX pipeline. For the full pronunciation/phoneme reference (acronyms, tech names, CMU
  ARPAbet), see the **`new-article-with-voice`** skill's phoneme table; apply the same
  spoken-form intent here, written as plain text.
- Prefer plain ASCII punctuation: `. , ! ? ...` and the `<p:N>` pause token.

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
  When the audio pipeline itself changes (trim/filter/render logic), bump `PIPELINE_VERSION`
  in `generate-radio.py` — it's part of the hash, so all clips re-render on the next run.
- After rendering, the script writes `timestamp`/`duration`/`audio` back into the episode JSON.
- Needs OmniVoice + ffmpeg installed; GPU (CUDA) auto-detected, falls back to CPU (slow).
- Run via background task — full render of ~30 lines takes minutes.

## Dia (experimental, 2-speaker, whole-conversation)

An alternate engine for *natural* dialogue. Use Dia when an episode is a **2-hander** and you
want real turn-taking/breaths over per-clip control. Tradeoffs vs OmniVoice:

- **Exactly 2 speakers** — `[S1]`/`[S2]`, must alternate, must start `[S1]`. Author strictly
  alternating turns; no third voice.
- **Nonverbals** in text: `(laughs)`, `(coughs)`, `(sighs)`, `(clears throat)` — sparingly. The
  `<p:N>` pause token is OmniVoice-only; omit it for Dia.
- **Single track, not per-clip** — the whole episode is one FLAC at `<slug>/episode.flac`; the
  episode JSON gets a top-level `"track"` and `"engine": "dia"`. No per-clip cache or drag-retime;
  per-line `timestamp`/`duration` come from **faster-whisper forced alignment**.
- Pipeline: `python scripts/generate-radio-dia.py <slug>` — chunks turns to ~16s, primes every
  chunk with a fixed 2-voice audio prompt (reuses `cast.json` `ref_audio`/`ref_text`) for voice
  consistency, concatenates, aligns, writes `track` + timestamps back.
- UI: `RadioStation.tsx` branches on `episode.track` — one `AudioBufferSourceNode`, seek via buffer
  offset; transcript highlight/seek/TrackLanes all run off `lines[].timestamp` as usual.
- Needs `faster-whisper`; Dia weights `nari-labs/Dia-1.6B-0626` (~6GB) + DAC codec auto-download.

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
