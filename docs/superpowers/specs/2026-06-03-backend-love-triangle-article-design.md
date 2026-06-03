# Design: "The Backend Love Triangle" Article

**Date:** 2026-06-03
**Type:** Content — MDX article + React graphic component

## Goal

A research/opinion-driven article for the snazzie.space portfolio targeting startup engineers. Argues that Go and FastAPI are no longer the obvious defaults, and that Bun, ASP.NET, and Rust form a more compelling modern triangle of choices.

## Files

- `Website/src/content/articles/backend-love-triangle.mdx` — article
- `Website/src/components/articles/BackendTriangleChart.tsx` — SVG triangle diagram component

## Article Structure

### Frontmatter
```yaml
title: "The Backend Love Triangle: Bun, ASP.NET, and Rust"
date: 2026-06-03
excerpt: "Go and FastAPI made sense. Then LLMs happened. Here's the new triangle of backend choices for startups."
tags: ["rust", "aspnet", "bun", "backend", "architecture"]
draft: false
```

### Sections

1. **Hook** — The old world: Go was fast to ship AND fast at runtime. FastAPI was Python devs' escape hatch. Both had clear roles. That world is gone.

2. **The Trio** — Personality-driven intros:
   - **Rust** — The Perfectionist. Zero-cost abstractions, correctness enforced at compile time. Used to be "too hard." LLMs changed that calculus.
   - **Bun** — The Scrappy Upstart. Native TypeScript, fast I/O, ships fast. Ideal for API-first startups that already live in the JS/TS ecosystem.
   - **ASP.NET** — The Underrated Workhorse. Dismissed as enterprise bloat, but first-class SQL (EF Core), OpenAPI, auth, and a mature ecosystem. C# is genuinely good.

3. **`<BackendTriangleChart />`** — Visual diagram inserted here.

4. **When to pick each** — One tight paragraph per stack:
   - Rust: latency-critical, embedded, systems-adjacent services, or when correctness is non-negotiable
   - Bun: TypeScript-first teams, rapid API iteration, fullstack shops already on JS
   - ASP.NET: teams that want batteries included, SQL-heavy apps, or anywhere C# expertise already exists

5. **The Exes: Go and FastAPI** — Why they made sense, why the calculus shifted:
   - Go: the pitch was "Rust performance, Python productivity." LLMs close the Rust complexity gap. The middle ground erodes.
   - FastAPI: Python's GIL, cold starts, and async overhead vs. Bun's raw speed. Still fine for ML inference pipelines where the Python ecosystem is non-negotiable.

6. **Closing take** — No wrong answer in the triangle. But defaulting to Go or FastAPI in 2026 is nostalgia, not pragmatism.

## BackendTriangleChart Component

- SVG-based, dark-themed (matches site palette)
- Equilateral triangle, tech name at each corner with one-word personality label
- Edge labels showing the relationship/tradeoff between adjacent techs:
  - Bun ↔ Rust: "raw speed vs. dev speed"
  - Rust ↔ ASP.NET: "correctness vs. convention"
  - ASP.NET ↔ Bun: "ecosystem vs. simplicity"
- Responsive, no external deps
- Tailwind classes for theming

## Tone

Research/opinion-driven. First person allowed but not required. Punchy, no fluff. Match the voice of `building-snazzie-space.mdx`.

## Length

~600-800 words total.
