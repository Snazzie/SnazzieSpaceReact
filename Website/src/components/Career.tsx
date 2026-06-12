import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Badge } from "@/components/ui/badge";
import { experience, education } from "@/data/experience";
import { D, EASE } from "@/lib/motion";
import { SectionUnderline } from "@/components/SectionUnderline";

interface TimelineItem {
  period: string;
  title: string;
  description: string;
}

interface TimelineGroup {
  name: string;
  subtitle: string; // role or degree
  logo: string;
  logoBg?: string;
  href: string;
  range: string; // "Jul 2022 – Present · 3 yrs 11 mos"
  detail: string; // location or grade
  skills: string[];
  extraSkillCount: number;
  items: TimelineItem[];
}

const groups: TimelineGroup[] = [
  ...experience.map((job) => ({
    name: job.company,
    subtitle: `${job.role} · ${job.type}`,
    logo: job.logo,
    logoBg: job.logoBg,
    href: job.href,
    range: `${job.start} – ${job.end} · ${job.duration}`,
    detail: job.location,
    skills: job.skills,
    extraSkillCount: job.extraSkillCount,
    items: job.subroles.map((sub) => ({
      period: sub.period,
      title: sub.title,
      description: sub.description,
    })),
  })),
  ...education.map((edu) => ({
    name: edu.institution,
    subtitle: edu.degree,
    logo: edu.logo,
    logoBg: undefined,
    href: edu.href,
    range: edu.period,
    detail: edu.grade,
    skills: [],
    extraSkillCount: 0,
    items: [
      {
        period: edu.period.replace(/\s/g, ""),
        title: "University life",
        description: edu.activities.join(". ") + ".",
      },
    ],
  })),
];

// flat item list with back-pointers to groups, for active tracking
const flatItems = groups.flatMap((group, groupIndex) =>
  group.items.map((item) => ({ item, group, groupIndex })),
);

function itemYear(period: string) {
  return period.slice(0, 4);
}

function RiderLogo({ group }: { group: TimelineGroup }) {
  return (
    <div
      className="pointer-events-none sticky top-[calc(42vh-22px)] z-20 -ml-[22px] flex size-11 items-center justify-center overflow-hidden rounded-full border-2 border-cyan-400/70 shadow-[0_0_20px_5px_rgba(34,211,238,0.22),0_8px_24px_rgba(0,0,0,0.5)]"
      style={{ background: group.logoBg ?? "#18181b" }}
    >
      <img src={group.logo} alt={group.name} width={44} height={44} className="size-full object-contain p-2" />
    </div>
  );
}

function ItemCard({
  item,
  group,
  active,
  reduce,
}: {
  item: TimelineItem;
  group: TimelineGroup;
  active: boolean;
  reduce: boolean;
}) {
  return (
    <motion.a
      href={group.href}
      target="_blank"
      rel="noopener noreferrer"
      initial={reduce ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: D.base, ease: EASE }}
      className={`relative block transition-[opacity,transform] duration-500 ${
        active ? "opacity-100" : "md:translate-x-2 md:opacity-30"
      }`}
    >
      {/* node dot */}
      <span
        className={`absolute -left-[44px] top-3 size-2.5 rounded-full border-2 border-background transition-all duration-500 ${
          active ? "bg-cyan-400 shadow-[0_0_10px_2px_rgba(34,211,238,0.4)]" : "bg-zinc-700"
        }`}
      />
      <div
        className={`rounded-2xl border bg-card p-5 transition-colors duration-500 md:p-6 ${
          active ? "border-zinc-600" : "border-border"
        }`}
      >
        <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-cyan-400">
          {item.period}
        </p>
        <h3 className="mt-1 text-base font-semibold text-foreground md:text-lg">{item.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
      </div>
    </motion.a>
  );
}

function SwapText({
  swapKey,
  reduce,
  className,
  distance = 12,
  delay = 0,
  children,
}: {
  swapKey: string;
  reduce: boolean;
  className?: string;
  distance?: number;
  delay?: number;
  children: React.ReactNode;
}) {
  if (reduce) {
    return <div className={className}>{children}</div>;
  }
  return (
    <div className={`relative overflow-hidden ${className ?? ""}`}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={swapKey}
          initial={{ y: distance, opacity: 0 }}
          animate={{ y: 0, opacity: 1, transition: { duration: 0.4, ease: EASE, delay } }}
          exit={{ y: -distance, opacity: 0, transition: { duration: 0.3, ease: EASE } }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function SkillPills({ group }: { group: TimelineGroup }) {
  if (group.skills.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {group.skills.map((s) => (
        <Badge key={s} variant="outline" className="border-border text-muted-foreground">
          {s}
        </Badge>
      ))}
      {group.extraSkillCount > 0 && <Badge variant="secondary">+{group.extraSkillCount} more</Badge>}
    </div>
  );
}

export function Career() {
  const reduce = useReducedMotion() ?? false;
  const [activeIndex, setActiveIndex] = useState(0);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const groupRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const anchor = window.innerHeight * 0.42;
      let best = 0;
      let bestDist = Infinity;
      itemRefs.current.forEach((el, i) => {
        if (!el) return;
        const r = el.getBoundingClientRect();
        const d = Math.abs(r.top + r.height / 2 - anchor);
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      });
      setActiveIndex(best);
      groupRefs.current.forEach((g) => {
        if (!g) return;
        const fill = g.querySelector<HTMLElement>("[data-seg-fill]");
        if (!fill) return;
        const gr = g.getBoundingClientRect();
        fill.style.height = `${Math.min(gr.height, Math.max(0, anchor - gr.top))}px`;
      });
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const active = flatItems[activeIndex] ?? flatItems[0];
  const headingProps = {
    initial: reduce ? (false as const) : { opacity: 0, y: 16 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.5 },
    transition: { duration: D.base, ease: EASE },
  };
  let flatIndex = 0;

  return (
    <section id="career" className="relative z-10 mx-auto max-w-5xl px-6 py-24 md:py-32">
      <motion.p
        {...headingProps}
        className="text-xs font-medium uppercase tracking-[0.28em] text-muted-foreground"
      >
        Where I've worked
      </motion.p>
      <motion.h2
        {...headingProps}
        className="mt-2 text-2xl font-semibold tracking-tight md:text-4xl"
      >
        Career
      </motion.h2>
      <SectionUnderline className="mb-12" />

      <div className="md:flex md:gap-14">
        {/* sticky rail — desktop only */}
        <div className="hidden w-60 shrink-0 md:block">
          <div className="sticky top-[30vh]">
            <SwapText swapKey={itemYear(active.item.period)} reduce={reduce} distance={28}>
              <p className="bg-gradient-to-br from-cyan-400 to-indigo-400 bg-clip-text pb-1 text-7xl font-extrabold leading-none tracking-tighter text-transparent">
                {itemYear(active.item.period)}
              </p>
            </SwapText>
            <SwapText swapKey={active.group.name} reduce={reduce} className="mt-4" delay={0.04}>
              <p className="text-[15px] font-semibold text-foreground">{active.group.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{active.group.subtitle}</p>
            </SwapText>
            <SwapText swapKey={active.group.name} reduce={reduce} className="mt-2.5" delay={0.08}>
              <p className="text-[11px] leading-relaxed text-muted-foreground/70">
                {active.group.range}
                <br />
                {active.group.detail}
              </p>
            </SwapText>
            <SwapText swapKey={active.group.name} reduce={reduce} className="mt-4" delay={0.12}>
              <SkillPills group={active.group} />
            </SwapText>
            <div className="mt-6 h-0.5 w-36 rounded-full bg-zinc-900">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-indigo-400 transition-[width] duration-300"
                style={{ width: `${((activeIndex + 1) / flatItems.length) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* timeline groups */}
        <div className="flex-1 space-y-16 md:space-y-[72px]">
          {groups.map((group, gi) => (
            <div
              key={group.name}
              ref={(el) => {
                groupRefs.current[gi] = el;
              }}
              className="relative pl-14 md:pl-16"
            >
              {/* segment spine + scroll fill */}
              <div className="absolute bottom-0 left-[22px] top-0 w-0.5 rounded-full bg-zinc-900 md:left-6" />
              <div
                data-seg-fill
                className="absolute left-[22px] top-0 w-0.5 rounded-full bg-gradient-to-b from-cyan-400 to-indigo-400 md:left-6"
                style={{ height: 0 }}
              />
              {/* logo rides the spine for the employment period */}
              <div className="absolute bottom-0 left-[23px] top-0 z-20 w-0 md:left-[25px]">
                <RiderLogo group={group} />
              </div>

              {/* mobile group header (rail replaces this on desktop) */}
              <motion.div
                initial={reduce ? false : { opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: D.base, ease: EASE }}
                className="mb-6 md:hidden"
              >
                <p className="text-sm font-semibold text-foreground">{group.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {group.subtitle} · {group.range}
                </p>
                <div className="mt-3">
                  <SkillPills group={group} />
                </div>
              </motion.div>

              <div className="space-y-10 md:space-y-14">
                {group.items.map((item) => {
                  const idx = flatIndex++;
                  return (
                    <div
                      key={item.title}
                      ref={(el) => {
                        itemRefs.current[idx] = el;
                      }}
                    >
                      <ItemCard
                        item={item}
                        group={group}
                        active={idx === activeIndex}
                        reduce={reduce}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
