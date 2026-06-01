import { AnimatePresence, motion, useReducedMotion, type Variants } from "motion/react";
import { useEffect, useState } from "react";
import { GithubIcon, LinkedInIcon } from "@/components/icons/SocialIcons";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";
import { D, EASE, rise, stagger } from "@/lib/motion";

const SKILLS = ["C#", "TypeScript", "React", "Node", "Rust", "Kubernetes", "Cloudflare", "AI Agents"];
const NAMES = ["Aaron", "Snazzie"];

const container: Variants = {
  hidden: {},
  show: { transition: stagger(0.08, 0.1) },
};

type VariantStyle = {
  kind: "variant";
  /** Whether each character is masked (overflow clipped); used for slide reveals. */
  clip: boolean;
  container: Variants;
  char: Variants;
};
type ScrambleStyle = { kind: "scramble" };
type NameStyle = VariantStyle | ScrambleStyle;

const fwd = (s = 0.05): Variants["show"] => ({ transition: { staggerChildren: s } });
const rev = (s = 0.04): Variants["exit"] => ({
  transition: { staggerChildren: s, staggerDirection: -1 },
});

/** Pool of per-flip transition styles; one is picked at random on each change. */
const NAME_STYLES: NameStyle[] = [
  // 1: Vertical mask: chars slide up into a clipped frame, exit upward.
  {
    kind: "variant",
    clip: true,
    container: { hidden: {}, show: fwd(0.06), exit: rev(0.045) },
    char: {
      hidden: { y: "115%" },
      show: { y: 0, transition: { duration: D.slow, ease: EASE } },
      exit: { y: "-115%", transition: { duration: D.base, ease: EASE } },
    },
  },
  // 2: 3D flip: each char tumbles in on the X axis.
  {
    kind: "variant",
    clip: false,
    container: { hidden: {}, show: fwd(0.07), exit: rev(0.05) },
    char: {
      hidden: { rotateX: -100, opacity: 0, y: "30%" },
      show: { rotateX: 0, opacity: 1, y: 0, transition: { duration: D.base, ease: EASE } },
      exit: { rotateX: 100, opacity: 0, y: "-30%", transition: { duration: D.fast, ease: EASE } },
    },
  },
  // 3: Spin pop: chars spring up from nothing while un-spinning.
  {
    kind: "variant",
    clip: false,
    container: { hidden: {}, show: fwd(0.055), exit: rev(0.035) },
    char: {
      hidden: { scale: 0, rotate: -160, opacity: 0 },
      show: {
        scale: 1,
        rotate: 0,
        opacity: 1,
        transition: { type: "spring", stiffness: 380, damping: 16 },
      },
      exit: { scale: 0, rotate: 160, opacity: 0, transition: { duration: D.fast, ease: EASE } },
    },
  },
  // 4: Glitch: RGB-split jitter with rapid opacity flicker.
  {
    kind: "variant",
    clip: false,
    container: { hidden: {}, show: fwd(0.03), exit: rev(0.03) },
    char: {
      hidden: { opacity: 0 },
      show: {
        opacity: [0, 1, 0.4, 1, 0.7, 1],
        x: [0, -6, 6, -3, 2, 0],
        skewX: [0, 16, -12, 7, -2, 0],
        textShadow: [
          "0px 0px 0px rgba(255,40,90,0), 0px 0px 0px rgba(0,240,255,0)",
          "3px 0px 0px rgba(255,40,90,0.9), -3px 0px 0px rgba(0,240,255,0.9)",
          "-4px 0px 0px rgba(255,40,90,0.9), 4px 0px 0px rgba(0,240,255,0.9)",
          "2px 0px 0px rgba(255,40,90,0.7), -2px 0px 0px rgba(0,240,255,0.7)",
          "-1px 0px 0px rgba(255,40,90,0.5), 1px 0px 0px rgba(0,240,255,0.5)",
          "0px 0px 0px rgba(255,40,90,0), 0px 0px 0px rgba(0,240,255,0)",
        ],
        transition: { duration: 0.6, ease: "linear" },
      },
      exit: {
        opacity: [1, 0.5, 0],
        x: [0, 9, -12],
        skewX: [0, -16, 12],
        transition: { duration: D.fast, ease: "linear" },
      },
    },
  },
  // 5: Blur focus: chars resolve out of a soft blur while rising slightly.
  {
    kind: "variant",
    clip: false,
    container: { hidden: {}, show: fwd(0.05), exit: rev(0.035) },
    char: {
      hidden: { opacity: 0, filter: "blur(12px)", y: "20%" },
      show: {
        opacity: 1,
        filter: "blur(0px)",
        y: 0,
        transition: { duration: D.slow, ease: EASE },
      },
      exit: {
        opacity: 0,
        filter: "blur(12px)",
        y: "-20%",
        transition: { duration: D.base, ease: EASE },
      },
    },
  },
  // 6: Elastic drop: chars spring down from above and settle with overshoot.
  {
    kind: "variant",
    clip: false,
    container: { hidden: {}, show: fwd(0.06), exit: rev(0.04) },
    char: {
      hidden: { y: "-120%", opacity: 0 },
      show: {
        y: 0,
        opacity: 1,
        transition: { type: "spring", stiffness: 320, damping: 14 },
      },
      exit: { y: "120%", opacity: 0, transition: { duration: D.fast, ease: EASE } },
    },
  },
  // 7: Horizontal swipe: chars slide in from the left through a clipped frame.
  {
    kind: "variant",
    clip: true,
    container: { hidden: {}, show: fwd(0.05), exit: rev(0.04) },
    char: {
      hidden: { x: "-115%" },
      show: { x: 0, transition: { duration: D.slow, ease: EASE } },
      exit: { x: "115%", transition: { duration: D.base, ease: EASE } },
    },
  },
  // 8: Depth punch: chars zoom in oversized and blurred, then snap to place.
  {
    kind: "variant",
    clip: false,
    container: { hidden: {}, show: fwd(0.05), exit: rev(0.035) },
    char: {
      hidden: { scale: 2.4, opacity: 0, filter: "blur(8px)" },
      show: {
        scale: 1,
        opacity: 1,
        filter: "blur(0px)",
        transition: { type: "spring", stiffness: 300, damping: 20 },
      },
      exit: {
        scale: 0.4,
        opacity: 0,
        filter: "blur(8px)",
        transition: { duration: D.fast, ease: EASE },
      },
    },
  },
  // 9: Scramble / split-flap board (see Scramble component).
  { kind: "scramble" },
];

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ$#%&@*+".split("");
const randGlyph = () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)];

/** Split-flap / departure-board effect: each char riffles through random glyphs, then locks. */
function Scramble({ name, reduce }: { name: string; reduce: boolean | null }) {
  const target = [...name];
  const [display, setDisplay] = useState<string[]>(target);
  const [settled, setSettled] = useState<boolean[]>(() => target.map(() => true));

  // biome-ignore lint/correctness/useExhaustiveDependencies: keyed by `name`, remounts per flip
  useEffect(() => {
    if (reduce) {
      setDisplay(target);
      setSettled(target.map(() => true));
      return;
    }
    let tick = 0;
    const settleAt = target.map((_, i) => 4 + i * 3);
    const max = Math.max(...settleAt);
    setSettled(target.map(() => false));
    const id = window.setInterval(() => {
      tick += 1;
      setDisplay(target.map((c, i) => (tick >= settleAt[i] ? c : randGlyph())));
      setSettled(target.map((_, i) => tick >= settleAt[i]));
      if (tick >= max) {
        setDisplay(target);
        setSettled(target.map(() => true));
        window.clearInterval(id);
      }
    }, 50);
    return () => window.clearInterval(id);
  }, [name, reduce]);

  return (
    <motion.span
      className="absolute left-0 top-0 flex"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: D.fast } }}
      exit={{ opacity: 0, transition: { duration: D.fast } }}
    >
      {display.map((c, i) => (
        <span
          // biome-ignore lint/suspicious/noArrayIndexKey: positional glyph slot
          key={i}
          className={`inline-block pb-[0.06em] tabular-nums transition-colors ${
            settled[i] ? "" : "text-muted-foreground/70"
          }`}
        >
          {c}
        </span>
      ))}
    </motion.span>
  );
}

function KineticName() {
  const reduce = useReducedMotion();
  // Hold both the current name index and the style chosen for this name.
  const [{ index, style }, setState] = useState({ index: 0, style: 0 });

  useEffect(() => {
    if (reduce) return;
    const id = window.setInterval(() => {
      setState((prev) => {
        let next = Math.floor(Math.random() * NAME_STYLES.length);
        if (next === prev.style) next = (next + 1) % NAME_STYLES.length;
        return { index: (prev.index + 1) % NAMES.length, style: next };
      });
    }, 3500);
    return () => window.clearInterval(id);
  }, [reduce]);

  const name = NAMES[index];
  const active = NAME_STYLES[style];

  return (
    <h1 className="relative inline-flex text-[clamp(2.5rem,9vw,5.5rem)] font-semibold leading-[0.95] tracking-tight [perspective:700px]">
      {/* invisible sizer reserves the box so absolutely-layered names can cross-fade */}
      <span aria-hidden className="invisible whitespace-pre pb-[0.06em]">
        Snazzie
      </span>
      {/* no mode="wait": outgoing and incoming animate together for a fluid swap */}
      <AnimatePresence initial={false}>
        {active.kind === "scramble" ? (
          <Scramble key={name} name={name} reduce={reduce} />
        ) : (
          <motion.span
            key={name}
            className="absolute left-0 top-0 flex"
            variants={active.container}
            initial="hidden"
            animate="show"
            exit="exit"
          >
            {[...name].map((ch, i) => (
              <span
                // biome-ignore lint/suspicious/noArrayIndexKey: fixed static string
                key={i}
                className={`inline-block pb-[0.06em] ${active.clip ? "overflow-hidden" : ""}`}
              >
                <motion.span variants={active.char} className="inline-block">
                  {ch}
                </motion.span>
              </span>
            ))}
          </motion.span>
        )}
      </AnimatePresence>
    </h1>
  );
}

export function Intro({
  avatarSrc = "https://avatars.githubusercontent.com/u/19627023?v=4",
}: { avatarSrc?: string } = {}) {
  const reduce = useReducedMotion();
  const initial = reduce ? false : "hidden";

  return (
    <section
      id="home"
      className="relative z-10 flex min-h-[100dvh] items-start md:items-center px-6 pt-24 pb-20"
    >
      <motion.div
        initial={initial}
        animate="show"
        variants={container}
        className="mx-auto grid w-full max-w-5xl items-center gap-6 md:grid-cols-[1.2fr_1fr] md:gap-16"
      >
        {/* Left: intro */}
        <div id="aboutme" className="flex flex-col items-start gap-5 scroll-mt-24">
          <motion.p
            variants={rise}
            className="text-xs font-medium uppercase tracking-[0.28em] text-muted-foreground"
          >
            Software Engineer · All Stack (minus embedded) · England
          </motion.p>

          {/* Kinetic name: flips between Aaron / Snazzie with per-character mask */}
          <KineticName />

          <motion.p
            variants={rise}
            className="text-[clamp(1rem,2.4vw,1.35rem)] text-muted-foreground"
          >
            builds things that last
          </motion.p>

          {/* Plain element — no motion wrapper so the browser paints this text
              immediately as the LCP candidate without waiting for JS hydration. */}
          <p className="max-w-md leading-relaxed text-muted-foreground">
            Full-stack across frontend, backend, cross-platform apps and cloud,
            focused on performance and clean systems.
          </p>

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

        {/* Right: portrait */}
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
              className="relative h-36 w-36 sm:h-44 sm:w-44 rounded-full border border-border object-cover md:h-72 md:w-72"
              alt="Aaron"
              src={avatarSrc}
              width={288}
              height={288}
              fetchPriority="high"
              loading="eager"
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
