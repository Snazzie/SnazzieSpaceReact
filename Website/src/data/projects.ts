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
}

export const projects: Project[] = [
  {
    title: "Lunar Portfolio",
    description:
      "Personal wealth dashboard — tracks investments, pensions and retirement in one place, with real returns vs inflation and net worth.",
    href: "https://lunarportfolio.com",
    image: "https://lunarportfolio.com/favicon.svg",
    featured: true,
    imageFit: "contain",
    tech: ["Expo", "React Native", "Convex"],
  },
  {
    title: "RaceIQ",
    description: "AI-powered coaching tool that helps sim racers improve their lap times.",
    href: "https://github.com/SpeedHQ/RaceIQ",
    image: "https://raw.githubusercontent.com/SpeedHQ/RaceIQ/main/assets/raceiq-logo.png",
    featured: true,
    imageFit: "contain",
    tech: ["TypeScript", "Bun", "Mastra AI", "Hono", "Drizzle / libSQL"],
  },
  {
    title: "CloudCat",
    description:
      "Cloud monitoring dashboard for Redis, PostgreSQL and RabbitMQ with smart alerts.",
    href: "https://cloudcat.dev",
    image: "https://cloudcat.dev/logo.png",
    featured: true,
    imageFit: "contain",
    tech: ["C#", "Rust", "RabbitMQ", "TimescaleDB", "React", "TypeScript"],
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
    // PLACEHOLDER name + href — update once the project is public.
    title: "Better Task Manager",
    description: "Next-gen Windows task manager — the successor to Vital Utilities.",
    href: "https://github.com/Vital-Utilities",
    image: "https://avatars.githubusercontent.com/u/98346237?s=200&v=4",
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
    title: "Rhythm Unity",
    description: "OSU Clone made in Unity",
    href: "https://github.com/Snazzie/Rhythm-Unity",
    image: "https://avatars.githubusercontent.com/u/19627023?v=4",
    featured: false,
  },
];
