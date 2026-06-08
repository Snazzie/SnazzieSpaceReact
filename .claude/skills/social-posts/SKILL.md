---
name: social-posts
description: Write and generate a fake Snazzie FM social post for the /snazziefm "From the Booth" feed — post text + an ideogram4 image rendered in Studio Ghibli style. Use when creating or editing a station social post. Builds on Snazzie FM episode/advert lore.
---

# Snazzie FM Social Posts

Faux "@snazziefm" social posts shown in the **From the Booth** area of the `/snazziefm`
page (`src/components/RadioPosts.tsx`, data in `src/data/radio-posts.ts`). Each post is a
verified-account-style card: body text, a photo, a caption, a timestamp, and fake
like/repost/reply counts. Photos are rendered **locally with ideogram4** in Studio Ghibli
style.

## Data model

Posts live in `src/data/radio-posts.ts` as `StationPost[]`. The component just renders the
array, so this skill only **appends an entry** (and runs the render script).

```ts
{
  id: "kebab-slug",      // also the image basename: public/images/radio/<id>.png
  text: "...",            // body: **bold** and #hashtag markup, emoji literal
  imagePrompt: "...",     // SCENE ONLY — no art-style line (render script adds Ghibli)
  photo: "/images/radio/<id>.png",
  caption: "...",         // line under the photo
  time: "9:12 PM",
  likes: "4,021", reposts: "877", replies: "312",
}
```

Body markup: `**bold**` → `<strong>`, `#Hashtag` → styled tag span (word chars only),
emoji pass through literally. A lone `#` or unmatched `**` stays literal.

## How to write a post

1. **Ground it in lore.** Pull a beat from an existing episode/advert in
   `src/data/radio/` — a recurring character (Ronnie the host, Barry, Frank, Todd the
   intern), a running event (the fog at the DMV, GreenFlow's all-green grid, Frank's
   unionized pigeons, the 90-year soup), or a single episode's hook. The post is the
   station tweeting about that beat.
2. **Write `text`** in the station's deadpan voice: a "BREAKING" / announcement / behind-
   the-scenes tone, **bold** a name, end with a `#Hashtag` (often the episode's title
   slug-cased). Keep it short, like a real social post. Emoji sparingly.
3. **Write `caption`** — one wry line describing the photo as if it were a real candid.
4. **Fake stats** — plausible, comma-formatted strings (likes > reposts > replies).
5. **Write `imagePrompt` — SCENE ONLY.** Describe subject, setting, props, light, mood.
   **Do NOT add a style line** ("Studio Ghibli", "hand-painted", etc.) — `render-post.py`
   appends the house Ghibli style to every prompt. ideogram4 renders in-image text well,
   so signage/boards (e.g. `NOW SERVING 41,001`) can be specified.
6. **Pick `id`** (kebab). `photo` is `/images/radio/<id>.png`.
7. **Append** the entry to `POSTS` in `src/data/radio-posts.ts`.

## Render the photo (WSL, ideogram4)

One-time setup (see `scripts/wsl-ideogram-setup.sh` header for HF/API prerequisites):

```bash
bash scripts/wsl-ideogram-setup.sh <HF_TOKEN> <IDEOGRAM_API_KEY>
```

Then, per post (in WSL, `conda activate ideogram`):

```bash
python scripts/render-post.py <id> "<imagePrompt>"      # 1:1 square (default)
python scripts/render-post.py <id> "<imagePrompt>" --portrait   # 4:5
```

Writes `Website/public/images/radio/<id>.png`. GPU generation is slow and runs
**separately** from authoring — the page shows a "Photo dropping soon" placeholder until
the PNG lands, so a post is shippable before its image exists.

## Verify

```bash
cd Website && bun test && bun run build
```

`bun test` covers the text formatter + post-data invariants; `bun run build` confirms the
data file and component compile. Then load `/snazziefm` and check the post renders (photo
or placeholder).

## Style rules

- **All images are Studio Ghibli.** This is fixed in `GHIBLI_STYLE` in `render-post.py` —
  never bake the style into a post's `imagePrompt`; keep prompts scene-only.
- All content is fictional parody, consistent with the rest of Snazzie FM.
