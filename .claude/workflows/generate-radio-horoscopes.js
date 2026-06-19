export const meta = {
  name: 'generate-radio-horoscopes',
  description: 'Generate N Snazzie FM horoscope segments: Rhonda reads doom-laced absurd star signs while Ronnie reacts, ~1 minute. Reuses existing cast (rhonda + ronnie), no new voices. Concept -> select -> draft/critique/revise -> wire; audio renders separately.',
  whenToUse: 'When you want horoscope segments (mystic reads ominous absurd predictions, host reacts, ~1 min). args = a number (count, default 10).',
  phases: [
    { title: 'Concept', detail: 'one horoscope segment concept per theme' },
    { title: 'Select', detail: 'curator picks the best N for variety + funniest doom' },
    { title: 'Produce', detail: 'per segment pipeline: draft -> critique -> revise (parallel)' },
    { title: 'Wire', detail: 'imports + EPISODES entries (no new cast)' },
    { title: 'Verify', detail: 'bun run build (audio renders separately afterwards)' },
  ],
}

const REPO = 'C:/Users/acoop/Documents/GitHub/SnazzieSpaceReact'
const SKILL = `${REPO}/.claude/skills/radio-episodes/SKILL.md`
const RADIO_TS = `${REPO}/Website/src/projects/snazziefm/data/radio.ts`
const EPISODE_DIR = `${REPO}/Website/src/projects/snazziefm/data/radio`
const CANONICAL_REF = `${EPISODE_DIR}/villain-hour.json`

const FORMAT = `FORMAT — THE STARS WITH RHONDA (~1 MINUTE):
Rhonda reads the horoscopes as a serene, ominous mystic; each star sign gets an absurd, doom-laced
prediction delivered as calm cosmic fact. Ronnie hosts and reacts (nervous, trying to find the
upside, taking it too literally). The comedy is dead-serious cosmic dread about petty/mundane stuff.
- TWO SPEAKERS ONLY: "rhonda" (the mystic, calm + ominous) and "ronnie" (host, reacts/banters).
- LENGTH: ~45-60s, ~8-14 short lines, ~120-150 words. Tight.
- STRUCTURE: a quick intro ("The stars, with Rhonda"), then 3-5 star signs (Rhonda predicts, Ronnie
  reacts to some, not all), then a button.
- RUNNING GAG: a recurring ominous motif across signs (e.g. every sign should "avoid the parking
  lot", or "the fog already knows", or a thing that keeps getting closer). Escalate it; pay it off.
- BUTTON: Ronnie's own sign is the worst, or a dry callback to the motif.
- Rhonda NEVER breaks calm. Ronnie carries the worry. Predictions about small dumb things
  (a coupon, a group chat, a casserole) treated as cosmic doom land best.`

const RULES = `
OmniVoice MULTITRACK episode. AUTHOR ONLY per line: "speaker", "text", "overlap". timestamp 0,
duration 0, no "audio".
- NO em-dashes (— / --). NO nonverbals (sighs)/(laughs). UTF-8. Spell acronyms. Pause "<p:0.3>".
- Rhonda: calm, overlap mostly small-negative (unhurried). Ronnie reactions to her LAST WORD use
  overlap <= 0; a nervous cut-in can be small positive. VARY line length; <p:0.3> before a punchline.
speaker MUST be only "rhonda" or "ronnie". Both already exist in CAST — NO new speakers.`

let count = 10
if (typeof args === 'number') count = args
else if (args && typeof args === 'object' && Number.isInteger(args.count)) count = args.count
count = Math.max(1, Math.min(count, 16))
const POOL = count + 4

const CONCEPT_SCHEMA = {
  type: 'object',
  required: ['slug', 'title', 'theme', 'motif', 'signs', 'button'],
  properties: {
    slug: { type: 'string', description: 'kebab-case, unique, no "ad-"' },
    title: { type: 'string', description: 'e.g. "The Stars with Rhonda: Mercury Is Furious"' },
    theme: { type: 'string' },
    motif: { type: 'string', description: 'the recurring ominous warning across signs' },
    signs: { type: 'array', description: '3-5 signs + their doom prediction (one line each)', items: { type: 'string' } },
    button: { type: 'string' },
  },
}
const SELECT_SCHEMA = { type: 'object', required: ['chosen'], properties: { chosen: { type: 'array', items: { type: 'string' } }, note: { type: 'string' } } }
const DRAFT_SCHEMA = {
  type: 'object', required: ['slug', 'title', 'filePath', 'speakers', 'lineCount', 'newSpeakers'],
  properties: { slug: { type: 'string' }, title: { type: 'string' }, filePath: { type: 'string' }, speakers: { type: 'array', items: { type: 'string' } }, lineCount: { type: 'integer' }, newSpeakers: { type: 'array', items: { type: 'object' } } },
}
const DONE_SCHEMA = { type: 'object', required: ['ok', 'summary'], properties: { ok: { type: 'boolean' }, summary: { type: 'string' }, details: { type: 'string' } } }

phase('Concept')
const THEMES = ['mercury retrograde', 'love and romance', 'money and luck', 'career and ambition', 'health and the body', 'family and home', 'travel and the commute', 'the harvest / seasonal', 'conflict and enemies', 'transformation and endings']
const pool = (await parallel(Array.from({ length: POOL }, (_, i) => () =>
  agent(
    `Pitch ONE Snazzie FM horoscope segment concept. Assigned theme (#${i}): ${THEMES[i % THEMES.length]}.
Rhonda reads doom-laced absurd star signs; Ronnie reacts.

Read the craft skill: ${SKILL}. Skim ${CANONICAL_REF} for rhythm. Read ${RADIO_TS} so your slug does
not collide.

${FORMAT}\n${RULES}

Return: slug, a "The Stars with Rhonda..." title, theme, the recurring ominous motif, 3-5 signs with
their doom prediction, and a button.`,
    { label: `concept:${i}`, phase: 'Concept', schema: CONCEPT_SCHEMA },
  ),
))).filter(Boolean)
const seen = new Set(); const concepts = []
for (const c of pool) { if (!seen.has(c.slug)) { seen.add(c.slug); concepts.push(c) } }
log(`${concepts.length} unique horoscope concepts (pool ${POOL})`)

phase('Select')
let chosen = concepts.slice(0, count)
if (concepts.length > count) {
  const menu = concepts.map(c => `[${c.slug}] ${c.title} (${c.theme}) :: motif: ${c.motif}; signs: ${c.signs.join(' / ')}`).join('\n')
  const sel = await agent(`Pick the strongest ${count} horoscope concepts from ${concepts.length}. Optimise for funniest cosmic dread, freshest motif, VARIETY of theme. Return exactly ${count} slugs.\n\nPOOL:\n${menu}`, { phase: 'Select', schema: SELECT_SCHEMA })
  if (sel?.chosen?.length) { const m = new Map(concepts.map(c => [c.slug, c])); const p = sel.chosen.map(s => m.get(s)).filter(Boolean); if (p.length) chosen = p.slice(0, count) }
}
log(`selected ${chosen.length}: ${chosen.map(c => c.slug).join(', ')}`)

phase('Produce')
const produced = (await pipeline(
  chosen,
  (concept) => agent(
    `Write the FULL horoscope segment JSON for this concept and SAVE it to ${EPISODE_DIR}/<slug>.json.

CONCEPT:\n${JSON.stringify(concept, null, 2)}

Steps:
1. Read ${SKILL}. 2. List ${EPISODE_DIR}; confirm "${concept.slug}" is free, else re-slug.
3. Write a ~1-minute segment: ~8-14 short lines, ~120-150 words. Quick intro, 3-5 signs (Rhonda
   predicts calmly; Ronnie reacts to some), the escalating ominous motif, a button (Ronnie's sign is
   worst or a motif callback). ONLY "rhonda" and "ronnie" speak.
4. Each line: { "speaker", "text", "overlap", "timestamp": 0, "duration": 0 }. No "audio".
5. Top-level: "slug", "title", "description", "category": "horoscope", "lines". Save with Write.

${FORMAT}\n${RULES}

Return slug, title, absolute filePath, speaker ids used (only rhonda/ronnie), line count, and
newSpeakers (MUST be empty).`,
    { label: `draft:${concept.slug}`, phase: 'Produce', schema: DRAFT_SCHEMA },
  ),
  (draft) => draft && agent(
    `Adversarially review the horoscope JSON at ${draft.filePath}. Fix in place:
- TWO VOICES ONLY (BLOCKER): every "speaker" is "rhonda" or "ronnie". Any other id is a blocker.
- LENGTH: ~1 min (~8-14 lines, ~120-150 words). Trim if long.
- FORMAT: Rhonda calm + ominous, Ronnie reacts; 3-5 signs; an escalating motif that pays off; a
  button. Flag a Rhonda line that breaks calm, or doom that isn't about something petty/mundane.
- TTS-safety (BLOCKERS): em-dashes (— / --), nonverbals (sighs)/(laughs), raw URLs, unspelled acronyms.
- Pacing: Rhonda unhurried (negative); Ronnie last-word reactions <= 0; no speaker over their own line.
EDIT to fix all blockers/majors. Keep timestamp/duration 0, no "audio". Reference: ${SKILL}. Report changes.`,
    { label: `polish:${draft.slug}`, phase: 'Produce', schema: DONE_SCHEMA },
  ),
)).filter(Boolean)

phase('Wire')
const slugList = chosen.map(c => c.slug).join(', ')
const wire = await agent(
  `Register ${chosen.length} new horoscope segments in ${RADIO_TS}. JSON files in ${EPISODE_DIR};
expected slugs (confirm by listing the dir): ${slugList}
For EACH: import "./radio/<slug>.json" (camelCase var) near the episode imports and add
episodeFrom(<var>) to the EPISODES array. These reuse rhonda + ronnie, so NO CAST or cast.json
changes are needed — if a draft used any other speaker id, report it (do not invent a voice). Do NOT
touch ADS / MUSIC_TRACKS / BLUNDER arrays. Work sequentially. Reference: ${SKILL}. Report what wired.`,
  { phase: 'Wire', schema: DONE_SCHEMA })
log(`wire: ${wire?.summary ?? 'failed'}`)

phase('Verify')
const verify = await agent(`Verify the build after wiring ${chosen.length} horoscope segments. Run: cd ${REPO}/Website && bun run build\nReport pass/fail and quote any error verbatim. (Audio renders separately.)`, { phase: 'Verify', schema: DONE_SCHEMA })

return {
  requested: count, produced: produced.length, slugs: chosen.map(c => c.slug),
  segments: chosen.map(c => ({ slug: c.slug, title: c.title, theme: c.theme, motif: c.motif })),
  wired: wire?.ok ?? false, wireSummary: wire?.summary,
  buildPassed: verify?.ok ?? false, buildNotes: verify?.details ?? verify?.summary,
  renderCommand: `python scripts/generate-radio.py ${chosen.map(c => c.slug).join(' ')}`,
}
