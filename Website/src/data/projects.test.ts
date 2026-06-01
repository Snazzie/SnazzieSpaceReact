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

  it("every project has a valid absolute URL href and a non-empty image", () => {
    for (const p of projects) {
      expect(() => new URL(p.href)).not.toThrow();
      expect(p.image.length).toBeGreaterThan(0);
    }
  });
});
