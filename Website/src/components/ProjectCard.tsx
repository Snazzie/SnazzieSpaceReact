import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Archive, ArrowUp, ArrowUpRight } from "lucide-react";
import type { Project } from "@/data/projects";

export function ProjectCard({ project }: { project: Project }) {
  const { title, description, href, image, featured, tech, imageFit, supersedes, supersededBy } =
    project;
  // Called unconditionally (before the featured early-return) to keep hook order stable.
  const [expanded, setExpanded] = useState(false);

  if (featured) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="group block">
        <div className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card transition duration-200 group-hover:-translate-y-1 group-hover:border-zinc-600">
          <img
            alt={title}
            src={image}
            className={
              imageFit === "contain"
                ? "aspect-video w-full bg-black object-contain p-6"
                : "aspect-video w-full bg-black object-cover"
            }
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

  // Compact "More projects" card: tap/click the body to expand the description
  // (works on mobile); the ↗ arrow opens the project.
  return (
    <div
      className={`relative rounded-lg border border-border bg-card transition hover:border-zinc-600 ${
        supersededBy ? "opacity-60 hover:opacity-100" : ""
      }`}
    >
      <div
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setExpanded((v) => !v);
          }
        }}
        className="flex cursor-pointer items-start gap-4 p-4 pr-10 text-left"
      >
        <img
          alt={title}
          src={image}
          className={`h-12 w-12 shrink-0 rounded-md bg-black object-cover ${
            supersededBy ? "grayscale" : ""
          }`}
        />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-medium text-foreground">{title}</h3>
          <p className={`text-xs text-muted-foreground ${expanded ? "" : "line-clamp-1"}`}>
            {description}
          </p>
          {supersedes && (
            <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-foreground/25 px-2 py-0.5 text-[11px] font-medium text-foreground/90">
              <ArrowUp className="size-3" />
              Replaces {supersedes}
            </span>
          )}
          {supersededBy && (
            <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
              <Archive className="size-3" />
              Superseded by {supersededBy}
            </span>
          )}
        </div>
      </div>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Open ${title}`}
        className="absolute right-3 top-3 text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowUpRight className="size-4" />
      </a>
    </div>
  );
}
