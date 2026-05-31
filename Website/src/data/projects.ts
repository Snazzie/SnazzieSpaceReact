export interface Project {
  title: string;
  description: string;
  href: string; // live site if it exists, else GitHub repo
  image: string; // card image URL
  featured: boolean;
  tech?: string[]; // shown as badges on featured cards
  imageFit?: "cover" | "contain"; // featured card image fit; default cover
  supersedes?: string; // title of an older project this one replaces
  supersededBy?: string; // title of the newer project that replaced this one
  video?: string; // optional autoplay background video for featured cards
  bgImage?: string; // optional static background image for featured cards
  github?: string; // explicit GitHub repo URL; when set, enables dual CTA buttons
  details?: string[]; // bullet points shown in the project modal
}

export const projects: Project[] = [
  {
    title: "Lunar Portfolio",
    description:
      "Personal wealth dashboard. Tracks investments, pensions and retirement in one place, with real returns vs inflation and net worth.",
    href: "https://lunarportfolio.com",
    image: "/logos/lunar.svg",
    featured: true,
    imageFit: "contain",
    tech: ["Expo", "React Native", "Convex"],
    details: [
      "iOS, Android & Web app — currently in waitlist",
      "Live portfolio with allocation, cash balance, and performance tracking",
      "Drill into individual stock buy/sell history and returns",
      "Every trade, dividend, and transaction in one timeline",
      "Smart manual portfolio with auto dividend calculations, split accounting, and income tracking",
      "Real returns vs inflation at a glance",
      "Bank-level security, read-only access — we can never move your money",
    ],
  },
  {
    title: "smartdos",
    description:
      "Wireless AP scanner and deauth attack orchestrator with terminal UI, for ethical penetration testing.",
    href: "https://github.com/Snazzie/smartdos",
    image: "https://raw.githubusercontent.com/Snazzie/smartdos/master/assets/screenshot.png",
    bgImage: "https://raw.githubusercontent.com/Snazzie/smartdos/master/assets/screenshot.png",
    featured: true,
    tech: ["Rust"],
    details: [
      "Linux TUI for authorized wireless penetration testing only",
      "802.11 beacon capture across 2.4 GHz, 5 GHz, and 6 GHz with live channel hopping",
      "Deauth injection, AuthDos, BeaconFlood, broadcast and targeted client deauth",
      "Round-robin or parallel attack orchestration with configurable burst size",
      "Client tracking, pursuit mode, and AP harvest mode for passive client collection",
      "WPA handshake and PMKID capture, compatible with aircrack-ng and hashcat",
      "Session logging and persistence across restarts",
    ],
  },
  {
    title: "RaceIQ",
    description: "AI-powered coaching tool that helps sim racers improve their lap times.",
    href: "https://github.com/SpeedHQ/RaceIQ",
    image: "/logos/raceiq.png",
    featured: true,
    imageFit: "contain",
    tech: ["TypeScript", "Bun", "Mastra AI", "Hono", "Drizzle / libSQL"],
    video: "https://github.com/user-attachments/assets/9200c90d-b039-4616-9b27-9c8e7c53a8ca",
    details: [
      "Supports Forza Motorsport 2023, F1 2025, Assetto Corsa Competizione, and Assetto Corsa Evo",
      "Live telemetry dashboard: speed, inputs, tires, suspension, G-forces, and 3D car visualization",
      "Automatic lap and corner detection with side-by-side comparison and time deltas",
      "Track mapping with live car position",
      "AI coaching: per-lap technique, setup, and tire feedback via your own API key",
      "Tune catalog and car browser with performance data across the community",
      "Free, open-source alternative to Track Titan, Coach Dave Delta, and Racing View",
    ],
  },
  {
    title: "CloudCat",
    description:
      "Cloud monitoring dashboard for Redis, PostgreSQL and RabbitMQ with smart alerts.",
    href: "https://cloudcat.dev",
    image: "/logos/cloudcat.png",
    featured: true,
    imageFit: "contain",
    tech: ["C#", "Rust", "RabbitMQ", "PostgreSQL", "TimescaleDB", "React", "TypeScript"],
    details: [
      "Unified monitoring dashboard for Redis, PostgreSQL, and RabbitMQ",
      "Smart alerting with noise reduction and escalation policies",
      "Direct TimescaleDB access for custom analytics and advanced reporting",
      "Cost-efficient architecture designed for modern infrastructure teams",
    ],
  },
  {
    title: "Dark Theme Hub",
    description: "Dark themes for developers",
    href: "https://github.com/darkthemehub",
    image: "https://avatars2.githubusercontent.com/u/55282763?s=400&v=4",
    featured: false,
  },
  {
    title: "CssToStyleFiles",
    description:
      "Generates multiple types of style files used for applying custom themes to websites",
    href: "https://github.com/DarkThemeHub/CssToStyleFiles",
    image: "https://avatars2.githubusercontent.com/u/55282763?s=400&v=4",
    featured: false,
  },
  {
    title: "Better Task Manager",
    description: "Cross-platform task manager and system monitor, successor to Vital Utilities.",
    href: "https://bettertaskmanager.com",
    image: "/logos/btm.png",
    featured: false,
    supersedes: "Vital Utilities",
  },
  {
    title: "Vital Utilities",
    description: "Modern Windows Task Manager alternative with bells and whistles",
    href: "https://github.com/Vital-Utilities/Vital-Utilities",
    image: "https://avatars.githubusercontent.com/u/98346237?s=200&v=4",
    featured: false,
    supersededBy: "Better Task Manager",
  },
  {
    title: "Media on Tauri",
    description: "Native desktop wrapper for the Plex web client, built with Tauri.",
    href: "https://github.com/Snazzie/MediaOnTauri",
    image: "/logos/mediaontauri.png",
    featured: false,
  },
  {
    title: "Rhythm Unity",
    description: "OSU Clone made in Unity",
    href: "https://github.com/Snazzie/Rhythm-Unity",
    image: "https://avatars.githubusercontent.com/u/19627023?v=4",
    featured: false,
  },
];
