import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "motion/react";
import { stack, type Tech } from "@/data/stack";
import { SectionUnderline } from "@/components/SectionUnderline";

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

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

/** Short label for tech with no brand icon, e.g. "C#", "React Native" -> "RN". */
function monogram(name: string): string {
  const words = name.split(/\s+/);
  if (words.length > 1) return words.map((w) => w[0]).join("").toUpperCase();
  return name.length <= 3 ? name.toUpperCase() : name.slice(0, 2).toUpperCase();
}

function TechTileContent({ tech }: { tech: Tech }) {
  return (
    <>
      {tech.logoUrl ? (
        <img src={tech.logoUrl} alt={tech.name} className="size-5 shrink-0" />
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
    </>
  );
}

function TechTile({ tech }: { tech: Tech }) {
  const brand = tech.icon ? `#${tech.icon.hex}` : "#ffffff";
  // Tags are static on the card face; they are simply revealed as the card
  // rotates open. Only the hover colour change remains.
  return (
    <li
      className="group flex items-center gap-2.5 rounded-xl border border-border bg-secondary/40 px-3.5 py-2.5"
      style={{ "--brand": brand } as React.CSSProperties}
    >
      <TechTileContent tech={tech} />
    </li>
  );
}

function Slab({
  group,
  index,
  progress,
  anim,
  offset,
  cardRef,
}: {
  group: (typeof stack)[number];
  index: number;
  progress: MotionValue<number>;
  anim: boolean;
  offset: { dx: number; dy: number } | undefined;
  cardRef: (el: HTMLDivElement | null) => void;
}) {
  const count = stack.length;

  // Stage 1: a stack of cards seen long-edge-on (tilted back so only each
  // card's bottom edge label shows), staggered into a readable vertical stack.
  const rotateX = useTransform(progress, [0, 0.15, 0.2, 0.24, 1], [76, 24, -5, 0, 0]);
  const dx = offset?.dx ?? 0;
  const dy = offset?.dy ?? 0;
  // Vertical offset that lays the cards out as a light, neat stack at center.
  const stackGap = 32;
  const stackY = (index - (count - 1) / 2) * stackGap;
  // Stage 2: cards stand up and fan out from the stack to their grid slots.
  const fan = [0.24, 0.4, 0.5, 0.56, 1] as const;
  const x = useTransform(progress, fan, [dx, dx * 0.3, -dx * 0.05, 0, 0]);
  const y = useTransform(progress, fan, [dy + stackY, dy * 0.3, -dy * 0.05, 0, 0]);
  const scale = useTransform(progress, [0.24, 0.56, 1], [0.94, 1, 1]);
  const opacity = useTransform(progress, [0, 0.02, 1], [0, 1, 1]);
  // The edge label is the visible strip while stacked; it fades as cards open.
  // Hold at 0 through progress=1 so it never extrapolates back in.
  const edgeLabelOpacity = useTransform(progress, [0.05, 0.18, 1], [1, 0, 0]);
  // The normal in-card header fades in once the cards are facing the viewer.
  const headerOpacity = useTransform(progress, [0.18, 0.3, 1], [0, 1, 1]);

  // Chunky extruded bottom edge gives each card the depth of a ~2cm plate.
  const cardClass =
    "relative rounded-2xl border border-border bg-card/90 p-5 before:absolute before:inset-x-0 before:top-0 before:bottom-[-13px] before:-z-10 before:rounded-2xl before:bg-gradient-to-b before:from-zinc-700 before:to-zinc-950 before:content-['']";

  const header = (
    <div className="mb-4 flex items-center justify-between">
      <h3 className="text-sm font-medium uppercase tracking-wide text-foreground/60">
        {group.label}
      </h3>
      <span className="rounded-full border border-border px-2 py-0.5 text-[0.7rem] font-medium text-muted-foreground">
        {group.items.length}
      </span>
    </div>
  );

  const tiles = (
    <ul className="flex flex-wrap gap-2.5">
      {group.items.map((tech) => (
        <TechTile key={tech.name} tech={tech} />
      ))}
    </ul>
  );

  if (!anim) {
    return (
      <div className={cardClass}>
        {header}
        {tiles}
      </div>
    );
  }
  return (
    <motion.div
      ref={cardRef}
      style={
        {
          x,
          y,
          rotateX,
          scale,
          opacity,
          transformOrigin: "center bottom",
        } as unknown as React.CSSProperties
      }
      className={cardClass}
    >
      <motion.div style={{ opacity: headerOpacity }}>{header}</motion.div>
      {tiles}
      {/* Bottom edge label visible in the stacked side profile. */}
      <motion.div
        aria-hidden
        style={{ opacity: edgeLabelOpacity }}
        className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 rounded-b-2xl border-t border-border bg-card px-5 py-2"
      >
        <span className="text-sm font-medium uppercase tracking-wide text-foreground/80">
          {group.label}
        </span>
        <span className="text-[0.7rem] font-medium text-muted-foreground">
          {group.items.length}
        </span>
      </motion.div>
    </motion.div>
  );
}

export function TechStack() {
  const reduce = useReducedMotion();
  const desktop = useIsDesktop();
  const anim = desktop && !reduce;

  const sectionRef = useRef<HTMLElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const cardEls = useRef<(HTMLDivElement | null)[]>([]);
  const [offsets, setOffsets] = useState<{ dx: number; dy: number }[]>([]);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  // Measure each card's grid slot so it can collapse to the deck and fan back.
  // offsetLeft/Top are layout positions (unaffected by transforms), so this is
  // stable to re-run on resize even while the cards are mid-transform.
  useIsoLayoutEffect(() => {
    if (!anim) return;
    const measure = () => {
      const grid = gridRef.current;
      if (!grid) return;
      const ax = grid.clientWidth / 2;
      const ay = grid.clientHeight / 2;
      setOffsets(
        cardEls.current.map((el) =>
          el
            ? { dx: ax - (el.offsetLeft + el.offsetWidth / 2), dy: ay - (el.offsetTop + el.offsetHeight / 2) }
            : { dx: 0, dy: 0 },
        ),
      );
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [anim]);

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

  const grid = (
    <div
      ref={gridRef}
      className="relative grid gap-5 md:grid-cols-2 xl:grid-cols-3"
      style={anim ? { transformStyle: "preserve-3d" } : undefined}
    >
      {stack.map((group, gi) => (
        <Slab
          key={group.label}
          group={group}
          index={gi}
          progress={scrollYProgress}
          anim={anim}
          offset={offsets[gi]}
          cardRef={(el) => {
            cardEls.current[gi] = el;
          }}
        />
      ))}
    </div>
  );

  // Static fallback (reduced motion / mobile): plain flat grid, in flow.
  if (!anim) {
    return (
      <section id="stack" className="relative z-10 mx-auto max-w-5xl px-6 py-24 md:py-32">
        {heading}
        <div className="mt-10">{grid}</div>
      </section>
    );
  }

  // Pinned scrub: tall track + sticky stage. The grid sits on a perspective
  // parent so the cards flip in 3D, and settles to a flat, head-on grid.
  return (
    <section ref={sectionRef} id="stack" className="relative z-10 h-[220vh]">
      <div className="sticky top-0 flex min-h-screen flex-col justify-center mx-auto max-w-5xl px-6 py-16">
        {heading}
        <div className="mt-10" style={{ perspective: "1200px" }}>
          {grid}
        </div>
      </div>
    </section>
  );
}
