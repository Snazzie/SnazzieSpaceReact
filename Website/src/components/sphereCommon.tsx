import { stack, type Tech } from "@/data/stack";

/** Idle auto-spin speed (radians/frame, steady-state) shared by the TechStack
 * sphere and the inline MiniConstellation so both rotate at the same rate. */
export const IDLE_SPIN = 0.0007;

/** Accent color per stack group; tech pills, chips, arcs and cards key off it. */
export const GROUP_COLORS: Record<string, string> = {
  Languages: "#f472b6",
  Frontend: "#22d3ee",
  Backend: "#a78bfa",
  "Data & Infra": "#fbbf24",
  "Payments & Monetization": "#34d399",
  Testing: "#60a5fa",
};

export interface FlatTech {
  tech: Tech;
  group: string;
  color: string;
}

export const FLAT: FlatTech[] = stack.flatMap((g) =>
  g.items.map((tech) => ({ tech, group: g.label, color: GROUP_COLORS[g.label] ?? "#e8e8ec" })),
);

export const BY_NAME = new Map(FLAT.map((f) => [f.tech.name, f]));

/** i-th of n points on a fibonacci sphere. */
export function fib(i: number, n: number): [number, number, number] {
  const y = n === 1 ? 0 : 1 - (i / (n - 1)) * 2;
  const r = Math.sqrt(Math.max(0, 1 - y * y));
  const th = i * 2.39996;
  return [Math.cos(th) * r, y, Math.sin(th) * r];
}

/** Lerp angle a→b along the shortest path. */
export function angLerp(a: number, b: number, t: number): number {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

/** Short label for tech with no brand icon, e.g. "C#", "React Native" -> "RN". */
export function monogram(name: string): string {
  const words = name.split(/\s+/);
  if (words.length > 1) return words.map((w) => w[0]).join("").toUpperCase();
  return name.length <= 3 ? name.toUpperCase() : name.slice(0, 2).toUpperCase();
}

export function TechGlyph({ tech, color }: { tech: Tech; color: string }) {
  if (tech.logoUrl) {
    return (
      <img src={tech.logoUrl} alt="" width={16} height={16} className="size-4 shrink-0" />
    );
  }
  if (tech.icon) {
    return (
      <svg role="img" aria-hidden viewBox="0 0 24 24" className="size-4 shrink-0" style={{ fill: color }}>
        <path d={tech.icon.path} />
      </svg>
    );
  }
  return (
    <span
      className="flex size-4 shrink-0 items-center justify-center text-[0.55rem] font-bold"
      style={{ color }}
    >
      {monogram(tech.name)}
    </span>
  );
}
