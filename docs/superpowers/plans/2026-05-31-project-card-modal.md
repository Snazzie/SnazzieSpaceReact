# Project Card Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Featured project cards open a hero-image modal on click with title, description, tech badges, and one or two CTA buttons instead of navigating directly.

**Architecture:** Add an optional `github` field to `Project` for dual-button support. Create `ProjectModal.tsx` using Radix UI Dialog with a bgImage/video hero header. Modify `ProjectCard.tsx` featured branch to be a `motion.div` that opens the modal on click.

**Tech Stack:** React, Radix UI (`radix-ui/react-dialog`), Tailwind v4, `tw-animate-css`, Framer Motion (existing)

---

### Task 1: Add `github` field to Project interface

**Files:**
- Modify: `Website/src/data/projects.ts`

- [ ] **Step 1: Add field to interface**

In `Website/src/data/projects.ts`, add one line after the `bgImage` field:

```ts
export interface Project {
  title: string;
  description: string;
  href: string; // live site if it exists, else GitHub repo
  image: string; // card image URL
  featured: boolean;
  tech?: string[]; // shown as badges on featured cards
  imageFit?: "cover" | "contain"; // featured card image fit; default cover
  supersedes?: string; // title of an older project this one replaces
  supersededBy?: string; // title of the newer project that replaced this one
  video?: string; // optional autoplay background video for featured cards
  bgImage?: string; // optional static background image for featured cards
  github?: string; // explicit GitHub repo URL; when set, enables dual CTA buttons
}
```

- [ ] **Step 2: Verify build**

```bash
cd Website && rtk tsc --noEmit
```

Expected: `TypeScript: No errors found`

- [ ] **Step 3: Commit**

```bash
rtk git add Website/src/data/projects.ts
rtk git commit -m "feat(projects): add github field to Project interface"
```

---

### Task 2: Create ProjectModal component

**Files:**
- Create: `Website/src/components/ProjectModal.tsx`

- [ ] **Step 1: Create the file**

Create `Website/src/components/ProjectModal.tsx` with this full content:

```tsx
import * as DialogPrimitive from "radix-ui/react-dialog";
import { Badge } from "@/components/ui/badge";
import { useReducedMotion } from "motion/react";
import type { Project } from "@/data/projects";

function ctaButtons(project: Project) {
  const { href, github } = project;
  if (github) {
    return (
      <div className="flex gap-3">
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 rounded-lg bg-foreground py-2.5 text-center text-sm font-semibold text-background transition hover:opacity-90"
        >
          Visit Site ↗
        </a>
        <a
          href={github}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 rounded-lg border border-border py-2.5 text-center text-sm font-medium text-foreground transition hover:border-zinc-500"
        >
          GitHub ↗
        </a>
      </div>
    );
  }
  const label = href.includes("github.com") ? "View on GitHub ↗" : "Visit Site ↗";
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-lg bg-foreground py-2.5 text-center text-sm font-semibold text-background transition hover:opacity-90"
    >
      {label}
    </a>
  );
}

export function ProjectModal({
  project,
  open,
  onOpenChange,
}: {
  project: Project;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { title, description, image, tech, video, bgImage } = project;
  const reduce = useReducedMotion();

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-1/2 z-50 mx-4 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-border bg-card shadow-xl outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
        >
          {/* Hero */}
          <div className="relative h-48 overflow-hidden bg-secondary">
            {video && !reduce ? (
              <video
                aria-hidden
                src={video}
                autoPlay
                muted
                loop
                playsInline
                className="absolute inset-0 size-full object-cover opacity-80"
              />
            ) : bgImage ? (
              <img
                aria-hidden
                src={bgImage}
                alt=""
                className="absolute inset-0 size-full object-cover opacity-80"
              />
            ) : (
              <img
                src={image}
                alt={title}
                className="absolute inset-0 size-full object-contain p-8 opacity-60"
              />
            )}
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-t from-card via-card/50 to-transparent"
            />
            <DialogPrimitive.Close className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-lg border border-border bg-card/70 text-muted-foreground transition hover:text-foreground">
              ✕
            </DialogPrimitive.Close>
          </div>

          {/* Body */}
          <div className="px-6 pb-6 pt-4">
            <DialogPrimitive.Title className="text-xl font-bold text-foreground">
              {title}
            </DialogPrimitive.Title>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
            {tech && tech.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {tech.map((t) => (
                  <Badge key={t} variant="outline" className="border-border text-muted-foreground">
                    {t}
                  </Badge>
                ))}
              </div>
            )}
            <div className="mt-6">{ctaButtons(project)}</div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
cd Website && rtk tsc --noEmit
```

Expected: `TypeScript: No errors found`

- [ ] **Step 3: Commit**

```bash
rtk git add Website/src/components/ProjectModal.tsx
rtk git commit -m "feat(projects): add ProjectModal component"
```

---

### Task 3: Wire modal into featured ProjectCard

**Files:**
- Modify: `Website/src/components/ProjectCard.tsx`

- [ ] **Step 1: Add import and state**

At the top of `Website/src/components/ProjectCard.tsx`, add the import after the existing imports:

```tsx
import { ProjectModal } from "@/components/ProjectModal";
```

Inside the `ProjectCard` function body, add a second `useState` for modal open state. The existing state declaration is:

```tsx
const [expanded, setExpanded] = useState(false);
```

Change it to:

```tsx
const [expanded, setExpanded] = useState(false);
const [modalOpen, setModalOpen] = useState(false);
```

- [ ] **Step 2: Replace featured branch**

Replace the entire `if (featured) { return (...) }` block (currently lines 65–128) with:

```tsx
  if (featured) {
    return (
      <>
        <motion.div
          {...revealProps}
          onClick={() => setModalOpen(true)}
          className={`group relative block cursor-pointer overflow-hidden rounded-2xl border border-border bg-card p-6 transition duration-200 hover:-translate-y-1 hover:border-zinc-600 ${className}`}
        >
          {video && !reduce && (
            <>
              <video
                aria-hidden
                src={video}
                autoPlay
                muted
                loop
                playsInline
                className="pointer-events-none absolute inset-0 z-0 size-full object-cover opacity-60 transition-opacity duration-300 group-hover:opacity-100"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 z-[5] bg-gradient-to-t from-card via-card/70 to-card/30 transition-opacity duration-300 group-hover:opacity-0"
              />
            </>
          )}
          {bgImage && !video && (
            <>
              <img
                aria-hidden
                src={bgImage}
                alt=""
                className="pointer-events-none absolute inset-0 z-0 size-full object-cover opacity-60 transition-opacity duration-300 group-hover:opacity-100"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 z-[5] bg-gradient-to-t from-card via-card/70 to-card/30 transition-opacity duration-300 group-hover:opacity-0"
              />
            </>
          )}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-10 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            style={{ background: SPOTLIGHT }}
          />
          <div className={`relative z-20 transition-opacity duration-300 ${(video && !reduce) || bgImage ? "group-hover:opacity-0" : ""}`}>
            <LogoTile src={image} alt={title} />
            <h3 className="mt-4 flex items-center gap-1.5 text-lg font-semibold text-foreground">
              {title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
            {tech && tech.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {tech.map((t) => (
                  <Badge key={t} variant="outline" className="border-border text-muted-foreground">
                    {t}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </motion.div>
        <ProjectModal project={project} open={modalOpen} onOpenChange={setModalOpen} />
      </>
    );
  }
```

- [ ] **Step 3: Verify build**

```bash
cd Website && rtk tsc --noEmit
```

Expected: `TypeScript: No errors found`

- [ ] **Step 4: Full build check**

```bash
cd Website && bun run build
```

Expected: build completes with no errors.

- [ ] **Step 5: Commit**

```bash
rtk git add Website/src/components/ProjectCard.tsx
rtk git commit -m "feat(projects): open modal on featured card click"
```

---

### Task 4: Push

- [ ] **Push to origin**

```bash
rtk git push
```
