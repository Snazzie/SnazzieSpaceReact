export interface GithubYear {
  year: number;
  /** Total contributions in that calendar year. */
  contributions: number;
  /** Lines added that year across owned repos (private included). */
  additions: number;
  /** Lines removed that year across owned repos (private included). */
  deletions: number;
}

export interface GithubProfile {
  username: string;
  url: string;
  /** Headline totals shown above the per-year chart. */
  totals: {
    repositories: number;
    stars: number;
    /** All-time contributions across the years below. */
    contributions: number;
    /** All-time lines added / removed. */
    additions: number;
    deletions: number;
    /** All-time issues opened. */
    issues: number;
    /** Unique repos contributed to via commits (incl. private). */
    contributedRepos: number;
  };
  years: GithubYear[];
}

/**
 * Static snapshot of GitHub activity. These figures are NOT fetched live.
 *
 * The contribution counts INCLUDE private / closed-source work: they come from
 * the GraphQL `contributionsCollection` queried while authenticated as you,
 * which counts private commits (totals only, never repo names). Public or
 * unauthenticated queries would show open-source only.
 *
 * This is only a fallback: at runtime GithubStats.tsx fetches the live numbers
 * from the Cloudflare Worker. To refresh this static copy, run the populate
 * script (../worker/scripts/populate.mjs) and paste its output here.
 *
 * `contributions` is the all-time sum since the account was created (2016).
 * `additions`/`deletions` are raw per-commit line counts across every repo the
 * token can read (owned + private org repos), default branch only. Raw counts
 * are inflated by lockfiles/vendored code.
 *
 * Last refreshed: 2026-06-01.
 */
export const github: GithubProfile = {
  username: "Snazzie",
  url: "https://github.com/Snazzie",
  totals: {
    repositories: 69,
    stars: 188,
    contributions: 10597,
    additions: 12368843,
    deletions: 5468374,
    issues: 282,
    contributedRepos: 29,
  },
  years: [
    { year: 2020, contributions: 1010, additions: 670182, deletions: 305932 },
    { year: 2021, contributions: 846, additions: 788058, deletions: 734403 },
    { year: 2022, contributions: 2184, additions: 977283, deletions: 528548 },
    { year: 2023, contributions: 845, additions: 110349, deletions: 67235 },
    { year: 2024, contributions: 77, additions: 152, deletions: 48 },
    { year: 2025, contributions: 1857, additions: 2290896, deletions: 1563691 },
    { year: 2026, contributions: 2804, additions: 6373713, deletions: 1922822 },
  ],
};
