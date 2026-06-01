import { motion, useReducedMotion, type Variants } from "motion/react";
import { stack, type Tech } from "@/data/stack";
import { D, EASE } from "@/lib/motion";
import { SectionUnderline } from "@/components/SectionUnderline";

const reveal: Variants = {
  hidden: { opacity: 0, scale: 0.85 },
  show: (i: number) => ({
    opacity: 1,
    scale: 1,
    transition: { duration: D.base, ease: EASE, delay: i * 0.035 },
  }),
};

const groupReveal: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: D.base, ease: EASE, delay: i * 0.08 },
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
  const brand = tech.icon ? `#${tech.icon.hex}` : "#ffffff";
  const onMove = reduce
    ? undefined
    : (e: React.PointerEvent<HTMLElement>) => {
        const r = e.currentTarget.getBoundingClientRect();
        e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
        e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
      };
  return (
    <motion.li
      custom={index}
      variants={reveal}
      initial={reduce ? (false as const) : "hidden"}
      whileInView="show"
      viewport={{ once: true, amount: 0.3 }}
      onPointerMove={onMove}
      style={{ "--brand": brand } as React.CSSProperties}
      className="group relative flex items-center gap-2.5 overflow-hidden rounded-xl border border-border bg-secondary/40 px-3.5 py-2.5 transition duration-200 hover:-translate-y-0.5 hover:bg-secondary hover:border-[color-mix(in_srgb,var(--brand)_55%,var(--border))] hover:shadow-[0_0_24px_-4px_color-mix(in_srgb,var(--brand)_45%,transparent)]"
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(120px circle at var(--mx, 50%) var(--my, 50%), color-mix(in srgb, var(--brand) 22%, transparent), transparent 70%)",
        }}
      />
      {tech.icon ? (
        <svg
          role="img"
          aria-hidden
          viewBox="0 0 24 24"
          className="relative z-10 size-5 shrink-0 fill-muted-foreground transition-[fill,transform] duration-200 group-hover:fill-[var(--brand)] group-hover:scale-110"
        >
          <path d={tech.icon.path} />
        </svg>
      ) : (
        <span className="relative z-10 flex size-5 shrink-0 items-center justify-center rounded text-[0.65rem] font-bold text-muted-foreground transition-[color,transform] duration-200 group-hover:text-foreground group-hover:scale-110">
          {monogram(tech.name)}
        </span>
      )}
      <span className="relative z-10 text-sm font-medium text-muted-foreground transition-colors duration-200 group-hover:text-foreground">
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
        className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl"
      >
        Tech stack
      </motion.h2>
      <SectionUnderline />

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {stack.map((group, gi) => (
          <motion.div
            key={group.label}
            custom={gi}
            variants={groupReveal}
            initial={reduce ? (false as const) : "hidden"}
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            className="rounded-2xl border border-border bg-card/50 p-5 transition-colors duration-300 hover:border-zinc-700"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-medium uppercase tracking-wide text-foreground/60">
                {group.label}
              </h3>
              <span className="rounded-full border border-border px-2 py-0.5 text-[0.7rem] font-medium text-muted-foreground">
                {group.items.length}
              </span>
            </div>
            <ul className="flex flex-wrap gap-2.5">
              {group.items.map((tech, i) => (
                <TechTile key={tech.name} tech={tech} index={i} />
              ))}
            </ul>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
