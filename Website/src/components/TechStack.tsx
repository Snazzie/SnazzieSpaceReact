import { useEffect, useState } from "react";
import { motion, useReducedMotion, type Variants } from "motion/react";
import { stack, type Tech } from "@/data/stack";
import { D, EASE, ISO, SLAB_ENTRANCE_S, SNAP_BOUNCE, SNAP_SPRING } from "@/lib/motion";
import { SectionUnderline } from "@/components/SectionUnderline";

/** True once the viewport is at the `md` breakpoint (>= 768px). */
function useIsDesktop(): boolean {
  const [desktop, setDesktop] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return desktop;
}

const reveal: Variants = {
  hidden: { opacity: 0, scale: 0.85 },
  show: (i: number) => ({
    opacity: 1,
    scale: 1,
    transition: { duration: D.base, ease: EASE, delay: i * 0.035 },
  }),
};

/**
 * Slab entrance. On the flat fallback it is a plain rise-and-fade; on the
 * isometric plane it drifts down slowly (resistance) then snaps through its
 * slot with a small overshoot and settle.
 */
function slabVariants(flat: boolean): Variants {
  if (flat) {
    return {
      hidden: { opacity: 0, y: 16 },
      show: (i: number) => ({
        opacity: 1,
        y: 0,
        transition: { duration: D.base, ease: EASE, delay: i * 0.05 },
      }),
    };
  }
  return {
    hidden: { opacity: 0, z: 220 },
    show: (i: number) => ({
      opacity: [0, 1, 1, 1],
      // Pop out toward the viewer, drift back slowly (resistance), then click
      // flush into the pane with a small overshoot past it and settle.
      z: [220, 40, -14, 0],
      transition: {
        delay: i * 0.1,
        duration: SLAB_ENTRANCE_S,
        times: [0, 0.62, 0.82, 1],
        ease: [
          [0.16, 1, 0.3, 1], // resistance: slow decel approach
          [0.7, 0, 0.84, 0], // snap: accelerate into the pane
          [0.34, 1, 0.3, 1], // settle flush
        ],
      },
    }),
  };
}

/** One-shot ring + glow pulse fired as the slab snaps home. */
const lockCue: Variants = {
  hidden: { opacity: 0, scale: 0.88 },
  show: (i: number) => ({
    opacity: [0, 0.6, 0],
    scale: [0.9, 1.04, 1.08],
    transition: { delay: i * 0.12 + 0.58, duration: 0.45, ease: "easeOut" },
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
      {tech.logoUrl ? (
        <img
          src={tech.logoUrl}
          alt={tech.name}
          className="relative z-10 size-5 shrink-0 transition-transform duration-200 group-hover:scale-110"
        />
      ) : tech.icon ? (
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

/** Faint dotted pegboard backplate sitting behind the slabs on the iso plane. */
function Pegboard() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute -inset-8 -z-10 rounded-3xl border border-border/60 bg-card/20"
      style={{
        transform: "translateZ(-40px)",
        backgroundImage:
          "radial-gradient(circle, color-mix(in srgb, var(--border) 90%, transparent) 1px, transparent 1px)",
        backgroundSize: "22px 22px",
        maskImage:
          "radial-gradient(ellipse 82% 78% at 50% 44%, #000 46%, transparent 100%)",
        WebkitMaskImage:
          "radial-gradient(ellipse 82% 78% at 50% 44%, #000 46%, transparent 100%)",
      }}
    />
  );
}

function Slab({
  group,
  index,
  flat,
}: {
  group: (typeof stack)[number];
  index: number;
  flat: boolean;
}) {
  const drag = flat
    ? {}
    : ({
        drag: true,
        dragSnapToOrigin: true,
        dragElastic: 0.16,
        dragConstraints: { top: 0, bottom: 0, left: 0, right: 0 },
        dragTransition: SNAP_BOUNCE,
        whileHover: { z: 36, transition: SNAP_SPRING },
        whileTap: { cursor: "grabbing" },
      } as const);

  return (
    <motion.div
      custom={index}
      variants={slabVariants(flat)}
      initial={flat ? (false as const) : "hidden"}
      whileInView="show"
      viewport={{ once: true, amount: 0.2 }}
      {...drag}
      className="relative rounded-2xl border border-border bg-card/60 p-5 transition-colors duration-300 before:absolute before:inset-0 before:-z-10 before:translate-x-[3px] before:translate-y-[4px] before:rounded-2xl before:bg-zinc-800/70 before:content-[''] hover:border-zinc-700"
    >
      {!flat && (
        <motion.span
          aria-hidden
          custom={index}
          variants={lockCue}
          className="pointer-events-none absolute -inset-px rounded-2xl ring-1 ring-zinc-300/70"
          style={{
            boxShadow: "0 0 30px -6px color-mix(in srgb, var(--border) 80%, white)",
          }}
        />
      )}
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
  );
}

export function TechStack() {
  const reduce = useReducedMotion();
  const desktop = useIsDesktop();
  const flat = Boolean(reduce) || !desktop;

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
        className="mt-2 text-2xl font-semibold tracking-tight md:text-4xl"
      >
        Tech stack
      </motion.h2>
      <SectionUnderline />

      <div
        className="mt-10"
        style={flat ? undefined : { perspective: `${ISO.perspective}px` }}
      >
        <div
          className="relative"
          style={
            flat
              ? undefined
              : {
                  transform: `rotateX(${ISO.rotateX}deg) rotateZ(${ISO.rotateZ}deg)`,
                  transformStyle: "preserve-3d",
                }
          }
        >
          {!flat && <Pegboard />}
          <div
            className="grid gap-5 md:grid-cols-2 xl:grid-cols-3"
            style={flat ? undefined : { transformStyle: "preserve-3d" }}
          >
            {stack.map((group, gi) => (
              <Slab key={group.label} group={group} index={gi} flat={flat} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
