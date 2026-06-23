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
      "An AI-powered comedy radio station that writes and voices its own call-in shows, with a full cast of characters you can listen to right in the browser.",
    href: "/snazziefm",
    image: "/snazziefm/images/radio-card.webp",
    featured: true,
    imageFit: "cover",
    imgWidth: 1056,
    imgHeight: 594,
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
      "Vitest",
    ],
    details: [
      "A full cast of distinct characters, each with their own voice, performing short comedy episodes",
      "Scripts and audio are generated automatically and stitched into one seamless broadcast",
      "Plays instantly in the browser through a retro radio player with a rolling station lineup",
    ],
  },
  {
    title: "Lunar Portfolio",
    description:
      "A mobile app that brings your investments, pensions and savings into one place, so you can see your true net worth and whether your money is really growing.",
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
      "Firebase",
      "Stripe",
      "Maestro",
      "AI Agent",
      "OpenAI",
      "Vitest",
    ],
    details: [
      "Brings investments, pensions and savings together in a single, clear view",
      "Shows whether your money is really growing once inflation is taken into account",
      "Keeps a running history of trades, dividends and transactions over time",
    ],
  },
  {
    title: "smartdos",
    description:
      "A security-testing tool that maps the Wi-Fi networks around you and runs controlled disconnection attacks against them, built for ethical penetration testing.",
    href: "https://github.com/Snazzie/smartdos",
    image: "https://raw.githubusercontent.com/Snazzie/smartdos/master/assets/screenshot.png",
    bgImage: "https://raw.githubusercontent.com/Snazzie/smartdos/master/assets/screenshot.png",
    featured: true,
    tech: ["Rust"],
    video: "/smartdos-bg.mp4",
    details: [
      "Scans the surrounding airwaves to map out every nearby Wi-Fi network",
      "Runs controlled attacks against chosen networks to test how well they hold up",
      "Fast, keyboard-driven interface that runs entirely in the terminal",
    ],
  },
  {
    title: "RaceIQ",
    description:
      "A coaching app for racing-game players that records their laps and shows them exactly where, and why, they're losing time.",
    href: "https://github.com/SpeedHQ/RaceIQ",
    image: "/logos/raceiq.png",
    featured: true,
    imageFit: "contain",
    tech: ["Windows", "TypeScript", "React", "Bun", "Mastra AI", "OpenAI", "Hono", "Drizzle", "SQLite", "Playwright", "Vitest"],
    video: "/raceiq-bg.mp4",
    details: [
      "Works with popular racing games including Forza, F1 25 and Assetto Corsa",
      "Records every lap and shows a live dashboard of what the car is doing",
      "Pinpoints where time is lost, corner by corner, and compares laps side by side",
      "Optional AI coach that reviews each lap and suggests how to improve",
    ],
  },
  {
    title: "CloudCat",
    description:
      "A dashboard that keeps an eye on the behind-the-scenes systems that power an app and warns the team the moment something starts to go wrong.",
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
      "Vitest",
    ],
    details: [
      "Watches the key systems that keep an app running and flags trouble early",
      "Smart alerts that cut through the noise and escalate only what matters",
      "Keeps a full history of performance so issues can be traced back over time",
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
    description:
      "A polished replacement for the built-in Task Manager on Windows and Mac that shows exactly what a computer is doing and what's slowing it down.",
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
      "Firebase",
      "Stripe",
      "Vitest",
    ],
    supersedes: "Vital Utilities",
    details: [
      "Shows what's using a computer's power, memory and storage in real time",
      "Highlights the apps and processes that are slowing everything down",
      "Clear readouts for every part of the machine, from processor to graphics card",
      "One consistent experience across both Windows and Mac",
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
    tech: ["C#", ".NET", "TypeScript", "Rust", "React", "Tauri", "Vite", "SQLite", "Vitest"],
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
    description:
      "A rhythm game where players tap along in time to the music, built from scratch in the Unity game engine.",
    href: "https://github.com/Snazzie/Rhythm-Unity",
    image: "https://avatars.githubusercontent.com/u/19627023?v=4",
    featured: true,
    bgVideo: "/hero-bg.webm",
    tech: ["Windows", "Android", "Unity", "C#"],
    details: [
      "Tap-to-the-beat gameplay with instant scoring and combo tracking",
      "Plays the huge existing library of community-made beatmaps",
      "Auto-play mode that demonstrates a perfect run of any track",
    ],
  },
  {
    title: "Worth My Time",
    description:
      "A free tool that turns a UK salary into what you really earn per hour after tax, then shows how many hours of work any purchase actually costs you.",
    href: "/worthmytime",
    image: "/wmt.png",
    featured: true,
    imageFit: "contain",
    imgWidth: 1389,
    imgHeight: 1570,
    tech: ["Astro", "React", "TypeScript", "Tailwind", "Vite", "Bun", "big.js", "Vitest"],
    details: [
      "Works out your true hourly pay once tax and other deductions are taken off",
      "Shows the real cost of any purchase measured in hours of your life",
      "Compares job offers to reveal which one actually pays more once travel is counted",
    ],
  },
];
