import { motion, useReducedMotion, type Variants } from "motion/react";
import { GithubIcon, LinkedInIcon } from "@/components/icons/SocialIcons";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";
import { D, EASE, rise, stagger } from "@/lib/motion";

const SKILLS = ["C#", "TypeScript", "Rust", "Kubernetes", "Cloudflare"];
const NAME = "Aaron";

const container: Variants = {
  hidden: {},
  show: { transition: stagger(0.08, 0.1) },
};

const charClip: Variants = {
  hidden: { y: "110%" },
  show: { y: 0, transition: { duration: D.slow, ease: EASE } },
};

export function Intro() {
  const reduce = useReducedMotion();
  const initial = reduce ? false : "hidden";

  return (
    <section
      id="home"
      className="relative z-10 flex min-h-[100svh] items-center px-6 pt-24 pb-20"
    >
      <motion.div
        initial={initial}
        animate="show"
        variants={container}
        className="mx-auto grid w-full max-w-5xl items-center gap-12 md:grid-cols-[1.2fr_1fr] md:gap-16"
      >
        {/* Left — intro */}
        <div id="aboutme" className="flex flex-col items-start gap-5 scroll-mt-24">
          <motion.p
            variants={rise}
            className="text-xs font-medium uppercase tracking-[0.28em] text-muted-foreground"
          >
            Software Engineer · All Stack (minus embedded) · England
          </motion.p>

          {/* Kinetic name — per-character mask rise */}
          <h1 className="flex flex-wrap overflow-hidden text-[clamp(3rem,9vw,5.5rem)] font-semibold leading-[0.95] tracking-tight">
            {[...NAME].map((ch, i) => (
              <span
                // biome-ignore lint/suspicious/noArrayIndexKey: fixed static string
                key={i}
                className="inline-block overflow-hidden pb-[0.06em]"
              >
                <motion.span variants={charClip} className="inline-block">
                  {ch}
                </motion.span>
              </span>
            ))}
          </h1>

          <motion.p
            variants={rise}
            className="text-[clamp(1rem,2.4vw,1.35rem)] text-muted-foreground"
          >
            builds things that last
          </motion.p>

          <motion.p
            variants={rise}
            className="max-w-md leading-relaxed text-muted-foreground"
          >
            Builds across the full picture: frontend interfaces, backend services,
            cross-platform apps, cloud architecture and DevOps pipelines. Mainly
            C#, TypeScript and Rust, with a focus on performance and clean systems.
          </motion.p>

          <motion.div variants={rise} className="flex flex-wrap items-center gap-2">
            {SKILLS.map((skill) => (
              <motion.div
                key={skill}
                whileHover={reduce ? undefined : { y: -3 }}
                transition={{ duration: 0.2, ease: EASE }}
              >
                <Badge variant="secondary">{skill}</Badge>
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            variants={rise}
            className="mt-2 flex flex-wrap items-center gap-5"
          >
            <motion.a
              href="#projects"
              whileHover={
                reduce
                  ? undefined
                  : { y: -2, boxShadow: "0 8px 30px rgba(255,255,255,0.13)" }
              }
              transition={{ duration: 0.2, ease: EASE }}
              className="group inline-flex items-center gap-2 rounded-md border border-border bg-foreground px-5 py-2.5 text-sm font-medium text-background"
            >
              View projects
              <ArrowRight
                size={16}
                className="transition-transform group-hover:translate-x-0.5"
              />
            </motion.a>

            <div className="flex items-center gap-5">
              <a
                className="social-link"
                target="_blank"
                rel="noopener noreferrer"
                href="https://github.com/snazzie"
                aria-label="GitHub"
              >
                <GithubIcon />
              </a>
              <a
                className="social-link"
                target="_blank"
                rel="noopener noreferrer"
                href="https://linkedin.com/in/cooper-a-m/"
                aria-label="LinkedIn"
              >
                <LinkedInIcon />
              </a>
            </div>
          </motion.div>
        </div>

        {/* Right — portrait */}
        <motion.div
          variants={rise}
          className="order-first flex justify-center md:order-none md:justify-end"
        >
          <div className="relative">
            <motion.div
              aria-hidden
              className="absolute -inset-4 rounded-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.10),transparent_70%)] blur-2xl"
              animate={reduce ? undefined : { scale: [1, 1.06, 1], opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 5, ease: "easeInOut", repeat: Infinity }}
            />
            {!reduce && (
              <motion.div
                aria-hidden
                className="absolute -inset-2.5 rounded-full border border-white/10"
                animate={{ rotate: 360 }}
                transition={{ duration: 22, ease: "linear", repeat: Infinity }}
              />
            )}
            <img
              className="relative h-44 w-44 rounded-full border border-border object-cover md:h-72 md:w-72"
              alt="Aaron"
              src="https://avatars.githubusercontent.com/u/19627023?v=4"
            />
          </div>
        </motion.div>
      </motion.div>

      {/* Scroll cue */}
      {!reduce && (
        <motion.div
          aria-hidden
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2, duration: D.base }}
          className="absolute bottom-6 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 text-[0.7rem] uppercase tracking-[0.2em] text-muted-foreground"
        >
          <span>scroll</span>
          <span className="h-9 w-px bg-gradient-to-b from-muted-foreground to-transparent" />
        </motion.div>
      )}
    </section>
  );
}
