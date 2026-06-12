import { Badge } from "@/components/ui/badge";
import { stack } from "@/data/stack";

/** Cross-island event: ask the TechStack sphere to focus a tech by name. */
export const FOCUS_TECH_EVENT = "sphere:focus-tech";

const SPHERE_TECH = new Set(stack.flatMap((g) => g.items.map((t) => t.name)));

/** Scrolls to the tech-stack section and asks the sphere to focus `name`. */
export function focusTechOnSphere(name: string) {
  document.getElementById("stack")?.scrollIntoView({ behavior: "smooth" });
  window.dispatchEvent(new CustomEvent(FOCUS_TECH_EVENT, { detail: name }));
}

/**
 * Tech badge row for project cards and modals. Badges that exist on the
 * stack sphere are clickable and jump to that tech; the rest render plain.
 */
export function TechBadges({
  tech,
  className = "mt-4 flex flex-wrap gap-1.5",
  onNavigate,
}: {
  tech: string[];
  className?: string;
  /** Called before navigating, e.g. to close a modal. Delays the jump so close animations finish. */
  onNavigate?: () => void;
}) {
  return (
    <div className={className}>
      {tech.map((t) =>
        SPHERE_TECH.has(t) ? (
          <Badge
            key={t}
            asChild
            variant="outline"
            className="cursor-pointer border-border text-muted-foreground transition-colors hover:border-foreground/50 hover:text-foreground"
          >
            <button
              type="button"
              title={`View ${t} in tech stack`}
              onClick={(e) => {
                e.stopPropagation();
                if (onNavigate) {
                  onNavigate();
                  setTimeout(() => focusTechOnSphere(t), 300);
                } else {
                  focusTechOnSphere(t);
                }
              }}
            >
              {t}
            </button>
          </Badge>
        ) : (
          <Badge key={t} variant="outline" className="border-border text-muted-foreground">
            {t}
          </Badge>
        ),
      )}
    </div>
  );
}
