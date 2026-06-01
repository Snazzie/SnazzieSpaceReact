/** Edge (caches.default) cache lifetime: 7 days, matching the weekly cron refresh. */
export const CACHE_SECONDS = 604800;
/**
 * Browser cache lifetime: 3 days. The data only changes on the weekly cron, so a
 * returning visitor can safely reuse their copy for a few days without hitting
 * the Worker again. (A Worker on its route always runs before any edge cache, so
 * this browser TTL is the only lever that avoids invocations entirely.)
 */
export const BROWSER_CACHE_SECONDS = 259200;

/**
 * Serve a KV snapshot as JSON with a versioned edge cache. Serve-only: the cron
 * and the populate scripts are the sole writers, so the expensive computes never
 * run on a request; a cold KV returns 503 and the site keeps its static fallback.
 * CORS is applied by the Hono `cors()` middleware, not here.
 */
export async function serveSnapshot(
  request: Request,
  ctx: ExecutionContext,
  kv: KVNamespace,
  namespace: string,
  versionKey: string,
  dataKey: string,
): Promise<Response> {
  const cache = caches.default;
  const version = await kv.get(versionKey);
  if (!version) return new Response("warming up", { status: 503 });

  // Cheap version probe; on an edge hit we serve without reading the full body.
  const cacheKey = new Request(
    `${new URL(request.url).origin}/v/${namespace}/${encodeURIComponent(version)}`,
  );
  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  const body = await kv.get(dataKey);
  if (!body) return new Response("warming up", { status: 503 });

  // max-age caches in the visitor's browser (3 days, so repeat loads skip the
  // Worker); s-maxage drives caches.default at the edge (7 days). The versioned
  // key means a weekly cron refresh produces a new key and supersedes this one.
  const response = new Response(body, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": `public, max-age=${BROWSER_CACHE_SECONDS}, s-maxage=${CACHE_SECONDS}`,
    },
  });
  ctx.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}
