# Migrate snazzie.space to Astro + React + TypeScript with shadcn/ui

**Date:** 2026-05-31
**Status:** Approved (design), pending spec review

## Goal

Convert the existing personal portfolio (Vite + React 16 + antd 4 + react-router 5 + react-scroll-section) to **Astro + React + TypeScript** using **shadcn/ui** (Tailwind) for components. Drop antd entirely. Preserve the current visual design and behaviour. Refresh the projects section to feature three new projects.

## Approach

**Astro pages compose React components rendered to static HTML at build time (zero hydration islands).** The site has no real interactivity: the nav uses hash anchors and smooth-scroll/scroll-snap are pure CSS. shadcn components (Radix + Tailwind) with no event handlers ship zero JS, so `client:*` directives are not used anywhere. This satisfies "Astro + React + TypeScript + shadcn" with no JS runtime cost.

Rejected alternatives:
- **All-React single island** — un-idiomatic for Astro, ships React for a static page.
- **Pure `.astro`** — drops React, contradicts the requirement.

## Scope

In scope:
- Replace the contents of `Website/` in place with a new Astro project.
- Port `home.scss` + antd styling to Tailwind utilities + a small bespoke `globals.css`.
- Replace antd `Layout`/`Menu`/`Card` with shadcn components and `@ant-design/icons` with `lucide-react` (plus the existing hand-rolled `SnazzieLogo`/social SVGs).
- Remove `react-router-dom` and `react-scroll-section`.
- Update projects: feature Lunar Portfolio, RaceIQ, CloudCat first; keep the existing 4 below.
- Preserve gh-pages deploy to `snazzie.space`.

Out of scope:
- Redesign / new visual direction (this is a port).
- New pages or routes (remains single-page).
- CI changes (only ZAP security-scan workflows exist; no deploy pipeline to update).

## Project structure

Replacing `Website/` contents:

```
Website/
  astro.config.mjs          # @astrojs/react; site: "https://snazzie.space"; base: "/"
  tailwind.config.* (per Astro Tailwind v4 setup via @tailwindcss/vite)
  components.json            # shadcn config (style, aliases)
  tsconfig.json              # strict; "@/*" -> "src/*"
  package.json               # astro scripts + gh-pages deploy
  public/
    CNAME                    # "snazzie.space" (Astro copies public/ to dist/ verbatim)
    (favicon / static assets)
  src/
    styles/globals.css       # Tailwind import + dark theme tokens + bespoke layers
    pages/index.astro        # composes Nav + Hero + About + Projects
    components/
      Nav.tsx                # fixed top nav, hash anchors (Home / About me / Projects)
      Hero.tsx               # SnazzieLogo + social row + scroll-down arrow
      About.tsx              # avatar + bio
      Projects.tsx           # renders project data into ProjectCard list
      ProjectCard.tsx        # shadcn Card-based card
      ui/card.tsx            # shadcn primitive (generated)
      ui/badge.tsx           # shadcn primitive (generated) — tech badges
      icons/
        SnazzieLogo.tsx      # ported from existing
        SocialIcons.tsx      # ported (Github/LinkedIn/Twitter)
    data/projects.ts         # typed Project[]
    assets/                  # codebackground.jpg etc. as needed
```

## Styling

- **Tailwind v4** via `@tailwindcss/vite` (current shadcn + Astro path), imported in `globals.css`.
- Port `home.scss` layout (grids, gaps, responsive `max-width: 800px` rules, social row, about layout) to Tailwind utility classes on each component.
- Bespoke CSS that does not map cleanly to utilities goes in `globals.css` layers:
  - Dark theme: page background `#1d1d1d`, white text defaults.
  - Project card gradient: `linear-gradient(0.45turn, rgb(19,23,45), rgb(128,0,128))` + hover transition.
  - Scroll behaviour: `scroll-snap-type: y proximity`, `scroll-behavior: smooth`, `section { scroll-snap-align: center; height: 100% }`.
  - Custom webkit scrollbar styling.
  - Social-icon hover fill transition.
- No SCSS, no `antd.css` import.

## Data model

```ts
// src/data/projects.ts
export interface Project {
  title: string;
  description: string;
  href: string;     // live site if it exists, else GitHub repo
  image: string;    // card image URL
  featured: boolean;
  tech?: string[];  // shown as badges on featured cards
}
```

`Projects.tsx` renders `featured` items first, then the rest. Featured cards show a short summary plus a row of `tech` badges; non-featured cards keep the existing compact title + description only.

### Project data

Featured (`featured: true`, shown first, with `tech`):

| Title | href | image | summary | tech |
|---|---|---|---|---|
| Lunar Portfolio | https://lunarportfolio.com | https://lunarportfolio.com/og/index.png | Personal wealth dashboard — tracks investments, pensions and retirement in one place, with real returns vs inflation and net worth. | Expo, React Native, Convex |
| RaceIQ | https://github.com/SpeedHQ/RaceIQ | https://opengraph.githubassets.com/1/SpeedHQ/RaceIQ | AI-powered coaching tool that helps sim racers improve their lap times. | TypeScript, Bun, Mastra AI, Hono, Drizzle / libSQL |
| CloudCat | https://cloudcat.dev | https://cloudcat.dev/logo.png | Cloud monitoring dashboard for Redis, PostgreSQL and RabbitMQ with smart alerts. | C#, Rust, RabbitMQ, TimescaleDB, React, TypeScript |

> Tech tags describe the **product** (app), not its marketing page. Lunar's app is Expo / React Native / Convex (`lunarportfolio.com` is its Astro landing page); CloudCat's product is C# / Rust / RabbitMQ / TimescaleDB / React+TS (`cloudcat.dev` is its landing page). Cards link to these public entry points. RaceIQ tech is from its `package.json`.

Existing (`featured: false`, kept below):

| Title | href | image | description |
|---|---|---|---|
| Dark Theme Hub | https://github.com/darkthemehub | https://avatars2.githubusercontent.com/u/55282763?s=400&v=4 | Dark themes for developers |
| CssToStyleFiles | https://github.com/DarkThemeHub/CssToStyleFiles | https://avatars2.githubusercontent.com/u/55282763?s=400&v=4 | Generates multiple types of style files used for applying custom themes to websites |
| Vital Utilities | https://github.com/Vital-Utilities/Vital-Utilities | https://avatars.githubusercontent.com/u/98346237?s=200&v=4 | Modern Windows Task Manager alternative with bells and whistles |
| Rhythm Unity | https://github.com/Snazzie/Rhythm-Unity | https://avatars.githubusercontent.com/u/19627023?v=4 | OSU Clone made in Unity |

Existing card images that prove unreliable at build time will fall back to the repo's `opengraph.githubassets.com` social image.

## Components

- **Nav.tsx** — fixed-position bar (`rgba(40,46,72,0.57)` background), three links to `#home` / `#aboutme` / `#projects`. shadcn `NavigationMenu` or styled `<a>` list; no state. Replaces antd `Layout.Header` + `Menu`.
- **Hero.tsx** — centered `SnazzieLogo`, social row (Github/LinkedIn/Twitter, hover fill transition), scroll-down arrow (`lucide-react` `ChevronDownCircle`/`CircleArrowDown`) linking to `#aboutme`. Replaces antd icons.
- **About.tsx** — section heading, GitHub avatar image, bio text (preserved verbatim from current site).
- **Projects.tsx** + **ProjectCard.tsx** — `ProjectCard` built on shadcn `Card`: image + gradient detail panel; whole card is an `<a target="_blank" rel="noopener noreferrer">` to `href`. Replaces the hand-rolled card and antd `Card`. Featured variant: larger card showing title, summary, and a row of shadcn `Badge` tech tags. Non-featured variant: existing compact title + description.

## Interactivity

None hydrated. All components render to static HTML. Nav links are anchors; scrolling is CSS. No `client:*` directives.

## Deployment

- `astro build` outputs to `dist/`.
- `public/CNAME` (containing `snazzie.space`) is copied to `dist/CNAME` automatically — replaces the old `add-domain` echo step.
- `package.json` scripts:
  - `dev`: `astro dev`
  - `build`: `astro build`
  - `preview`: `astro preview`
  - `deploy`: `astro build && gh-pages -d dist`
- `astro.config.mjs`: `site: "https://snazzie.space"`, `base: "/"`. Do **not** carry over the old `basename='base'` from `main.tsx` (it was almost certainly a bug).

## Verification

- `bunx astro check` passes (TypeScript, no `any`).
- `bun run build` succeeds.
- `bun run preview` (or built `dist/`) renders: dark page, fixed nav, hero with logo + 3 social icons + scroll arrow, about section with avatar + bio, projects section with 3 featured cards (summary + tech badges) first then 4 existing compact cards, scroll-snap between sections.
- No antd / react-router / react-scroll-section in `package.json` or source.

## Tooling notes

- Scaffold and run with **Bun** (`bunx create-astro`, `bunx shadcn`, `bun install`, `bun run ...`).
- TypeScript: strict, no `any` — use proper types / inference / `unknown` + narrowing.
- Prefer static top-of-file imports (no dynamic `import()`).
