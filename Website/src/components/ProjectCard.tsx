import { useState } from "react";
import { motion, useReducedMotion, type Variants } from "motion/react";
import { Badge } from "@/components/ui/badge";
import { Archive, ArrowUp, ArrowUpRight } from "lucide-react";
import type { Project } from "@/data/projects";
import { D, EASE } from "@/lib/motion";
import { ProjectModal } from "@/components/ProjectModal";

const reveal: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: D.base, ease: EASE, delay: (i % 3) * 0.06 },
  }),
};

const SPOTLIGHT =
  "radial-gradient(420px circle at var(--cx, 50%) var(--cy, 50%), rgba(255,255,255,0.06), transparent 60%)";

function LogoTile({ src, alt, dim = false }: { src: string; alt: string; dim?: boolean }) {
  return (
    <div className="relative z-20 flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-secondary">
      <img
        src={src}
        alt={alt}
        className={`size-full object-contain p-1.5 ${dim ? "grayscale" : ""}`}
      />
    </div>
  );
}

export function ProjectCard({
  project,
  index = 0,
  className = "",
}: {
  project: Project;
  index?: number;
  className?: string;
}) {
  const { title, description, href, image, featured, tech, supersedes, supersededBy, video, bgImage } = project;
  // Called unconditionally (before the featured early-return) to keep hook order stable.
  const [expanded, setExpanded] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const reduce = useReducedMotion();

  // Cursor spotlight: sets CSS vars consumed by the overlay's radial gradient.
  const onMove = reduce
    ? undefined
    : (e: React.PointerEvent<HTMLElement>) => {
        const el = e.currentTarget;
        const r = el.getBoundingClientRect();
        el.style.setProperty("--cx", `${e.clientX - r.left}px`);
        el.style.setProperty("--cy", `${e.clientY - r.top}px`);
      };

  const revealProps = {
    custom: index,
    variants: reveal,
    initial: reduce ? (false as const) : "hidden",
    whileInView: "show",
    viewport: { once: true, amount: 0.2 },
    onPointerMove: onMove,
  };

  if (featured) {
    return (
      <>
        <motion.div
          {...revealProps}
          role="button"
          tabIndex={0}
          onClick={() => setModalOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setModalOpen(true);
            }
          }}
          className={`group relative cursor-pointer overflow-hidden rounded-2xl border border-border bg-card p-6 transition duration-200 hover:-translate-y-1 hover:border-zinc-600 ${className}`}
        >
          {video && !reduce && (
            <>
              <video
                aria-hidden
                src={video}
                autoPlay
                muted
                loop
                playsInline
                className="pointer-events-none absolute inset-0 z-0 size-full object-cover opacity-60 transition-opacity duration-300 group-hover:opacity-100"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 z-[5] bg-gradient-to-t from-card via-card/70 to-card/30 transition-opacity duration-300 group-hover:opacity-0"
              />
            </>
          )}
          {bgImage && !video && (
            <>
              <img
                aria-hidden
                src={bgImage}
                alt=""
                className="pointer-events-none absolute inset-0 z-0 size-full object-cover opacity-60 transition-opacity duration-300 group-hover:opacity-100"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 z-[5] bg-gradient-to-t from-card via-card/70 to-card/30 transition-opacity duration-300 group-hover:opacity-0"
              />
            </>
          )}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-10 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            style={{ background: SPOTLIGHT }}
          />
          <div className={`relative z-20 transition-opacity duration-300 ${(video && !reduce) || bgImage ? "group-hover:opacity-0" : ""}`}>
            <LogoTile src={image} alt={title} />
            <h3 className="mt-4 flex items-center gap-1.5 text-lg font-semibold text-foreground">
              {title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
            {tech && tech.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {tech.map((t) => (
                  <Badge key={t} variant="outline" className="border-border text-muted-foreground">
                    {t}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </motion.div>
        <ProjectModal project={project} open={modalOpen} onOpenChange={setModalOpen} />
      </>
    );
  }

  // Compact "More projects" card: tap/click the body to expand the description
  // (works on mobile); the ↗ arrow opens the project.
  return (
    <motion.div
      {...revealProps}
      className={`group relative overflow-hidden rounded-xl border border-border bg-card transition hover:border-zinc-600 ${
        supersededBy ? "opacity-60 hover:opacity-100" : ""
      } ${className}`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-10 rounded-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: SPOTLIGHT }}
      />
      <div
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setExpanded((v) => !v);
          }
        }}
        className="relative z-20 flex cursor-pointer items-start gap-4 p-4 pr-10 text-left"
      >
        <LogoTile src={image} alt={title} dim={!!supersededBy} />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-medium text-foreground">{title}</h3>
          <p className={`text-xs text-muted-foreground ${expanded ? "" : "line-clamp-1"}`}>
            {description}
          </p>
          {supersedes && (
            <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-foreground/25 px-2 py-0.5 text-[11px] font-medium text-foreground/90">
              <ArrowUp className="size-3" />
              Replaces {supersedes}
            </span>
          )}
          {supersededBy && (
            <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
              <Archive className="size-3" />
              Superseded by {supersededBy}
            </span>
          )}
        </div>
      </div>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Open ${title}`}
        className="absolute right-3 top-3 z-30 text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowUpRight className="size-4" />
      </a>
    </motion.div>
  );
}
