---
name: new-article-with-voice
description: End-to-end skill for creating a new snazzie.space article — write content, embed OmniVoice markers, generate audio, commit. Use when user asks to write a new article or annotate an existing one.
---

# New Article with Voice

Creates a complete article from topic to committed FLAC in one session. Also use when annotating existing articles with TTS markers.

## Step 1 — Gather requirements

If the user hasn't specified, ask:
- **Topic / working title**
- **Type** — opinionated take (argue a position) or tech showcase (explain how something was built)
- **Target length** — short (~300 words) / medium (~800) / long (~1500)

One question at a time. Don't start writing until you have the type.

## Step 2 — Write the article

### Voice and style
- First-person or direct second-person ("you") — matches existing articles
- **Opinionated**: take a clear position, defend it. No hedging ("it depends", "some people say") — state a view
- **Tech showcase**: explain how something was built, what the pieces are, why each was chosen. Still first-person. Still direct. No padding.
- Short paragraphs, no filler, no summaries that repeat what was just said
- Headers as signposts, not topic sentences — they frame what follows, not describe it
- Conversational but not casual — the register is "smart person talking to a peer"

### MDX frontmatter
```mdx
---
title: "Article Title Here"
date: YYYY-MM-DD
excerpt: "One sentence that sells the article. Opinionated, not descriptive."
tags: ["tag1", "tag2"]
draft: false
---
```

### File location
`Website/src/content/articles/<slug>.mdx`

Slug: lowercase, hyphens, derived from title. E.g. "Why Bun Won" → `why-bun-won`.

## Step 3 — Embed OmniVoice markers

### How markers work

**Format:** `writtenForm[PHONEME]`
- Display (remark plugin strips `[...]`): reader sees `writtenForm`
- TTS (`strip_mdx` converts `word[phoneme]` → `[phoneme]`): OmniVoice receives phoneme

**Multi-group format** — use when OmniVoice merges letters in a single phoneme block:
- 2-letter acronyms: space-separated groups — `KV[K EY1] [V IY1]` → `[K EY1] [V IY1]`
- 3+ letter acronyms: comma-separated — `SSR[EH0 S, EH0 S, AA1 R]`

### Phoneme table — apply to every occurrence

Format: `word[CMU phonemes]` — display shows `word`, TTS says the phoneme sequence.

**Acronyms / initialisms** (spell each letter):

| Written | Sounds like | Marker |
|---------|-------------|--------|
| `ASP.NET` | "A-S-P dot net" | `ASP.NET[AE1 S P IH0 DAA1 T N EH1 T]` |
| `SSR` | "S-S-R" | `SSR[EH0 S, EH0 S, AA1 R]` |
| `CDN` | "C-D-N" | `CDN[S IH1 D IH0 EH1 N]` |
| `CMS` | "C-M-S" | `CMS[S IH1 EH0 M EH0 S]` |
| `LLM` | "L-L-M" | `LLM[EH1 L, EH1 L, EH1 M]` |
| `LLMs` | "L-L-Ms" | `LLMs[EH1 L, EH1 L, EH1 M Z]` |
| `CSS` | "C-S-S" | `CSS[S IY1 EH1 S EH1 S]` |
| `PAT` | "P-A-T" | `PAT[P AE1 T]` |
| `KV` | "K-V" | `KV[K EY1] [V IY1]` |
| `UTC` | "U-T-C" | `UTC[Y UW1] [T IY1] [S IY1]` |
| `API` | "A-P-I" | `API[EY1 P IY0 AY1]` |
| `APIs` | "A-P-Is" | `APIs[EY1 P IY0 AY1 Z]` |
| `SQL` | "sequel" | `SQL[S IY1 K W AH0 L]` |
| `HTML` | "H-T-M-L" | `HTML[EY1 CH T IY1 EH1 M EH1 L]` |
| `URL` | "U-R-L" | `URL[Y UW1 AA1 R EH1 L]` |
| `SEO` | "S-E-O" | `SEO[EH0 S IY1 OW1]` |

**Tech names / frameworks** (correct pronunciation):

| Written | Sounds like | Marker |
|---------|-------------|--------|
| `Astro` | "astro" (as in astronaut) | `Astro[AE1 S T R OW0]` |
| `GraphQL` | "graph-Q-L" | `GraphQL[G R AE1 F Q L]` |
| `NumPy` | "num-pie" | `NumPy[N AH1 M P AY0]` |
| `Axum` | "ax-um" | `Axum[AE1 K S AH0 M]` |
| `Actix` | "ak-tiks" | `Actix[AE1 K T IH0 K S]` |
| `Elysia` | "eh-lee-see-ah" | `Elysia[EH1 L IH0 S IY0 AH0]` |
| `Hono` | "ho-no" | `Hono[HH OW1 N OW0]` |
| `PostCSS` | "post-C-S-S" | `PostCSS[P OW1 S T S IY1 EH1 S EH1 S]` |

**Common mispronunciations** (words TTS gets wrong):

| Written | Wrong | Right | Marker |
|---------|-------|-------|--------|
| `rougher` | "rouer" | "ruffer" | `rougher[R AH1 F ER0]` |

For new terms: look up the CMU pronunciation dictionary, or spell each letter/syllable as ARPAbet phonemes.

### Domain names in prose
```mdx
[snazzie.space](https://snazzie.space)   ← TTS reads "snazzie.space" ✓
https://snazzie.space                    ← TTS reads full URL ✗
```

### Paralinguistic markers

Standalone, stripped from display. Use sparingly — 1-2 per article max, only where tone genuinely fits.

| Marker | Use when |
|--------|----------|
| `[sigh]` | Resigned acceptance, "here we are again" moments |
| `[confirmation-en]` | Affirming a point mid-thought |
| `[question-en]` | Rhetorical "right?" beat |
| `[question-ah]` | Soft questioning tone |
| `[question-oh]` | Surprised question |
| `[question-ei]` | Skeptical question |
| `[question-yi]` | Light questioning |
| `[surprise-ah]` | Mild surprise reveal |
| `[surprise-wa]` | Strong surprise |
| `[surprise-yo]` | Punchy surprise |

Place at the start of a sentence. Do NOT use `[laughter]`, `[dissatisfaction-hnn]`, or `[surprise-oh]`.

### Do NOT annotate
React, Astro, Tailwind, Python, Rust, Go, Node, Bun, Docker — TTS handles these fine.

## Step 4 — Generate audio

The build auto-generates `.txt` TTS scripts into `Website/public/audio/` via the `tts-txt-generator` Astro integration. Delete `dist/` first to prevent stale cache, then build:

```powershell
Remove-Item -Recurse -Force "C:\Users\acoop\Documents\GitHub\SnazzieSpaceReact\Website\dist" -ErrorAction SilentlyContinue
Set-Location "C:\Users\acoop\Documents\GitHub\SnazzieSpaceReact\Website"
bun run build
```

**Validate txt before generating audio.** Read the first few lines of `Website/public/audio/<slug>.txt` and confirm the content matches your MDX changes.

```powershell
Get-Content "C:\Users\acoop\Documents\GitHub\SnazzieSpaceReact\Website\public\audio\<slug>.txt" | Select-Object -First 3
```

Only proceed once the txt reflects the current MDX.

Then generate audio — Python reads the `.txt`, sends to OmniVoice, writes FLAC:

```powershell
$env:PATH = [System.Environment]::GetEnvironmentVariable("PATH", "User") + ";" + [System.Environment]::GetEnvironmentVariable("PATH", "Machine")
$env:PYTHONIOENCODING = "utf-8"
Set-Location "C:\Users\acoop\Documents\GitHub\SnazzieSpaceReact"
python scripts/generate-audio.py <slug>
```

Generates `Website/public/audio/<slug>.flac` and `<slug>-waveform.json`.

Regenerate all: `python scripts/generate-audio.py --all`

## Step 5 — Verify build

Build already ran in Step 4. Check it passed with no errors.

## Step 6 — Commit

```bash
git add Website/src/content/articles/<slug>.mdx Website/public/audio/<slug>.flac Website/public/audio/<slug>-waveform.json
git commit -m "feat(articles): add <slug> article with voice"
```

## Checklist

- [ ] Frontmatter complete (title, date, excerpt, tags, draft: false)
- [ ] Opinionated take — not a tutorial or overview
- [ ] OmniVoice markers on every occurrence of terms in phoneme table
- [ ] No raw URLs — all domains wrapped as markdown links
- [ ] `dist/` deleted before build (prevents stale cache)
- [ ] `bun run build` passes (integration writes txt to `public/audio/`)
- [ ] `public/audio/<slug>.txt` confirmed to match MDX changes
- [ ] FLAC + waveform JSON generated
- [ ] Committed
