# TTS Spoken Script Pipeline Design

**Date:** 2026-06-03

## Problem

`generate-audio.py` feeds raw MDX text (after markdown stripping) directly to OmniVoice TTS. Result: robotic delivery, mispronounced URLs/acronyms, no transitions between sections, no intro or outro.

## Solution

Pre-written spoken scripts per article, committed to the repo. TTS reads the script file instead of stripping the MDX.

## Script Files

Location: `Website/public/audio/<slug>-script.txt`

One file per article. Authored to podcast-host tone — conversational, direct, confident. Matches the voice of the articles themselves.

### Authoring rules

- **Intro:** spoken title + hook sentence (1-2 sentences)
- **Section transitions:** headers rewritten as natural spoken bridges ("Let's talk about the triangle" not a cold heading read)
- **URLs:** expanded to speakable form (`snazzie dot space`, `bettertaskmanager dot com`)
- **Acronyms:** normalised (`ASP dot NET`, `dot NET 8 plus`)
- **Bold callouts:** rewritten as spoken emphasis ("Here's when to reach for Rust:")
- **Pause cues:** paragraph breaks get light punctuation restructure or `...` where a breath is natural
- **Outro:** 1-2 sentence closer

## Script Generator Changes

`generate()` checks for a script file before falling back to `strip_mdx`:

```python
script_file = AUDIO_DIR / f"{slug}-script.txt"
if script_file.exists():
    text = script_file.read_text(encoding="utf-8")
else:
    text = strip_mdx(mdx.read_text())
```

New flag `--scripts-only`: prints which slugs are missing script files, exits without running TTS. For auditing coverage.

## Articles in scope

- `backend-love-triangle`
- `building-snazzie-space`
- `dynamic-vs-ssr`
- `why-wordpress-is-obsolete`

## Non-goals

- No LLM API calls at generation time
- No SSML or prosody markup (OmniVoice doesn't expose it)
- No changes to waveform generation
