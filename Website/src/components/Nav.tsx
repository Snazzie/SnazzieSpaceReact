import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { EASE, D } from "@/lib/motion";

const LINKS = [
  { href: "#home", label: "About", id: "home" },
  { href: "#career", label: "Career", id: "career" },
  { href: "#stack", label: "Stack", id: "stack" },
  { href: "#projects", label: "Projects", id: "projects" },
  { href: "#github", label: "GitHub", id: "github" },
  { href: "#hire", label: "Hire Me", id: "hire" },
];

const NAV_LINKS = LINKS.filter((l) => l.id !== "home");

export function Nav() {
  const reduce = useReducedMotion();
  const [active, setActive] = useState<string>("home");
  const [menuOpen, setMenuOpen] = useState(false);
  const mobileNavRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sections = LINKS.map((l) => document.getElementById(l.id)).filter(
      (el): el is HTMLElement => el !== null,
    );
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      { rootMargin: "-40% 0px -55% 0px" },
    );
    for (const section of sections) observer.observe(section);
    return () => observer.disconnect();
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
          return (
            <a
              key={link.href}
              href={link.href}
              aria-current={isActive ? "page" : undefined}
              className="relative rounded-full px-3.5 py-2 text-sm transition-colors"
            >
              {isActive && (
                <motion.span
                  layoutId="nav-glider"
                  className="absolute inset-0 rounded-full bg-foreground"
                  transition={{ duration: reduce ? 0 : 0.3, ease: EASE }}
                />
              )}
              <span
                className={`relative z-10 transition-colors ${
                  isActive ? "text-background" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {link.label}
              </span>
            </a>
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
          <span className="flex-1 text-center text-sm text-muted-foreground">
            {activeLabel}
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
                  <a
                    key={link.href}
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
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.header>
  );
}
