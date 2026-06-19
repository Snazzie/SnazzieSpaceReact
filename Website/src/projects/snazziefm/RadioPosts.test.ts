import { describe, it, expect } from "vitest";
import { createElement, Fragment } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { renderPostText } from "./RadioPosts";
import { POSTS } from "./data/radio-posts";

const html = (text: string) =>
  renderToStaticMarkup(createElement(Fragment, null, ...renderPostText(text)));

describe("renderPostText", () => {
  it("renders **bold** as <strong>", () => {
    expect(html("hi **Frank** there")).toContain("<strong>Frank</strong>");
  });

  it("renders #hashtag as a tagged span", () => {
    const out = html("end #TheFrankTapes");
    expect(out).toContain('class="rl-post-tag"');
    expect(out).toContain("#TheFrankTapes");
  });

  it("passes emoji and plain text through", () => {
    expect(html("party 🎉 time")).toContain("party 🎉 time");
  });

  it("handles bold and hashtag together", () => {
    const out = html("**Ronnie** says #Hi");
    expect(out).toContain("<strong>Ronnie</strong>");
    expect(out).toContain('class="rl-post-tag"');
  });

  it("leaves a lone # literal", () => {
    expect(html("grade C# pass")).not.toContain("rl-post-tag");
  });

  it("leaves an unmatched ** literal", () => {
    expect(html("just **bold start")).not.toContain("<strong>");
  });
});

describe("POSTS data", () => {
  it("every post has a scene-only imagePrompt and a radio image path", () => {
    for (const p of POSTS) {
      expect(p.imagePrompt.length).toBeGreaterThan(0);
      expect(p.photo).toMatch(/^\/images\/radio\/.+\.png$/);
      // imagePrompt is scene-only; the render script adds the Ghibli style.
      expect(p.imagePrompt.toLowerCase()).not.toContain("ghibli");
    }
  });

  it("ids are unique", () => {
    expect(new Set(POSTS.map((p) => p.id)).size).toBe(POSTS.length);
  });
});
