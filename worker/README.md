# snazzie-github-stats worker

Cloudflare Worker that publishes a cached JSON snapshot of GitHub activity
(including **private / closed-source** contributions, since it queries the
GraphQL API authenticated as you).

- **Weekly cron** (`0 6 * * 1`, Mondays 06:00 UTC) recomputes the snapshot into KV.
- **Fetch handler** serves the snapshot as JSON with CORS + edge caching, and
  lazily computes it on the first request if the cron has not run yet.

KV namespace `github-stats` (id `8a72d7e2281f458682db02c920092ef9`) is already
created on the `cooper` account and wired in `wrangler.jsonc`.

## One-time setup

```sh
cd worker
bun install            # or npm install

# 1. Create a GitHub classic PAT with scopes: read:user, repo
#    https://github.com/settings/tokens  (repo scope is what makes private
#    contributions count). Then store it as a Worker secret:
bunx wrangler secret put GITHUB_TOKEN

# 2. Deploy
bun run deploy
```

Deploy prints the URL, e.g. `https://snazzie-github-stats.<subdomain>.workers.dev`.

## Wire the frontend (Cloudflare Pages)

The site deploys via **Cloudflare Pages**, so set the endpoint as a Pages build
environment variable rather than a committed `.env`:

- Dashboard: Pages project -> Settings -> Variables and Secrets ->
  add `PUBLIC_GITHUB_STATS_URL = https://snazzie-github-stats.<subdomain>.workers.dev`
  for both Production and Preview, then redeploy.
- Or via CLI: `bunx wrangler pages secret put PUBLIC_GITHUB_STATS_URL` (or set it
  in your CI build env).

For local dev, a `Website/.env` with the same var works too (see `.env.example`).

The `GithubStats` component ships the static numbers in `src/data/github.ts`
and then fetches this URL to update them live. If the var is unset or the
worker is unreachable, the static numbers are shown unchanged.

> Tip: since both run on Cloudflare, you could instead serve this from a Pages
> Function on the site's own domain (no CORS, same origin). The standalone
> Worker is kept here so the cron + KV live independently of site deploys.

## Local dev

```sh
echo 'GITHUB_TOKEN = "ghp_xxx"' > .dev.vars   # not committed
bun run dev
curl http://localhost:8787
```

## Manually trigger the cron locally

```sh
bunx wrangler dev --test-scheduled
curl "http://localhost:8787/__scheduled?cron=0+6+*+*+1"
```

## Refresh / inspect production

```sh
bun run tail                         # live logs
bunx wrangler kv key get profile --binding STATS   # read current snapshot
```
