import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { EASE, D } from "@/lib/motion";
import { projects } from "@/data/projects";
import { projectSlug } from "@/components/FeaturedShowcase";

const LINKS = [
  { href: "#home", label: "About", id: "home" },
  { href: "#career", label: "Career", id: "career" },
  { href: "#stack", label: "Stack", id: "stack" },
  { href: "#projects", label: "Projects", id: "projects" },
  { href: "#github", label: "GitHub", id: "github" },
  { href: "#traffic", label: "Traffic", id: "traffic" },
  { href: "#hire", label: "Hire Me", id: "hire" },
];

const NAV_LINKS = LINKS.filter((l) => l.id !== "home");

const FEATURED = projects
  .filter((p) => p.featured)
  .map((p) => ({ title: p.title, slug: projectSlug(p.title) }));

// Steps the inline nav cycles through while #projects is active: each featured
// panel, then the trailing "More projects" block. Without the final entry the
// inline label sticks on the last panel (Rhythm Unity) all the way through the
// more-projects grid instead of advancing to "More".
const SHOWCASE =
  projects.length > FEATURED.length
    ? [...FEATURED, { title: "More", slug: "more-projects" }]
    : FEATURED;

export function Nav() {
  const reduce = useReducedMotion();
  const [active, setActive] = useState<string>("home");
  const [activeProject, setActiveProject] = useState<string>("");
  const [projectsHover, setProjectsHover] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const mobileNavRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sections = LINKS.map((l) => document.getElementById(l.id)).filter(
      (el): el is HTMLElement => el !== null,
    );
    if (sections.length === 0) return;

    // Track every section currently crossing the detection band. The callback
    // only ever delivers *changed* entries, so "last entry wins" flips active to
    // a newly-entering section (e.g. #github) while the previous one (#projects,
    // whose #more-projects tail is still in the band) hasn't changed and is
    // absent from the batch. Instead keep a running set and always pick the
    // topmost intersecting section in document order (LINKS is in that order).
    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        const top = LINKS.find((l) => visible.has(l.id));
        if (top) setActive(top.id);
      },
      { rootMargin: "-40% 0px -55% 0px" },
    );
    for (const section of sections) observer.observe(section);
    return () => observer.disconnect();
  }, []);

  // Track which featured panel is currently shown. The panels are stacked
  // `sticky top-0`, so they all stay pinned once reached — an IntersectionObserver
  // only ever fires on the way down and never reverts when scrolling up. Compute
  // it from scroll position instead. `offsetTop` reflects layout position and is
  // unaffected by sticky painting, so the doc offsets stay correct.
  useEffect(() => {
    const panels = SHOWCASE.map((p) => document.getElementById(p.slug)).filter(
      (el): el is HTMLElement => el !== null,
    );
    if (panels.length === 0) return;

    const docTop = (el: HTMLElement) => {
      let y = 0;
      let n: HTMLElement | null = el;
      while (n) {
        y += n.offsetTop;
        n = n.offsetParent as HTMLElement | null;
      }
      return y;
    };

    let raf = 0;
    const compute = () => {
      raf = 0;
      const vh = window.innerHeight;
      // A panel becomes the topmost (pinned, covering the rest) once the scroll
      // position reaches its natural top. The current one is the highest such.
      const pos = window.scrollY + 2;
      const tops = panels.map(docTop);
      let idx = -1;
      for (let i = 0; i < tops.length; i++) {
        if (tops[i] <= pos) idx = i;
      }
      // Only within the showcase span (not past the last panel).
      if (idx >= 0 && pos < tops[tops.length - 1] + vh) {
        setActiveProject(panels[idx].id);
      }
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(compute);
    };
    compute();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      if (mobileNavRef.current && !mobileNavRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [menuOpen]);

  const activeLabel = LINKS.find((l) => l.id === active)?.label ?? "";

  return (
    <motion.header
      initial={reduce ? false : { y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: D.base, ease: EASE }}
      className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center pt-4"
    >
      {/* Desktop nav */}
      <nav className="pointer-events-auto hidden md:flex items-center gap-1 rounded-full border border-border bg-card/80 px-2 py-1.5 backdrop-blur-md">
        <a
          href="#home"
          aria-label="Aaron, home"
          className="flex items-center gap-2 px-3 text-sm font-semibold text-foreground"
        >
          <span className="size-2 rounded-full bg-foreground" aria-hidden />
          Aaron
        </a>
        {NAV_LINKS.map((link) => {
          const isActive = active === link.id;
          const activeFeatured =
            link.id === "projects" ? SHOWCASE.find((p) => p.slug === activeProject) : undefined;
          const linkAnchor = (
            <a
              href={link.href}
              aria-current={isActive ? "page" : undefined}
              className="relative block rounded-full px-3.5 py-2 text-sm transition-colors"
            >
              {isActive && (
                <motion.span
                  layoutId="nav-glider"
                  className="absolute inset-0 rounded-full bg-foreground"
                  transition={{ duration: reduce ? 0 : 0.3, ease: EASE }}
                />
              )}
              <span
                className={`relative z-10 flex items-center gap-2 transition-colors ${
                  isActive ? "text-background" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {link.label}
                {/* While in the projects section, extend inline with the current project. */}
                {isActive && activeFeatured && (
                  <>
                    <span aria-hidden className="opacity-40">
                      |
                    </span>
                    <AnimatePresence mode="popLayout" initial={false}>
                      <motion.span
                        key={activeFeatured.slug}
                        initial={reduce ? false : { opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: reduce ? 0 : 0.22, ease: EASE }}
                        className="whitespace-nowrap"
                      >
                        {activeFeatured.title}
                      </motion.span>
                    </AnimatePresence>
                  </>
                )}
              </span>
            </a>
          );

          if (link.id !== "projects") {
            return <div key={link.href}>{linkAnchor}</div>;
          }

          // Projects: dropdown of featured projects, shown on hover only.
          const open = projectsHover;
          return (
            <div
              key={link.href}
              className="relative"
              onMouseEnter={() => setProjectsHover(true)}
              onMouseLeave={() => setProjectsHover(false)}
            >
              {linkAnchor}
              <AnimatePresence>
                {open && (
                  <motion.div
                    initial={reduce ? false : { opacity: 0, y: -6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.97 }}
                    transition={{ duration: 0.18, ease: EASE }}
                    className="absolute left-1/2 top-full z-50 mt-2 w-56 -translate-x-1/2 overflow-hidden rounded-2xl border border-border bg-card/90 p-1.5 backdrop-blur-md"
                  >
                    {FEATURED.map((p, i) => {
                      const on = activeProject === p.slug;
                      return (
                        <a
                          key={p.slug}
                          href={`#${p.slug}`}
                          onClick={() => setProjectsHover(false)}
                          aria-current={on ? "true" : undefined}
                          className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm transition-colors ${
                            on
                              ? "bg-foreground font-medium text-background"
                              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                          }`}
                        >
                          <span className={`font-mono text-xs ${on ? "text-background/70" : "text-muted-foreground/60"}`}>
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          {p.title}
                        </a>
                      );
                    })}
                    {projects.length > FEATURED.length && (
                      <a
                        href="#more-projects"
                        onClick={() => setProjectsHover(false)}
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
                      >
                        <span className="font-mono text-xs text-muted-foreground/60">→</span>
                        More
                      </a>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </nav>

      {/* Mobile nav */}
      <div ref={mobileNavRef} className="pointer-events-auto flex md:hidden flex-col items-stretch gap-2 w-full px-4">
        <nav className="flex items-center gap-1 rounded-full border border-border bg-card/80 px-2 py-1.5 backdrop-blur-md">
          <a
            href="#home"
            aria-label="Aaron, home"
            className="flex items-center gap-2 px-3 text-sm font-semibold text-foreground"
          >
            <span className="size-2 rounded-full bg-foreground" aria-hidden />
            Aaron
          </a>
          <span className="relative flex-1 overflow-hidden text-center text-sm text-muted-foreground">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={activeLabel}
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduce ? 0 : 0.22, ease: EASE }}
                className="block"
              >
                {activeLabel}
              </motion.span>
            </AnimatePresence>
          </span>
          <button
            type="button"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center justify-center rounded-full px-3.5 py-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <div className="relative h-3.5 w-4">
              <motion.span
                className="absolute left-0 top-0 block h-0.5 w-full rounded-full bg-current"
                animate={menuOpen ? { rotate: 45, y: 6 } : { rotate: 0, y: 0 }}
                transition={{ duration: reduce ? 0 : 0.2 }}
              />
              <motion.span
                className="absolute left-0 top-1/2 -translate-y-1/2 block h-0.5 w-full rounded-full bg-current"
                animate={menuOpen ? { opacity: 0, scaleX: 0 } : { opacity: 1, scaleX: 1 }}
                transition={{ duration: reduce ? 0 : 0.2 }}
              />
              <motion.span
                className="absolute bottom-0 left-0 block h-0.5 w-full rounded-full bg-current"
                animate={menuOpen ? { rotate: -45, y: -6 } : { rotate: 0, y: 0 }}
                transition={{ duration: reduce ? 0 : 0.2 }}
              />
            </div>
          </button>
        </nav>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={reduce ? false : { opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ duration: 0.2, ease: EASE }}
              className="overflow-hidden rounded-2xl border border-border bg-card/90 backdrop-blur-md"
            >
              {NAV_LINKS.map((link) => {
                const isActive = active === link.id;
                return (
                  <div key={link.href}>
                    <a
                      href={link.href}
                      onClick={() => setMenuOpen(false)}
                      aria-current={isActive ? "page" : undefined}
                      className={`flex items-center justify-between px-5 py-3.5 text-sm transition-colors ${
                        isActive
                          ? "bg-foreground font-medium text-background"
                          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                      }`}
                    >
                      {link.label}
                      {isActive && <span className="size-1.5 rounded-full bg-background" />}
                    </a>
                    {link.id === "projects" && (
                      <div className="border-l border-border/60 pl-4 pb-1">
                        {FEATURED.map((p) => {
                          const on = activeProject === p.slug;
                          return (
                            <a
                              key={p.slug}
                              href={`#${p.slug}`}
                              onClick={() => setMenuOpen(false)}
                              className={`block px-5 py-2.5 text-sm transition-colors ${
                                on ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              {p.title}
                            </a>
                          );
                        })}
                        {projects.length > FEATURED.length && (
                          <a
                            href="#more-projects"
                            onClick={() => setMenuOpen(false)}
                            className="block px-5 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                          >
                            → More
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.header>
  );
}
