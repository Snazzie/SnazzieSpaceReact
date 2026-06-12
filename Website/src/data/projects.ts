export interface Project {
  title: string;
  description: string;
  href: string; // live site if it exists, else GitHub repo
  image: string; // card image URL
  featured: boolean;
  tech?: string[]; // shown as badges on featured cards; also drives the TechStack sphere's "used in"
  imageFit?: "cover" | "contain"; // featured card image fit; default cover
  supersedes?: string; // title of an older project this one replaces
  supersededBy?: string; // title of the newer project that replaced this one
  video?: string; // optional autoplay background video for featured cards
  bgVideo?: string; // optional looping background video (alias used by some cards)
  bgImage?: string; // optional static background image for featured cards
  github?: string; // explicit GitHub repo URL; when set, enables dual CTA buttons
  details?: string[]; // bullet points shown in the project modal
  imgWidth?: number; // native image width for aspect-ratio hint
  imgHeight?: number; // native image height for aspect-ratio hint
}

export const projects: Project[] = [
  {
    title: "Snazzie FM",
    description:
      "Absurdist AI radio station. Multi-voice call-in comedy generated with cloned TTS voices, played on a shared Web Audio timeline.",
    href: "/snazziefm",
    image: "/images/radio/radio-card.png",
    featured: true,
    imageFit: "cover",
    imgWidth: 1280,
    imgHeight: 800,
    tech: [
      "Astro",
      "React",
      "TypeScript",
      "Tailwind",
      "Vite",
      "Bun",
      "Hono",
      "Cloudflare",
      "Playwright",
      "Web Audio API",
      "OmniVoice",
      "Python",
    ],
    details: [
      "Multi-voice call-in radio comedy from a full cast of cloned TTS voices",
      "Per-line audio clips scheduled on a shared Web Audio timeline for real overlap and talk-over",
      "Two TTS engines: OmniVoice multitrack and Dia2 for natural 2-hander conversations",
      "Retro broadcast landing page with an inline station feed that rolls through the lineup",
    ],
  },
  {
    title: "Lunar Portfolio",
    description:
      "Personal wealth dashboard. Tracks investments, pensions and retirement in one place, with real returns vs inflation and net worth.",
    href: "https://lunarportfolio.com",
    image: "/lunar-home-sm.webp",
    featured: true,
    imageFit: "contain",
    imgWidth: 400,
    imgHeight: 867,
    tech: [
      "iOS",
      "Android",
      "Expo",
      "React Native",
      "React",
      "TypeScript",
      "Tailwind",
      "Bun",
      "Hono",
      "Convex",
      "Cloudflare",
      "PostgreSQL",
      "SQLite",
      "Docker",
      "Firebase",
      "Stripe",
      "Maestro",
      "AI Agent",
      "OpenAI",
    ],
    details: [
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
    tech: ["Linux", "Rust"],
    video: "/smartdos-bg.mp4",
    details: [
      "Linux TUI — keyboard-driven, no GUI required",
      "Scans nearby access points across 2.4 GHz, 5 GHz, and 6 GHz",
      "Orchestrates deauth and AuthDos attacks on selected targets",
    ],
  },
  {
    title: "RaceIQ",
    description: "Helps sim racers go faster and understand why they're slow.",
    href: "https://github.com/SpeedHQ/RaceIQ",
    image: "/logos/raceiq.png",
    featured: true,
    imageFit: "contain",
    tech: ["Windows", "TypeScript", "React", "Bun", "Mastra AI", "OpenAI", "Hono", "Drizzle", "SQLite"],
    video: "/raceiq-bg.mp4",
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
    image: "/cloudcat-dashboard.webp",
    featured: true,
    imageFit: "contain",
    imgWidth: 1200,
    imgHeight: 507,
    tech: [
      "C#",
      "Rust",
      "Docker",
      "Kubernetes",
      "Argo CD",
      "RabbitMQ",
      "PostgreSQL",
      "TimescaleDB",
      "React",
      "TypeScript",
      "Drizzle",
      "Better Auth",
    ],
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
    image: "/btm-performance.webp",
    featured: true,
    imageFit: "contain",
    imgWidth: 1200,
    imgHeight: 707,
    tech: [
      "Windows",
      "macOS",
      "Tauri",
      "Rust",
      "React",
      "TypeScript",
      "Astro",
      "Tailwind",
      "Vite",
      "Convex",
      "SQLite",
      "Docker",
      "Firebase",
      "Stripe",
    ],
    supersedes: "Vital Utilities",
    details: [
      "Cross-platform task manager and system monitor for Windows and macOS",
      "Per-core CPU usage, temperature, and clock speed at a glance",
      "Live GPU, memory, network, power, and disk metrics",
      "Top resource consumers with per-process breakdown",
      "Package temperature and fan speed readouts",
    ],
  },
  {
    title: "Vital Utilities",
    description: "Modern Windows Task Manager alternative with bells and whistles",
    href: "https://github.com/Vital-Utilities/Vital-Utilities",
    image: "https://avatars.githubusercontent.com/u/98346237?s=200&v=4",
    bgImage: "/vital-utilities.png",
    featured: false,
    supersededBy: "Better Task Manager",
    tech: ["C#", ".NET", "TypeScript", "Rust", "React", "Tauri", "Vite", "SQLite"],
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
    featured: true,
    bgVideo: "/hero-bg.webm",
    tech: ["Windows", "Android", "Unity", "C#"],
    details: [
      "Auto play mode for learning and showcase replays",
      "Translates osu! maps to custom game format for broad compatibility",
      "Real-time hit detection and feedback scoring system",
      "Combo tracking and performance statistics",
    ],
  },
];
