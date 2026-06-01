export interface TrafficBreakdown {
  /** Display label, e.g. a referer host, path, browser or device type. */
  label: string;
  visits: number;
}

export interface TrafficDay {
  /** ISO date (YYYY-MM-DD). */
  date: string;
  pageViews: number;
  visits: number;
}

export interface TrafficCountry {
  /** ISO-3166-1 alpha-2 country code (the world-map join key). */
  code: string;
  pageViews: number;
  visits: number;
}

export interface TrafficSnapshot {
  /** ISO timestamp; the UI labels this as "snapshot as of <date>". */
  updatedAt: string;
  /** Trailing window length in days (30). */
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

/**
 * Static fallback snapshot of site traffic. These figures are NOT live and are
 * illustrative placeholders.
 *
 * At runtime Traffic.tsx / NerdStats.tsx fetch the live numbers from the
 * Cloudflare Worker's `/traffic` endpoint (Cloudflare Web Analytics, recomputed
 * weekly). If the worker is unset or unreachable, this fallback is shown and the
 * UI labels it "snapshot as of <updatedAt>" so a stale snapshot is never passed
 * off as live data.
 *
 * Country codes are ISO-3166-1 alpha-2 to match the world-map paths.
 */
export const traffic: TrafficSnapshot = {
  updatedAt: "2026-06-01T06:00:00.000Z",
  rangeDays: 30,
  totals: { pageViews: 1769, visits: 1273, countries: 10 },
  byDay: [
    { date: "2026-05-03", pageViews: 42, visits: 30 },
    { date: "2026-05-04", pageViews: 69, visits: 50 },
    { date: "2026-05-05", pageViews: 70, visits: 50 },
    { date: "2026-05-06", pageViews: 71, visits: 51 },
    { date: "2026-05-07", pageViews: 71, visits: 51 },
    { date: "2026-05-08", pageViews: 89, visits: 64 },
    { date: "2026-05-09", pageViews: 60, visits: 43 },
    { date: "2026-05-10", pageViews: 54, visits: 39 },
    { date: "2026-05-11", pageViews: 71, visits: 51 },
    { date: "2026-05-12", pageViews: 62, visits: 45 },
    { date: "2026-05-13", pageViews: 72, visits: 52 },
    { date: "2026-05-14", pageViews: 62, visits: 45 },
    { date: "2026-05-15", pageViews: 53, visits: 38 },
    { date: "2026-05-16", pageViews: 19, visits: 14 },
    { date: "2026-05-17", pageViews: 13, visits: 9 },
    { date: "2026-05-18", pageViews: 53, visits: 38 },
    { date: "2026-05-19", pageViews: 50, visits: 36 },
    { date: "2026-05-20", pageViews: 49, visits: 35 },
    { date: "2026-05-21", pageViews: 50, visits: 36 },
    { date: "2026-05-22", pageViews: 52, visits: 37 },
    { date: "2026-05-23", pageViews: 49, visits: 35 },
    { date: "2026-05-24", pageViews: 50, visits: 36 },
    { date: "2026-05-25", pageViews: 76, visits: 55 },
    { date: "2026-05-26", pageViews: 75, visits: 54 },
    { date: "2026-05-27", pageViews: 73, visits: 53 },
    { date: "2026-05-28", pageViews: 88, visits: 63 },
    { date: "2026-05-29", pageViews: 82, visits: 59 },
    { date: "2026-05-30", pageViews: 49, visits: 35 },
    { date: "2026-05-31", pageViews: 40, visits: 29 },
    { date: "2026-06-01", pageViews: 55, visits: 40 },
  ],
  byCountry: [
    { code: "US", pageViews: 520, visits: 374 },
    { code: "GB", pageViews: 286, visits: 206 },
    { code: "DE", pageViews: 173, visits: 124 },
    { code: "SE", pageViews: 142, visits: 102 },
    { code: "NL", pageViews: 108, visits: 78 },
    { code: "CA", pageViews: 96, visits: 69 },
    { code: "FR", pageViews: 84, visits: 60 },
    { code: "AU", pageViews: 71, visits: 51 },
    { code: "IN", pageViews: 64, visits: 46 },
    { code: "BR", pageViews: 45, visits: 32 },
  ],
  topReferrers: [
    { label: "github.com", visits: 312 },
    { label: "google.com", visits: 268 },
    { label: "linkedin.com", visits: 141 },
    { label: "t.co", visits: 73 },
    { label: "news.ycombinator.com", visits: 52 },
    { label: "reddit.com", visits: 38 },
  ],
  topPaths: [
    { label: "/", visits: 904 },
    { label: "/#projects", visits: 142 },
    { label: "/#github", visits: 96 },
    { label: "/#career", visits: 71 },
    { label: "/#hire", visits: 60 },
  ],
  browsers: [
    { label: "Chrome", visits: 712 },
    { label: "Safari", visits: 318 },
    { label: "Firefox", visits: 124 },
    { label: "Edge", visits: 86 },
    { label: "Brave", visits: 33 },
  ],
  os: [
    { label: "Windows", visits: 498 },
    { label: "macOS", visits: 402 },
    { label: "iOS", visits: 178 },
    { label: "Android", visits: 132 },
    { label: "Linux", visits: 63 },
  ],
  devices: [
    { label: "desktop", visits: 901 },
    { label: "mobile", visits: 312 },
    { label: "tablet", visits: 60 },
  ],
};
