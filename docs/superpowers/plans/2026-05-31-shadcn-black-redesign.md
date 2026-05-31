# shadcn Black-Focused Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the Astro portfolio to a pure-black, monochrome, shadcn-native look on a modern flowing (non-scroll-snap) layout, redesigning the project cards.

**Architecture:** Purely presentational change. Retheme shadcn's dark CSS variables to black, apply `.dark` globally, remove the bespoke `#1d1d1d`/gradient/scroll-snap CSS, and rewrite the section + card components with shadcn-idiomatic Tailwind. No data, build, deploy, or logic changes; still zero hydration islands.

**Tech Stack:** Astro 5, React 19, TypeScript (strict, no `any`), Tailwind v4, shadcn/ui (Card/Badge), lucide-react, Bun.

**Spec:** `docs/superpowers/specs/2026-05-31-shadcn-black-redesign-design.md`

**Working directory:** All paths relative to `Website/`. Run commands from `/Users/acoop/Documents/GitHub/SnazzieSpaceReact/Website` (use absolute paths; `cd` does not persist between Bash calls). Runtime/PM: **Bun**. Commit trailer: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

**Verification model:** No new logic → no new unit tests. Each task verifies with `bunx astro check` + `bun run build`; the existing 3 data tests must keep passing; final task does a visual screenshot pass. Featured/compact project data and `src/data/projects.ts` are NOT modified.

---

## File Structure

| File | Change |
|---|---|
| `src/styles/global.css` | Remove ported bespoke block; append `.dark` black token overrides + minimal new CSS (smooth scroll, scroll-margin, social-link, scrollbar) |
| `src/pages/index.astro` | `<html class="dark scroll-smooth">`, `<body class="bg-background text-foreground antialiased">` |
| `src/components/Nav.tsx` | Blurred bordered black bar, monochrome links |
| `src/components/Hero.tsx` | Full-height, logo + tagline + monochrome social + chevron scroll cue |
| `src/components/About.tsx` | Flowing section, circular bordered avatar, bio verbatim + "Loves languages" badges |
| `src/components/ProjectCard.tsx` | Redesign: featured (image-top bordered card, hover lift, outline badges) + compact (avatar row) |
| `src/components/Projects.tsx` | Featured grid + "More projects" compact grid |

---

## Task 1: Theme tokens + global styles + dark page

**Files:**
- Modify: `src/styles/global.css`
- Modify: `src/pages/index.astro`

- [ ] **Step 1: Remove the ported bespoke CSS block from `global.css`**

Open `src/styles/global.css`. Delete the entire block that was appended at the end, starting at the comment line `/* ---- Dark theme base (ported from home.scss) ---- */` and continuing to the END of the file (it covers `html, body`, `section`, `#home`, `.card-detail`, `.social-link`, `.scroll-arrow`, and the `::-webkit-scrollbar` rules). Leave everything ABOVE it (the `@import "tailwindcss";`, shadcn `@theme inline`, token blocks) untouched.

- [ ] **Step 2: Append the new black-theme block to the END of `global.css`**

```css
/* ---- Black-focused theme overrides (always-dark site) ---- */
.dark {
  --background: #000000;
  --foreground: #fafafa;
  --card: #0a0a0a;
  --card-foreground: #fafafa;
  --popover: #0a0a0a;
  --popover-foreground: #fafafa;
  --primary: #fafafa;
  --primary-foreground: #0a0a0a;
  --secondary: #18181b;
  --secondary-foreground: #fafafa;
  --muted: #0a0a0a;
  --muted-foreground: #a1a1aa;
  --accent: #18181b;
  --accent-foreground: #fafafa;
  --border: #262626;
  --input: #262626;
  --ring: #3f3f46;
}

/* ---- Smooth anchor scrolling, offset under fixed nav ---- */
html {
  scroll-behavior: smooth;
}
section[id] {
  scroll-margin-top: 5rem;
}

/* ---- Social icons: monochrome, hover to foreground ---- */
.social-link {
  color: var(--muted-foreground);
  transition: color 0.2s ease;
}
.social-link:hover {
  color: var(--foreground);
}
.social-link svg {
  width: 1.75rem;
  height: 1.75rem;
  fill: currentColor;
}

/* ---- Custom scrollbar (black) ---- */
::-webkit-scrollbar {
  width: 0.7em;
}
::-webkit-scrollbar-track,
::-webkit-scrollbar-corner {
  background: #000;
}
::-webkit-scrollbar-thumb {
  background-color: #27272a;
  border-radius: 9999px;
}
```

- [ ] **Step 3: Update `src/pages/index.astro` html/body tags**

Change the opening `<html ...>` tag to:
```astro
<html lang="en" class="dark scroll-smooth">
```
Change the opening `<body>` tag to:
```astro
<body class="bg-background text-foreground antialiased">
```
Leave the `<head>` contents and the `<Nav /> <Hero /> <About /> <Projects />` body unchanged.

- [ ] **Step 4: Verify build**

Run: `cd /Users/acoop/Documents/GitHub/SnazzieSpaceReact/Website && bunx astro check && bun run build`
Expected: 0 errors; build succeeds. (Page will look transitional until later tasks restyle components — that's fine.)

- [ ] **Step 5: Commit**

```bash
cd /Users/acoop/Documents/GitHub/SnazzieSpaceReact && git add -A Website && git commit -m "style: pure-black shadcn theme tokens + remove bespoke dark CSS

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>" && cd Website
```

---

## Task 2: Nav, Hero, About

**Files:**
- Modify: `src/components/Nav.tsx`
- Modify: `src/components/Hero.tsx`
- Modify: `src/components/About.tsx`

- [ ] **Step 1: Replace `src/components/Nav.tsx` entirely**

```tsx
const LINKS = [
  { href: "#home", label: "Home" },
  { href: "#aboutme", label: "About me" },
  { href: "#projects", label: "Projects" },
];

export function Nav() {
  return (
    <header className="fixed top-0 z-50 w-full border-b border-border bg-background/70 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-5xl items-center gap-6 px-6">
        {LINKS.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {link.label}
          </a>
        ))}
      </nav>
    </header>
  );
}
```

- [ ] **Step 2: Replace `src/components/Hero.tsx` entirely**

```tsx
import SnazzieLogo from "@/components/icons/SnazzieLogo";
import { GithubIcon, LinkedInIcon, TwitterIcon } from "@/components/icons/SocialIcons";
import { ChevronDown } from "lucide-react";

export function Hero() {
  return (
    <section
      id="home"
      className="relative flex min-h-[100svh] flex-col items-center justify-center gap-8 px-6"
    >
      <div className="flex flex-col items-center gap-6">
        <div className="w-[280px] md:w-[360px]">
          <SnazzieLogo />
        </div>
        <p className="text-muted-foreground">Software developer — C#, TypeScript, Rust</p>
        <div className="flex items-center gap-6">
          <a className="social-link" target="_blank" rel="noopener noreferrer" href="https://github.com/snazzie" aria-label="GitHub">
            <GithubIcon />
          </a>
          <a className="social-link" target="_blank" rel="noopener noreferrer" href="https://linkedin.com/in/cooper-a-m/" aria-label="LinkedIn">
            <LinkedInIcon />
          </a>
          <a className="social-link" target="_blank" rel="noopener noreferrer" href="https://twitter.com/ItsSnazzie" aria-label="Twitter">
            <TwitterIcon />
          </a>
        </div>
      </div>
      <a
        href="#aboutme"
        aria-label="Scroll to about"
        className="absolute bottom-10 text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronDown size={24} />
      </a>
    </section>
  );
}
```

- [ ] **Step 3: Replace `src/components/About.tsx` entirely** (bio text preserved verbatim, including "alchohol"; the "Loves languages" line is rendered as badges)

```tsx
import { Badge } from "@/components/ui/badge";

export function About() {
  return (
    <section id="aboutme" className="mx-auto max-w-5xl px-6 py-24 md:py-32">
      <h1 className="mb-10 text-3xl font-semibold md:text-4xl">About me</h1>
      <div className="grid gap-8 md:grid-cols-[auto_1fr] md:items-center">
        <img
          className="h-40 w-40 rounded-full border border-border object-cover"
          alt="Aaron"
          src="https://avatars.githubusercontent.com/u/19627023?v=4"
        />
        <div className="flex flex-col gap-4">
          <p className="leading-relaxed text-muted-foreground">
            Name: Aaron
            <br />
            Location: England
            <br />
            Dislikes Languages: Javascript, Go, Python, Bash, Powershell, Xamarin, Ruby
            <br />
            Strength: Yo mama
            <br />
            Weakness: Energy drinks, alchohol and coffee makes him sleepy
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">Loves languages:</span>
            <Badge variant="secondary">C#</Badge>
            <Badge variant="secondary">Typescript</Badge>
            <Badge variant="secondary">Rust</Badge>
          </div>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Check the social SVG fill**

Open `src/components/icons/SocialIcons.tsx`. The `.social-link svg { fill: currentColor }` rule (Task 1) only recolors the icons if their `<svg>`/`<path>` elements do NOT hardcode a `fill`. If any element has a hardcoded `fill="#fff"` / `fill="white"` / `fill="black"`, change that attribute to `fill="currentColor"`. If there are no `fill` attributes, leave the file unchanged. Do NOT touch `SnazzieLogo.tsx` (its gradient fills are intentional).

- [ ] **Step 5: Verify build**

Run: `cd /Users/acoop/Documents/GitHub/SnazzieSpaceReact/Website && bunx astro check && bun run build`
Expected: 0 errors; build succeeds. (If `lucide-react` lacks `ChevronDown`, it does export it — no substitution needed.)

- [ ] **Step 6: Commit**

```bash
cd /Users/acoop/Documents/GitHub/SnazzieSpaceReact && git add -A Website && git commit -m "feat: black-focused Nav, Hero, About

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>" && cd Website
```

---

## Task 3: ProjectCard + Projects redesign

**Files:**
- Modify: `src/components/ProjectCard.tsx`
- Modify: `src/components/Projects.tsx`

- [ ] **Step 1: Replace `src/components/ProjectCard.tsx` entirely**

```tsx
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight } from "lucide-react";
import type { Project } from "@/data/projects";

export function ProjectCard({ project }: { project: Project }) {
  const { title, description, href, image, featured, tech } = project;

  if (featured) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="group block">
        <div className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card transition duration-200 group-hover:-translate-y-1 group-hover:border-zinc-600">
          <img
            alt={title}
            src={image}
            className="aspect-video w-full bg-black object-cover"
          />
          <div className="flex flex-1 flex-col gap-3 p-5">
            <h3 className="text-base font-semibold text-foreground">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
            {tech && tech.length > 0 && (
              <div className="mt-auto flex flex-wrap gap-1.5 pt-2">
                {tech.map((t) => (
                  <Badge key={t} variant="outline" className="border-border text-muted-foreground">
                    {t}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </a>
    );
  }

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="group block">
      <div className="flex items-center gap-4 rounded-lg border border-border bg-card p-4 transition group-hover:border-zinc-600">
        <img
          alt={title}
          src={image}
          className="h-12 w-12 shrink-0 rounded-md bg-black object-cover"
        />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-medium text-foreground">{title}</h3>
          <p className="line-clamp-1 text-xs text-muted-foreground">{description}</p>
        </div>
        <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
      </div>
    </a>
  );
}
```

- [ ] **Step 2: Replace `src/components/Projects.tsx` entirely**

```tsx
import { projects } from "@/data/projects";
import { ProjectCard } from "@/components/ProjectCard";

export function Projects() {
  const featured = projects.filter((p) => p.featured);
  const others = projects.filter((p) => !p.featured);

  return (
    <section id="projects" className="mx-auto max-w-5xl px-6 py-24 md:py-32">
      <h1 className="mb-10 text-3xl font-semibold md:text-4xl">Projects</h1>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {featured.map((project) => (
          <ProjectCard key={project.title} project={project} />
        ))}
      </div>
      <h2 className="mb-6 mt-16 text-sm font-medium uppercase tracking-wide text-muted-foreground">
        More projects
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {others.map((project) => (
          <ProjectCard key={project.title} project={project} />
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Verify build + data tests still pass**

Run: `cd /Users/acoop/Documents/GitHub/SnazzieSpaceReact/Website && bunx astro check && bun run test && bun run build`
Expected: 0 type errors; 3/3 tests pass; build succeeds. (If shadcn `Badge` has no `outline` variant in this preset, use `variant="secondary"` instead and note it.)

- [ ] **Step 4: Commit**

```bash
cd /Users/acoop/Documents/GitHub/SnazzieSpaceReact && git add -A Website && git commit -m "feat: redesign project cards (featured grid + compact rows)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>" && cd Website
```

---

## Task 4: Final verification + visual screenshot pass

**Files:** none (verification only)

- [ ] **Step 1: Full check/test/build + deploy-artifact confirmation**

```bash
cd /Users/acoop/Documents/GitHub/SnazzieSpaceReact/Website && bunx astro check && bun run test && bun run build && test -f dist/.nojekyll && cat dist/CNAME && (grep -q "<script" dist/index.html && echo "WARN: script tag present" || echo "OK: zero <script> tags")
```
Expected: 0 errors; 3 tests pass; build ok; `dist/.nojekyll` exists; `dist/CNAME` = `snazzie.space`; "OK: zero <script> tags".

- [ ] **Step 2: Visual screenshot pass**

Build, run `bun run preview` in the background, capture screenshots with playwright (install chromium if needed) at desktop 1440×900 (full page) and mobile 390×844 (full page), plus a close-up of the `#projects` section. Save to `/tmp/snazzie-redesign-{desktop,mobile,projects}.png`. Stop the preview server. Confirm:
  - Pure-black background; no purple gradient anywhere; no forced full-screen snapping between About/Projects (natural scroll).
  - Nav: blurred translucent-black bar with thin bottom border; monochrome links.
  - Hero: full-height; logo + tagline + 3 monochrome social icons (hover→white) + small chevron scroll cue.
  - About: circular bordered avatar + bio text + "Loves languages" badge row.
  - Projects: 3 featured bordered cards (image-top, title, description, outline tech badges) in a responsive grid with hover lift; below, "MORE PROJECTS" subheading + 4 compact rows (small avatar + title + one-line desc + arrow).
  - Featured images: confirm CloudCat's square logo crop under `aspect-video object-cover` looks acceptable. If it looks bad, change ONLY the featured `<img>` to `aspect-video w-full bg-black object-contain p-6` and rebuild.
  - Mobile: single-column, no horizontal overflow.

- [ ] **Step 3: Commit any screenshot-driven tweak (only if Step 2 required one)**

```bash
cd /Users/acoop/Documents/GitHub/SnazzieSpaceReact && git add -A Website && git commit -m "style: adjust featured image fit after visual pass

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>" && cd Website
```

---

## Done criteria
- `bunx astro check` 0 errors; `bun run test` 3/3; `bun run build` succeeds; `dist/.nojekyll` + `dist/CNAME` present; `dist/index.html` has zero `<script>` tags.
- Pure-black monochrome shadcn look on a flowing (non-snap) layout; redesigned featured + compact project cards; no purple gradient or `#1d1d1d` remnants.
- `src/data/projects.ts` unchanged.
