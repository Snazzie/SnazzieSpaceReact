import { motion, useReducedMotion } from "motion/react";
import { projects } from "@/data/projects";
import { ProjectCard } from "@/components/ProjectCard";
import { FeaturedShowcase } from "@/components/FeaturedShowcase";
import { EASE, D } from "@/lib/motion";
import { SectionUnderline } from "@/components/SectionUnderline";

export function Projects({ images }: { images?: Record<string, string> } = {}) {
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
    <section id="projects" className="relative z-10">
      <div className="mx-auto max-w-5xl px-6 pt-24 md:pt-32">
        <motion.p
          {...headingProps}
          className="text-xs font-medium uppercase tracking-[0.28em] text-muted-foreground"
        >
          Selected work
        </motion.p>
        <motion.h2
          {...headingProps}
          className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl"
        >
          Projects
        </motion.h2>
        <SectionUnderline />
      </div>

      <FeaturedShowcase projects={featured} images={images} />

      <div className="mx-auto max-w-5xl px-6 pb-24 pt-24 md:pb-32">
        <motion.h2
          {...headingProps}
          className="mb-6 text-sm font-medium uppercase tracking-wide text-muted-foreground"
        >
          More projects
        </motion.h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {others.map((project, i) => (
            <ProjectCard key={project.title} project={project} index={i} images={images} />
          ))}
        </div>
      </div>
    </section>
  );
}
