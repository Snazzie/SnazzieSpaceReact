import { motion, useReducedMotion, type Variants } from "motion/react";
import {
  ArrowUpRight,
  Bot,
  Briefcase,
  ClipboardCheck,
  Cloud,
  Globe,
  Handshake,
  Server,
  Smartphone,
  type LucideIcon,
} from "lucide-react";
import { D, EASE } from "@/lib/motion";

const LINKEDIN = "https://linkedin.com/in/cooper-a-m/";

const services: { icon: LucideIcon; label: string }[] = [
  { icon: Globe, label: "Web apps & sites" },
  { icon: Smartphone, label: "Cross-platform apps" },
  { icon: Server, label: "APIs & backend services" },
  { icon: Cloud, label: "Cloud architecture & DevOps" },
  { icon: ClipboardCheck, label: "Architecture & infrastructure evaluation" },
  { icon: Bot, label: "AI agents" },
];

const paths: {
  icon: LucideIcon;
  audience: string;
  title: string;
  blurb: string;
}[] = [
  {
    icon: Briefcase,
    audience: "For hiring managers",
    title: "Full-time",
    blurb:
      "Open to permanent roles at high-velocity, ship-fast companies. One hire who covers the whole stack — frontend, backend, apps and the cloud beneath — ships fast and owns it end to end. Speed without the tech debt.",
  },
  {
    icon: Handshake,
    audience: "For founders & VCs",
    title: "Consultation",
    blurb:
      "Backing a team that needs to build? I take products from zero to shipped, de-risk technical bets and pressure-test architecture before you scale. Fractional, advisory or hands-on — scoped per project.",
  },
];

const reveal: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: D.base, ease: EASE, delay: i * 0.06 },
  }),
};

const SPOTLIGHT =
  "radial-gradient(420px circle at var(--cx, 50%) var(--cy, 50%), rgba(255,255,255,0.06), transparent 60%)";

function useCardProps(index: number) {
  const reduce = useReducedMotion();
  const onMove = reduce
    ? undefined
    : (e: React.PointerEvent<HTMLElement>) => {
        const el = e.currentTarget;
        const r = el.getBoundingClientRect();
        el.style.setProperty("--cx", `${e.clientX - r.left}px`);
        el.style.setProperty("--cy", `${e.clientY - r.top}px`);
      };

  return {
    custom: index,
    variants: reveal,
    initial: reduce ? (false as const) : "hidden",
    whileInView: "show" as const,
    viewport: { once: true, amount: 0.2 },
    onPointerMove: onMove,
  };
}

function Spotlight() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-10 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      style={{ background: SPOTLIGHT }}
    />
  );
}

function PathCard({
  path,
  index,
}: {
  path: (typeof paths)[number];
  index: number;
}) {
  const cardProps = useCardProps(index);
  const Icon = path.icon;
  return (
    <motion.div
      {...cardProps}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card p-6 transition duration-200 hover:-translate-y-1 hover:border-zinc-600"
    >
      <Spotlight />
      <div className="relative z-20 flex size-11 items-center justify-center rounded-lg border border-border bg-secondary">
        <Icon className="size-5 text-foreground" />
      </div>
      <span className="relative z-20 mt-4 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {path.audience}
      </span>
      <h3 className="relative z-20 mt-1 text-lg font-semibold text-foreground">
        {path.title}
      </h3>
      <p className="relative z-20 mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
        {path.blurb}
      </p>
    </motion.div>
  );
}

export function HireMe() {
  const reduce = useReducedMotion();
  const headingProps = {
    initial: reduce ? (false as const) : { opacity: 0, y: 16 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.5 },
    transition: { duration: D.base, ease: EASE },
  };

  return (
    <section id="hire" className="relative z-10 mx-auto max-w-5xl px-6 py-24 md:py-32">
      <motion.p
        {...headingProps}
        className="text-xs font-medium uppercase tracking-[0.28em] text-muted-foreground"
      >
        Available for work
      </motion.p>
      <motion.h2
        {...headingProps}
        className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl"
      >
        Hire me
      </motion.h2>

      <motion.p
        {...headingProps}
        className="mt-4 max-w-2xl text-lg leading-relaxed text-foreground/90"
      >
        No WordPress. No page-builders. Real websites and apps built on
        industry-standard frameworks and proper architecture — code that's
        maintainable, fast and made to last.
      </motion.p>

      <motion.ul
        {...headingProps}
        className="mt-6 flex flex-wrap gap-2"
      >
        {services.map((s) => {
          const Icon = s.icon;
          return (
            <li
              key={s.label}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-sm text-muted-foreground"
            >
              <Icon className="size-4 text-foreground/70" />
              {s.label}
            </li>
          );
        })}
      </motion.ul>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {paths.map((path, i) => (
          <PathCard key={path.title} path={path} index={i} />
        ))}
      </div>

      <motion.a
        {...headingProps}
        href={LINKEDIN}
        target="_blank"
        rel="noopener noreferrer"
        whileHover={
          reduce ? undefined : { y: -2, boxShadow: "0 8px 30px rgba(255,255,255,0.13)" }
        }
        className="group mt-8 inline-flex items-center gap-2 rounded-md border border-border bg-foreground px-5 py-2.5 text-sm font-medium text-background"
      >
        Get in touch on LinkedIn
        <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </motion.a>
    </section>
  );
}
