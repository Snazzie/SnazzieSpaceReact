import { stack, type Tech } from "@/data/stack";

/** Idle auto-spin speed (radians/frame, steady-state) shared by the TechStack
 * sphere and the inline MiniConstellation so both rotate at the same rate. */
export const IDLE_SPIN = 0.0011;

// ── Trackball rotation ──────────────────────────────────────────────────────
// Orientation is a 3x3 rotation matrix (row-major) mapping a unit base vector
// to view space: screen x = p.x, screen y = p.y (down), depth = p.z (toward
// viewer). Drag deltas are applied as rotations about the fixed *screen* axes
// and left-multiplied onto the matrix, so the visible surface always follows
// the gesture no matter how the sphere is currently oriented (no gimbal flip).

export type Vec3 = [number, number, number];
export type Mat3 = [number, number, number, number, number, number, number, number, number];

export function matId(): Mat3 {
  return [1, 0, 0, 0, 1, 0, 0, 0, 1];
}

export function matMul(a: Mat3, b: Mat3): Mat3 {
  const r = [0, 0, 0, 0, 0, 0, 0, 0, 0] as Mat3;
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++)
      r[i * 3 + j] = a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j];
  return r;
}

export function matApply(m: Mat3, v: Vec3): Vec3 {
  return [
    m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
    m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
    m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
  ];
}

/** Rotation matrix for `ang` radians about a unit `axis`. */
export function matAxisAngle(axis: Vec3, ang: number): Mat3 {
  const [x, y, z] = axis;
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  const t = 1 - c;
  return [
    t * x * x + c, t * x * y - s * z, t * x * z + s * y,
    t * x * y + s * z, t * y * y + c, t * y * z - s * x,
    t * x * z - s * y, t * y * z + s * x, t * z * z + c,
  ];
}

/** Incremental screen-frame rotation for a drag of `angH`/`angV` radians:
 * horizontal drag spins about the screen vertical axis, vertical drag about the
 * screen horizontal axis. Left-multiply the result onto the orientation. */
export function dragRot(angH: number, angV: number): Mat3 {
  return matMul(matAxisAngle([0, 1, 0], angH), matAxisAngle([1, 0, 0], -angV));
}

/** Ease the orientation so unit vector `v` rotates toward front-center
 * (0,0,1) by fraction `alpha`. Used to bring a focused/lone node to the front. */
export function easeToFront(m: Mat3, v: Vec3, alpha: number): Mat3 {
  const cur = matApply(m, v);
  const dot = Math.max(-1, Math.min(1, cur[2]));
  const ang = Math.acos(dot) * alpha;
  if (ang < 1e-5) return m;
  // axis = cur × (0,0,1)
  let ax = cur[1];
  let ay = -cur[0];
  let az = 0;
  let len = Math.hypot(ax, ay, az);
  if (len < 1e-6) {
    // cur is parallel to the view axis: aligned (no-op) or antipodal (spin up).
    if (dot > 0) return m;
    ax = 0;
    ay = 1;
    az = 0;
    len = 1;
  }
  return matMul(matAxisAngle([ax / len, ay / len, az / len], ang), m);
}

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
