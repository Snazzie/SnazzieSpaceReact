import { Badge } from "@/components/ui/badge";
import { ArrowUp, ArrowUpRight } from "lucide-react";
import type { Project } from "@/data/projects";

export function ProjectCard({ project }: { project: Project }) {
  const { title, description, href, image, featured, tech, imageFit, supersedes, supersededBy } =
    project;

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

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="group block">
      <div
        className={`flex items-center gap-4 rounded-lg border border-border bg-card p-4 transition group-hover:border-zinc-600 ${
          supersededBy ? "opacity-60 group-hover:opacity-100" : ""
        }`}
      >
        <img
          alt={title}
          src={image}
          className="h-12 w-12 shrink-0 self-start rounded-md bg-black object-cover"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-foreground">{title}</h3>
            {supersededBy && (
              <Badge
                variant="outline"
                className="border-border text-[10px] uppercase tracking-wide text-muted-foreground"
              >
                Superseded
              </Badge>
            )}
          </div>
          <p className="line-clamp-1 text-xs text-muted-foreground">{description}</p>
          {supersedes && (
            <span className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[11px] text-foreground/80">
              <ArrowUp className="size-3" />
              Replaces {supersedes}
            </span>
          )}
          {supersededBy && (
            <p className="mt-1.5 text-[11px] text-muted-foreground/70">Superseded by {supersededBy}</p>
          )}
        </div>
        <ArrowUpRight className="size-4 shrink-0 self-start text-muted-foreground transition-colors group-hover:text-foreground" />
      </div>
    </a>
  );
}
