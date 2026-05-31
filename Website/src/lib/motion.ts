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
