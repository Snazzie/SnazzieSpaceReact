import { motion, useTransform, type useMotionValue } from "motion/react";

const LAYERS = [
  { src: "/images/avatar/layer-far.webp",  depth: 0.2 },
  { src: "/images/avatar/layer-mid.webp",  depth: 0.5 },
  { src: "/images/avatar/layer-near.webp", depth: 0 },
] as const;

const GLITCH = [
  "avatar-glitch-strip-1",
  "avatar-glitch-strip-2",
  "avatar-glitch-strip-3",
] as const;

const MAX_SHIFT = 3;

type MV = ReturnType<typeof useMotionValue<number>>;

export function AvatarParallax({
  className,
  mx,
  my,
  reduce,
}: {
  className?: string;
  mx: MV;
  my: MV;
  reduce: boolean | null;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-full border border-border ${className ?? ""}`}
      style={{ isolation: "isolate" }}
    >
      {/* Base — always visible, grayscale, no parallax */}
      <img
        src="/images/avatar.webp"
        alt="Aaron"
        className="w-full h-full object-cover grayscale"
        fetchPriority="high"
        loading="eager"
        width="840"
        height="840"
      />

      {/* Depth layers — parallax shift, no glitch class so they stay visible */}
      {!reduce && LAYERS.map((layer) => (
        <Layer key={layer.src} src={layer.src} depth={layer.depth} mx={mx} my={my} />
      ))}

      {/* Glitch strips — separate overlays, shift at near speed */}
      {!reduce && GLITCH.map((cls) => (
        <GlitchStrip key={cls} cls={cls} mx={mx} my={my} />
      ))}
    </div>
  );
}

function Layer({ src, depth, mx, my }: { src: string; depth: number; mx: MV; my: MV }) {
  const x = useTransform(mx, [-0.5, 0.5], [-MAX_SHIFT * depth, MAX_SHIFT * depth]);
  const y = useTransform(my, [-0.5, 0.5], [-MAX_SHIFT * depth, MAX_SHIFT * depth]);

  return (
    <motion.img
      src={src}
      alt=""
      aria-hidden
      loading="lazy"
      fetchPriority="low"
      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
      style={{ x, y }}
      className="absolute inset-0 w-full h-full object-cover pointer-events-none grayscale"
    />
  );
}

function GlitchStrip({ cls, mx, my }: { cls: string; mx: MV; my: MV }) {
  const x = useTransform(mx, [-0.5, 0.5], [-MAX_SHIFT, MAX_SHIFT]);
  const y = useTransform(my, [-0.5, 0.5], [-MAX_SHIFT, MAX_SHIFT]);

  return (
    <motion.img
      aria-hidden
      src="/images/avatar.webp"
      alt=""
      style={{ x, y }}
      className={`avatar-glitch-strip ${cls}`}
    />
  );
}
