import { useEffect, useRef, useState } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "motion/react";
import { stack, type Tech } from "@/data/stack";
import { D, EASE, ISO } from "@/lib/motion";
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

/**
 * Resistance-then-snap easing expressed as uneven scroll stops: the value
 * crawls most of the way (resistance), accelerates through, overshoots, then
 * settles. `s` is the window start, `span` its length in scroll progress.
 */
function snapStops(s: number, span: number): [number, number, number, number] {
  return [s, s + span * 0.62, s + span * 0.82, s + span];
}

/** Short label for tech with no brand icon, e.g. "C#", "React Native" -> "RN". */
function monogram(name: string): string {
  const words = name.split(/\s+/);
  if (words.length > 1) return words.map((w) => w[0]).join("").toUpperCase();
  return name.length <= 3 ? name.toUpperCase() : name.slice(0, 2).toUpperCase();
}

function TechTile({
  tech,
  progress,
  start,
  disabled,
}: {
  tech: Tech;
  progress: MotionValue<number>;
  start: number;
  disabled: boolean;
}) {
  const brand = tech.icon ? `#${tech.icon.hex}` : "#ffffff";
  const stops = snapStops(start, 0.14);
  // Lag behind the slab, fly in, then snap; hold settled through progress=1.
  const opacity = useTransform(progress, [start, start + 0.03, 1], [0, 1, 1]);
  const scale = useTransform(progress, [...stops, 1], [0.45, 0.94, 1.04, 1, 1]);
  const y = useTransform(progress, [...stops, 1], [22, 5, -2, 0, 0]);

  const style = disabled
    ? ({ "--brand": brand } as React.CSSProperties)
    : ({ "--brand": brand, opacity, scale, y } as unknown as React.CSSProperties);

  return (
    <motion.li
      style={style}
      className="group flex items-center gap-2.5 rounded-xl border border-border bg-secondary/40 px-3.5 py-2.5"
    >
      {tech.logoUrl ? (
        <img
          src={tech.logoUrl}
          alt={tech.name}
          className="size-5 shrink-0"
        />
      ) : tech.icon ? (
        <svg
          role="img"
          aria-hidden
          viewBox="0 0 24 24"
          className="size-5 shrink-0 fill-muted-foreground transition-[fill] duration-200 group-hover:fill-[var(--brand)]"
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

/** Faint dotted, recessed back pane the slabs click into. */
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
  progress,
  iso,
  disabled,
}: {
  group: (typeof stack)[number];
  index: number;
  progress: MotionValue<number>;
  iso: boolean;
  disabled: boolean;
}) {
  // Card clicks in first; its tiles begin once the slab has nearly landed.
  const cardStart = index * 0.07;
  const cardSpan = 0.26;
  const cardStops = snapStops(cardStart, cardSpan);
  const tileBase = cardStart + 0.2;

  // Hold the settled value through progress=1 so a slab never fades back out.
  const opacity = useTransform(progress, [cardStart, cardStart + 0.04, 1], [0, 1, 1]);
  // Desktop: slide in along Z (into the pane). Flat: rise in along Y.
  const z = useTransform(progress, [...cardStops, 1], [240, 44, -14, 0, 0]);
  const y = useTransform(progress, [...cardStops, 1], [44, 10, -4, 0, 0]);

  const style = disabled
    ? undefined
    : iso
      ? ({ opacity, z } as unknown as React.CSSProperties)
      : ({ opacity, y } as unknown as React.CSSProperties);

  return (
    <motion.div
      style={style}
      className="relative rounded-2xl border border-border bg-card/60 p-5 before:absolute before:inset-0 before:-z-10 before:translate-x-[3px] before:translate-y-[4px] before:rounded-2xl before:bg-zinc-800/70 before:content-['']"
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
          <TechTile
            key={tech.name}
            tech={tech}
            progress={progress}
            start={tileBase + i * 0.025}
            disabled={disabled}
          />
        ))}
      </ul>
    </motion.div>
  );
}

export function TechStack() {
  const reduce = useReducedMotion();
  const desktop = useIsDesktop();
  const iso = desktop && !reduce;
  const disabled = Boolean(reduce);

  // The tall outer section is the scroll track; the inner content pins (sticky)
  // and the assembly scrubs as you scroll through the track.
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  const heading = (
    <>
      <p className="text-xs font-medium uppercase tracking-[0.28em] text-muted-foreground">
        What I build with
      </p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight md:text-4xl">
        Tech stack
      </h2>
      <SectionUnderline />
    </>
  );

  const board = (
    <div style={iso ? { perspective: `${ISO.perspective}px` } : undefined}>
      <div
        className="relative"
        style={
          iso
            ? {
                transform: `rotateX(${ISO.rotateX}deg) rotateZ(${ISO.rotateZ}deg)`,
                transformStyle: "preserve-3d",
              }
            : undefined
        }
      >
        {iso && <Pegboard />}
        <div
          className="grid gap-5 md:grid-cols-2 xl:grid-cols-3"
          style={iso ? { transformStyle: "preserve-3d" } : undefined}
        >
          {stack.map((group, gi) => (
            <Slab
              key={group.label}
              group={group}
              index={gi}
              progress={scrollYProgress}
              iso={iso}
              disabled={disabled}
            />
          ))}
        </div>
      </div>
    </div>
  );

  // Reduced motion: render flat, in-flow, fully assembled.
  if (disabled) {
    return (
      <section id="stack" className="relative z-10 mx-auto max-w-5xl px-6 py-24 md:py-32">
        {heading}
        <div className="mt-10">{board}</div>
      </section>
    );
  }

  // Pinned scrub: tall track + sticky viewport-height stage.
  return (
    <section ref={sectionRef} id="stack" className="relative z-10 h-[220vh]">
      <div className="sticky top-0 flex min-h-screen flex-col justify-center mx-auto max-w-5xl px-6 py-16">
        {heading}
        <div className="mt-10">{board}</div>
      </div>
    </section>
  );
}
