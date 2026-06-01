import { motion, useReducedMotion } from "motion/react";
import { Globe, FileText, Code, MonitorSmartphone, Cpu } from "lucide-react";
import { D, EASE } from "@/lib/motion";
import { compact } from "@/lib/chart";
import type { TrafficBreakdown, TrafficSnapshot } from "@/data/traffic";

/** One labelled horizontal-bar breakdown panel. */
function Panel({
  icon: Icon,
  title,
  rows,
  index,
}: {
  icon: typeof Globe;
  title: string;
  rows: TrafficBreakdown[];
  index: number;
}) {
  const reduce = useReducedMotion();
  const max = Math.max(...rows.map((r) => r.visits), 1);

  return (
    <motion.div
      initial={reduce ? (false as const) : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: D.base, ease: EASE, delay: index * 0.05 }}
      className="rounded-2xl border border-border bg-card p-4 sm:p-5"
    >
      <div className="mb-3 flex items-center gap-2">
        <Icon className="size-4 text-muted-foreground" aria-hidden />
        <h3 className="text-xs font-medium uppercase tracking-wide text-foreground/60">{title}</h3>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Collecting data&hellip;</p>
      ) : (
        <ul className="space-y-2">
          {rows.slice(0, 5).map((r, i) => (
            <li key={r.label} className="relative">
              <div className="relative flex items-center justify-between gap-2 rounded-md px-2 py-1 text-sm">
                <motion.span
                  aria-hidden
                  className="absolute inset-y-0 left-0 rounded-md bg-foreground/[0.06]"
                  initial={reduce ? false : { width: 0 }}
                  whileInView={{ width: `${(r.visits / max) * 100}%` }}
                  viewport={{ once: true, amount: 0.6 }}
                  transition={{ duration: D.slow, ease: EASE, delay: i * 0.04 }}
                />
                <span className="relative z-10 min-w-0 truncate font-mono text-foreground/90">
                  {r.label}
                </span>
                <span className="relative z-10 shrink-0 tabular-nums text-muted-foreground">
                  {compact(r.visits)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </motion.div>
  );
}

/** Condensed grid of traffic breakdown panels (the "nerd stats"). */
export function Breakdowns({ snapshot }: { snapshot: TrafficSnapshot }) {
  const panels = [
    { icon: Globe, title: "Top referrers", rows: snapshot.topReferrers },
    { icon: FileText, title: "Top pages", rows: snapshot.topPaths },
    { icon: Code, title: "Browsers", rows: snapshot.browsers },
    { icon: Cpu, title: "Operating systems", rows: snapshot.os },
    { icon: MonitorSmartphone, title: "Devices", rows: snapshot.devices },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {panels.map((p, i) => (
        <Panel key={p.title} icon={p.icon} title={p.title} rows={p.rows} index={i} />
      ))}
    </div>
  );
}
