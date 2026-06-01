import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Activity, ArrowUpRight, CircleDot, FolderGit2, GitFork, Star } from "lucide-react";
import { siGithub } from "simple-icons";
import { github, type GithubProfile, type GithubYear } from "@/data/github";
import { D, EASE } from "@/lib/motion";

/** Live stats endpoint (Cloudflare Worker); env var overrides the deployed default. */
const STATS_URL =
  (import.meta.env.PUBLIC_GITHUB_STATS_URL as string | undefined) ??
  "https://snazzie-github-stats.snazzieops.workers.dev";

/** Narrow an unknown fetch payload to the shape the section renders. */
function isProfile(value: unknown): value is GithubProfile {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.totals === "object" &&
    v.totals !== null &&
    Array.isArray(v.years) &&
    typeof v.username === "string"
  );
}

/** Seed with the static snapshot, then replace with live worker data when it arrives. */
function useGithubProfile(): GithubProfile {
  const [profile, setProfile] = useState<GithubProfile>(github);

  useEffect(() => {
    if (!STATS_URL) return;
    const controller = new AbortController();
    fetch(STATS_URL, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((data: unknown) => {
        if (isProfile(data)) setProfile(data);
      })
      .catch(() => {
        /* keep static fallback on any error */
      });
    return () => controller.abort();
  }, []);

  return profile;
}

const STATS = [
  { key: "repositories", label: "Repositories", icon: FolderGit2 },
  { key: "contributedRepos", label: "Contributed to", icon: GitFork },
  { key: "stars", label: "Stars earned", icon: Star },
  { key: "contributions", label: "Contributions", icon: Activity },
  { key: "issues", label: "Issues raised", icon: CircleDot },
] as const;

function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${Math.round(n / 1000)}k`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

/** Monotone-cubic smoothing (Fritsch-Carlson) so the trend lines never overshoot. */
function smoothPath(pts: Array<[number, number]>): string {
  const n = pts.length;
  if (n < 2) return n === 1 ? `M${pts[0][0]},${pts[0][1]}` : "";
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const dx: number[] = [];
  const slope: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx[i] = xs[i + 1] - xs[i];
    slope[i] = (ys[i + 1] - ys[i]) / dx[i];
  }
  const t: number[] = new Array(n);
  t[0] = slope[0];
  t[n - 1] = slope[n - 2];
  for (let i = 1; i < n - 1; i++) {
    t[i] = slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2;
  }
  for (let i = 0; i < n - 1; i++) {
    if (slope[i] === 0) {
      t[i] = 0;
      t[i + 1] = 0;
    } else {
      const a = t[i] / slope[i];
      const b = t[i + 1] / slope[i];
      const s = a * a + b * b;
      if (s > 9) {
        const tau = 3 / Math.sqrt(s);
        t[i] = tau * a * slope[i];
        t[i + 1] = tau * b * slope[i];
      }
    }
  }
  let d = `M${xs[0].toFixed(2)},${ys[0].toFixed(2)}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i];
    const c1x = xs[i] + h / 3;
    const c1y = ys[i] + (t[i] * h) / 3;
    const c2x = xs[i + 1] - h / 3;
    const c2y = ys[i + 1] - (t[i + 1] * h) / 3;
    d += ` C${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${xs[i + 1].toFixed(2)},${ys[i + 1].toFixed(2)}`;
  }
  return d;
}

interface Series {
  value: (y: GithubYear) => number;
  stroke: string;
  fill: string;
  dot: string;
}

/**
 * Dual-axis year chart: contribution counts as bars (left axis) with the
 * lines added/removed trends drawn over them (right axis). The two metrics live
 * on wildly different scales (thousands vs millions), so they intentionally use
 * separate axes rather than being forced into one bar height.
 */
function DualYearChart({
  years,
  maxContrib,
  maxLines,
  withLines,
}: {
  years: GithubYear[];
  maxContrib: number;
  maxLines: number;
  withLines: boolean;
}) {
  const reduce = useReducedMotion();
  const [active, setActive] = useState<number | null>(null);
  const n = years.length;
  const px = (i: number) => ((i + 0.5) / n) * 100;
  const py = (v: number) => 100 - (maxLines > 0 ? (v / maxLines) * 100 : 0);

  const series: Series[] = [
    { value: (y) => y.additions, stroke: "rgb(52 211 153)", fill: "rgb(16 185 129 / 0.10)", dot: "bg-emerald-400" },
    { value: (y) => y.deletions, stroke: "rgb(251 113 133)", fill: "rgb(244 63 94 / 0.08)", dot: "bg-rose-400" },
  ];

  const ticks = [0, 0.5, 1];

  return (
    <>
      <div className="flex items-stretch gap-1 sm:gap-3">
        {/* Left axis: contributions scale (drives the bars). */}
        <div className="flex w-8 shrink-0 items-stretch gap-0.5 sm:w-14 sm:gap-1">
          <span className="hidden self-center rotate-180 text-[0.6rem] uppercase tracking-wider text-muted-foreground [writing-mode:vertical-rl] sm:inline">
            Contributions
          </span>
          <div className="relative h-52 flex-1">
            {ticks.map((f) => (
              <span
                key={f}
                className="absolute right-0 -translate-y-1/2 text-[0.6rem] tabular-nums text-muted-foreground"
                style={{ top: `${f * 100}%` }}
              >
                {compact(Math.round(maxContrib * (1 - f)))}
              </span>
            ))}
          </div>
        </div>

        <div className="relative h-52 flex-1">
        <ul className="flex h-full items-end">
          {years.map((y, i) => (
            <li key={y.year} className="flex h-full min-w-0 flex-1 items-end justify-center">
              <motion.div
                initial={reduce ? false : { height: 0 }}
                whileInView={{ height: `${Math.max((y.contributions / maxContrib) * 100, 2)}%` }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: D.slow, ease: EASE, delay: i * 0.05 }}
                className="w-full max-w-6 rounded-t-md bg-gradient-to-t from-zinc-800 to-zinc-600 sm:max-w-10"
                title={`${y.contributions.toLocaleString()} contributions in ${y.year}`}
              />
            </li>
          ))}
        </ul>

        {withLines &&
          series.map((s, si) => {
            const pts = years.map((y, i) => [px(i), py(s.value(y))] as [number, number]);
            const line = smoothPath(pts);
            const area = `${line} L${px(n - 1).toFixed(2)},100 L${px(0).toFixed(2)},100 Z`;
            return (
              <svg
                key={s.stroke}
                aria-hidden
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                className="pointer-events-none absolute inset-0 size-full overflow-visible"
              >
                <motion.path
                  d={area}
                  fill={s.fill}
                  initial={reduce ? false : { opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{ duration: D.slow, ease: EASE, delay: 0.3 }}
                />
                <motion.path
                  d={line}
                  fill="none"
                  stroke={s.stroke}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                  initial={reduce ? false : { opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{ duration: D.slow, ease: EASE, delay: 0.2 + si * 0.15 }}
                />
              </svg>
            );
          })}

        {withLines &&
          years.map((y, i) => (
            <div key={y.year} className="contents">
              <motion.div
                className="pointer-events-auto absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-400 ring-2 ring-card"
                style={{ left: `${px(i)}%`, top: `${py(y.additions)}%` }}
                initial={reduce ? false : { scale: 0 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: D.base, ease: EASE, delay: 0.4 + i * 0.05 }}
                title={`${y.year}: +${y.additions.toLocaleString()} lines added`}
              />
              <motion.div
                className="pointer-events-auto absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-rose-400 ring-2 ring-card"
                style={{ left: `${px(i)}%`, top: `${py(y.deletions)}%` }}
                initial={reduce ? false : { scale: 0 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: D.base, ease: EASE, delay: 0.55 + i * 0.05 }}
                title={`${y.year}: -${y.deletions.toLocaleString()} lines removed`}
              />
            </div>
          ))}

        {/* Active-column guide line. */}
        {active !== null && (
          <div
            aria-hidden
            className="pointer-events-none absolute top-0 bottom-0 w-px -translate-x-1/2 bg-foreground/15"
            style={{ left: `${px(active)}%` }}
          />
        )}

        {/* Hover / focus / click hit areas, one per year (keyboard accessible). */}
        <div className="absolute inset-0 flex">
          {years.map((y, i) => (
            <button
              key={y.year}
              type="button"
              className="min-w-0 flex-1 cursor-default rounded-sm outline-none focus-visible:bg-foreground/5"
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive((a) => (a === i ? null : a))}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              onClick={() => setActive((a) => (a === i ? null : i))}
              aria-label={`${y.year}: ${y.contributions.toLocaleString()} contributions, ${y.additions.toLocaleString()} lines added, ${y.deletions.toLocaleString()} removed`}
            />
          ))}
        </div>

        {/* Tooltip. */}
        {active !== null && (
          <div
            role="status"
            className="pointer-events-none absolute top-2 z-20 w-max max-w-[12rem] -translate-x-1/2 rounded-lg border border-border bg-card/95 px-3 py-2 text-xs shadow-lg backdrop-blur-sm"
            style={{ left: `${Math.min(Math.max(px(active), 14), 86)}%` }}
          >
            <p className="font-semibold text-foreground">20{String(years[active].year).slice(2)}</p>
            <p className="mt-1 text-muted-foreground">
              {years[active].contributions.toLocaleString()} contributions
            </p>
            {withLines && (
              <>
                <p className="text-emerald-400">+{years[active].additions.toLocaleString()} added</p>
                <p className="text-rose-400">&minus;{years[active].deletions.toLocaleString()} removed</p>
              </>
            )}
          </div>
        )}
        </div>

        {/* Right axis: lines-changed scale (drives the trend lines). */}
        {withLines && (
          <div className="flex w-10 shrink-0 items-stretch gap-0.5 sm:w-16 sm:gap-1">
            <div className="relative h-52 flex-1">
              {ticks.map((f) => (
                <span
                  key={f}
                  className="absolute left-0 -translate-y-1/2 text-[0.6rem] tabular-nums text-muted-foreground"
                  style={{ top: `${f * 100}%` }}
                >
                  {compact(Math.round(maxLines * (1 - f)))}
                </span>
              ))}
            </div>
            <span className="hidden self-center text-[0.6rem] uppercase tracking-wider text-muted-foreground [writing-mode:vertical-rl] sm:inline">
              Lines changed
            </span>
          </div>
        )}
      </div>

      <div className="mt-2 flex gap-1 sm:gap-3">
        <div className="w-8 shrink-0 sm:w-14" aria-hidden />
        <ul className="flex flex-1">
          {years.map((y) => (
            <li
              key={y.year}
              className="min-w-0 flex-1 text-center text-[0.7rem] tabular-nums text-muted-foreground"
            >
              &apos;{String(y.year).slice(2)}
            </li>
          ))}
        </ul>
        {withLines && <div className="w-10 shrink-0 sm:w-16" aria-hidden />}
      </div>
    </>
  );
}

export function GithubStats() {
  const reduce = useReducedMotion();
  const profile = useGithubProfile();
  const maxContrib = Math.max(...profile.years.map((y) => y.contributions), 1);
  const maxLines = Math.max(...profile.years.flatMap((y) => [y.additions, y.deletions]), 1);
  const hasLines = profile.totals.additions > 0 || profile.totals.deletions > 0;
  const headingProps = {
    initial: reduce ? (false as const) : { opacity: 0, y: 16 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.5 },
    transition: { duration: D.base, ease: EASE },
  };

  return (
    <section id="github" className="relative z-10 mx-auto max-w-5xl px-4 py-24 sm:px-6 md:py-32">
      <motion.p
        {...headingProps}
        className="text-xs font-medium uppercase tracking-[0.28em] text-muted-foreground"
      >
        Open source
      </motion.p>
      <div className="mb-10 mt-2 flex flex-wrap items-end justify-between gap-4">
        <motion.h2 {...headingProps} className="text-3xl font-semibold tracking-tight md:text-4xl">
          GitHub activity
        </motion.h2>
        <motion.a
          {...headingProps}
          href={profile.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground transition duration-200 hover:-translate-y-0.5 hover:border-zinc-600 hover:text-foreground"
        >
          <svg role="img" aria-hidden viewBox="0 0 24 24" className="size-4 fill-current">
            <path d={siGithub.path} />
          </svg>
          @{profile.username}
          <ArrowUpRight className="size-4 -translate-x-1 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100" />
        </motion.a>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {STATS.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.key}
              initial={reduce ? (false as const) : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: D.base, ease: EASE, delay: i * 0.06 }}
              className="rounded-2xl border border-border bg-card p-6"
            >
              <Icon className="size-5 text-muted-foreground" aria-hidden />
              <p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums">
                {compact(profile.totals[stat.key])}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
            </motion.div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 sm:p-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium uppercase tracking-wide text-foreground/60">
            Activity by year
          </p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2 rounded-sm bg-gradient-to-t from-zinc-800 to-zinc-600" aria-hidden />
              contributions
            </span>
            {hasLines && (
              <>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-0.5 w-4 rounded-full bg-emerald-400" aria-hidden />
                  added +{compact(profile.totals.additions)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-0.5 w-4 rounded-full bg-rose-400" aria-hidden />
                  removed &minus;{compact(profile.totals.deletions)}
                </span>
              </>
            )}
          </div>
        </div>
        <DualYearChart
          years={profile.years}
          maxContrib={maxContrib}
          maxLines={maxLines}
          withLines={hasLines}
        />
      </div>
    </section>
  );
}
