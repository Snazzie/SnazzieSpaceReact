import {
  siTypescript,
  siJavascript,
  siReact,
  siExpo,
  siRust,
  siBun,
  siNodedotjs,
  siDotnet,
  siConvex,
  siHono,
  siDrizzle,
  siTailwindcss,
  siAstro,
  siPostgresql,
  siRedis,
  siRabbitmq,
  siKubernetes,
  siCloudflare,
  siDocker,
  siGit,
  siVite,
  siStripe,
  siFirebase,
  siSqlite,
  siBetterauth,
  siRevenuecat,
  siTauri,
  type SimpleIcon,
} from "simple-icons";

export interface Tech {
  name: string;
  /** simple-icons brand icon; omit when none exists and a monogram is shown instead. */
  icon?: SimpleIcon;
  /** custom logo URL for brands not in simple-icons */
  logoUrl?: string;
}

export interface StackGroup {
  label: string;
  items: Tech[];
}

/** Tech grouped by role. Edit freely; items without an `icon` render an initials tile. */
export const stack: StackGroup[] = [
  {
    label: "Languages",
    items: [
      { name: "C#" },
      { name: "TypeScript", icon: siTypescript },
      { name: "Rust", icon: siRust },
      { name: "JavaScript", icon: siJavascript },
      { name: "SQL", icon: siSqlite },
    ],
  },
  {
    label: "Frontend",
    items: [
      { name: "React", icon: siReact },
      { name: "React Native", icon: siReact },
      { name: "Expo", icon: siExpo },
      { name: "Tauri", icon: siTauri },
      { name: "Astro", icon: siAstro },
      { name: "Tailwind", icon: siTailwindcss },
      { name: "Vite", icon: siVite },
    ],
  },
  {
    label: "Backend",
    items: [
      { name: ".NET", icon: siDotnet },
      { name: "Node.js", icon: siNodedotjs },
      { name: "Bun", icon: siBun },
      { name: "Hono", icon: siHono },
      { name: "Convex", icon: siConvex },
      { name: "Drizzle", icon: siDrizzle },
      { name: "Mastra AI", logoUrl: "/mastra-logo.svg" },
      { name: "Better Auth", icon: siBetterauth },
    ],
  },
  {
    label: "Data & Infra",
    items: [
      { name: "PostgreSQL", icon: siPostgresql },
      { name: "SQLite", icon: siSqlite },
      { name: "Redis", icon: siRedis },
      { name: "RabbitMQ", icon: siRabbitmq },
      { name: "Docker", icon: siDocker },
      { name: "Kubernetes", icon: siKubernetes },
      { name: "Cloudflare", icon: siCloudflare },
      { name: "Firebase", icon: siFirebase },
      { name: "Git", icon: siGit },
    ],
  },
  {
    label: "Payments & Monetization",
    items: [
      { name: "Stripe", icon: siStripe },
      { name: "RevenueCat", icon: siRevenuecat },
    ],
  },
  {
    label: "Testing",
    items: [
      { name: "Playwright" },
      { name: "Maestro" },
    ],
  },
];
