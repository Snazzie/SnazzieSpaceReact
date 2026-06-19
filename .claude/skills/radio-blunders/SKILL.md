---
name: radio-blunders
description: Write, generate, and slot Snazzie FM "blunder" ads — short bloopers where a local business owner flubs their own self-recorded radio spot. A sub-category of radio adverts with its own rules (no announcer, no disclaimer, two failed attempts). Use when creating or editing a blunder ad. Builds on radio-adverts + radio-episodes for the shared OmniVoice pipeline.
---

# Snazzie FM Blunder Ads

Blunder ads are the **InstaAd** category: a local business owner records their own radio
spot via the (fictional) "InstaAd" self-serve service ("call the number, wait for the beep,
record your message") and it airs **exactly as received** — i.e. badly. They are the comedic
counterpoint to the polished announcer ads. The straight **InstaAd** promo (`ad-instaad`) sets
up the conceit; every blunder is someone using it wrong.

For the shared TTS pipeline, voices, pause tokens, pronunciation rules, and the bulk
generator, see **radio-episodes**. For the standard announcer+disclaimer ad format, see
**radio-adverts**. This skill only covers what is blunder-specific.

## The formula

- **No announcer. No disclaimer.** It is just the owner talking into the mic. (This breaks
  the radio-adverts "always end on the disclaimer" rule on purpose.)
- **Voiced by a local caller voice**, never `ad-announcer`/`ad-disclaimer`. The owner is an
  ordinary person, so use a `caller-*` voice (gary, steve, frank, darnell, chad, patricia,
  linda, winston, kim, mildred...). Cycle them across the batch for variety.
- **Two shapes, by failure type:**
  - **SPLIT** — a HARD FUMBLE where they stop and re-record. Two independent numbered spots
    that air separately: `ad-<slug>-1` ("<Business> #1") and `ad-<slug>-2` ("#2"), same caller
    voice. The retry fails too — escalate or pivot, don't repeat. Use when the gag is "they
    gave up and tried again later" (blanks, misreads, forgot the price, wrong script).
  - **LONG** — an INTERRUPTION they push through in ONE continuous take (dog, phone, coworker,
    kids, customers). Single spot, no number. Use when the gag is sustained: the interruption
    keeps happening while they doggedly keep pitching. A split would make no sense here (you
    don't "re-record" a phone that keeps ringing) — keep it one recording.
  - Pick by asking: does the bit make sense as a clean restart (SPLIT) or only as one
    unbroken, repeatedly-interrupted take (LONG)?
- **ALWAYS name the business AND what it sells** — in BOTH attempts, woven through the
  fumbling. The single most common mistake is a blunder that's funny but never says what the
  shop is. "Maxine's Salon, cuts, color, and blowouts..." then the flub. Business name +
  product first, THEN the screw-up.
- **~5-15s per attempt.** Short. The bit is the failure, not the pitch.

## The blunder must be internally consistent

The failure has to make physical sense for a recording.
- **"Out of time" = the audio literally cuts off** (end the line mid-sentence / mid-word, no
  trailing punctuation). Do NOT have them say "I'm out of time" and then keep talking — if
  they're out of time, they're cut off. e.g. `"...right next to the"` (just stops).
- A ringing phone, a barking dog, a spouse off-mic, reading the on-screen stage directions
  aloud ("insert slogan here", "pause for laughter"), starting before the beep, not knowing
  if it's recording, forgetting the price/name, misreading a word — all good, all plausible
  for someone alone with a mic.
- Keep it a believable home/office recording: no fantasy, no SFX they couldn't make with
  their voice.

## TTS-safe text (same as radio-episodes, with emphasis)

- **No em-dashes / `--`** (OmniVoice reads `—` as "euro"). Use `...` or commas.
- **No parenthetical sound effects** — `(coughs)`, `(sighs)` are read aloud literally by
  OmniVoice. Convey the fumble with words and pauses instead.
- Use the **`<p:N>` pause token** for comic timing (`<p:0.3>`-`<p:0.5>` between beats). It
  also splits the line into segments so nothing elides.
- ASCII punctuation, UTF-8. Spell tricky brands per the radio-episodes pronunciation rules
  (de-glue handles camelCase; `PRONUNCIATIONS` map for stubborn ones).

## Data + category

- Blunders are authored in bulk in **`scripts/make-blunder-ads.py`** — the source of truth.
  Business names are anchored to constants at the top (e.g. `SALS = "Sal's Pizza"`) so the
  spoken name, title, and slug never drift; reference the constant in the f-string text.
  - `SPLIT` entries `(slug, NAME, attempt1, attempt2)` emit `ad-<slug>-1/-2.json` ("#1"/"#2").
  - `LONG` entries `(slug, NAME, voice, text)` emit a single `ad-<slug>.json`.
  Both carry `type: "ad"` and **`blunder: true`**. Edit the lists and re-run to (re)emit.
- Register the import in `Website/src/projects/snazziefm/data/radio.ts` and add it to **`BLUNDER_ADS`** (a named
  subset). `ADS` is `[...STANDARD_ADS, ...BLUNDER_ADS]`, so blunders still air in the rotation;
  the `blunder` flag (carried through `adFrom`) is what groups them.
- Behind-the-scenes (`RadioStation`) shows a **Blunders** tab alongside Shows / Ads, filtered
  by the `blunder` flag.

## Generate (bulk — see radio-episodes)

```bash
python scripts/make-blunder-ads.py          # (re)emit all blunder JSONs (ad-<slug>-1/-2)
python scripts/generate-radio.py ad-petes-hardware-1 ad-petes-hardware-2 ...   # ONE process, many slugs
```

Pass every changed slug in a single `generate-radio.py` invocation so the model loads once
and each caller voice's clone prompt is cached. Caching is per-clip: an unchanged attempt is
reused, only edited/added lines re-render.

## Checklist for a blunder ad

1. Add/edit the entry in `scripts/make-blunder-ads.py` (business + product named in BOTH
   attempts; failure is consistent; TTS-safe; no announcer/disclaimer).
2. `python scripts/make-blunder-ads.py` to emit the JSON.
3. Register the import + add to `BLUNDER_ADS` in `radio.ts` (new slugs only).
4. `python scripts/generate-radio.py <slug> [<slug> ...]` (bulk, one process).
5. `cd Website && bun run build`; check `/snazziefm/behindthescenes` Blunders tab and that it
   airs on `/radio`.
6. ASR spot-check is wise (`faster_whisper`) — confirm the business name + product survive the
   fumble and the cut-offs land where intended.
7. Commit the JSON(s), the clip dir(s), `make-blunder-ads.py`, and `radio.ts`.
