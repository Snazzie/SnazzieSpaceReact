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
  siArgo,
  siVitest,
  type SimpleIcon,
} from "simple-icons";

export interface TechMeta {
  /** one-liner shown on the focus card */
  blurb?: string;
  /** names of related techs (drawn as arcs on the sphere, clickable chips on the card) */
  related?: string[];
  /**
   * Extra "used in" entries beyond the ones derived automatically from
   * `projects.ts` tech badges.
   */
  usedIn?: string[];
}

export interface Tech {
  name: string;
  /** simple-icons brand icon; omit when none exists and a monogram is shown instead. */
  icon?: SimpleIcon;
  /** custom logo URL for brands not in simple-icons */
  logoUrl?: string;
  meta?: TechMeta;
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
      {
        name: "C#",
        meta: {
          blurb: "Primary language for .NET services and desktop tooling.",
          related: [".NET", "Entity Framework", "MassTransit"],
        },
      },
      {
        name: "TypeScript",
        icon: siTypescript,
        meta: {
          blurb: "Default for everything web. Strict mode, no any.",
          related: ["React", "Node.js", "Bun", "Hono", "Astro"],
        },
      },
      {
        name: "Rust",
        icon: siRust,
        meta: {
          blurb: "Systems work and Tauri backends.",
          related: ["Tauri"],
        },
      },
      {
        name: "JavaScript",
        icon: siJavascript,
        meta: {
          blurb: "The substrate underneath all the TypeScript.",
          related: ["TypeScript", "Node.js"],
        },
      },
      {
        name: "SQL",
        icon: siSqlite,
        meta: {
          blurb: "Schema design, window functions, query tuning.",
          related: ["PostgreSQL", "SQLite"],
        },
      },
    ],
  },
  {
    label: "Frontend",
    items: [
      {
        name: "React",
        icon: siReact,
        meta: {
          blurb: "Primary UI library for web and native.",
          related: ["TypeScript", "React Native", "Vite"],
          usedIn: ["snazzie.space"],
        },
      },
      {
        name: "React Native",
        icon: siReact,
        meta: {
          blurb: "Native mobile apps via Expo.",
          related: ["Expo", "React"],
        },
      },
      {
        name: "Expo",
        icon: siExpo,
        meta: {
          blurb: "RN toolchain: native modules, EAS builds.",
          related: ["React Native", "Maestro"],
        },
      },
      {
        name: "Tauri",
        icon: siTauri,
        meta: {
          blurb: "Lightweight desktop apps with a Rust core.",
          related: ["Rust", "React", "TypeScript", "Vite"],
        },
      },
      {
        name: "Astro",
        icon: siAstro,
        meta: {
          blurb: "Static-first framework behind this site. Islands keep the JS tiny.",
          related: ["React", "Tailwind", "Cloudflare"],
          usedIn: ["snazzie.space"],
        },
      },
      {
        name: "Tailwind",
        icon: siTailwindcss,
        meta: {
          blurb: "Utility CSS, v4 via the Vite plugin.",
          related: ["Astro", "Vite"],
          usedIn: ["snazzie.space", "every project with a UI"],
        },
      },
      {
        name: "Vite",
        icon: siVite,
        meta: {
          blurb: "Build tool of choice. Instant HMR.",
          related: ["React", "Tailwind"],
        },
      },
    ],
  },
  {
    label: "Backend",
    items: [
      {
        name: ".NET",
        icon: siDotnet,
        meta: {
          blurb: "Services, APIs and background workers.",
          related: ["C#"],
        },
      },
      {
        name: "Entity Framework",
        meta: {
          blurb: "ORM for .NET — code-first migrations, LINQ queries.",
          related: ["C#", ".NET"],
        },
      },
      {
        name: "MassTransit",
        meta: {
          blurb: "Message bus abstraction over RabbitMQ for .NET services.",
          related: ["C#", ".NET", "RabbitMQ"],
          usedIn: ["CloudCat"],
        },
      },
      {
        name: "Node.js",
        icon: siNodedotjs,
        meta: {
          blurb: "Long-time server runtime.",
          related: ["TypeScript", "Bun", "Hono"],
        },
      },
      {
        name: "Bun",
        icon: siBun,
        meta: {
          blurb: "Default runtime and package manager for new projects.",
          related: ["Node.js", "Hono"],
          usedIn: ["snazzie.space"],
        },
      },
      {
        name: "Hono",
        icon: siHono,
        meta: {
          blurb: "Tiny router powering the Cloudflare Worker behind this site's stats.",
          related: ["Cloudflare", "Bun", "Node.js"],
          usedIn: ["snazzie.space"],
        },
      },
      {
        name: "Convex",
        icon: siConvex,
        meta: {
          blurb: "Reactive backend with durable functions.",
          related: ["TypeScript", "SQL"],
        },
      },
      {
        name: "Drizzle",
        icon: siDrizzle,
        meta: {
          blurb: "Typed SQL ORM.",
          related: ["SQLite", "TypeScript"],
        },
      },
      {
        name: "Mastra AI",
        logoUrl: "/mastra-logo.svg",
        meta: {
          blurb: "Agent framework for AI workflows.",
          related: ["TypeScript", "OpenAI"],
        },
      },
      {
        name: "OpenAI",
        meta: {
          blurb: "GPT and vision models powering AI coaching and analysis features.",
          related: ["Mastra AI", "TypeScript"],
        },
      },
      {
        name: "Better Auth",
        icon: siBetterauth,
        meta: {
          blurb: "Auth without the SaaS bill.",
          related: ["Drizzle"],
        },
      },
    ],
  },
  {
    label: "Data & Infra",
    items: [
      {
        name: "PostgreSQL",
        icon: siPostgresql,
        meta: {
          blurb: "Default relational store.",
          related: ["SQL"],
        },
      },
      {
        name: "SQLite",
        icon: siSqlite,
        meta: {
          blurb: "Embedded data and local-first apps.",
          related: ["SQL", "Drizzle"],
        },
      },
      {
        name: "Redis",
        icon: siRedis,
        meta: {
          blurb: "Cache, queues, rate limits.",
          related: ["RabbitMQ"],
        },
      },
      {
        name: "RabbitMQ",
        icon: siRabbitmq,
        meta: {
          blurb: "Message broker for decoupling services.",
          related: ["Redis"],
        },
      },
      {
        name: "Docker",
        icon: siDocker,
        meta: {
          blurb: "Containers for everything that isn't edge.",
          related: ["Kubernetes"],
        },
      },
      {
        name: "Kubernetes",
        icon: siKubernetes,
        meta: {
          blurb: "Orchestration when compose stops scaling.",
          related: ["Docker", "Argo CD"],
        },
      },
      {
        name: "Argo CD",
        icon: siArgo,
        meta: {
          blurb: "GitOps continuous delivery for Kubernetes.",
          related: ["Kubernetes", "Git", "Docker"],
          usedIn: ["CloudCat"],
        },
      },
      {
        name: "Cloudflare",
        icon: siCloudflare,
        meta: {
          blurb: "Pages, Workers, KV. This site lives here.",
          related: ["Hono", "Astro"],
          usedIn: ["all my domains and landing pages"],
        },
      },
      {
        name: "Firebase",
        icon: siFirebase,
        meta: {
          blurb: "Auth and push for mobile.",
          related: ["React Native"],
        },
      },
      {
        name: "Git",
        icon: siGit,
        meta: {
          blurb: "Version control. Obviously.",
        },
      },
    ],
  },
  {
    label: "Payments & Monetization",
    items: [
      {
        name: "Stripe",
        icon: siStripe,
        meta: {
          blurb: "Payments for web products.",
          related: ["RevenueCat"],
        },
      },
      {
        name: "RevenueCat",
        icon: siRevenuecat,
        meta: {
          blurb: "Mobile subscriptions without the StoreKit pain.",
          related: ["Stripe", "Expo"],
        },
      },
    ],
  },
  {
    label: "Testing",
    items: [
      {
        name: "Vitest",
        icon: siVitest,
        meta: {
          blurb: "Unit and integration testing for Vite-based projects.",
          related: ["TypeScript", "Vite"],
        },
      },
      {
        name: "Playwright",
        meta: {
          blurb: "E2E and visual testing.",
          related: ["TypeScript", "Vitest"],
          usedIn: ["every project with a UI"],
        },
      },
      {
        name: "Maestro",
        meta: {
          blurb: "Mobile E2E flows for Expo apps.",
          related: ["Expo", "React Native"],
        },
      },
    ],
  },
];
