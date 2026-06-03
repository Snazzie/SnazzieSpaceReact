---
name: new-article-with-voice
description: End-to-end skill for creating a new snazzie.space article — write content, embed OmniVoice markers, generate audio, commit. Use when user asks to write a new article.
---

# New Article Skill

Creates a complete article from topic to committed FLAC in one session.

## Step 1 — Gather requirements

If the user hasn't specified, ask:
- **Topic / working title**
- **Angle** — what's the argument or take? (snazzie.space articles are opinionated, not tutorials)
- **Target length** — short (~300 words) / medium (~800) / long (~1500)

One question at a time if needed. Don't start writing until you have the angle.

## Step 2 — Write the article

### Voice and style
- First-person or direct second-person ("you") — matches existing articles
- Opinionated: take a clear position, defend it
- No hedging ("it depends", "some people say") — state a view
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

After writing the body, embed markers inline. Rules from [[articles-with-voice]]:

### Phoneme format
`writtenForm[PHONEME]` — display shows `writtenForm`, TTS says phoneme.

Apply to every occurrence of these terms:

| Written | Marker |
|---------|--------|
| `ASP.NET` | `ASP.NET[AE1 S P IH0 DAA1 T N EH1 T]` |
| `SSR` | `SSR[EH1 S EH1 S AA1 R]` |
| `CDN` | `CDN[S IH1 D IH0 EH1 N]` |
| `CMS` | `CMS[S IH1 EH0 M EH0 S]` |
| `LLM` | `LLM[EH1 L EH0 M]` |
| `LLMs` | `LLMs[EH1 L EH0 M Z]` |
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
| `API` | `API[EY1 P IY0 AY1]` |
| `APIs` | `APIs[EY1 P IY0 AY1 Z]` |
| `SQL` | `SQL[S IH1 K W AH0 L]` |
| `HTML` | `HTML[EY1 CH T IH1 EH1 M EH1 L]` |
| `URL` | `URL[Y UW1 AA1 R EH1 L]` |
| `SEO` | `SEO[EH1 S IY0 OW0]` |

For new tech terms not in this table: spell out each letter as a phoneme, or find the CMU dict entry.

### Domain names in prose
Write as readable text, not raw URLs:
```mdx
[snazzie.space](https://snazzie.space)   ← TTS reads "snazzie.space" ✓
https://snazzie.space                    ← TTS reads full URL ✗
```

### Do NOT annotate
React, Astro, Tailwind, Python, Rust, Go, Node, Bun, Docker — TTS handles these fine.

## Step 4 — Generate audio

```powershell
$env:PATH = [System.Environment]::GetEnvironmentVariable("PATH", "User") + ";" + [System.Environment]::GetEnvironmentVariable("PATH", "Machine")
$env:PYTHONIOENCODING = "utf-8"
Set-Location "C:\Users\acoop\Documents\GitHub\SnazzieSpaceReact"
python scripts/generate-audio.py <slug>
```

Generates `Website/public/audio/<slug>.flac` and `<slug>-waveform.json`.

## Step 5 — Verify build

```bash
cd Website && bun run build 2>&1 | tail -5
```

Must complete with no errors before committing.

## Step 6 — Commit

```bash
git add Website/src/content/articles/<slug>.mdx Website/public/audio/<slug>.flac Website/public/audio/<slug>-waveform.json
git commit -m "feat(articles): add <slug> article with voice"
```

## Checklist

- [ ] Frontmatter complete (title, date, excerpt, tags, draft: false)
- [ ] Article has a clear opinionated take — not a tutorial or overview
- [ ] OmniVoice markers on every occurrence of terms in the phoneme table
- [ ] 1-2 paralinguistic markers placed where tone fits
- [ ] No raw URLs in prose — all domains wrapped as markdown links
- [ ] `bun run build` passes
- [ ] FLAC + waveform JSON generated
- [ ] Committed
