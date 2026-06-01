// Compute the GitHub stats profile locally and print it as JSON.
//
// Mirrors the Worker's computeStats(): contributions/repos/stars via GraphQL,
// and per-year added/removed lines via GraphQL commit history (per-commit
// additions/deletions on each repo's default branch). Runs without subrequest
// limits, so it's handy for the initial KV seed.
//
// Usage:
//   GITHUB_TOKEN=$(gh auth token) node scripts/populate.mjs [username] > profile.json
//
// Then push into KV:
//   wrangler kv key put profile         "$(cat profile.json)"               --namespace-id <id> --remote
//   wrangler kv key put profile:version "$(jq -r .updatedAt profile.json)"  --namespace-id <id> --remote

const TOKEN = process.env.GITHUB_TOKEN;
const USERNAME = process.argv[2] || "Snazzie";
const CHART_YEARS = 7;
const LINES_BATCH = 6;
const LINES_PAGE = 100;
const MAX_LINES_ROUNDS = 800;

if (!TOKEN) {
  console.error("Set GITHUB_TOKEN (e.g. GITHUB_TOKEN=$(gh auth token)).");
  process.exit(1);
}

const log = (msg) => process.stderr.write(`${msg}\n`);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function gql(query) {
  let lastErr = "";
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: {
        Authorization: `bearer ${TOKEN}`,
        "User-Agent": "snazzie-github-stats-populate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    });
    if (res.status >= 500) {
      lastErr = `GitHub API ${res.status}`;
      await sleep(1000 * (attempt + 1));
      continue;
    }
    if (!res.ok) throw new Error(`GitHub API ${res.status}: ${await res.text()}`);
    const json = await res.json();
    if (json.errors || !json.data) throw new Error(`GraphQL error: ${JSON.stringify(json.errors)}`);
    return json.data;
  }
  throw new Error(lastErr || "GitHub API 5xx");
}

async function computeLines(repos, authorId) {
  const perYear = new Map();
  const states = repos.map((r) => ({ owner: r.owner.login, name: r.name, cursor: null, done: false }));

  let size = LINES_BATCH;
  for (let round = 0; round < MAX_LINES_ROUNDS; round++) {
    const pending = states.filter((s) => !s.done);
    if (pending.length === 0) break;
    const group = pending.slice(0, size);

    const fields = group
      .map((a, i) => {
        const after = a.cursor ? `, after: "${a.cursor}"` : "";
        return `a${i}: repository(owner: "${a.owner}", name: "${a.name}") { defaultBranchRef { target { ... on Commit { history(author: { id: "${authorId}" }, first: ${LINES_PAGE}${after}) { pageInfo { hasNextPage endCursor } nodes { committedDate additions deletions } } } } } }`;
      })
      .join("\n");

    const data = await gql(`{ ${fields} }`).catch((e) => {
      log(`batch(${group.length}) error: ${e.message}`);
      return null;
    });
    if (!data) {
      if (group.length === 1) group[0].done = true;
      else size = Math.max(1, Math.floor(size / 2));
      continue;
    }

    group.forEach((a, i) => {
      const history = data[`a${i}`]?.defaultBranchRef?.target?.history;
      if (!history) {
        a.done = true;
        return;
      }
      for (const c of history.nodes) {
        if (c.additions === 0 && c.deletions === 0) continue;
        const year = new Date(c.committedDate).getUTCFullYear();
        const b = perYear.get(year) ?? { a: 0, d: 0 };
        b.a += c.additions;
        b.d += c.deletions;
        perYear.set(year, b);
      }
      if (history.pageInfo.hasNextPage && history.pageInfo.endCursor) a.cursor = history.pageInfo.endCursor;
      else a.done = true;
    });
    size = LINES_BATCH;
    log(`remaining repos: ${states.filter((s) => !s.done).length}`);
  }
  return perYear;
}

async function main() {
  const created = await gql("{ viewer { id createdAt } }");
  const authorId = created.viewer.id;
  const startYear = new Date(created.viewer.createdAt).getUTCFullYear();
  const now = new Date();
  const endYear = now.getUTCFullYear();

  const yearFields = [];
  for (let y = startYear; y <= endYear; y++) {
    const from = y === startYear ? created.viewer.createdAt : `${y}-01-01T00:00:00Z`;
    const to = y === endYear ? now.toISOString() : `${y}-12-31T23:59:59Z`;
    yearFields.push(
      `y${y}: contributionsCollection(from:"${from}", to:"${to}"){ contributionCalendar { totalContributions } }`,
    );
  }

  const { viewer } = await gql(`{
    viewer {
      issues { totalCount }
      repositories(ownerAffiliations: [OWNER, ORGANIZATION_MEMBER], first: 100, isFork: false, orderBy: { field: STARGAZERS, direction: DESC }) {
        totalCount
        nodes { name stargazerCount owner { login } }
      }
      contributedTo: repositoriesContributedTo(first: 100, includeUserRepositories: true, contributionTypes: [COMMIT]) {
        totalCount
        nodes { name owner { login } }
      }
      ${yearFields.join("\n      ")}
    }
  }`);

  const repos = viewer.repositories.totalCount;
  const stars = viewer.repositories.nodes.reduce((s, r) => s + r.stargazerCount, 0);
  const issues = viewer.issues.totalCount;
  const contributedRepos = viewer.contributedTo.totalCount;

  // Owned repos + every repo we committed to that the token can read (incl. private org repos).
  const repoByKey = new Map();
  for (const r of viewer.repositories.nodes) repoByKey.set(`${r.owner.login}/${r.name}`, r);
  for (const r of viewer.contributedTo.nodes) {
    const key = `${r.owner.login}/${r.name}`;
    if (!repoByKey.has(key)) repoByKey.set(key, { name: r.name, owner: r.owner, stargazerCount: 0 });
  }
  log(`scanning ${repoByKey.size} repos (${viewer.repositories.nodes.length} owned + contributed)`);
  const perYear = await computeLines([...repoByKey.values()], authorId);

  const years = [];
  let contributions = 0;
  let additions = 0;
  let deletions = 0;
  for (let y = startYear; y <= endYear; y++) {
    const c = viewer[`y${y}`].contributionCalendar.totalContributions;
    const add = perYear.get(y)?.a ?? 0;
    const del = perYear.get(y)?.d ?? 0;
    contributions += c;
    additions += add;
    deletions += del;
    years.push({ year: y, contributions: c, additions: add, deletions: del });
  }

  const profile = {
    username: USERNAME,
    url: `https://github.com/${USERNAME}`,
    totals: { repositories: repos, stars, contributions, additions, deletions, issues, contributedRepos },
    years: years.slice(-CHART_YEARS),
    updatedAt: now.toISOString(),
  };
  process.stdout.write(JSON.stringify(profile));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
