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
   ellipses, stammers written with `...` ("That is... that is not..."), emphasis/caps, and
   `!`/`?`. **Never use em-dashes** (`—`/`--`) to stammer — OmniVoice reads `—` as "euro"
   (see TTS-safe rules). Use `...` or a comma.
4. **Natural cadence over staccato.** Dramatic one-word-sentences ("Pigeons. Are not. Real.")
   render robotic. Prefer commas, contractions, and conversational fillers ("okay", "see",
   "come on", "would ya") unless the staccato beat is the joke.
5. **Pauses** — insert real silence inside a line with a token: `<p>` = 0.5s, `<p:0.8>` =
   0.8s. The UI strips tokens from the transcript; the generator turns them into silence.
6. **Emotional arc** — episodes should *develop*, not stay flat. Build a 3-act escalation:
   calm/conversational → unease → agitation/near-panic. Show it in the text so the voice
   reflects it: interjections, ellipses early; caps, `!`, repetition late.
   - ⚠️ **Nonverbals `(gasps)`/`(sighs)`/`(laughs)` are Dia-ONLY.** OmniVoice has no nonverbal
     tokens and reads them **aloud literally** ("open paren sighs"). In an OmniVoice
     (multitrack) episode they must NEVER appear in `text` — convey the sigh/laugh through
     wording instead ("Ohhh boy.", "Hah."). Only use them in `engine: dia*` episodes.
7. **Interruptions when agitated** — as tension rises, characters cut each other off:
   - OmniVoice (multitrack): give the interrupting line a **positive `overlap`** so its speech
     starts before the previous line's ends — a real audio talk-over.
   - Dia (single track, can't overlap): write the cut-in — interrupted line trails off (`...`),
     the interrupter jumps in mid-thought. Dia voices the rush.
8. **Overlap / pacing** (`overlap`, seconds, measured between the **speech** of adjacent lines):
   - `0` → default 0.15s gap between speech
   - negative (e.g. `-0.2`) → that much gap after the previous line's speech (calm, sequential)
   - positive (e.g. `0.4`) → next line's speech starts that early (talk-over); clamped so the
     previous keeps ≥0.6s solo speech (`MIN_SOLO`).
   - Clips are stored **full (untrimmed)** — the generator measures each clip's speech start/end
     (`speech_bounds`) and places clips so speech flows; the silent edges just overlap harmlessly
     in the mix. No silence is ever cut from the audio. Onsets stay monotonic.

## Comedy craft (what makes an episode land)

`villain-hour.json` is the reference for a *funny* episode. Steal these:

1. **Vary line length hard.** Interleave 1-2 word zingers ("Pigeons!", "Crypto!", "Honk.")
   with longer rants (8-9s). Uniform line lengths read flat and tire the ear. Aim for a mix
   every few lines.
2. **Anchor vs chaos via overlap sign.** The host/straight-man gets **negative** overlap
   (clean space, calm, in control); the agitated callers get **positive** overlap (+0.25 to
   +0.4, talking over each other). This contrast is what *sounds* like chaos around a steady
   center. Don't give everyone the same overlap.
3. **Running gag with a build.** Plant a motif and escalate it: honk → Honk → "STOP HONKING
   AT ME!"; or a denial that inflates ("Is the radio!" → "Is BIG radio!"). Pay it off at the
   end. One repeated bit beats five one-off jokes.
4. **Rapid-fire climax.** Peak the episode with a volley of very short overlapping lines
   (+0.4), one beat each, then a button. This is the "everyone yelling at once" texture.
5. **Comic-beat pauses.** Use `<p:0.3>` *before a punchline* for timing ("He honked, Barry.
   `<p:0.3>` And honestly? That's the most coherent argument all night."). Silence sells the joke.
6. **Button the ending.** Close on the straight-man's dry tag, ideally a **callback** to an
   earlier detail ("Four point two stars. Maybe skip it.") rather than a flat sign-off.
7. **One verbal tic per character.** Each voice should be identifiable from text alone (Frank
   = PIGEONS in caps, Chad = crypto/founder, Gary = noises). Keep it consistent.

## SFX lines (real sound effects, not TTS)

A line with an `sfx` field loads a real audio file instead of running TTS (handled before the
cast lookup in `generate_episode`). Use for rings, hangups, animal noises, ambience beds.

- **Fields**: `sfx` (repo-relative path to a 24k mono wav), plus optional per-line
  `phone_filter` / `distant` / `gain` / `trim` (seconds; `0` = whole file) / `background`.
  `speaker` is just a display label (e.g. `phone`, `cat`, `caller-bg`) and still needs a
  `CAST` entry in `radio.ts` for color (sfx lines skip `cast.json`).
- **Source the noise from the right place.** A sound coming from a *caller's* phone (a cat in
  their kitchen, a TV behind them) must sound like it's on the phone line and across the room:
  set BOTH `phone_filter: true` AND `distant: true`, and give it its own caller-side label
  (`caller-bg`, role "Caller BG") so the transcript shows it's their end, not a studio sound.
- **Sourcing**: prefer CC0/PD. Freesound filtered to "Creative Commons 0" is the richest
  source (cat screams, metal clatter, etc.); Wikimedia Commons is cleanest PD but thin on
  aggressive sounds (its cat files are gentle meows only — no screams). Convert with
  `ffmpeg -i in.mp3 -ac 1 -ar 24000 -af loudnorm out.wav`. Credit every file in
  `scripts/sfx/CREDITS.txt` with title, author, license, and URL.
- **Layered beds**: build a multi-sound bed (e.g. kitchen chaos = looped metal clatter under
  scattered screams) with a committed, re-runnable ffmpeg script — see
  `scripts/sfx/build-bg-kitchen.sh`. Don't leave it as an un-reproducible one-off.
- **Continuous background beds (`background: true`)** — THE way to run ambience *under*
  dialogue. A `background` line is placed on the timeline but does **not advance the speech
  cursor**, so every following dialogue line plays over it in parallel (real underlay, not a
  per-line "slight overlap"). Its `overlap` becomes a signed anchor offset from the current
  cursor (positive = starts that much earlier, for a crash lead-in). Stack several: e.g. a loud
  16s "eruption" bed + a quiet 36s ambience bed, both `background: true` anchored at the same
  point, dialogue flowing over both. Build the ambience long and never-silent (two offset metal
  loops + cats scattered throughout) and keep its `gain` low (~0.3) so it sits under speech.
  - ⚠️ Do NOT use the old hack (one bed line + a huge positive `overlap` like 15.5 on the next
    line to "pull dialogue back"). That made onsets fragile and only felt like a slight overlap.
    `background: true` is correct; reserve large `overlap` for genuine talk-overs.
  - Drop short non-background scream sfx lines mid-chaos (positive overlap) as punctuation beats.
- **Editing an sfx file re-renders it.** `sfx_hash` folds the file's content hash, so rebuilding
  a bed or swapping a clip forces just that clip to re-render (don't bump `PIPELINE_VERSION`
  for content swaps).

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
- **`ref_audio` + `ref_text` + `gender`** — the cloned voice + its transcript + its real gender.
  **The ref's actual gender wins** — OmniVoice clones the ref regardless of what `instruct` says,
  so a male character MUST use a male ref. `download-voices.py` maps each character to a
  gender-verified LibriSpeech **test-clean** speaker (`CHARACTER_VOICES`, genders from
  `SPEAKERS.TXT`) and writes `gender` into `cast.json`. If a voice sounds wrong-gendered, fix the
  speaker id there and re-download — don't just edit `instruct`.
- **Delivery/cadence comes from the reference clip**, not `instruct`. To change *how* someone
  talks (vs timbre), swap the reference. Distinct speakers give distinct voices.
- **Accents: the `instruct` accent token is a weak nudge — the REF dominates.** For a real
  accent, clone a native-language reference. e.g. Todd is an Asian man via a Mandarin male clip
  from **`google/fleurs`** (`cmn_hans_cn`) used as `ref_audio` with its Chinese `ref_text`;
  OmniVoice then produces accented English. (Korean = `ko_kr`, Japanese = `ja_jp`, etc.) Pick a
  male/female clip by pitch (male ≲155 Hz). `ref_text` must be the clip's real (foreign) transcript.
- **`speed`** — ~1.0 natural; 1.5-2.0 fast/manic (Todd runs 2.0).
- **`phone_filter: true`** — 300–3400 Hz bandpass = telephone sound. On for callers.
- **Refreshing refs**: `python scripts/download-voices.py` pulls the gender-verified LibriSpeech
  `CHARACTER_VOICES` set. ⚠️ It overwrites ALL `scripts/voices/*.wav`, including hand-sourced refs
  that diverge from `CHARACTER_VOICES` (Todd = FLEURS Mandarin, Kim = LibriSpeech 8463). Don't run
  it wholesale after diverging — do a targeted single-speaker pull instead (stream the dataset,
  filter the one speaker, write that one `wav`/`txt`, update only its `cast.json` entry).

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

## Dia2 (best for 2-handers, `engine: "dia2"`)

For a **2-hander** that should sound like a real conversation, use **Dia2** (`nari-labs/Dia2-2B`).
It generates whole passes with natural turn-taking — far better flow than per-line OmniVoice.

- **HARD limit: exactly 2 speakers.** The model only has `[S1]`/`[S2]` (tokenizer + parser +
  `prefix_speaker_1/2`); there is no `[S3]`. A 3+ voice episode CANNOT use Dia2 — use OmniVoice
  multitrack instead (e.g. Villain Hour's 6-voice brawl). Author strictly alternating turns,
  starting `[S1]`.
- **Single track, not per-clip.** Each pass is one continuous FLAC; passes are concatenated into
  `<slug>/episode.flac` and the episode JSON gets a top-level `"track"`. Per-line `timestamp`/
  `duration` are **metadata only**, recovered from Dia2's word timestamps (no audio splitting —
  splitting leaked the phone filter and mis-placed boundaries). Plays via the **single-track** UI
  path (`RadioStation.tsx` branches on `episode.track`).
- **Phone filter is baked into the voice, not applied after.** For a `phone_filter` speaker, the
  generator bandpasses that speaker's **prefix** clip, so Dia2 clones a phone-toned voice — clean,
  no boundary leak (you can't post-filter one speaker out of a mixed track).
- **Voice anchoring**: each speaker is conditioned by its `cast.json` `ref_audio` as a
  per-speaker prefix (Dia2 runs Whisper on each prefix). `prefix_stretch` (float in `cast.json`,
  e.g. `1.14`) slows + lowers a speaker's prefix → calmer/lower/"stoned" cadence.
- **Nonverbals** `(laughs)`/`(sighs)`/`(gasps)` (Dia's list, sparingly). `<p:N>` is OmniVoice-only.
- **Emotion arc / interruptions** — Dia2 voices escalation in one pass; cut-ins are textual
  (trailing `...`, interrupter jumps in) since it's one track.
- **Pipeline** (`scripts/generate-radio-dia2.py`): split into ≤100s passes at `[S1]` boundaries,
  generate each with per-speaker prefixes, concat, write `track` + per-line timestamps. The track
  is written to a temp file then **atomically replaced** (and `episode.flac` is not deleted
  upfront) so a re-render never leaves the live page silent.
- **Runs in the dia2 uv env**, not the project python. Setup once: clone `nari-labs/dia2` beside
  the repo, `uv sync` (needs `uv` + CUDA 12.8+). Then:
  ```bash
  uv run --project ../dia2 python scripts/generate-radio-dia2.py <slug>
  ```
  First run downloads Dia2-2B + Mimi + Whisper. `generate-radio.py --all` skips `engine: dia*`.
- Tuning: `cfg_scale` (~3-6, higher = tighter), `SamplingConfig.temperature`.

### Dia 1.6B (legacy, `scripts/generate-radio-dia.py`)
Chunk generation + silence-split. Superseded by Dia2 (silence split mis-placed boundaries, voices
drifted at high temperature). Kept for reference only.

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
