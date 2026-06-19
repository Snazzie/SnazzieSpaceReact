import { useEffect, useMemo, useRef } from "react";
import { useReducedMotion } from "motion/react";
import { BY_NAME, IDLE_SPIN, TechGlyph, fib, type FlatTech } from "@/components/sphereCommon";

/**
 * Small self-contained constellation: a project's sphere techs laid out on a
 * slowly spinning fibonacci sphere, chained star-map style on a canvas.
 * Used inline in showcase sections; drag to spin.
 */
export function MiniConstellation({ tech }: { tech: string[] }) {
  // Techs not on the sphere (platforms, one-off tools) still get a pill,
  // rendered with the neutral monogram fallback.
  const items = useMemo<FlatTech[]>(
    () => tech.map((t) => BY_NAME.get(t) ?? { tech: { name: t }, group: "", color: "#e8e8ec" }),
    [tech],
  );
  const reduce = useReducedMotion();

  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const elsRef = useRef<(HTMLDivElement | null)[]>([]);
  // Lone tech: face it front-center, no idle spin (base point sits on +x).
  const solo = items.length === 1;
  const rot = useRef(
    solo
      ? { rx: 0, ry: -Math.PI / 2, vx: 0, vy: 0 }
      : { rx: -0.15, ry: 0, vx: 0, vy: IDLE_SPIN },
  );
  const drag = useRef({ active: false, px: 0, py: 0 });
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingDrag = useRef<{ px: number; py: number } | null>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext("2d");
    const n = items.length;
    const bases = items.map((_, i) => fib(i, n));
    const screen = items.map(() => ({ sx: 0, sy: 0 }));

    let W = 0;
    let H = 0;
    let R = 0;
    const resize = () => {
      W = wrap.clientWidth;
      H = wrap.clientHeight;
      R = Math.min(W, H) * 0.36;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(() => {
      resize();
      if (reduce) step();
    });
    ro.observe(wrap);

    const step = () => {
      const r = rot.current;
      const cy = Math.cos(r.ry);
      const sy = Math.sin(r.ry);
      const cx = Math.cos(r.rx);
      const sx = Math.sin(r.rx);

      for (let i = 0; i < n; i++) {
        const el = elsRef.current[i];
        if (!el) continue;
        const [bx, by, bz] = bases[i];
        const x = bx * cy + bz * sy;
        const z = -bx * sy + bz * cy;
        const y2 = by * cx - z * sx;
        const z2 = by * sx + z * cx;
        const s = (z2 + 2) / 3;
        screen[i].sx = W / 2 + x * R;
        screen[i].sy = H / 2 + y2 * R;
        el.style.transform = `translate(-50%,-50%) translate(${x * R}px,${y2 * R}px) scale(${0.6 + s * 0.45})`;
        el.style.opacity = `${0.35 + s * 0.65}`;
        el.style.zIndex = `${Math.round(s * 100)}`;
      }

      if (ctx) {
        ctx.clearRect(0, 0, W, H);
        ctx.save();
        ctx.lineWidth = 1.4;
        for (let i = 1; i < n; i++) {
          const a = screen[i - 1];
          const b = screen[i];
          const grad = ctx.createLinearGradient(a.sx, a.sy, b.sx, b.sy);
          grad.addColorStop(0, `${items[i - 1].color}cc`);
          grad.addColorStop(1, `${items[i].color}22`);
          ctx.strokeStyle = grad;
          ctx.beginPath();
          ctx.moveTo(a.sx, a.sy);
          ctx.quadraticCurveTo((a.sx + b.sx) / 2, (a.sy + b.sy) / 2 - 30, b.sx, b.sy);
          ctx.stroke();
        }
        for (let i = 0; i < n; i++) {
          ctx.fillStyle = `${items[i].color}e6`;
          ctx.beginPath();
          ctx.arc(screen[i].sx, screen[i].sy, 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    };

    let raf = 0;
    const loop = () => {
      const r = rot.current;
      if (!drag.current.active && !solo) {
        r.ry += r.vy;
        r.rx += r.vx;
        r.vx *= 0.95;
        r.vy = r.vy * 0.95 + IDLE_SPIN * 0.05;
      }
      step();
      raf = requestAnimationFrame(loop);
    };
    if (reduce) {
      step();
    } else {
      raf = requestAnimationFrame(loop);
    }

    const onMove = (e: PointerEvent) => {
      if (pendingDrag.current) {
        const dx = e.clientX - pendingDrag.current.px;
        const dy = e.clientY - pendingDrag.current.py;
        if (dx * dx + dy * dy > 100) {
          if (holdTimer.current) { clearTimeout(holdTimer.current); holdTimer.current = null; }
          pendingDrag.current = null;
        }
        return;
      }
      if (!drag.current.active) return;
      const r = rot.current;
      r.vy = (e.clientX - drag.current.px) * 0.0045;
      r.vx = (drag.current.py - e.clientY) * 0.0035;
      r.ry += r.vy;
      r.rx += r.vx;
      drag.current.px = e.clientX;
      drag.current.py = e.clientY;
      if (reduce) step();
    };
    const onUp = () => {
      drag.current.active = false;
      if (holdTimer.current) { clearTimeout(holdTimer.current); holdTimer.current = null; }
      pendingDrag.current = null;
      if (wrap) wrap.style.touchAction = "pan-y";
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [items, reduce]);

  return (
    <div
      ref={wrapRef}
      className="relative size-full cursor-grab select-none active:cursor-grabbing"
      style={{
        touchAction: "pan-y",
        WebkitUserSelect: "none",
        WebkitTouchCallout: "none",
        WebkitTapHighlightColor: "transparent",
      }}
      onPointerDown={(e) => {
        if (e.pointerType === "touch") {
          const { clientX, clientY } = e;
          pendingDrag.current = { px: clientX, py: clientY };
          holdTimer.current = setTimeout(() => {
            if (!pendingDrag.current) return;
            drag.current = { active: true, px: pendingDrag.current.px, py: pendingDrag.current.py };
            pendingDrag.current = null;
            if (wrapRef.current) wrapRef.current.style.touchAction = "none";
          }, 350);
        } else {
          drag.current = { active: true, px: e.clientX, py: e.clientY };
        }
      }}
    >
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0" aria-hidden />
      <span className="pointer-events-none absolute left-2 top-2 text-[9px] font-medium uppercase tracking-widest text-muted-foreground/40 md:hidden">
        hold to drag
      </span>
      {items.map((f, i) => (
        <div
          key={f.tech.name}
          ref={(el) => {
            elsRef.current[i] = el;
          }}
          className="pointer-events-none absolute left-1/2 top-1/2 flex select-none items-center gap-1.5 whitespace-nowrap rounded-full border bg-secondary px-2.5 py-1 text-[11px] font-medium text-foreground/90"
          style={{ borderColor: f.color }}
        >
          <TechGlyph tech={f.tech} color={f.color} />
          {f.tech.name}
        </div>
      ))}
    </div>
  );
}
