# Articles Feature Design

**Date:** 2026-06-02
**Status:** Approved

## Overview

Add an articles section to snazzie.space: a separate `/articles` feed page, per-article pages at `/articles/[slug]`, tag filtering, RSS feed, and a homepage teaser section before HireMe. Content is MDX files committed to the repo (Astro Content Collections). Reference implementation: LunarLanding (`/Users/acoop/Documents/GitHub/LunarLanding`).

---

## 1. Content Schema

**Collection:** `articles`
**Location:** `Website/src/content/articles/*.mdx`
**Config:** `Website/src/content/config.ts` (new file)

Zod schema fields:

| Field | Type | Notes |
|---|---|---|
| `title` | `string` | Required |
| `date` | `z.coerce.date()` | Required, sort key |
| `updatedDate` | `z.coerce.date().optional()` | Optional |
| `excerpt` | `string` | Required, used in feed + teaser |
| `tags` | `string[]` | Default `[]` |
| `heroImage` | `string` (URL/path) | Optional |
| `draft` | `boolean` | Default `false`, excluded from all queries |

One starter article ships with the feature so the feed is never empty on first deploy.

---

## 2. Pages & Routing

### `src/pages/articles/index.astro` — Feed
- Fetches all non-draft articles via `getCollection('articles')`, sorted newest-first
- Client-side search filtering (inline `<script is:inline>`) matching title, excerpt, tags
- Load-more at 12 articles per page
- RSS icon link in heading row
- Empty state: "No articles yet. Check back soon."

### `src/pages/articles/[slug].astro` — Single Article
- `getStaticPaths` from non-draft collection
- Reading time: `Math.ceil(wordCount / 238)` min, min 1
- MDX rendered via `render(post)` into `prose prose-invert` block
- Breadcrumb back-link: `← All articles`
- JSON-LD structured data: `BlogPosting` + `BreadcrumbList`

### `src/pages/articles/tag/[tag].astro` — Tag Filter
- Static paths built from all unique tags across non-draft articles
- Same card grid as index, filtered to matching tag
- Heading: "Articles tagged: [tag]"

### `src/pages/rss.xml.ts` — RSS Feed
- Uses `@astrojs/rss`
- All non-draft articles, sorted newest-first
- Title, description, pubDate, link per item

### New Components

| File | Purpose |
|---|---|
| `src/components/articles/ArticleCard.astro` | Card: hero image (optional), date, title, excerpt (2-line clamp), TagList |
| `src/components/articles/TagList.astro` | Pill tags linking to `/articles/tag/[tag]` |

---

## 3. Homepage Integration

### Nav
Add "Articles" link to the existing `Nav.tsx` component pointing to `/articles`.

### `LatestArticles.tsx` — Teaser Section
- New React component inserted in `index.astro` between the existing last section and `HireMe`
- Props: `articles: ArticleTeaser[]` (title, date, excerpt, tags, slug) — passed from `index.astro` at build time via `getCollection('articles').slice(0, 3)`
- Renders 3 newest articles as horizontal card row (responsive: 1-col mobile, 3-col desktop)
- "View all articles →" link at bottom right
- Matches site section style: same padding, `SectionUnderline`, heading treatment
- Zero client-side JS — fully static

---

## 4. Lunar Portfolio RSS Integration

The `/articles` feed page includes a separate "From Lunar" section below the main feed, displaying articles from `lunarportfolio.com`.

### CORS
`lunarportfolio.com/rss.xml` is served with `Access-Control-Allow-Origin: *` via a `_headers` file in LunarLanding's `public/` directory (already committed). Direct browser fetch works with no proxy needed.

### Client component: `LunarArticles.tsx`
- React component with `client:idle` directive on the articles page
- Fetches `https://lunarportfolio.com/rss.xml` directly on mount
- Parses RSS XML via `DOMParser`
- Renders up to 6 most recent Lunar articles as a card grid (same `ArticleCard`-style layout)
- Loading skeleton + silent error fallback (section disappears if fetch fails)
- Section heading: "From Lunar" with link to `lunarportfolio.com`

---

## 5. Dependencies

- `@astrojs/rss` — add to Website package.json (RSS feed)
- `@tailwindcss/typography` — add to Website (prose styles for MDX body)

Both are bun-installable, no config changes needed beyond adding the Tailwind plugin.

---

## 5. File Change Summary

**New files:**
- `Website/src/content/config.ts`
- `Website/src/content/articles/<starter-article>.mdx`
- `Website/src/pages/articles/index.astro`
- `Website/src/pages/articles/[slug].astro`
- `Website/src/pages/articles/tag/[tag].astro`
- `Website/src/pages/rss.xml.ts`
- `Website/src/components/articles/ArticleCard.astro`
- `Website/src/components/articles/TagList.astro`
- `Website/src/components/LatestArticles.tsx`
- `Website/src/components/LunarArticles.tsx`

**Modified files:**
- `Website/src/components/Nav.tsx` — add Articles link
- `Website/src/pages/index.astro` — import LatestArticles, pass articles prop, insert section
- `Website/package.json` — add `@astrojs/rss`, `@tailwindcss/typography`
- `Website/astro.config.mjs` — no changes needed (sitemap already present)
- `Website/src/styles/global.css` — add `@plugin '@tailwindcss/typography'`
- `LunarLanding/public/_headers` — already committed (CORS on `/rss.xml`)
