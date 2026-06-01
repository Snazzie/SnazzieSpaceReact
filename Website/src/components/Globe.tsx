import { useEffect, useRef } from "react";
import { useReducedMotion } from "motion/react";
import { geoOrthographic, geoPath } from "d3-geo";
import { worldGeo } from "@/data/worldGeo";
import type { TrafficCountry } from "@/data/traffic";

/**
 * Rotating orthographic globe rendered to a canvas. Countries with traffic are
 * tinted by visit share; the rest sit faint. Drawing on canvas (not 174 SVG
 * paths per frame) keeps the spin cheap. Rotation pauses when offscreen and is
 * disabled under prefers-reduced-motion.
 */
export function Globe({ countries, size = 360 }: { countries: TrafficCountry[]; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const byCode = new Map(countries.map((c) => [c.code, c.requests]));
    const max = Math.max(...countries.map((c) => c.requests), 1);

    const projection = geoOrthographic()
      .scale(size / 2 - 2)
      .translate([size / 2, size / 2])
      .clipAngle(90);
    const path = geoPath(projection, ctx);
    const features = worldGeo.features;

    let lambda = 18;
    const tilt = -16;

    function draw() {
      if (!ctx) return;
      ctx.clearRect(0, 0, size, size);
      projection.rotate([lambda, tilt, 0]);

      // Ocean sphere (foreground #fafafa at low alpha — monochrome theme).
      ctx.beginPath();
      path({ type: "Sphere" });
      ctx.fillStyle = "rgb(250 250 250 / 0.03)";
      ctx.fill();

      // Countries: visited ones brighten toward foreground by visit share.
      for (const f of features) {
        const v = byCode.get((f.properties as { code: string }).code);
        ctx.beginPath();
        path(f);
        if (v !== undefined) {
          const o = 0.2 + 0.8 * Math.sqrt(v / max);
          ctx.fillStyle = `rgb(250 250 250 / ${o.toFixed(3)})`;
        } else {
          ctx.fillStyle = "rgb(250 250 250 / 0.05)";
        }
        ctx.fill();
        ctx.lineWidth = 0.4;
        ctx.strokeStyle = "rgb(250 250 250 / 0.10)";
        ctx.stroke();
      }

      // Rim.
      ctx.beginPath();
      path({ type: "Sphere" });
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgb(250 250 250 / 0.18)";
      ctx.stroke();
    }

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
        lambda = (lambda + 0.3) % 360;
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
    };
  }, [countries, size, reduce]);

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
