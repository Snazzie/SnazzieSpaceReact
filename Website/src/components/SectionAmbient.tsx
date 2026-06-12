import { motion, useReducedMotion } from "motion/react";

interface Props {
  /** Center color of the radial wash, e.g. "rgba(52,211,153,0.07)". Keep alpha low. */
  color: string;
  className?: string;
}

/**
 * Full-bleed ambient color wash behind a section. Fades in as the section
 * enters the viewport and back out as it leaves, giving the page a color
 * journey instead of a uniform black scroll. Positioned behind the section's
 * content via negative z-index; the parent section must be `relative`.
 */
export function SectionAmbient({ color, className = "" }: Props) {
  const reduce = useReducedMotion();
  const background = `radial-gradient(ellipse 60% 50% at 50% 50%, ${color}, transparent 70%)`;
  const position =
    "pointer-events-none absolute -z-10 left-1/2 top-1/2 h-[140%] w-[120vw] -translate-x-1/2 -translate-y-1/2";

  if (reduce) {
    return <div aria-hidden className={`${position} ${className}`} style={{ background }} />;
  }

  return (
    <motion.div
      aria-hidden
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ amount: 0.2 }}
      transition={{ duration: 1.1, ease: "easeOut" }}
      className={`${position} ${className}`}
      style={{ background }}
    />
  );
}
