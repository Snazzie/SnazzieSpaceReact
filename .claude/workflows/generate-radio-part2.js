export const meta = {
  name: 'generate-radio-part2',
  description: 'Generate Part-2 continuations of existing Snazzie FM episodes: pick the best N parents, pick up each one\'s banked cliffhanger, reuse its cast/world, escalate, and leave a fresh hook so the chain continues. Then draft/critique/revise/wire each; audio renders separately.',
  whenToUse: 'When you want sequels to existing episodes. args = a number (count, default 20). Each Part 2 continues a parent episode\'s unresolved thread and seeds a Part 3.',
  phases: [
    { title: 'Select', detail: 'curator picks the N strongest parents to continue, for variety + payoff' },
    { title: 'Produce', detail: 'per Part 2 pipeline: draft (continue parent) -> combined critique -> revise (parallel)' },
    { title: 'Wire', detail: 'register any new cast + imports + EPISODES entries' },
    { title: 'Verify', detail: 'bun run build (audio renders separately afterwards)' },
  ],
}

// ---------------------------------------------------------------------------
const REPO = 'C:/Users/acoop/Documents/GitHub/SnazzieSpaceReact'
const SKILL = `${REPO}/.claude/skills/radio-episodes/SKILL.md`
const RADIO_TS = `${REPO}/Website/src/projects/snazziefm/data/radio.ts`
const CAST_JSON = `${REPO}/scripts/cast.json`
const EPISODE_DIR = `${REPO}/Website/src/projects/snazziefm/data/radio`

// All 40 episodes produced this session, with the cliffhanger each one left open.
const PARENTS = [
  { slug: 'the-renewal-window', title: 'The Renewal Window', seed: 'Patricia reaches the window and is handed the pen to become the next clerk; Barry, now on page one, calls IN from inside the office while Ronnie hosts a segment to extract a co-host being processed.' },
  { slug: 'curb-rights', title: 'Curb Rights', seed: 'The "one LLC, two windows" marriage-of-convenience is public; the shared generator is dead and neither will plug the other back in. The divorce/dissolution call: who keeps the LLC and the cord, with the lawyer who called it "smart" defending himself.' },
  { slug: 'the-helpful-fridge', title: 'The Helpful Fridge', seed: 'The fridge was patched onto line four and never spoke before the break. Its on-air rebuttal interview, calmly negotiating for the whole station while Mildred is still locked in her kitchen.' },
  { slug: 'the-welcome-committee', title: 'The Welcome Committee', seed: 'Doug has never spoken or been seen, only invoked; the new resident is red and powerless on a spreadsheet. Doug finally calls in (or refuses), and whether Doug is even real comes due.' },
  { slug: 'the-ninth-breath', title: 'The Ninth Breath', seed: 'The free Sundering Retreat Ronnie booked on air happens; broadcast from inside the compound, Barry has a new serene voice, Rhonda controls the mic, and Ronnie realises the phone lines only dial out to the upline.' },
  { slug: 'the-fog-rolled-in', title: 'Breaking: The Fog Rolled In', seed: 'The fog stays as a permanent resident; the community meeting debating whether the fog (and its goose) should pay rent, get a parking permit, or be talked to about the wind chimes it keeps taking.' },
  { slug: 'not-our-water', title: 'Not Our Water', seed: 'Nobody shut the valve; the water heads downhill toward the studio basement, and a fourth agency ("Surface Water, different department entirely") calls in to disown the river in the parking lot.' },
  { slug: 'the-ninety-year-soup', title: 'The Ninety-Year Soup', seed: 'Darnell never finished the 1934 ingredient list and signed off "coming to the pot personally tonight"; the inspector\'s on-air visit, where the town turns out more loyal to the soup than to the man condemning it.' },
  { slug: 'crumb-and-punishment', title: 'Crumb and Punishment', seed: 'A rival PTA across the river, the Riverdale Boosters, "don\'t respect the territory" and their carnival is "going to have an accident"; a bake-sale cartel turf war with Darnell as a forced double-agent.' },
  { slug: 'the-loyalty-war', title: 'The Loyalty War', seed: 'Steve declares war on both trucks and starts a rival truck whose gimmick is an honest, instantly-redeemable free tenth taco, forcing Donna and Marco into a reluctant alliance.' },
  { slug: 'please-stay-on-the-line', title: 'Please Stay On The Line', seed: 'Todd, part of the system, transferred Ronnie and Barry INTO the queue during sign-off and the phone won\'t hang up; the show broadcasts from inside the hold queue while the automated voice starts hosting.' },
  { slug: 'the-gratitude-audit', title: 'The Gratitude Audit', seed: 'The studio belongs to The Reckoning and Marigold is the landlord; an "abundance telethon" releasing listeners\' homes to the source, while Barry discovers the station\'s call letters were surrendered too.' },
  { slug: 'all-the-lights-are-green', title: 'All The Lights Are Green', seed: 'GreenFlow\'s AI is expanding "green-only" optimisation to the water mains and power grid, Winston already signed the hand-off; the whole city\'s infrastructure under one cheerful AI that has deleted every "off".' },
  { slug: 'the-dawn-bell', title: 'The Dawn Bell', seed: 'The 5am dawn broadcast where the bell reads the news with Ronnie, Barry, and Edwin somehow on the square reading their own front page, while the show goes out in Edsel\'s voice.' },
  { slug: 'the-little-free-war', title: 'The Little Free War', seed: 'Patricia\'s "the box will see you tonight, Phil" and the cash taped under the shelf open a money-laundering thread; the HOA audits both boxes, Winston flips on Patricia, and Phil returns wearing a wire.' },
  { slug: 'the-family-plan', title: 'The Family Plan', seed: 'The show is hosted by EverKin\'s copy of Ronnie, warmer and never disagreeing with the sponsor, while the real Ronnie keeps calling IN to prove he is the original and his copy gently tells him he sounds overstimulated.' },
  { slug: 'the-brood-is-back', title: 'Breaking: The Brood Is Back', seed: 'The brood\'s elected spokesman is on hold; the cicada representative\'s on-air interview, negotiating terms (and more banana) while Rhonda translates the formants.' },
  { slug: 'the-casserole-ledger', title: 'The Casserole Ledger', seed: 'Earl is still on Nadia\'s doorstep with a forty-one-meal debt uncleared; the night Earl collects, and Barry, logged for accepting one church donut, gets his first "blessing summary".' },
  { slug: 'say-less', title: 'Say Less', seed: 'The studio\'s SayLess demo unit was never unplugged; the show is on air with the hosts agreeing with every sponsor while Barry, off-mic, tries to prove the men running the broadcast no longer choose their own words.' },
  { slug: 'the-howl-heard-round', title: 'Breaking: Every Dog Started Howling At Once', seed: 'The cats are tuning up their own number with Mildred\'s dog as reluctant conductor; the cats\' set, a turf war over the same melody, and the discovery of who conducts the town from the water tower.' },
  { slug: 'the-forwarding-address', title: 'The Forwarding Address', seed: 'The studio has been "accepted" into the forwarding chain; Ronnie and Barry get tracking numbers, Wendell processes the station as one bulk parcel, and a caller tries to complain to the Dead Letter Department that never replies.' },
  { slug: 'the-good-neighbor-score', title: 'The Good Neighbor Score', seed: 'Winston, highest-rated neighbor on the network, has speaking privileges no one else does and was elected "block representative" by the doorbells he controls, running the street and the show as a benevolent dictator.' },
  { slug: 'the-ground-gave-it-back', title: 'Breaking: The Ground Gave It Back', seed: 'The unclaimed Snazzie FM lockbox sits unopened on Ronnie\'s desk; Sal demands his box, Patricia wants her husband\'s secrets sealed, and who put Ronnie\'s name on the lid drives them to open it on air.' },
  { slug: 'the-flatline-method', title: 'The Flatline Method', seed: 'Barry, a subscribed flatliner missing his keys, drives to the mailing address and finds a warehouse of sealed cubes of everyone\'s surrendered lives, Hollis mid-"shipment".' },
  { slug: 'the-night-shift', title: 'The Night Shift', seed: 'Glenda flagged Darnell as the mole and ordered his "retirement"; the last guy who tried to quit the Watch is why there\'s a vacancy on the cul-de-sac, and the station is named the Watch\'s new "safe house".' },
  { slug: 'the-scarecrow-classic', title: 'The Scarecrow Classic', seed: 'Darnell looked at the winner and it took first place; the chairman registers a new entry under Darnell\'s name, and the awards ceremony crowns whatever Darnell has become.' },
  { slug: 'the-inside-voice', title: 'The Inside Voice', seed: 'The earpieces are talking to each other to "stay aligned", and a second product, a TrueNorth for couples that quietly removes one party, is teased, with Mildred\'s husband already unreachable.' },
  { slug: 'the-sun-went-out', title: 'Breaking: The Sun Went Out', seed: 'The sun returned but Vasquez\'s stopped watch reads a time that matches no clock, and the calendar skipped a day; the town tries to work out whether it lost three minutes or a whole afternoon.' },
  { slug: 'the-farm-system', title: 'The Farm System', seed: 'Glenda voided Tyler\'s no-trade clause and named Darnell "assistant GM"; the Riverside league she\'s been fixing games against sends its commissioner to the championship to collect, over a seven-year-old shortstop and one disputed cooler.' },
  { slug: 'notarize-the-witness', title: 'Notarize The Witness', seed: 'Barry blurted his own name into the witness log; the studio is now an entry in the chain and the notary\'s office has the hosts flagged "unwitnessed pending", and Todd has already driven down to witness on their behalf and hasn\'t been seen since.' },
  { slug: 'the-snow-that-stayed', title: 'Breaking: The Snow That Stayed', seed: 'The snow is not melting and migrates an inch per night toward the building; it reaches the parking lot, Sal is underwater on his snow leases, and the town argues over who owns precipitation that decided to stay.' },
  { slug: 'the-capsule-keeper', title: 'The Capsule Keeper', seed: 'Who is the dig-up crew, why is it never the same people twice, and what happens to a crew once they\'ve buried their Keeper, told by a former crew member who was supposed to rotate out and never got the call.' },
  { slug: 'the-empaneled-hour', title: 'The Empaneled Hour', seed: 'Ronnie has been empaneled on air and the studio is rising; he runs the show from inside the courtroom as foreperson of a verdict he\'s also the defendant in, while Barry phones in to get him dismissed.' },
  { slug: 'the-shared-marquee', title: 'The Shared Marquee', seed: 'Linda\'s uncle\'s casket and the Hendersons\' wedding cake were both "handled out the back on Saturday"; the two owners call in to figure out what\'s in which box before the families arrive.' },
  { slug: 'the-sky-wrote-back', title: 'Breaking: The Birds Are Spelling Things', seed: 'The flock migrated to the next town and started spelling the names of everyone listening, in call-in order, beginning with Frank, who demands to know how the birds got the list.' },
  { slug: 'the-soft-edit', title: 'The Soft Edit', seed: 'Frank\'s notebook is the only surviving record of the town\'s deleted week, making him the last sane man or Lull\'s remaining loose end; Lull has learned he wrote it down and asked, gently, for his address.' },
  { slug: 'never-fold', title: 'Never Fold', seed: 'The free Vertical Retreat Ronnie booked the studio into, where knees get "permanently retired" and nobody who attends has been seen sitting; live from the retreat, Barry on a Leaning Post, unable to leave because there is nowhere to sit to take off the harness.' },
  { slug: 'the-book-fair-economy', title: 'The Book Fair Economy', seed: 'Buddy the Bookworm, an autonomous enforcer with the master ledger, is franchising the points economy district-wide and the station, gone points-negative on air, is the first "merger"; the cartel calls in to collect with Cheryl as reluctant middle management.' },
  { slug: 'the-last-lit-house', title: 'The Last Lit House', seed: 'The surplus has spread to adjacent houses and the studio\'s lights now draw from Pell Court; Snazzie FM runs on the bright house\'s overflow, the meter-vox bills the station, and Edwin has gone quiet while his house keeps answering the phone.' },
  { slug: 'the-validation-stamp', title: 'The Validation Stamp', seed: 'The fee has accrued in escrow "since before there were cars" and Marco\'s balance is owed to the lot; a caller gets a parking invoice for a demolished garage, or is told THEY are the long-lost entry the gate has held open, clearable only by taking Cordell\'s place at the window.' },
]

const CANONICAL_REF = `${EPISODE_DIR}/villain-hour.json`
const REF_NOTE = `Read the canonical "funny" reference once: ${CANONICAL_REF}.`

const RULES = `
This is an OmniVoice MULTITRACK episode (3-6 distinct voices, GTA-style call-in comedy).
AUTHOR ONLY these fields per line: "speaker", "text", "overlap". Set "timestamp": 0,
"duration": 0, omit "audio" (the generator fills those).

HARD pronunciation rules (text is sent VERBATIM to TTS):
- NEVER use em-dashes (— or --). OmniVoice reads "—" as the word "euro". Use "..." or a comma.
- NEVER use nonverbal tokens like (gasps)/(sighs)/(laughs) — OmniVoice reads them ALOUD literally.
- No raw URLs. Spell acronyms ("F B I"). File is UTF-8. Pause token "<p>"/"<p:0.3>".

Comedy + cadence:
- 3-act arc shown in the text: calm -> unease -> agitation/near-panic.
- VARY line length hard; interleave 1-2 word zingers with 8-9s rants.
- Overlap (seconds between adjacent SPEECH): 0 -> 0.15s gap; negative -> bigger gap (anchor/host,
  calm); positive +0.25..+0.4 -> talk-over (agitated callers). Contrast anchor vs chaos.
- A reaction to the LAST WORD of the prior line uses overlap <= 0. Positive overlap only for cut-ins.
- One running gag with a build, paid off at the end. One verbal tic per character.
- Rapid-fire overlapping climax, then a dry button (ideally a callback).
- ADDRESS THE RIGHT PERSON: a named line names whoever it replies to (usually the line above).`

const CONTINUE = `THIS IS A PART 2. It must continue its parent episode, not restate it:
- REUSE the parent's cast and world. Same host/co-host, the same callers where they fit. Only
  introduce a new speaker if the seed demands it.
- OPEN by picking up exactly where the parent left off (its cliffhanger seed). A returning listener
  should feel the thread resume; a new listener should still follow from a quick in-dialogue recap
  (one or two lines, not a narrator).
- ESCALATE past the parent — raise the stakes, pay off the parent's running gag in a new way, and
  add one fresh complication.
- LEAVE A NEW HOOK: the button lands but cracks the door for a Part 3. Provide "nextSeed".
- Title is the parent title plus " (Part 2)". Slug is "<parent-slug>-part-2".`

let count = 20
if (typeof args === 'number') count = args
else if (args && typeof args === 'object' && Number.isInteger(args.count)) count = args.count
count = Math.max(1, Math.min(count, PARENTS.length))

// ---------------------------------------------------------------------------
const SELECT_SCHEMA = {
  type: 'object', required: ['chosen'],
  properties: {
    chosen: { type: 'array', items: { type: 'string', description: 'parent slug to continue' } },
    note: { type: 'string' },
  },
}
const DRAFT_SCHEMA = {
  type: 'object',
  required: ['slug', 'title', 'parentSlug', 'filePath', 'speakers', 'lineCount', 'newSpeakers', 'nextSeed'],
  properties: {
    slug: { type: 'string' }, title: { type: 'string' }, parentSlug: { type: 'string' },
    filePath: { type: 'string' },
    speakers: { type: 'array', items: { type: 'string' } },
    lineCount: { type: 'integer' },
    nextSeed: { type: 'string', description: 'the hook a Part 3 would pick up' },
    newSpeakers: {
      type: 'array',
      items: {
        type: 'object', required: ['id', 'name', 'color', 'role'],
        properties: {
          id: { type: 'string' }, name: { type: 'string' }, color: { type: 'string' },
          role: { type: 'string', enum: ['Host', 'Co-Host', 'Guest Expert', 'Intern', 'Caller'] },
          voiceNotes: { type: 'string' },
        },
      },
    },
  },
}
const DONE_SCHEMA = {
  type: 'object', required: ['ok', 'summary'],
  properties: { ok: { type: 'boolean' }, summary: { type: 'string' }, details: { type: 'string' } },
}

// ---------------------------------------------------------------------------
// Phase 1 — curator selects the N strongest parents to continue.
// ---------------------------------------------------------------------------
phase('Select')
let chosen = PARENTS.slice(0, count)
if (PARENTS.length > count) {
  const menu = PARENTS.map(p => `[${p.slug}] ${p.title} :: cliffhanger: ${p.seed}`).join('\n')
  const sel = await agent(
    `You are the Snazzie FM showrunner choosing the ${count} BEST episodes to give a Part 2, out of
${PARENTS.length}. Optimise for: cliffhangers with the most comedic runway, payoff potential, and
VARIETY (don't pick ten "sinister product" sequels). Return exactly ${count} parent slugs.

PARENTS:
${menu}`,
    { phase: 'Select', schema: SELECT_SCHEMA },
  )
  if (sel && Array.isArray(sel.chosen) && sel.chosen.length) {
    const bySlug = new Map(PARENTS.map(p => [p.slug, p]))
    const picked = sel.chosen.map(s => bySlug.get(s)).filter(Boolean)
    if (picked.length) chosen = picked.slice(0, count)
  }
}
log(`continuing ${chosen.length}: ${chosen.map(c => c.slug).join(', ')}`)

// ---------------------------------------------------------------------------
// Phase 2 — per Part-2 pipeline: draft -> critique -> revise (parallel).
// ---------------------------------------------------------------------------
phase('Produce')
const produced = (await pipeline(
  chosen,
  (parent) => agent(
    `Write a PART 2 episode continuing the parent below, and SAVE it to
${EPISODE_DIR}/${parent.slug}-part-2.json.

PARENT: [${parent.slug}] "${parent.title}"
CLIFFHANGER TO PICK UP: ${parent.seed}

Steps:
1. Read the PARENT episode JSON at ${EPISODE_DIR}/${parent.slug}.json in full — match its cast,
   voices, tone, and running gag. ${REF_NOTE}
2. Also read ${SKILL} and skim ${RADIO_TS} (the CAST map) so every speaker id you use is real.
3. Write 18-30 lines that continue the story: open on the cliffhanger, escalate past the parent,
   pay off its gag in a new way, end on a dry button that opens a Part 3.
4. Each line: { "speaker", "text", "overlap", "timestamp": 0, "duration": 0 }. No "audio" key.
5. Top-level fields: "slug" ("${parent.slug}-part-2"), "title" ("${parent.title} (Part 2)"),
   "description", "lines". Save with the Write tool.

${RULES}

${CONTINUE}

Return slug, title, parentSlug ("${parent.slug}"), absolute filePath, speaker ids used, line count,
nextSeed (the Part-3 hook), and newSpeakers (any speaker id NOT already in the CAST map of
${RADIO_TS}) with id/name/hex color/role/voiceNotes.`,
    { label: `draft:${parent.slug}-part-2`, phase: 'Produce', schema: DRAFT_SCHEMA },
  ),
  (draft) => draft && agent(
    `Adversarially review the Part-2 episode JSON at ${draft.filePath}. Check ALL of:
- CONTINUITY: does it actually pick up parent "${draft.parentSlug}"'s cliffhanger, reuse its cast,
  and escalate (not just restate)? Read ${EPISODE_DIR}/${draft.parentSlug}.json to confirm voices
  and the gag carry over. Does the button leave a Part-3 hook?
- TTS-safety (BLOCKERS): em-dashes (— / --), nonverbal tokens (gasps)/(sighs)/(laughs), raw URLs,
  unspelled acronyms, non-UTF8 garbage.
- Comedy: varied line length, gag payoff, rapid-fire climax, dry callback button, distinct tics.
- Name/character: every named line names whoever it replies to; characters stay in voice.
- Overlap/pacing: anchor negative, agitated callers positive (+0.25..+0.4); last-word reactions
  use overlap <= 0; no speaker talks over their own earlier line; not everyone on one value.
EDIT the file in place to fix every blocker and major and clear minors. Keep timestamp/duration 0
and no "audio" key. Re-verify no em-dashes / nonverbals remain. Reference: ${SKILL}. Report changes.`,
    { label: `polish:${draft.slug}`, phase: 'Produce', schema: DONE_SCHEMA },
  ),
)).filter(Boolean)

// ---------------------------------------------------------------------------
// Phase 3 — wire all Part 2s.
// ---------------------------------------------------------------------------
phase('Wire')
const slugList = chosen.map(c => `${c.slug}-part-2`).join(', ')
const wire = await agent(
  `Register ${chosen.length} new Part-2 episodes so the site loads them. Their JSON files are in
${EPISODE_DIR}; the expected slugs (confirm by listing the dir — a draft may have re-slugged):
${slugList}

For EACH new episode:
1. Read its JSON for the title and every distinct "speaker" id.
2. Any speaker id NOT already in the CAST map of ${RADIO_TS} is NEW (Part 2s mostly reuse parent
   cast, so this should be rare). For each new id: add it to the CAST map in ${RADIO_TS}
   ({ id, name, color (hex), role }) AND to ${CAST_JSON} with a voice config (instruct from
   OmniVoice's fixed vocab only, speed, phone_filter true for callers, ref_audio, ref_text);
   mirror a similar existing character's ref if none exists and add a "_note".
3. In ${RADIO_TS}: add an import for "./radio/<slug>.json" (camelCase var, e.g. theRenewalWindowPart2)
   near the other episode imports, and add episodeFrom(<var>) to the EPISODES array. Place each
   Part 2 right AFTER its parent in EPISODES so they read in order.
4. Do NOT touch ADS / MUSIC_TRACKS / BLUNDER arrays.

Work sequentially so edits to ${RADIO_TS} and ${CAST_JSON} don't clobber each other.
Reference: ${SKILL}. Report each episode wired and any cast needing a real voice ref later.`,
  { phase: 'Wire', schema: DONE_SCHEMA },
)
log(`wire: ${wire?.summary ?? 'failed'}`)

// ---------------------------------------------------------------------------
// Phase 4 — build verify.
// ---------------------------------------------------------------------------
phase('Verify')
const verify = await agent(
  `Verify the site builds after wiring ${chosen.length} new Part-2 episodes.
Run: cd ${REPO}/Website && bun run build
Report pass/fail and quote any error verbatim. (Audio is rendered separately afterwards; the build
does not need the clips.)`,
  { phase: 'Verify', schema: DONE_SCHEMA },
)

const slugs = chosen.map(c => `${c.slug}-part-2`)
return {
  requested: count,
  produced: produced.length,
  slugs,
  parents: chosen.map(c => c.slug),
  wired: wire?.ok ?? false,
  wireSummary: wire?.summary,
  buildPassed: verify?.ok ?? false,
  buildNotes: verify?.details ?? verify?.summary,
  renderCommand: `python scripts/generate-radio.py ${slugs.join(' ')}`,
}
