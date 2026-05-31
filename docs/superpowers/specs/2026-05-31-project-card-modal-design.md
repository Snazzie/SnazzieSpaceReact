# Project Card Modal — Design Spec

**Date:** 2026-05-31
**Status:** Approved

## Overview

Featured project cards on click open a modal instead of navigating directly to the project URL. The modal uses a hero image/video header with project details below and one or two CTA buttons.

## Data Model

Add an optional `github` field to the `Project` interface in `Website/src/data/projects.ts`:

```ts
github?: string; // explicit GitHub repo URL; when set, enables dual CTA buttons
```

**Button logic:**
- `github` present → two buttons: "Visit Site ↗" (`href`) + "GitHub ↗" (`github`)
- No `github`, `href` contains `github.com` → single button: "View on GitHub ↗"
- No `github`, `href` is a live site → single button: "Visit Site ↗"

Projects to update with `github` field: only add when there is a separate live site AND a public GitHub repo. Implementation task will confirm which projects qualify before adding the field.

## Components

### `ProjectModal.tsx` (new)

A self-contained modal component built on Radix UI Dialog (`import { Dialog } from "radix-ui"`).

Structure:
```
Dialog.Root (open/onOpenChange)
  Dialog.Portal
    Dialog.Overlay  — fixed inset, black/60 backdrop, fade in
    Dialog.Content  — centered card, max-w-lg, rounded-2xl, bg-card border-border
      Hero section  — bgImage or video at 60% opacity, gradient overlay at bottom
      Close button  — absolute top-right (×), Dialog.Close
      Body          — padding, title (Dialog.Title), description, tech badges
      CTA row       — 1 or 2 buttons depending on github field
```

**Hero:** reuses the same `<img>` / `<video>` markup from `ProjectCard` (bgImage or video). Height fixed at `h-48`. No hover effects inside modal.

**Animation:** Radix Dialog has built-in `data-[state=open/closed]` attributes — use Tailwind `data-[state=open]:animate-in data-[state=closed]:animate-out fade-in-0 zoom-in-95` for the content, `fade-in-0` for the overlay.

**Accessibility:** `Dialog.Title` renders the project title (visually styled as heading). `Dialog.Description` wraps the description text.

### `ProjectCard.tsx` (modified)

Featured card changes:
- Outer element: `<motion.a>` → `<motion.div>` (no longer navigates on click)
- Add `onClick` prop that calls `setOpen(true)` on the card's local `useState<boolean>`
- Renders `<ProjectModal project={project} open={open} onOpenChange={setOpen} />` after the card markup
- Cursor: add `cursor-pointer` to the card className

Non-featured cards are unchanged (still plain links).

## Behaviour

- Click anywhere on a featured card → opens modal
- Click overlay or × button → closes modal
- Keyboard: Esc closes (Radix default)
- Reduced motion: video still omitted (existing `reduce` check passes through)
- Mobile: modal is full-width with `mx-4`, max-w-lg caps on desktop

## Out of Scope

- Non-featured card modals (remain as-is)
- Any changes to the card's hover/visual effects
