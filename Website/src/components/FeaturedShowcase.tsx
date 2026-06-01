import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { Badge } from "@/components/ui/badge";
import { Globe } from "lucide-react";
import type { Project } from "@/data/projects";
import { EASE } from "@/lib/motion";
import { getPlatformIcon, getTechBadges } from "@/components/ProjectCard";

function GithubMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 fill-current" aria-hidden>
      <path d="M12 .5C5.37.5 0 5.78 0 12.292c0 5.211 3.438 9.63 8.205 11.188.6.111.82-.254.82-.567 0-.28-.01-1.022-.015-2.005-3.338.711-4.042-1.582-4.042-1.582-.546-1.361-1.335-1.725-1.335-1.725-1.087-.731.084-.716.084-.716 1.205.082 1.838 1.215 1.838 1.215 1.07 1.803 2.809 1.282 3.495.981.108-.763.417-1.282.76-1.577-2.665-.295-5.466-1.309-5.466-5.827 0-1.287.465-2.339 1.235-3.164-.135-.298-.54-1.497.105-3.121 0 0 1.005-.316 3.3 1.209.96-.262 1.98-.392 3-.398 1.02.006 2.04.136 3 .398 2.28-1.525 3.285-1.209 3.285-1.209.645 1.624.24 2.823.12 3.121.765.825 1.23 1.877 1.23 3.164 0 4.53-2.805 5.527-5.475 5.817.42.354.81 1.077.81 2.182 0 1.578-.015 2.846-.015 3.229 0 .309.21.678.825.56C20.565 21.917 24 17.495 24 12.292 24 5.78 18.627.5 12 .5z" />
    </svg>
  );
}

/** Stable anchor id for a featured project, used by the nav dropdown. */
export function projectSlug(title: string) {
  return `project-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

function Media({
  project,
  images,
  index,
}: {
  project: Project;
  images?: Record<string, string>;
  index: number;
}) {
  const reduce = useReducedMotion();
  const videoRef = useRef<HTMLVideoElement>(null);
  const video = project.video || project.bgVideo;
  const image = (images && images[project.image]) || project.image;
  const bgImage = project.bgImage
    ? (images && images[project.bgImage]) || project.bgImage
    : undefined;

  // Only play video when the panel is in the viewport — prevents 2-3 MB
  // of off-screen video data from being fetched on page load.
  useEffect(() => {
    const el = videoRef.current;
    if (!el || reduce) return;
    el.muted = true;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.play().catch(() => {});
        } else {
          el.pause();
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [reduce, video]);

  // The media element sizes to its own intrinsic aspect ratio (height-capped),
  // so the border + background hug the media exactly with no letterbox bars.
  const cls =
    "h-auto max-h-[32dvh] md:max-h-[55dvh] w-auto max-w-full rounded-2xl bg-secondary" +
    (index === 0 ? "" : " border border-border");
  if (video && !reduce) {
    return (
      <video
        ref={videoRef}
        aria-hidden
        src={video}
        preload="none"
        muted
        loop
        playsInline
        className={cls}
      />
    );
  }
  if (bgImage) {
    return (
      <img
        aria-hidden
        src={bgImage}
        alt=""
        loading="lazy"
        className={cls}
      />
    );
  }
  return (
    <img
      src={image}
      alt={project.title}
      loading="lazy"
      width={project.imgWidth}
      height={project.imgHeight}
      className={cls}
    />
  );
}

function Panel({
  project,
  index,
  total,
  images,
}: {
  project: Project;
  index: number;
  total: number;
  images?: Record<string, string>;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const flip = index % 2 === 1;
  const isLast = index === total - 1;

  // The panel is pinned (position: sticky), so its own getBoundingClientRect
  // freezes at top:0 while covered — useScroll on it saturates at 0. Instead we
  // drive the cover animation from the page scroll over the span [start, start+vh]
  // where this panel is pinned and the next one slides up over it.
  const { scrollY } = useScroll();
  const [span, setSpan] = useState<[number, number]>([0, 1]);
  useEffect(() => {
    const measure = () => {
      const el = ref.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top + window.scrollY;
      setSpan([top, top + window.innerHeight]);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);
  const scale = useTransform(scrollY, [span[0], span[1]], [1, 0.92]);
  const opacity = useTransform(
    scrollY,
    [span[0], span[0] + (span[1] - span[0]) * 0.85],
    [1, 0.35],
  );
  const animate = !reduce && !isLast;

  const { platforms, other } = getTechBadges(project.tech);

  // Label links by type: a live site shows as "Website", a repo as "GitHub".
  // `href` is the live site if one exists, else the repo; `github` is explicit.
  const isGithub = (url: string) => /github\.com/i.test(url);
  const links: { kind: "website" | "github"; label: string; href: string }[] = isGithub(
    project.href,
  )
    ? [{ kind: "github", label: "GitHub", href: project.href }]
    : [
        { kind: "website", label: "Website", href: project.href },
        ...(project.github
          ? [{ kind: "github" as const, label: "GitHub", href: project.github }]
          : []),
      ];

  return (
    <div
      ref={ref}
      id={projectSlug(project.title)}
      className="sticky top-0 flex h-[100dvh] items-start md:items-center overflow-hidden border-t border-border bg-background scroll-mt-0"
    >
      <motion.div
        style={animate ? { scale, opacity } : undefined}
        className="mx-auto grid w-full max-w-6xl items-center gap-8 px-6 pt-20 md:pt-0 md:grid-cols-2 md:gap-12"
      >
        {/* Media: border/background hug the media's own aspect ratio. */}
        <div className={`flex justify-center ${flip ? "md:order-2 md:justify-end" : "md:justify-start"}`}>
          <Media project={project} images={images} index={index} />
        </div>

        {/* Text */}
        <div className={flip ? "md:order-1" : ""}>
          <span className="font-mono text-sm text-muted-foreground">
            {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
          </span>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h3 className="text-2xl font-semibold tracking-tight md:text-4xl">
              {project.title}
            </h3>
            {platforms.length > 0 && (
              <div className="flex flex-wrap gap-2 text-muted-foreground">
                {platforms.map((t) => (
                  <span key={t} className="flex items-center gap-1 text-sm">
                    {getPlatformIcon(t)}
                    <span className="hidden sm:inline">{t}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
          <p className="mt-4 max-w-prose text-sm md:text-base leading-relaxed text-muted-foreground">
            {project.description}
          </p>

          {project.details && project.details.length > 0 && (
            <ul className="mt-5 space-y-2">
              {project.details.map((d) => (
                <li key={d} className="flex gap-2 text-sm text-muted-foreground">
                  <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-foreground/40" />
                  <span>{d}</span>
                </li>
              ))}
            </ul>
          )}

          {other.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-1.5">
              {other.map((t) => (
                <Badge key={t} variant="outline" className="border-border text-muted-foreground">
                  {t}
                </Badge>
              ))}
            </div>
          )}

          <div className="mt-4 md:mt-7 flex flex-wrap items-center gap-4">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2 text-sm font-medium transition hover:-translate-y-0.5 hover:border-zinc-600"
              >
                {link.kind === "github" ? <GithubMark /> : <Globe className="size-4" />}
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export function FeaturedShowcase({
  projects,
  images,
}: {
  projects: Project[];
  images?: Record<string, string>;
}) {
  const reduce = useReducedMotion();
  return (
    <div className="relative">
      <motion.div
        initial={reduce ? false : { opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease: EASE }}
      >
        {projects.map((project, i) => (
          <Panel
            key={project.title}
            project={project}
            index={i}
            total={projects.length}
            images={images}
          />
        ))}
      </motion.div>
    </div>
  );
}
