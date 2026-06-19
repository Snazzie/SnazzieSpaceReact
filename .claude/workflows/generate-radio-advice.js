export const meta = {
  name: 'generate-radio-advice',
  description: 'Generate N Snazzie FM "advice show" episodes: the host reads listener-submitted problems and dispenses confidently useless, self-serving, or wrong advice. Over-generate concepts across advice domains, select the best N, draft/critique/revise/wire each; audio renders separately.',
  whenToUse: 'When you want advice-segment episodes (host answers listener letters/voicemails with bad advice). args = a number (count, default 10).',
  phases: [
    { title: 'Concept', detail: 'one concept per advice domain (relationships, money, pets, ...)' },
    { title: 'Select', detail: 'curator picks the best N for variety + funniest bad advice' },
    { title: 'Produce', detail: 'per episode pipeline: draft -> combined critique -> revise (parallel)' },
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

// TWO HOSTS ONLY. No callers on these episodes — the hosts read the listener
// submissions aloud. ronnie = host who reads + answers, barry = co-host who punctures.
const EXISTING_CAST = ['ronnie', 'barry'].join(', ')

const CANONICAL_REF = `${EPISODE_DIR}/villain-hour.json`
const REF_NOTE = `Read the canonical "funny" reference once: ${CANONICAL_REF} (for line rhythm + overlap craft).`

// The format brief — what makes this an ADVICE episode and not a call-in brawl.
const FORMAT = `FORMAT — THE ADVICE SHOW (TWO HOSTS ONLY):
Ronnie hosts an advice segment and answers listener-submitted problems with confidently TERRIBLE
advice. The comedy is the GAP between a real, sympathetic problem and Ronnie's useless answer.
- LENGTH: ONE MINUTE MAX. These are tight ~45-60s spots, roughly 8-14 short lines, ~120-150 words
  TOTAL. Cut anything that doesn't earn its place. Better to do 2 sharp segments than 4 flabby ones.
- ONLY TWO SPEAKERS: "ronnie" (host) and "barry" (co-host). NO callers, NO caller-* voices, no SFX
  voices. Every line is ronnie or barry.
- STRUCTURE: one quick intro line, then 2-3 fast advice SEGMENTS. Close on a dry button.
- THE SUBMISSIONS ARE READ ALOUD BY THE HOSTS — there is no caller on the line. Ronnie (or Barry)
  reads each listener's letter/email/voicemail transcript verbatim: "Carol from the marina writes,
  quote, ..." Give each submitter a NAME and a genuine, relatable problem, but it is RONNIE'S VOICE
  reading it, not a caller. Vary who reads (mostly Ronnie; let Barry read one or two).
- THE BAD ADVICE: Ronnie answers with total confidence and zero usefulness. Modes to rotate:
  misreads the problem entirely; gives advice that makes it worse; turns it into a plug for a
  sponsor or himself; projects his own unrelated issues; answers a different question; dangerous-
  but-cheerful. He NEVER realises it's bad.
- BARRY (co-host) interjects: mild alarm, a feeble fact-check Ronnie steamrolls, reads a letter, or
  gets talked into agreeing. He is the only puncture — use him to react, since there's no caller.
- RUNNING GAG: Ronnie has ONE pet solution he applies to every unrelated problem (e.g. "have you
  tried selling it?", "that's a sauna problem", "name it and bill it"). Escalate it; pay it off on
  the last segment.
- ARC: advice starts almost-plausible, gets steadily, obviously worse; final segment is unhinged.
- BUTTON: a dry Barry tag, or Ronnie reading a new letter from someone who took last week's advice
  and reports the fallout (still read aloud by the host, not a caller).`

const RULES = `
OmniVoice MULTITRACK episode. AUTHOR ONLY per line: "speaker", "text", "overlap". Set "timestamp": 0,
"duration": 0, omit "audio".

HARD pronunciation rules (text sent VERBATIM to TTS):
- NEVER em-dashes (— / --) — read as "euro". Use "..." or commas.
- NEVER nonverbals (gasps)/(sighs)/(laughs) — read aloud literally.
- No raw URLs. Spell acronyms. UTF-8. Pause token "<p>"/"<p:0.3>".

Cadence + comedy:
- VARY line length: a listener's anxious run-on, then Ronnie's blithe one-liner, etc.
- Overlap: Ronnie (host/anchor) mostly negative/calm; an agitated or interrupting caller positive
  (+0.25..+0.4). A reaction to the LAST WORD of the prior line uses overlap <= 0.
- ADDRESS THE RIGHT PERSON: a named line names whoever it replies to (usually the line above).
- One verbal tic per host; <p:0.3> before a punchline.

speaker MUST be only "ronnie" or "barry" — no other ids, no callers. (Both already exist in CAST,
so there are NO new speakers and NO cast.json changes for these episodes.)`

let count = 10
if (typeof args === 'number') count = args
else if (args && typeof args === 'object' && Number.isInteger(args.count)) count = args.count
count = Math.max(1, Math.min(count, 16))
const POOL = count + 4

// ---------------------------------------------------------------------------
const CONCEPT_SCHEMA = {
  type: 'object',
  required: ['slug', 'title', 'domain', 'premise', 'petSolution', 'segments', 'button'],
  properties: {
    slug: { type: 'string', description: 'kebab-case, unique, no leading "ad-"' },
    title: { type: 'string', description: 'an advice-show name, e.g. "Ronnie Knows Best"' },
    domain: { type: 'string', description: 'the advice area (relationships, money, pets, ...)' },
    premise: { type: 'string' },
    petSolution: { type: 'string', description: "Ronnie's one bad solution he applies to everything" },
    segments: {
      type: 'array', description: '2-3 listener problems + the bad advice angle (1-min episode, keep it tight)',
      items: {
        type: 'object', required: ['submitter', 'problem', 'badAdvice'],
        properties: {
          submitter: { type: 'string', description: "listener's name the host reads out (NOT a voice; no caller)" },
          problem: { type: 'string' },
          badAdvice: { type: 'string', description: 'how Ronnie answers uselessly' },
        },
      },
    },
    button: { type: 'string' },
  },
}
const SELECT_SCHEMA = {
  type: 'object', required: ['chosen'],
  properties: { chosen: { type: 'array', items: { type: 'string' } }, note: { type: 'string' } },
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
phase('Concept')
const DOMAINS = [
  'relationships and dating', 'money and debt', 'parenting and kids', 'pets and animals',
  'career and the workplace', 'neighbors and the HOA', 'health and the body', 'home repair / DIY',
  'cooking and food', 'technology and gadgets', 'legal and bureaucratic trouble', 'grief and big life changes',
]
const pool = (await parallel(Array.from({ length: POOL }, (_, i) => () =>
  agent(
    `Pitch ONE concept for a Snazzie FM ADVICE SHOW episode. Assigned advice domain (#${i}):
${DOMAINS[i % DOMAINS.length]}. Ronnie answers listener problems in this domain with confidently
useless advice. Make it distinct: a unique show title, slug, and a memorable pet "solution".

Read the craft skill: ${SKILL}. Read ${RADIO_TS} so you do not duplicate an existing slug. ${REF_NOTE}

${FORMAT}

${RULES}

Return one concept: slug, an advice-show title, the domain, premise, Ronnie's pet bad solution,
3-5 segments (each: the submitter's NAME the host reads out, their genuine problem, and the useless
advice angle), and a dry button. Remember: only Ronnie and Barry speak; submissions are read aloud.`,
    { label: `concept:${i}`, phase: 'Concept', schema: CONCEPT_SCHEMA },
  ),
))).filter(Boolean)

const seen = new Set()
const concepts = []
for (const c of pool) { if (!seen.has(c.slug)) { seen.add(c.slug); concepts.push(c) } }
log(`${concepts.length} unique advice concepts (pool ${POOL})`)

// ---------------------------------------------------------------------------
phase('Select')
let chosen = concepts.slice(0, count)
if (concepts.length > count) {
  const menu = concepts.map(c => `[${c.slug}] ${c.title} (${c.domain}) :: pet-fix: ${c.petSolution}; ${c.segments.length} segments`).join('\n')
  const sel = await agent(
    `Pick the strongest ${count} advice-show concepts from this pool of ${concepts.length}. Optimise
for: funniest bad-advice gap, freshest pet-solution gag, and VARIETY across advice domains. Return
exactly ${count} slugs.

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
    `Write the FULL advice-show episode JSON for this concept and SAVE it to ${EPISODE_DIR}/<slug>.json.

CONCEPT:
${JSON.stringify(concept, null, 2)}

Steps:
1. Read ${SKILL} in full. ${REF_NOTE}
2. List ${EPISODE_DIR} and confirm "${concept.slug}" isn't taken; if it is, pick a close unused slug.
3. Write a ONE-MINUTE-MAX episode: ~8-14 short lines, ~120-150 words total. One quick intro line,
   then 2-3 fast advice segments. In each, the HOST READS the listener's letter aloud ("Carol from
   the marina writes, quote, ..."), then Ronnie answers uselessly, Barry optionally puncturing in a
   line or two. Escalate the pet-solution gag; end on a dry callback button. Keep every line short
   and load-bearing. ONLY "ronnie" and "barry" speak — no callers.
4. Each line: { "speaker", "text", "overlap", "timestamp": 0, "duration": 0 }. No "audio" key.
5. Top-level fields: "slug", "title", "description", "category": "advice", "lines". Save with Write.

${FORMAT}

${RULES}

Return slug, title, absolute filePath, speaker ids used (must be only ronnie/barry), line count, and
newSpeakers (MUST be empty — these episodes add no new cast).`,
    { label: `draft:${concept.slug}`, phase: 'Produce', schema: DRAFT_SCHEMA },
  ),
  (draft) => draft && agent(
    `Adversarially review the advice-show episode JSON at ${draft.filePath}. Check ALL of:
- TWO VOICES ONLY (BLOCKER): every line's "speaker" is exactly "ronnie" or "barry". If ANY other id
  appears (a caller-*, a submitter voiced directly, anything else), that's a blocker: rewrite that
  line so the HOST reads the submission aloud instead. There are no callers on this show.
- LENGTH (ONE MINUTE MAX): ~8-14 short lines, ~120-150 words total. If it's longer/flabby, CUT it
  down — drop weak segments, tighten long lines. 2-3 segments only.
- FORMAT: is it actually an advice show? The host READS listener letters aloud, then Ronnie answers;
  the comedy is the gap between a real problem and useless advice; 2-3 segments; a pet-solution gag
  that escalates and pays off; a dry button. Flag advice that is just mean rather than uselessly
  confident, or a submitter problem that isn't relatable.
- TTS-safety (BLOCKERS): em-dashes (— / --), nonverbal tokens (gasps)/(sighs)/(laughs), raw URLs,
  unspelled acronyms, non-UTF8.
- Cadence: varied line length, distinct caller voices, <p:0.3> before punchlines.
- Name/character: every named line names whoever it replies to; Ronnie stays confident-clueless,
  Barry stays the feeble puncturer.
- Overlap/pacing: Ronnie mostly calm/negative; agitated callers positive; last-word reactions <= 0;
  no speaker talks over their own earlier line.
EDIT the file in place to fix every blocker and major and clear minors. Keep timestamp/duration 0
and no "audio" key. Re-verify no em-dashes / nonverbals remain. Reference: ${SKILL}. Report changes.`,
    { label: `polish:${draft.slug}`, phase: 'Produce', schema: DONE_SCHEMA },
  ),
)).filter(Boolean)

// ---------------------------------------------------------------------------
phase('Wire')
const slugList = chosen.map(c => c.slug).join(', ')
const wire = await agent(
  `Register ${chosen.length} new advice-show episodes so the site loads them. Their JSON files are in
${EPISODE_DIR}. Expected slugs (confirm by listing the dir, a draft may have re-slugged):
${slugList}

For EACH new episode:
1. Read its JSON for the title and every distinct "speaker" id.
2. Any speaker id NOT already in the CAST map of ${RADIO_TS} is NEW (should be rare; these reuse
   Ronnie/Barry + existing callers). For each new id: add to the CAST map in ${RADIO_TS}
   ({ id, name, color (hex), role }) AND to ${CAST_JSON} with a voice config (instruct from
   OmniVoice's fixed vocab only, speed, phone_filter true for callers, ref_audio, ref_text); mirror
   a similar existing character's ref if none exists and add a "_note".
3. In ${RADIO_TS}: add an import for "./radio/<slug>.json" (camelCase var) near the other episode
   imports, and add episodeFrom(<var>) to the EPISODES array.
4. Do NOT touch ADS / MUSIC_TRACKS / BLUNDER arrays.

Work sequentially so edits to ${RADIO_TS}/${CAST_JSON} don't clobber each other. Reference: ${SKILL}.
Report each episode wired and any cast needing a real voice ref later.`,
  { phase: 'Wire', schema: DONE_SCHEMA },
)
log(`wire: ${wire?.summary ?? 'failed'}`)

// ---------------------------------------------------------------------------
phase('Verify')
const verify = await agent(
  `Verify the site builds after wiring ${chosen.length} new advice episodes.
Run: cd ${REPO}/Website && bun run build
Report pass/fail and quote any error verbatim. (Audio renders separately; build doesn't need clips.)`,
  { phase: 'Verify', schema: DONE_SCHEMA },
)

return {
  requested: count,
  produced: produced.length,
  slugs: chosen.map(c => c.slug),
  episodes: chosen.map(c => ({ slug: c.slug, title: c.title, domain: c.domain, petSolution: c.petSolution })),
  wired: wire?.ok ?? false,
  wireSummary: wire?.summary,
  buildPassed: verify?.ok ?? false,
  buildNotes: verify?.details ?? verify?.summary,
  renderCommand: `python scripts/generate-radio.py ${chosen.map(c => c.slug).join(' ')}`,
}
