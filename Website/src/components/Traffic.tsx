import { useEffect, useRef } from "react";
import { animate, motion, useInView, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { Eye, Globe2, Users } from "lucide-react";
import { D, EASE } from "@/lib/motion";
import { compact } from "@/lib/chart";
import { useTraffic, flagEmoji } from "@/lib/useTraffic";
import { ScrollBorderProvider, useScrollBorderColor } from "@/lib/scrollBorder";
import { worldGeo } from "@/data/worldGeo";
import type { TrafficCountry } from "@/data/traffic";
import { SectionUnderline } from "@/components/SectionUnderline";
import { Globe } from "@/components/Globe";
import { Breakdowns } from "@/components/Breakdowns";

/** Pretty country names keyed by alpha-2, sourced from the generated geometry. */
const COUNTRY_NAMES: Record<string, string> = Object.fromEntries(
  worldGeo.features.map((f) => {
    const p = f.properties as { code: string; name: string };
    return [p.code, p.name];
  }),
);

function snapshotDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toISOString().slice(0, 10);
}

/** Animated count-up headline stat (matches the GitHub section idiom). */
function CountStat({
  icon: Icon,
  label,
  value,
  index,
}: {
  icon: typeof Eye;
  label: string;
  value: number;
  index: number;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const mv = useMotionValue(0);
  const display = useTransform(mv, (v: number) => compact(Math.round(v)));
  const borderColor = useScrollBorderColor(index * 0.05);

  useEffect(() => {
    if (reduce || !inView) return;
    const controls = animate(mv, value, { duration: D.slow * 1.5, ease: EASE });
    return () => controls.stop();
  }, [inView, value, reduce, mv]);

  return (
    <motion.div
      ref={ref}
      initial={reduce ? (false as const) : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: D.base, ease: EASE, delay: index * 0.06 }}
      style={{ borderColor }}
      className="rounded-2xl border border-border bg-card p-5"
    >
      <Icon className="size-5 text-muted-foreground" aria-hidden />
      <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">
        {reduce ? compact(value) : <motion.span>{display}</motion.span>}
      </p>
      <p className="mt-0.5 text-sm text-muted-foreground">{label}</p>
    </motion.div>
  );
}

/** Rotating globe alongside a top-countries legend. */
function GeoPanel({ countries }: { countries: TrafficCountry[] }) {
  const reduce = useReducedMotion();
  const top = countries.slice(0, 6);
  const topMax = Math.max(...top.map((c) => c.visits), 1);
  const borderColor = useScrollBorderColor(0.15);

  return (
    <motion.div
      style={{ borderColor }}
      className="grid items-center gap-4 rounded-2xl border border-border bg-card p-4 sm:p-5 lg:grid-cols-[1fr_1fr]"
    >
      <Globe countries={countries} />

      <div>
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-foreground/60">
          Top countries
        </p>
        <ul className="space-y-2.5">
          {top.map((c, i) => (
            <li key={c.code}>
              <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <span aria-hidden>{flagEmoji(c.code)}</span>
                  <span className="truncate text-foreground/90">{COUNTRY_NAMES[c.code] ?? c.code}</span>
                </span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {c.visits.toLocaleString()}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-foreground/5">
                <motion.div
                  className="h-full rounded-full bg-sky-400/70"
                  initial={reduce ? false : { width: 0 }}
                  whileInView={{ width: `${(c.visits / topMax) * 100}%` }}
                  viewport={{ once: true, amount: 0.6 }}
                  transition={{ duration: D.slow, ease: EASE, delay: i * 0.05 }}
                />
              </div>
            </li>
          ))}
          {top.length === 0 && (
            <li className="text-sm text-muted-foreground">Collecting data&hellip;</li>
          )}
        </ul>
      </div>
    </motion.div>
  );
}

export function Traffic() {
  const reduce = useReducedMotion();
  const snapshot = useTraffic();
  const headingProps = {
    initial: reduce ? (false as const) : { opacity: 0, y: 16 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.5 },
    transition: { duration: D.base, ease: EASE },
  };

  const stats = [
    { icon: Eye, label: "Page views", value: snapshot.totals.pageViews },
    { icon: Users, label: "Visits", value: snapshot.totals.visits },
    { icon: Globe2, label: "Countries reached", value: snapshot.totals.countries },
  ];

  return (
    <section id="traffic" className="relative z-10 mx-auto max-w-5xl px-4 py-16 sm:px-6 md:py-24">
      <motion.p
        {...headingProps}
        className="text-xs font-medium uppercase tracking-[0.28em] text-muted-foreground"
      >
        Analytics
      </motion.p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <motion.h2 {...headingProps} className="text-3xl font-semibold tracking-tight md:text-4xl">
          Site traffic
        </motion.h2>
        <motion.p {...headingProps} className="text-sm text-muted-foreground">
          Last {snapshot.rangeDays} days &middot; snapshot as of {snapshotDate(snapshot.updatedAt)}
        </motion.p>
      </div>
      <SectionUnderline />

      <ScrollBorderProvider className="grid gap-3">
        <div className="grid grid-cols-3 gap-3">
          {stats.map((s, i) => (
            <CountStat key={s.label} icon={s.icon} label={s.label} value={s.value} index={i} />
          ))}
        </div>

        <GeoPanel countries={snapshot.byCountry} />
        <Breakdowns snapshot={snapshot} />
      </ScrollBorderProvider>
    </section>
  );
}
