// Compute the Cloudflare Web Analytics traffic snapshot locally and print it as
// JSON. Mirrors the Worker's computeTraffic(). Handy for the initial KV seed and
// for refreshing the static fallback in Website/src/data/traffic.ts.
//
// Usage:
//   CF_ANALYTICS_TOKEN=xxx CF_ACCOUNT_ID=xxx CF_SITE_TAG=xxx \
//     node scripts/populate-traffic.mjs > traffic.json
//
// Then push into KV:
//   wrangler kv key put traffic         "$(cat traffic.json)"               --namespace-id <id> --remote
//   wrangler kv key put traffic:version "$(jq -r .updatedAt traffic.json)"  --namespace-id <id> --remote

const TOKEN = process.env.CF_ANALYTICS_TOKEN;
const ACCOUNT = process.env.CF_ACCOUNT_ID;
const SITE = process.env.CF_SITE_TAG;
const DAYS = 30;
const TOP_N = 8;
const DATASET = "rumPageloadEventsAdaptiveGroups";

if (!TOKEN || !ACCOUNT || !SITE) {
  console.error("Set CF_ANALYTICS_TOKEN, CF_ACCOUNT_ID and CF_SITE_TAG.");
  process.exit(1);
}

const utcDate = (now, offsetDays) =>
  new Date(now.getTime() - offsetDays * 86400000).toISOString().slice(0, 10);

async function cfGql(query) {
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

async function rumGroup(from, to, dimension, limit, orderBy = "count_DESC") {
  const query = `{
    viewer { accounts(filter: { accountTag: "${ACCOUNT}" }) {
      ${DATASET}(
        limit: ${limit}
        orderBy: [${orderBy}]
        filter: { AND: [{ date_geq: "${from}" }, { date_leq: "${to}" }, { siteTag: "${SITE}" }] }
      ) { count sum { visits } dimensions { ${dimension} } }
    } }
  }`;
  const data = await cfGql(query);
  return data.viewer.accounts[0]?.[DATASET] ?? [];
}

const safeGroup = (from, to, dim, limit) =>
  rumGroup(from, to, dim, limit).catch((e) => {
    process.stderr.write(`warn: ${dim} failed: ${e.message}\n`);
    return [];
  });

const toBreakdown = (rows, key, limit) =>
  rows
    .map((r) => ({ label: r.dimensions[key] ?? "", visits: r.sum.visits }))
    .filter((b) => b.label !== "")
    .slice(0, limit);

async function main() {
  const now = new Date();
  const to = utcDate(now, 0);
  const from = utcDate(now, DAYS - 1);

  const dayRows = await safeGroup(from, to, "date", DAYS + 2);
  const byDay = dayRows
    .map((r) => ({ date: r.dimensions.date, pageViews: r.count, visits: r.sum.visits }))
    .filter((d) => Boolean(d.date))
    .sort((a, b) => a.date.localeCompare(b.date));

  const [countryRows, referrers, paths, browsers, os, devices] = await Promise.all([
    safeGroup(from, to, "countryName", 250),
    safeGroup(from, to, "refererHost", TOP_N + 4),
    safeGroup(from, to, "requestPath", TOP_N),
    safeGroup(from, to, "userAgentBrowser", TOP_N),
    safeGroup(from, to, "userAgentOS", TOP_N),
    safeGroup(from, to, "deviceType", TOP_N),
  ]);

  const byCountry = countryRows
    .map((r) => ({ code: (r.dimensions.countryName ?? "").toUpperCase(), pageViews: r.count, visits: r.sum.visits }))
    .filter((c) => c.code !== "" && c.code !== "XX");

  const snapshot = {
    updatedAt: now.toISOString(),
    rangeDays: DAYS,
    totals: {
      pageViews: byDay.reduce((s, d) => s + d.pageViews, 0),
      visits: byDay.reduce((s, d) => s + d.visits, 0),
      countries: byCountry.length,
    },
    byDay,
    byCountry,
    topReferrers: toBreakdown(referrers, "refererHost", TOP_N),
    topPaths: toBreakdown(paths, "requestPath", TOP_N),
    browsers: toBreakdown(browsers, "userAgentBrowser", TOP_N),
    os: toBreakdown(os, "userAgentOS", TOP_N),
    devices: toBreakdown(devices, "deviceType", TOP_N),
  };

  process.stdout.write(JSON.stringify(snapshot, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
