import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
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

const tileClass =
  "group flex items-center gap-2.5 rounded-xl border border-border bg-secondary/40 px-3.5 py-2.5 cursor-pointer transition-[border-color,box-shadow] duration-200 hover:border-[color-mix(in_srgb,var(--brand)_45%,var(--color-border))] hover:shadow-[0_0_18px_-6px_var(--brand)]";

function TechTileContent({ tech }: { tech: Tech }) {
  return (
    <>
      {tech.logoUrl ? (
        <img src={tech.logoUrl} alt={tech.name} width={20} height={20} className="size-5 shrink-0" />
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

function brandOf(tech: Tech): string {
  return tech.icon ? `#${tech.icon.hex}` : "#ffffff";
}

function TechTile({ tech }: { tech: Tech }) {
  return (
    <li className={tileClass} style={{ "--brand": brandOf(tech) } as React.CSSProperties}>
      <TechTileContent tech={tech} />
    </li>
  );
}

/**
 * Scrub-driven tile: pops in (fade + scale + lift) inside its own slice of the
 * scroll progress, staggered by `order` (0..1 position within the card), so
 * the card "fills up" as it lands flat in the grid.
 */
function AnimatedTechTile({
  tech,
  progress,
  order,
}: {
  tech: Tech;
  progress: MotionValue<number>;
  order: number;
}) {
  const start = 0.58 + order * 0.3;
  const opacity = useTransform(progress, [start, start + 0.1], [0, 1]);
  const scale = useTransform(progress, [start, start + 0.1], [0.6, 1]);
  const y = useTransform(progress, [start, start + 0.1], [10, 0]);
  return (
    <motion.li
      className={tileClass}
      style={{ opacity, scale, y, "--brand": brandOf(tech) } as never}
    >
      <TechTileContent tech={tech} />
    </motion.li>
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
  offset: { dx: number; dy: number; stackY: number } | undefined;
  cardRef: (el: HTMLDivElement | null) => void;
}) {
  const count = stack.length;

  const dx = offset?.dx ?? 0;
  const dy = offset?.dy ?? 0;
  // stackY from measured heights ensures bottom edges are uniformly spaced.
  const stackY = offset?.stackY ?? (index - (count - 1) / 2) * 32;
  // One continuous, monotonic motion across the whole scroll (no sequential
  // snaps, no overshoot, no dead zone): the stack rotates up while it fans out
  // to the grid slots, all overlapping and settling together near the end.
  const rotateX = useTransform(progress, [0, 0.28, 0.58, 0.88, 1], [72, 42, 12, 0, 0]);
  const x = useTransform(progress, [0, 0.15, 0.88, 1], [dx, dx, 0, 0]);
  const y = useTransform(progress, [0, 0.15, 0.88, 1], [dy + stackY, dy + stackY, 0, 0]);

  // Deterministic per-card twist (-3..3deg) that irons out as the card lands,
  // so the deck reads as a hand-stacked pile rather than geometric slabs.
  const jitter = ((index * 53) % 7) - 3;
  const rotateZ = useTransform(progress, [0, 0.6, 0.88], [jitter, jitter * 0.4, 0]);

  // Heavy drop shadow while the card is lifted in the deck, gone once flat.
  const boxShadow = useTransform(
    progress,
    [0, 0.6, 0.95],
    [
      "0px 28px 48px -12px rgba(0, 0, 0, 0.55)",
      "0px 12px 28px -10px rgba(0, 0, 0, 0.35)",
      "0px 0px 0px 0px rgba(0, 0, 0, 0)",
    ],
  );

  // Magnetic tilt: once the grid has settled, cards lean toward the cursor.
  // `settled` gates it to 0 during the scrub so it never fights the fan-out.
  const tiltX = useSpring(0, { stiffness: 220, damping: 22 });
  const tiltY = useSpring(0, { stiffness: 220, damping: 22 });
  const settled = useTransform(progress, [0.92, 1], [0, 1]);
  const totalRotateX = useTransform(
    [rotateX, tiltX, settled],
    (v) => (v[0] as number) + (v[1] as number) * (v[2] as number),
  );
  const totalRotateY = useTransform(
    [tiltY, settled],
    (v) => (v[0] as number) * (v[1] as number),
  );

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    el.style.setProperty("--mx", `${px * 100}%`);
    el.style.setProperty("--my", `${py * 100}%`);
    tiltY.set((px - 0.5) * 7);
    tiltX.set((0.5 - py) * 7);
  };
  const handleMouseLeave = () => {
    tiltX.set(0);
    tiltY.set(0);
  };

  const cardBase =
    "group/card relative flex flex-col rounded-2xl border border-border bg-card p-5";
  const flatCardClass = `${cardBase} h-full`;

  const tiles = (
    <ul className="flex flex-wrap gap-2.5 pointer-events-auto">
      {group.items.map((tech, i) =>
        anim ? (
          <AnimatedTechTile
            key={tech.name}
            tech={tech}
            progress={progress}
            order={i / Math.max(group.items.length - 1, 1)}
          />
        ) : (
          <TechTile key={tech.name} tech={tech} />
        ),
      )}
    </ul>
  );

  // The title lives permanently at the bottom edge: it's the visible label in
  // the stacked side profile and stays as the card's footer in the flat grid.
  const footer = (
    <div className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-3">
      <span className="text-sm font-medium uppercase tracking-wide text-foreground/80">
        {group.label}
      </span>
      <span className="text-[0.7rem] font-medium text-muted-foreground">
        {group.items.length}
      </span>
    </div>
  );

  if (!anim) {
    return (
      <div className={flatCardClass}>
        {tiles}
        {footer}
      </div>
    );
  }
  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={
        {
          x,
          y,
          rotateX: totalRotateX,
          rotateY: totalRotateY,
          rotateZ,
          boxShadow,
          transformOrigin: "center bottom",
          transformStyle: "preserve-3d",
          pointerEvents: "auto",
        } as unknown as React.CSSProperties
      }
      className={cardBase}
    >
      {/* Cursor spotlight: radial highlight tracking the mouse across the card. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover/card:opacity-100"
        style={{
          background:
            "radial-gradient(280px circle at var(--mx, 50%) var(--my, 50%), rgba(255, 255, 255, 0.07), transparent 70%)",
        }}
      />
      {tiles}
      {footer}
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
  const [offsets, setOffsets] = useState<{ dx: number; dy: number; stackY: number }[]>([]);

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
      const els = cardEls.current;
      const count = els.length;
      const heights = els.map((el) => el?.offsetHeight ?? 0);
      const avgH = heights.reduce((a, b) => a + b, 0) / count;
      // Uniform 32px bottom-edge spacing, stack centred on ay:
      // stackY_i = (i-(count-1)/2)*32 + (avgH - h_i)/2
      setOffsets(
        els.map((el, i) =>
          el
            ? {
                dx: ax - (el.offsetLeft + el.offsetWidth / 2),
                dy: ay - (el.offsetTop + el.offsetHeight / 2),
                stackY: (i - (count - 1) / 2) * 32 + (avgH - el.offsetHeight) / 2,
              }
            : { dx: 0, dy: 0, stackY: 0 },
        ),
      );
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [anim]);

  // Spring-smoothed scrub: the deck carries a little inertia instead of being
  // glued 1:1 to the scrollbar.
  const sprung = useSpring(scrollYProgress, { stiffness: 90, damping: 24, restDelta: 0.001 });

  // Begin slightly into the animation so the resting/entry pose is the readable
  // angled stack rather than the very-steep first frame.
  const p = useTransform(sprung, [0, 1], [0.08, 1]);

  // Virtual camera: start zoomed into the big thick stack (fills the screen)
  // and panned up, then zoom/pan out so the cards return to original size and
  // fit the grid.
  const zoom = useTransform(p, [0, 0.88, 1], [2.1, 1, 1]);
  const camY = useTransform(p, [0, 0.88, 1], [-150, 0, 0]);

  const heading = (
    <div className="text-center">
      <p className="text-xs font-medium uppercase tracking-[0.28em] text-muted-foreground">
        What I build with
      </p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight md:text-4xl">
        Tech stack
      </h2>
      <SectionUnderline />
    </div>
  );

  // Static / mobile fallback: plain flat grid, in flow. Without reduced motion
  // each card still gets a once-only in-view fade-up so the section isn't dead.
  if (!anim) {
    return (
      <section id="stack" className="relative z-10 mx-auto max-w-5xl px-6 py-24 md:py-32">
        {heading}
        <div className="relative mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {stack.map((group, gi) => {
            const card = (
              <Slab
                key={group.label}
                group={group}
                index={gi}
                progress={scrollYProgress}
                anim={false}
                offset={undefined}
                cardRef={() => {}}
              />
            );
            if (reduce) return card;
            return (
              <motion.div
                key={group.label}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.5, delay: gi * 0.08, ease: "easeOut" }}
              >
                {card}
              </motion.div>
            );
          })}
        </div>
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
          <motion.div style={{ scale: zoom, y: camY, transformStyle: "preserve-3d" }}>
            <div
              ref={gridRef}
              className="relative grid gap-5 md:grid-cols-2 xl:grid-cols-3"
              style={{ transformStyle: "preserve-3d" }}
            >
              {stack.map((group, gi) => (
                <Slab
                  key={group.label}
                  group={group}
                  index={gi}
                  progress={p}
                  anim
                  offset={offsets[gi]}
                  cardRef={(el) => {
                    cardEls.current[gi] = el;
                  }}
                />
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
