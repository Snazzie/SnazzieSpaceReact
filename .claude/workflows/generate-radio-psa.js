export const meta = {
  name: 'generate-radio-psa',
  description: 'Generate N Snazzie FM Civic Notification System spots: short (~25-40s) deadpan dystopian emergency/PSA/test broadcasts in the flat fine-print voice. Creepy, not jokey. Reuses ad-disclaimer (+ optional ad-ann-deep). Concept -> select -> draft/critique/revise -> wire; audio renders separately.',
  whenToUse: 'When you want eerie PSA / emergency-test broadcasts (calm dystopian instructions). args = a number (count, default 10).',
  phases: [
    { title: 'Concept', detail: 'one PSA concept per civic hazard category' },
    { title: 'Select', detail: 'curator picks the best N for dread + variety' },
    { title: 'Produce', detail: 'per PSA pipeline: draft -> critique -> revise (parallel)' },
    { title: 'Wire', detail: 'imports + EPISODES entries (no new cast)' },
    { title: 'Verify', detail: 'bun run build (audio renders separately afterwards)' },
  ],
}

const REPO = 'C:/Users/acoop/Documents/GitHub/SnazzieSpaceReact'
const SKILL = `${REPO}/.claude/skills/radio-episodes/SKILL.md`
const RADIO_TS = `${REPO}/Website/src/data/radio.ts`
const EPISODE_DIR = `${REPO}/Website/src/data/radio`

const FORMAT = `FORMAT — SNAZZIE FM CIVIC NOTIFICATION SYSTEM (~25-40s):
A calm, flat automated public-service / emergency-test broadcast that delivers absurd dystopian
instructions as routine civic procedure. The horror is the TOTAL calm. This is NOT a comedy banter
bit, it is eerie and deadpan, like a real emergency broadcast that has gone quietly wrong.
- VOICE: primarily "ad-disclaimer" (the flat, monotone Snazzie FM fine-print voice) as the Civic
  Notification System. Optionally ONE line from "ad-ann-deep" as a deep "this has been a message"
  sign-off. Keep it to these voices.
- LENGTH: SHORT. ~25-40s, ~5-9 lines, ~70-100 words. Brevity is the dread.
- STRUCTURE: open with the system identifier ("This is a test of the Snazzie FM Civic Notification
  System."), then 2-4 calm dystopian instructions, then a sign-off with a quiet twist (e.g. "This
  concludes the test." ... then "This was not a test.", or "Please remain calm. You have always been
  calm.").
- CONTENT: instructions about absurd local hazards delivered as bureaucratic fact (the fog, the
  pigeons that vote, a sound under the reservoir, the thing in the mall fountain, mandatory
  gratitude, the curfew nobody announced). Calm, specific, never explained.
- LORE: may reference the Snazzie FM universe (the fog, GreenFlow, the DMV) as civic matters.
- TONE: zero jokes-as-jokes. The comedy is entirely in the deadpan dread + the twist.`

const RULES = `
OmniVoice MULTITRACK episode. AUTHOR ONLY per line: "speaker", "text", "overlap". timestamp 0,
duration 0, no "audio".
- NO em-dashes (— / --). NO nonverbals (sighs)/(laughs). UTF-8. Spell acronyms ("D M V").
- This voice is SLOW and flat: use "<p:0.5>" and "<p:0.3>" between instructions for cold dead air.
- Lines are sequential and calm: overlap negative (small gaps), NEVER positive (no talk-over in a
  PSA). The sign-off twist line gets a "<p:0.5>" before it.
speaker MUST be only "ad-disclaimer" or "ad-ann-deep" (both already exist). NO new speakers.`

let count = 10
if (typeof args === 'number') count = args
else if (args && typeof args === 'object' && Number.isInteger(args.count)) count = args.count
count = Math.max(1, Math.min(count, 16))
const POOL = count + 4

const CONCEPT_SCHEMA = {
  type: 'object',
  required: ['slug', 'title', 'hazard', 'instructions', 'twist'],
  properties: {
    slug: { type: 'string', description: 'kebab-case, unique, no "ad-"' },
    title: { type: 'string', description: 'e.g. "Civic Notice: The Reservoir"' },
    hazard: { type: 'string', description: 'the absurd civic hazard' },
    instructions: { type: 'array', description: '2-4 calm dystopian instructions', items: { type: 'string' } },
    twist: { type: 'string', description: 'the quiet sign-off twist' },
  },
}
const SELECT_SCHEMA = { type: 'object', required: ['chosen'], properties: { chosen: { type: 'array', items: { type: 'string' } }, note: { type: 'string' } } }
const DRAFT_SCHEMA = {
  type: 'object', required: ['slug', 'title', 'filePath', 'speakers', 'lineCount', 'newSpeakers'],
  properties: { slug: { type: 'string' }, title: { type: 'string' }, filePath: { type: 'string' }, speakers: { type: 'array', items: { type: 'string' } }, lineCount: { type: 'integer' }, newSpeakers: { type: 'array', items: { type: 'object' } } },
}
const DONE_SCHEMA = { type: 'object', required: ['ok', 'summary'], properties: { ok: { type: 'boolean' }, summary: { type: 'string' }, details: { type: 'string' } } }

phase('Concept')
const HAZARDS = ['the fog', 'the pigeons / birds', 'the reservoir / water', 'a sound nobody can locate', 'mandatory civic emotion (gratitude/calm)', 'the curfew', 'an evacuation that goes nowhere', 'the power grid / lights', 'a missing day / time', 'the mall fountain / a public structure']
const pool = (await parallel(Array.from({ length: POOL }, (_, i) => () =>
  agent(
    `Pitch ONE Snazzie FM Civic Notification System (PSA / emergency-test) concept. Assigned hazard
(#${i}): ${HAZARDS[i % HAZARDS.length]}. Calm, flat, dystopian, eerie. NOT jokey.

Read the craft skill: ${SKILL} (esp. TTS-safe + pause tokens). Read ${RADIO_TS} so your slug does not
collide.

${FORMAT}\n${RULES}

Return: slug, a "Civic Notice..." title, the hazard, 2-4 calm dystopian instructions, and the quiet
sign-off twist.`,
    { label: `concept:${i}`, phase: 'Concept', schema: CONCEPT_SCHEMA },
  ),
))).filter(Boolean)
const seen = new Set(); const concepts = []
for (const c of pool) { if (!seen.has(c.slug)) { seen.add(c.slug); concepts.push(c) } }
log(`${concepts.length} unique PSA concepts (pool ${POOL})`)

phase('Select')
let chosen = concepts.slice(0, count)
if (concepts.length > count) {
  const menu = concepts.map(c => `[${c.slug}] ${c.title} (${c.hazard}) :: ${c.instructions.join(' / ')} // twist: ${c.twist}`).join('\n')
  const sel = await agent(`Pick the strongest ${count} PSA concepts from ${concepts.length}. Optimise for eeriest deadpan dread, best twist, VARIETY of hazard. Return exactly ${count} slugs.\n\nPOOL:\n${menu}`, { phase: 'Select', schema: SELECT_SCHEMA })
  if (sel?.chosen?.length) { const m = new Map(concepts.map(c => [c.slug, c])); const p = sel.chosen.map(s => m.get(s)).filter(Boolean); if (p.length) chosen = p.slice(0, count) }
}
log(`selected ${chosen.length}: ${chosen.map(c => c.slug).join(', ')}`)

phase('Produce')
const produced = (await pipeline(
  chosen,
  (concept) => agent(
    `Write the FULL Civic Notification System PSA JSON for this concept and SAVE it to ${EPISODE_DIR}/<slug>.json.

CONCEPT:\n${JSON.stringify(concept, null, 2)}

Steps:
1. Read ${SKILL}. 2. List ${EPISODE_DIR}; confirm "${concept.slug}" is free, else re-slug.
3. Write a SHORT eerie PSA: ~5-9 lines, ~70-100 words, ~25-40s. Open with the system identifier,
   2-4 calm dystopian instructions with "<p:0.5>"/"<p:0.3>" dead air between them, and a sign-off
   twist (precede the twist line with "<p:0.5>"). Mostly "ad-disclaimer"; optionally one final
   "ad-ann-deep" line. Stay flat and eerie, NO jokes-as-jokes.
4. Each line: { "speaker", "text", "overlap", "timestamp": 0, "duration": 0 }. No "audio".
5. Top-level: "slug", "title", "description", "category": "psa", "lines". Save with Write.

${FORMAT}\n${RULES}

Return slug, title, absolute filePath, speaker ids used (only ad-disclaimer/ad-ann-deep), line
count, and newSpeakers (MUST be empty).`,
    { label: `draft:${concept.slug}`, phase: 'Produce', schema: DRAFT_SCHEMA },
  ),
  (draft) => draft && agent(
    `Adversarially review the PSA JSON at ${draft.filePath}. Fix in place:
- VOICES ONLY (BLOCKER): every "speaker" is "ad-disclaimer" or "ad-ann-deep". Any other id is a blocker.
- LENGTH: SHORT (~5-9 lines, ~70-100 words, ~25-40s). If it rambles, cut it down hard.
- FORMAT: opens with the system identifier; 2-4 calm dystopian instructions; pause tokens ("<p:0.5>"
  /"<p:0.3>") for dead air; a quiet sign-off twist preceded by "<p:0.5>". Flag any jokey/winking line
  that breaks the deadpan dread, or any positive overlap (a PSA never talks over itself).
- TTS-safety (BLOCKERS): em-dashes (— / --), nonverbals (sighs)/(laughs), raw URLs, unspelled acronyms.
EDIT to fix all blockers/majors. Keep timestamp/duration 0, no "audio". Reference: ${SKILL}. Report changes.`,
    { label: `polish:${draft.slug}`, phase: 'Produce', schema: DONE_SCHEMA },
  ),
)).filter(Boolean)

phase('Wire')
const slugList = chosen.map(c => c.slug).join(', ')
const wire = await agent(
  `Register ${chosen.length} new PSA spots in ${RADIO_TS}. JSON files in ${EPISODE_DIR}; expected slugs
(confirm by listing the dir): ${slugList}
For EACH: import "./radio/<slug>.json" (camelCase var) near the episode imports and add
episodeFrom(<var>) to the EPISODES array. (They are eerie segments, treated as episodes, NOT ads, so
add to EPISODES not ADS.) These reuse ad-disclaimer + ad-ann-deep, so NO CAST or cast.json changes
are needed — if a draft used any other speaker id, report it. Do NOT touch ADS / MUSIC_TRACKS /
BLUNDER arrays. Work sequentially. Reference: ${SKILL}. Report what wired.`,
  { phase: 'Wire', schema: DONE_SCHEMA })
log(`wire: ${wire?.summary ?? 'failed'}`)

phase('Verify')
const verify = await agent(`Verify the build after wiring ${chosen.length} PSA spots. Run: cd ${REPO}/Website && bun run build\nReport pass/fail and quote any error verbatim. (Audio renders separately.)`, { phase: 'Verify', schema: DONE_SCHEMA })

return {
  requested: count, produced: produced.length, slugs: chosen.map(c => c.slug),
  psas: chosen.map(c => ({ slug: c.slug, title: c.title, hazard: c.hazard })),
  wired: wire?.ok ?? false, wireSummary: wire?.summary,
  buildPassed: verify?.ok ?? false, buildNotes: verify?.details ?? verify?.summary,
  renderCommand: `python scripts/generate-radio.py ${chosen.map(c => c.slug).join(' ')}`,
}
