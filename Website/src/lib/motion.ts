import type { Transition, Variants } from "motion/react";

/** Primary easing curve shared across every entrance and reveal. */
export const EASE = [0.2, 0.7, 0.2, 1] as const;

/** Duration tokens (seconds). */
export const D = {
  fast: 0.4,
  base: 0.6,
  slow: 0.8,
} as const;

/** Reusable rise-and-fade variant for items entering the viewport. */
export const rise: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: D.base, ease: EASE } },
};

/**
 * Container transition that staggers its children's entrance.
 * Spread into a variant's `transition`.
 */
export function stagger(staggerChildren = 0.08, delayChildren = 0): Transition {
  return { staggerChildren, delayChildren };
}

/**
 * Stiff, low-damping spring shared by the tech-stack snap motion.
 * Used for the hover snap-back so the slab returns with a firm overshoot.
 */
export const SNAP_SPRING: Transition = {
  type: "spring",
  stiffness: 700,
  damping: 18,
  mass: 0.9,
};

/** Bounce params for drag snap-back, matched to {@link SNAP_SPRING}. */
export const SNAP_BOUNCE = { bounceStiffness: 700, bounceDamping: 18 } as const;

/** Isometric lean for the tech-stack pegboard plane (degrees / px perspective). */
export const ISO = { rotateX: 26, rotateZ: -7, perspective: 1100 } as const;

/** Total seconds of the slab entrance (resistance + snap). */
export const SLAB_ENTRANCE_S = 0.92;
