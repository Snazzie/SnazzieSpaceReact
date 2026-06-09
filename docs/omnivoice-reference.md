# OmniVoice Reference

Source: https://github.com/k2-fsa/OmniVoice  
Model: `k2-fsa/OmniVoice`

## Non-Verbal Tags

Insert inline in `text`. Model produces the sound, not literal speech.

```
[laughter]
[sigh]
[confirmation-en]
[question-en]
[question-ah]
[question-oh]
[question-ei]
[question-yi]
[surprise-ah]
[surprise-oh]
[surprise-wa]
[surprise-yo]
[dissatisfaction-hnn]
```

Example: `"[laughter] You really got me. I didn't see that coming at all."`

> **Dia2 contrast**: Dia uses parentheses `(laughs)`, `(sighs)`. OmniVoice uses square brackets. Never mix.

## Generation Modes

| Mode | Fields needed |
|------|---------------|
| Voice cloning | `ref_audio` + `ref_text` |
| Voice design | `instruct` (no ref audio) |
| Auto voice | neither |

## Instruct Vocab (voice design / cast.json)

Comma-separated. Only these tokens are valid:

**Gender**: `male`, `female`

**Age**: `child`, `teenager`, `young adult`, `middle-aged`, `elderly`

**Pitch**: `very low`, `low`, `moderate`, `high`, `very high`

**Style**: `whisper`

**English accent**: `american accent`, `australian accent`, `british accent`, `canadian accent`, `chinese accent`, `indian accent`, `japanese accent`, `korean accent`, `portuguese accent`, `russian accent`

**Chinese dialect**: `四川话`, `陕西话`, etc.

Example: `"female, low pitch, british accent"`

> Voice cloning: `instruct` is a weak nudge — the **ref audio dominates**. For real accent, clone a native speaker.

## Pause Tokens

OmniVoice-only. Dia2 reads them aloud.

| Token | Duration |
|-------|----------|
| `<p>` | 0.5s |
| `<p:N>` | N seconds |

Example: `"He honked, Barry. <p:0.3> And honestly? That's the most coherent argument all night."`

## Generation Parameters (`model.generate()`)

| Param | Default | Notes |
|-------|---------|-------|
| `num_step` | 32 | Diffusion steps. 16 = faster but lower quality |
| `speed` | 1.0 | >1.0 faster, <1.0 slower |
| `duration` | — | Fixed output length in seconds. Overrides `speed` if both set |

## ARPAbet Pronunciation Override

Force pronunciation of a word in English:

```
"He plays the [B EY1 S] guitar while catching a [B AE1 S] fish."
```

Uppercase, space-separated phonemes in brackets. Reference: CMU Pronunciation Dictionary.

## Voice Cloning Tips

- Reference audio: 3–10s ideal. >20s = slower, higher VRAM, degraded quality.
- Ref must be **same language** for accent-free output. Cross-lingual cloning adds accent.
- `ref_text` can be omitted — Whisper auto-transcribes.

## CLI

```bash
# Single clip
omnivoice-infer --model k2-fsa/OmniVoice --text "..." --ref_audio ref.wav --ref_text "..." --output out.wav

# Web UI
omnivoice-demo --ip 0.0.0.0 --port 8001
```

## Snazzie FM Usage

`generate-radio.py` wraps OmniVoice. Cast config lives in `scripts/cast.json`:

```json
{
  "instruct": "male, moderate pitch, american accent",
  "speed": 1.0,
  "phone_filter": true,
  "ref_audio": "scripts/voices/caller-name.wav",
  "ref_text": "Transcription of the reference clip."
}
```

Run: `python scripts/generate-radio.py <slug>` (bulk: pass multiple slugs, model loads once).
