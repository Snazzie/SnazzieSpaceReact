export const meta = {
  name: 'generate-radio-news',
  description: 'Generate N Snazzie FM News bulletins: a two-anchor desk reads ~1-minute dystopian local breaking-news, deadpan, with callbacks to existing episode lore (the fog, the pigeons, the 90-year soup, GreenFlow, HonkHeal). Concept -> select -> draft/critique/revise -> wire; audio renders separately.',
  whenToUse: 'When you want Snazzie FM News bulletins (anchor duo, dystopian local news, ~1 min). args = a number (count, default 10).',
  phases: [
    { title: 'Concept', detail: 'one bulletin concept per news beat (civic, crime, weather, business, ...)' },
    { title: 'Select', detail: 'curator picks the best N for variety + funniest dread' },
    { title: 'Produce', detail: 'per bulletin pipeline: draft -> critique -> revise (parallel)' },
    { title: 'Wire', detail: 'register the 2 anchors (first run) + imports + EPISODES entries' },
    { title: 'Verify', detail: 'bun run build (audio renders separately afterwards)' },
  ],
}

const REPO = 'C:/Users/acoop/Documents/GitHub/SnazzieSpaceReact'
const SKILL = `${REPO}/.claude/skills/radio-episodes/SKILL.md`
const RADIO_TS = `${REPO}/Website/src/data/radio.ts`
const CAST_JSON = `${REPO}/scripts/cast.json`
const EPISODE_DIR = `${REPO}/Website/src/data/radio`
const CANONICAL_REF = `${EPISODE_DIR}/villain-hour.json`

// Two recurring news anchors. They may not exist in CAST yet on the first run — the Wire phase
// registers them (mirrored refs until dedicated voices are sourced).
const ANCHORS = `"news-dale" (Dale Crisp, lead anchor: male, middle-aged, authoritative, slightly
gravelly) and "news-marsha" (Marsha Veld, co-anchor: female, middle-aged, crisp and bright).`

const FORMAT = `FORMAT — SNAZZIE FM NEWS (~1 MINUTE):
A two-anchor news desk reads local breaking news, completely deadpan, as if the dystopian absurd is
routine. The comedy is the FLAT delivery of insane civic events.
- TWO SPEAKERS ONLY: ${ANCHORS} They trade lines naturally (one tosses to the other).
- LENGTH: ~45-60s, ~8-14 short lines, ~120-150 words total. Tight.
- STRUCTURE: a cold "top of the hour" intro, then 2-3 quick NEWS ITEMS, then a dry "and finally"
  kicker that is quietly horrifying. Anchors stay calm and professional throughout.
- LORE: weave in callbacks to the Snazzie FM universe where natural (the fog that wants to pay rent,
  Frank and the pigeons, the ninety-year soup, GreenFlow's "green-only" grid, HonkHeal, the DMV).
  Treat these as ongoing local stories. Don't force all of them, pick 1-2.
- RUNNING THREAD: one item that the anchors keep "developing" or returning to ("still no word from
  the fog"), paid off in the kicker.
- TONE: dry, broadcast-cadence, never winking. Marsha can do the soft "human interest" beat; Dale
  the hard news. A tiny professional non-reaction to something monstrous is the joke.`

const RULES = `
OmniVoice MULTITRACK episode. AUTHOR ONLY per line: "speaker", "text", "overlap". timestamp 0,
duration 0, no "audio".
- NO em-dashes (— / --) — read as "euro". Use "..." or commas. NO nonverbals (sighs)/(laughs). UTF-8.
- No raw URLs. Spell acronyms ("D M V"). Pause token "<p>"/"<p:0.3>".
- Anchors are calm: overlap mostly small-negative; a clean toss between anchors is overlap ~0.
  A reaction to the LAST WORD of the prior line uses overlap <= 0.
- VARY line length; <p:0.3> before a dark kicker. Each anchor a faint consistent tic.
speaker MUST be only "news-dale" or "news-marsha".`

let count = 10
if (typeof args === 'number') count = args
else if (args && typeof args === 'object' && Number.isInteger(args.count)) count = args.count
count = Math.max(1, Math.min(count, 16))
const POOL = count + 4

const CONCEPT_SCHEMA = {
  type: 'object',
  required: ['slug', 'title', 'beat', 'items', 'thread', 'kicker'],
  properties: {
    slug: { type: 'string', description: 'kebab-case, unique, no "ad-"' },
    title: { type: 'string', description: 'e.g. "Snazzie FM News: The Fog Files"' },
    beat: { type: 'string', description: 'the news beat (civic, crime, weather, business, ...)' },
    items: { type: 'array', description: '2-3 news items (one-line each)', items: { type: 'string' } },
    thread: { type: 'string', description: 'the developing story the anchors return to' },
    kicker: { type: 'string', description: 'the dry, quietly-horrifying "and finally" sign-off' },
  },
}
const SELECT_SCHEMA = { type: 'object', required: ['chosen'], properties: { chosen: { type: 'array', items: { type: 'string' } }, note: { type: 'string' } } }
const DRAFT_SCHEMA = {
  type: 'object',
  required: ['slug', 'title', 'filePath', 'speakers', 'lineCount', 'newSpeakers'],
  properties: {
    slug: { type: 'string' }, title: { type: 'string' }, filePath: { type: 'string' },
    speakers: { type: 'array', items: { type: 'string' } }, lineCount: { type: 'integer' },
    newSpeakers: { type: 'array', items: { type: 'object', required: ['id', 'name', 'color', 'role'], properties: { id: { type: 'string' }, name: { type: 'string' }, color: { type: 'string' }, role: { type: 'string' }, voiceNotes: { type: 'string' } } } },
  },
}
const DONE_SCHEMA = { type: 'object', required: ['ok', 'summary'], properties: { ok: { type: 'boolean' }, summary: { type: 'string' }, details: { type: 'string' } } }

phase('Concept')
const BEATS = ['civic / infrastructure', 'crime blotter', 'weather', 'local business', 'human interest', 'politics / the council', 'health', 'animals / nature', 'transit / the DMV', 'sports desk']
const pool = (await parallel(Array.from({ length: POOL }, (_, i) => () =>
  agent(
    `Pitch ONE Snazzie FM News bulletin concept. Assigned beat (#${i}): ${BEATS[i % BEATS.length]}.
Deadpan dystopian local news read by the two-anchor desk.

Read the craft skill: ${SKILL}. Skim the canonical funny ref ${CANONICAL_REF} for rhythm. Read
${RADIO_TS} so your slug does not collide and you stay consistent with existing lore.

${FORMAT}

${RULES}

Return: slug, a "Snazzie FM News..." title, the beat, 2-3 one-line news items, the developing
thread the anchors return to, and the dry horrifying kicker.`,
    { label: `concept:${i}`, phase: 'Concept', schema: CONCEPT_SCHEMA },
  ),
))).filter(Boolean)
const seen = new Set(); const concepts = []
for (const c of pool) { if (!seen.has(c.slug)) { seen.add(c.slug); concepts.push(c) } }
log(`${concepts.length} unique news concepts (pool ${POOL})`)

phase('Select')
let chosen = concepts.slice(0, count)
if (concepts.length > count) {
  const menu = concepts.map(c => `[${c.slug}] ${c.title} (${c.beat}) :: ${c.items.join(' / ')} // kicker: ${c.kicker}`).join('\n')
  const sel = await agent(
    `Pick the strongest ${count} news-bulletin concepts from ${concepts.length}. Optimise for funniest
deadpan dread, freshest lore callbacks, and VARIETY across beats. Return exactly ${count} slugs.\n\nPOOL:\n${menu}`,
    { phase: 'Select', schema: SELECT_SCHEMA })
  if (sel?.chosen?.length) { const m = new Map(concepts.map(c => [c.slug, c])); const p = sel.chosen.map(s => m.get(s)).filter(Boolean); if (p.length) chosen = p.slice(0, count) }
}
log(`selected ${chosen.length}: ${chosen.map(c => c.slug).join(', ')}`)

phase('Produce')
const produced = (await pipeline(
  chosen,
  (concept) => agent(
    `Write the FULL Snazzie FM News bulletin JSON for this concept and SAVE it to ${EPISODE_DIR}/<slug>.json.

CONCEPT:\n${JSON.stringify(concept, null, 2)}

Steps:
1. Read ${SKILL}. 2. List ${EPISODE_DIR}; confirm "${concept.slug}" is free, else re-slug.
3. Write a ~1-minute bulletin: ~8-14 short lines, ~120-150 words. Cold "top of the hour" open, 2-3
   news items traded between the two anchors, the developing thread, and a dry horrifying "and
   finally" kicker. Keep anchors flat and professional. ONLY "news-dale" and "news-marsha" speak.
4. Each line: { "speaker", "text", "overlap", "timestamp": 0, "duration": 0 }. No "audio".
5. Top-level: "slug", "title", "description", "category": "news", "lines". Save with Write.

${FORMAT}\n${RULES}

Return slug, title, absolute filePath, speaker ids used, line count, and newSpeakers: include BOTH
anchors (news-dale, news-marsha) with id/name/hex color/role "Guest Expert"/voiceNotes so they get
registered if missing (Dale: male middle-aged authoritative gravelly; Marsha: female middle-aged crisp).`,
    { label: `draft:${concept.slug}`, phase: 'Produce', schema: DRAFT_SCHEMA },
  ),
  (draft) => draft && agent(
    `Adversarially review the news bulletin JSON at ${draft.filePath}. Fix in place:
- TWO VOICES ONLY (BLOCKER): every "speaker" is "news-dale" or "news-marsha". Any other id is a blocker.
- LENGTH: ~1 min (~8-14 lines, ~120-150 words). Trim if long.
- FORMAT: deadpan news desk; 2-3 items; a developing thread; a dry horrifying kicker; anchors stay
  calm/professional (no jokey winking). Flag anything that breaks the broadcast voice.
- TTS-safety (BLOCKERS): em-dashes (— / --), nonverbals (sighs)/(laughs), raw URLs, unspelled acronyms.
- Pacing: clean tosses (overlap ~0), last-word reactions <= 0, no anchor talks over their own line.
EDIT to fix all blockers/majors. Keep timestamp/duration 0, no "audio". Reference: ${SKILL}. Report changes.`,
    { label: `polish:${draft.slug}`, phase: 'Produce', schema: DONE_SCHEMA },
  ),
)).filter(Boolean)

phase('Wire')
const slugList = chosen.map(c => c.slug).join(', ')
const wire = await agent(
  `Register ${chosen.length} new Snazzie FM News bulletins in ${RADIO_TS} + ${CAST_JSON}. JSON files in
${EPISODE_DIR}; expected slugs (confirm by listing the dir): ${slugList}

1. THE TWO ANCHORS: if "news-dale" and/or "news-marsha" are not already in the CAST map of ${RADIO_TS},
   add them — to CAST ({ id, name, color hex, role: "Guest Expert" }) AND to ${CAST_JSON} with a voice
   config (instruct from OmniVoice's fixed vocab only: Dale = "male, middle-aged, american accent,
   low pitch"; Marsha = "female, middle-aged, american accent"; speed ~1.0; phone_filter false;
   ref_audio/ref_text mirrored from a matching existing voice — Dale mirror a low male like
   ad-ann-gravel, Marsha mirror a female like rhonda or caller-kim) with a "_note" that the ref is a
   placeholder. Do this ONCE; later bulletins reuse them.
2. For EACH bulletin: import "./radio/<slug>.json" (camelCase var) near the episode imports and add
   episodeFrom(<var>) to the EPISODES array.
3. Do NOT touch ADS / MUSIC_TRACKS / BLUNDER arrays.
Work sequentially. Reference: ${SKILL}. Report what was wired and the anchor voices needing real refs.`,
  { phase: 'Wire', schema: DONE_SCHEMA })
log(`wire: ${wire?.summary ?? 'failed'}`)

phase('Verify')
const verify = await agent(
  `Verify the build after wiring ${chosen.length} news bulletins. Run: cd ${REPO}/Website && bun run build
Report pass/fail and quote any error verbatim. (Audio renders separately.)`,
  { phase: 'Verify', schema: DONE_SCHEMA })

return {
  requested: count, produced: produced.length, slugs: chosen.map(c => c.slug),
  bulletins: chosen.map(c => ({ slug: c.slug, title: c.title, beat: c.beat })),
  wired: wire?.ok ?? false, wireSummary: wire?.summary,
  buildPassed: verify?.ok ?? false, buildNotes: verify?.details ?? verify?.summary,
  renderCommand: `python scripts/generate-radio.py ${chosen.map(c => c.slug).join(' ')}`,
}
