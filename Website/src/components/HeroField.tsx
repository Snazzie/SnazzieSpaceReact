import { useEffect, useRef } from "react";
import type { MotionValue } from "motion/react";

interface Props {
  mx: MotionValue<number>;
  my: MotionValue<number>;
  reduce: boolean | null;
}

const GAP = 36;
const DRIFT = 2.4;
const PARALLAX = 26;

/**
 * Ambient dot-field behind the hero. Dots drift slowly and shift with the
 * cursor at per-dot depth, reusing the same mouse MotionValues that drive the
 * avatar parallax so the whole hero reacts as one plane. Masked out toward
 * the fold so it never competes with content below.
 */
export function HeroField({ mx, my, reduce }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let raf = 0;
    let t = 0;
    let visible = true;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    // Deterministic per-dot depth so the grid is stable across frames.
    const depthAt = (i: number, j: number) => {
      const s = Math.sin(i * 12.9898 + j * 78.233) * 43758.5453;
      return s - Math.floor(s);
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      const px = mx.get() * PARALLAX;
      const py = my.get() * PARALLAX;
      const cols = Math.ceil(w / GAP) + 2;
      const rows = Math.ceil(h / GAP) + 2;
      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const depth = depthAt(i, j);
          const x =
            (i - 1) * GAP + px * (0.3 + depth * 0.7) + Math.sin(t + i * 0.7 + j * 0.35) * DRIFT;
          const y =
            (j - 1) * GAP + py * (0.3 + depth * 0.7) + Math.cos(t * 0.8 + j * 0.6 + i * 0.25) * DRIFT;
          ctx.fillStyle = `rgba(255,255,255,${0.04 + depth * 0.09})`;
          ctx.fillRect(x, y, 1.2, 1.2);
        }
      }
    };

    const loop = () => {
      t += 0.0045;
      draw();
      raf = requestAnimationFrame(loop);
    };

    const start = () => {
      if (reduce || raf || !visible || document.hidden) return;
      raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };

    resize();
    draw(); // static frame for reduced motion / before first rAF
    start();

    const onResize = () => {
      resize();
      if (!raf) draw();
    };
    const onVisibility = () => (document.hidden ? stop() : start());
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      visible ? start() : stop();
    });
    io.observe(canvas);
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stop();
      io.disconnect();
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [mx, my, reduce]);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 h-full w-full"
      style={{
        maskImage:
          "linear-gradient(to bottom, black 0%, black 60%, transparent 96%), radial-gradient(ellipse 90% 80% at 50% 35%, black 40%, transparent 100%)",
        maskComposite: "intersect",
        WebkitMaskImage:
          "linear-gradient(to bottom, black 0%, black 60%, transparent 96%), radial-gradient(ellipse 90% 80% at 50% 35%, black 40%, transparent 100%)",
        WebkitMaskComposite: "source-in",
      }}
    />
  );
}
