/**
 * GET /ghstats — GitHub profile snapshot (KV: STATS).
 *
 * Weekly cron fetches GitHub via the GraphQL API (authenticated as the user, so
 * private / closed-source contributions are counted) and writes a JSON snapshot
 * to KV; the route serves it with versioned edge caching.
 */

import { Hono } from "hono";
import type { Env } from "../env";
import { serveSnapshot } from "../serve";

const KV_KEY = "profile";
const VERSION_KEY = "profile:version";
/** How many trailing years to show in the chart (totals stay all-time). */
const CHART_YEARS = 7;

interface GithubYear {
  year: number;
  contributions: number;
  additions: number;
  deletions: number;
}

interface GithubProfile {
  username: string;
  url: string;
  totals: {
    repositories: number;
    stars: number;
    contributions: number;
    additions: number;
    deletions: number;
    issues: number;
    /** Unique repos contributed to via commits (readable; incl. private). */
    contributedRepos: number;
  };
  years: GithubYear[];
  updatedAt: string;
}

interface RepoNode {
  name: string;
  stargazerCount: number;
  owner: { login: string };
}

interface RepoConnection {
  totalCount: number;
  nodes: RepoNode[];
}

/** One per-year alias: the contribution calendar total for that year. */
interface YearField {
  contributionCalendar: { totalContributions: number };
}

/** A page of the authenticated user's commits on a repo's default branch. */
interface CommitHistory {
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
  nodes: Array<{ committedDate: string; additions: number; deletions: number }>;
}

/** Repos bundled into one aliased GraphQL request; shrinks on a 5xx (see below). */
const LINES_BATCH = 6;
/** Commits per history page. */
const LINES_PAGE = 100;
/** Hard bound on request rounds so pagination/splitting can never loop forever. */
const MAX_LINES_ROUNDS = 400;

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

async function gql<T>(env: Env, query: string): Promise<T> {
  let lastErr = "";
  // Retry transient 5xx (GitHub occasionally 502s under load).
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        Authorization: `bearer ${env.GITHUB_TOKEN}`,
        "User-Agent": "snazzie-github-stats-worker",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    });
    if (res.status >= 500) {
      lastErr = `GitHub API ${res.status}`;
      await sleep(1000 * (attempt + 1));
      continue;
    }
    if (!res.ok) throw new Error(`GitHub API ${res.status}: ${await res.text()}`);
    const json = (await res.json()) as { data?: T; errors?: unknown };
    if (json.errors || !json.data) {
      throw new Error(`GitHub GraphQL error: ${JSON.stringify(json.errors)}`);
    }
    return json.data;
  }
  throw new Error(lastErr || "GitHub API 5xx");
}

async function computeStats(env: Env): Promise<GithubProfile> {
  const created = await gql<{ viewer: { createdAt: string } }>(
    env,
    "{ viewer { createdAt } }",
  );
  const startYear = new Date(created.viewer.createdAt).getUTCFullYear();
  const now = new Date();
  const endYear = now.getUTCFullYear();

  const yearFields: string[] = [];
  for (let y = startYear; y <= endYear; y++) {
    const from = y === startYear ? created.viewer.createdAt : `${y}-01-01T00:00:00Z`;
    const to = y === endYear ? now.toISOString() : `${y}-12-31T23:59:59Z`;
    yearFields.push(
      `y${y}: contributionsCollection(from:"${from}", to:"${to}"){ contributionCalendar { totalContributions } }`,
    );
  }

  const query = `{
    viewer {
      issues { totalCount }
      repositories(ownerAffiliations: [OWNER, ORGANIZATION_MEMBER], first: 100, isFork: false, orderBy: { field: STARGAZERS, direction: DESC }) {
        totalCount
        nodes { name stargazerCount owner { login } }
      }
      contributedTo: repositoriesContributedTo(first: 100, includeUserRepositories: true, contributionTypes: [COMMIT]) {
        totalCount
        nodes { name owner { login } }
      }
      ${yearFields.join("\n      ")}
    }
  }`;

  const { viewer } = await gql<{ viewer: Record<string, unknown> }>(env, query);
  const ownedRepos = viewer.repositories as RepoConnection;
  const contributedTo = viewer.contributedTo as {
    totalCount: number;
    nodes: Array<{ name: string; owner: { login: string } }>;
  };
  const issues = (viewer.issues as { totalCount: number }).totalCount;
  const repos = ownedRepos.totalCount;
  const stars = ownedRepos.nodes.reduce((sum, r) => sum + r.stargazerCount, 0);

  // Scan owned repos PLUS every other repo we committed to that the token can
  // read (incl. private org repos via repositoriesContributedTo). Private commits
  // are surfaced here as long as the token has access; only genuinely
  // unreadable repos are missed.
  const repoByKey = new Map<string, RepoNode>();
  for (const r of ownedRepos.nodes) repoByKey.set(`${r.owner.login}/${r.name}`, r);
  for (const r of contributedTo.nodes) {
    const key = `${r.owner.login}/${r.name}`;
    if (!repoByKey.has(key)) repoByKey.set(key, { name: r.name, owner: r.owner, stargazerCount: 0 });
  }

  const contributionByYear: number[] = [];
  for (let y = startYear; y <= endYear; y++) {
    contributionByYear[y] = (viewer[`y${y}`] as YearField).contributionCalendar.totalContributions;
  }

  // Per-year added/removed lines, summed across repos (best-effort; never fatal).
  const lines = await computeLines(env, [...repoByKey.values()]).catch(() => null);

  const years: GithubYear[] = [];
  let contributions = 0;
  let totalAdd = 0;
  let totalDel = 0;
  for (let y = startYear; y <= endYear; y++) {
    const c = contributionByYear[y] ?? 0;
    const add = lines?.perYear.get(y)?.a ?? 0;
    const del = lines?.perYear.get(y)?.d ?? 0;
    contributions += c;
    totalAdd += add;
    totalDel += del;
    years.push({ year: y, contributions: c, additions: add, deletions: del });
  }

  return {
    username: env.GITHUB_USERNAME,
    url: `https://github.com/${env.GITHUB_USERNAME}`,
    totals: {
      repositories: repos,
      stars,
      contributions,
      additions: totalAdd,
      deletions: totalDel,
      issues,
      contributedRepos: contributedTo.totalCount,
    },
    years: years.slice(-CHART_YEARS),
    updatedAt: now.toISOString(),
  };
}

type RepoHistory = {
  defaultBranchRef: { target: { history: CommitHistory } | null } | null;
} | null;

interface RepoCursor {
  owner: string;
  name: string;
  cursor: string | null;
  done: boolean;
}

/**
 * Sum the authenticated user's added/removed lines per year across the given
 * repos, using GraphQL commit history (per-commit additions/deletions on the
 * default branch). The REST stats/contributors endpoint was abandoned because
 * it returns 202 indefinitely.
 *
 * Computing per-commit diffs is expensive server-side, so bundling too many
 * repos in one request can 502. We bundle up to LINES_BATCH at a time and, on a
 * 5xx, halve the group and retry — down to a single repo — so the scan stays
 * cheap normally but always makes progress.
 */
async function computeLines(
  env: Env,
  repos: RepoNode[],
): Promise<{ perYear: Map<number, { a: number; d: number }> }> {
  const perYear = new Map<number, { a: number; d: number }>();
  const { viewer } = await gql<{ viewer: { id: string } }>(env, "{ viewer { id } }");
  const authorId = viewer.id;

  const states: RepoCursor[] = repos.map((r) => ({
    owner: r.owner.login,
    name: r.name,
    cursor: null,
    done: false,
  }));

  let size = LINES_BATCH;
  for (let round = 0; round < MAX_LINES_ROUNDS; round++) {
    const pending = states.filter((s) => !s.done);
    if (pending.length === 0) break;
    const group = pending.slice(0, size);

    const fields = group
      .map((a, i) => {
        const after = a.cursor ? `, after: "${a.cursor}"` : "";
        return `a${i}: repository(owner: "${a.owner}", name: "${a.name}") { defaultBranchRef { target { ... on Commit { history(author: { id: "${authorId}" }, first: ${LINES_PAGE}${after}) { pageInfo { hasNextPage endCursor } nodes { committedDate additions deletions } } } } } }`;
      })
      .join("\n");

    const data = await gql<Record<string, RepoHistory>>(env, `{ ${fields} }`).catch(() => null);
    if (!data) {
      if (group.length === 1) {
        group[0].done = true; // unfetchable single repo: skip it
      } else {
        size = Math.max(1, Math.floor(size / 2)); // shrink and retry the same repos
      }
      continue;
    }

    group.forEach((a, i) => {
      const history = data[`a${i}`]?.defaultBranchRef?.target?.history;
      if (!history) {
        a.done = true;
        return;
      }
      for (const c of history.nodes) {
        if (c.additions === 0 && c.deletions === 0) continue;
        const year = new Date(c.committedDate).getUTCFullYear();
        const bucket = perYear.get(year) ?? { a: 0, d: 0 };
        bucket.a += c.additions;
        bucket.d += c.deletions;
        perYear.set(year, bucket);
      }
      if (history.pageInfo.hasNextPage && history.pageInfo.endCursor) a.cursor = history.pageInfo.endCursor;
      else a.done = true;
    });
    size = LINES_BATCH; // recovered; resume normal batch size
  }
  return { perYear };
}

/**
 * Per-year and total line counts are monotonic (history rarely shrinks), but a
 * cron run can transiently under-read them when GitHub returns 202 mid-stats-
 * regeneration for recently-pushed repos. Take the max against the prior
 * snapshot so a partial scan never overwrites good data with zeros. Contributions,
 * repo count, and stars come from the reliable GraphQL call, so use fresh values.
 */
function mergeProfiles(prior: GithubProfile, fresh: GithubProfile): GithubProfile {
  const priorByYear = new Map(prior.years.map((y) => [y.year, y]));
  const years = fresh.years.map((y) => {
    const p = priorByYear.get(y.year);
    return {
      year: y.year,
      contributions: y.contributions,
      additions: Math.max(y.additions, p?.additions ?? 0),
      deletions: Math.max(y.deletions, p?.deletions ?? 0),
    };
  });
  return {
    ...fresh,
    totals: {
      ...fresh.totals,
      additions: Math.max(fresh.totals.additions, prior.totals.additions),
      deletions: Math.max(fresh.totals.deletions, prior.totals.deletions),
    },
    years,
  };
}

/** Recompute, merge against the prior snapshot, and store it + its version. */
export async function refreshGithub(env: Env): Promise<void> {
  const fresh = await computeStats(env);
  const priorRaw = await env.STATS.get(KV_KEY);
  const profile = priorRaw ? mergeProfiles(JSON.parse(priorRaw) as GithubProfile, fresh) : fresh;
  await env.STATS.put(KV_KEY, JSON.stringify(profile));
  await env.STATS.put(VERSION_KEY, profile.updatedAt);
}

export const ghstatsRoute = new Hono<{ Bindings: Env }>();

const serve = (c: { req: { raw: Request }; executionCtx: ExecutionContext; env: Env }) =>
  serveSnapshot(c.req.raw, c.executionCtx, c.env.STATS, "profile", VERSION_KEY, KV_KEY);

ghstatsRoute.get("/ghstats", serve);
// Back-compat: bare root also returns the GitHub profile.
ghstatsRoute.get("/", serve);
