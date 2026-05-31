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
