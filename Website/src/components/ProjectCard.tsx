import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Project } from "@/data/projects";

export function ProjectCard({ project }: { project: Project }) {
  const { title, description, href, image, featured, tech } = project;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="block no-underline"
    >
      <Card
        className={
          featured
            ? "grid w-[340px] grid-rows-[auto_1fr] overflow-hidden border-0 bg-transparent"
            : "grid h-[120px] w-[300px] grid-cols-[40%_auto] overflow-hidden border-0 bg-transparent"
        }
      >
        <img
          alt={title}
          src={image}
          className="h-full w-full self-center bg-[#1d1d1d] object-cover"
        />
        <div className="card-detail p-4 text-white">
          <h4 className="m-0 text-lg font-semibold text-white">{title}</h4>
          <p className="mt-2 text-sm text-white/90">{description}</p>
          {featured && tech && tech.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {tech.map((t) => (
                <Badge
                  key={t}
                  variant="secondary"
                  className="bg-white/15 text-white hover:bg-white/25"
                >
                  {t}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </Card>
    </a>
  );
}
