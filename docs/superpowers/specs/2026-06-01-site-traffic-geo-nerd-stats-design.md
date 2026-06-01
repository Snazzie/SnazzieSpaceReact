# Site Traffic + Geo Map + Nerd Stats — Design

Date: 2026-06-01

## Goal

Add live site analytics to the portfolio, sourced from **Cloudflare Web
Analytics** (the site already runs on Cloudflare Pages):

1. A **Traffic** section: last-30-day pageviews/visits + a **geo choropleth** of
   traffic origin.
2. A final **Nerd Stats** section: dense traffic breakdowns (referrers, paths,
   browsers, OS, device type).

All data is recomputed **weekly** and cached, mirroring the existing
`snazzie-github-stats` worker (Worker + KV + versioned edge cache + static
fallback).

## Data source

Cloudflare Web Analytics / RUM, via the GraphQL Analytics API
(`https://api.cloudflare.com/client/v4/graphql`).

- Dataset: `rumPageloadEventsAdaptiveGroups`, queried under
  `viewer.accounts(filter: { accountTag })`.
- Metrics: `count` (page views), `sum { visits }`.
- Dimensions used: `date`, `countryName`, `refererHost`, `requestPath`,
  `userAgentBrowser`, `userAgentOS`, `deviceType` (+ `siteTag` in the filter).
- Country value is an **ISO-3166-1 alpha-2 code** (e.g. `US`, `GB`) — this is the
  choropleth join key.
- Auth: API token with **Account Analytics: Read**.

### Preconditions (flag to user; not blockers)

- The Web Analytics beacon must already be enabled on the site and have been
  collecting for ~30 days, or the sections launch sparse/empty.
- Web Analytics RUM retention is limited; the 30-day window is within retention.
- User supplies three values (same pattern as `GITHUB_TOKEN`):
  - `CF_ANALYTICS_TOKEN` — worker **secret** (Account Analytics: Read).
  - `CF_ACCOUNT_ID` — worker **var** (account tag).
  - `CF_SITE_TAG` — worker **var** (the Web Analytics site tag, i.e. the beacon
    token).

### Field-name verification (implementation gate)

Exact RUM dimension field names (`countryName` vs `metric.countryName`,
`userAgentBrowser`, etc.) and whether country is a code or a name will be
**live-tested against the user's token** before the snapshot shape is locked. If
country comes back as a full name rather than alpha-2, add an explicit
name→alpha-2 mapping table so countries are never silently dropped from the map.

## Architecture

### Worker (extend `worker/src/index.ts`)

- Add a `traffic` KV key + `traffic:version` key alongside the existing
  `profile`/`profile:version`.
- The existing weekly cron (`0 6 * * 1`) computes **both** the GitHub profile and
  the traffic snapshot. A failure in one must not abort the other (independent
  `try/catch`; reuse the github merge-on-prior-snapshot resilience idea where
  sensible — but traffic is a fresh overwrite, see below).
- New route: `GET /traffic` → serves the `traffic` snapshot with the **same**
  serve-only + versioned-edge-cache + CORS + `503 warming up` logic the existing
  `/` route uses. Existing `/` (GitHub) behaviour is unchanged.
- New `Env` fields: `CF_ANALYTICS_TOKEN`, `CF_ACCOUNT_ID`, `CF_SITE_TAG`.
- `wrangler.jsonc`: add the two vars; secret set via `wrangler secret put`.
- Traffic snapshot is a **fresh overwrite** each run (no max-merge): analytics
  values legitimately change/shrink week to week, unlike monotonic line counts.
  If a cron run fails to fetch, the **previous** KV snapshot is left untouched.

### Snapshot shape (`Website/src/data/traffic.ts`)

Static fallback, identical role to `github.ts`. Worker emits the same shape.

```ts
export interface TrafficBreakdown { label: string; visits: number }
export interface TrafficDay { date: string; pageViews: number; visits: number }
export interface TrafficCountry { code: string; pageViews: number; visits: number }

export interface TrafficSnapshot {
  updatedAt: string;     // ISO; UI labels "snapshot as of <date>"
  rangeDays: number;     // 30
  totals: { pageViews: number; visits: number; countries: number };
  byDay: TrafficDay[];          // ~30 points → trend chart
  byCountry: TrafficCountry[];  // → geo map + legend (alpha-2 codes)
  topReferrers: TrafficBreakdown[];
  topPaths: TrafficBreakdown[];
  browsers: TrafficBreakdown[];
  os: TrafficBreakdown[];
  devices: TrafficBreakdown[];
}
```

### Frontend components (`Website/src/components/`)

Reuse house style: hand-rolled SVG, `motion/react`, `@/lib/motion` (`D`, `EASE`),
`SectionUnderline`, `compact()` number formatting, `useReducedMotion`. **No chart
library.** Same fetch-with-static-fallback hook pattern as `GithubStats.tsx`
(seed static, replace with live `/traffic` payload, narrow with a type guard,
keep fallback on any error).

1. **`Traffic.tsx`** — `<section id="traffic">`
   - Headline stat grid: 30d **pageviews**, **visits**, **countries reached**
     (animated count-up `StatCard` idiom).
   - **Day-trend chart**: SVG area/line of `byDay` using the existing `smoothPath`
     monotone-cubic helper (extract it to `@/lib/` so both GithubStats and Traffic
     share it, rather than duplicating).
   - **Geo choropleth**: pre-baked equirectangular world SVG; each country path
     tinted by visit share (sequential scale). A **legend** beside it lists top
     countries (flag emoji from alpha-2 + horizontal visits bar). Hover/focus a
     country → tooltip with code + visits (keyboard accessible, matching the
     GithubStats hit-area pattern).
   - "Snapshot as of `<updatedAt>`" caption.

2. **`NerdStats.tsx`** — `<section id="nerd">` — the final data section.
   - Compact labelled horizontal-bar panels for: **top referrers**, **top paths**,
     **browsers**, **OS**, **device type**. Same bar idiom used elsewhere on the
     site. Each panel degrades gracefully when its dataset is empty.

### World map data (`Website/src/data/worldMap.ts`)

- `{ code: string /* ISO alpha-2 */, name: string, d: string /* SVG path */ }[]`.
- Generated **once** by a devDep-only script (`Website/scripts/gen-worldmap.mjs`)
  from `world-atlas` (countries-110m TopoJSON) projected with `d3-geo`
  (`geoEquirectangular` or `geoNaturalEarth1`) + `topojson-client`. Output is
  committed; `d3-geo`/`topojson-client`/`world-atlas` are **devDependencies only**
  and never ship to the client.
- Country features carry ISO numeric ids; map to alpha-2 to match CF's join key.

### Wiring

- `index.astro` order:
  `Intro → Quote → Career → TechStack → Projects → GithubStats → Traffic →
  NerdStats → HireMe`. (Stats cluster together; page still closes on the Hire Me
  CTA.) Both new components `client:visible`.
- `Nav.tsx` `LINKS`: add `{ href: "#traffic", label: "Traffic", id: "traffic" }`
  and `{ href: "#nerd", label: "Stats", id: "nerd" }` in the right positions;
  the existing scroll-spy/active-section logic picks them up automatically.
- `.env.example`: document optional `PUBLIC_TRAFFIC_STATS_URL` override (defaults
  to the deployed worker URL baked into `Traffic.tsx`, same as GitHub).

### Populate script

Extend/parallel the GitHub `populate.mjs`: a `scripts/populate-traffic.mjs` that
computes the traffic snapshot locally (given `CF_ANALYTICS_TOKEN`, account id,
site tag) and prints JSON, for the initial KV seed and for refreshing the static
`traffic.ts` fallback.

## Error handling

- Worker `/traffic`: serve-only. Cold KV → `503 warming up`; site keeps static
  fallback. Cron is the sole writer.
- A failed CF fetch in cron leaves the prior snapshot intact (no overwrite with
  empty/partial data).
- Frontend: any fetch error / failed type-guard → keep static fallback silently.
- Empty datasets (new site, no referrers, etc.) render a graceful
  "collecting data…" / empty state, never a broken chart.
- Reduced-motion: respected via `useReducedMotion`, matching existing components.

## Testing

- Worker: `tsc --noEmit` (typecheck) for the extended handler/types.
- Frontend: `tsc -b && vite build` (per project workflow) must pass. Add a small
  `traffic.test.ts` mirroring `projects.test.ts` if it adds value (shape/guards).
- Manual: `wrangler dev` + curl `/traffic`; verify the live payload against the
  type guard; verify choropleth tints and legend with the real country codes.

## Out of scope (YAGNI)

- Performance percentiles / Core Web Vitals panels.
- Build/site-meta panel (framework versions, bundle weight).
- Real-time/streaming analytics; anything finer than the weekly snapshot.
- Per-visitor or PII data (CF Web Analytics is cookieless/aggregate by design).
