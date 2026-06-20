import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { stack, type Tech } from "@/data/stack";
import { projects, type Project } from "@/data/projects";
import { SectionUnderline } from "@/components/SectionUnderline";
import { ProjectModal } from "@/components/ProjectModal";
import { FOCUS_TECH_EVENT } from "@/components/TechBadges";
import { projectSlug } from "@/components/FeaturedShowcase";
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

const PROJECT_BY_TITLE = new Map(projects.map((p) => [p.title, p]));

/**
 * Chip row: horizontal scroll rail on mobile (full-bleed, snap, edge fade,
 * hidden scrollbar), centered wrapping row on md+.
 */
const RAIL =
  "flex items-center gap-2 overflow-x-auto snap-x -mx-6 px-6 scroll-px-6 " +
  "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden " +
  "[mask-image:linear-gradient(to_right,transparent,black_24px,black_calc(100%-24px),transparent)] " +
  "md:mx-0 md:flex-wrap md:justify-center md:overflow-visible md:px-0 md:[mask-image:none]";

/** Projects that can light up a constellation: at least two techs on the sphere. */
const CONST_PROJECTS = projects.filter(
  (p) => (p.tech ?? []).filter((t) => BY_NAME.has(t)).length >= 2,
);

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
      <div className={`${RAIL} mt-8 md:!justify-start`}>
        <span className="shrink-0 snap-start text-[0.6rem] font-medium uppercase tracking-[0.16em] text-muted-foreground/70">
          constellations
        </span>
        {CONST_PROJECTS.map((p) => {
          const on = constProject?.title === p.title;
          return (
            <button
              key={p.title}
              type="button"
              aria-pressed={on}
              onClick={() => selectConstellation(on ? null : p)}
              className="shrink-0 snap-start rounded-full border px-3 py-1 text-[11px] font-medium transition-colors duration-200"
              style={
                on
                  ? {
                      borderColor: "var(--color-foreground)",
                      color: "var(--color-foreground)",
                      background: "var(--color-secondary)",
                    }
                  : { borderColor: "var(--color-border)", color: "var(--color-muted-foreground)" }
              }
            >
              ✦ {p.title}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-col gap-2.5 md:flex-row md:flex-wrap md:items-center md:justify-center">
        <div className={`${RAIL} gap-2.5`}>
          {chips.map((c) => {
            const on = cat === c.key;
            return (
              <button
                key={c.key}
                type="button"
                aria-pressed={on}
                onClick={() => setCat(c.key)}
                className="shrink-0 snap-start rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors duration-200"
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
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="search…"
          aria-label="Search tech"
          className="mx-auto w-44 rounded-full border border-border bg-secondary/40 px-4 py-1.5 text-xs text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground/40 md:mx-0 md:w-36"
        />
      </div>

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

        <div
          aria-live="polite"
          className="relative flex w-full max-w-[300px] flex-col rounded-2xl border border-border bg-card p-6 transition-all duration-300"
        >
          {!focusedTech && !constProject && (
            <div className="flex min-h-[180px] flex-col items-center justify-center text-center">
              <span className="text-2xl opacity-40" aria-hidden>
                ✦
              </span>
              <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
                <span className="hidden md:inline">Drag the sphere to spin it. Click a tech for details.</span>
                <span className="md:hidden">Long press then drag to spin. Tap a tech for details.</span>
              </p>
            </div>
          )}
          {!focusedTech && constProject && (
            <>
              <button
                type="button"
                onClick={release}
                aria-label="Close details"
                className="absolute right-3.5 top-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                ✕
              </button>
              <p className="text-[0.65rem] font-medium uppercase tracking-[0.2em] text-foreground/80">
                ✦ Constellation
              </p>
              <h3 className="mt-1 text-xl font-semibold tracking-tight">{constProject.title}</h3>
              <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
                {constProject.description}
              </p>
              <p className="mt-4 text-[0.6rem] font-medium uppercase tracking-[0.16em] text-muted-foreground/70">
                Built with
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {[...constSet].map((t) => {
                  const f = BY_NAME.get(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => focusTech(t)}
                      className="rounded-full border border-border bg-secondary/40 px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = f?.color ?? "var(--color-border)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "var(--color-border)";
                      }}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => {
                  // Featured projects live in the showcase; jump there.
                  // Non-featured ones have no showcase section, use the modal.
                  if (constProject.featured) {
                    document
                      .getElementById(projectSlug(constProject.title))
                      ?.scrollIntoView({ behavior: "smooth" });
                  } else {
                    setModalProject(constProject);
                    setModalOpen(true);
                  }
                }}
                className="mt-5 flex w-full items-center justify-between rounded-lg border border-border px-3 py-2 text-xs text-foreground/90 transition-colors hover:border-foreground/40 hover:text-foreground"
              >
                View project
                <span className="text-muted-foreground">→</span>
              </button>
            </>
          )}
          {focusedTech && (
            <>
              <button
                type="button"
                onClick={clearFocus}
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
                            const el = document.getElementById(projectSlug(title));
                            if (el) {
                              el.scrollIntoView({ behavior: "smooth" });
                            } else {
                              document.getElementById("projects")?.scrollIntoView({ behavior: "smooth" });
                            }
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
      </div>
      {reduce ? <StaticStack /> : <TechSphere />}
    </section>
  );
}
