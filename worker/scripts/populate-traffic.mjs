// Compute the traffic snapshots locally and print as JSON: { updatedAt, site, all }.
// Mirrors the Worker's computeTraffic(). site = the CF_ZONE_TAG zone; all = every
// zone the token can read, summed. Handy for seeding KV and refreshing the
// static fallback in Website/src/data/traffic.ts.
//
// Usage:
//   CF_ANALYTICS_TOKEN=xxx CF_ZONE_TAG=xxx node scripts/populate-traffic.mjs > traffic.json
//
// Then push into the snazzie-traffic KV (binding TRAFFIC on snazzie-github-stats):
//   wrangler kv key put traffic         "$(cat traffic.json)"               --binding TRAFFIC --remote
//   wrangler kv key put traffic:version "$(jq -r .updatedAt traffic.json)"  --binding TRAFFIC --remote

const TOKEN = process.env.CF_ANALYTICS_TOKEN;
const ZONE = process.env.CF_ZONE_TAG;
const DAYS = 30;
const TOP_N = 8;

if (!TOKEN || !ZONE) {
  console.error("Set CF_ANALYTICS_TOKEN and CF_ZONE_TAG.");
  process.exit(1);
}

const utcDate = (now, offsetDays) =>
  new Date(now.getTime() - offsetDays * 86400000).toISOString().slice(0, 10);

async function gql(query) {
  const res = await fetch("https://api.cloudflare.com/client/v4/graphql", {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`Cloudflare API ${res.status}: ${await res.text()}`);
  const json = await res.json();
  if ((json.errors && json.errors.length) || !json.data) {
    throw new Error(`Cloudflare GraphQL error: ${JSON.stringify(json.errors)}`);
  }
  return json.data;
}

async function zoneTags() {
  const res = await fetch("https://api.cloudflare.com/client/v4/zones?per_page=50&status=active", {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  if (!res.ok) return [];
  const json = await res.json();
  return (json.result ?? []).map((z) => z.id);
}

async function fetchDays(zoneTag) {
  const now = new Date();
  const from = utcDate(now, DAYS - 1);
  const lt = utcDate(now, -1);
  const query = `{ viewer { zones(filter:{zoneTag:"${zoneTag}"}) {
    httpRequests1dGroups(limit:40, filter:{date_geq:"${from}", date_lt:"${lt}"}) {
      dimensions { date }
      sum {
        requests pageViews
        countryMap { clientCountryName requests }
        browserMap { uaBrowserFamily pageViews }
        responseStatusMap { edgeResponseStatus requests }
        contentTypeMap { edgeResponseContentTypeName requests }
        clientHTTPVersionMap { clientHTTPProtocol requests }
      }
    }
  } } }`;
  const data = await gql(query);
  return data.viewer.zones[0]?.httpRequests1dGroups ?? [];
}

const top = (tally, limit, drop = []) =>
  [...tally.entries()]
    .filter(([label]) => label !== "" && !drop.includes(label))
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);

async function snapshotFor(tags) {
  const dayMap = new Map();
  const country = new Map();
  const browser = new Map();
  const status = new Map();
  const contentType = new Map();
  const httpVersion = new Map();
  const add = (m, k, v) => m.set(k, (m.get(k) ?? 0) + v);

  let zonesWithData = 0;
  for (const tag of tags) {
    const days = await fetchDays(tag).catch((e) => {
      process.stderr.write(`warn: zone ${tag} failed: ${e.message}\n`);
      return [];
    });
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

  const byDay = [...dayMap.entries()]
    .map(([date, v]) => ({ date, requests: v.requests, pageViews: v.pageViews }))
    .sort((a, b) => a.date.localeCompare(b.date));
  const byCountry = [...country.entries()]
    .filter(([code]) => code !== "" && code !== "XX")
    .map(([code, requests]) => ({ code, requests }))
    .sort((a, b) => b.requests - a.requests);

  return {
    rangeDays: DAYS,
    zones: zonesWithData,
    totals: {
      requests: byDay.reduce((s, d) => s + d.requests, 0),
      pageViews: byDay.reduce((s, d) => s + d.pageViews, 0),
      countries: byCountry.length,
    },
    byDay,
    byCountry,
    browsers: top(browser, TOP_N, ["Unknown"]),
    statuses: top(status, TOP_N),
    contentTypes: top(contentType, TOP_N, ["unknown", "empty"]),
    httpVersions: top(httpVersion, TOP_N),
  };
}

async function main() {
  const allTags = await zoneTags();
  const everyTag = allTags.length ? allTags : [ZONE];
  const [site, all] = await Promise.all([snapshotFor([ZONE]), snapshotFor(everyTag)]);
  process.stdout.write(JSON.stringify({ updatedAt: new Date().toISOString(), site, all }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
