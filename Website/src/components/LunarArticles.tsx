import { useEffect, useState } from "react";

interface LunarArticle {
  title: string;
  link: string;
  pubDate: string;
  description: string;
}

function parseLunarRss(xml: string): LunarArticle[] {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const items = Array.from(doc.querySelectorAll("item")).slice(0, 6);
  return items.map((item) => ({
    title: item.querySelector("title")?.textContent ?? "",
    link: item.querySelector("link")?.textContent ?? "",
    pubDate: item.querySelector("pubDate")?.textContent ?? "",
    description: item.querySelector("description")?.textContent ?? "",
  }));
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export function LunarArticles() {
  const [articles, setArticles] = useState<LunarArticle[]>([]);
  const [status, setStatus] = useState<"loading" | "done" | "error">("loading");

  useEffect(() => {
    fetch("https://lunarportfolio.com/rss.xml")
      .then((r) => {
        if (!r.ok) throw new Error("fetch failed");
        return r.text();
      })
      .then((xml) => {
        setArticles(parseLunarRss(xml));
        setStatus("done");
      })
      .catch(() => setStatus("error"));
  }, []);

  if (status === "error" || (status === "done" && articles.length === 0)) return null;

  return (
    <section className="mt-20 pt-16 border-t border-white/10">
      <div className="flex items-center gap-3 mb-8">
        <h2 className="text-xl font-bold tracking-tight text-white">From Lunar</h2>
        <a
          href="https://lunarportfolio.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-white/40 hover:text-white/70 transition-colors"
        >
          lunarportfolio.com ↗
        </a>
      </div>

      {status === "loading" ? (
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="space-y-2 animate-pulse">
              <div className="h-3 w-24 rounded bg-white/10" />
              <div className="h-4 w-full rounded bg-white/10" />
              <div className="h-4 w-3/4 rounded bg-white/10" />
              <div className="h-3 w-full rounded bg-white/5" />
              <div className="h-3 w-5/6 rounded bg-white/5" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => (
            <a
              key={article.link}
              href={article.link}
              target="_blank"
              rel="noopener noreferrer"
              className="group block space-y-2"
            >
              <time className="text-xs text-white/40">{formatDate(article.pubDate)}</time>
              <h3 className="text-sm font-semibold text-white group-hover:text-white/80 transition-colors leading-snug">
                {article.title}
              </h3>
              <p className="text-sm text-white/50 leading-relaxed line-clamp-2">
                {article.description}
              </p>
            </a>
          ))}
        </div>
      )}
    </section>
  );
}
