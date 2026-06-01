import { useEffect, useRef, useState } from "react";
import { animate, motion, useInView, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { Eye, Globe2, Users } from "lucide-react";
import { D, EASE } from "@/lib/motion";
import { compact } from "@/lib/chart";
import { useTraffic, flagEmoji } from "@/lib/useTraffic";
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

/** Smoothed area chart of daily page views over the window. */
function DayTrend({ days }: { days: TrafficDay[] }) {
  const reduce = useReducedMotion();
  const [active, setActive] = useState<number | null>(null);
  const n = days.length;
  const max = Math.max(...days.map((d) => d.pageViews), 1);
  const px = (i: number) => (n <= 1 ? 50 : (i / (n - 1)) * 100);
  const py = (v: number) => 100 - (v / max) * 92 - 4;

  const pts = days.map((d, i) => [px(i), py(d.pageViews)] as [number, number]);
  const line = smoothPath(pts);
  const area = n >= 2 ? `${line} L${px(n - 1).toFixed(2)},100 L${px(0).toFixed(2)},100 Z` : "";
  const labelEvery = Math.max(1, Math.ceil(n / 6));

  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-foreground/60">
          Page views by day
        </p>
        <span className="text-xs text-muted-foreground">last {n} days</span>
      </div>

      <div className="relative h-36">
        <svg
          aria-hidden
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 size-full overflow-visible"
        >
          <defs>
            <linearGradient id="traffic-area" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="rgb(96 165 250 / 0.28)" />
              <stop offset="100%" stopColor="rgb(96 165 250 / 0)" />
            </linearGradient>
          </defs>
          {area && (
            <motion.path
              d={area}
              fill="url(#traffic-area)"
              initial={reduce ? false : { opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: D.slow, ease: EASE, delay: 0.2 }}
            />
          )}
          <motion.path
            d={line}
            fill="none"
            stroke="rgb(96 165 250)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            initial={reduce ? false : { pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: D.slow, ease: EASE }}
          />
        </svg>

        {active !== null && (
          <div
            aria-hidden
            className="pointer-events-none absolute top-0 bottom-0 w-px -translate-x-1/2 bg-foreground/15"
            style={{ left: `${px(active)}%` }}
          />
        )}

        <div className="absolute inset-0 flex">
          {days.map((d, i) => (
            <button
              key={d.date}
              type="button"
              className="min-w-0 flex-1 cursor-default rounded-sm outline-none focus-visible:bg-foreground/5"
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive((a) => (a === i ? null : a))}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              aria-label={`${fmtDate(d.date)}: ${d.pageViews} page views, ${d.visits} visits`}
            />
          ))}
        </div>

        {active !== null && (
          <div
            role="status"
            className="pointer-events-none absolute top-1 z-20 w-max -translate-x-1/2 rounded-lg border border-border bg-card/95 px-3 py-2 text-xs shadow-lg backdrop-blur-sm"
            style={{ left: `${Math.min(Math.max(px(active), 12), 88)}%` }}
          >
            <p className="font-semibold text-foreground">{fmtDate(days[active].date)}</p>
            <p className="mt-1 text-sky-400">{days[active].pageViews.toLocaleString()} views</p>
            <p className="text-muted-foreground">{days[active].visits.toLocaleString()} visits</p>
          </div>
        )}
      </div>

      <div className="mt-2 flex">
        {days.map((d, i) => (
          <span
            key={d.date}
            className="min-w-0 flex-1 text-center text-[0.65rem] tabular-nums text-muted-foreground"
          >
            {i % labelEvery === 0 ? fmtDate(d.date) : ""}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Rotating globe alongside a top-countries legend. */
function GeoPanel({ countries }: { countries: TrafficCountry[] }) {
  const reduce = useReducedMotion();
  const top = countries.slice(0, 6);
  const topMax = Math.max(...top.map((c) => c.visits), 1);

  return (
    <div className="grid items-center gap-4 rounded-2xl border border-border bg-card p-4 sm:p-5 lg:grid-cols-[1fr_1fr]">
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
    </div>
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

      <div className="grid gap-3">
        <div className="grid grid-cols-3 gap-3">
          {stats.map((s, i) => (
            <CountStat key={s.label} icon={s.icon} label={s.label} value={s.value} index={i} />
          ))}
        </div>

        <GeoPanel countries={snapshot.byCountry} />
        <Breakdowns snapshot={snapshot} />
      </div>
    </section>
  );
}
