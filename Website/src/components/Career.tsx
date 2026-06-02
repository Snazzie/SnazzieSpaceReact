import { motion, useReducedMotion, type Variants } from "motion/react";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, Award, CalendarDays, GraduationCap, MapPin } from "lucide-react";
import { experience, education, type Experience, type Education } from "@/data/experience";
import { D, EASE } from "@/lib/motion";
import { SectionUnderline } from "@/components/SectionUnderline";

const reveal: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: D.base, ease: EASE, delay: i * 0.06 },
  }),
};

const SPOTLIGHT =
  "radial-gradient(420px circle at var(--cx, 50%) var(--cy, 50%), rgba(255,255,255,0.06), transparent 60%)";

function LogoTile({ src, alt, bg }: { src: string; alt: string; bg?: string }) {
  return (
    <div
      className={`relative z-20 flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border ${
        bg ? "" : "bg-secondary"
      }`}
      style={bg ? { background: bg } : undefined}
    >
      <img src={src} alt={alt} width={48} height={48} className={`size-full object-contain ${bg ? "p-2" : "p-1.5"}`} />
    </div>
  );
}

function useCardProps(index: number) {
  const reduce = useReducedMotion();
  const onMove = reduce
    ? undefined
    : (e: React.PointerEvent<HTMLElement>) => {
        const el = e.currentTarget;
        const r = el.getBoundingClientRect();
        el.style.setProperty("--cx", `${e.clientX - r.left}px`);
        el.style.setProperty("--cy", `${e.clientY - r.top}px`);
      };

  return {
    custom: index,
    variants: reveal,
    initial: reduce ? (false as const) : "hidden",
    whileInView: "show" as const,
    viewport: { once: true, amount: 0.2 },
    onPointerMove: onMove,
  };
}

function Spotlight() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-10 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      style={{ background: SPOTLIGHT }}
    />
  );
}

function MetaRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative z-20 mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
      {children}
    </div>
  );
}

function ExperienceCard({ job, index }: { job: Experience; index: number }) {
  const cardProps = useCardProps(index);
  return (
    <motion.a
      {...cardProps}
      href={job.href}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative block overflow-hidden rounded-2xl border border-border bg-card p-6 transition duration-200 hover:-translate-y-1 hover:border-zinc-600"
    >
      <Spotlight />
      <div className="flex items-start gap-4">
        <LogoTile src={job.logo} alt={job.company} bg={job.logoBg} />
        <div className="min-w-0 flex-1">
          <h3 className="relative z-20 flex items-center gap-1.5 text-lg font-semibold text-foreground">
            {job.role}
            <ArrowUpRight className="size-4 -translate-x-1 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100" />
          </h3>
          <p className="relative z-20 text-sm text-muted-foreground">
            {job.company} · {job.type}
          </p>
          <MetaRow>
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="size-3.5" />
              {job.start} – {job.end} · {job.duration}
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" />
              {job.location}
            </span>
          </MetaRow>
        </div>
      </div>

      {job.blurb && (
        <p className="relative z-20 mt-4 text-sm text-muted-foreground">{job.blurb}</p>
      )}

      <ol className="relative z-20 mt-5 space-y-4">
        {job.subroles.map((sub) => (
          <li key={sub.title} className="border-l border-border pl-4">
            <span className="text-xs font-medium uppercase tracking-wide text-foreground/60">
              {sub.period}
            </span>
            <p className="text-sm font-medium text-foreground">{sub.title}</p>
            <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
              {sub.description}
            </p>
          </li>
        ))}
      </ol>

      <div className="relative z-20 mt-5 flex flex-wrap gap-1.5">
        {job.skills.map((s) => (
          <Badge key={s} variant="outline" className="border-border text-muted-foreground">
            {s}
          </Badge>
        ))}
        {job.extraSkillCount > 0 && (
          <Badge variant="secondary">+{job.extraSkillCount} more</Badge>
        )}
      </div>
    </motion.a>
  );
}

function EducationCard({ edu, index }: { edu: Education; index: number }) {
  const cardProps = useCardProps(index);
  return (
    <motion.a
      {...cardProps}
      href={edu.href}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative block overflow-hidden rounded-2xl border border-border bg-card p-6 transition duration-200 hover:-translate-y-1 hover:border-zinc-600"
    >
      <Spotlight />
      <div className="flex items-start gap-4">
        <LogoTile src={edu.logo} alt={edu.institution} />
        <div className="min-w-0 flex-1">
          <h3 className="relative z-20 flex items-center gap-1.5 text-lg font-semibold text-foreground">
            {edu.institution}
            <ArrowUpRight className="size-4 -translate-x-1 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100" />
          </h3>
          <p className="relative z-20 flex items-center gap-1.5 text-sm text-muted-foreground">
            <GraduationCap className="size-3.5" />
            {edu.degree}
          </p>
          <MetaRow>
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="size-3.5" />
              {edu.period}
            </span>
            <span className="inline-flex items-center gap-1">
              <Award className="size-3.5" />
              {edu.grade}
            </span>
          </MetaRow>
        </div>
      </div>

      <ul className="relative z-20 mt-5 space-y-2">
        {edu.activities.map((a) => (
          <li
            key={a}
            className="flex items-start gap-2 border-l border-border pl-4 text-sm text-muted-foreground"
          >
            {a}
          </li>
        ))}
      </ul>
    </motion.a>
  );
}

export function Career() {
  const reduce = useReducedMotion();
  const headingProps = {
    initial: reduce ? (false as const) : { opacity: 0, y: 16 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.5 },
    transition: { duration: D.base, ease: EASE },
  };

  return (
    <section id="career" className="relative z-10 mx-auto max-w-5xl px-6 py-24 md:py-32">
      <motion.p
        {...headingProps}
        className="text-xs font-medium uppercase tracking-[0.28em] text-muted-foreground"
      >
        Where I've worked
      </motion.p>
      <motion.h2
        {...headingProps}
        className="mt-2 text-2xl font-semibold tracking-tight md:text-4xl"
      >
        Career
      </motion.h2>
      <SectionUnderline className="mb-10" />

      <div className="space-y-4">
        {experience.map((job, i) => (
          <ExperienceCard key={job.company} job={job} index={i} />
        ))}
      </div>

      <motion.h2
        {...headingProps}
        className="mb-6 mt-16 text-sm font-medium uppercase tracking-wide text-muted-foreground"
      >
        Education
      </motion.h2>
      <div className="space-y-4">
        {education.map((edu, i) => (
          <EducationCard key={edu.institution} edu={edu} index={i} />
        ))}
      </div>
    </section>
  );
}
