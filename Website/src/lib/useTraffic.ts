import { useEffect, useState } from "react";
import { traffic, type TrafficSnapshot } from "@/data/traffic";

/** Live traffic endpoint (Cloudflare Worker `/traffic`); env var overrides the default. */
export const TRAFFIC_URL =
  (import.meta.env.PUBLIC_TRAFFIC_STATS_URL as string | undefined) ??
  "https://snazzie-github-stats.snazzieops.workers.dev/traffic";

/** Narrow an unknown fetch payload to the shape the sections render. */
function isSnapshot(value: unknown): value is TrafficSnapshot {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.totals === "object" &&
    v.totals !== null &&
    Array.isArray(v.byDay) &&
    Array.isArray(v.byCountry) &&
    typeof v.updatedAt === "string"
  );
}

/**
 * Seed with the static snapshot, then replace with live worker data when it
 * arrives. Keeps the static fallback on any error. Shared by Traffic and
 * NerdStats so the live payload is fetched once per component mount.
 */
export function useTraffic(): TrafficSnapshot {
  const [snapshot, setSnapshot] = useState<TrafficSnapshot>(traffic);

  useEffect(() => {
    if (!TRAFFIC_URL) return;
    const controller = new AbortController();
    fetch(TRAFFIC_URL, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((data: unknown) => {
        if (isSnapshot(data)) setSnapshot(data);
      })
      .catch(() => {
        /* keep static fallback on any error */
      });
    return () => controller.abort();
  }, []);

  return snapshot;
}

/** Convert an ISO-3166-1 alpha-2 code to its flag emoji (regional indicators). */
export function flagEmoji(code: string): string {
  if (!/^[A-Za-z]{2}$/.test(code)) return "";
  const base = 0x1f1e6;
  const cc = code.toUpperCase();
  return String.fromCodePoint(base + cc.charCodeAt(0) - 65, base + cc.charCodeAt(1) - 65);
}
