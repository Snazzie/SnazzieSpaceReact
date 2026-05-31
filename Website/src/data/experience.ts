export interface SubRole {
  period: string; // "2025", "2022–2024"
  title: string;
  description: string;
}

export interface Experience {
  company: string;
  role: string;
  logo: string; // /logos/*.svg
  logoBg?: string; // chip background — set for dark wordmark logos that need a light tile
  href: string; // company site
  start: string; // "Jul 2022"
  end: string; // "Present"
  duration: string; // "3 yrs 11 mos"
  location: string;
  type: string; // "Full-time"
  blurb?: string; // optional one-line summary above the sub-roles
  subroles: SubRole[];
  skills: string[]; // a curated handful shown as badges
  extraSkillCount: number; // overflow count rendered as a "+N" pill
}

export const experience: Experience[] = [
  {
    company: "ASOS.com",
    role: "Software Engineer",
    logo: "/logos/asos.svg",
    logoBg: "#ffffff",
    href: "https://www.asos.com",
    start: "Jul 2022",
    end: "Present",
    duration: "3 yrs 11 mos",
    location: "Greater London, UK",
    type: "Full-time",
    subroles: [
      {
        period: "2025",
        title: "Shopping With Confidence",
        description:
          "Maintaining backend systems for size data and the ASOS product page, with a major focus on improving product size recommendations to reduce customer order returns.",
      },
      {
        period: "2022–2024",
        title: "Pricing & Sizing",
        description:
          "Maintaining backend systems for FX rates, product price and size data.",
      },
    ],
    skills: ["C#", "Redis", "AMQP", "Kubernetes"],
    extraSkillCount: 29,
  },
  {
    company: "Redgate Software",
    role: "Software Engineer",
    logo: "/logos/redgate.svg",
    logoBg: "#ffffff",
    href: "https://www.red-gate.com",
    start: "Jul 2018",
    end: "Jul 2022",
    duration: "4 yrs 1 mo",
    location: "Greater Cambridge Area",
    type: "Full-time",
    blurb: "Full-stack development & testing.",
    subroles: [
      {
        period: "2021–2022",
        title: "Redgate Product UI Toolkit",
        description: "Shared component library powering Redgate product UIs.",
      },
      {
        period: "2020–2022",
        title: "SQL Monitor",
        description: "Monitoring and alerting for SQL Server estates.",
      },
      {
        period: "2018–2020",
        title: "SQL Clone",
        description: "Fast, space-efficient SQL Server database provisioning.",
      },
    ],
    skills: ["C#", "TypeScript", "SQL Server", "WMI"],
    extraSkillCount: 16,
  },
];

export interface Education {
  institution: string;
  degree: string;
  logo: string;
  href: string;
  period: string; // "2015 – 2018"
  grade: string;
  activities: string[];
}

export const education: Education[] = [
  {
    institution: "Anglia Ruskin University",
    degree: "BEng, Computer Science",
    logo: "/logos/aru.svg",
    href: "https://www.aru.ac.uk",
    period: "2015 – 2018",
    grade: "Upper Second Class Honours (2:1)",
    activities: [
      "Head of Computing — CamFM radio station",
      "OWASP Cambridge CTF — awarded 2nd place",
    ],
  },
];
