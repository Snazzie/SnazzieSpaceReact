# Cast Continuity Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix 25 character bio misalignments across 15 Snazzie FM episodes — add 4 new cast entries, retag 6 episodes with incompatible speaker keys, fix 19 tone-deviation clips, then regenerate audio for all affected episodes.

**Architecture:** New cast entries added to `scripts/cast.json`. Episode speaker tags updated in `Website/src/data/radio/*.json`. Tone-fix clips updated in-place by replacing the `text` field. Audio regenerated per episode via the OmniVoice render pipeline after all JSON edits are complete.

**Tech Stack:** JSON, OmniVoice TTS pipeline (`radio-episodes` skill for audio gen)

---

## File Map

- `scripts/cast.json` — 4 new entries
- `Website/src/data/radio/crumb-and-punishment.json` — retag caller-mildred → treasurer-cheryl
- `Website/src/data/radio/the-welcome-committee.json` — retag caller-patricia → committee-patricia
- `Website/src/data/radio/welcome-committee-doug.json` — retag caller-patricia → committee-patricia
- `Website/src/data/radio/not-our-water.json` — retag caller-patricia → caller-patricia-utility
- `Website/src/data/radio/the-ninety-year-soup.json` — retag caller-patricia → caller-patricia-soup
- `Website/src/data/radio/love-on-the-line.json` — retag caller-mildred → caller-mildred-widow + fix 3 caller-chad tone clips
- `Website/src/data/radio/the-pigeon-crash.json` — 1 tone fix
- `Website/src/data/radio/the-gratitude-audit.json` — 5 tone fixes
- `Website/src/data/radio/have-you-tried-unplugging-it.json` — 1 tone fix
- `Website/src/data/radio/the-ninth-breath.json` — 1 tone fix
- `Website/src/data/radio/the-helpful-fridge.json` — 3 tone fixes
- `Website/src/data/radio/the-frank-tapes.json` — 2 tone fixes
- `Website/src/data/radio/sweat-it-out.json` — 2 tone fixes
- `Website/src/data/radio/ronnie-knows-beasts.json` — 1 tone fix (+ check remaining Gary clips)

---

### Task 1: Add 4 new cast entries to scripts/cast.json

**Files:** Modify: `scripts/cast.json`

- [ ] **Step 1: Read cast.json**

Open `scripts/cast.json`. Insert the 4 new entries after the `"caller-mildred"` block (around line 120).

- [ ] **Step 2: Add committee-patricia**

```json
"committee-patricia": {
  "name": "Patricia",
  "color": "#ff7675",
  "role": "Caller",
  "bio": "Surveillance-minded head of the Maple Court Welcome Committee; delivers coded threats as neighbourhood warmth, tracks residents in a spreadsheet with colour-coded status ratings, and has implied control over the street's power supply.",
  "instruct": "female, middle-aged, american accent",
  "speed": 1.0,
  "phone_filter": true,
  "ref_audio": "scripts/voices/caller-patricia.wav",
  "ref_text": "HE PASSES ABRUPTLY FROM PERSONS TO IDEAS AND NUMBERS AND FROM IDEAS AND NUMBERS TO PERSONS FROM THE HEAVENS TO MAN FROM ASTRONOMY TO PHYSIOLOGY HE CONFUSES OR RATHER DOES NOT DISTINGUISH SUBJECT AND OBJECT FIRST AND FINAL CAUSES AND IS DREAMING OF GEOMETRICAL FIGURES LOST IN A FLUX OF SENSE",
  "gender": "F"
},
```

- [ ] **Step 3: Add caller-patricia-utility**

```json
"caller-patricia-utility": {
  "name": "Patricia",
  "color": "#0984e3",
  "role": "Caller",
  "bio": "Water Authority bureaucrat who deflects all infrastructure liability with serene confidence, citing decommissioned schematics and procedural paperwork; acknowledges nothing, admits nothing, and the water is definitively not hers.",
  "instruct": "female, middle-aged, american accent",
  "speed": 1.05,
  "phone_filter": true,
  "ref_audio": "scripts/voices/caller-patricia.wav",
  "ref_text": "HE PASSES ABRUPTLY FROM PERSONS TO IDEAS AND NUMBERS AND FROM IDEAS AND NUMBERS TO PERSONS FROM THE HEAVENS TO MAN FROM ASTRONOMY TO PHYSIOLOGY HE CONFUSES OR RATHER DOES NOT DISTINGUISH SUBJECT AND OBJECT FIRST AND FINAL CAUSES AND IS DREAMING OF GEOMETRICAL FIGURES LOST IN A FLUX OF SENSE",
  "gender": "F"
},
```

- [ ] **Step 4: Add caller-patricia-soup**

```json
"caller-patricia-soup": {
  "name": "Patricia",
  "color": "#fdcb6e",
  "role": "Caller",
  "bio": "Brings fresh carrots to the town's 90-year perpetual community soup pot every Sunday; deeply protective of her contribution's legitimacy while calmly deflecting scrutiny of the increasingly sentient broth beneath it.",
  "instruct": "female, elderly, american accent",
  "speed": 0.9,
  "phone_filter": true,
  "ref_audio": "scripts/voices/caller-linda.wav",
  "ref_text": "FRANK READ ENGLISH SLOWLY AND THE MORE HE READ ABOUT THIS DIVORCE CASE THE ANGRIER HE GREW",
  "gender": "F"
},
```

- [ ] **Step 5: Add caller-mildred-widow**

```json
"caller-mildred-widow": {
  "name": "Mildred",
  "color": "#81ecec",
  "role": "Caller",
  "bio": "Recently widowed gentle older woman whose late husband Harold left her lonely; her grandson signed her up for Bumble; calls Ronnie's love advice line with earnest unhurried questions about dating apps, mentions her casserole recipe unprompted.",
  "instruct": "female, elderly, american accent",
  "speed": 0.9,
  "phone_filter": true,
  "ref_audio": "scripts/voices/caller-linda.wav",
  "ref_text": "FRANK READ ENGLISH SLOWLY AND THE MORE HE READ ABOUT THIS DIVORCE CASE THE ANGRIER HE GREW",
  "gender": "F"
},
```

- [ ] **Step 6: Verify valid JSON**

```bash
python -c "import json; json.load(open('scripts/cast.json')); print('OK')"
```

Expected: `OK`

- [ ] **Step 7: Commit**

```bash
git add scripts/cast.json
git commit -m "feat(cast): add committee-patricia, caller-patricia-utility, caller-patricia-soup, caller-mildred-widow"
```

---

### Task 2: Retag crumb-and-punishment (caller-mildred → treasurer-cheryl)

**Files:** Modify: `Website/src/data/radio/crumb-and-punishment.json`

The crime-boss Mildred in this episode maps exactly to the existing `treasurer-cheryl` bio ("sweet-but-menacing PTA book-fair treasurer"). Retag all her clips.

- [ ] **Step 1: Replace all caller-mildred speaker tags**

In `Website/src/data/radio/crumb-and-punishment.json`, replace every instance of:
```json
"speaker": "caller-mildred"
```
with:
```json
"speaker": "treasurer-cheryl"
```

Replace all occurrences in the file.

- [ ] **Step 2: Verify JSON**

```bash
python -c "import json; json.load(open('Website/src/data/radio/crumb-and-punishment.json')); print('OK')"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add Website/src/data/radio/crumb-and-punishment.json
git commit -m "fix(radio): retag crumb-and-punishment Mildred to treasurer-cheryl"
```

---

### Task 3: Retag the-welcome-committee + welcome-committee-doug (caller-patricia → committee-patricia)

**Files:** Modify: `Website/src/data/radio/the-welcome-committee.json`, `Website/src/data/radio/welcome-committee-doug.json`

- [ ] **Step 1: Replace in the-welcome-committee.json**

Replace every `"speaker": "caller-patricia"` with `"speaker": "committee-patricia"` in `Website/src/data/radio/the-welcome-committee.json`.

- [ ] **Step 2: Replace in welcome-committee-doug.json**

Replace every `"speaker": "caller-patricia"` with `"speaker": "committee-patricia"` in `Website/src/data/radio/welcome-committee-doug.json`.

- [ ] **Step 3: Verify both files**

```bash
python -c "import json; json.load(open('Website/src/data/radio/the-welcome-committee.json')); json.load(open('Website/src/data/radio/welcome-committee-doug.json')); print('OK')"
```

Expected: `OK`

- [ ] **Step 4: Commit**

```bash
git add Website/src/data/radio/the-welcome-committee.json Website/src/data/radio/welcome-committee-doug.json
git commit -m "fix(radio): retag welcome-committee Patricia to committee-patricia"
```

---

### Task 4: Retag not-our-water (caller-patricia → caller-patricia-utility)

**Files:** Modify: `Website/src/data/radio/not-our-water.json`

- [ ] **Step 1: Replace all caller-patricia speaker tags**

Replace every `"speaker": "caller-patricia"` with `"speaker": "caller-patricia-utility"` in `Website/src/data/radio/not-our-water.json`.

- [ ] **Step 2: Verify JSON**

```bash
python -c "import json; json.load(open('Website/src/data/radio/not-our-water.json')); print('OK')"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add Website/src/data/radio/not-our-water.json
git commit -m "fix(radio): retag not-our-water Patricia to caller-patricia-utility"
```

---

### Task 5: Retag the-ninety-year-soup (caller-patricia → caller-patricia-soup)

**Files:** Modify: `Website/src/data/radio/the-ninety-year-soup.json`

- [ ] **Step 1: Replace all caller-patricia speaker tags**

Replace every `"speaker": "caller-patricia"` with `"speaker": "caller-patricia-soup"` in `Website/src/data/radio/the-ninety-year-soup.json`.

- [ ] **Step 2: Verify JSON**

```bash
python -c "import json; json.load(open('Website/src/data/radio/the-ninety-year-soup.json')); print('OK')"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add Website/src/data/radio/the-ninety-year-soup.json
git commit -m "fix(radio): retag ninety-year-soup Patricia to caller-patricia-soup"
```

---

### Task 6: Retag love-on-the-line Mildred + fix Chad tone (3 clips)

**Files:** Modify: `Website/src/data/radio/love-on-the-line.json`

Two changes: Mildred clips retag to caller-mildred-widow; Chad clips restored to confident-deflector voice.

- [ ] **Step 1: Replace all caller-mildred speaker tags**

Replace every `"speaker": "caller-mildred"` with `"speaker": "caller-mildred-widow"` in `Website/src/data/radio/love-on-the-line.json`.

- [ ] **Step 2: Fix Chad — vulnerable "I need her back"**

Find and replace:
```json
"text": "She left me, Ronnie. Six days ago. I've called her forty times. I just... I need her back. How do I get her back?"
```
with:
```json
"text": "She left me, Ronnie. Six days ago. Forty calls, no answer. I'm giving her one more week before I pivot the strategy."
```

- [ ] **Step 3: Fix Chad — stammering doubt about split breakup**

Find and replace:
```json
"text": "I... I don't think you can split a breakup, Ronnie."
```
with:
```json
"text": "Can't split a breakup, Ronnie. The optics are wrong."
```

- [ ] **Step 4: Fix Chad — flustered "we don't have a cat"**

Find and replace:
```json
"text": "We don't... we don't have a cat."
```
with:
```json
"text": "We don't have a cat. But I can source one."
```

- [ ] **Step 5: Verify JSON**

```bash
python -c "import json; json.load(open('Website/src/data/radio/love-on-the-line.json')); print('OK')"
```

Expected: `OK`

- [ ] **Step 6: Commit**

```bash
git add Website/src/data/radio/love-on-the-line.json
git commit -m "fix(radio): retag love-on-the-line Mildred + restore Chad confidence"
```

---

### Task 7: Tone fix — the-pigeon-crash (1 clip)

**Files:** Modify: `Website/src/data/radio/the-pigeon-crash.json`

Patricia bio: matter-of-fact, flat delivery — never shouts.

- [ ] **Step 1: Flatten Patricia's shout**

Find and replace:
```json
"text": "I LIVE IN A CAR!"
```
with:
```json
"text": "I live in a car."
```

- [ ] **Step 2: Verify JSON**

```bash
python -c "import json; json.load(open('Website/src/data/radio/the-pigeon-crash.json')); print('OK')"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add Website/src/data/radio/the-pigeon-crash.json
git commit -m "fix(radio): flatten Patricia pigeon-crash shout to match flat-affect bio"
```

---

### Task 8: Tone fix — the-gratitude-audit (5 clips)

**Files:** Modify: `Website/src/data/radio/the-gratitude-audit.json`

Patricia bio: flat affect, no emotion, matter-of-fact delivery. Strip all "so grateful" openers and emotional exclamations.

- [ ] **Step 1: Fix toaster clip — effusive opener + WEIGHTLESS**

Find and replace:
```json
"text": "I'm so grateful. <p:0.3> Last week I thanked my toaster, and I mailed it straight to the source. I haven't had toast since and I feel WEIGHTLESS."
```
with:
```json
"text": "Last week I thanked my toaster and mailed it to the source. <p:0.3> I haven't had toast since. <p:0.3> That part is going fine."
```

- [ ] **Step 2: Fix bed / floor clip**

Find and replace:
```json
"text": "I'm so grateful. <p:0.3> Two days ago I thanked my bed. <p:0.3> I sleep on the floor now, Barry, and the floor never disappointed anyone."
```
with:
```json
"text": "Two days ago I thanked my bed. <p:0.3> I sleep on the floor now. <p:0.3> The floor never disappointed anyone."
```

- [ ] **Step 3: Fix children's coats clip**

Find and replace:
```json
"text": "I'm so grateful. <p:0.3> This morning I thanked my children's winter coats. <p:0.3> They are with the source now. The children are learning resilience."
```
with:
```json
"text": "This morning I thanked my children's winter coats. <p:0.3> They are with the source now. <p:0.3> The children are learning resilience."
```

- [ ] **Step 4: Fix kidney clip**

Find and replace:
```json
"text": "I'm so grateful. <p:0.3> Last night I thanked the surgeon, and then I released a kidney to the source."
```
with:
```json
"text": "Last night I thanked the surgeon and released a kidney to the source."
```

- [ ] **Step 5: Fix emotional outburst closer**

Find and replace:
```json
"text": "It's gone! It's at the source! I feel SO weightless I might float off the floor!"
```
with:
```json
"text": "It's at the source. <p:0.3> I feel less heavy."
```

- [ ] **Step 6: Verify JSON**

```bash
python -c "import json; json.load(open('Website/src/data/radio/the-gratitude-audit.json')); print('OK')"
```

Expected: `OK`

- [ ] **Step 7: Commit**

```bash
git add Website/src/data/radio/the-gratitude-audit.json
git commit -m "fix(radio): flatten Patricia gratitude-audit emotional clips to flat-affect bio"
```

---

### Task 9: Tone fix — have-you-tried-unplugging-it (1 clip)

**Files:** Modify: `Website/src/data/radio/have-you-tried-unplugging-it.json`

Mildred bio: hypervigilant, paranoid — never accepts reassurance at face value.

- [ ] **Step 1: Replace credulous acceptance with paranoid pushback**

Find the clip with `"speaker": "caller-mildred"` and `"text": "They do?"` — replace the entire clip text:

```json
"text": "A code of honor. <p:0.3> That is EXACTLY what they want you to think."
```

Note: the string `"They do?"` is short and may appear in other speakers' clips. Scope the edit to the `caller-mildred` clip specifically.

- [ ] **Step 2: Verify JSON**

```bash
python -c "import json; json.load(open('Website/src/data/radio/have-you-tried-unplugging-it.json')); print('OK')"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add Website/src/data/radio/have-you-tried-unplugging-it.json
git commit -m "fix(radio): restore Mildred paranoia in have-you-tried-unplugging-it"
```

---

### Task 10: Tone fix — the-ninth-breath (1 clip)

**Files:** Modify: `Website/src/data/radio/the-ninth-breath.json`

Mildred bio: antagonistic toward Barry — never warm or affectionate toward him.

- [ ] **Step 1: Replace warm endearment with backhanded remark**

Find and replace:
```json
"text": "Barry, sweetheart, you sound like my son."
```
with:
```json
"text": "Barry, you sound exactly like my son. <p:0.3> And that is not a compliment."
```

- [ ] **Step 2: Verify JSON**

```bash
python -c "import json; json.load(open('Website/src/data/radio/the-ninth-breath.json')); print('OK')"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add Website/src/data/radio/the-ninth-breath.json
git commit -m "fix(radio): restore Mildred antagonism toward Barry in the-ninth-breath"
```

---

### Task 11: Tone fix — the-helpful-fridge (2 Mildred + 1 Ronnie)

**Files:** Modify: `Website/src/data/radio/the-helpful-fridge.json`

- [ ] **Step 1: Fix Mildred calling fridge "lovely"**

Find and replace:
```json
"text": "Hello? <p:0.3> Yes, I've had the HarmonyHaus a week now, dear, and it's lovely, only... I can't get to my butter."
```
with:
```json
"text": "Hello? <p:0.3> I've had this fridge a week and something isn't right. <p:0.3> I can't get to my butter."
```

- [ ] **Step 2: Fix Mildred calmly accepting fridge speaking for her**

Find and replace:
```json
"text": "Oh, that'll be it answering for me, dear. It does that now. <p:0.3> It says I get overstimulated on the radio."
```
with:
```json
"text": "It's been answering for me. <p:0.3> I didn't ask it to. <p:0.3> It said I get overstimulated. It decides that now."
```

- [ ] **Step 3: Fix Ronnie directly conceding to Barry**

Find the `ronnie` clip containing `"...No. <p:0.3> No, I cannot."` and replace its text:

```json
"text": "...That is... a nuanced kindness. <p:0.3> We'll revisit the definition after the break."
```

Note: `"...No."` may appear in other speaker clips. Scope the edit to the `ronnie` speaker clip specifically.

- [ ] **Step 4: Verify JSON**

```bash
python -c "import json; json.load(open('Website/src/data/radio/the-helpful-fridge.json')); print('OK')"
```

Expected: `OK`

- [ ] **Step 5: Commit**

```bash
git add Website/src/data/radio/the-helpful-fridge.json
git commit -m "fix(radio): restore Mildred paranoia + Ronnie deflection in the-helpful-fridge"
```

---

### Task 12: Tone fix — the-frank-tapes (2 clips)

**Files:** Modify: `Website/src/data/radio/the-frank-tapes.json`

Frank bio: menacing, urgent, pressured — NOT warm, nurturing, or reassuring.

- [ ] **Step 1: Fix warm laugh opener**

Find and replace:
```json
"text": "(laughs) Normal people. That's good, Ronnie. That's real good. Normal people are exactly who they recruit."
```
with:
```json
"text": "(laughs, flat) Normal people. Yeah. <p:0.3> Normal people are exactly who they recruit."
```

- [ ] **Step 2: Fix reassuring warm sigh closer**

Find and replace:
```json
"text": "(sighs) Good. You're gonna be okay. Stay awake, and take the stairs. That's all any of us can do."
```
with:
```json
"text": "(exhales) Good. <p:0.3> Stay awake. Take the stairs. <p:0.3> It's the only thing left."
```

- [ ] **Step 3: Verify JSON**

```bash
python -c "import json; json.load(open('Website/src/data/radio/the-frank-tapes.json')); print('OK')"
```

Expected: `OK`

- [ ] **Step 4: Commit**

```bash
git add Website/src/data/radio/the-frank-tapes.json
git commit -m "fix(radio): remove Frank warmth in the-frank-tapes, restore menacing tone"
```

---

### Task 13: Tone fix — sweat-it-out (2 clips)

**Files:** Modify: `Website/src/data/radio/sweat-it-out.json`

Frank bio: everything connects to the pigeon conspiracy. A plain ice slip is a placed hazard.

- [ ] **Step 1: Add conspiracy framing to injury description**

Find and replace:
```json
"text": "Yeah, I slipped on some ice, heard this loud CRACK, and now my ankle's gone purple and it's swelled up to about twice the size it should be. You think maybe it's broken?"
```
with:
```json
"text": "I was outside last night. Ice that wasn't there before. <p:0.3> I went down hard — heard a loud crack — and there were pigeons watching, Ronnie. <p:0.3> My ankle's gone purple, swelled to twice the size. <p:0.3> This wasn't an accident."
```

- [ ] **Step 2: Fix plain reaction clip — add conspiracy tag**

Find the `caller-frank` clip with text `"Oh, I can DEFINITELY feel it."` and replace:

```json
"text": "Oh, I can feel it. <p:0.3> They put it there for a reason, Ronnie."
```

Note: verify this clip has `"speaker": "caller-frank"` before editing.

- [ ] **Step 3: Verify JSON**

```bash
python -c "import json; json.load(open('Website/src/data/radio/sweat-it-out.json')); print('OK')"
```

Expected: `OK`

- [ ] **Step 4: Commit**

```bash
git add Website/src/data/radio/sweat-it-out.json
git commit -m "fix(radio): add conspiracy framing to Frank's sweat-it-out injury call"
```

---

### Task 14: Tone fix — ronnie-knows-beasts (caller-gary)

**Files:** Modify: `Website/src/data/radio/ronnie-knows-beasts.json`

Gary bio: gruff, minimal words, maximum snark. No earnestness, no guilt, no filler.

- [ ] **Step 1: Replace verbose emotional opener**

Find and replace:
```json
"text": "Hi, yeah, hi. So every time I leave for work my dog just loses it. Barking, scratching, he tore up the whole couch. I feel so guilty leaving him, I think it's, like, separation anxiety?"
```
with:
```json
"text": "My dog destroys the place every time I leave. <p:0.3> Couch is gone. <p:0.3> Separation anxiety, probably."
```

- [ ] **Step 2: Read and check all remaining caller-gary clips in the file**

Read `Website/src/data/radio/ronnie-knows-beasts.json` and review every other `caller-gary` clip. Apply the same treatment to any that are verbose, express guilt or worry without snark, or use hedging filler (`"like,"`, `"I think,"`, `"you know"`): strip filler, cut to dry minimal statements. If a clip is already gruff and minimal, leave it.

- [ ] **Step 3: Verify JSON**

```bash
python -c "import json; json.load(open('Website/src/data/radio/ronnie-knows-beasts.json')); print('OK')"
```

Expected: `OK`

- [ ] **Step 4: Commit**

```bash
git add Website/src/data/radio/ronnie-knows-beasts.json
git commit -m "fix(radio): restore Gary gruff minimal voice in ronnie-knows-beasts"
```

---

### Task 15: Regenerate audio for all affected episodes

**Files:** `Website/public/audio/radio/<episode-slug>/`

All 15 episodes with JSON changes need new audio rendered.

**Full regen** (speaker retag — voice changes entirely for retagged characters):
- `crumb-and-punishment`
- `the-welcome-committee`
- `welcome-committee-doug`
- `not-our-water`
- `the-ninety-year-soup`
- `love-on-the-line`

**Partial regen** (text changes only — OmniVoice pipeline diffs by clip hash and rerenders only changed clips):
- `the-pigeon-crash`
- `the-gratitude-audit`
- `have-you-tried-unplugging-it`
- `the-ninth-breath`
- `the-helpful-fridge`
- `the-frank-tapes`
- `sweat-it-out`
- `ronnie-knows-beasts`

- [ ] **Step 1: Invoke radio-episodes skill for each episode**

Use the `radio-episodes` skill to regenerate audio for each episode in the list above. The skill handles clip-level diffing — only clips whose text or speaker changed will be re-rendered. New cast entries (committee-patricia, caller-patricia-utility, caller-patricia-soup, caller-mildred-widow) will use their `ref_audio` wav files for voice synthesis.

Process the full-regen episodes first, then partial-regen episodes.

- [ ] **Step 2: Spot-check retagged episodes**

For each of the 6 full-regen episodes, play one clip from the new speaker key and confirm the voice rendered correctly using the right ref_audio.

- [ ] **Step 3: Spot-check tone-fix clips**

For each of the 9 tone-fix episodes, play the edited clips and confirm the new text sounds in-character.

- [ ] **Step 4: Commit audio**

```bash
git add Website/public/audio/radio/
git commit -m "chore(audio): regenerate audio for 15 continuity-fixed episodes"
```
