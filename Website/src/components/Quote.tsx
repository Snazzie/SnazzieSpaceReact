import { motion, useReducedMotion, type Variants } from "motion/react";
import { D, EASE } from "@/lib/motion";

const reveal: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: D.slow, ease: EASE } },
};

export function Quote() {
  const reduce = useReducedMotion();

  return (
    <section className="relative z-10 px-6 py-28 md:py-36">
      <motion.figure
        variants={reveal}
        initial={reduce ? false : "hidden"}
        whileInView="show"
        viewport={{ once: true, amount: 0.4 }}
        className="mx-auto max-w-3xl text-center"
      >
        <span
          aria-hidden
          className="block select-none text-[clamp(4rem,12vw,7rem)] font-semibold leading-none text-muted-foreground/15"
        >
          &ldquo;
        </span>
        <blockquote className="-mt-6 text-balance text-[clamp(1.35rem,3.4vw,2.1rem)] font-medium leading-snug tracking-tight">
          You&rsquo;re working amongst really good imposters who faked their way
          to their position. Don&rsquo;t let their inexperience and politics
          discourage your growth.
        </blockquote>
      </motion.figure>
    </section>
  );
}
