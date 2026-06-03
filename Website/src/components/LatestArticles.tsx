import { SectionUnderline } from "@/components/SectionUnderline";

export interface ArticleTeaser {
  slug: string;
  title: string;
  excerpt: string;
  date: Date;
  tags: string[];
}

interface Props {
  articles: ArticleTeaser[];
}

export function LatestArticles({ articles }: Props) {
  return (
    <section id="articles" className="relative px-6 py-24 sm:px-10 lg:px-20">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-baseline gap-4">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Articles</h2>
          <a href="/articles" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            View all →
          </a>
        </div>
        <SectionUnderline />

        {articles.length === 0 ? (
          <p className="text-muted-foreground">No articles yet. Check back soon.</p>
        ) : (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => {
              const formatted = article.date.toLocaleDateString("en-GB", {
                year: "numeric",
                month: "long",
                day: "numeric",
              });
              return (
                <a
                  key={article.slug}
                  href={`/articles/${article.slug}/`}
                  className="group block space-y-2"
                >
                  <time className="text-xs text-muted-foreground">{formatted}</time>
                  <h3 className="text-sm font-semibold text-foreground group-hover:text-foreground/80 transition-colors leading-snug">
                    {article.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                    {article.excerpt}
                  </p>
                  {article.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {article.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="text-xs px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/50"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </a>
              );
            })}
          </div>
        )}

      </div>
    </section>
  );
}
