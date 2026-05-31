import { useEffect, useRef, useState } from "react";

/**
 * Fixed, full-viewport layer rendered once behind all content. A masked dot-grid
 * and a soft glow follow the pointer. Renders nothing on touch / coarse-pointer
 * devices or when the user prefers reduced motion.
 */
export function CursorField() {
  const [enabled, setEnabled] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    if (reduce || coarse) return;

    setEnabled(true);

    let frame = 0;
    let x = window.innerWidth / 2;
    let y = window.innerHeight * 0.4;

    const apply = () => {
      frame = 0;
      const el = rootRef.current;
      if (el) {
        el.style.setProperty("--mx", `${x}px`);
        el.style.setProperty("--my", `${y}px`);
      }
    };

    const onMove = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      if (!frame) frame = requestAnimationFrame(apply);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  if (!enabled) return null;

  return (
    <div
      ref={rootRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0"
      style={{ ["--mx" as string]: "50%", ["--my" as string]: "40%" }}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.08) 1px, transparent 1px)",
          backgroundSize: "38px 38px",
          WebkitMaskImage:
            "radial-gradient(circle 260px at var(--mx) var(--my), #000 0%, rgba(0,0,0,0.85) 25%, rgba(0,0,0,0.5) 45%, rgba(0,0,0,0.2) 62%, transparent 78%)",
          maskImage:
            "radial-gradient(circle 260px at var(--mx) var(--my), #000 0%, rgba(0,0,0,0.85) 25%, rgba(0,0,0,0.5) 45%, rgba(0,0,0,0.2) 62%, transparent 78%)",
        }}
      />
      <div
        className="absolute h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          left: "var(--mx)",
          top: "var(--my)",
          background:
            "radial-gradient(circle, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.045) 22%, rgba(255,255,255,0.025) 42%, rgba(255,255,255,0.01) 58%, transparent 72%)",
          transition: "left 0.18s ease, top 0.18s ease",
        }}
      />
    </div>
  );
}
