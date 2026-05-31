const LINKS = [
  { href: "#home", label: "Home" },
  { href: "#aboutme", label: "About me" },
  { href: "#projects", label: "Projects" },
];

export function Nav() {
  return (
    <header className="fixed top-0 z-10 w-full bg-[rgba(40,46,72,0.57)]">
      <nav className="flex h-16 items-center gap-8 px-6">
        {LINKS.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="text-white no-underline transition-colors hover:text-[#1890ff]"
          >
            {link.label}
          </a>
        ))}
      </nav>
    </header>
  );
}
