---
name: articles-with-voice
description: Rules for writing snazzie.space articles with embedded OmniVoice TTS markers. Use when writing or editing any article in Website/src/content/articles/.
---

# Writing Articles with Voice

Articles on snazzie.space are narrated via OmniVoice TTS. Markers embedded inline in MDX control pronunciation and emotion. The display strips them; TTS uses them natively.

## How Markers Work

**Format:** `writtenForm[OmniVoiceMarker]`

- Display (via remark plugin): strips `[...]` → reader sees `writtenForm`
- TTS (`strip_mdx`): strips `writtenForm` → OmniVoice receives `[OmniVoiceMarker]`

Standalone markers (no preceding word) are stripped from display and passed to TTS as-is.

## Pronunciation (CMU Phoneme Dictionary)

Use `word[P HH OW1 N EH0 M Z]` for words TTS mispronounces.

Common patterns in these articles:

| Written | Marker |
|---------|--------|
| `ASP.NET` | `ASP.NET[AE1 S P IH0 DAA1 T N EH1 T]` |
| `SSR` | `SSR[EH1 S EH1 S AA1 R]` |
| `CDN` | `CDN[S IH1 D IH0 EH1 N]` |
| `CMS` | `CMS[S IH1 EH0 M EH0 S]` |
| `LLM` | `LLM[EH1 L EH0 M]` |
| `CSS` | `CSS[S IH1 EH0 S EH0 S]` |
| `PAT` | `PAT[P AE1 T]` |
| `KV` | `KV[K EY1 V IY0]` |
| `UTC` | `UTC[Y UW1 T IH1 S IY1]` |
| `GraphQL` | `GraphQL[G R AE1 F Q L]` |
| `NumPy` | `NumPy[N AH1 M P AY0]` |
| `Axum` | `Axum[AE1 K S AH0 M]` |
| `Actix` | `Actix[AE1 K T IH0 K S]` |
| `Elysia` | `Elysia[EH1 L IH0 S IY0 AH0]` |
| `Hono` | `Hono[HH OW1 N OW0]` |
| `PostCSS` | `PostCSS[P OW1 S T S IH1 S EH0 S]` |

For new acronyms/proper nouns, look up CMU phonemes or spell out the letters: `API[EY1 P IY0 AY1]`.

## URLs and Domain Names

Write domain names as plain text for TTS to read naturally. Markdown links are fine for display — the link text is what TTS reads.

```mdx
<!-- Good: link text is readable -->
[snazzie.space](https://snazzie.space)

<!-- Avoid: TTS would read the raw URL -->
https://snazzie.space
```

## What NOT to annotate

- Common English words pronounced correctly
- Framework names that TTS handles fine (React, Astro, Tailwind, Python, Rust, Go)
- Numbers, dates, standard punctuation

## Regenerating Audio

After editing an article:

```powershell
$env:PYTHONIOENCODING = "utf-8"
python scripts/generate-audio.py <slug>
# e.g. python scripts/generate-audio.py backend-love-triangle
```

Regenerate all:
```powershell
python scripts/generate-audio.py --all
```

Check which articles are missing audio:
```powershell
python scripts/generate-audio.py --scripts-only
```

## Pipeline Summary

```
MDX body (with markers)
  → Astro build: remark-strip-tts-markers.mjs strips [...]  → clean HTML for readers
  → generate-audio.py: strip_mdx converts word[phoneme] → [phoneme] → OmniVoice TTS → FLAC
```
