import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { stack, type Tech } from "@/data/stack";
import { projects, type Project } from "@/data/projects";
import { SectionUnderline } from "@/components/SectionUnderline";
import { ProjectModal } from "@/components/ProjectModal";
import { FOCUS_TECH_EVENT } from "@/components/TechBadges";
import { projectSlug } from "@/components/FeaturedShowcase";
import { TechDetailsPanel } from "@/components/TechDetailsPanel";
import { TechFilters } from "@/components/TechFilters";
import {
  BY_NAME,
  FLAT,
  GROUP_COLORS,
  IDLE_SPIN,
  type Mat3,
  type Vec3,
  TechGlyph,
  dragRot,
  easeToFront,
  fib,
  matApply,
  matAxisAngle,
  matMul,
} from "@/components/sphereCommon";

/** Shorter chip labels for long group names. */
const GROUP_SHORT: Record<string, string> = {
  "Payments & Monetization": "Payments",
  "Data & Infra": "Data & Infra",
};

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

function TechSphere() {
  const [cat, setCat] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState<string | null>(null);
  const [pendingFocus, setPendingFocus] = useState<string | null>(null);
  const [modalProject, setModalProject] = useState<Project | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [constProject, setConstProject] = useState<Project | null>(null);
  /** FLAT indices of the active constellation's members, in project tech order. */
  const constIdxRef = useRef<number[]>([]);

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
  const rot = useRef<{ m: Mat3; vH: number; vV: number }>({
    m: matAxisAngle([1, 0, 0], -0.18),
    vH: 0,
    vV: IDLE_SPIN,
  });
  /** Base vector of the node to ease to front-center, or null. */
  const focusTarget = useRef<Vec3 | null>(null);
  const drag = useRef({ active: false, px: 0, py: 0, ox: 0, oy: 0, moved: false });
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingDrag = useRef<{ px: number; py: number } | null>(null);
  /** True while a press that began on empty orb space could still become a
   * click-to-deselect (cleared once the pointer drags). */
  const bgPressed = useRef(false);
  const [touchLocked, setTouchLocked] = useState(false);
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

  /** Drop the focused tech only; any active constellation filter stays. */
  const clearFocus = useCallback(() => {
    focusedRef.current = null;
    focusTarget.current = null;
    setFocused(null);
  }, []);

  /** Full clear: focus and constellation. */
  const release = useCallback(() => {
    clearFocus();
    constIdxRef.current = [];
    setConstProject(null);
  }, [clearFocus]);

  const focusTech = useCallback((name: string) => {
    const idx = FLAT.findIndex((f) => f.tech.name === name);
    const it = itemsRef.current[idx];
    if (idx < 0 || !it) return;
    // Target hidden by the active category/search filter: clear the filter and
    // defer the focus so the re-spread makes the node visible first.
    if (it.visT !== 1) {
      setCat("all");
      setQuery("");
      setPendingFocus(name);
      return;
    }
    focusedRef.current = name;
    // Ease this node's base vector to front-center each frame.
    focusTarget.current = it.target;
    setFocused(name);
  }, []);

  /** Light up a project's techs as a constellation; null clears. */
  const selectConstellation = useCallback((p: Project | null) => {
    focusedRef.current = null;
    focusTarget.current = null;
    setFocused(null);
    if (!p) {
      constIdxRef.current = [];
      setConstProject(null);
      return;
    }
    setCat("all");
    setQuery("");
    constIdxRef.current = (p.tech ?? [])
      .map((t) => FLAT.findIndex((f) => f.tech.name === t))
      .filter((i) => i >= 0);
    setConstProject(p);
  }, []);

  // Filter: hide non-matching items, re-spread the survivors over the sphere.
  // An active constellation restricts the sphere to that project's techs.
  useEffect(() => {
    const q = query.trim().toLowerCase();
    const items = itemsRef.current;
    const constNames = constProject
      ? new Set((constProject.tech ?? []).filter((t) => BY_NAME.has(t)))
      : null;
    FLAT.forEach((f, i) => {
      const okCat = cat === "all" || f.group === cat;
      const okQ = !q || f.tech.name.toLowerCase().includes(q);
      const okConst = !constNames || constNames.has(f.tech.name);
      items[i].visT = okCat && okQ && okConst ? 1 : 0;
    });
    const visible = items.filter((it) => it.visT === 1);
    visible.forEach((it, i) => {
      it.target = fib(i, visible.length);
    });
    if (focusedRef.current) {
      const idx = FLAT.findIndex((f) => f.tech.name === focusedRef.current);
      if (idx >= 0 && items[idx].visT !== 1) clearFocus();
    }
  }, [cat, query, constProject, clearFocus]);

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
    let prevTime = -1;
    const loop = (ts: number) => {
      const dt = prevTime < 0 ? 1000 / 60 : Math.min(ts - prevTime, 100);
      prevTime = ts;
      const ratio = dt / (1000 / 60);
      const visAlpha = 1 - Math.pow(1 - 0.12, ratio);
      const posAlpha = 1 - Math.pow(1 - 0.1, ratio);
      const rotAlpha = 1 - Math.pow(1 - 0.08, ratio);
      const decay = Math.pow(0.95, ratio);

      const r = rot.current;
      const items = itemsRef.current;

      for (const it of items) {
        it.vis += (it.visT - it.vis) * visAlpha;
        for (let k = 0; k < 3; k++) it.base[k] += (it.target[k] - it.base[k]) * posAlpha;
      }

      // If only one tech is in view (lone constellation member, or filtered
      // down to a single visible node), rotate it to front-center.
      let single = -1;
      if (constIdxRef.current.length === 1) {
        single = constIdxRef.current[0];
      } else {
        let count = 0;
        for (let i = 0; i < items.length; i++) {
          if (items[i].visT === 1) {
            count++;
            single = i;
          }
        }
        if (count !== 1) single = -1;
      }

      const ft = focusTarget.current;
      if (single >= 0 && !focusedRef.current) {
        r.m = easeToFront(r.m, items[single].target, rotAlpha);
      } else if (ft) {
        r.m = easeToFront(r.m, ft, rotAlpha);
      } else if (!drag.current.active) {
        // Idle: keep last drag momentum, decaying horizontal spin back to idle.
        r.m = matMul(dragRot(r.vH * ratio, r.vV * ratio), r.m);
        r.vV *= decay;
        r.vH = r.vH * decay + IDLE_SPIN * (1 - decay);
      }

      const constIdx = constIdxRef.current;
      // While a tech is focused, suppress constellation styling/lines so the
      // focus view is clean; the selection itself stays for when focus clears.
      const constOn = constIdx.length > 0 && !focusedRef.current;

      for (const [i, it] of items.entries()) {
        const el = it.el;
        if (!el) continue;
        const [x, y2, z2] = matApply(r.m, it.base);
        const s = (z2 + 2) / 3;
        const isFocused = focusedRef.current === FLAT[i].tech.name;
        const isMember = constOn && constIdx.includes(i);
        const dimmed = constOn && !isMember;
        const scl = (0.55 + s * 0.55) * it.vis * (isFocused ? 1.18 : 1);
        it.sx = W / 2 + x * R;
        it.sy = H / 2 + y2 * R;
        el.style.transform = `translate(-50%,-50%) translate(${x * R}px,${y2 * R}px) scale(${scl})`;
        el.style.opacity = `${(0.25 + s * 0.75) * it.vis * (dimmed ? 0.18 : 1)}`;
        el.style.filter = isFocused
          ? "none"
          : dimmed
            ? "blur(2px) grayscale(0.8)"
            : isMember
              ? `blur(${(1 - s) * 1.2}px)`
              : `blur(${(1 - s) * 2.2}px)`;
        el.style.zIndex = `${Math.round(s * 100) + (isFocused ? 200 : 0) + (isMember ? 150 : 0)}`;
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
        } else if (constOn) {
          // Constellation: chain visible members in project tech order,
          // star-map style — thin glowing lines plus a dot at each member.
          const pts = constIdx
            .map((i) => ({ it: itemsRef.current[i], color: FLAT[i].color }))
            .filter((p) => p.it.vis > 0.5);
          ctx.save();
          ctx.lineWidth = 1.4;
          for (let k = 1; k < pts.length; k++) {
            const a = pts[k - 1].it;
            const b = pts[k].it;
            const grad = ctx.createLinearGradient(a.sx, a.sy, b.sx, b.sy);
            grad.addColorStop(0, `${pts[k - 1].color}cc`);
            grad.addColorStop(1, `${pts[k].color}22`);
            ctx.strokeStyle = grad;
            ctx.beginPath();
            ctx.moveTo(a.sx, a.sy);
            ctx.quadraticCurveTo((a.sx + b.sx) / 2, (a.sy + b.sy) / 2 - 30, b.sx, b.sy);
            ctx.stroke();
          }
          for (const p of pts) {
            ctx.fillStyle = `${p.color}e6`;
            ctx.beginPath();
            ctx.arc(p.it.sx, p.it.sy, 2, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }
      }

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const onMove = (e: PointerEvent) => {
      if (pendingDrag.current) {
        const dx = e.clientX - pendingDrag.current.px;
        const dy = e.clientY - pendingDrag.current.py;
        if (dx * dx + dy * dy > 100) {
          if (holdTimer.current) { clearTimeout(holdTimer.current); holdTimer.current = null; }
          pendingDrag.current = null;
          bgPressed.current = false;
        }
        return;
      }
      if (!drag.current.active) return;
      const r = rot.current;
      const angH = (e.clientX - drag.current.px) * 0.0045;
      const angV = (e.clientY - drag.current.py) * 0.0035;
      r.m = matMul(dragRot(angH, angV), r.m);
      r.vH = angH;
      r.vV = angV;
      drag.current.px = e.clientX;
      drag.current.py = e.clientY;
      const mdx = e.clientX - drag.current.ox;
      const mdy = e.clientY - drag.current.oy;
      if (mdx * mdx + mdy * mdy > 25) drag.current.moved = true;
    };
    const onUp = () => {
      if (bgPressed.current && !drag.current.moved) release();
      bgPressed.current = false;
      drag.current.active = false;
      if (holdTimer.current) { clearTimeout(holdTimer.current); holdTimer.current = null; }
      pendingDrag.current = null;
      setTouchLocked(false);
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
    // Defer deselect to pointerup so a drag that starts on empty space spins
    // the sphere instead of clearing the active focus/constellation.
    bgPressed.current =
      e.target === e.currentTarget &&
      (focusedRef.current !== null || constIdxRef.current.length > 0);
    if (e.pointerType === "touch") {
      const { clientX, clientY } = e;
      pendingDrag.current = { px: clientX, py: clientY };
      holdTimer.current = setTimeout(() => {
        if (!pendingDrag.current) return;
        drag.current = { active: true, px: pendingDrag.current.px, py: pendingDrag.current.py, ox: pendingDrag.current.px, oy: pendingDrag.current.py, moved: false };
        pendingDrag.current = null;
        setTouchLocked(true);
      }, 350);
    } else {
      drag.current = { active: true, px: e.clientX, py: e.clientY, ox: e.clientX, oy: e.clientY, moved: false };
    }
  };

  const chips: { key: string; label: string; color: string }[] = [
    { key: "all", label: "All", color: "#e8e8ec" },
    ...stack.map((g) => ({
      key: g.label,
      label: ((s: string) => s.charAt(0).toUpperCase() + s.slice(1))((GROUP_SHORT[g.label] ?? g.label).toLowerCase()),
      color: GROUP_COLORS[g.label] ?? "#e8e8ec",
    })),
  ];

  const meta = focusedTech?.tech.meta;
  const usedIn = focusedTech ? usedInFor(focusedTech.tech) : [];
  const constSet = useMemo(
    () => new Set((constProject?.tech ?? []).filter((t) => BY_NAME.has(t))),
    [constProject],
  );

  return (
    <>
      <TechFilters
        constProject={constProject}
        selectConstellation={selectConstellation}
        cat={cat}
        setCat={setCat}
        query={query}
        setQuery={setQuery}
        chips={chips}
      />

      <div className="mt-4 flex flex-col items-center justify-center gap-3 md:flex-row md:gap-10">
        <div
          ref={wrapRef}
          className="relative aspect-square w-full max-w-[520px] shrink-0 cursor-grab active:cursor-grabbing"
          style={{ touchAction: touchLocked ? "none" : "pan-y" }}
          onPointerDown={onOrbPointerDown}
        >
          <canvas ref={canvasRef} className="pointer-events-none absolute inset-0" aria-hidden />
          {FLAT.map((f, i) => {
            const isFocused = focused === f.tech.name;
            const isRelated = focused !== null && relatedSet.has(f.tech.name);
            const isMember = constSet.has(f.tech.name);
            return (
              <button
                key={f.tech.name}
                type="button"
                ref={(el) => {
                  itemsRef.current[i].el = el;
                }}
                onPointerDown={(e) => {
                  drag.current = { ...drag.current, px: e.clientX, py: e.clientY, ox: e.clientX, oy: e.clientY, moved: false };
                }}
                onClick={() => {
                  if (drag.current.moved) return;
                  isFocused ? clearFocus() : focusTech(f.tech.name);
                }}
                className="absolute left-1/2 top-1/2 flex cursor-pointer select-none items-center gap-2 whitespace-nowrap rounded-full border bg-secondary px-3 py-1.5 text-[13px] font-medium text-muted-foreground transition-[border-color,box-shadow,color] duration-200 hover:text-foreground"
                style={{
                  borderColor: isFocused || isRelated || isMember ? f.color : "var(--color-border)",
                  boxShadow: isFocused
                    ? `0 0 18px -4px ${f.color}`
                    : isMember
                      ? `0 0 14px -6px ${f.color}`
                      : undefined,
                  color: isFocused || isMember ? "var(--color-foreground)" : undefined,
                }}
              >
                <TechGlyph tech={f.tech} color={f.color} />
                {f.tech.name}
              </button>
            );
          })}
        </div>

        <TechDetailsPanel
          focusedTech={focusedTech}
          constProject={constProject}
          constSet={constSet}
          meta={meta}
          usedIn={usedIn}
          relatedSet={relatedSet}
          release={release}
          clearFocus={clearFocus}
          focusTech={focusTech}
          onViewProject={(project) => {
            // Featured projects live in the showcase; jump there.
            // Non-featured ones have no showcase section, use the modal.
            if (project.featured) {
              document
                .getElementById(projectSlug(project.title))
                ?.scrollIntoView({ behavior: "smooth" });
            } else {
              setModalProject(project);
              setModalOpen(true);
            }
          }}
        />
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
      </div>
      {reduce ? <StaticStack /> : <TechSphere />}
    </section>
  );
}
