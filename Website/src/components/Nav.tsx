import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { EASE, D } from "@/lib/motion";

const LINKS = [
  { href: "#home", label: "Home" },
  { href: "#aboutme", label: "About me" },
  { href: "#projects", label: "Projects" },
];

const SECTION_IDS = ["home", "aboutme", "projects"];

export function Nav() {
  const reduce = useReducedMotion();
  const [active, setActive] = useState<string>("home");

  useEffect(() => {
    const sections = SECTION_IDS.map((id) => document.getElementById(id)).filter(
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
      initial={reduce ? false : { y: -64, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: D.base, ease: EASE }}
      className="fixed top-0 z-50 w-full border-b border-border bg-background/70 backdrop-blur"
    >
      <nav className="mx-auto flex h-16 max-w-5xl items-center gap-6 px-6">
        {LINKS.map((link) => {
          const id = link.href.slice(1);
          const isActive = active === id;
          return (
            <a
              key={link.href}
              href={link.href}
              className={`relative text-sm transition-colors ${
                isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {link.label}
              {isActive && (
                <motion.span
                  layoutId="nav-active"
                  className="absolute -bottom-1 left-0 right-0 h-px bg-foreground"
                  transition={{ duration: 0.25, ease: EASE }}
                />
              )}
            </a>
          );
        })}
      </nav>
    </motion.header>
  );
}
