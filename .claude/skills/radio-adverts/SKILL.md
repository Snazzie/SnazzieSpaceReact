---
name: radio-adverts
description: Write, generate, and slot Snazzie FM adverts — short (~13s) skippable GTA-radio-style parody ad spots that air between episodes. Use when creating or editing a radio advert. Builds on the radio-episodes skill for the shared Dia2 pipeline.
---

# Snazzie FM Adverts

Short parody radio ads (~13 seconds) that air as an interstitial in the `/radio`
playlist: **episode -> music -> ad -> next episode**. Ads are **skippable** (skip jumps to
the next episode). They use their own voices (never host/caller voices) and are rendered
with **Dia2** (single track, exactly 2 speakers). For the shared TTS pipeline, voices, and
Dia2 rules, see the **radio-episodes** skill — this skill only adds what is advert-specific.

## Format (the formula)

- **~13 seconds.** One Dia2 track. Keep total spoken text to roughly 35-45 words.
- **Two voices, announcer + disclaimer** (Dia2's hard 2-speaker limit):
  - `ad-announcer` (`[S1]`, first line) — bright, manic hard-sell pitchman.
  - `ad-disclaimer` (`[S2]`) — flat, fast, monotone fine-print reader.
- **Structure:** announcer pitch (hook -> absurd promise) -> disclaimer machine-guns the
  horrifying side-effects / legal tail -> announcer button (brand + tagline).
- Strictly alternating turns, **first line is the announcer**, exactly 2 distinct
  speakers (Dia2 requirement).

## Tone

Diabolical GTA-radio energy. A real product category (hemorrhoid cream, energy drink,
discount surgery, legal services) sold with deranged enthusiasm; the disclaimer
undercuts it with deadpan body-horror. Content tiers: PG-13 gross-out up to harder R —
parody only, no slurs / real-world shock content. Punch up at the product, not at people.

## TTS-safe text

Same rules as radio-episodes: text is sent verbatim to the model. No em-dashes (the long
dash reads as "euro") — use `...` or commas. ASCII punctuation only. UTF-8. Nonverbals
`(laughs)`/`(sighs)` are Dia-only and used sparingly.

## Data + slot

- Script: `Website/src/data/radio/<ad-slug>.json` — `type: "ad"`, `engine: "dia2"`,
  2 alternating speakers. Authored fields only (`timestamp`/`duration` = 0).
- Register: import it in `Website/src/data/radio.ts` and add to `export const ADS`.
  Add any new ad voice to `CAST` there (reuse `role: "Guest Expert"`).
- The player (`useRadioAudio.ts`) airs a **random** ad from `ADS` after each music break;
  skipping during an ad jumps to the next episode. No per-episode targeting.
- Behind-the-scenes: ads also appear in the `RadioStation` debug player
  (`/snazziefm/behindthescenes`) via its `ads` prop.

## Voices

Ad voices live in `scripts/cast.json` like any cast member (`ref_audio`/`ref_text`/
`gender`/`speed`/`instruct`). Pull new ones with the **targeted**
`scripts/download-ad-voices.py` (add entries to its `AD_VOICES` map) — NOT the wholesale
`download-voices.py`, which overwrites hand-sourced refs. Announcer runs fast
(`speed` ~1.4); disclaimer faster (~1.6) for the rattled-off legal tail.

## Generate

```bash
# repo root, dia2 uv env (see radio-episodes for setup)
uv run --project ../dia2 python scripts/generate-radio-dia2.py <ad-slug>
```

Writes `track` + per-line timestamps back into the ad JSON. `generate-radio.py --all`
skips `engine: dia*`, so ads are excluded from the OmniVoice batch.

## Checklist for a new ad

1. Write `<ad-slug>.json` (2 speakers, announcer first, ~13s of text, TTS-safe).
2. Add it to `ADS` (+ any new voice to `CAST`) in `radio.ts`.
3. Add ad voices to `cast.json` (+ pull via `download-ad-voices.py` if new).
4. `uv run --project ../dia2 python scripts/generate-radio-dia2.py <ad-slug>`.
5. `cd Website && bun run build`, then check `/radio` airs it after a music break.
6. Commit the JSON, the `<ad-slug>/` audio dir, and cast/voice changes.
