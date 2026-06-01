export interface Env {
  /** KV for the GitHub profile snapshot. */
  STATS: KVNamespace;
  /** KV for the traffic snapshot (separate namespace from the GitHub one). */
  TRAFFIC: KVNamespace;
  /** Classic PAT with `read:user` + `repo` scopes. Set via `wrangler secret put`. */
  GITHUB_TOKEN: string;
  GITHUB_USERNAME: string;
  /** CORS allow-origin, e.g. your site origin or "*". */
  ALLOWED_ORIGIN: string;
  /** API token with `Zone Analytics: Read`. Set via `wrangler secret put`. */
  CF_ANALYTICS_TOKEN?: string;
  /** Zone tag for snazzie.space (drives the traffic httpRequests1dGroups query). */
  CF_ZONE_TAG?: string;
}
