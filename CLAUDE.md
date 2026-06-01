# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Structure

Monorepo with two packages:
- `Website/` — Astro + React portfolio frontend, deploys to Cloudflare Pages
- `worker/` — Cloudflare Worker (Hono), serves GitHub stats + analytics API

## Commands

### Website (`cd Website`)
```bash
bun dev          # dev server at localhost:4321
bun build        # production build to ./dist/
bun test         # vitest run
bun deploy       # build + wrangler pages deploy dist
```

### Worker (`cd worker`)
```bash
bun dev          # wrangler dev (local)
bun deploy       # wrangler deploy
bun run typecheck  # tsc --noEmit
```

### Build verification
```bash
cd Website && bun run build   # astro build — use to verify changes
```

## Architecture

### Website
Single-page portfolio at `src/pages/index.astro`. Components in `src/components/`:
- Sections: `Intro`, `Career`, `Projects`, `TechStack`, `GithubStats`, `HireMe`, `Traffic`
- `Globe` — D3-geo world map
- `CursorField`, `Nav`, `SocialIcons`
- Data in `src/data/` (stack.ts, testimonials.ts, github.ts, projects.ts)

Path alias: `@/*` → `src/*`

Tailwind 4 via Vite plugin (not PostCSS). Simple Icons used for tech stack icons with monogram fallback.

### Worker
Hono router in `src/index.ts`. Two routes:
- `GET /ghstats` — cached GitHub profile snapshot (weekly cron recomputes into KV)
- `GET /analytics` — Cloudflare zone traffic

KV bindings: `STATS` (github-stats namespace), `TRAFFIC`. Cron: Mondays 06:00 UTC.

GitHub PAT stored as Worker secret (`GITHUB_TOKEN`). Stats URL passed to Website via Cloudflare Pages env var.

## Key Constraints
- Node >= 22.12.0 required for Website
- Vite pinned to 7.3.3 in Website `package.json` overrides
- TypeScript strict mode both packages
- Use `bun` not `npm`
