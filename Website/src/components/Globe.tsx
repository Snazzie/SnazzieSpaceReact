import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";
import { geoOrthographic, geoPath } from "d3-geo";
import { worldGeo } from "@/data/worldGeo";
import type { TrafficCountry } from "@/data/traffic";

/**
 * Rotating orthographic globe rendered to a canvas. Countries with traffic are
 * tinted by request share; the rest sit faint. Drawing on canvas (not 174 SVG
 * paths per frame) keeps the spin cheap. Rotation pauses when offscreen and is
 * disabled under prefers-reduced-motion.
 *
 * The rotation angle and tint data live in refs so a `countries` change (e.g.
 * switching the Site/All tab) re-tints in place without restarting the loop or
 * resetting the orientation.
 */
export function Globe({ countries, size = 360 }: { countries: TrafficCountry[]; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();
  const lambdaRef = useRef(18);
  const dataRef = useRef<{ byCode: Map<string, number>; max: number }>({ byCode: new Map(), max: 1 });
  const drawRef = useRef<() => void>(() => {});

  // Refresh tint data on a countries change, then redraw at the current angle.
  useEffect(() => {
    dataRef.current = {
      byCode: new Map(countries.map((c) => [c.code, c.requests])),
      max: Math.max(...countries.map((c) => c.requests), 1),
    };
    drawRef.current();
  }, [countries]);

  // Set up the canvas + animation loop once. Does not depend on `countries`, so
  // the spin and orientation survive data/tab changes.
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const projection = geoOrthographic()
      .scale(size / 2 - 2)
      .translate([size / 2, size / 2])
      .clipAngle(90);
    const path = geoPath(projection, ctx);
    const features = worldGeo.features;
    const tilt = -16;

    function draw() {
      if (!ctx) return;
      const { byCode, max } = dataRef.current;
      ctx.clearRect(0, 0, size, size);
      projection.rotate([lambdaRef.current, tilt, 0]);

      // Ocean sphere — faint cool tint (sky) over the dark theme.
      ctx.beginPath();
      path({ type: "Sphere" });
      ctx.fillStyle = "rgb(56 189 248 / 0.05)";
      ctx.fill();

      // Countries: ones with traffic glow on an emerald->cyan ramp by request
      // share; the rest sit faint and cool.
      for (const f of features) {
        const v = byCode.get((f.properties as { code: string }).code);
        ctx.beginPath();
        path(f);
        if (v !== undefined) {
          const t = Math.sqrt(v / max); // 0..1 by share
          // emerald-500 (16,185,129) -> cyan-400 (34,211,238)
          const r = Math.round(16 + (34 - 16) * t);
          const g = Math.round(185 + (211 - 185) * t);
          const b = Math.round(129 + (238 - 129) * t);
          const o = 0.35 + 0.6 * t;
          ctx.fillStyle = `rgb(${r} ${g} ${b} / ${o.toFixed(3)})`;
        } else {
          ctx.fillStyle = "rgb(148 197 253 / 0.06)";
        }
        ctx.fill();
        ctx.lineWidth = 0.4;
        ctx.strokeStyle = "rgb(186 230 253 / 0.12)";
        ctx.stroke();
      }

      // Rim — subtle sky glow.
      ctx.beginPath();
      path({ type: "Sphere" });
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgb(56 189 248 / 0.25)";
      ctx.stroke();
    }
    drawRef.current = draw;

    if (reduce) {
      draw();
      return;
    }

    let raf = 0;
    let last = 0;
    let running = true;
    function tick(t: number) {
      if (!running) return;
      if (t - last > 33) {
        lambdaRef.current = (lambdaRef.current + 0.3) % 360;
        draw();
        last = t;
      }
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);

    // Pause the loop while the globe is scrolled out of view.
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !running) {
        running = true;
        last = 0;
        raf = requestAnimationFrame(tick);
      } else if (!entry.isIntersecting) {
        running = false;
        cancelAnimationFrame(raf);
      }
    });
    io.observe(canvas);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      io.disconnect();
      drawRef.current = () => {};
    };
  }, [size, reduce]);

  return (
    <canvas
      ref={ref}
      role="img"
      aria-label="Rotating globe showing traffic origin by country"
      style={{ width: size, height: size }}
      className="mx-auto h-auto w-full max-w-[360px]"
    />
  );
}
