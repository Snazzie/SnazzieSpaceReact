import { projects, type Project } from "@/data/projects";
import { projectSlug } from "@/components/FeaturedShowcase";
import { BY_NAME, type FlatTech } from "@/components/sphereCommon";
import type { TechMeta } from "@/data/stack";

const PROJECT_BY_TITLE = new Map(projects.map((p) => [p.title, p]));

/** Right-hand details card: empty hint / constellation view / focused-tech view. */
export function TechDetailsPanel({
  focusedTech,
  constProject,
  constSet,
  meta,
  usedIn,
  relatedSet,
  release,
  clearFocus,
  focusTech,
  onViewProject,
}: {
  focusedTech: FlatTech | undefined;
  constProject: Project | null;
  constSet: Set<string>;
  meta: TechMeta | undefined;
  usedIn: string[];
  relatedSet: Set<string>;
  release: () => void;
  clearFocus: () => void;
  focusTech: (name: string) => void;
  onViewProject: (project: Project) => void;
}) {
  return (
    <div
      aria-live="polite"
      className="relative flex w-full max-w-[300px] flex-col rounded-2xl border border-border bg-card p-6 transition-all duration-300"
    >
      {!focusedTech && !constProject && (
        <div className="flex min-h-[180px] flex-col items-center justify-center text-center">
          <span className="text-2xl opacity-40" aria-hidden>
            ✦
          </span>
          <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
            <span className="hidden md:inline">Drag the sphere to spin it. Click a tech for details.</span>
            <span className="md:hidden">Long press then drag to spin. Tap a tech for details.</span>
          </p>
        </div>
      )}
      {!focusedTech && constProject && (
        <>
          <button
            type="button"
            onClick={release}
            aria-label="Close details"
            className="absolute right-3.5 top-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            ✕
          </button>
          <p className="text-[0.65rem] font-medium uppercase tracking-[0.2em] text-foreground/80">
            ✦ Constellation
          </p>
          <h3 className="mt-1 text-xl font-semibold tracking-tight">{constProject.title}</h3>
          <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
            {constProject.description}
          </p>
          <p className="mt-4 text-[0.6rem] font-medium uppercase tracking-[0.16em] text-muted-foreground/70">
            Built with
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {[...constSet].map((t) => {
              const f = BY_NAME.get(t);
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => focusTech(t)}
                  className="rounded-full border border-border bg-secondary/40 px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = f?.color ?? "var(--color-border)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--color-border)";
                  }}
                >
                  {t}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => onViewProject(constProject)}
            className="mt-5 flex w-full items-center justify-between rounded-lg border border-border px-3 py-2 text-xs text-foreground/90 transition-colors hover:border-foreground/40 hover:text-foreground"
          >
            View project
            <span className="text-muted-foreground">→</span>
          </button>
        </>
      )}
      {focusedTech && (
        <>
          <button
            type="button"
            onClick={clearFocus}
            aria-label="Close details"
            className="absolute right-3.5 top-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            ✕
          </button>
          <p
            className="text-[0.65rem] font-medium uppercase tracking-[0.2em]"
            style={{ color: focusedTech.color }}
          >
            {focusedTech.group}
          </p>
          <h3 className="mt-1 text-xl font-semibold tracking-tight">{focusedTech.tech.name}</h3>
          {meta?.blurb && (
            <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">{meta.blurb}</p>
          )}
          {relatedSet.size > 0 && (
            <>
              <p className="mt-4 text-[0.6rem] font-medium uppercase tracking-[0.16em] text-muted-foreground/70">
                Related
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {[...relatedSet].map((rn) => (
                  <button
                    key={rn}
                    type="button"
                    onClick={() => focusTech(rn)}
                    className="rounded-full border border-border bg-secondary/40 px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                    style={{ borderColor: "var(--color-border)" }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = focusedTech.color;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "var(--color-border)";
                    }}
                  >
                    {rn}
                  </button>
                ))}
              </div>
            </>
          )}
          {usedIn.length > 0 && (
            <>
              <p className="mt-4 text-[0.6rem] font-medium uppercase tracking-[0.16em] text-muted-foreground/70">
                Used in
              </p>
              <div className="mt-1">
                {usedIn.map((title) => {
                  const project = PROJECT_BY_TITLE.get(title);
                  return project ? (
                    <button
                      key={title}
                      type="button"
                      onClick={() => {
                        const el = document.getElementById(projectSlug(title));
                        if (el) {
                          el.scrollIntoView({ behavior: "smooth" });
                        } else {
                          document.getElementById("projects")?.scrollIntoView({ behavior: "smooth" });
                        }
                      }}
                      className="flex w-full items-center justify-between border-b border-border/60 py-1.5 text-left text-xs text-foreground/90 transition-colors last:border-0 hover:text-foreground"
                    >
                      {title}
                      <span className="text-muted-foreground">→</span>
                    </button>
                  ) : (
                    <div
                      key={title}
                      className="border-b border-border/60 py-1.5 text-xs text-foreground/90 last:border-0"
                    >
                      {title}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
