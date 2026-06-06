import { describe, it, expect } from "vitest";
import { projects } from "./projects";

describe("projects data", () => {
  it("has featured projects for the showcase", () => {
    expect(projects.filter((p) => p.featured).length).toBeGreaterThanOrEqual(1);
  });

  it("every featured project has at least one tech tag", () => {
    for (const p of projects.filter((p) => p.featured)) {
      expect(p.tech && p.tech.length).toBeGreaterThan(0);
    }
  });

  it("every project has a valid href (absolute URL or internal route) and a non-empty image", () => {
    for (const p of projects) {
      // absolute external links AND root-relative internal routes (e.g. /snazziefm) are both valid;
      // the base makes a relative href parse without forcing it to be absolute.
      expect(() => new URL(p.href, "https://snazzie.space")).not.toThrow();
      expect(p.image.length).toBeGreaterThan(0);
    }
  });
});
