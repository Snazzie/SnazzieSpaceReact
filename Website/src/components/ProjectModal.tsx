import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Badge } from "@/components/ui/badge";
import { useReducedMotion } from "motion/react";
import type { Project } from "@/data/projects";

function CtaButtons({ project }: { project: Project }) {
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
          className="flex-1 rounded-lg border border-border py-2.5 text-center text-sm font-medium text-foreground transition hover:border-foreground/50"
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
          aria-describedby="project-modal-desc"
          className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-border bg-card shadow-xl outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
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
            <DialogPrimitive.Close aria-label="Close" className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-lg border border-border bg-card/70 text-muted-foreground transition hover:text-foreground">
              ✕
            </DialogPrimitive.Close>
          </div>

          {/* Body */}
          <div className="px-6 pb-6 pt-4">
            <DialogPrimitive.Title className="text-xl font-bold text-foreground">
              {title}
            </DialogPrimitive.Title>
            <p id="project-modal-desc" className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
            {tech && tech.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {tech.map((t) => (
                  <Badge key={t} variant="outline" className="border-border text-muted-foreground">
                    {t}
                  </Badge>
                ))}
              </div>
            )}
            <div className="mt-6"><CtaButtons project={project} /></div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
