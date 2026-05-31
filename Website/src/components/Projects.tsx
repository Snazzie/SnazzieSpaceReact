import { projects } from "@/data/projects";
import { ProjectCard } from "@/components/ProjectCard";

export function Projects() {
  const featured = projects.filter((p) => p.featured);
  const others = projects.filter((p) => !p.featured);

  return (
    <section id="projects">
      <div className="grid h-full w-full content-center p-[10%]">
        <h1 className="justify-self-center text-[60px] text-white">Projects</h1>
        <div className="mb-12 flex flex-wrap items-stretch justify-center gap-8">
          {featured.map((project) => (
            <ProjectCard key={project.title} project={project} />
          ))}
        </div>
        <div className="flex flex-wrap justify-center gap-10">
          {others.map((project) => (
            <ProjectCard key={project.title} project={project} />
          ))}
        </div>
      </div>
    </section>
  );
}
