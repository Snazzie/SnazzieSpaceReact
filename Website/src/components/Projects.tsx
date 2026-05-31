import { projects } from "@/data/projects";
import { ProjectCard } from "@/components/ProjectCard";

export function Projects() {
  const featured = projects.filter((p) => p.featured);
  const others = projects.filter((p) => !p.featured);

  return (
    <section id="projects" className="mx-auto max-w-5xl px-6 py-24 md:py-32">
      <h1 className="mb-10 text-3xl font-semibold md:text-4xl">Projects</h1>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {featured.map((project) => (
          <ProjectCard key={project.title} project={project} />
        ))}
      </div>
      <h2 className="mb-6 mt-16 text-sm font-medium uppercase tracking-wide text-muted-foreground">
        More projects
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {others.map((project) => (
          <ProjectCard key={project.title} project={project} />
        ))}
      </div>
    </section>
  );
}
