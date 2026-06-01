import { motion, useReducedMotion, type Variants } from "motion/react";
import { stack, type Tech } from "@/data/stack";
import { D, EASE } from "@/lib/motion";

const reveal: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: D.base, ease: EASE, delay: i * 0.04 },
  }),
};

/** Short label for tech with no brand icon, e.g. "C#", "React Native" -> "RN". */
function monogram(name: string): string {
  const words = name.split(/\s+/);
  if (words.length > 1) return words.map((w) => w[0]).join("").toUpperCase();
  return name.length <= 3 ? name.toUpperCase() : name.slice(0, 2).toUpperCase();
}

function TechTile({ tech, index }: { tech: Tech; index: number }) {
  const reduce = useReducedMotion();
  const brand = tech.icon ? `#${tech.icon.hex}` : undefined;
  return (
    <motion.li
      custom={index}
      variants={reveal}
      initial={reduce ? (false as const) : "hidden"}
      whileInView="show"
      viewport={{ once: true, amount: 0.3 }}
      style={brand ? ({ "--brand": brand } as React.CSSProperties) : undefined}
      className="group flex items-center gap-2.5 rounded-xl border border-border bg-secondary/40 px-3.5 py-2.5 transition duration-200 hover:-translate-y-0.5 hover:border-zinc-600 hover:bg-secondary"
    >
      {tech.icon ? (
        <svg
          role="img"
          aria-hidden
          viewBox="0 0 24 24"
          className="size-5 shrink-0 fill-muted-foreground transition-colors duration-200 group-hover:fill-[var(--brand)]"
        >
          <path d={tech.icon.path} />
        </svg>
      ) : (
        <span className="flex size-5 shrink-0 items-center justify-center rounded text-[0.65rem] font-bold text-muted-foreground transition-colors duration-200 group-hover:text-foreground">
          {monogram(tech.name)}
        </span>
      )}
      <span className="text-sm font-medium text-muted-foreground transition-colors duration-200 group-hover:text-foreground">
        {tech.name}
      </span>
    </motion.li>
  );
}

export function TechStack() {
  const reduce = useReducedMotion();
  const headingProps = {
    initial: reduce ? (false as const) : { opacity: 0, y: 16 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.5 },
    transition: { duration: D.base, ease: EASE },
  };

  return (
    <section id="stack" className="relative z-10 mx-auto max-w-5xl px-6 py-24 md:py-32">
      <motion.p
        {...headingProps}
        className="text-xs font-medium uppercase tracking-[0.28em] text-muted-foreground"
      >
        What I build with
      </motion.p>
      <motion.h2
        {...headingProps}
        className="mb-10 mt-2 text-3xl font-semibold tracking-tight md:text-4xl"
      >
        Tech stack
      </motion.h2>

      <div className="space-y-8">
        {stack.map((group) => (
          <div key={group.label}>
            <h3 className="mb-3 text-sm font-medium uppercase tracking-wide text-foreground/60">
              {group.label}
            </h3>
            <ul className="flex flex-wrap gap-2.5">
              {group.items.map((tech, i) => (
                <TechTile key={tech.name} tech={tech} index={i} />
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
