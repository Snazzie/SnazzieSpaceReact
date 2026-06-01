/**
 * GitHub stats Worker.
 *
 * - Weekly cron fetches GitHub via the GraphQL API (authenticated as the user,
 *   so private / closed-source contributions are counted) and writes a JSON
 *   snapshot to KV.
 * - The fetch handler serves that snapshot as JSON with CORS + edge caching,
 *   lazily computing it on the first request if the cron has not run yet.
 */

export interface Env {
  STATS: KVNamespace;
  /** Classic PAT with `read:user` + `repo` scopes. Set via `wrangler secret put`. */
  GITHUB_TOKEN: string;
  GITHUB_USERNAME: string;
  /** CORS allow-origin, e.g. your site origin or "*". */
  ALLOWED_ORIGIN: string;
  /** API token with `Account Analytics: Read`. Set via `wrangler secret put`. */
  CF_ANALYTICS_TOKEN?: string;
  /** Cloudflare account tag (id) that owns the Web Analytics site. */
  CF_ACCOUNT_ID?: string;
  /** Web Analytics site tag (the beacon token). */
  CF_SITE_TAG?: string;
}

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

const KV_KEY = "profile";
const VERSION_KEY = "profile:version";
/** How many trailing years to show in the chart (totals stay all-time). */
const CHART_YEARS = 7;
/** Worker/edge cache lifetime: 7 days, matching the weekly cron refresh. */
const CACHE_SECONDS = 604800;

const TRAFFIC_KEY = "traffic";
const TRAFFIC_VERSION_KEY = "traffic:version";
/** Trailing window for the traffic snapshot. */
const TRAFFIC_DAYS = 30;
/** How many rows to keep per breakdown (referrers, paths, browsers, ...). */
const TRAFFIC_TOP_N = 8;

interface TrafficBreakdown {
  label: string;
  visits: number;
}
interface TrafficDay {
  date: string;
  pageViews: number;
  visits: number;
}
interface TrafficCountry {
  code: string;
  pageViews: number;
  visits: number;
}
interface TrafficSnapshot {
  updatedAt: string;
  rangeDays: number;
  totals: { pageViews: number; visits: number; countries: number };
  byDay: TrafficDay[];
  byCountry: TrafficCountry[];
  topReferrers: TrafficBreakdown[];
  topPaths: TrafficBreakdown[];
  browsers: TrafficBreakdown[];
  os: TrafficBreakdown[];
  devices: TrafficBreakdown[];
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

function corsHeaders(env: Env): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
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

/** Recompute, merge against the prior snapshot, store it + its version, return both. */
async function refresh(env: Env): Promise<{ body: string; version: string }> {
  const fresh = await computeStats(env);
  const priorRaw = await env.STATS.get(KV_KEY);
  const profile = priorRaw ? mergeProfiles(JSON.parse(priorRaw) as GithubProfile, fresh) : fresh;
  const body = JSON.stringify(profile);
  await env.STATS.put(KV_KEY, body);
  await env.STATS.put(VERSION_KEY, profile.updatedAt);
  return { body, version: profile.updatedAt };
}

/**
 * Cloudflare Web Analytics (RUM) snapshot.
 *
 * Queries `rumPageloadEventsAdaptiveGroups` (account-scoped) over a trailing
 * 30-day window for the configured site tag. `count` is page views and
 * `sum.visits` is visits. Each breakdown is fetched independently and is
 * fault-tolerant: a single failing dimension (e.g. a schema field rename)
 * yields an empty list for that breakdown rather than sinking the whole
 * snapshot. The country dimension returns an ISO-3166-1 alpha-2 code.
 */
interface RumRow {
  count: number;
  sum: { visits: number };
  dimensions: Record<string, string>;
}

const RUM_DATASET = "rumPageloadEventsAdaptiveGroups";

/** YYYY-MM-DD in UTC, `offsetDays` before `now` (0 = today). */
function utcDate(now: Date, offsetDays: number): string {
  const d = new Date(now.getTime() - offsetDays * 86400000);
  return d.toISOString().slice(0, 10);
}

async function cfGql<T>(env: Env, query: string): Promise<T> {
  const res = await fetch("https://api.cloudflare.com/client/v4/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.CF_ANALYTICS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`Cloudflare API ${res.status}: ${await res.text()}`);
  const json = (await res.json()) as { data?: T; errors?: unknown };
  if ((json.errors && (json.errors as unknown[]).length) || !json.data) {
    throw new Error(`Cloudflare GraphQL error: ${JSON.stringify(json.errors)}`);
  }
  return json.data;
}

/** One grouped RUM query over the window, ordered by page views, top `limit`. */
async function rumGroup(
  env: Env,
  from: string,
  to: string,
  dimension: string,
  limit: number,
  orderBy = "count_DESC",
): Promise<RumRow[]> {
  const query = `{
    viewer {
      accounts(filter: { accountTag: "${env.CF_ACCOUNT_ID}" }) {
        ${RUM_DATASET}(
          limit: ${limit}
          orderBy: [${orderBy}]
          filter: { AND: [{ date_geq: "${from}" }, { date_leq: "${to}" }, { siteTag: "${env.CF_SITE_TAG}" }] }
        ) {
          count
          sum { visits }
          dimensions { ${dimension} }
        }
      }
    }
  }`;
  const data = await cfGql<{ viewer: { accounts: Array<Record<string, RumRow[]>> } }>(env, query);
  return data.viewer.accounts[0]?.[RUM_DATASET] ?? [];
}

/** Map a grouped RUM result to a label/visits breakdown, dropping blank keys. */
function toBreakdown(rows: RumRow[], key: string, limit: number): TrafficBreakdown[] {
  return rows
    .map((r) => ({ label: r.dimensions[key] ?? "", visits: r.sum.visits }))
    .filter((b) => b.label !== "")
    .slice(0, limit);
}

/** Best-effort breakdown: any failure yields []. */
async function safeGroup(
  env: Env,
  from: string,
  to: string,
  dimension: string,
  limit: number,
): Promise<RumRow[]> {
  return rumGroup(env, from, to, dimension, limit).catch(() => []);
}

async function computeTraffic(env: Env): Promise<TrafficSnapshot> {
  const now = new Date();
  const to = utcDate(now, 0);
  const from = utcDate(now, TRAFFIC_DAYS - 1);

  // Daily series drives both the trend chart and the headline totals.
  const dayRows = await safeGroup(env, from, to, "date", TRAFFIC_DAYS + 2);
  const byDay: TrafficDay[] = dayRows
    .map((r) => ({ date: r.dimensions.date, pageViews: r.count, visits: r.sum.visits }))
    .filter((d) => Boolean(d.date))
    .sort((a, b) => a.date.localeCompare(b.date));

  const [countryRows, referrers, paths, browsers, os, devices] = await Promise.all([
    safeGroup(env, from, to, "countryName", 250),
    safeGroup(env, from, to, "refererHost", TRAFFIC_TOP_N + 4),
    safeGroup(env, from, to, "requestPath", TRAFFIC_TOP_N),
    safeGroup(env, from, to, "userAgentBrowser", TRAFFIC_TOP_N),
    safeGroup(env, from, to, "userAgentOS", TRAFFIC_TOP_N),
    safeGroup(env, from, to, "deviceType", TRAFFIC_TOP_N),
  ]);

  const byCountry: TrafficCountry[] = countryRows
    .map((r) => ({ code: (r.dimensions.countryName ?? "").toUpperCase(), pageViews: r.count, visits: r.sum.visits }))
    .filter((c) => c.code !== "" && c.code !== "XX");

  return {
    updatedAt: now.toISOString(),
    rangeDays: TRAFFIC_DAYS,
    totals: {
      pageViews: byDay.reduce((s, d) => s + d.pageViews, 0),
      visits: byDay.reduce((s, d) => s + d.visits, 0),
      countries: byCountry.length,
    },
    byDay,
    byCountry,
    topReferrers: toBreakdown(referrers, "refererHost", TRAFFIC_TOP_N),
    topPaths: toBreakdown(paths, "requestPath", TRAFFIC_TOP_N),
    browsers: toBreakdown(browsers, "userAgentBrowser", TRAFFIC_TOP_N),
    os: toBreakdown(os, "userAgentOS", TRAFFIC_TOP_N),
    devices: toBreakdown(devices, "deviceType", TRAFFIC_TOP_N),
  };
}

/**
 * Recompute the traffic snapshot and store it. Unlike GitHub line counts,
 * traffic values legitimately move week to week, so this is a fresh overwrite.
 * No-op (leaving any prior snapshot intact) when credentials are unset or the
 * fetch yields nothing usable, so an outage never overwrites good data with zeros.
 */
async function refreshTraffic(env: Env): Promise<void> {
  if (!env.CF_ANALYTICS_TOKEN || !env.CF_ACCOUNT_ID || !env.CF_SITE_TAG) return;
  const snapshot = await computeTraffic(env);
  if (snapshot.totals.pageViews === 0 && snapshot.byCountry.length === 0) return;
  const body = JSON.stringify(snapshot);
  await env.STATS.put(TRAFFIC_KEY, body);
  await env.STATS.put(TRAFFIC_VERSION_KEY, snapshot.updatedAt);
}

/** Edge cache key includes the dataset + its version so a refresh invalidates it. */
function versionedKey(request: Request, namespace: string, version: string): Request {
  return new Request(
    `${new URL(request.url).origin}/v/${namespace}/${encodeURIComponent(version)}`,
  );
}

/**
 * Serve a KV snapshot as JSON with CORS + versioned edge caching.
 *
 * Serve-only: the cron and the manual populate scripts are the sole writers, so
 * the expensive computes never run on a user request. A cold KV (fresh deploy /
 * eviction) returns 503 and the site keeps its static fallback rather than
 * triggering a subrequest/CPU blowout.
 */
async function serve(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  namespace: string,
  versionKey: string,
  dataKey: string,
): Promise<Response> {
  const cache = caches.default;

  const version = await env.STATS.get(versionKey);
  if (!version) {
    return new Response("warming up", { status: 503, headers: corsHeaders(env) });
  }

  // Cheap version probe; on an edge hit we serve without reading the full body.
  const cacheKey = versionedKey(request, namespace, version);
  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  const body = await env.STATS.get(dataKey);
  if (!body) {
    return new Response("warming up", { status: 503, headers: corsHeaders(env) });
  }

  // Cache at the Worker/edge only: s-maxage drives caches.default (7 days),
  // max-age=0 keeps the browser from holding its own stale copy. The versioned
  // key means a weekly cron refresh produces a new key and supersedes this one.
  const response = new Response(body, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": `public, max-age=0, s-maxage=${CACHE_SECONDS}`,
      ...corsHeaders(env),
    },
  });
  ctx.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}

export default {
  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    // Independent: a failure in one snapshot must not abort the other.
    ctx.waitUntil(refresh(env));
    ctx.waitUntil(refreshTraffic(env).catch(() => {}));
  },

  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(env) });
    }
    if (request.method !== "GET") {
      return new Response("Method Not Allowed", { status: 405, headers: corsHeaders(env) });
    }

    const { pathname } = new URL(request.url);
    if (pathname === "/traffic") {
      return serve(request, env, ctx, "traffic", TRAFFIC_VERSION_KEY, TRAFFIC_KEY);
    }
    // Default route: GitHub profile snapshot.
    return serve(request, env, ctx, "profile", VERSION_KEY, KV_KEY);
  },
} satisfies ExportedHandler<Env>;
