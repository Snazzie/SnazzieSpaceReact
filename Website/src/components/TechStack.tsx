import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { stack, type Tech } from "@/data/stack";
import { projects, type Project } from "@/data/projects";
import { SectionUnderline } from "@/components/SectionUnderline";
import { ProjectModal } from "@/components/ProjectModal";
import { FOCUS_TECH_EVENT } from "@/components/TechBadges";

/** Accent color per stack group; tech pills, chips, arcs and the card all key off it. */
const GROUP_COLORS: Record<string, string> = {
  Languages: "#f472b6",
  Frontend: "#22d3ee",
  Backend: "#a78bfa",
  "Data & Infra": "#fbbf24",
  "Payments & Monetization": "#34d399",
  Testing: "#60a5fa",
};

/** Shorter chip labels for long group names. */
const GROUP_SHORT: Record<string, string> = {
  "Payments & Monetization": "Payments",
  "Data & Infra": "Data & Infra",
};

interface FlatTech {
  tech: Tech;
  group: string;
  color: string;
}

const FLAT: FlatTech[] = stack.flatMap((g) =>
  g.items.map((tech) => ({ tech, group: g.label, color: GROUP_COLORS[g.label] ?? "#e8e8ec" })),
);

const BY_NAME = new Map(FLAT.map((f) => [f.tech.name, f]));

const PROJECT_BY_TITLE = new Map(projects.map((p) => [p.title, p]));

/** All techs that mention `name` in their related list (reverse edges). */
const REVERSE_RELATED = new Map<string, string[]>();
for (const { tech } of FLAT) {
  for (const rn of tech.meta?.related ?? []) {
    const arr = REVERSE_RELATED.get(rn) ?? [];
    arr.push(tech.name);
    REVERSE_RELATED.set(rn, arr);
  }
}

/**
 * "Used in" entries for a tech: titles derived from `projects.ts` tech badges
 * (always current, no hand-upkeep) plus any manual extras from `meta.usedIn`.
 */
function usedInFor(tech: Tech): string[] {
  const derived = projects.filter((p) => p.tech?.includes(tech.name)).map((p) => p.title);
  return [...new Set([...(tech.meta?.usedIn ?? []), ...derived])];
}

/** Mutable per-item animation state, lives outside React renders. */
interface ItemState {
  el: HTMLButtonElement | null;
  /** current position on the unit sphere (eased toward target) */
  base: [number, number, number];
  /** layout slot on the unit sphere */
  target: [number, number, number];
  /** eased visibility 0..1 */
  vis: number;
  /** visibility target (0 = filtered out) */
  visT: number;
  /** last projected screen position (for arcs) */
  sx: number;
  sy: number;
}

/** i-th of n points on a fibonacci sphere. */
function fib(i: number, n: number): [number, number, number] {
  const y = n === 1 ? 0 : 1 - (i / (n - 1)) * 2;
  const r = Math.sqrt(Math.max(0, 1 - y * y));
  const th = i * 2.39996;
  return [Math.cos(th) * r, y, Math.sin(th) * r];
}

/** Lerp angle a→b along the shortest path. */
function angLerp(a: number, b: number, t: number): number {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

/** Short label for tech with no brand icon, e.g. "C#", "React Native" -> "RN". */
function monogram(name: string): string {
  const words = name.split(/\s+/);
  if (words.length > 1) return words.map((w) => w[0]).join("").toUpperCase();
  return name.length <= 3 ? name.toUpperCase() : name.slice(0, 2).toUpperCase();
}

function TechGlyph({ tech, color }: { tech: Tech; color: string }) {
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

function TechSphere() {
  const [cat, setCat] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState<string | null>(null);
  const [pendingFocus, setPendingFocus] = useState<string | null>(null);
  const [modalProject, setModalProject] = useState<Project | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const itemsRef = useRef<ItemState[]>(
    FLAT.map((_, i) => ({
      el: null,
      base: fib(i, FLAT.length),
      target: fib(i, FLAT.length),
      vis: 1,
      visT: 1,
      sx: 0,
      sy: 0,
    })),
  );
  const rot = useRef({ rx: -0.18, ry: 0, vx: 0, vy: 0.004 });
  const focusTarget = useRef<{ rx: number; ry: number } | null>(null);
  const drag = useRef({ active: false, px: 0, py: 0, moved: false });
  const focusedRef = useRef<string | null>(null);

  const focusedTech = focused ? BY_NAME.get(focused) : undefined;
  const relatedSet = useMemo(() => {
    if (!focusedTech) return new Set<string>();
    const name = focusedTech.tech.name;
    return new Set([
      ...(focusedTech.tech.meta?.related ?? []),
      ...(REVERSE_RELATED.get(name) ?? []),
    ]);
  }, [focusedTech]);

  const release = useCallback(() => {
    focusedRef.current = null;
    focusTarget.current = null;
    setFocused(null);
  }, []);

  const focusTech = useCallback((name: string) => {
    const idx = FLAT.findIndex((f) => f.tech.name === name);
    const it = itemsRef.current[idx];
    if (idx < 0 || !it || it.visT !== 1) return;
    focusedRef.current = name;
    // Rotation that brings this node to front-center: yaw to zero the x
    // component, then pitch to zero the y component.
    const [bx, by, bz] = it.target;
    const ry = Math.atan2(-bx, bz);
    const rx = Math.atan2(by, Math.hypot(bx, bz));
    focusTarget.current = { rx, ry };
    setFocused(name);
  }, []);

  // Filter: hide non-matching items, re-spread the survivors over the sphere.
  useEffect(() => {
    const q = query.trim().toLowerCase();
    const items = itemsRef.current;
    FLAT.forEach((f, i) => {
      const okCat = cat === "all" || f.group === cat;
      const okQ = !q || f.tech.name.toLowerCase().includes(q);
      items[i].visT = okCat && okQ ? 1 : 0;
    });
    const visible = items.filter((it) => it.visT === 1);
    visible.forEach((it, i) => {
      it.target = fib(i, visible.length);
    });
    if (focusedRef.current) {
      const idx = FLAT.findIndex((f) => f.tech.name === focusedRef.current);
      if (idx >= 0 && items[idx].visT !== 1) release();
    }
  }, [cat, query, release]);

  // External focus requests (clicked tech badge on a project card/modal).
  // Reset filters first; the effect above runs before this one in the same
  // commit, so by the time we focus the item is visible again.
  useEffect(() => {
    const onFocusRequest = (e: Event) => {
      const name = (e as CustomEvent<string>).detail;
      if (!BY_NAME.has(name)) return;
      setCat("all");
      setQuery("");
      setPendingFocus(name);
    };
    window.addEventListener(FOCUS_TECH_EVENT, onFocusRequest);
    return () => window.removeEventListener(FOCUS_TECH_EVENT, onFocusRequest);
  }, []);

  useEffect(() => {
    if (!pendingFocus) return;
    focusTech(pendingFocus);
    setPendingFocus(null);
  }, [pendingFocus, focusTech]);

  // Render loop + pointer drag. All imperative, no per-frame React state.
  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext("2d");

    let W = 0;
    let H = 0;
    let R = 0;
    const resize = () => {
      W = wrap.clientWidth;
      H = wrap.clientHeight;
      R = Math.min(W, H) * 0.4;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    let raf = 0;
    const loop = () => {
      const r = rot.current;
      const items = itemsRef.current;

      for (const it of items) {
        it.vis += (it.visT - it.vis) * 0.12;
        for (let k = 0; k < 3; k++) it.base[k] += (it.target[k] - it.base[k]) * 0.1;
      }

      const ft = focusTarget.current;
      if (ft) {
        r.ry = angLerp(r.ry, ft.ry, 0.08);
        r.rx = angLerp(r.rx, ft.rx, 0.08);
      } else if (!drag.current.active) {
        r.ry += r.vy;
        r.rx += r.vx;
        r.vx *= 0.95;
        r.vy = r.vy * 0.95 + 0.004 * 0.05;
      }

      const cy = Math.cos(r.ry);
      const sy = Math.sin(r.ry);
      const cx = Math.cos(r.rx);
      const sx = Math.sin(r.rx);

      for (const [i, it] of items.entries()) {
        const el = it.el;
        if (!el) continue;
        const [bx, by, bz] = it.base;
        const x = bx * cy + bz * sy;
        const z = -bx * sy + bz * cy;
        const y2 = by * cx - z * sx;
        const z2 = by * sx + z * cx;
        const s = (z2 + 2) / 3;
        const isFocused = focusedRef.current === FLAT[i].tech.name;
        const scl = (0.55 + s * 0.55) * it.vis * (isFocused ? 1.18 : 1);
        it.sx = W / 2 + x * R;
        it.sy = H / 2 + y2 * R;
        el.style.transform = `translate(-50%,-50%) translate(${x * R}px,${y2 * R}px) scale(${scl})`;
        el.style.opacity = `${(0.25 + s * 0.75) * it.vis}`;
        el.style.filter = isFocused ? "none" : `blur(${(1 - s) * 2.2}px)`;
        el.style.zIndex = `${Math.round(s * 100) + (isFocused ? 200 : 0)}`;
        el.style.pointerEvents = it.vis < 0.5 ? "none" : "auto";
      }

      if (ctx) {
        ctx.clearRect(0, 0, W, H);
        const fname = focusedRef.current;
        if (fname) {
          const fi = FLAT.findIndex((f) => f.tech.name === fname);
          const fit = itemsRef.current[fi];
          const color = FLAT[fi].color;
          const allRelated = new Set([
            ...(FLAT[fi].tech.meta?.related ?? []),
            ...(REVERSE_RELATED.get(fname) ?? []),
          ]);
          for (const rn of allRelated) {
            const ri = FLAT.findIndex((f) => f.tech.name === rn);
            if (ri < 0) continue;
            const rit = itemsRef.current[ri];
            if (rit.vis < 0.5) continue;
            const grad = ctx.createLinearGradient(fit.sx, fit.sy, rit.sx, rit.sy);
            grad.addColorStop(0, `${color}cc`);
            grad.addColorStop(1, `${color}22`);
            ctx.strokeStyle = grad;
            ctx.lineWidth = 1.4;
            ctx.beginPath();
            ctx.moveTo(fit.sx, fit.sy);
            ctx.quadraticCurveTo(
              (fit.sx + rit.sx) / 2,
              (fit.sy + rit.sy) / 2 - 30,
              rit.sx,
              rit.sy,
            );
            ctx.stroke();
          }
        }
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const onMove = (e: PointerEvent) => {
      if (!drag.current.active) return;
      const r = rot.current;
      r.vy = (e.clientX - drag.current.px) * 0.0045;
      r.vx = (drag.current.py - e.clientY) * 0.0035;
      r.ry += r.vy;
      r.rx += r.vx;
      drag.current.px = e.clientX;
      drag.current.py = e.clientY;
      drag.current.moved = true;
    };
    const onUp = () => {
      drag.current.active = false;
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  const onOrbPointerDown = (e: React.PointerEvent) => {
    drag.current = { active: true, px: e.clientX, py: e.clientY, moved: false };
    // Only release when clicking empty sphere space, not a tech pill
    if (e.target === e.currentTarget && focusedRef.current) release();
  };

  const chips: { key: string; label: string; color: string }[] = [
    { key: "all", label: "all", color: "#e8e8ec" },
    ...stack.map((g) => ({
      key: g.label,
      label: (GROUP_SHORT[g.label] ?? g.label).toLowerCase(),
      color: GROUP_COLORS[g.label] ?? "#e8e8ec",
    })),
  ];

  const meta = focusedTech?.tech.meta;
  const usedIn = focusedTech ? usedInFor(focusedTech.tech) : [];

  return (
    <>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
        {chips.map((c) => {
          const on = cat === c.key;
          return (
            <button
              key={c.key}
              type="button"
              aria-pressed={on}
              onClick={() => setCat(c.key)}
              className="rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors duration-200"
              style={
                on
                  ? { background: c.color, borderColor: c.color, color: "#0a0a0c" }
                  : { borderColor: "var(--color-border)", color: "var(--color-muted-foreground)" }
              }
            >
              {c.label}
            </button>
          );
        })}
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="search…"
          aria-label="Search tech"
          className="w-36 rounded-full border border-border bg-secondary/40 px-4 py-1.5 text-xs text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground/40"
        />
      </div>

      <div className="mt-4 flex flex-col items-center justify-center gap-8 md:flex-row md:gap-10">
        <div
          ref={wrapRef}
          className="relative aspect-square w-full max-w-[520px] shrink-0 touch-none cursor-grab active:cursor-grabbing"
          onPointerDown={onOrbPointerDown}
        >
          <canvas ref={canvasRef} className="pointer-events-none absolute inset-0" aria-hidden />
          {FLAT.map((f, i) => {
            const isFocused = focused === f.tech.name;
            const isRelated = focused !== null && relatedSet.has(f.tech.name);
            return (
              <button
                key={f.tech.name}
                type="button"
                ref={(el) => {
                  itemsRef.current[i].el = el;
                }}
                onPointerDown={(e) => {
                  drag.current = { active: true, px: e.clientX, py: e.clientY, moved: false };
                }}
                onClick={() => {
                  if (drag.current.moved) return;
                  isFocused ? release() : focusTech(f.tech.name);
                }}
                className="absolute left-1/2 top-1/2 flex cursor-pointer select-none items-center gap-2 whitespace-nowrap rounded-full border bg-secondary/70 px-3 py-1.5 text-[13px] font-medium text-muted-foreground backdrop-blur-sm transition-[border-color,box-shadow,color] duration-200 hover:text-foreground"
                style={{
                  borderColor: isFocused || isRelated ? f.color : "var(--color-border)",
                  boxShadow: isFocused ? `0 0 18px -4px ${f.color}` : undefined,
                  color: isFocused ? "var(--color-foreground)" : undefined,
                }}
              >
                <TechGlyph tech={f.tech} color={f.color} />
                {f.tech.name}
              </button>
            );
          })}
        </div>

        <div
          aria-live="polite"
          className={`relative w-full max-w-[300px] rounded-2xl border border-border bg-card p-6 transition-all duration-300 ${
            focusedTech ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-3 opacity-0"
          }`}
        >
          {focusedTech && (
            <>
              <button
                type="button"
                onClick={release}
                aria-label="Close details"
                className="absolute right-3.5 top-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                ✕
              </button>
              <p
                className="text-[0.65rem] font-medium uppercase tracking-[0.2em]"
                style={{ color: focusedTech.color }}
              >
                {focusedTech.group}
              </p>
              <h3 className="mt-1 text-xl font-semibold tracking-tight">{focusedTech.tech.name}</h3>
              {meta?.blurb && (
                <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">{meta.blurb}</p>
              )}
              {relatedSet.size > 0 && (
                <>
                  <p className="mt-4 text-[0.6rem] font-medium uppercase tracking-[0.16em] text-muted-foreground/70">
                    Related
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {[...relatedSet].map((rn) => (
                      <button
                        key={rn}
                        type="button"
                        onClick={() => focusTech(rn)}
                        className="rounded-full border border-border bg-secondary/40 px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                        style={{ borderColor: "var(--color-border)" }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = focusedTech.color;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = "var(--color-border)";
                        }}
                      >
                        {rn}
                      </button>
                    ))}
                  </div>
                </>
              )}
              {usedIn.length > 0 && (
                <>
                  <p className="mt-4 text-[0.6rem] font-medium uppercase tracking-[0.16em] text-muted-foreground/70">
                    Used in
                  </p>
                  <div className="mt-1">
                    {usedIn.map((title) => {
                      const project = PROJECT_BY_TITLE.get(title);
                      return project ? (
                        <button
                          key={title}
                          type="button"
                          onClick={() => {
                            setModalProject(project);
                            setModalOpen(true);
                          }}
                          className="flex w-full items-center justify-between border-b border-border/60 py-1.5 text-left text-xs text-foreground/90 transition-colors last:border-0 hover:text-foreground"
                        >
                          {title}
                          <span className="text-muted-foreground">→</span>
                        </button>
                      ) : (
                        <div
                          key={title}
                          className="border-b border-border/60 py-1.5 text-xs text-foreground/90 last:border-0"
                        >
                          {title}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {modalProject && (
        <ProjectModal project={modalProject} open={modalOpen} onOpenChange={setModalOpen} />
      )}
    </>
  );
}

/** Static fallback: grouped pill grid, no motion, no canvas. */
function StaticStack() {
  return (
    <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {stack.map((group) => {
        const color = GROUP_COLORS[group.label] ?? "#e8e8ec";
        return (
          <div key={group.label} className="rounded-2xl border border-border bg-card p-5">
            <p
              className="text-[0.65rem] font-medium uppercase tracking-[0.2em]"
              style={{ color }}
            >
              {group.label}
            </p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {group.items.map((tech) => (
                <li
                  key={tech.name}
                  className="flex items-center gap-2 rounded-full border border-border bg-secondary/40 px-3 py-1.5 text-[13px] font-medium text-muted-foreground"
                >
                  <TechGlyph tech={tech} color={color} />
                  {tech.name}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

export function TechStack() {
  const reduce = useReducedMotion();

  return (
    <section id="stack" className="relative z-10 mx-auto max-w-5xl px-6 py-24 md:py-32">
      <div className="text-center">
        <p className="text-xs font-medium uppercase tracking-[0.28em] text-muted-foreground">
          What I build with
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight md:text-4xl">Tech stack</h2>
        <SectionUnderline />
        {!reduce && (
          <p className="mt-3 text-xs text-muted-foreground">
            drag to spin · click a tech for details
          </p>
        )}
      </div>
      {reduce ? <StaticStack /> : <TechSphere />}
    </section>
  );
}
