import { featuredFirst } from "@/data/projects";
import { ProjectCard } from "@/components/ProjectCard";

export function Projects() {
  return (
    <section id="projects">
      <div className="grid h-full w-full content-center p-[10%]">
        <h1 className="justify-self-center text-[60px] text-white">Projects</h1>
        <div className="flex flex-wrap justify-center gap-10">
          {featuredFirst().map((project) => (
            <ProjectCard key={project.title} project={project} />
          ))}
        </div>
      </div>
    </section>
  );
}
