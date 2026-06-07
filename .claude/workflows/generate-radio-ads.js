export const meta = {
  name: 'generate-radio-ads',
  description: 'Generate N Snazzie FM "Pro" parody ad spots (~13s, announcer + shared disclaimer man): over-generate concepts across product categories, select the best N for variety, draft/critique/revise each, wire into ADS, build-verify. Audio renders separately.',
  whenToUse: 'When you want several new professionally-announced radio ads (NOT blunders). args = a number (count, default 20). Reuses the existing announcer roster + the shared ad-disclaimer voice.',
  phases: [
    { title: 'Concept', detail: 'over-generate ad concepts across distinct product categories' },
    { title: 'Select', detail: 'curator picks the best N for category + announcer-voice variety' },
    { title: 'Produce', detail: 'per ad pipeline: draft -> critique -> revise (parallel)' },
    { title: 'Wire', detail: 'import + add each to STANDARD_ADS in radio.ts' },
    { title: 'Verify', detail: 'bun run build (audio renders separately afterwards)' },
  ],
}

// ---------------------------------------------------------------------------
const REPO = 'C:/Users/acoop/Documents/GitHub/SnazzieSpaceReact'
const SKILL_ADS = `${REPO}/.claude/skills/radio-adverts/SKILL.md`
const SKILL_EP = `${REPO}/.claude/skills/radio-episodes/SKILL.md`
const RADIO_TS = `${REPO}/Website/src/data/radio.ts`
const EPISODE_DIR = `${REPO}/Website/src/data/radio`

// Existing announcer voices (already in CAST + cast.json). Reuse these — do NOT invent new
// announcer voices (that needs LibriSpeech sourcing). The disclaimer is ALWAYS ad-disclaimer.
const ANNOUNCERS = [
  'ad-announcer', 'ad-ann-rage', 'ad-ann-surgery', 'ad-ann-cash', 'ad-ann-cat', 'ad-ann-deep',
  'ad-ann-gravel', 'ad-ann-smooth', 'ad-ann-nasal', 'ad-ann-shouty', 'ad-ann-chipper',
]

const AD_RULES = `
A Snazzie FM "Pro" ad is a tiny OmniVoice spot, ~13 seconds, ~30-40 words total. Diabolical
GTA-radio energy: a real product category sold with deranged enthusiasm, undercut by a deadpan
body-horror disclaimer. Parody only, punch up at the product, no slurs / real-world shock content.

SHAPE (strict):
- FIRST line(s): the ANNOUNCER. speaker is ONE of the existing announcer voices:
  ${ANNOUNCERS.join(', ')}. Pick one that fits the product. Hook -> absurd promise, with the brand
  + tagline folded into the END of the pitch.
- LAST line: the DISCLAIMER, speaker EXACTLY "ad-disclaimer" (the shared recurring fine-print man,
  same voice in every ad). It machine-guns the horrifying side-effects / legal tail and ENDS on
  exactly: "Terms and conditions apply." The disclaimer is ALWAYS the final line.
- Default is 2 lines (announcer, then disclaimer). If longer, still END on the disclaimer.

TTS-safe text (sent VERBATIM to OmniVoice):
- NO em-dashes (— / --) — read as "euro". Use "..." or commas. ASCII punctuation only. UTF-8.
- NO nonverbal tokens (laughs)/(sighs) — read aloud literally.
- Avoid glued camelCase brands that will mispronounce; pick a brand that reads cleanly aloud.

CLAUSE-SPLITTING (critical — OmniVoice drops clauses from long lines):
- The DISCLAIMER line MUST be split with "<p:0>" between EVERY clause/sentence (zero-gap split so
  nothing elides but the breathless rattle is preserved), e.g.:
  "Side effects include spontaneous combustion. <p:0> Not for cats. <p:0> May attract wolves. <p:0> Terms and conditions apply."
- Any ANNOUNCER line over ~30 words: split at sentence boundaries with "<p:0.2>" (a small real
  breath), NOT <p:0>.

Per line author ONLY: "speaker", "text", "overlap" (0 is fine for a 2-line ad). Set "timestamp": 0,
"duration": 0, omit "audio". Top-level: "slug", "title", "description", "type": "ad". NO "engine",
NO "track".`

let count = 20
if (typeof args === 'number') count = args
else if (args && typeof args === 'object' && Number.isInteger(args.count)) count = args.count
count = Math.max(1, Math.min(count, 30))
const POOL = count + 5

// ---------------------------------------------------------------------------
const CONCEPT_SCHEMA = {
  type: 'object',
  required: ['slug', 'brand', 'category', 'announcer', 'tagline', 'promise', 'disclaimer'],
  properties: {
    slug: { type: 'string', description: 'kebab-case starting "ad-", unique' },
    brand: { type: 'string' },
    category: { type: 'string', description: 'real product category being parodied' },
    announcer: { type: 'string', description: 'one of the existing announcer voice ids' },
    tagline: { type: 'string' },
    promise: { type: 'string', description: 'the absurd promise the pitch makes' },
    disclaimer: { type: 'string', description: 'the body-horror / legal tail, one line' },
  },
}
const SELECT_SCHEMA = {
  type: 'object', required: ['chosen'],
  properties: { chosen: { type: 'array', items: { type: 'string' } }, note: { type: 'string' } },
}
const DRAFT_SCHEMA = {
  type: 'object',
  required: ['slug', 'title', 'filePath', 'announcer', 'wordCount'],
  properties: {
    slug: { type: 'string' }, title: { type: 'string' }, filePath: { type: 'string' },
    announcer: { type: 'string', description: 'announcer voice id used' },
    wordCount: { type: 'integer' },
  },
}
const DONE_SCHEMA = {
  type: 'object', required: ['ok', 'summary'],
  properties: { ok: { type: 'boolean' }, summary: { type: 'string' }, details: { type: 'string' } },
}

// ---------------------------------------------------------------------------
phase('Concept')
const CATEGORIES = [
  'pharmaceutical / medication', 'energy drink or supplement', 'discount surgery or medical procedure',
  'legal / injury-lawyer services', 'fast food or processed food', 'insurance or financial product',
  'home security / surveillance', 'beauty / anti-aging / cosmetics', 'funeral / afterlife services',
  'auto / dealership', 'pest control or cleaning', 'tech gadget / app / subscription',
  'pet product', 'real estate / timeshare', 'weight loss / fitness', 'childcare / education',
]
const pool = (await parallel(Array.from({ length: POOL }, (_, i) => () =>
  agent(
    `Pitch ONE Snazzie FM "Pro" ad concept. Assigned product category (#${i}): ${CATEGORIES[i % CATEGORIES.length]}.
Make it distinct: a unique brand, a unique slug, a fresh absurd promise.

Read the ads skill: ${SKILL_ADS} (format, tone, disclaimer rules). Skim ${RADIO_TS} so your slug
does NOT collide with an existing "ad-*" and you pick a real announcer voice from this roster:
${ANNOUNCERS.join(', ')}.

${AD_RULES}

Return one concept: slug (kebab, starts "ad-"), brand, category, announcer (from the roster),
tagline, the absurd promise, and a one-line body-horror disclaimer idea.`,
    { label: `concept:${i}`, phase: 'Concept', schema: CONCEPT_SCHEMA },
  ),
))).filter(Boolean)

const seen = new Set()
const concepts = []
for (const c of pool) { if (!seen.has(c.slug)) { seen.add(c.slug); concepts.push(c) } }
log(`${concepts.length} unique ad concepts (pool ${POOL})`)

// ---------------------------------------------------------------------------
phase('Select')
let chosen = concepts.slice(0, count)
if (concepts.length > count) {
  const menu = concepts.map(c => `[${c.slug}] ${c.brand} (${c.category}, voice ${c.announcer}) :: ${c.promise} // ${c.tagline}`).join('\n')
  const sel = await agent(
    `Pick the strongest ${count} ad concepts from this pool of ${concepts.length}. Optimise for:
funniest, freshest, and VARIETY across product categories AND announcer voices (don't pick ten
ad-ann-rage spots, spread the roster). Return exactly ${count} slugs.

POOL:
${menu}`,
    { phase: 'Select', schema: SELECT_SCHEMA },
  )
  if (sel && Array.isArray(sel.chosen) && sel.chosen.length) {
    const bySlug = new Map(concepts.map(c => [c.slug, c]))
    const picked = sel.chosen.map(s => bySlug.get(s)).filter(Boolean)
    if (picked.length) chosen = picked.slice(0, count)
  }
}
log(`selected ${chosen.length}: ${chosen.map(c => c.slug).join(', ')}`)

// ---------------------------------------------------------------------------
phase('Produce')
const produced = (await pipeline(
  chosen,
  (concept) => agent(
    `Write the FULL ad JSON for this concept and SAVE it to ${EPISODE_DIR}/<slug>.json.

CONCEPT:
${JSON.stringify(concept, null, 2)}

Steps:
1. Read the ads skill ${SKILL_ADS} (esp. the disclaimer clause-split rule) and skim the TTS-safe
   rules in ${SKILL_EP}.
2. List ${EPISODE_DIR} and confirm "${concept.slug}" isn't taken; if it is, pick a close unused
   "ad-..." slug.
3. Write the ad: announcer line(s) first using "${concept.announcer}", then the FINAL line
   "ad-disclaimer". ~30-40 words total, ~13s. End the disclaimer on exactly
   "Terms and conditions apply." Split the disclaimer with "<p:0>" between every clause; split any
   30+ word announcer line at sentences with "<p:0.2>".
4. Each line: { "speaker", "text", "overlap": 0, "timestamp": 0, "duration": 0 }. No "audio" key.
5. Top-level: "slug", "title", "description", "type": "ad". NO "engine"/"track". Save with Write.

${AD_RULES}

Return slug, title, absolute filePath, the announcer voice id used, and total wordCount.`,
    { label: `draft:${concept.slug}`, phase: 'Produce', schema: DRAFT_SCHEMA },
  ),
  (draft) => draft && agent(
    `Adversarially review the ad JSON at ${draft.filePath}. Verify and FIX in place:
- SHAPE: first line is an announcer voice from [${ANNOUNCERS.join(', ')}]; the LAST line is
  "ad-disclaimer" and ends on exactly "Terms and conditions apply." Exactly one disclaimer line, last.
- "type": "ad", and there is NO "engine" and NO "track" field.
- DISCLAIMER is split with "<p:0>" between every clause (OmniVoice drops clauses otherwise). Any
  announcer line >30 words is split with "<p:0.2>" at sentences.
- TTS-safety (BLOCKERS): no em-dashes (— / --), no nonverbal tokens (laughs)/(sighs), no raw URLs,
  no glued-camelCase brand that will mispronounce, UTF-8.
- LENGTH: ~30-40 words total (tight ~13s). Trim if bloated.
- COMEDY: bright manic pitch undercut by deadpan body-horror; lands a joke.
Edit the file to fix everything. Keep timestamp/duration 0, no "audio". Reference: ${SKILL_ADS}.
Report what you changed.`,
    { label: `polish:${draft.slug}`, phase: 'Produce', schema: DONE_SCHEMA },
  ),
)).filter(Boolean)

// ---------------------------------------------------------------------------
phase('Wire')
const slugList = chosen.map(c => c.slug).join(', ')
const wire = await agent(
  `Register ${chosen.length} new Pro ad spots in ${RADIO_TS}. Their JSON files are in ${EPISODE_DIR};
expected slugs (confirm by listing the dir, a draft may have re-slugged):
${slugList}

For EACH ad:
1. Add an import near the other ad imports: import <camelCaseVar> from "./radio/<slug>.json";
   (e.g. ad-foo-bar -> adFooBar).
2. Add <camelCaseVar> to the STANDARD_ADS array literal (the one that does .map(adFrom)).
These ads reuse existing announcer voices and the shared "ad-disclaimer" — they should NOT need any
new CAST entries. If a draft used a speaker id NOT already in the CAST map, that's an error: report
it (do not invent a voice). Do NOT touch EPISODES / MUSIC_TRACKS / BLUNDER_ADS.

Work sequentially so the edits don't clobber each other. Reference: ${SKILL_ADS}. Report each ad wired.`,
  { phase: 'Wire', schema: DONE_SCHEMA },
)
log(`wire: ${wire?.summary ?? 'failed'}`)

// ---------------------------------------------------------------------------
phase('Verify')
const verify = await agent(
  `Verify the site builds after wiring ${chosen.length} new ads.
Run: cd ${REPO}/Website && bun run build
Report pass/fail and quote any error verbatim. (Audio renders separately; the build doesn't need clips.)`,
  { phase: 'Verify', schema: DONE_SCHEMA },
)

return {
  requested: count,
  produced: produced.length,
  slugs: chosen.map(c => c.slug),
  ads: chosen.map(c => ({ slug: c.slug, brand: c.brand, voice: c.announcer })),
  wired: wire?.ok ?? false,
  wireSummary: wire?.summary,
  buildPassed: verify?.ok ?? false,
  buildNotes: verify?.details ?? verify?.summary,
  renderCommand: `python scripts/generate-radio.py ${chosen.map(c => c.slug).join(' ')}`,
}
