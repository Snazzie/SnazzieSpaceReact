export const meta = {
  name: 'generate-radio-episodes-batch',
  description: 'Generate N Snazzie FM episodes at once: over-generate concepts (each with part-2 sequel potential), select the best N, then draft/critique/revise/wire each in parallel and build-verify. Audio render runs separately as one batched process.',
  whenToUse: 'When you want several new multi-voice episodes in one go. args = a number (count, default 10) or { count, theme }. Each concept is written to support a Part 2.',
  phases: [
    { title: 'Concept', detail: 'over-generate concepts across distinct angles, each with a part-2 seed' },
    { title: 'Select', detail: 'one curator picks the best N for funny/fresh/variety' },
    { title: 'Produce', detail: 'per episode pipeline: draft -> combined critique -> revise (parallel across episodes)' },
    { title: 'Wire', detail: 'one agent registers all new cast + imports + EPISODES entries' },
    { title: 'Verify', detail: 'bun run build (audio renders separately afterwards)' },
  ],
}

// ---------------------------------------------------------------------------
const REPO = 'C:/Users/acoop/Documents/GitHub/SnazzieSpaceReact'
const SKILL = `${REPO}/.claude/skills/radio-episodes/SKILL.md`
const RADIO_TS = `${REPO}/Website/src/data/radio.ts`
const CAST_JSON = `${REPO}/scripts/cast.json`
const EPISODE_DIR = `${REPO}/Website/src/data/radio`

const EXISTING_CAST = [
  'ronnie', 'barry', 'rhonda', 'todd',
  'caller-steve', 'caller-gary', 'caller-linda', 'caller-chad', 'caller-mildred',
  'caller-darnell', 'caller-patricia', 'caller-winston', 'caller-kim',
  'caller-frank', 'caller-chen', 'caller-phil', 'caller-sal', 'cat', 'cat-loud',
  'caller-bg', 'phone',
].join(', ')

const CANONICAL_REF = `${EPISODE_DIR}/villain-hour.json`
const REF_NOTE = `Study shipped episodes as a craft reference for line rhythm, overlap usage,
running-gag builds, and how the button lands (do NOT reuse their premises or slugs).
- REQUIRED: Read ${CANONICAL_REF} — the canonical "funny" reference.
- Then list ${EPISODE_DIR} (Glob "*.json", ignore the many "ad-*" spots) and Read 2-4 more
  *episode* files whose tone/structure is closest to your angle.`

const RULES = `
This is an OmniVoice MULTITRACK episode (3-6 distinct voices, GTA-style call-in comedy).
AUTHOR ONLY these fields per line: "speaker", "text", "overlap". Set "timestamp": 0,
"duration": 0, omit "audio" (the generator fills those).

HARD pronunciation rules (text is sent VERBATIM to TTS):
- NEVER use em-dashes (— or --). OmniVoice reads "—" as the word "euro". Use "..." or a comma.
- NEVER use nonverbal tokens like (gasps)/(sighs)/(laughs) — OmniVoice reads them ALOUD literally.
- No raw URLs (say "snazzie dot space"). Spell acronyms ("F B I"). File is UTF-8.
- Pause token: "<p>" = 0.5s silence, "<p:0.3>" = 0.3s. Use before a punchline.

Comedy + cadence:
- 3-act arc: calm -> unease -> agitation/near-panic, shown in the text.
- VARY line length hard: interleave 1-2 word zingers with 8-9s rants.
- Overlap (seconds between adjacent SPEECH): 0 -> 0.15s gap; negative -> bigger gap (the anchor/
  host, calm); positive +0.25..+0.4 -> talk-over (agitated callers). Contrast anchor vs chaos —
  do NOT give everyone the same overlap.
- A reaction to the LAST WORD of the prior line must use overlap <= 0. Positive overlap only for
  cut-ins over the start/middle of a line.
- One running gag with a build, paid off at the end. One verbal tic per character.
- Rapid-fire overlapping climax (+0.4 one-beat lines), then a dry button (ideally a callback).
- ADDRESS THE RIGHT PERSON: a named line must name whoever it's replying to (usually the line
  above). Re-check every name.

speaker values MUST be cast ids. Existing ids: ${EXISTING_CAST}.
New characters are allowed but must be registered in cast.json AND radio.ts CAST (Wire phase).`

const PART2 = `PART-2 POTENTIAL (required): write the episode so it can spawn a sequel. The button
should LAND as a joke but leave one thread deliberately unresolved (an escalation that isn't
settled, a character who storms off, a reveal that opens a bigger question). Provide a one-line
"part2Seed": the hook a Part 2 would pick up. Do NOT end on a clean full resolution.`

// args: number => count, or { count, theme }
let count = 10
let theme = null
if (typeof args === 'number') count = args
else if (args && typeof args === 'object') {
  if (Number.isInteger(args.count)) count = args.count
  if (typeof args.theme === 'string' && args.theme.trim()) theme = args.theme.trim()
}
count = Math.max(1, Math.min(count, 20))
const POOL = count + 4

// ---------------------------------------------------------------------------
const CONCEPT_SCHEMA = {
  type: 'object',
  required: ['slug', 'title', 'premise', 'cast', 'runningGag', 'button', 'part2Seed'],
  properties: {
    slug: { type: 'string', description: 'kebab-case, unique, no leading "ad-"' },
    title: { type: 'string' },
    premise: { type: 'string', description: '2-3 sentences: the call-in topic and why it escalates' },
    cast: {
      type: 'array', description: '3-6 speakers',
      items: {
        type: 'object', required: ['speaker', 'role', 'tic'],
        properties: {
          speaker: { type: 'string' }, role: { type: 'string' }, tic: { type: 'string' },
        },
      },
    },
    runningGag: { type: 'string' },
    button: { type: 'string' },
    part2Seed: { type: 'string', description: 'the unresolved thread a Part 2 would pick up' },
  },
}

const SELECT_SCHEMA = {
  type: 'object',
  required: ['chosen'],
  properties: {
    chosen: { type: 'array', items: { type: 'string', description: 'slug' } },
    note: { type: 'string' },
  },
}

const DRAFT_SCHEMA = {
  type: 'object',
  required: ['slug', 'title', 'filePath', 'speakers', 'lineCount', 'newSpeakers'],
  properties: {
    slug: { type: 'string' }, title: { type: 'string' }, filePath: { type: 'string' },
    speakers: { type: 'array', items: { type: 'string' } },
    lineCount: { type: 'integer' },
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
// Phase 1 — over-generate concepts.
// ---------------------------------------------------------------------------
phase('Concept')
const ANGLES = [
  'a mundane bureaucratic process escalating into cosmic dread',
  'a local-business or neighbor feud spiralling on air',
  'a "helpful" new product/technology that is transparently sinister',
  'a nature/animal/weather event covered as urgent breaking news',
  'a community institution (HOA, PTA, church bake sale) with a dark underbelly',
  'a self-help / wellness craze that is obviously a cult',
  'an infrastructure failure (power, water, traffic) nobody will take blame for',
  'a beloved local tradition that has quietly gone horribly wrong',
]
const themeLine = theme
  ? `All concepts MUST fit this theme: "${theme}". Bend your angle to it.`
  : 'No fixed theme.'

const pool = (await parallel(Array.from({ length: POOL }, (_, i) => () =>
  agent(
    `Pitch ONE concept for a new Snazzie FM radio episode.
${themeLine}
Your assigned comedic angle (#${i}): ${ANGLES[i % ANGLES.length]}. Make it distinct from the other
angles — a unique premise, slug, and cast mix.

First Read the craft skill: ${SKILL}
Read ${RADIO_TS} so you do NOT duplicate an existing episode's premise or slug; reuse fitting
existing cast ids where natural. Existing cast ids: ${EXISTING_CAST}.
${REF_NOTE}

${RULES}

${PART2}

Return one tight, genuinely funny concept with a unique kebab-case slug.`,
    { label: `concept:${i}`, phase: 'Concept', schema: CONCEPT_SCHEMA },
  ),
))).filter(Boolean)

// dedup by slug
const seen = new Set()
const concepts = []
for (const c of pool) {
  if (!seen.has(c.slug)) { seen.add(c.slug); concepts.push(c) }
}
log(`${concepts.length} unique concepts pitched (pool ${POOL})`)

// ---------------------------------------------------------------------------
// Phase 2 — curator selects the best N.
// ---------------------------------------------------------------------------
phase('Select')
let chosen = concepts.slice(0, count)
if (concepts.length > count) {
  const menu = concepts.map(c =>
    `[${c.slug}] ${c.title} :: ${c.premise} (gag: ${c.runningGag}; part2: ${c.part2Seed})`,
  ).join('\n')
  const sel = await agent(
    `You are the Snazzie FM showrunner picking the strongest ${count} episode concepts to produce
from this pool of ${concepts.length}. Optimise for: funniest, freshest (not retreads of each other
or of existing episodes), strongest part-2 potential, and VARIETY of premise/cast across the slate
(don't pick five feud episodes). Return exactly ${count} slugs.

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
// Phase 3 — per-episode pipeline: draft -> critique -> revise (parallel).
// ---------------------------------------------------------------------------
phase('Produce')
const produced = (await pipeline(
  chosen,
  // stage 1: draft + save file
  (concept) => agent(
    `Write the FULL episode JSON for this concept and SAVE it to ${EPISODE_DIR}/<slug>.json.

CONCEPT:
${JSON.stringify(concept, null, 2)}

Steps:
1. Read ${SKILL} in full. ${REF_NOTE}
2. List ${EPISODE_DIR} and confirm "${concept.slug}" isn't taken; if it is, pick a close unused
   kebab-case slug.
3. Write 18-30 lines: real 3-act escalation, varied line lengths, a running gag with payoff, a
   rapid-fire overlapping climax, and a dry callback button that STILL leaves the part-2 thread
   open ("${concept.part2Seed}").
4. Each line: { "speaker", "text", "overlap", "timestamp": 0, "duration": 0 }. No "audio" key.
5. Top-level fields: "slug", "title", "description", "lines". Save with Write.

${RULES}

${PART2}

Return slug, title, absolute filePath, speaker ids used, line count, and newSpeakers (any speaker
id NOT in: ${EXISTING_CAST}) with id/name/hex color/role/voiceNotes.`,
    { label: `draft:${concept.slug}`, phase: 'Produce', schema: DRAFT_SCHEMA },
  ),
  // stage 2: combined critique (one agent, all four lenses)
  (draft) => draft && agent(
    `Adversarially review the episode JSON at ${draft.filePath}. Check ALL of:
- TTS-safety (BLOCKERS): em-dashes (— / --), nonverbal tokens (gasps)/(sighs)/(laughs), raw URLs,
  unspelled acronyms, non-UTF8 garbage. OmniVoice voices these literally/wrong.
- Comedy: varied line length, a real running gag with payoff, a rapid-fire climax, a dry callback
  button, distinct per-character tics. Flag flat/uniform stretches.
- Name/character: every named line names whoever it replies to (usually the line above); each
  character stays in voice.
- Overlap/pacing: anchor/host negative, agitated callers positive (+0.25..+0.4); reactions to the
  LAST WORD use overlap <= 0; no speaker talks over their own earlier line; not everyone on one
  overlap value.
Then EDIT the file in place to fix every blocker and major and any clear minor. Keep timestamp/
duration at 0 and no "audio" key. Preserve the concept, voices, gag, and the open part-2 thread.
Re-verify no em-dashes / nonverbals remain. Reference: ${SKILL}. Report what you changed.`,
    { label: `polish:${draft.slug}`, phase: 'Produce', schema: DONE_SCHEMA },
  ),
)).filter(Boolean)

// produced[i] is the critique result; recover the drafts (pipeline returns last stage).
// Re-collect drafts: stage 1 results aren't returned by pipeline, so track via chosen + filePath.
// Simpler: the wire phase reads the files; we just need slug + newSpeakers, which the drafts had.
// Pipeline only returns the LAST stage, so capture drafts separately below.

// ---------------------------------------------------------------------------
// We need the draft metadata (newSpeakers etc.) for wiring. pipeline() returned
// only the critique stage, so re-derive by reading each chosen slug's file in Wire.
// ---------------------------------------------------------------------------
phase('Wire')
const slugList = chosen.map(c => c.slug).join(', ')
const wire = await agent(
  `Register ${chosen.length} new episodes so the site loads them. Their JSON files are in
${EPISODE_DIR}. The slugs (some may have been re-slugged on collision — list the dir to confirm
the actual new files, they are the *.json that aren't in the current radio.ts imports):
${slugList}

For EACH new episode:
1. Read its JSON to get the title and every distinct "speaker" id.
2. Any speaker id NOT already in the CAST map of ${RADIO_TS} is NEW. For each new id:
   - Add it to the CAST map in ${RADIO_TS} ({ id, name, color (hex), role }).
   - Add it to ${CAST_JSON} with a voice config (name, color, role, instruct using ONLY OmniVoice's
     fixed vocab, speed, phone_filter: true for callers, ref_audio, ref_text). Mirror a similar
     existing character's ref_audio/ref_text if no dedicated ref exists, and add a "_note" saying
     so. Follow existing entries' shape and the voice rules in ${SKILL}.
3. In ${RADIO_TS}: add an import for "./radio/<slug>.json" (camelCase var) near the other episode
   imports, and add episodeFrom(<var>) to the EPISODES array. Do this for all ${chosen.length}.
4. Do NOT touch ADS / MUSIC_TRACKS / BLUNDER arrays.

Work carefully and sequentially so edits to ${RADIO_TS} and ${CAST_JSON} don't clobber each other.
Reference: ${SKILL}. Report each episode wired and any cast needing a real voice ref later.`,
  { phase: 'Wire', schema: DONE_SCHEMA },
)
log(`wire: ${wire?.summary ?? 'failed'}`)

// ---------------------------------------------------------------------------
// Phase 5 — build verify (audio renders separately, batched, afterwards).
// ---------------------------------------------------------------------------
phase('Verify')
const verify = await agent(
  `Verify the site still builds after wiring ${chosen.length} new episodes.
Run: cd ${REPO}/Website && bun run build
Report whether it passed and quote any error verbatim. (Audio has NOT been rendered yet — that's a
separate batched step; the build does not need the clips.)`,
  { phase: 'Verify', schema: DONE_SCHEMA },
)

return {
  requested: count,
  produced: produced.length,
  slugs: chosen.map(c => c.slug),
  concepts: chosen.map(c => ({ slug: c.slug, title: c.title, part2Seed: c.part2Seed })),
  wired: wire?.ok ?? false,
  wireSummary: wire?.summary,
  buildPassed: verify?.ok ?? false,
  buildNotes: verify?.details ?? verify?.summary,
  renderCommand: `python scripts/generate-radio.py ${chosen.map(c => c.slug).join(' ')}`,
}
