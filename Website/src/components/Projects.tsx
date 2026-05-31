import { motion, useReducedMotion } from "motion/react";
import { projects } from "@/data/projects";
import { ProjectCard } from "@/components/ProjectCard";
import { EASE, D } from "@/lib/motion";

export function Projects() {
  const featured = projects.filter((p) => p.featured);
  const others = projects.filter((p) => !p.featured);
  const reduce = useReducedMotion();

  const headingProps = {
    initial: reduce ? (false as const) : { opacity: 0, y: 16 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.5 },
    transition: { duration: D.base, ease: EASE },
  };

  return (
    <section id="projects" className="relative z-10 mx-auto max-w-5xl px-6 py-24 md:py-32">
      <motion.p
        {...headingProps}
        className="text-xs font-medium uppercase tracking-[0.28em] text-muted-foreground"
      >
        Selected work
      </motion.p>
      <motion.h2
        {...headingProps}
        className="mb-10 mt-2 text-3xl font-semibold tracking-tight md:text-4xl"
      >
        Projects
      </motion.h2>

      <div className="grid gap-4 sm:grid-cols-2">
        {featured.map((project, i) => (
          <ProjectCard
            key={project.title}
            project={project}
            index={i}
            className={i === 0 ? "sm:col-span-2" : ""}
          />
        ))}
      </div>

      <motion.h2
        {...headingProps}
        className="mb-6 mt-16 text-sm font-medium uppercase tracking-wide text-muted-foreground"
      >
        More projects
      </motion.h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {others.map((project, i) => (
          <ProjectCard key={project.title} project={project} index={i} />
        ))}
      </div>
    </section>
  );
}
