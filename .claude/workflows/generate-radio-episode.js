export const meta = {
  name: 'generate-radio-episode',
  description: 'Generate a Snazzie FM radio episode end-to-end: concept tournament, draft, adversarial critique, revise, wire into radio.ts, render audio + build-verify',
  whenToUse: 'When you want a brand-new multi-voice OmniVoice radio episode authored, wired, and rendered. Pass a theme/premise string as args (optional — agents free-pick if omitted).',
  phases: [
    { title: 'Concept', detail: '4 agents pitch diverse premises from distinct comedic angles' },
    { title: 'Judge', detail: '3-judge panel scores concepts; JS aggregates and picks the winner' },
    { title: 'Draft', detail: 'one agent writes the episode JSON following the radio-episodes craft rules' },
    { title: 'Critique', detail: '4 adversarial lenses: comedy-craft, TTS-safety, name/character correctness, overlap/pacing' },
    { title: 'Revise', detail: 'one agent applies the surviving findings to the JSON' },
    { title: 'Wire', detail: 'register new cast in cast.json + radio.ts, import + add to EPISODES' },
    { title: 'Render', detail: 'python generate-radio.py <slug> then bun run build' },
  ],
}

// ---------------------------------------------------------------------------
// Constants the agents need. Embedded so agents don't have to rediscover them.
// ---------------------------------------------------------------------------
const REPO = 'C:/Users/acoop/Documents/GitHub/SnazzieSpaceReact'
const SKILL = `${REPO}/.claude/skills/radio-episodes/SKILL.md`
const RADIO_TS = `${REPO}/Website/src/data/radio.ts`
const CAST_JSON = `${REPO}/scripts/cast.json`
const EPISODE_DIR = `${REPO}/Website/src/data/radio`

// Reference: study shipped episodes for craft (NOT to copy premises from).
// villain-hour is the skill's canonical "funny" reference and is REQUIRED reading;
// the rest of the catalogue is a menu the agent samples by relevance to its angle.
const CANONICAL_REF = `${EPISODE_DIR}/villain-hour.json`
const REF_NOTE = `Study shipped episodes as a craft reference for line rhythm, overlap usage,
running-gag builds, and how the button lands (do NOT reuse their premises or slugs).
- REQUIRED: Read ${CANONICAL_REF} — the canonical "funny" reference.
- Then list ${EPISODE_DIR} (Glob "*.json", ignore the many "ad-*" spots) and Read 2-4 more
  *episode* files whose tone/structure is closest to your angle. ~11 episodes ship; sample
  the relevant ones rather than all of them.`

// Cast ids that already exist in CAST (radio.ts). Anything else a script invents
// is a "new speaker" and must be added to BOTH cast.json and radio.ts CAST.
const EXISTING_CAST = [
  'ronnie', 'barry', 'rhonda', 'todd',
  'caller-steve', 'caller-gary', 'caller-linda', 'caller-chad', 'caller-mildred',
  'caller-darnell', 'caller-patricia', 'caller-winston', 'caller-kim',
  'caller-frank', 'caller-chen', 'cat', 'cat-loud', 'caller-bg', 'phone',
].join(', ')

// Condensed craft rules. The full rules live in SKILL.md (agents must Read it),
// but these are the ones that most often get violated.
const RULES = `
This is an OmniVoice MULTITRACK episode (3-6 distinct voices, GTA-style call-in comedy).
AUTHOR ONLY these fields per line: "speaker", "text", "overlap". Set "timestamp": 0,
"duration": 0, omit "audio" (the generator fills those).

HARD pronunciation rules (text is sent VERBATIM to TTS):
- NEVER use em-dashes (— or --). OmniVoice reads "—" as the word "euro". Use "..." or a comma.
- NEVER use nonverbal tokens like (gasps)/(sighs)/(laughs) — OmniVoice reads them ALOUD literally.
  Convey the sigh/laugh in wording instead ("Ohhh boy.", "Hah.").
- No raw URLs (say "snazzie dot space"). Spell acronyms ("F B I"). File is UTF-8.
- Pause token: "<p>" = 0.5s silence, "<p:0.3>" = 0.3s. Use before a punchline.

Comedy + cadence:
- Build a 3-act arc: calm -> unease -> agitation/near-panic. Show it in the text
  (interjections + ellipses early; caps, "!", repetition late).
- VARY line length hard: interleave 1-2 word zingers with 8-9s rants.
- Overlap (seconds between adjacent SPEECH): 0 -> 0.15s gap; negative -> bigger gap (calm,
  the host/anchor); positive +0.25..+0.4 -> talk-over (agitated callers). Contrast anchor
  (negative) vs chaos (positive) — do NOT give everyone the same overlap.
- A reaction to the LAST WORD of the previous line must use overlap <= 0 (can't react before
  the word is spoken). Reserve positive overlap for cut-ins over the start/middle of a line.
- One running gag with a build, paid off at the end. One verbal tic per character.
- Rapid-fire overlapping climax (+0.4 one-beat lines), then a dry button — ideally a callback.
- ADDRESS THE RIGHT PERSON: if a line names someone, it must name whoever it's replying to
  (usually the previous speaker). Re-check every name against the line above it.
- Stay in character; emotion comes through text, not config.

speaker values MUST be cast ids. Existing ids: ${EXISTING_CAST}.
New characters are allowed but must be registered in cast.json AND radio.ts CAST (Wire phase).
`

const theme = (typeof args === 'string' && args.trim()) ? args.trim() : null

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------
const CONCEPT_SCHEMA = {
  type: 'object',
  required: ['slug', 'title', 'premise', 'cast', 'arc', 'runningGag', 'button'],
  properties: {
    slug: { type: 'string', description: 'kebab-case, unique, no leading "ad-"' },
    title: { type: 'string' },
    premise: { type: 'string', description: '2-3 sentences: the call-in topic and why it escalates' },
    cast: {
      type: 'array',
      description: '3-6 speakers',
      items: {
        type: 'object',
        required: ['speaker', 'role', 'tic'],
        properties: {
          speaker: { type: 'string', description: 'cast id; reuse existing where it fits' },
          role: { type: 'string' },
          tic: { type: 'string', description: 'one identifiable verbal tic' },
        },
      },
    },
    arc: { type: 'string', description: 'the 3-act escalation in one line' },
    runningGag: { type: 'string' },
    button: { type: 'string', description: 'the dry callback line that closes it' },
  },
}

const RANK_SCHEMA = {
  type: 'object',
  required: ['scores'],
  properties: {
    scores: {
      type: 'array',
      description: 'one entry per concept, in the order given',
      items: {
        type: 'object',
        required: ['index', 'funny', 'fresh', 'feasible', 'note'],
        properties: {
          index: { type: 'integer' },
          funny: { type: 'integer', description: '1-10' },
          fresh: { type: 'integer', description: '1-10, not a retread of existing episodes' },
          feasible: { type: 'integer', description: '1-10, renders well in OmniVoice multitrack' },
          note: { type: 'string' },
        },
      },
    },
  },
}

const DRAFT_SCHEMA = {
  type: 'object',
  required: ['slug', 'title', 'filePath', 'speakers', 'lineCount', 'newSpeakers'],
  properties: {
    slug: { type: 'string' },
    title: { type: 'string' },
    filePath: { type: 'string' },
    speakers: { type: 'array', items: { type: 'string' } },
    lineCount: { type: 'integer' },
    newSpeakers: {
      type: 'array',
      description: 'speakers NOT already in CAST that need registering',
      items: {
        type: 'object',
        required: ['id', 'name', 'color', 'role'],
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          color: { type: 'string', description: 'hex' },
          role: { type: 'string', enum: ['Host', 'Co-Host', 'Guest Expert', 'Intern', 'Caller'] },
          voiceNotes: { type: 'string', description: 'cast.json voice guidance: gender, accent, pitch, speed' },
        },
      },
    },
  },
}

const CRITIQUE_SCHEMA = {
  type: 'object',
  required: ['lens', 'findings'],
  properties: {
    lens: { type: 'string' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        required: ['severity', 'where', 'issue', 'fix'],
        properties: {
          severity: { type: 'string', enum: ['blocker', 'major', 'minor'] },
          where: { type: 'string', description: 'line index or text snippet' },
          issue: { type: 'string' },
          fix: { type: 'string' },
        },
      },
    },
  },
}

const DONE_SCHEMA = {
  type: 'object',
  required: ['ok', 'summary'],
  properties: {
    ok: { type: 'boolean' },
    summary: { type: 'string' },
    details: { type: 'string' },
  },
}

// ---------------------------------------------------------------------------
// Phase 1 — Concept tournament. 4 distinct comedic angles.
// ---------------------------------------------------------------------------
phase('Concept')
const ANGLES = [
  'a mundane bureaucratic process that escalates into cosmic dread',
  'a local-business or neighbor feud that spirals out of control on air',
  'a "helpful" new product/technology that is transparently sinister',
  'a nature/animal/weather event covered as urgent breaking news',
]
const themeLine = theme
  ? `The episode MUST be about this theme: "${theme}". Bend your angle to fit it.`
  : 'No fixed theme — invent something fresh.'

const concepts = (await parallel(ANGLES.map((angle, i) => () =>
  agent(
    `You are pitching ONE concept for a new Snazzie FM radio episode.
${themeLine}
Your assigned comedic angle: ${angle}.

First Read the craft skill: ${SKILL}
Also Read ${RADIO_TS} so you do NOT duplicate an existing episode's premise or slug, and so
you reuse fitting existing cast ids (see CAST). Existing cast ids: ${EXISTING_CAST}.

${REF_NOTE}

${RULES}

Return a single tight, genuinely funny concept. Pick a unique kebab-case slug.`,
    { label: `concept:${i}`, phase: 'Concept', schema: CONCEPT_SCHEMA },
  ),
))).filter(Boolean)

if (!concepts.length) throw new Error('no concepts produced')
log(`${concepts.length} concepts pitched`)

// ---------------------------------------------------------------------------
// Phase 2 — Judge panel. 3 judges each score every concept; aggregate in JS.
// ---------------------------------------------------------------------------
phase('Judge')
const conciseConcepts = concepts.map((c, i) =>
  `#${i} [${c.slug}] ${c.title}\n   premise: ${c.premise}\n   gag: ${c.runningGag}\n   button: ${c.button}`,
).join('\n\n')

const panels = (await parallel([0, 1, 2].map(j => () =>
  agent(
    `You are judge ${j} on a 3-person panel picking the best Snazzie FM episode concept to produce.
Score EACH concept below 1-10 on: funny (does it land), fresh (not a retread), feasible
(renders well as OmniVoice multitrack call-in comedy — see ${SKILL}).
Be discriminating; do not give everything 8s.

Concepts:
${conciseConcepts}`,
    { label: `judge:${j}`, phase: 'Judge', schema: RANK_SCHEMA },
  ),
))).filter(Boolean)

// Aggregate: sum (funny*1.2 + fresh + feasible) across judges per concept index.
const totals = concepts.map(() => 0)
for (const p of panels) {
  for (const s of p.scores) {
    if (s.index >= 0 && s.index < totals.length) {
      totals[s.index] += s.funny * 1.2 + s.fresh + s.feasible
    }
  }
}
let bestIndex = 0
for (let i = 1; i < totals.length; i++) if (totals[i] > totals[bestIndex]) bestIndex = i
const winner = concepts[bestIndex]
log(`winner: [${winner.slug}] ${winner.title} (score ${totals[bestIndex].toFixed(1)})`)

// ---------------------------------------------------------------------------
// Phase 3 — Draft the episode JSON file.
// ---------------------------------------------------------------------------
phase('Draft')
const draft = await agent(
  `Write the FULL episode JSON for this winning concept and SAVE it to ${EPISODE_DIR}/<slug>.json.

WINNING CONCEPT:
${JSON.stringify(winner, null, 2)}

Steps:
1. Read ${SKILL} in full — follow every craft rule.
   ${REF_NOTE}
2. List ${EPISODE_DIR} (Glob or ls) and confirm the slug "${winner.slug}" is NOT already taken;
   if it is, pick a close unused kebab-case slug.
3. Write a complete episode: 18-30 lines, real 3-act escalation, varied line lengths, a running
   gag with a payoff, a rapid-fire overlapping climax, and a dry callback button.
4. Each line: { "speaker", "text", "overlap", "timestamp": 0, "duration": 0 }. No "audio" key.
5. Use overlap signs deliberately (anchor negative, chaos positive). Re-check every name a line
   addresses against the previous line. NO em-dashes, NO (gasps)/(sighs), UTF-8.
6. Top-level fields: "slug", "title", "description", "lines".
7. Save the file with the Write tool.

${RULES}

Return the slug, title, absolute filePath, the list of speaker ids used, line count, and
newSpeakers = any speaker id NOT in this existing set: ${EXISTING_CAST}
(for each new one give id, a display name, a hex color, a role, and voiceNotes).`,
  { phase: 'Draft', schema: DRAFT_SCHEMA },
)
if (!draft) throw new Error('draft failed')
const slug = draft.slug
const filePath = draft.filePath
log(`drafted ${slug} — ${draft.lineCount} lines, ${draft.newSpeakers.length} new speakers`)

// ---------------------------------------------------------------------------
// Phase 4 — Adversarial critique across 4 lenses (parallel).
// ---------------------------------------------------------------------------
phase('Critique')
const LENSES = [
  { key: 'comedy-craft', brief: 'Is it actually funny and does it escalate? Check varied line length, a real running gag with payoff, a rapid-fire climax, a dry callback button, distinct per-character tics. Flag flat/uniform/staccato-robotic stretches.' },
  { key: 'tts-safety', brief: 'Scan every line\'s text for TTS hazards: em-dashes (— or --), "--", nonverbal tokens (gasps)/(sighs)/(laughs), raw URLs, unspelled acronyms, non-UTF8 garbage, brands that will mispronounce. These are BLOCKERS — OmniVoice voices them literally/wrong.' },
  { key: 'name-character', brief: 'For every line that names a person, verify it names whoever it is actually replying to (usually the previous speaker). Verify each character stays in voice. Flag misaddressed lines.' },
  { key: 'overlap-pacing', brief: 'Check overlap values: anchor/host negative, agitated callers positive (+0.25..+0.4). Flag reactions to the LAST WORD of the prior line that use positive overlap (must be <= 0). Flag a speaker talking over their own earlier line. Flag everyone sharing one overlap value.' },
]
const critiques = (await parallel(LENSES.map(l => () =>
  agent(
    `Adversarially review the episode JSON at ${filePath} through the "${l.key}" lens.
${l.brief}
Reference craft rules: ${SKILL}
Read the file, report concrete findings with the line index/snippet, the issue, and the exact fix.
Only report real problems — return an empty findings array if the lens is clean.`,
    { label: `critique:${l.key}`, phase: 'Critique', schema: CRITIQUE_SCHEMA },
  ),
))).filter(Boolean)

const allFindings = critiques.flatMap(c => c.findings.map(f => ({ lens: c.lens, ...f })))
const blockers = allFindings.filter(f => f.severity === 'blocker').length
log(`${allFindings.length} findings (${blockers} blockers)`)

// ---------------------------------------------------------------------------
// Phase 5 — Revise (only if there is something to fix).
// ---------------------------------------------------------------------------
phase('Revise')
if (allFindings.length) {
  const revise = await agent(
    `Apply these review findings to the episode JSON at ${filePath}. Fix all blockers and majors,
and minors where the fix clearly improves the episode. Preserve the concept, voice, and the
running gag — do not rewrite wholesale. Keep timestamp/duration at 0 and no "audio" key.
Re-verify NO em-dashes and NO nonverbal tokens remain after editing. Reference: ${SKILL}

FINDINGS:
${JSON.stringify(allFindings, null, 2)}

Save the edited file. Report what you changed.`,
    { phase: 'Revise', schema: DONE_SCHEMA },
  )
  log(`revise: ${revise?.summary ?? 'skipped'}`)
} else {
  log('no findings — skipping revise')
}

// ---------------------------------------------------------------------------
// Phase 6 — Wire into cast.json + radio.ts.
// ---------------------------------------------------------------------------
phase('Wire')
const wire = await agent(
  `Register the new episode "${slug}" (title "${draft.title}") so the site loads it.

1. ${draft.newSpeakers.length} NEW cast members to add (skip this step if zero):
${JSON.stringify(draft.newSpeakers, null, 2)}
   - Add each to ${CAST_JSON} with name, color, role, and a voice config (instruct/speed/
     phone_filter/ref_audio/ref_text). Follow the existing entries' shape and the voice rules in
     ${SKILL} (instruct uses ONLY OmniVoice's fixed vocab; callers get phone_filter: true).
     Use the voiceNotes as guidance. If an exact ref_audio is unknown, mirror a similar existing
     character's ref so it still renders, and note that in your summary.
   - Add each to the CAST map in ${RADIO_TS} ({ id, name, color, role }).
2. In ${RADIO_TS}: add an import for "./radio/${slug}.json" (camelCase var) near the other episode
   imports, and add episodeFrom(<var>) to the EPISODES array.
3. Do NOT touch the ADS / MUSIC_TRACKS / BLUNDER arrays — this is a regular episode.

Reference: ${SKILL}. Report the files you edited and any new cast that needs a real voice ref later.`,
  { phase: 'Wire', schema: DONE_SCHEMA },
)
log(`wire: ${wire?.summary ?? 'failed'}`)

// ---------------------------------------------------------------------------
// Phase 7 — Render audio + build verify. Long-running.
// ---------------------------------------------------------------------------
phase('Render')
const render = await agent(
  `Render the audio for episode "${slug}" and verify the build.

1. From the REPO ROOT (${REPO}, NOT Website/), run:
     python scripts/generate-radio.py ${slug}
   This loads a multi-GB TTS model and renders one clip per line — it takes several MINUTES.
   Use a long Bash timeout (up to 600000 ms). It writes timestamp/duration/audio back into the
   JSON and creates Website/public/audio/radio/${slug}/ with the .flac clips + .clips.json.
   If it errors on a missing cast/voice entry, report the exact error verbatim — do NOT invent fixes.
2. Then verify the site builds:
     cd ${REPO}/Website && bun run build
3. Report: did the render complete, how many clips, did the build pass. Quote any error verbatim.

Reference: ${SKILL} (Generation workflow section).`,
  { phase: 'Render', schema: DONE_SCHEMA },
)

return {
  slug,
  title: draft.title,
  filePath,
  concept: winner,
  findings: allFindings.length,
  blockers,
  newSpeakers: draft.newSpeakers,
  wired: wire?.ok ?? false,
  rendered: render?.ok ?? false,
  renderSummary: render?.summary,
  buildNotes: render?.details,
}
