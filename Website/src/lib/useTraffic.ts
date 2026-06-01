import { useEffect, useState } from "react";
import { traffic, type TrafficData } from "@/data/traffic";

/** Live traffic endpoint (Cloudflare Worker `/traffic`); env var overrides the default. */
export const TRAFFIC_URL =
  (import.meta.env.PUBLIC_TRAFFIC_STATS_URL as string | undefined) ??
  "https://snazzie-github-stats.snazzieops.workers.dev/analytics";

/** Narrow an unknown fetch payload to the { site, all } shape the section renders. */
function isData(value: unknown): value is TrafficData {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  const scope = (s: unknown) =>
    typeof s === "object" && s !== null && Array.isArray((s as Record<string, unknown>).byCountry);
  return typeof v.updatedAt === "string" && scope(v.site) && scope(v.all);
}

/**
 * Seed with the static snapshot, then replace with live worker data when it
 * arrives. Keeps the static fallback on any error. Returns both scopes
 * (site + all); the component picks which to display.
 */
export function useTraffic(): TrafficData {
  const [data, setData] = useState<TrafficData>(traffic);

  useEffect(() => {
    if (!TRAFFIC_URL) return;
    const controller = new AbortController();
    fetch(TRAFFIC_URL, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((payload: unknown) => {
        if (isData(payload)) setData(payload);
      })
      .catch(() => {
        /* keep static fallback on any error */
      });
    return () => controller.abort();
  }, []);

  return data;
}

/** Convert an ISO-3166-1 alpha-2 code to its flag emoji (regional indicators). */
export function flagEmoji(code: string): string {
  if (!/^[A-Za-z]{2}$/.test(code)) return "";
  const base = 0x1f1e6;
  const cc = code.toUpperCase();
  return String.fromCodePoint(base + cc.charCodeAt(0) - 65, base + cc.charCodeAt(1) - 65);
}
