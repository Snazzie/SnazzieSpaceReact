import { motion, useReducedMotion } from "motion/react";
import { D, EASE } from "@/lib/motion";

/**
 * A 1px decorative underline that draws left-to-right on scroll-into-view.
 * Place directly after the section h2. Respects `prefers-reduced-motion`.
 */
export function SectionUnderline({ className = "mb-10" }: { className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      aria-hidden
      className={`mt-2 h-px w-full origin-left bg-border ${className}`}
      initial={reduce ? false : { scaleX: 0 }}
      whileInView={{ scaleX: 1 }}
      viewport={{ once: true, amount: 0.5 }}
      transition={{ duration: D.slow, ease: EASE }}
    />
  );
}
