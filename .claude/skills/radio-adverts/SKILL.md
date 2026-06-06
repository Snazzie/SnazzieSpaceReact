---
name: radio-adverts
description: Write, generate, and slot Snazzie FM adverts — short (~13s) skippable GTA-radio-style parody ad spots that air between episodes. Use when creating or editing a radio advert. Builds on the radio-episodes skill for the shared OmniVoice pipeline.
---

# Snazzie FM Adverts

Short parody radio ads (~13 seconds) that air **between every show** on the `/radio`
playlist: **episode -> ad -> next episode**, with a music break only every `MUSIC_EVERY`-th
transition (currently 3: episode -> music -> ad -> next). Ads are **skippable** (skip jumps to
the next episode). They use their own voices (never host/caller voices) and are rendered
with **OmniVoice** (the default multitrack engine — one clip per line, NOT Dia2). For the
shared TTS pipeline, voices, overlap, and pronunciation rules, see the **radio-episodes**
skill — this skill only adds what is advert-specific.

> Engine note: ads were originally Dia2 but moved to OmniVoice (Dia2 quality was poor for
> this). An ad is just a tiny OmniVoice episode — per-line clips, no top-level `track`.

## Format (the formula)

- **~13 seconds.** Per-line OmniVoice clips. Current tuning: announcer `speed` ~1.1 (slower,
  confident pitchman); disclaimer `speed` 1.3 + `tempo` ~1.3 (see the tempo note below).
  ~30-40 words total lands near 10-13s. Keep it tight.
- **Close on "Terms and conditions apply."** — the standard disclaimer-man sign-off.
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
- The player (`useRadioAudio.ts`) airs a **random** ad from `ADS` between every show (`afterShow`
  + `MUSIC_EVERY`); `startAd` schedules the per-line clips (or a single `track` if one exists)
  and advances to the next episode on the last clip's end. Skipping during an ad jumps to the
  next episode. The next slot's audio is **pre-decided and prefetched** during the current
  show (decode cache + `plannedRef`) so transitions are gap-free.
- The receiver readout shows **"AD BREAK" + the ad title** during an ad; it also surfaces in
  the now-playing panel and mini-player.
- Behind-the-scenes: ads also appear in the `RadioStation` debug player
  (`/snazziefm/behindthescenes`) via its `ads` prop (shared `[...episodes, ...ads]` index).

## Voices

The curated ad-voice roster is pinned in **`scripts/ad-voices.json`** — each voice mapped to
its LibriSpeech speaker id (+ which ad uses it, pitch, gender). That registry is the source
of truth for WHICH voice; `scripts/download-ad-voices.py` reads it to re-pull the exact roster
reproducibly. To curate, edit `ad-voices.json` (discover a candidate speaker first with the
pickers below).

Per-voice TTS tuning lives in `scripts/cast.json` like any cast member (`ref_audio`/`ref_text`/
`gender`/`speed`/`tempo`/`num_step`/`position_temperature`/`seed`/`phone_filter`/`instruct`).
OmniVoice honors `speed` and `phone_filter`.
Pull new refs with the **targeted** `scripts/download-ad-voices.py` (add entries to its
`AD_VOICES` map) — NOT the wholesale `download-voices.py`, which overwrites hand-sourced
refs. For a batch of fresh ANNOUNCER voices (one per ad, varied pitch), use
`scripts/pick-announcer-voices.py`; for the shared disclaimer man, `scripts/pick-disclaimer-voice.py`.
Both auto-verify gender by median F0 (the ~95-160 Hz band can still admit a low female, e.g.
LibriSpeech 8463/"Kim" at 149 Hz — exclude and re-pick if one sounds female). The announcer is a confident, unhurried pitchman (`speed` ~1.1).

**Fast disclaimer: use `tempo`, NOT a big `speed`.** OmniVoice's `speed` token stops actually
speeding up past ~2.0 and starts DROPPING the tail of the line (truncated audio). For the
rattled-off legal-tail sound, keep the disclaimer's generation `speed` modest (~1.3 so the
WHOLE line renders) and set a `tempo` field (e.g. `1.3`-`2.0`) — the generator time-stretches
the finished clip with ffmpeg `atempo` (pitch-preserving, lossless), so every word survives and it
genuinely sounds faster. `tempo > 1` = faster/shorter. Crank `tempo`, not `speed`. (Tempo
uses ffmpeg `atempo`/WSOLA — clean on speech; a phase vocoder sounds watery.)

**ALWAYS split the disclaimer line with `<p:0>` between clauses.** This is not just a
fallback — OmniVoice reliably DROPS clauses (not only the tail) from a long, fast single
utterance, and the disclaimer is the longest+fastest line in every ad (speed 1.3 + tempo
1.3). Symptom: whole sentences silently missing from the rendered clip even though they're
in the script (e.g. "Not for cats." vanishing). Author every disclaimer as one `<p:0>`-
separated segment per sentence/clause from the start:

```
"Anesthesia not included. <p:0> Surgeons not licensed, or human. <p:0> ...
 <p:0> Terms and conditions apply."
```

`<p:0>` is a zero-silence split: each segment is TTS'd separately (so nothing elides) but
they concatenate with NO audible gap, so the breathless rattle is preserved. Use `<p:0>`,
NOT `<p:0.1>` etc. — a real gap breaks the rattle. Rule of thumb: any disclaimer over ~14
words needs it; just do it on all of them. A quick check that a re-rendered disclaimer is
longer than the old take confirms the dropped text came back.

**The same elision hits ANNOUNCER lines once they get long (~30+ words).** Any long line is
a single utterance and will drop a clause. Split the announcer at SENTENCE boundaries too —
but with a small real pause **`<p:0.2>`** (not `<p:0>`): the announcer wants a natural
breath between sentences, unlike the breathless disclaimer. So: disclaimer = gapless `<p:0>`
per clause; announcer = `<p:0.2>` per sentence. (`scripts/make-ads-batch.py` does the
announcer split automatically via `split_sentences()` — insert `<p:0.2>` after each `.`/`!`/
`?`.) If you hear words skipped in playback, it's this — re-split the offending line, don't
blame the seed.

**Quality knobs** (optional per-voice cast fields, passed to OmniVoice's generation_config):
`num_step` = denoising iterations (default 32; 48-64 is cleaner, slower), `guidance_scale`
(default 2.0), `position_temperature` (default 5.0; LOWER = steadier/flatter, e.g. the
disclaimer man runs ~1.5) and `class_temperature` (default 0.0). Bump `num_step` if a voice
sounds low-quality/artifacty; drop `position_temperature` for a flatter monotone. All fold
into the clip hash only when set, so they re-render just that voice.

**Reroll a bad take with `seed`.** Generation is seeded (global default 42), so re-rendering
gives the SAME take. Set a per-voice `seed` to reroll just that clip — a different seed is a
different realization of the same voice/text; if a clip has an artifact or odd delivery, try
another seed (it's in the clip hash, so changing it re-renders only that voice). `phone_filter` is `false` for both (studio ad).

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
   `engine`/`track`). Split the disclaimer line with `<p:0>` between every clause (see the
   disclaimer rule above) or OmniVoice will drop sentences from it.
2. Add it to `ADS` (+ any new announcer voice to `CAST`) in `radio.ts`. Reuse the existing
   `ad-disclaimer` for the final line.
3. Add any new ad voice to `cast.json` (+ pull via `download-ad-voices.py` if new).
4. `python scripts/generate-radio.py <ad-slug>`.
5. `cd Website && bun run build`, then check `/radio` airs it between shows (AD BREAK in the
   receiver) and `/snazziefm/behindthescenes` lists it under ADS.
6. Commit the JSON, the `<ad-slug>/` clip dir (incl. `.clips.json`), and cast/voice changes.
