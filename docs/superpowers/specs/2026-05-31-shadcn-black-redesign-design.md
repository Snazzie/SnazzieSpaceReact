# snazzie.space — shadcn black-focused redesign

**Date:** 2026-05-31
**Status:** Approved (design), pending spec review
**Builds on:** `docs/superpowers/specs/2026-05-31-astro-react-shadcn-migration-design.md` (the Astro migration). This redesign changes only the look — stack, build, deploy, and data stay as-is.

## Goal

Replace the current bespoke dark look (`#1d1d1d` background, purple→navy gradient cards, forced full-screen scroll-snap sections) with a **pure-black, monochrome, shadcn-native** design on a **modern flowing layout** (no scroll-snap). Lean into shadcn's dark design system: black background, elevated bordered `bg-card` cards, `muted-foreground` secondary text.

## Non-goals

- No stack/build/deploy changes (Astro + React + Tailwind v4 + shadcn, Bun, gh-pages → snazzie.space all unchanged).
- No project-data changes (same 3 featured + 4 originals; `src/data/projects.ts` untouched).
- No new pages/routes; still a single static page with zero hydration islands.
- Bio copy preserved verbatim.

## Design tokens (`src/styles/global.css`)

Apply shadcn's dark theme globally (the page is always dark) and retheme the dark tokens to pure black. Concretely:
- `--background: #000000`, `--foreground: #fafafa`
- `--card: #0a0a0a`, `--card-foreground: #fafafa`
- `--popover`/`--popover-foreground`: same as card
- `--border: #262626`, `--input: #262626`, `--ring: #3f3f46`
- `--muted: #0a0a0a`, `--muted-foreground: #a1a1aa` (zinc-400)
- `--secondary: #18181b`, `--secondary-foreground: #fafafa`
- `--primary: #fafafa`, `--primary-foreground: #0a0a0a`

Set these on the existing dark token block (the project keeps Geist font from the current shadcn setup). The page renders dark unconditionally — add `class="dark"` to `<html>` in `index.astro` so the `.dark` variables apply (and so any shadcn component using `dark:` variants behaves).

### Bespoke CSS to REMOVE from `global.css`
- The `html, body { background: #1d1d1d; ... scroll-snap-type: y proximity; }` block → replace with: `body` uses `bg-background text-foreground`; keep `scroll-behavior: smooth`; drop `scroll-snap-type`.
- `section { min-height: 100vh; ... scroll-snap-align: center; }` → remove (sections become natural-height; hero sets its own min-height via utility).
- `#home { background: black; }` → remove (whole page is black now).
- `.card-detail { background-image: linear-gradient(...) }` → remove (cards use `bg-card` + border).

### Bespoke CSS to KEEP / ADJUST
- `.social-link svg` hover transition → keep, but monochrome: idle `text-muted-foreground` (or `fill: currentColor`), hover `text-foreground`. (Icons use `currentColor`; if the ported SVGs hardcode `fill`, set fill via the `.social-link` color.)
- Custom `::-webkit-scrollbar` → keep, retheme track to `#000`, thumb to `#27272a`.
- Add `:where(section[id]) { scroll-margin-top: 5rem; }` so anchor navigation clears the fixed nav.

## Layout & components

### `index.astro`
- Add `class="dark"` to `<html>`; add `scroll-smooth` (class or via CSS). `<body>` → `bg-background text-foreground antialiased`.
- Same section order: `<Nav /> <Hero /> <About /> <Projects />`. No `client:*`.

### `Nav.tsx`
- Fixed top bar: `fixed top-0 z-50 w-full border-b border-border bg-background/70 backdrop-blur`.
- Inner: `mx-auto flex h-16 max-w-5xl items-center gap-6 px-6`.
- Links: `text-sm text-muted-foreground transition-colors hover:text-foreground`. Same 3 anchors (`#home`, `#aboutme`, `#projects`).

### `Hero.tsx`
- `<section id="home">` → `flex min-h-[100svh] flex-col items-center justify-center gap-8 px-6`.
- `SnazzieLogo` (keep `role="img" aria-label="Snazzie"`), constrained width (e.g. `w-[280px] md:w-[360px]`).
- Tagline `<p class="text-muted-foreground">`: **"Software developer — C#, TypeScript, Rust"**.
- Social row: `flex items-center gap-6`; each `<a class="social-link" ...>` monochrome hover; icons sized ~28px. Keep the three links (GitHub/LinkedIn/Twitter) with `rel="noopener noreferrer"`.
- Subtle scroll cue: a small `lucide-react` `ChevronDown` (size 24) as `<a href="#aboutme" class="scroll-arrow text-muted-foreground hover:text-foreground">` near the bottom (replaces the large circle-arrow).

### `About.tsx`
- `<section id="aboutme">` → `mx-auto max-w-5xl px-6 py-24 md:py-32`.
- Heading: `text-3xl font-semibold md:text-4xl` ("About me").
- Layout `grid gap-8 md:grid-cols-[auto_1fr] md:items-center`:
  - Avatar `img` → `h-40 w-40 rounded-full border border-border object-cover` (src unchanged).
  - Bio block: bio text preserved **verbatim** (Name/Location/Loves/Dislikes/Strength/Weakness, including "alchohol") in `text-muted-foreground leading-relaxed`. Render the "Loves Languages: C#, Typescript, Rust" values as a row of shadcn `Badge variant="secondary"` below the paragraph (the literal three: C#, Typescript, Rust). The other lines stay as text.

### `ProjectCard.tsx` — redesign with two variants
Shared: link wrapper `<a href target=_blank rel=noopener noreferrer class="group block">`.

- **Featured** (`featured: true`): bordered card `flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card transition duration-200 group-hover:-translate-y-1 group-hover:border-zinc-600`.
  - Image: `aspect-video w-full bg-black object-cover` (wide og images fill; CloudCat's square logo center-crops acceptably).
  - Body `flex flex-1 flex-col gap-3 p-5`: title `text-base font-semibold text-foreground`; description `text-sm text-muted-foreground`; tech badges `Badge variant="outline"` in a `flex flex-wrap gap-1.5` row (`border-border text-muted-foreground`).
- **Compact** (`featured: false`): row card `flex items-center gap-4 rounded-lg border border-border bg-card p-4 transition group-hover:border-zinc-600`.
  - Thumbnail: `h-12 w-12 shrink-0 rounded-md bg-black object-cover`.
  - Text: title `text-sm font-medium text-foreground`; description `line-clamp-1 text-xs text-muted-foreground`.
  - Trailing `lucide-react` `ArrowUpRight` `size-4 text-muted-foreground` (appears/strengthens on hover).

### `Projects.tsx`
- `<section id="projects">` → `mx-auto max-w-5xl px-6 py-24 md:py-32`.
- Heading "Projects" `text-3xl font-semibold md:text-4xl mb-10`.
- Featured grid: `grid gap-6 sm:grid-cols-2 lg:grid-cols-3` over `projects.filter(p => p.featured)`.
- Subheading "More projects" `mt-16 mb-6 text-sm font-medium uppercase tracking-wide text-muted-foreground`.
- Compact grid: `grid gap-4 sm:grid-cols-2` over `projects.filter(p => !p.featured)`.

## Verification
- `bunx astro check` → 0 errors (no `any`).
- `bun run test` → 3/3 (data tests unchanged).
- `bun run build` → succeeds; `dist/index.html` still has zero `<script>` tags; `dist/.nojekyll` + `dist/CNAME` still emitted.
- Visual screenshot pass (desktop 1440 + mobile 390): pure-black page; blurred bordered nav; full-height hero with logo + tagline + monochrome social + scroll cue; about with circular avatar + bio + language badges; featured 3-up bordered cards with hover lift + outline badges; compact "More projects" rows. No purple gradient, no scroll-snap.

## Risks / notes
- Image cropping: `aspect-video object-cover` center-crops the CloudCat square logo and any non-wide image; acceptable for a uniform grid. If a featured image looks bad cropped, fall back to `object-contain` + `p-4` for that card only — decide during the screenshot pass.
- Social SVGs may hardcode `fill`; ensure the monochrome hover works (drive color via `currentColor`/CSS, adjusting `SocialIcons.tsx` only if needed).
