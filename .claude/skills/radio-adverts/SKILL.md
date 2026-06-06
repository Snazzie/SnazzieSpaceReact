---
name: radio-adverts
description: Write, generate, and slot Snazzie FM adverts — short (~13s) skippable GTA-radio-style parody ad spots that air between episodes. Use when creating or editing a radio advert. Builds on the radio-episodes skill for the shared OmniVoice pipeline.
---

# Snazzie FM Adverts

Short parody radio ads (~13 seconds) that air as an interstitial in the `/radio`
playlist: **episode -> music -> ad -> next episode**. Ads are **skippable** (skip jumps to
the next episode). They use their own voices (never host/caller voices) and are rendered
with **OmniVoice** (the default multitrack engine — one clip per line, NOT Dia2). For the
shared TTS pipeline, voices, overlap, and pronunciation rules, see the **radio-episodes**
skill — this skill only adds what is advert-specific.

> Engine note: ads were originally Dia2 but moved to OmniVoice (Dia2 quality was poor for
> this). An ad is just a tiny OmniVoice episode — per-line clips, no top-level `track`.

## Format (the formula)

- **~13 seconds.** Per-line OmniVoice clips. OmniVoice DOES honor each character's `speed`,
  so the announcer (1.4) and disclaimer (1.6) actually run fast. Rough budget ~0.3-0.4s per
  word at those speeds; ~30-40 words total lands near 10-13s. Keep it tight.
- **Two voices, announcer + disclaimer:**
  - `ad-announcer` — bright, manic hard-sell pitchman.
  - `ad-disclaimer` — the recurring "disclaimer man": flat, fast, monotone fine-print reader.
- **Structure:** announcer pitch (hook -> absurd promise, with the brand + tagline button
  folded into the end of the pitch) -> disclaimer machine-guns the horrifying side-effects /
  legal tail. **The disclaimer is ALWAYS the last line** — the grim fine print is the last
  thing the listener hears. A 2-line ad (announcer, then disclaimer) is the default shape;
  any longer ad still ENDS on the disclaimer.
- First line is the announcer; last line is the disclaimer. (OmniVoice has no speaker-count
  limit, but keep ads to these two roles.)

## The disclaimer is one shared voice across ALL ads

`ad-disclaimer` is a SINGLE recurring character — the same "disclaimer man" voice in every
ad, so listeners recognize him. Do NOT create a new disclaimer voice per ad, and do NOT
reuse the announcer's voice for him (he is distinct from the announcer). Every ad's final
line uses `speaker: "ad-disclaimer"`. The announcer voice can vary per ad if you want, but
the disclaimer stays constant.

## Tone

Diabolical GTA-radio energy. A real product category (hemorrhoid cream, energy drink,
discount surgery, legal services) sold with deranged enthusiasm; the disclaimer
undercuts it with deadpan body-horror. Content tiers: PG-13 gross-out up to harder R —
parody only, no slurs / real-world shock content. Punch up at the product, not at people.

## TTS-safe text

Same rules as radio-episodes: text is sent verbatim to OmniVoice. No em-dashes (the long
dash reads as "euro") — use `...` or commas. ASCII punctuation only. UTF-8. Nonverbals
`(laughs)`/`(sighs)` are Dia-ONLY and are read aloud literally by OmniVoice — never use them
in an ad.

## Data + slot

- Script: `Website/src/data/radio/<ad-slug>.json` — `type: "ad"`, NO `engine` field, NO
  `track`. Authored fields only per line (`speaker`, `text`, `overlap`; `timestamp`/
  `duration` = 0, no `audio`). The generator fills `timestamp`/`duration`/`audio`.
- Register: import it in `Website/src/data/radio.ts` and add to `export const ADS`.
  Add any new ad voice to `CAST` there (reuse `role: "Guest Expert"`).
- The player (`useRadioAudio.ts`) airs a **random** ad from `ADS` after each music break;
  `startAd` schedules the per-line clips (or a single `track` if one exists) and advances to
  the next episode on the last clip's end. Skipping during an ad jumps to the next episode.
- Behind-the-scenes: ads also appear in the `RadioStation` debug player
  (`/snazziefm/behindthescenes`) via its `ads` prop (shared `[...episodes, ...ads]` index).

## Voices

Ad voices live in `scripts/cast.json` like any cast member (`ref_audio`/`ref_text`/
`gender`/`speed`/`phone_filter`/`instruct`). OmniVoice honors `speed` and `phone_filter`.
Pull new refs with the **targeted** `scripts/download-ad-voices.py` (add entries to its
`AD_VOICES` map) — NOT the wholesale `download-voices.py`, which overwrites hand-sourced
refs. The announcer is a confident, unhurried pitchman (`speed` ~1.1).

**Fast disclaimer: use `tempo`, NOT a big `speed`.** OmniVoice's `speed` token stops actually
speeding up past ~2.0 and starts DROPPING the tail of the line (truncated audio). For the
rattled-off legal-tail sound, keep the disclaimer's generation `speed` modest (~1.3 so the
WHOLE line renders) and set a `tempo` field (e.g. `2.3`) — the generator time-stretches the
finished clip with `librosa` (pitch-preserving, lossless), so every word survives and it
genuinely sounds faster. `tempo > 1` = faster/shorter. Crank `tempo`, not `speed`. (Tempo
uses ffmpeg `atempo`/WSOLA — clean on speech; a phase vocoder sounds watery.)

**Quality knobs** (optional per-voice cast fields, passed to OmniVoice's generation_config):
`num_step` = denoising iterations (default 32; ~48 is cleaner, slower) and `guidance_scale`
(default 2.0). Bump `num_step` if a voice sounds low-quality/artifacty. Both fold into the
clip hash only when set, so they re-render just that voice. `phone_filter` is `false` for both (studio ad).

## Generate

```bash
# repo root, project python (same env as normal episodes)
python scripts/generate-radio.py <ad-slug>
```

Writes per-line `timestamp`/`duration`/`audio` back into the ad JSON and one clip per line
to `Website/public/audio/radio/<ad-slug>/<i>.flac`. Caching is per-clip (content hash), so
re-running only re-renders changed lines.

## Checklist for a new ad

1. Write `<ad-slug>.json` (announcer first, disclaimer LAST, ~30-40 words, TTS-safe; no
   `engine`/`track`).
2. Add it to `ADS` (+ any new announcer voice to `CAST`) in `radio.ts`. Reuse the existing
   `ad-disclaimer` for the final line.
3. Add any new ad voice to `cast.json` (+ pull via `download-ad-voices.py` if new).
4. `python scripts/generate-radio.py <ad-slug>`.
5. `cd Website && bun run build`, then check `/radio` airs it after a music break and
   `/snazziefm/behindthescenes` lists it under ADS.
6. Commit the JSON, the `<ad-slug>/` clip dir (incl. `.clips.json`), and cast/voice changes.
