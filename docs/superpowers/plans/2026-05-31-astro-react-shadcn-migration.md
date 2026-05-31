# Astro + React + TypeScript + shadcn Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Vite + React 16 + antd portfolio in `Website/` with an Astro + React + TypeScript site using shadcn/ui, preserving the look and refreshing the projects section.

**Architecture:** Astro pages compose React components that render to **static HTML at build time** — no `client:*` hydration anywhere (the site has no interactivity; nav is hash anchors, scrolling is pure CSS). shadcn (Radix + Tailwind v4) supplies `Card`/`Badge`; `lucide-react` supplies chrome icons; the existing hand-rolled `SnazzieLogo`/social SVGs are ported as-is.

**Tech Stack:** Astro 5, React 19, TypeScript (strict, no `any`), Tailwind v4 (`@tailwindcss/vite`), shadcn/ui, lucide-react, Bun, vitest (data test only), gh-pages.

**Spec:** `docs/superpowers/specs/2026-05-31-astro-react-shadcn-migration-design.md`

**Working directory:** All paths below are relative to `Website/` unless noted. Run commands from inside `Website/`.

**Verification model:** Presentational components are verified by `bunx astro check` (types) + `bun run build` (build success) + a visual preview checklist (Task 11). The only unit-tested unit is the project **data** module (Task 6), where a typo'd URL or missing tech tag would otherwise pass silently.

---

## File Structure

Created/replaced under `Website/`:

| File | Responsibility |
|---|---|
| `astro.config.mjs` | Astro config: React + Tailwind, `site`/`base` for snazzie.space |
| `tsconfig.json` | strict TS, `@/*` → `src/*` alias (shadcn needs it) |
| `components.json` | shadcn config |
| `package.json` | scripts (dev/build/preview/deploy) + deps |
| `vitest.config.ts` | vitest config for the data test |
| `public/CNAME` | `snazzie.space` (Astro copies `public/` verbatim to `dist/`) |
| `src/styles/global.css` | Tailwind import + dark theme + bespoke CSS (gradient/scroll-snap/scrollbar/social hover) |
| `src/pages/index.astro` | page shell + `<head>` meta; composes Nav/Hero/About/Projects |
| `src/components/Nav.tsx` | fixed top nav, hash anchors |
| `src/components/Hero.tsx` | logo + social row + scroll-down arrow |
| `src/components/About.tsx` | avatar + bio |
| `src/components/Projects.tsx` | renders featured-first project list |
| `src/components/ProjectCard.tsx` | featured (summary + tech badges) + compact variants |
| `src/components/ui/card.tsx` | shadcn primitive (generated) |
| `src/components/ui/badge.tsx` | shadcn primitive (generated) |
| `src/components/icons/SnazzieLogo.tsx` | ported SVG |
| `src/components/icons/SocialIcons.tsx` | ported SVGs (Github/LinkedIn/Twitter) |
| `src/data/projects.ts` | typed `Project[]` + `featuredFirst()` helper |
| `src/data/projects.test.ts` | vitest data-integrity test |
| `src/lib/utils.ts` | shadcn `cn()` helper (generated) |

---

## Task 1: Preserve reusable assets and clear the old app

**Files:**
- Copy out: `src/assets/svg/SnazzieLogo.tsx`, `src/assets/svg/SocialIcons.tsx`, `src/assets/images/codebackground.jpg`
- Delete: all current `Website/` app files

- [ ] **Step 1: Copy reusable assets to a temp location**

Run from `Website/`:
```bash
mkdir -p /tmp/snazzie-keep
cp src/assets/svg/SnazzieLogo.tsx /tmp/snazzie-keep/SnazzieLogo.tsx
cp src/assets/svg/SocialIcons.tsx /tmp/snazzie-keep/SocialIcons.tsx
cp src/assets/images/codebackground.jpg /tmp/snazzie-keep/codebackground.jpg
ls /tmp/snazzie-keep
```
Expected: the three files listed.

- [ ] **Step 2: Remove the old Vite/React/antd app**

Run from `Website/` (the repo `.git` lives at the repo root, NOT in `Website/`, so this is safe):
```bash
rm -rf src public index.html vite.config.ts vite.config.ts.timestamp-*.mjs \
       tsconfig.json tsconfig.node.json package.json package-lock.json .gitignore
ls -la
```
Expected: `Website/` is now empty (or shows only `.` and `..`).

- [ ] **Step 3: Commit the removal**

```bash
cd .. && git add -A Website && git commit -m "chore: remove old Vite+antd app before Astro scaffold

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>" && cd Website
```

---

## Task 2: Scaffold Astro + React + Tailwind

**Files:**
- Create: full Astro minimal project in `Website/`

- [ ] **Step 1: Scaffold the minimal Astro template into the empty dir**

Run from `Website/`:
```bash
bun create astro@latest . --template minimal --typescript strict --no-git --install --yes
```
If prompted "directory is not empty" or for any choice, accept defaults / "yes". Expected: creates `astro.config.mjs`, `package.json`, `tsconfig.json`, `src/pages/index.astro`, `public/`, and runs `bun install`.

- [ ] **Step 2: Verify the baseline scaffold builds**

```bash
bunx astro check && bun run build
```
Expected: `astro check` reports 0 errors; build writes `dist/`. (The stock starter page builds cleanly.)

- [ ] **Step 3: Add the React integration**

```bash
bunx astro add react --yes
```
Expected: installs `@astrojs/react`, `react`, `react-dom`, `@types/react*`, and registers `react()` in `astro.config.mjs`.

- [ ] **Step 4: Add Tailwind v4**

```bash
bunx astro add tailwind --yes
```
Expected: installs `tailwindcss` + `@tailwindcss/vite`, adds the Vite plugin to `astro.config.mjs`, and creates `src/styles/global.css` containing `@import "tailwindcss";`.

- [ ] **Step 5: Verify it still builds, then commit**

```bash
bunx astro check && bun run build
cd .. && git add -A Website && git commit -m "feat: scaffold Astro + React + Tailwind v4

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>" && cd Website
```
Expected: 0 errors, build succeeds.

---

## Task 3: Configure path alias and initialize shadcn

**Files:**
- Modify: `tsconfig.json` (add `@/*` alias)
- Create: `components.json`, `src/lib/utils.ts`, `src/components/ui/card.tsx`, `src/components/ui/badge.tsx`

- [ ] **Step 1: Add the `@/*` path alias to `tsconfig.json`**

Add `baseUrl` + `paths` to `compilerOptions` so shadcn imports (`@/lib/utils`, `@/components/ui/...`) resolve:
```jsonc
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist"],
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] },
    "jsx": "react-jsx",
    "jsxImportSource": "react"
  }
}
```
(Keep any keys the scaffold already wrote; only add the ones above that are missing.)

- [ ] **Step 2: Initialize shadcn**

```bash
bunx shadcn@latest init
```
When prompted: base color **Neutral** (or Slate), and confirm the detected paths. Expected: creates `components.json`, `src/lib/utils.ts` (with `cn()`), and adds shadcn tokens (CSS variables) to `src/styles/global.css`.

- [ ] **Step 3: Add the Card and Badge primitives**

```bash
bunx shadcn@latest add card badge
```
Expected: creates `src/components/ui/card.tsx` and `src/components/ui/badge.tsx`.

- [ ] **Step 4: Verify build, then commit**

```bash
bunx astro check && bun run build
cd .. && git add -A Website && git commit -m "feat: init shadcn/ui with card + badge primitives

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>" && cd Website
```
Expected: 0 errors, build succeeds.

---

## Task 4: Global styles — dark theme + bespoke CSS

**Files:**
- Modify: `src/styles/global.css`

- [ ] **Step 1: Append the dark theme + ported bespoke CSS**

Add to the END of `src/styles/global.css` (after the Tailwind import and shadcn tokens). This ports the non-utility CSS from the old `home.scss`/`Main.css`/`custom.css`:

```css
/* ---- Dark theme base (ported from home.scss) ---- */
html,
body {
  margin: 0;
  padding: 0;
  width: 100%;
  background: #1d1d1d;
  color: white;
  overflow-x: hidden;
  scroll-snap-type: y proximity;
  scroll-behavior: smooth;
}

section {
  display: block;
  min-height: 100vh;
  width: 100%;
  box-sizing: border-box;
  scroll-snap-align: center;
}

/* ---- Hero section background ---- */
#home {
  background: black;
}

/* ---- Project card gradient detail panel (ported verbatim) ---- */
.card-detail {
  background-image: linear-gradient(0.45turn, rgb(19, 23, 45), rgb(128, 0, 128));
  transition: all 0.5s ease;
}

/* ---- Social icon hover fill (ported) ---- */
.social-link svg {
  fill: white;
  transition: all 0.5s ease;
}
.social-link:hover svg {
  fill: purple;
}

/* ---- Scroll-down arrow hover ---- */
.scroll-arrow svg {
  color: gray;
  transition: all 0.5s ease;
}
.scroll-arrow:hover svg {
  color: white;
}

/* ---- Custom webkit scrollbar (ported from Main.css) ---- */
::-webkit-scrollbar {
  width: 0.8em;
}
::-webkit-scrollbar-track,
::-webkit-scrollbar-corner {
  background: #1d1d1d;
  box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.3);
}
::-webkit-scrollbar-thumb {
  background-color: rgb(53, 53, 53);
  border-radius: 50px;
  outline: 1px solid black;
}
```

- [ ] **Step 2: Verify build**

```bash
bunx astro check && bun run build
```
Expected: 0 errors, build succeeds. (Visual check happens in Task 11.)

- [ ] **Step 3: Commit**

```bash
cd .. && git add -A Website && git commit -m "style: dark theme + bespoke CSS (gradient, scroll-snap, scrollbar)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>" && cd Website
```

---

## Task 5: Port the icon components

**Files:**
- Create: `src/components/icons/SnazzieLogo.tsx`, `src/components/icons/SocialIcons.tsx`
- Source: `/tmp/snazzie-keep/SnazzieLogo.tsx`, `/tmp/snazzie-keep/SocialIcons.tsx`

- [ ] **Step 1: Copy the preserved SVG components into place**

```bash
mkdir -p src/components/icons
cp /tmp/snazzie-keep/SnazzieLogo.tsx src/components/icons/SnazzieLogo.tsx
cp /tmp/snazzie-keep/SocialIcons.tsx src/components/icons/SocialIcons.tsx
```

- [ ] **Step 2: Drop the unused React import from `SnazzieLogo.tsx`**

Both files are already clean: prop-less function components with no `any`. `SnazzieLogo.tsx` has `export default SnazzieLogo`; `SocialIcons.tsx` has named exports `GithubIcon`, `LinkedInIcon`, `TwitterIcon` (the exact names `Hero.tsx` imports in Task 8). The only edit needed: delete the line `import React from "react";` at the top of `SnazzieLogo.tsx` — it is unused under the `react-jsx` runtime. (`SocialIcons.tsx` has no React import and needs no change.)

- [ ] **Step 3: Verify types**

```bash
bunx astro check
```
Expected: 0 errors. Fix any `any`/implicit-any reported in the two icon files.

- [ ] **Step 4: Commit**

```bash
cd .. && git add -A Website && git commit -m "feat: port SnazzieLogo + social icon components

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>" && cd Website
```

---

## Task 6: Project data module (TDD)

**Files:**
- Create: `src/data/projects.ts`, `src/data/projects.test.ts`, `vitest.config.ts`
- Modify: `package.json` (add `test` script + vitest devDep)

- [ ] **Step 1: Install vitest**

```bash
bun add -d vitest
```

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
  },
});
```

- [ ] **Step 3: Add the `test` script to `package.json`**

In `"scripts"`, add:
```json
"test": "vitest run"
```

- [ ] **Step 4: Write the failing test**

Create `src/data/projects.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { projects, featuredFirst, type Project } from "./projects";

describe("projects data", () => {
  it("has exactly 3 featured projects", () => {
    expect(projects.filter((p) => p.featured)).toHaveLength(3);
  });

  it("every featured project has at least one tech tag", () => {
    for (const p of projects.filter((p) => p.featured)) {
      expect(p.tech && p.tech.length).toBeGreaterThan(0);
    }
  });

  it("every project has a valid absolute URL href and a non-empty image", () => {
    for (const p of projects) {
      expect(() => new URL(p.href)).not.toThrow();
      expect(p.image.length).toBeGreaterThan(0);
    }
  });

  it("featuredFirst() returns all featured before any non-featured", () => {
    const ordered: Project[] = featuredFirst();
    expect(ordered).toHaveLength(projects.length);
    const firstNonFeatured = ordered.findIndex((p) => !p.featured);
    const lastFeatured = ordered.map((p) => p.featured).lastIndexOf(true);
    expect(lastFeatured).toBeLessThan(firstNonFeatured);
  });
});
```

- [ ] **Step 5: Run the test to verify it fails**

```bash
bun run test
```
Expected: FAIL — `./projects` cannot be resolved / `projects` is not exported.

- [ ] **Step 6: Implement `src/data/projects.ts`**

```ts
export interface Project {
  title: string;
  description: string;
  href: string; // live site if it exists, else GitHub repo
  image: string; // card image URL
  featured: boolean;
  tech?: string[]; // shown as badges on featured cards
}

export const projects: Project[] = [
  {
    title: "Lunar Portfolio",
    description:
      "Personal wealth dashboard — tracks investments, pensions and retirement in one place, with real returns vs inflation and net worth.",
    href: "https://lunarportfolio.com",
    image: "https://lunarportfolio.com/og/index.png",
    featured: true,
    tech: ["Expo", "React Native", "Convex"],
  },
  {
    title: "RaceIQ",
    description: "AI-powered coaching tool that helps sim racers improve their lap times.",
    href: "https://github.com/SpeedHQ/RaceIQ",
    image: "https://opengraph.githubassets.com/1/SpeedHQ/RaceIQ",
    featured: true,
    tech: ["TypeScript", "Bun", "Mastra AI", "Hono", "Drizzle / libSQL"],
  },
  {
    title: "CloudCat",
    description:
      "Cloud monitoring dashboard for Redis, PostgreSQL and RabbitMQ with smart alerts.",
    href: "https://cloudcat.dev",
    image: "https://cloudcat.dev/logo.png",
    featured: true,
    tech: ["C#", "Rust", "RabbitMQ", "TimescaleDB", "React", "TypeScript"],
  },
  {
    title: "Dark Theme Hub",
    description: "Dark themes for developers",
    href: "https://github.com/darkthemehub",
    image: "https://avatars2.githubusercontent.com/u/55282763?s=400&v=4",
    featured: false,
  },
  {
    title: "CssToStyleFiles",
    description:
      "Generates multiple types of style files used for applying custom themes to websites",
    href: "https://github.com/DarkThemeHub/CssToStyleFiles",
    image: "https://avatars2.githubusercontent.com/u/55282763?s=400&v=4",
    featured: false,
  },
  {
    title: "Vital Utilities",
    description: "Modern Windows Task Manager alternative with bells and whistles",
    href: "https://github.com/Vital-Utilities/Vital-Utilities",
    image: "https://avatars.githubusercontent.com/u/98346237?s=200&v=4",
    featured: false,
  },
  {
    title: "Rhythm Unity",
    description: "OSU Clone made in Unity",
    href: "https://github.com/Snazzie/Rhythm-Unity",
    image: "https://avatars.githubusercontent.com/u/19627023?v=4",
    featured: false,
  },
];

export function featuredFirst(): Project[] {
  return [...projects].sort((a, b) => Number(b.featured) - Number(a.featured));
}
```

- [ ] **Step 7: Run the test to verify it passes**

```bash
bun run test
```
Expected: PASS (4 tests).

- [ ] **Step 8: Commit**

```bash
cd .. && git add -A Website && git commit -m "feat: project data module with featured-first ordering + tests

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>" && cd Website
```

---

## Task 7: ProjectCard component (featured + compact variants)

**Files:**
- Create: `src/components/ProjectCard.tsx`

- [ ] **Step 1: Implement `ProjectCard.tsx`**

Uses shadcn `Card` + `Badge`. The whole card is an external link. Featured cards show the summary + tech badges; compact cards show title + description only (matching the old 300×120 layout). The gradient panel uses the `.card-detail` class from Task 4.

```tsx
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Project } from "@/data/projects";

export function ProjectCard({ project }: { project: Project }) {
  const { title, description, href, image, featured, tech } = project;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="block no-underline"
    >
      <Card
        className={
          featured
            ? "grid w-[340px] grid-rows-[auto_1fr] overflow-hidden border-0 bg-transparent"
            : "grid h-[120px] w-[300px] grid-cols-[40%_auto] overflow-hidden border-0 bg-transparent"
        }
      >
        <img
          alt={title}
          src={image}
          className="h-full w-full self-center bg-[#1d1d1d] object-cover"
        />
        <div className="card-detail p-4 text-white">
          <h4 className="m-0 text-lg font-semibold text-white">{title}</h4>
          <p className="mt-2 text-sm text-white/90">{description}</p>
          {featured && tech && tech.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {tech.map((t) => (
                <Badge
                  key={t}
                  variant="secondary"
                  className="bg-white/15 text-white hover:bg-white/25"
                >
                  {t}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </Card>
    </a>
  );
}
```

- [ ] **Step 2: Verify types**

```bash
bunx astro check
```
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
cd .. && git add -A Website && git commit -m "feat: ProjectCard with featured + compact variants

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>" && cd Website
```

---

## Task 8: Projects, Nav, Hero, About components

**Files:**
- Create: `src/components/Projects.tsx`, `src/components/Nav.tsx`, `src/components/Hero.tsx`, `src/components/About.tsx`

- [ ] **Step 1: Implement `Projects.tsx`**

```tsx
import { featuredFirst } from "@/data/projects";
import { ProjectCard } from "@/components/ProjectCard";

export function Projects() {
  return (
    <section id="projects">
      <div className="grid h-full w-full content-center p-[10%]">
        <h1 className="justify-self-center text-[60px] text-white">Projects</h1>
        <div className="flex flex-wrap justify-center gap-10">
          {featuredFirst().map((project) => (
            <ProjectCard key={project.title} project={project} />
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Implement `Nav.tsx`** (replaces antd `Layout.Header` + `Menu`)

```tsx
const LINKS = [
  { href: "#home", label: "Home" },
  { href: "#aboutme", label: "About me" },
  { href: "#projects", label: "Projects" },
];

export function Nav() {
  return (
    <header className="fixed top-0 z-10 w-full bg-[rgba(40,46,72,0.57)]">
      <nav className="flex h-16 items-center gap-8 px-6">
        {LINKS.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="text-white no-underline transition-colors hover:text-[#1890ff]"
          >
            {link.label}
          </a>
        ))}
      </nav>
    </header>
  );
}
```

- [ ] **Step 3: Implement `Hero.tsx`** (replaces antd icons with ported SVGs + lucide)

```tsx
import SnazzieLogo from "@/components/icons/SnazzieLogo";
import { GithubIcon, LinkedInIcon, TwitterIcon } from "@/components/icons/SocialIcons";
import { CircleArrowDown } from "lucide-react";

export function Hero() {
  return (
    <section id="home">
      <div className="grid h-full w-full content-center p-[10%]">
        <div>
          <SnazzieLogo />
          <div className="mx-auto grid w-1/2 grid-cols-[repeat(3,5em)] justify-center gap-x-12">
            <a className="social-link" target="_blank" rel="noopener noreferrer" href="https://github.com/snazzie">
              <GithubIcon />
            </a>
            <a className="social-link" target="_blank" rel="noopener noreferrer" href="https://linkedin.com/in/cooper-a-m/">
              <LinkedInIcon />
            </a>
            <a className="social-link" target="_blank" rel="noopener noreferrer" href="https://twitter.com/ItsSnazzie">
              <TwitterIcon />
            </a>
          </div>
        </div>
        <div className="m-auto">
          <a className="scroll-arrow" href="#aboutme">
            <CircleArrowDown size={50} />
          </a>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Implement `About.tsx`** (bio text preserved verbatim from the old site)

```tsx
export function About() {
  return (
    <section id="aboutme">
      <div className="grid h-full w-full content-center p-[10%] md:p-[5%]">
        <h1 className="justify-self-center text-[60px] text-white">About me</h1>
        <div className="grid gap-2.5 md:grid-cols-2">
          <img
            className="justify-self-center md:justify-self-end"
            alt="Aaron"
            src="https://avatars.githubusercontent.com/u/19627023?v=4"
          />
          <p className="text-xl text-white">
            Name: Aaron
            <br />
            Location: England
            <br />
            Loves Languages: C#, Typescript, Rust
            <br />
            Dislikes Languages: Javascript, Go, Python, Bash, Powershell, Xamarin, Ruby
            <br />
            Strength: Yo mama
            <br />
            Weakness: Energy drinks, alchohol and coffee makes him sleepy
          </p>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Verify types**

```bash
bunx astro check
```
Expected: 0 errors. (If `lucide-react` is missing, run `bun add lucide-react` and re-check.)

- [ ] **Step 6: Commit**

```bash
cd .. && git add -A Website && git commit -m "feat: Nav, Hero, About, Projects components

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>" && cd Website
```

---

## Task 9: Compose the page in `index.astro`

**Files:**
- Modify: `src/pages/index.astro`

- [ ] **Step 1: Replace `src/pages/index.astro` with the page shell**

Imports the global stylesheet and renders the four sections. No `client:*` directives — everything renders to static HTML.

```astro
---
import "@/styles/global.css";
import { Nav } from "@/components/Nav";
import { Hero } from "@/components/Hero";
import { About } from "@/components/About";
import { Projects } from "@/components/Projects";
---

<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Snazzie</title>
    <meta
      name="description"
      content="Aaron (Snazzie) — software developer. Projects: Lunar Portfolio, RaceIQ, CloudCat and more."
    />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  </head>
  <body>
    <Nav />
    <Hero />
    <About />
    <Projects />
  </body>
</html>
```

- [ ] **Step 2: Verify build**

```bash
bunx astro check && bun run build
```
Expected: 0 errors; `dist/index.html` produced.

- [ ] **Step 3: Confirm zero client JS shipped**

```bash
grep -rl "client" dist/_astro 2>/dev/null; ls dist/_astro 2>/dev/null
```
Expected: `dist/_astro/` contains only CSS (no React runtime JS chunks), confirming static render. If JS chunks exist, check that no component uses a `client:*` directive.

- [ ] **Step 4: Commit**

```bash
cd .. && git add -A Website && git commit -m "feat: compose homepage in index.astro (static, zero islands)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>" && cd Website
```

---

## Task 10: Deploy config (snazzie.space)

**Files:**
- Modify: `astro.config.mjs`, `package.json`
- Create: `public/CNAME`

- [ ] **Step 1: Set `site` and `base` in `astro.config.mjs`**

Add to the `defineConfig({...})` object (alongside the existing `integrations`/`vite` keys added by Tasks 2):
```js
site: "https://snazzie.space",
base: "/",
```
Do NOT reintroduce the old `basename: "base"` — that was a bug in the previous `main.tsx`.

- [ ] **Step 2: Create `public/CNAME`**

File `public/CNAME` with exactly:
```
snazzie.space
```
(Astro copies `public/` verbatim into `dist/`, so `dist/CNAME` is produced automatically — replaces the old `add-domain` echo step.)

- [ ] **Step 3: Add gh-pages and deploy scripts**

```bash
bun add -d gh-pages
```
Then ensure `package.json` `"scripts"` contains:
```json
"dev": "astro dev",
"build": "astro build",
"preview": "astro preview",
"test": "vitest run",
"deploy": "astro build && gh-pages -d dist"
```

- [ ] **Step 4: Verify build emits CNAME**

```bash
bun run build && test -f dist/CNAME && cat dist/CNAME
```
Expected: prints `snazzie.space`.

- [ ] **Step 5: Commit**

```bash
cd .. && git add -A Website && git commit -m "build: gh-pages deploy config for snazzie.space

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>" && cd Website
```

---

## Task 11: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Full check + build + data test**

```bash
bunx astro check && bun run test && bun run build
```
Expected: astro check 0 errors; 4 vitest tests pass; build succeeds.

- [ ] **Step 2: Confirm no old dependencies remain**

```bash
grep -E "antd|@ant-design|react-router|react-scroll-section" package.json || echo "CLEAN: no legacy deps"
```
Expected: `CLEAN: no legacy deps`.

- [ ] **Step 3: Visual preview checklist**

```bash
bun run preview
```
Open the printed URL and confirm:
- [ ] Page background is dark (`#1d1d1d`), text white.
- [ ] Fixed nav bar with translucent navy background; links Home / About me / Projects scroll to sections.
- [ ] Hero: SnazzieLogo centered, 3 social icons (white, hover → purple), scroll-down arrow (hover → white) linking to About.
- [ ] About: avatar image + bio text; two-column on desktop, single column under 800px.
- [ ] Projects: 3 featured cards FIRST (image + gradient panel + summary + tech badges), then 4 compact cards (image + gradient panel + title + description). Cards open the correct URL in a new tab.
- [ ] Scroll-snap between sections; smooth scroll on nav clicks.

- [ ] **Step 4: Update repo README/notes if present**

If the repo root has a README referencing the old `npm`/Vite workflow, update the dev/deploy commands to the Bun/Astro equivalents (`bun run dev`, `bun run build`, `bun run deploy`). Skip if no such README exists.

- [ ] **Step 5: Final commit (if Step 4 changed anything)**

```bash
cd .. && git add -A && git commit -m "docs: update workflow notes for Astro/Bun

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>" && cd Website
```

---

## Done criteria

- `bunx astro check` → 0 errors; `bun run test` → 4 pass; `bun run build` → success.
- No `antd`, `@ant-design/icons`, `react-router-dom`, or `react-scroll-section` anywhere in `Website/`.
- `dist/` contains static HTML with no React runtime JS, plus `dist/CNAME` = `snazzie.space`.
- Site renders the preserved dark portfolio with 3 featured (tech-badged) + 4 compact project cards.
