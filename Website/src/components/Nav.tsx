const LINKS = [
  { href: "#home", label: "Home" },
  { href: "#aboutme", label: "About me" },
  { href: "#projects", label: "Projects" },
];

export function Nav() {
  return (
    <header className="fixed top-0 z-50 w-full border-b border-border bg-background/70 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-5xl items-center gap-6 px-6">
        {LINKS.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            {link.label}
          </a>
        ))}
      </nav>
    </header>
  );
}
