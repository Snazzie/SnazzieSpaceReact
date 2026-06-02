import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion, type Variants } from "motion/react";
import { Badge } from "@/components/ui/badge";
import { Archive, ArrowUp, ArrowUpRight, Globe } from "lucide-react";
import { FaWindows } from "react-icons/fa6";
import { siApple, siLinux, siAndroid } from "simple-icons";
import type { Project } from "@/data/projects";
import { D, EASE } from "@/lib/motion";
import { ProjectModal } from "@/components/ProjectModal";

const PLATFORM_TAGS = new Set(["iOS", "Android", "Windows", "macOS", "Linux", "Web"]);

function AppleLogo() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 fill-muted-foreground" aria-hidden>
      <path d={siApple.path} />
    </svg>
  );
}

function LinuxLogo() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 fill-muted-foreground" aria-hidden>
      <path d={siLinux.path} />
    </svg>
  );
}

function AndroidLogo() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 fill-muted-foreground" aria-hidden>
      <path d={siAndroid.path} />
    </svg>
  );
}

export function getPlatformIcon(tag: string) {
  switch (tag) {
    case "iOS":
    case "macOS":
      return <AppleLogo />;
    case "Android":
      return <AndroidLogo />;
    case "Windows":
      return <FaWindows className="size-4" />;
    case "Linux":
      return <LinuxLogo />;
    case "Web":
      return <Globe className="size-4" />;
    default:
      return null;
  }
}

export function getTechBadges(tech: string[] | undefined) {
  if (!tech) return { platforms: [], other: [] };
  const platforms = tech.filter((t) => PLATFORM_TAGS.has(t));
  const other = tech.filter((t) => !PLATFORM_TAGS.has(t));
  return { platforms, other };
}

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
        width={48}
        height={48}
        className={`size-full object-contain p-1.5 ${dim ? "grayscale" : ""}`}
      />
    </div>
  );
}

export function ProjectCard({
  project,
  index = 0,
  className = "",
  images,
}: {
  project: Project;
  index?: number;
  className?: string;
  images?: Record<string, string>;
}) {
  const { title, description, href, featured, tech, supersedes, supersededBy, video: projectVideo, bgVideo } = project;
  const video = projectVideo || bgVideo;
  // Resolve raw data URLs to Astro-optimized variants when a map entry exists.
  const image = (images && images[project.image]) || project.image;
  const bgImage = project.bgImage ? (images && images[project.bgImage]) || project.bgImage : undefined;
  const [modalOpen, setModalOpen] = useState(false);
  const reduce = useReducedMotion();
  const videoRef = useRef<HTMLVideoElement>(null);

  // React sets `muted` as a property after the autoplay check, so the browser
  // can treat the element as unmuted and block autoplay. Force it on mount.
  useEffect(() => {
    const el = videoRef.current;
    if (!el || reduce) return;
    el.muted = true;
    el.play().catch(() => {});
  }, [reduce, video]);

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
          className={`group relative cursor-pointer overflow-hidden rounded-2xl border border-border bg-card p-6 transition duration-200 hover:-translate-y-1 hover:border-zinc-600 min-h-52 ${className}`}
        >
          {video && !reduce && (
            <>
              <video
                ref={videoRef}
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
                width={400}
                height={300}
                className="pointer-events-none absolute inset-0 z-0 size-full object-cover opacity-60 transition-opacity duration-300 group-hover:opacity-100"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 z-[5] bg-gradient-to-t from-card via-card/70 to-card/30 transition-opacity duration-300 group-hover:opacity-0"
              />
            </>
          )}
          {!(video && !reduce) && !bgImage && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 z-10 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              style={{ background: SPOTLIGHT }}
            />
          )}
          <div className={`relative z-20 transition-opacity duration-300 ${(video && !reduce) || bgImage ? "group-hover:opacity-0" : ""}`}>
            <LogoTile src={image} alt={title} />
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold text-foreground">
                {title}
              </h3>
              {tech && getTechBadges(tech).platforms.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {getTechBadges(tech).platforms.map((t) => (
                    <span key={t} className="flex items-center gap-1 text-xs text-muted-foreground">
                      {getPlatformIcon(t)}
                      <span className="hidden sm:inline">{t}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
            {tech && getTechBadges(tech).other.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {getTechBadges(tech).other.map((t) => (
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
        className={`group relative cursor-pointer overflow-hidden rounded-xl border border-border bg-card transition hover:-translate-y-0.5 hover:border-zinc-600 ${
          supersededBy ? "opacity-60 hover:opacity-100" : ""
        } ${className}`}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-10 rounded-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{ background: SPOTLIGHT }}
        />
        <div className="relative z-20 flex items-start gap-4 p-4 pr-10">
          <LogoTile src={image} alt={title} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <h3 className="text-sm font-medium text-foreground">{title}</h3>
              {tech && getTechBadges(tech).platforms.length > 0 && (
                <div className="flex gap-1">
                  {getTechBadges(tech).platforms.map((t) => (
                    <span key={t} className="flex items-center gap-0.5 text-xs text-muted-foreground">
                      {getPlatformIcon(t)}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <p className="line-clamp-1 text-xs text-muted-foreground">{description}</p>
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
          onClick={(e) => e.stopPropagation()}
          className="absolute right-3 top-3 z-30 text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowUpRight className="size-4" />
        </a>
      </motion.div>
      <ProjectModal project={project} open={modalOpen} onOpenChange={setModalOpen} />
    </>
  );
}
