import { projects, type Project } from "@/data/projects";
import { BY_NAME } from "@/components/sphereCommon";

/**
 * Chip row: horizontal scroll rail on mobile (full-bleed, snap, edge fade,
 * hidden scrollbar), centered wrapping row on md+.
 */
const RAIL =
  "flex items-center gap-2 overflow-x-auto snap-x -mx-6 px-6 scroll-px-6 " +
  "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden " +
  "[mask-image:linear-gradient(to_right,transparent,black_24px,black_calc(100%-24px),transparent)] " +
  "md:mx-0 md:flex-wrap md:justify-center md:overflow-visible md:px-0 md:[mask-image:none]";

/** Projects that can light up a constellation: at least two techs on the sphere. */
const CONST_PROJECTS = projects.filter(
  (p) => (p.tech ?? []).filter((t) => BY_NAME.has(t)).length >= 2,
);

/** Constellation rail + category chips + search box. */
export function TechFilters({
  constProject,
  selectConstellation,
  cat,
  setCat,
  query,
  setQuery,
  chips,
}: {
  constProject: Project | null;
  selectConstellation: (p: Project | null) => void;
  cat: string;
  setCat: (c: string) => void;
  query: string;
  setQuery: (q: string) => void;
  chips: { key: string; label: string; color: string }[];
}) {
  return (
    <>
      <div className={`${RAIL} mt-8 md:!justify-start`}>
        <span className="shrink-0 snap-start text-[0.6rem] font-medium uppercase tracking-[0.16em] text-muted-foreground/70">
          constellations
        </span>
        {CONST_PROJECTS.map((p) => {
          const on = constProject?.title === p.title;
          return (
            <button
              key={p.title}
              type="button"
              aria-pressed={on}
              onClick={() => selectConstellation(on ? null : p)}
              className="inline-flex min-h-11 shrink-0 snap-start items-center rounded-full border px-3 py-1 text-[11px] font-medium transition-colors duration-200"
              style={
                on
                  ? {
                      borderColor: "var(--color-foreground)",
                      color: "var(--color-foreground)",
                      background: "var(--color-secondary)",
                    }
                  : { borderColor: "var(--color-border)", color: "var(--color-muted-foreground)" }
              }
            >
              ✦ {p.title}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-col gap-2.5 md:flex-row md:flex-wrap md:items-center md:justify-center">
        <div className={`${RAIL} gap-2.5`}>
          {chips.map((c) => {
            const on = cat === c.key;
            return (
              <button
                key={c.key}
                type="button"
                aria-pressed={on}
                onClick={() => setCat(c.key)}
                className="inline-flex min-h-11 shrink-0 snap-start items-center rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors duration-200"
                style={
                  on
                    ? { background: c.color, borderColor: c.color, color: "#0a0a0c" }
                    : { borderColor: "var(--color-border)", color: "var(--color-muted-foreground)" }
                }
              >
                {c.label}
              </button>
            );
          })}
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="search…"
          aria-label="Search tech"
          className="mx-auto w-44 rounded-full border border-border bg-secondary/40 px-4 py-1.5 text-xs text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground/40 md:mx-0 md:w-36"
        />
      </div>
    </>
  );
}
