# Backend Love Triangle Article Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Write an opinionated article arguing Bun, ASP.NET, and Rust form the modern backend triangle for startups, with a custom SVG diagram component.

**Architecture:** Two new files: a React SVG diagram component at `Website/src/components/articles/BackendTriangleChart.tsx`, and an MDX article at `Website/src/content/articles/backend-love-triangle.mdx` that imports it. No changes to routing or layout — the existing `[slug].astro` template renders the MDX automatically.

**Tech Stack:** Astro MDX, React 19, Tailwind 4, inline SVG

---

## File Map

| Action | Path | Purpose |
|--------|------|---------|
| Create | `Website/src/components/articles/BackendTriangleChart.tsx` | SVG triangle diagram — Bun/Rust/ASP.NET nodes |
| Create | `Website/src/content/articles/backend-love-triangle.mdx` | Article content, imports chart component |

---

### Task 1: Create BackendTriangleChart component

**Files:**
- Create: `Website/src/components/articles/BackendTriangleChart.tsx`

- [ ] **Step 1: Create the component**

Create `Website/src/components/articles/BackendTriangleChart.tsx` with this exact content:

```tsx
export default function BackendTriangleChart() {
  const nodes = [
    { label: 'Bun', sub: 'Scrappy Upstart', cx: 200, cy: 55, color: '#f97316' },
    { label: 'Rust', sub: 'The Perfectionist', cx: 55, cy: 345, color: '#ef4444' },
    { label: 'ASP.NET', sub: 'The Workhorse', cx: 345, cy: 345, color: '#8b5cf6' },
  ];

  const edges = [
    [200, 55, 55, 345],
    [55, 345, 345, 345],
    [345, 345, 200, 55],
  ] as const;

  const edgeLabels = [
    { label: 'LLMs close the gap', x: 95, y: 195, rotate: -55 },
    { label: 'correctness vs convention', x: 200, y: 388, rotate: 0 },
    { label: 'ecosystem vs simplicity', x: 305, y: 195, rotate: 55 },
  ];

  return (
    <div className="my-10 flex justify-center">
      <svg
        viewBox="0 0 400 410"
        className="w-full max-w-sm"
        aria-label="Backend technology triangle: Bun, Rust, ASP.NET"
      >
        {edges.map(([x1, y1, x2, y2], i) => (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="1.5"
          />
        ))}

        {edgeLabels.map(({ label, x, y, rotate }) => (
          <text
            key={label}
            x={x}
            y={y}
            textAnchor="middle"
            fill="rgba(255,255,255,0.35)"
            fontSize="10"
            transform={`rotate(${rotate}, ${x}, ${y})`}
          >
            {label}
          </text>
        ))}

        {nodes.map(({ label, sub, cx, cy, color }) => (
          <g key={label}>
            <circle
              cx={cx}
              cy={cy}
              r="48"
              fill="rgba(255,255,255,0.03)"
              stroke={color}
              strokeWidth="1.5"
            />
            <text
              x={cx}
              y={cy - 6}
              textAnchor="middle"
              fill="white"
              fontSize="13"
              fontWeight="600"
            >
              {label}
            </text>
            <text
              x={cx}
              y={cy + 11}
              textAnchor="middle"
              fill="rgba(255,255,255,0.45)"
              fontSize="9"
            >
              {sub}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles cleanly**

```bash
cd Website && bun run typecheck 2>&1 | head -30
```

Expected: no errors referencing `BackendTriangleChart.tsx`

- [ ] **Step 3: Commit**

```bash
cd Website && git add src/components/articles/BackendTriangleChart.tsx
git commit -m "feat(articles): add BackendTriangleChart SVG diagram component"
```

---

### Task 2: Write the article MDX

**Files:**
- Create: `Website/src/content/articles/backend-love-triangle.mdx`

- [ ] **Step 1: Create the MDX file**

Create `Website/src/content/articles/backend-love-triangle.mdx` with this exact content:

```mdx
---
title: "The Backend Love Triangle: Bun, ASP.NET, and Rust"
date: 2026-06-03
excerpt: "Go and FastAPI had their moment. Then LLMs happened. Here's the new triangle of backend choices for startups."
tags: ["rust", "aspnet", "bun", "backend", "architecture"]
draft: false
---

import BackendTriangleChart from '@/components/articles/BackendTriangleChart';

## The Old World

For years, the backend decision tree for startups looked familiar: Go if you wanted speed without pain, FastAPI if your team lived in Python, Node if you wanted to stay in the JS ecosystem. These choices made sense because they optimised for a real constraint — developer time is expensive, and Rust had a brutal learning curve.

That constraint is weaker now.

LLMs don't write perfect Rust. But they dramatically lower the activation energy. The borrow checker errors that once burned hours are now resolved in minutes with a good prompt. The "Rust is too hard for a startup" argument has a shorter shelf life every month.

Which means the middle-ground options — Go, FastAPI — lose their main selling point.

## The Triangle

Three stacks now share the backend crown, each with a clear job.

<BackendTriangleChart />

## Rust — The Perfectionist

Zero-cost abstractions. Correctness enforced at compile time. A borrow checker that makes you prove your program is safe before it runs. Rust's pitch hasn't changed — what's changed is the cost of entry.

**Pick Rust when:** latency is genuinely non-negotiable, you're building something systems-adjacent (proxies, parsers, embedded services), or correctness is more valuable than iteration speed. Axum and Actix-web are both production-ready. The ecosystem is mature enough for most API work.

## Bun — The Scrappy Upstart

Bun ships as a runtime, bundler, test runner, and package manager in one binary. Native TypeScript support, fast I/O, and a familiar JS/TS API surface. If your team already lives in TypeScript, Bun removes the context switch entirely — share types, utilities, and validation logic across the stack.

**Pick Bun when:** you're a TypeScript-first team, shipping fast matters more than squeezing every microsecond, or you're building a fullstack product. Elysia and Hono are both solid framework choices on top of Bun.

## ASP.NET — The Underrated Workhorse

ASP.NET gets dismissed as enterprise bloat. That reputation is outdated. Minimal APIs in .NET 8+ are terse and genuinely fast. Entity Framework Core handles SQL with first-class migrations. OpenAPI support, auth middleware, health checks, and structured logging are all there before you install a single third-party package.

**Pick ASP.NET when:** your team has C# experience, you're building something SQL-heavy, or you want a mature ecosystem where the boring problems are already solved. The performance numbers are competitive enough that you won't be explaining apology blog posts.

## The Exes: Go and FastAPI

Go's pitch was always "Rust performance, Python productivity." A strong pitch when Rust meant wrestling the borrow checker for hours. That gap has narrowed considerably. Go is still a capable language — but "pick Go because Rust is too hard" is a weaker argument in 2026 than it was in 2022.

FastAPI remains excellent for one specific use case: ML inference pipelines where the Python ecosystem is non-negotiable. NumPy, PyTorch, Hugging Face integrations — if your API is fundamentally calling Python ML code, FastAPI is the right call. For everything else, Bun covers the "fast to ship" lane with better runtime performance.

## The Takeaway

There's no wrong answer inside the triangle. Rust, Bun, and ASP.NET each have a clear job and a defensible case. What's harder to defend is defaulting to Go or FastAPI out of habit — choosing familiarity over fit.

Pick the tool with the right shape for your problem. Just don't let "Rust is hard" be the reason you don't.
```

- [ ] **Step 2: Verify the build passes**

```bash
cd Website && bun run build 2>&1 | tail -20
```

Expected: build completes, `backend-love-triangle` listed in generated routes, no MDX import errors.

- [ ] **Step 3: Commit**

```bash
cd Website && git add src/content/articles/backend-love-triangle.mdx
git commit -m "feat(articles): add backend love triangle article (Bun, ASP.NET, Rust)"
```

---

## Self-Review Checklist

- [x] **Spec coverage:** Hook, trio intros, diagram, per-stack "when to pick", Go/FastAPI exes, closing take — all covered.
- [x] **No placeholders:** All code blocks are complete and production-ready.
- [x] **Type consistency:** Component exports `default`, MDX import uses default import — matches.
- [x] **Route:** File ID `backend-love-triangle` auto-generates route `/articles/backend-love-triangle/` via existing `[slug].astro` — no routing changes needed.
- [x] **Schema:** Frontmatter matches `content.config.ts` schema (title, date, excerpt, tags, draft) — no optional fields used that aren't defined.
