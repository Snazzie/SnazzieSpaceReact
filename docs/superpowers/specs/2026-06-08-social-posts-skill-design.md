# Social Posts Skill — Design

**Date:** 2026-06-08
**Status:** Approved (pending spec review)

## Goal

A `social-posts` skill that authors fake Snazzie FM social posts for the "From the
Booth" area of the `/snazziefm` page, generates each post's photo locally with the
open-weight **ideogram4** model under WSL, wires the post into the page, and
build-verifies. It mirrors the shape of the existing `radio-adverts` / `radio-episodes`
skills (author content → render media separately → wire → verify).

## Background / Current State

- The social area is `src/components/RadioPosts.tsx`, rendered inside
  `RadioLanding.tsx`. Posts are a hardcoded `POSTS: StationPost[]` array where `text`
  is JSX (`<strong>`, hashtag `<span>`, emoji).
- Each post references a photo at `/images/radio/<file>.png`
  (`public/images/radio/`). The component already shows a "Photo dropping soon"
  placeholder when the image is missing or fails to load.
- Media pipelines here follow a pattern: a generator (skill/workflow) writes data, and
  a Python render script in `scripts/` produces the heavy media separately. TTS audio
  uses a WSL conda env (`scripts/wsl-cosy-setup.sh`, `scripts/render-clip.py`). The
  user runs render scripts from the Windows side against WSL.
- Project skills live at `.claude/skills/<name>/SKILL.md`.

## Decisions (locked)

1. **Deliverable:** a skill (not a workflow), at `.claude/skills/social-posts/`.
2. **Surface:** the existing social area on `/snazziefm` (`RadioPosts.tsx`).
3. **Image backend:** local **ideogram4** open weights running in WSL with a GPU,
   mirroring the cosy-TTS setup (conda env, HF gated weights, Ideogram API key for the
   magic-prompt service).
4. **Post storage:** extract `POSTS` out of `RadioPosts.tsx` into a data file
   `src/data/radio-posts.ts`; the component just renders it.
5. **Text markup:** lightweight string markup — `**bold**` → `<strong>`, `#hashtag` →
   `rl-post-tag` span; emoji literal.
6. **Global art style:** every generated image is rendered in a **Studio Ghibli style**.
   `render-post.py` appends a fixed Ghibli style suffix to every prompt, so post
   `imagePrompt`s describe only the scene and need not repeat the style. The skill
   instructs authors to write scene-only prompts.

## Components

### 1. Data extraction — `src/data/radio-posts.ts`

Export `POSTS: StationPost[]`. `StationPost` becomes plain data:

```ts
export interface StationPost {
  id: string;          // kebab slug, also the image basename
  text: string;        // body w/ **bold** and #hashtag markup; emoji literal
  imagePrompt: string; // ideogram4 prompt used to render photo (kept for reproducibility)
  photo: string;       // "/images/radio/<id>.png"
  caption: string;     // figcaption under the photo
  time: string;        // e.g. "9:12 PM"
  likes: string;
  reposts: string;
  replies: string;
}
```

The two existing posts (`frank-tapes`, `ronnie-birthday`) are migrated verbatim: JSX
`<strong>X</strong>` → `**X**`, hashtag spans → `#Tag`, emoji preserved. `imagePrompt`
for the migrated posts is back-filled with a plausible prompt describing the existing
image (best effort; these images already exist).

### 2. Component refactor — `RadioPosts.tsx`

- Import `POSTS` from `@/data/radio-posts`.
- Add a small pure formatter `renderPostText(text: string): ReactNode[]` that splits on
  `**bold**` and `#hashtag` tokens and emits `<strong>` / `<span className="rl-post-tag">`
  / plain text, preserving emoji and whitespace. Hashtag = `#` followed by word chars.
- Everything else (markup, classes, `PostPhoto` fallback, stats row) unchanged. No
  visual change on the page for the migrated posts.
- `renderPostText` is unit-testable in isolation (vitest, alongside existing
  `projects.test.ts` style).

### 3. WSL setup — `scripts/wsl-ideogram-setup.sh`

One-time, idiomatic with `wsl-cosy-setup.sh`:

- Create/activate conda env `ideogram`.
- Clone `https://github.com/ideogram-oss/ideogram4`, `pip install .`.
- HuggingFace gated login (token) so weights download.
- Persist `IDEOGRAM_API_KEY` (magic-prompt expansion) for the render script to read
  from env.
- Print `ALL_OK` on success.

The script documents the manual prerequisites it cannot automate (accepting HF gated
access in the browser, obtaining the Ideogram API key).

### 4. Render script — `scripts/render-post.py`

```
python scripts/render-post.py <slug> "<prompt>"
```

- Resolves the ideogram4 `run_inference.py` in the WSL clone and invokes it (or imports
  its entry point) with the prompt.
- Reads `IDEOGRAM_API_KEY` from env for magic-prompt.
- Writes `public/images/radio/<slug>.png`.
- Appends a fixed **Studio Ghibli style** suffix to every prompt (single source of
  truth: `GHIBLI_STYLE` constant in the script) so all post images share the look.
- Defaults to a social-friendly aspect (square 1024×1024; `--portrait` for 4:5) and
  `--quantization nf4` for VRAM headroom.
- Prints the output path + dimensions on success, mirroring `render-clip.py`.

Convention: `<slug>` matches the post `id`, so the post's `photo` path resolves
automatically once the PNG lands.

### 5. The skill — `.claude/skills/social-posts/SKILL.md`

Frontmatter `name: social-posts`, description covering "write + generate a fake Snazzie
FM social post (image via ideogram4)". Steps:

1. Pick a post concept grounded in Snazzie FM lore (hosts Ronnie/Barry, callers, the
   fog, businesses, episodes). One post per run by default.
2. Write `text` (with `**bold**`/`#hashtag`), `caption`, plausible fake `time`/`likes`/
   `reposts`/`replies`, and an `imagePrompt`. Because ideogram4 excels at typography,
   prompts may specify in-image text (signage, captions) and a color palette via hex.
3. Choose a kebab `id`; append the `StationPost` entry to `src/data/radio-posts.ts`.
4. Render the photo in WSL: `python scripts/render-post.py <id> "<imagePrompt>"`. Note
   that GPU generation is slow and runs separately (same "render runs separately"
   caveat as the audio skills); the placeholder fallback covers the gap.
5. `cd Website && bun run build` to verify the data + component compile.
6. Report the new post + image path.

The skill references `scripts/wsl-ideogram-setup.sh` as a one-time prerequisite.

## Data Flow

```
skill authors entry ──> src/data/radio-posts.ts (text + imagePrompt + meta)
                               │
                               ├─ slug + imagePrompt ─> scripts/render-post.py (WSL, ideogram4)
                               │                              └─> public/images/radio/<slug>.png
                               └─ POSTS imported by RadioPosts.tsx ─> /snazziefm renders post + photo
                                                                       (placeholder if PNG absent)
```

## Error Handling

- **Image missing/slow:** `PostPhoto` already falls back to "Photo dropping soon"; a
  post is fully functional before its PNG exists.
- **WSL/GPU unavailable:** render script fails loudly with a pointer to
  `wsl-ideogram-setup.sh`; post text still ships.
- **Markup edge cases:** `renderPostText` leaves a lone `#` or unmatched `**` as
  literal text (covered by unit tests).

## Testing

- Unit-test `renderPostText` (bold, hashtag, emoji, mixed, literal `#`/`**`).
- `bun run build` (astro) verifies the refactor + new entries compile.
- Manual: load `/snazziefm`, confirm migrated posts render identically and a new post
  appears with its photo (or placeholder).

## Out of Scope (YAGNI)

- Hosted Ideogram API path (decided against; local weights only).
- Batch/multi-post generation in one run.
- Automating HF gated-access acceptance or API-key provisioning.
- Any change to non-social parts of the `/snazziefm` page.
