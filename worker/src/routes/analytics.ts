/**
 * GET /analytics — traffic snapshots, two scopes: { site, all }.
 *   site = the snazzie.space zone (CF_ZONE_TAG)
 *   all  = every zone the token can see, summed together
 *
 * Weekly cron pulls the last 30 days from each zone's `httpRequests1dGroups`
 * dataset and writes the combined JSON to KV; the route serves it with versioned
 * edge caching. Web Analytics RUM is not used (not enabled); the free plan caps
 * adaptive queries to 1 day and blocks refererHost/uniq, so everything comes
 * from the 1dGroups aggregate maps.
 *
 * "all" only spans multiple domains when the token's Zone Resources include them
 * — a snazzie.space-only token makes `all` equal `site`.
 */

import { Hono } from "hono";
import type { Env } from "../env";
import { serveSnapshot } from "../serve";

const KV_KEY = "traffic";
const VERSION_KEY = "traffic:version";
const TRAFFIC_DAYS = 30;
const TOP_N = 8;

interface TrafficBreakdown {
  label: string;
  value: number;
}
interface TrafficDay {
  date: string;
  requests: number;
  pageViews: number;
}
interface TrafficCountry {
  code: string;
  requests: number;
}
interface TrafficSnapshot {
  rangeDays: number;
  /** Number of zones (domains) folded into this snapshot. */
  zones: number;
  totals: { requests: number; pageViews: number; countries: number };
  byDay: TrafficDay[];
  byCountry: TrafficCountry[];
  browsers: TrafficBreakdown[];
  statuses: TrafficBreakdown[];
  contentTypes: TrafficBreakdown[];
  httpVersions: TrafficBreakdown[];
}
/** What gets stored / served: both scopes plus a shared timestamp. */
interface TrafficData {
  updatedAt: string;
  site: TrafficSnapshot;
  all: TrafficSnapshot;
}

interface Day1d {
  dimensions: { date: string };
  sum: {
    requests: number;
    pageViews: number;
    countryMap: Array<{ clientCountryName: string; requests: number }>;
    browserMap: Array<{ uaBrowserFamily: string; pageViews: number }>;
    responseStatusMap: Array<{ edgeResponseStatus: number; requests: number }>;
    contentTypeMap: Array<{ edgeResponseContentTypeName: string; requests: number }>;
    clientHTTPVersionMap: Array<{ clientHTTPProtocol: string; requests: number }>;
  };
}

/** YYYY-MM-DD in UTC, `offsetDays` before `now` (negative = future). */
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

/** All active zone tags the token can read (REST). Empty on failure. */
async function fetchZoneTags(env: Env): Promise<string[]> {
  const res = await fetch("https://api.cloudflare.com/client/v4/zones?per_page=50&status=active", {
    headers: { Authorization: `Bearer ${env.CF_ANALYTICS_TOKEN}` },
  });
  if (!res.ok) return [];
  const json = (await res.json()) as { result?: Array<{ id: string }> };
  return (json.result ?? []).map((z) => z.id);
}

/** One zone's last-30-day daily rows. */
async function fetchDays(env: Env, zoneTag: string): Promise<Day1d[]> {
  const now = new Date();
  const from = utcDate(now, TRAFFIC_DAYS - 1);
  const lt = utcDate(now, -1); // date_lt is exclusive; tomorrow so today is included
  const query = `{
    viewer {
      zones(filter: { zoneTag: "${zoneTag}" }) {
        httpRequests1dGroups(limit: 40, filter: { date_geq: "${from}", date_lt: "${lt}" }) {
          dimensions { date }
          sum {
            requests
            pageViews
            countryMap { clientCountryName requests }
            browserMap { uaBrowserFamily pageViews }
            responseStatusMap { edgeResponseStatus requests }
            contentTypeMap { edgeResponseContentTypeName requests }
            clientHTTPVersionMap { clientHTTPProtocol requests }
          }
        }
      }
    }
  }`;
  const data = await cfGql<{ viewer: { zones: Array<{ httpRequests1dGroups: Day1d[] }> } }>(env, query);
  return data.viewer.zones[0]?.httpRequests1dGroups ?? [];
}

function topBreakdown(
  tally: Map<string, number>,
  limit: number,
  drop: string[] = [],
): TrafficBreakdown[] {
  return [...tally.entries()]
    .filter(([label]) => label !== "" && !drop.includes(label))
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

/** Fetch + aggregate the given zones into a single snapshot. */
async function snapshotFor(env: Env, zoneTags: string[]): Promise<TrafficSnapshot> {
  const dayMap = new Map<string, { requests: number; pageViews: number }>();
  const country = new Map<string, number>();
  const browser = new Map<string, number>();
  const status = new Map<string, number>();
  const contentType = new Map<string, number>();
  const httpVersion = new Map<string, number>();
  const add = (m: Map<string, number>, k: string, v: number) => m.set(k, (m.get(k) ?? 0) + v);

  let zonesWithData = 0;
  for (const tag of zoneTags) {
    const days = await fetchDays(env, tag).catch(() => [] as Day1d[]);
    if (days.length) zonesWithData++;
    for (const d of days) {
      const day = dayMap.get(d.dimensions.date) ?? { requests: 0, pageViews: 0 };
      day.requests += d.sum.requests;
      day.pageViews += d.sum.pageViews;
      dayMap.set(d.dimensions.date, day);
      for (const c of d.sum.countryMap ?? []) add(country, c.clientCountryName.toUpperCase(), c.requests);
      for (const b of d.sum.browserMap ?? []) add(browser, b.uaBrowserFamily, b.pageViews);
      for (const s of d.sum.responseStatusMap ?? []) add(status, String(s.edgeResponseStatus), s.requests);
      for (const t of d.sum.contentTypeMap ?? []) add(contentType, t.edgeResponseContentTypeName, t.requests);
      for (const v of d.sum.clientHTTPVersionMap ?? []) add(httpVersion, v.clientHTTPProtocol, v.requests);
    }
  }

  const byDay: TrafficDay[] = [...dayMap.entries()]
    .map(([date, v]) => ({ date, requests: v.requests, pageViews: v.pageViews }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const byCountry: TrafficCountry[] = [...country.entries()]
    .filter(([code]) => code !== "" && code !== "XX")
    .map(([code, requests]) => ({ code, requests }))
    .sort((a, b) => b.requests - a.requests);

  return {
    rangeDays: TRAFFIC_DAYS,
    zones: zonesWithData,
    totals: {
      requests: byDay.reduce((s, d) => s + d.requests, 0),
      pageViews: byDay.reduce((s, d) => s + d.pageViews, 0),
      countries: byCountry.length,
    },
    byDay,
    byCountry,
    browsers: topBreakdown(browser, TOP_N, ["Unknown"]),
    statuses: topBreakdown(status, TOP_N),
    contentTypes: topBreakdown(contentType, TOP_N, ["unknown", "empty"]),
    httpVersions: topBreakdown(httpVersion, TOP_N),
  };
}

async function computeTraffic(env: Env): Promise<TrafficData> {
  const siteTag = env.CF_ZONE_TAG as string;
  const allTags = await fetchZoneTags(env);
  // Fall back to the single site zone if zone enumeration is unavailable.
  const everyTag = allTags.length ? allTags : [siteTag];

  const [site, all] = await Promise.all([
    snapshotFor(env, [siteTag]),
    snapshotFor(env, everyTag),
  ]);

  return { updatedAt: new Date().toISOString(), site, all };
}

/** Recompute + store both scopes; no-op when creds/data are missing. */
export async function refreshTraffic(env: Env): Promise<void> {
  if (!env.CF_ANALYTICS_TOKEN || !env.CF_ZONE_TAG) return;
  const data = await computeTraffic(env);
  if (data.site.totals.requests === 0 && data.all.totals.requests === 0) return;
  await env.TRAFFIC.put(KV_KEY, JSON.stringify(data));
  await env.TRAFFIC.put(VERSION_KEY, data.updatedAt);
}

export const analyticsRoute = new Hono<{ Bindings: Env }>();

analyticsRoute.get("/analytics", (c) =>
  serveSnapshot(c.req.raw, c.executionCtx, c.env.TRAFFIC, "traffic", VERSION_KEY, KV_KEY),
);
