import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { EASE, D } from "@/lib/motion";

const LINKS = [
  { href: "#aboutme", label: "About", id: "aboutme" },
  { href: "#career", label: "Career", id: "career" },
  { href: "#projects", label: "Projects", id: "projects" },
  { href: "#hire", label: "Hire Me", id: "hire" },
];

export function Nav() {
  const reduce = useReducedMotion();
  const [active, setActive] = useState<string>(LINKS[0].id);

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

  return (
    <motion.header
      initial={reduce ? false : { y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: D.base, ease: EASE }}
      className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center pt-4"
    >
      <nav className="pointer-events-auto flex items-center gap-1 rounded-full border border-border bg-card/80 px-2 py-1.5 backdrop-blur-md">
        <a
          href="#home"
          aria-label="Home"
          className="flex items-center gap-2 px-3 text-sm font-semibold text-foreground"
        >
          <span className="size-2 rounded-full bg-foreground" aria-hidden />
          Aaron
        </a>
        {LINKS.map((link) => {
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
    </motion.header>
  );
}
