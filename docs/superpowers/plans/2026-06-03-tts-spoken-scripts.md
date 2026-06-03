# TTS Spoken Script Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Embed OmniVoice native control markers (`[laughter]`, `[B EY1 S]`, etc.) and spoken-form text directly in article MDX bodies. Display strips them; TTS passes them through natively.

**Architecture:** OmniVoice's `[marker]` syntax lives inline in MDX. A remark plugin strips standalone `[...]` tags from Astro's rendered HTML. `strip_mdx` in `generate-audio.py` already preserves these (it only strips `[text](url)` links). Articles are rewritten with spoken-form pronunciations and paralinguistic markers embedded.

**Tech Stack:** Python 3.14, OmniVoice TTS (native paralinguistic/phoneme control), Astro 6 remark plugin, CUDA (RTX 3080 Ti)

---

## Files

- Modify: `Website/astro.config.mjs` — add remark plugin to strip OmniVoice markers from display
- Create: `Website/src/lib/remark-strip-tts-markers.mjs` — remark plugin
- Modify: `Website/src/content/articles/backend-love-triangle.mdx` — add markers
- Modify: `Website/src/content/articles/building-snazzie-space.mdx` — add markers
- Modify: `Website/src/content/articles/dynamic-vs-ssr.mdx` — add markers
- Modify: `Website/src/content/articles/why-wordpress-is-obsolete.mdx` — add markers
- No changes to `scripts/generate-audio.py` (strip_mdx already passes `[...]` through)

---

### Task 1: Remark plugin to strip OmniVoice markers from display

OmniVoice markers like `[laughter]`, `[B EY1 S]`, `[pause]` are literal text in parsed Markdown — they survive as text nodes. The plugin finds text nodes containing `[...]` patterns not followed by `(` and removes them.

**Files:**
- Create: `Website/src/lib/remark-strip-tts-markers.mjs`
- Modify: `Website/astro.config.mjs`

- [ ] **Step 1: Create the remark plugin**

Create `Website/src/lib/remark-strip-tts-markers.mjs`:

```js
import { visit } from 'unist-util-visit';

// Strips OmniVoice TTS control markers from rendered output.
// Matches [marker] patterns that are NOT markdown links (not followed by `(`).
// Examples stripped: [laughter], [B EY1 S], [pause], [surprise-oh]
export default function remarkStripTtsMarkers() {
  return (tree) => {
    visit(tree, 'text', (node, index, parent) => {
      const cleaned = node.value.replace(/\[[^\]]+\](?!\()/g, '').replace(/\s{2,}/g, ' ').trim();
      if (cleaned === '') {
        parent.children.splice(index, 1);
        return index;
      }
      node.value = cleaned;
    });
  };
}
```

- [ ] **Step 2: Register plugin in astro.config.mjs**

Read current `Website/astro.config.mjs`, then add the import and plugin to the `markdown.remarkPlugins` array:

```js
import remarkStripTtsMarkers from './src/lib/remark-strip-tts-markers.mjs';

// inside defineConfig:
markdown: {
  remarkPlugins: [remarkStripTtsMarkers],
},
```

- [ ] **Step 3: Verify build passes**

```bash
cd Website && bun run build
```

Expected: build completes with no errors.

- [ ] **Step 4: Commit**

```bash
git add Website/src/lib/remark-strip-tts-markers.mjs Website/astro.config.mjs
git commit -m "feat(articles): strip OmniVoice TTS markers from rendered HTML"
```

---

### Task 2: Annotate backend-love-triangle.mdx

OmniVoice phoneme syntax: `[P HH OW1 N EH0 M]` replaces the word at that position. Paralinguistic: `[laughter]`, `[surprise-oh]`, `[dissatisfaction-hnn]` inject emotion. Write pronunciation-correct and naturally paced spoken text inline.

**Files:**
- Modify: `Website/src/content/articles/backend-love-triangle.mdx`

- [ ] **Step 1: Rewrite article body with OmniVoice markers**

Replace the body (after frontmatter) with:

```mdx
## The Old World

For years, the backend decision tree for startups looked familiar: Go if you wanted speed without pain, FastAPI if your team lived in Python, Node if you wanted to stay in the JavaScript[JavaScript] ecosystem. These choices made sense because they optimised for a real constraint — developer time is expensive, and Rust had a brutal learning curve.

That constraint is weaker now.

[laughter] LLMs don't write perfect Rust. But they dramatically lower the activation energy. The borrow checker errors that once burned hours are now resolved in minutes with a good prompt. The "Rust is too hard for a startup" argument has a shorter shelf life every month.

Which means the middle-ground options — Go, FastAPI — lose their main selling point.

## The Triangle

Three stacks now share the backend crown, each with a clear job.

## Rust — The Perfectionist

Zero-cost abstractions. Correctness enforced at compile time. A borrow checker that makes you prove your program is safe before it runs. Rust's pitch hasn't changed — what's changed is the cost of entry.

Rust attracts a certain kind of engineer: one who'd rather the compiler catch the bug than a customer. That's not a knock. It's a worldview, and it produces genuinely reliable software.

**Pick Rust when:** latency is non-negotiable, you're building something systems-adjacent (proxies, parsers, embedded services), or your team simply wants to do things right and is willing to let the compiler hold them to it. [AE1 K S AH0 M] and [AE1 K T IH0 K S]-web are both production-ready. The ecosystem is mature enough for most API[A P I] work.

## Bun — The Scrappy Upstart

Bun ships as a runtime, bundler, test runner, and package manager in one binary. Native TypeScript[TypeScript] support, fast I/O, and a familiar JavaScript[JavaScript] and TypeScript[TypeScript] API[A P I] surface. If your team already lives in TypeScript[TypeScript], Bun removes the context switch entirely — share types, utilities, and validation logic across the stack.

**Pick Bun when:** you're a TypeScript[TypeScript]-first team, building a fullstack product, or want to share types and logic across the stack without a context switch. Throughput is competitive with [AE1 S P IH0 DAA1 T N EH1 T] — the trade-offs are higher memory usage and a single-threaded runtime. Async works fine; Bun handles concurrent connections without issue. The limitation shows up with CPU-bound work: heavy computation blocks the main thread. Worker threads exist as an escape hatch, but it's not the default mental model the way dot NET's thread pool is. [EH1 L IH0 S IY0 AH0] and [HH OW1 N OW0] are both solid framework choices on top of Bun.

## ASP.NET — The Underrated Workhorse

[AE1 S P IH0 DAA1 T N EH1 T] gets dismissed as enterprise bloat. That reputation is outdated. Minimal APIs[A P I z] in dot NET 8 and later are terse and genuinely fast. Entity Framework Core handles SQL[S IH1 K W AH0 L] with first-class migrations. Auth middleware, health checks, and structured logging are all there before you install a single third-party package. Native OpenAPI[Open A P I] support landed in dot NET 9.

Where [AE1 S P IH0 DAA1 T N EH1 T] earns its reputation is at scale. The opinionated structure that feels rigid in a small project becomes an asset in a large one — new engineers know where things live, teams move independently, and the codebase stays coherent as it grows. Enterprise isn't a dirty word; it's a description of a project that needs to survive its second year.

**Pick ASP.NET when:** you're building something that will scale in team size as well as traffic, you want structure that holds up as the codebase grows, or you need a mature ecosystem with first-class SQL[S IH1 K W AH0 L], auth, and observability out of the box.

## The Exes: Go and FastAPI

Go's pitch was engineering productivity at scale with C-like performance — designed at Google to tame large, slow-to-compile C++ and Java codebases. That space is shrinking. Go is still a capable language — but "pick Go because Rust is too hard" is a weaker argument in 2026 than it was in 2022.

FastAPI remains excellent for one specific use case: ML inference pipelines where the Python ecosystem is non-negotiable. [N AH1 M P AY0], PyTorch[PyTorch], Hugging Face integrations — if your API[A P I] is fundamentally calling Python ML code, FastAPI is the right call. For everything else, Bun covers the "fast to ship" lane with competitive throughput and a much smaller footprint than a Python process.

## The Takeaway

There's no wrong answer inside the triangle. Rust, Bun, and [AE1 S P IH0 DAA1 T N EH1 T] each have a clear job and a defensible case. What's harder to defend is defaulting to Go or FastAPI out of habit — choosing familiarity over fit.

Pick the tool with the right shape for your problem. Just don't let "Rust is hard" be the reason you don't.
```

- [ ] **Step 2: Verify build**

```bash
cd Website && bun run build 2>&1 | tail -5
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add Website/src/content/articles/backend-love-triangle.mdx
git commit -m "feat(articles): add OmniVoice TTS markers to backend-love-triangle"
```

---

### Task 3: Annotate building-snazzie-space.mdx

**Files:**
- Modify: `Website/src/content/articles/building-snazzie-space.mdx`

- [ ] **Step 1: Rewrite article body with OmniVoice markers**

```mdx
## Why Astro

Astro's island architecture is a perfect fit for a portfolio site. The bulk of the page is static HTML[H T M L] — fast, indexable, zero JavaScript[JavaScript] overhead — with React islands hydrating only where interactivity matters.

## The Stack

- **Astro 6** for routing and static generation
- **React 19** for interactive sections (GitHub[GitHub] stats, traffic globe, tech stack 3D grid)
- **Tailwind 4** via Vite plugin — no PostCSS[Post C S S], faster builds
- **Cloudflare Pages** for hosting + **Cloudflare Workers** for the GitHub[GitHub] stats API[A P I]

## Cloudflare Worker

The GitHub[GitHub] stats section is powered by a Cloudflare Worker with a weekly cron job — Monday, six in the morning UTC[U T C]. It fetches contribution data via GitHub[GitHub]'s [G R AE1 F Q L] API[A P I] using a [P AE1 T] — keeping the token server-side and pulling private contributions. Results are written to [K EY1 V IY0] storage and served with edge caching. The site deploys weekly to pick up the fresh data baked into the static build.

## Cloudflare Traffic Stats

The Traffic section pulls real visitor analytics directly from Cloudflare's zone API[A P I] — pageviews, unique visits, and country breakdown. Same worker serves both the GitHub[GitHub] stats and the analytics endpoint, keeping all Cloudflare API[A P I] calls server-side behind the [P AE1 T].

## What's Next

Articles. You're reading the first one.
```

- [ ] **Step 2: Verify build**

```bash
cd Website && bun run build 2>&1 | tail -5
```

- [ ] **Step 3: Commit**

```bash
git add Website/src/content/articles/building-snazzie-space.mdx
git commit -m "feat(articles): add OmniVoice TTS markers to building-snazzie-space"
```

---

### Task 4: Annotate dynamic-vs-ssr.mdx

**Files:**
- Modify: `Website/src/content/articles/dynamic-vs-ssr.mdx`

- [ ] **Step 1: Rewrite article body with OmniVoice markers**

```mdx
Here's the conversation that plays out constantly in developer forums: someone has a portfolio with a live GitHub[GitHub] commit count, or a landing page that pulls pricing from a database, or a blog with a view counter. They want to move to Cloudflare. Then they say the thing: "but my site is dynamic, so I can't use static hosting."

This is the confusion worth unpacking, because it's sending people toward infrastructure they don't need.

## Dynamic and SSR are not synonyms

Server-side rendering means the server builds the HTML[H T M L] for each request at the moment it arrives. The user hits the URL[U R L], your server runs code, assembles the page, and ships it down the wire. The output is HTML[H T M L], generated live, every time.

Dynamic content means the data on your page changes. That's it. It says nothing about when the HTML[H T M L] gets built, or where.

These are orthogonal. A page can be statically generated at build time and still show live data — the static shell loads instantly, then JavaScript[JavaScript] fetches the fresh numbers and drops them in. A page can be server-rendered and show the same content to every visitor for a week. The axis isn't static versus dynamic. The axis is *when* the HTML[H T M L] is assembled: at build time, at request time on a server, or at request time in the browser.

Most people reaching for [EH1 S EH1 S AA1 R] need the third option. They're calling it the second by accident.

## What Cloudflare actually gives you

Cloudflare Pages is a [S IH1 D IH0 EH1 N] for static files. You push a build, it lands on hundreds of edge nodes, and your pages load from wherever the visitor is closest. No server, no per-request compute, no cold starts. The monthly bill for a portfolio or a marketing site is zero.

The part people miss: you can still talk to live data. Your static page can call a Cloudflare Worker — a small function that runs at the edge — and that Worker can hit your database, call an external API[A P I], or compute anything you need. The response comes back to the browser, JavaScript[JavaScript] writes it into the page, and the visitor sees fresh data.

This is not a compromise. For most sites this is the right architecture. The HTML[H T M L] is prebuilt and cached globally, so it's fast. The data layer is a Worker endpoint, so it's flexible. Nothing about this requires a full [EH1 S EH1 S AA1 R] framework.

## When SSR is actually the answer

[EH1 S EH1 S AA1 R] earns its complexity in two situations.

The first is SEO[S EH1 OW0]-critical pages where the content changes per-request and has to be in the HTML[H T M L] when the crawler arrives. Product listings that vary by user, search results that need to be indexed — these need the rendered HTML[H T M L] ready at request time, not assembled in the browser after a fetch.

The second is when your page is so data-dense, with so many dependent calls, that assembling it in the browser means visible loading states the user shouldn't have to see. A dashboard with twenty data sources might genuinely be better rendered on the server.

Notice what's not on that list: "my site fetches some data." That's not [EH1 S EH1 S AA1 R] territory. A GitHub[GitHub] stats card that loads after the page is fine. A pricing section that calls a Worker to get the current numbers is fine. The live data on snazzie dot space — GitHub[GitHub] contributions, Cloudflare traffic stats — arrives over a Worker API[A P I] after the static page loads. It doesn't need [EH1 S EH1 S AA1 R]. It needs a fetch call.

## The cost of the wrong call

Over-reaching for [EH1 S EH1 S AA1 R] isn't free. You've traded a static site — which deploys in thirty seconds, has no server to patch, and never cold-starts — for a runtime that has to be managed, scaled, and kept alive. Cloudflare Workers *can* do [EH1 S EH1 S AA1 R] through their compatibility with frameworks like Astro in hybrid mode, but the moment you do that, the simplicity you signed up for is gone.

The billing changes too. A static site on Cloudflare Pages costs nothing under reasonable traffic. An [EH1 S EH1 S AA1 R] deployment generating HTML[H T M L] on every request starts burning Worker invocations.

## The right question to ask

Before reaching for [EH1 S EH1 S AA1 R], ask where the HTML[H T M L] needs to be ready. If it needs to be crawlable and personalised before JavaScript[JavaScript] runs: [EH1 S EH1 S AA1 R]. If it needs live data but SEO[S EH1 OW0] doesn't depend on that data landing in the initial HTML[H T M L]: static site plus a fetch call.

Most sites asking the question belong in the second bucket. Build it statically, host it on Cloudflare Pages for free, put any server logic in a Worker. The data comes in after load, the page is globally cached, and you've spent nothing.

Dynamic is not a synonym for [EH1 S EH1 S AA1 R]. It never was.
```

- [ ] **Step 2: Verify build**

```bash
cd Website && bun run build 2>&1 | tail -5
```

- [ ] **Step 3: Commit**

```bash
git add Website/src/content/articles/dynamic-vs-ssr.mdx
git commit -m "feat(articles): add OmniVoice TTS markers to dynamic-vs-ssr"
```

---

### Task 5: Annotate why-wordpress-is-obsolete.mdx

**Files:**
- Modify: `Website/src/content/articles/why-wordpress-is-obsolete.mdx`

- [ ] **Step 1: Rewrite article body with OmniVoice markers**

```mdx
You're still on WordPress because it works. Fair. But "works" and "still the right choice" are different claims, and the gap between them has been widening for years.

Back in 2005, WordPress made a real trade. You gave up control over the underlying code and got, in return, a website without a developer or a server bill. That was an extraordinary deal. The thing worth noticing in 2026 is that almost every term of that deal has quietly expired.

## The slow tax you stopped noticing

WordPress isn't slow because the people who build it are careless. It's slow because it's an application pretending to be a website. Every page boot drags a database, a theme layer, and whatever plugins you've accumulated along the way. You're running software to render text that never changes.

That overhead is the part visitors feel. The part *you* feel is worse, and it shows up the moment you try to change something.

Want to move a section, tighten a color, adjust spacing? You're not editing your site. You're negotiating with a theme. If the customizer exposes a control for what you want, you're lucky. If it doesn't, you're hunting for a plugin, and now two plugins disagree, and you're debugging a conflict between code you didn't write and can't read. [dissatisfaction-hnn] A change that should take thirty seconds takes an afternoon, and you ship it nervous.

This is the design ceiling nobody warns you about when you start. You don't pick the site you want. You pick the template that's closest, then spend months making peace with the distance.

## The bills that don't show up on the invoice

The obvious costs are easy to total: hosting, a premium theme, the three plugins that went paid the year after you adopted them. The expensive costs are the ones that hide.

Maintenance is a subscription you pay in attention. There's always an update waiting, and updating is the moment things break, so you either update and brace, or skip it and accumulate risk. That risk has a name: WordPress is the most-attacked [S IH1 EH0 M EH0 S] on the internet precisely because it's everywhere. The admin panel is a door. The database is a vault. Every plugin is another window left open. You're not running a website, you're maintaining a small fortress, and the siege never lifts.

A static site doesn't play this game. There's no admin panel to breach, no database to dump, no plugin with a buried vulnerability, because there's no server logic at all. It's flat files on a [S IH1 D IH0 EH1 N]. You ship it once and stop thinking about it. Hosting that on Cloudflare's free tier costs nothing for the kind of traffic a portfolio or landing page actually sees.

## What actually changed

Here's the part that reframes everything. The reason you accepted WordPress's trade in the first place was the developer. Custom meant expensive. Expensive meant a salary or an agency, so you took the template and called it good.

That constraint is the one that broke.

An [EH1 L EH0 M] will scaffold your components, write your [S IH1 EH0 S EH0 S], build the layout, and rework it when you change your mind, in the time it takes to describe what you want. You don't need to master JavaScript[JavaScript]. You need to learn to describe a design and read back what comes out, which is a far shorter climb than learning WordPress's stack of abstractions ever was.

You don't even have to describe the look from scratch. Point it at sites you admire: "take the spacing from this one, the type from that one, the way this hero animates," and it pulls those instincts into your build. The mood-board-to-mockup gap that used to need a designer collapses into a paragraph. WordPress never let you say that to anything.

Pair that with [AE1 S T R OW0], a framework that ships static HTML[H T M L] by default and only adds JavaScript[JavaScript] where you genuinely need interaction, and the old trade inverts. You get the control WordPress took from you, without the developer it used to require.

## Proof, not theory

**snazzie dot space** is built this way. Custom sections, GitHub[GitHub] stats pulled live through a serverless backend, traffic numbers straight from Cloudflare. No WordPress theme reaches that, and the design answers to nobody but the person who built it.

**better task manager dot com** is the case for native interactivity. It's app-like and fast because the interactivity is part of the architecture, not a plugin bolted onto a [S IH1 EH0 M EH0 S] that was never meant to carry it.

**lunar portfolio dot com** is what a designer ships when the template stops being the boss. Custom layout, custom motion, custom brand, deployed to a free [S IH1 D IH0 EH1 N] with nothing to patch on Monday.

Fast, custom, free to host, and there's nothing standing there waiting to be hacked.

## The honest catch

This isn't free of cost. WordPress is point-and-click, and prompting your way through a build is a different muscle. You have to get comfortable telling an [EH1 L EH0 M] what you want and judging what it gives back.

But weigh the two learning curves honestly. WordPress asks you to learn its themes, its plugins, its customizer, its update rituals, its security hygiene, and the specific failure modes of a dozen plugins you didn't choose. The new way asks you to learn how to describe a design. One of those curves got dramatically shorter in the last three years. The other never did.

## The moment

WordPress solved 2005's problem: you needed a website and shouldn't have to hire a developer to get one.

[laughter] LLMs solved 2026's: you shouldn't have to compromise your design because custom was too expensive. That last sentence was WordPress's final advantage, and it's spent.

You're not saving time anymore. You're paying for it in load times, in afternoons lost to plugin conflicts, in the design you settled for, in updates you're scared to run. The math stopped working a while ago. The only thing left is the migration.
```

- [ ] **Step 2: Verify build**

```bash
cd Website && bun run build 2>&1 | tail -5
```

- [ ] **Step 3: Commit**

```bash
git add Website/src/content/articles/why-wordpress-is-obsolete.mdx
git commit -m "feat(articles): add OmniVoice TTS markers to why-wordpress-is-obsolete"
```

---

### Task 6: Regenerate all audio

- [ ] **Step 1: Run TTS regeneration**

```powershell
$env:PYTHONIOENCODING = "utf-8"
$env:PATH = [System.Environment]::GetEnvironmentVariable("PATH", "User") + ";" + [System.Environment]::GetEnvironmentVariable("PATH", "Machine")
Set-Location "C:\Users\acoop\Documents\GitHub\SnazzieSpaceReact"
python scripts/generate-audio.py --all
```

Expected: 4 articles, device: cuda, 4 FLACs + 4 waveform JSONs written.

- [ ] **Step 2: Commit regenerated audio**

```bash
git add Website/public/audio/
git commit -m "feat(audio): regenerate all article audio with OmniVoice markers"
```
