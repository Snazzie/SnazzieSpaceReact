import { createContext, useContext, useRef, type ReactNode } from "react";
import {
  useMotionValue,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "motion/react";

/**
 * Scroll-driven border colour for a grid of cells (borrowed from the Lunar
 * trading section). A provider wraps the grid and tracks its scroll progress
 * through the viewport; each cell subscribes and shifts its border colour as
 * that progress advances, with a small per-cell phase so the colour cascades
 * down the grid.
 */
const ScrollProgressContext = createContext<MotionValue<number> | null>(null);

/**
 * Monochrome luminance sweep using the shadcn dark tokens: border (#262626) ->
 * muted-foreground (#a1a1aa) -> foreground (#fafafa) and back. Borders brighten
 * to near-white at mid-scroll, then settle, staying on-theme.
 */
const BORDER_RAMP = [
  "rgb(38 38 38)",
  "rgb(161 161 170)",
  "rgb(250 250 250)",
  "rgb(161 161 170)",
  "rgb(38 38 38)",
];
const RAMP_STOPS = [0, 0.25, 0.5, 0.75, 1];

export function ScrollBorderProvider({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // Delayed onset: 0 only once the grid's top reaches the viewport centre (so the
  // effect doesn't fire while the section is merely peeking in), 1 when its
  // bottom reaches the centre.
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end center"] });

  return (
    <div ref={ref} className={className}>
      <ScrollProgressContext.Provider value={scrollYProgress}>
        {children}
      </ScrollProgressContext.Provider>
    </div>
  );
}

/**
 * Animated border colour driven by the enclosing ScrollBorderProvider.
 * `phase` (0..~0.4) delays a cell so lower cells light up slightly later.
 * Returns the neutral colour (static) under prefers-reduced-motion.
 */
export function useScrollBorderColor(phase = 0): MotionValue<string> {
  const reduce = useReducedMotion();
  const ctx = useContext(ScrollProgressContext);
  const zero = useMotionValue(0);
  const progress = ctx ?? zero;

  const shifted = useTransform(progress, (v) => Math.min(1, Math.max(0, v - phase)));
  const color = useTransform(shifted, RAMP_STOPS, BORDER_RAMP);
  const neutral = useMotionValue(BORDER_RAMP[0]);

  return reduce ? neutral : color;
}
