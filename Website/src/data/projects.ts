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
      "iOS, Android & Web app",
      "Connects investments, pensions, and savings in one place",
      "Shows real returns adjusted for inflation",
      "Tracks trades, dividends, and transactions in a single timeline",
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
      "Linux TUI — keyboard-driven, no GUI required",
      "Scans nearby access points across 2.4 GHz, 5 GHz, and 6 GHz",
      "Orchestrates deauth, AuthDos, and BeaconFlood attacks on selected targets",
      "Captures WPA handshakes and PMKIDs for offline cracking",
      "For authorized penetration testing only",
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
      "Windows app supporting Forza, F1 2025, Assetto Corsa Competizione, and Assetto Corsa Evo",
      "Live telemetry dashboard with lap recording",
      "Detailed lap analysis with automatic corner detection, sector splits, and side-by-side lap comparison with time deltas",
      "Optional AI coaching per lap via your own API key",
      "Tune catalog and car browser with community setup data",
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
      "Monitoring dashboard for Redis, PostgreSQL, and RabbitMQ",
      "Smart alerts with noise reduction and escalation policies",
      "TimescaleDB-backed storage for historical metrics and custom queries",
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
