/**
 * snazzie-github-stats Worker — two read-only JSON feeds, Hono-routed:
 *   GET /ghstats    GitHub profile snapshot   (src/routes/ghstats.ts, KV: STATS)
 *   GET /analytics  snazzie.space traffic      (src/routes/analytics.ts, KV: TRAFFIC)
 *
 * A weekly cron recomputes both snapshots into KV; the routes serve them with
 * CORS + versioned edge caching. The expensive computes never run on a request.
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env } from "./env";
import { ghstatsRoute, refreshGithub } from "./routes/ghstats";
import { analyticsRoute, refreshTraffic } from "./routes/analytics";

const app = new Hono<{ Bindings: Env }>();

app.use("*", cors({ origin: "*", allowMethods: ["GET", "OPTIONS"] }));
app.route("/", ghstatsRoute);
app.route("/", analyticsRoute);

export default {
  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    // Independent: a failure in one snapshot must not abort the other.
    ctx.waitUntil(refreshGithub(env).catch(() => {}));
    ctx.waitUntil(refreshTraffic(env).catch(() => {}));
  },

  fetch: app.fetch,
} satisfies ExportedHandler<Env>;
