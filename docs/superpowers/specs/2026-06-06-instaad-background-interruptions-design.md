# InstaAd Background Customers + Interruptions — Design

**Date:** 2026-06-06
**Status:** Approved (curated batch)

## Goal

Make the InstaAd-category blunder ads sound like they were genuinely self-recorded
inside a working business: a low ambient bed under the spot, plus an off-mic customer
who interrupts the owner mid-recording. Believability, not new format.

## Scope

Curated batch of **5** blunder ads:

| Spot | Owner voice | Bed | Customer voice | Beat |
|---|---|---|---|---|
| ad-donnas-diner | caller-patricia | bg-restaurant (trim) | caller-kim | "can we get menus?" → "be right there, hon" |
| ad-sals-pizza-1 | caller-gary | bg-restaurant (trim) | caller-chad | "are you guys open?" → "one sec, I'm doing the radio" |
| ad-big-mikes-subs-1 | caller-linda | bg-restaurant (trim) | caller-chad | "number four, no onions!" → "...hang on. No onions." |
| ad-tonys-gym | caller-linda | **bg-gym** (trim) | caller-darnell | "you done with this rack?" → harder flub |
| ad-carls-carpets-1 | caller-steve | bg-restaurant (trim) | caller-kim | "do these come in beige?" → drops the script |

## Engine (no code changes)

All via existing multitrack primitives (proven in `the-cat-special`):
- **Bed:** a line with `background: true` + `sfx: <bed>` + `distant: true` + `gain` ~0.18-0.25
  + `trim: <secs>`. `background` does not advance the speech cursor; `trim` keeps only the
  first N seconds. Bed MUST be trimmed shorter than the final owner clip's end, or it
  becomes the longest-ending source and stalls the ad (`playAd` advances on the last source).
- **Customer:** a normal TTS line using an existing caller voice (≠ owner), `distant: true`
  + `gain` ~0.5, placed via `overlap` to cut in.
- **Interruption:** the owner's single blunder line is split into a short exchange
  (owner → customer cut-in → owner reaction/resume) so the placer can interleave turns.

## Assets

- **Reuse** `scripts/sfx/bg-restaurant.wav` (CC0, already in repo) for all food/retail beds;
  `distant` muffles it into generic indoor murmur. No download.
- **Build one** `scripts/sfx/bg-gym.wav` via a new `scripts/sfx/build-bg-beds.sh`
  (ffmpeg, same approach as `build-bg-kitchen.sh`): `metal-clatter` spaced out (weight-plate
  drops) layered under low `bg-restaurant` murmur. All sources CC0. Append to CREDITS.txt.
- No new cast voices (reuse caller voices as customers). No new `radio.ts` registration
  (all voices already in CAST).

## Procedure (per spot)

1. Rewrite the spot JSON: bed line first (`background`+`sfx`+`distant`+`gain`+`trim`),
   then the owner/customer exchange lines with `overlap`. Keep blunder rules: no announcer,
   no disclaimer, end on the flub.
2. `python scripts/generate-radio.py <slug>` — renders new clips.
3. Read back the timeline; set the bed `trim` to (final owner clip end − ~0.4s); regenerate.
4. Verify the bed is not the last-ending source (ad advances on a dialogue clip).

## Out of scope

- The other 31 blunder ads (later batches once technique is proven).
- New CC0 downloads / new TTS voices.
- Any change to `useRadioAudio.ts`, `generate-radio.py`, or `radio.ts`.

## Testing

- `cd Website && bun run build` passes.
- Each spot's total timeline stays in a sane ad range; bed never controls ad end.
- `/radio` airs them (AD BREAK), `/snazziefm/behindthescenes` lists them under InstaAd.
