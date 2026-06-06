# Snazzie FM Adverts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add short (~13s) unskippable parody adverts to Snazzie FM, airing as an interstitial (episode → music → ad → next episode), rendered with Dia2 using two brand-new announcer + disclaimer voices, starting with one hemorrhoid-cream ad.

**Architecture:** An ad is a tiny Dia2 "episode" (single `track` FLAC, 2 alternating speakers). A new `ADS: Episode[]` array is threaded through `RadioLanding` into the `useRadioAudio` hook, which chains a random ad after the music interstitial and ignores skip while the ad plays. Two new cast voices are pulled with a targeted, re-runnable download script so existing hand-sourced refs are untouched.

**Tech Stack:** Astro + React, Web Audio API, TypeScript (strict), Dia2 TTS (uv env), Python.

**Verification approach:** The radio subsystem has no component tests in this repo; it is verified by `cd Website && bun run build` plus a manual `/radio` playthrough (see spec Verification). This plan uses build + manual verification, matching the established pattern, rather than forcing Web-Audio unit tests.

---

## File Structure

- **Create** `Website/src/data/radio/ad-soothe-master.json` — the seed ad script (Dia2, 2 speakers).
- **Modify** `Website/src/data/radio.ts` — import the ad, export `ADS: Episode[]`, add `ad-announcer` / `ad-disclaimer` to `CAST`.
- **Modify** `scripts/cast.json` — add `ad-announcer` / `ad-disclaimer` voice configs.
- **Create** `scripts/download-ad-voices.py` — targeted, re-runnable pull of the two new refs (does NOT overwrite other voices).
- **Modify** `Website/src/components/useRadioAudio.ts` — `ads` param, `adIdx`/`adPlaying` state, ad chaining, unskippable skip.
- **Modify** `Website/src/components/RadioLanding.tsx` — pass `ads` to the hook, render the ad now-playing panel, disable skip while ad airs.
- **Modify** `Website/src/pages/snazziefm/index.astro` — pass `ADS` into `RadioLanding`.
- **Create** `Website/public/audio/radio/ad-soothe-master/episode.flac` — generated (Task 4).
- **Create** `.claude/skills/radio-adverts/SKILL.md` — the dedicated advert skill.

---

## Task 1: Seed ad script + data wiring (no audio yet)

**Files:**
- Create: `Website/src/data/radio/ad-soothe-master.json`
- Modify: `Website/src/data/radio.ts`
- Modify: `Website/src/pages/snazziefm/index.astro`

- [ ] **Step 1: Write the ad script JSON**

Create `Website/src/data/radio/ad-soothe-master.json`. Exactly 2 distinct speakers, first line is the announcer (`[S1]`), strictly alternating. TTS-safe text (ASCII punctuation, no em-dashes). `timestamp`/`duration` are `0` until generated.

```json
{
  "slug": "ad-soothe-master",
  "title": "Soothe-Master 5000",
  "description": "A paid message from Soothe-Master Industrial Wellness. Results not typical. Nothing is typical.",
  "type": "ad",
  "engine": "dia2",
  "no_phone": ["ad-announcer", "ad-disclaimer"],
  "lines": [
    {
      "speaker": "ad-announcer",
      "text": "Burning? Itching? Sitting down like it's a hostage negotiation? Friend, you need the Soothe-Master 5000! One squeeze of our patented industrial-grade comfort paste and that fire goes OUT. Doctors are baffled. Your couch will thank you!",
      "overlap": 0,
      "timestamp": 0,
      "duration": 0
    },
    {
      "speaker": "ad-disclaimer",
      "text": "Soothe-Master may cause numbness, blindness, a second opinion, and mild glowing. Do not ingest, inhale, or make eye contact with the nozzle. Not approved by anyone. Side effects include regret.",
      "overlap": 0,
      "timestamp": 0,
      "duration": 0
    },
    {
      "speaker": "ad-announcer",
      "text": "Soothe-Master 5000. Sit like a winner!",
      "overlap": 0,
      "timestamp": 0,
      "duration": 0
    }
  ]
}
```

- [ ] **Step 2: Wire the ad into `radio.ts`**

In `Website/src/data/radio.ts`:

Add the import beside the other episode imports (after line 10):
```ts
import adSootheMaster from "./radio/ad-soothe-master.json";
```

Add the two ad voices to the `CAST` map (inside the `CAST` object, after the `"phone"` entry):
```ts
  "ad-announcer":  { id: "ad-announcer",    name: "Announcer",         color: "#f6c945", role: "Guest Expert" },
  "ad-disclaimer": { id: "ad-disclaimer",   name: "Fine Print",        color: "#9aa0a6", role: "Guest Expert" },
```
(`role` reuses the existing `"Guest Expert"` union member so the `CastMember["role"]` type is unchanged.)

Add the `ADS` export after the `MUSIC_TRACKS` array (after line 117):
```ts
export const ADS: Episode[] = [
  episodeFrom(adSootheMaster),
];
```
`episodeFrom` already maps `slug`/`title`/`description`/`lines`/`track`; the ad's `track` is empty until Task 4, which is fine — the player simply skips an ad with no track.

- [ ] **Step 3: Pass `ADS` into the landing page**

In `Website/src/pages/snazziefm/index.astro`:

Change the import (line 4) to include `ADS`:
```ts
import { EPISODES, MUSIC_TRACKS, ADS, CAST } from '@/data/radio';
```
Change the component usage (line 29) to pass `ads`:
```astro
<RadioLanding client:load episodes={EPISODES} music={MUSIC_TRACKS} ads={ADS} cast={CAST} />
```

- [ ] **Step 4: Verify the build passes**

Run: `cd Website && bun run build`
Expected: build succeeds. (`RadioLanding` doesn't yet accept `ads`; TS may warn about an unknown prop on a `client:load` island but Astro passes it through — if `bun run build` reports a type error on the `ads` prop, it resolves in Task 5 when the prop is declared. If the build hard-fails here, do Task 5 before re-running.)

- [ ] **Step 5: Commit**

```bash
git add Website/src/data/radio/ad-soothe-master.json Website/src/data/radio.ts Website/src/pages/snazziefm/index.astro
git commit -m "feat(radio): add Soothe-Master ad script + ADS data wiring"
```

---

## Task 2: New advert voices (cast config + targeted pull)

**Files:**
- Modify: `scripts/cast.json`
- Create: `scripts/download-ad-voices.py`

- [ ] **Step 1: Add the two voice configs to `cast.json`**

Read `scripts/cast.json` as **UTF-8** (it contains non-ASCII; a cp1252 read corrupts it). Add two entries. `ref_audio`/`ref_text` are placeholders until Step 3 fills them:

```json
  "ad-announcer": {
    "name": "Announcer",
    "color": "#f6c945",
    "role": "Guest Expert",
    "instruct": "male, middle-aged, high pitch, american accent",
    "speed": 1.4,
    "phone_filter": false,
    "ref_audio": "scripts/voices/ad-announcer.wav",
    "ref_text": "",
    "gender": "M"
  },
  "ad-disclaimer": {
    "name": "Fine Print",
    "color": "#9aa0a6",
    "role": "Guest Expert",
    "instruct": "male, middle-aged, low pitch, american accent",
    "speed": 1.6,
    "phone_filter": false,
    "ref_audio": "scripts/voices/ad-disclaimer.wav",
    "ref_text": "",
    "gender": "M"
  },
```

- [ ] **Step 2: Write the targeted voice-download script**

Create `scripts/download-ad-voices.py`. This pulls ONLY the two new speakers from LibriSpeech test-clean and updates ONLY their `cast.json` entries — it never touches the other hand-sourced refs (Todd=FLEURS, Kim, etc.), unlike `download-voices.py`.

```python
#!/usr/bin/env python3
"""Targeted pull of the two advert reference voices (announcer + disclaimer).

Streams LibriSpeech test-clean, grabs ONLY the two speakers below, writes their
wav+txt to scripts/voices/, and updates ONLY their cast.json entries. Does NOT
overwrite any other voice (safe to run after Todd/Kim were hand-diverged).

Usage:  python scripts/download-ad-voices.py
"""
import io, json, warnings
from pathlib import Path
warnings.filterwarnings("ignore")
import numpy as np
import soundfile as sf

CAST_FILE  = Path(__file__).parent / "cast.json"
VOICES_DIR = Path(__file__).parent / "voices"
TARGET_SR  = 24_000
MIN_CLIP_SECS = 4.0

# character -> (test-clean speaker_id, gender). Two UNUSED speakers (not in the
# existing 14). Both verified male in LibriSpeech SPEAKERS.TXT. If a voice sounds
# wrong, change the speaker id here and re-run.
AD_VOICES = {
    "ad-announcer":  (1580, "M"),
    "ad-disclaimer": (2830, "M"),
}

def resample(audio, orig_sr, target_sr):
    if orig_sr == target_sr:
        return audio
    from scipy.signal import resample_poly
    from math import gcd
    g = gcd(orig_sr, target_sr)
    return resample_poly(audio, target_sr // g, orig_sr // g).astype(np.float32)

def main():
    import datasets as hf_datasets
    from datasets import load_dataset
    VOICES_DIR.mkdir(exist_ok=True)
    cast = json.loads(CAST_FILE.read_text(encoding="utf-8"))
    needed = {sid for sid, _ in AD_VOICES.values()}
    ds = load_dataset("openslr/librispeech_asr", "clean", split="test", streaming=True)
    ds = ds.cast_column("audio", hf_datasets.Audio(decode=False))
    collected = {}
    for sample in ds:
        spk = int(sample["speaker_id"])
        if spk not in needed or spk in collected:
            continue
        raw = sample["audio"]
        rb = raw.get("bytes") or open(raw["path"], "rb").read()
        arr, sr = sf.read(io.BytesIO(rb), dtype="float32")
        arr = arr.astype(np.float32)
        text = sample.get("text", "").strip()
        if len(arr) / sr < MIN_CLIP_SECS or not text:
            continue
        collected[spk] = (arr, sr, text)
        print(f"  {spk}: {len(arr)/sr:.1f}s - \"{text[:60]}\"")
        if len(collected) == len(needed):
            break
    for char, (sid, gender) in AD_VOICES.items():
        if sid not in collected:
            print(f"  WARN: no sample for {char} ({sid})")
            continue
        arr, sr, text = collected[sid]
        sf.write(str(VOICES_DIR / f"{char}.wav"), resample(arr, sr, TARGET_SR), TARGET_SR)
        (VOICES_DIR / f"{char}.txt").write_text(text, encoding="utf-8")
        if char in cast:
            cast[char]["ref_audio"] = f"scripts/voices/{char}.wav"
            cast[char]["ref_text"]  = text
            cast[char]["gender"]    = gender
        print(f"  {char} ({sid}, {gender}) saved")
    CAST_FILE.write_text(json.dumps(cast, indent=2, ensure_ascii=False), encoding="utf-8")
    print("cast.json updated for ad voices.")

if __name__ == "__main__":
    main()
```

- [ ] **Step 3: Run the targeted pull**

Run: `python scripts/download-ad-voices.py`
Expected: prints two `... saved` lines; creates `scripts/voices/ad-announcer.wav` + `.txt` and `scripts/voices/ad-disclaimer.wav` + `.txt`; fills their `ref_text` in `cast.json`.
If a speaker id yields no clip (`WARN`), pick another unused test-clean id (e.g. `3575`, `8555`, `7176`) and re-run.

- [ ] **Step 4: Commit**

```bash
git add scripts/cast.json scripts/download-ad-voices.py scripts/voices/ad-announcer.wav scripts/voices/ad-announcer.txt scripts/voices/ad-disclaimer.wav scripts/voices/ad-disclaimer.txt
git commit -m "feat(radio): add announcer + disclaimer advert voices"
```

---

## Task 3: Player integration — ad chaining + unskippable (useRadioAudio)

**Files:**
- Modify: `Website/src/components/useRadioAudio.ts`

- [ ] **Step 1: Extend the hook signature and state**

In `Website/src/components/useRadioAudio.ts`:

Add to the `RadioAudioState` interface (after `musicLoading` on line 13):
```ts
  adIdx: number | null;
  adPlaying: boolean;
```

Change the function signature (line 26):
```ts
export function useRadioAudio(episodes: Episode[], music: Episode[], ads: Episode[] = []): RadioAudioState {
```

Add state + a ref mirror right after the `musicLoading` state (after line 32):
```ts
  const [adIdx, setAdIdx] = useState<number | null>(null);
  const [adPlaying, setAdPlaying] = useState(false);
  const adPlayingRef = useRef(false);
  useEffect(() => { adPlayingRef.current = adPlaying; }, [adPlaying]);
```

- [ ] **Step 2: Include ads in the animation/active flag**

In the level-meter effect, change the `active` line (line 56) to:
```ts
      const active = playing || musicPlaying || adPlaying;
```
And add `adPlaying` to that effect's dependency array (line 77):
```ts
  }, [playing, musicPlaying, adPlaying]);
```

- [ ] **Step 3: Add the ad picker and `startAd`**

Add these right after `musicIdxForEpisode` (after line 126):
```ts
  // a random ad to air after a music break
  function pickAd(): number {
    return Math.floor(Math.random() * ads.length);
  }

  // play a single-track ad, then advance to the next episode
  async function startAd(adIndex: number, nextEpIdx: number, gen: number) {
    const ad = ads[adIndex];
    if (!ad?.track) { setAirIdx(nextEpIdx); startEpisode(nextEpIdx); return; }
    const { ctx, analyser } = getCtx();
    await ctx.resume();
    if (gen !== genRef.current) return;
    setAdIdx(adIndex);
    setAdPlaying(true);
    try {
      const buf = await decode(ctx, ad.track);
      if (gen !== genRef.current) return;
      const s = ctx.createBufferSource();
      s.buffer = buf;
      s.connect(analyser);
      const at = ctx.currentTime + 0.1;
      s.start(at);
      startTimeRef.current = at;
      durationRef.current = buf.duration;
      sourcesRef.current.push(s);
      s.onended = () => {
        if (gen !== genRef.current) return;
        setAdPlaying(false);
        setAdIdx(null);
        setAirIdx(nextEpIdx);
        startEpisode(nextEpIdx);
      };
    } catch {
      setAdPlaying(false);
      setAdIdx(null);
      setAirIdx(nextEpIdx);
      startEpisode(nextEpIdx);
    }
  }
```

- [ ] **Step 4: Chain music → ad in `startInterstitial`**

In `startInterstitial`, replace the music `onended` body (lines 152-158) with a chain to an ad:
```ts
      s.onended = () => {
        if (gen !== genRef.current) return;
        setMusicPlaying(false);
        setMusicIdx(null);
        if (ads.length > 0) {
          startAd(pickAd(), nextEpIdx, gen);
        } else {
          setAirIdx(nextEpIdx);
          startEpisode(nextEpIdx);
        }
      };
```

- [ ] **Step 5: Handle the no-music-but-ads case at episode end**

In `startEpisode`, replace the episode-end handler (lines 204-213) so an ad still airs when there is no music:
```ts
    if (last) (last as AudioBufferSourceNode).onended = () => {
      if (gen !== genRef.current) return;
      const next = (idx + 1) % episodes.length;
      if (music.length > 0) {
        startInterstitial(musicIdxForEpisode(idx), next, gen);
      } else if (ads.length > 0) {
        startAd(pickAd(), next, gen);
      } else {
        setAirIdx(next);
        startEpisode(next);
      }
    };
```

- [ ] **Step 6: Make the ad unskippable**

At the very top of `nextTrack` (immediately after `function nextTrack() {`, before `startedRef.current = true;` on line 268) add:
```ts
    if (adPlayingRef.current) return;  // ads are unskippable
```

- [ ] **Step 7: Pause/resume parity for ads**

In `togglePlay`, change the pause branch (line 224) to also clear `adPlaying` (mirrors how it clears `musicPlaying`):
```ts
    if (playing) { await ctx.suspend(); setPlaying(false); setMusicPlaying(false); setAdPlaying(false); }
```

- [ ] **Step 8: Export the new state**

Add `adIdx` and `adPlaying` to the returned object (in the `return { ... }` block, after `musicLoading,` on line 314):
```ts
    adIdx,
    adPlaying,
```

- [ ] **Step 9: Verify the build passes**

Run: `cd Website && bun run build`
Expected: build succeeds (RadioLanding still calls the hook with 2 args — `ads` defaults to `[]` — so no break yet; Task 4/5 supply real ads/UI).

- [ ] **Step 10: Commit**

```bash
git add Website/src/components/useRadioAudio.ts
git commit -m "feat(radio): chain unskippable ad after music interstitial"
```

---

## Task 4: Generate the ad audio (Dia2)

**Files:**
- Create: `Website/public/audio/radio/ad-soothe-master/episode.flac` (generated)
- Modify: `Website/src/data/radio/ad-soothe-master.json` (timestamps/track written back)

- [ ] **Step 1: Generate with the Dia2 pipeline**

From the repo root, in the dia2 uv env (background task — takes minutes; first run downloads models):
```bash
uv run --project ../dia2 python scripts/generate-radio-dia2.py ad-soothe-master
```
Expected: writes `Website/public/audio/radio/ad-soothe-master/episode.flac`, and writes top-level `"track": "/audio/radio/ad-soothe-master/episode.flac"` + per-line `timestamp`/`duration` back into the ad JSON.

- [ ] **Step 2: Check length and listen**

Confirm the produced track is ~10-16s. If far off, tweak line text length in the JSON and re-run Step 1. If a voice sounds wrong-gendered or indistinct from a host, change the speaker id in `scripts/download-ad-voices.py` (`AD_VOICES`), re-run `python scripts/download-ad-voices.py`, then re-run Step 1.

- [ ] **Step 3: Verify the build passes**

Run: `cd Website && bun run build`
Expected: build succeeds; the ad now has a real `track`.

- [ ] **Step 4: Commit**

```bash
git add Website/public/audio/radio/ad-soothe-master/ Website/src/data/radio/ad-soothe-master.json
git commit -m "feat(radio): render Soothe-Master ad audio (Dia2)"
```

---

## Task 5: UI — ad now-playing panel + skip disabled

**Files:**
- Modify: `Website/src/components/RadioLanding.tsx`

- [ ] **Step 1: Accept the `ads` prop and pass it to the hook**

In `Website/src/components/RadioLanding.tsx`:

Add `ads` to `Props` (after `music?` on line 11):
```ts
  ads?: Episode[];
```
Destructure it with a default (line 57):
```ts
export default function RadioLanding({ episodes, music = [], ads = [], cast }: Props) {
  const audio = useRadioAudio(episodes, music, ads);
```

- [ ] **Step 2: Reflect ad state in the mini player**

Update the mini-player play button `aria-label` (line 92) and its icon condition (line 96) to treat an airing ad as "playing":
```tsx
              aria-label={audio.playing || audio.musicPlaying || audio.adPlaying ? "Pause" : "Play"}
```
```tsx
              ) : audio.playing || audio.musicPlaying || audio.adPlaying ? (
```

Update the mini-player title (lines 120-124) to show the ad title when an ad airs:
```tsx
            <span className="rl-mini-title">
              {audio.adPlaying && audio.adIdx !== null
                ? (ads[audio.adIdx]?.title ?? "Advertisement")
                : audio.musicIdx !== null
                ? (music[audio.musicIdx]?.title ?? "Music break")
                : (episodes[audio.airIdx]?.title ?? "On air")}
            </span>
```

Disable the mini-player "next" button while an ad airs (the button on lines 102-109). Replace it with:
```tsx
            <button
              type="button"
              className="rl-mini-play"
              onClick={audio.nextTrack}
              disabled={audio.adPlaying}
              aria-label="Next"
            >
              ▶▶
            </button>
```

- [ ] **Step 2b: Disable skip in the receiver too**

The `RadioReceiver` also exposes `nextTrack`. `nextTrack` already no-ops during an ad (Task 3 Step 6), so the receiver's skip is inert during ads even without a visual change. No code change required here; the hook is the source of truth. (If `RadioReceiver` later needs a disabled visual, pass `audio.adPlaying` down — out of scope now.)

- [ ] **Step 3: Render the ad now-playing panel**

Update the "Now on air" section guard (line 184) to also show when an ad airs:
```tsx
      {(onAir || (audio.musicIdx !== null && audio.musicPlaying) || (audio.adIdx !== null && audio.adPlaying)) && (
```

Add an ad branch as the FIRST case inside the section (before the existing `audio.musicIdx !== null && audio.musicPlaying ?` ternary on line 186). Restructure to:
```tsx
        <section className="rl-now">
          {audio.adIdx !== null && audio.adPlaying ? (
            <>
              <div className="rl-now-badge"><span className="rl-onair-dot" /> ⚠ Advertisement</div>
              <h2 className="rl-now-title">{ads[audio.adIdx]?.title ?? "Advertisement"}</h2>
              <p className="rl-now-desc">{ads[audio.adIdx]?.description ?? ""}</p>
              <div className="rl-now-actions">
                <span className="rl-now-link" aria-disabled="true">Unskippable</span>
              </div>
            </>
          ) : audio.musicIdx !== null && audio.musicPlaying ? (
```
(Leave the existing music and `onAir` branches unchanged after this — this only prepends a new leading branch to the existing ternary chain.)

- [ ] **Step 4: Verify the build passes**

Run: `cd Website && bun run build`
Expected: build succeeds with no type errors.

- [ ] **Step 5: Manual verification on `/radio`**

Run: `cd Website && bun dev`, open `http://localhost:4321/snazziefm`.
- Play an episode; use skip to reach a short episode end OR let one play to the end.
- Confirm order: episode → music break → **Advertisement (Soothe-Master 5000)** → next episode.
- During the ad: the "next/skip" button does nothing; the now-playing panel shows the ⚠ Advertisement badge and ad title/description.
- After the ad ends, the next episode starts automatically.

- [ ] **Step 6: Commit**

```bash
git add Website/src/components/RadioLanding.tsx
git commit -m "feat(radio): ad now-playing panel + unskippable skip UI"
```

---

## Task 6: The `radio-adverts` skill

**Files:**
- Create: `.claude/skills/radio-adverts/SKILL.md`

- [ ] **Step 1: Write the skill**

Create `.claude/skills/radio-adverts/SKILL.md` capturing the advert format so future ads are one-shot. It must reference `radio-episodes` for the shared Dia2 pipeline rather than duplicating it.

```markdown
---
name: radio-adverts
description: Write, generate, and slot Snazzie FM adverts — short (~13s) unskippable GTA-radio-style parody ad spots that air between episodes. Use when creating or editing a radio advert. Builds on the radio-episodes skill for the shared Dia2 pipeline.
---

# Snazzie FM Adverts

Short parody radio ads (~13 seconds) that air as an interstitial in the `/radio`
playlist: **episode → music → ad → next episode**. Ads are **unskippable**. They use
their own voices (never host/caller voices) and are rendered with **Dia2** (single
track, exactly 2 speakers). For the shared TTS pipeline, voices, and Dia2 rules, see
the **radio-episodes** skill — this skill only adds what is advert-specific.

## Format (the formula)

- **~13 seconds.** One Dia2 track. Keep total spoken text to roughly 35-45 words.
- **Two voices, announcer + disclaimer** (Dia2's hard 2-speaker limit):
  - `ad-announcer` (`[S1]`, first line) — bright, manic hard-sell pitchman.
  - `ad-disclaimer` (`[S2]`) — flat, fast, monotone fine-print reader.
- **Structure:** announcer pitch (hook → absurd promise) → disclaimer machine-guns the
  horrifying side-effects / legal tail → announcer button (brand + tagline).
- Strictly alternating turns, **first line is the announcer**, exactly 2 distinct
  speakers (Dia2 requirement).

## Tone

Diabolical GTA-radio energy. A real product category (hemorrhoid cream, energy drink,
discount surgery, legal services) sold with deranged enthusiasm; the disclaimer
undercuts it with deadpan body-horror. Content tiers: PG-13 gross-out up to harder R —
parody only, no slurs / real-world shock content. Punch up at the product, not at people.

## TTS-safe text

Same rules as radio-episodes: text is sent verbatim to the model. No em-dashes (`—`
reads as "euro") — use `...` or commas. ASCII punctuation only. UTF-8. Nonverbals
`(laughs)`/`(sighs)` are Dia-only and used sparingly.

## Data + slot

- Script: `Website/src/data/radio/<ad-slug>.json` — `type: "ad"`, `engine: "dia2"`,
  2 alternating speakers. Authored fields only (`timestamp`/`duration` = 0).
- Register: import it in `Website/src/data/radio.ts` and add to `export const ADS`.
  Add any new ad voice to `CAST` there (reuse `role: "Guest Expert"`).
- The player (`useRadioAudio.ts`) airs a **random** ad from `ADS` after each music break
  and ignores skip while it plays (`adPlaying`). No per-episode targeting.

## Voices

Ad voices live in `scripts/cast.json` like any cast member (`ref_audio`/`ref_text`/
`gender`/`speed`/`instruct`). Pull new ones with the **targeted**
`scripts/download-ad-voices.py` (adds entries to its `AD_VOICES` map) — NOT the wholesale
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
```

- [ ] **Step 2: Commit**

```bash
git add .claude/skills/radio-adverts/SKILL.md
git commit -m "docs(radio): add radio-adverts skill"
```

---

## Final verification

- [ ] `cd Website && bun run build` passes.
- [ ] `/radio`: episode → music → Soothe-Master ad (unskippable) → next episode, with the ⚠ Advertisement now-playing panel.
- [ ] Skip button inert during the ad; works otherwise.
- [ ] All six commits present; no other voices' refs were overwritten (`git status` shows only the two new `scripts/voices/ad-*` files added).
