import { motion, useReducedMotion, type Variants } from "motion/react";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight } from "lucide-react";
import { D, EASE } from "@/lib/motion";
import { SectionUnderline } from "@/components/SectionUnderline";

export interface ArticleTeaser {
  slug: string;
  title: string;
  excerpt: string;
  /** Pre-formatted display date (formatted server-side in index.astro). */
  date: string;
  tags: string[];
}

interface Props {
  articles: ArticleTeaser[];
}

const reveal: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: D.base, ease: EASE, delay: i * 0.06 },
  }),
};

const SPOTLIGHT =
  "radial-gradient(420px circle at var(--cx, 50%) var(--cy, 50%), rgba(255,255,255,0.06), transparent 60%)";

function ArticleCard({
  article,
  index,
  featured,
}: {
  article: ArticleTeaser;
  index: number;
  featured: boolean;
}) {
  const reduce = useReducedMotion();
  const onMove = reduce
    ? undefined
    : (e: React.PointerEvent<HTMLElement>) => {
        const el = e.currentTarget;
        const r = el.getBoundingClientRect();
        el.style.setProperty("--cx", `${e.clientX - r.left}px`);
        el.style.setProperty("--cy", `${e.clientY - r.top}px`);
      };

  return (
    <motion.a
      custom={index}
      variants={reveal}
      initial={reduce ? false : "hidden"}
      whileInView="show"
      viewport={{ once: true, amount: 0.2 }}
      onPointerMove={onMove}
      href={`/articles/${article.slug}/`}
      className={`group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card p-5 transition duration-200 hover:-translate-y-1 hover:border-zinc-600 ${
        featured ? "sm:col-span-2" : ""
      }`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-10 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: SPOTLIGHT }}
      />
      <time className="relative z-20 text-xs text-muted-foreground">{article.date}</time>
      <h3
        className={`relative z-20 mt-2 flex items-start gap-1.5 font-semibold leading-snug text-foreground ${
          featured ? "text-lg" : "text-sm"
        }`}
      >
        <span className={featured ? "" : "line-clamp-2"}>{article.title}</span>
        <ArrowUpRight className="mt-0.5 size-4 shrink-0 -translate-x-1 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100" />
      </h3>
      <p
        className={`relative z-20 mt-2 text-sm leading-relaxed text-muted-foreground ${
          featured ? "line-clamp-3" : "line-clamp-2"
        }`}
      >
        {article.excerpt}
      </p>
      {article.tags.length > 0 && (
        <div className="relative z-20 mt-auto flex flex-wrap gap-1.5 pt-4">
          {article.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="outline" className="border-border text-muted-foreground">
              {tag}
            </Badge>
          ))}
        </div>
      )}
    </motion.a>
  );
}

export function LatestArticles({ articles }: Props) {
  const reduce = useReducedMotion();
  const headingProps = {
    initial: reduce ? (false as const) : { opacity: 0, y: 16 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.5 },
    transition: { duration: D.base, ease: EASE },
  };

  return (
    <section id="articles" className="relative px-6 py-24 sm:px-10 lg:px-20">
      <div className="max-w-5xl mx-auto">
        <motion.div {...headingProps} className="flex items-baseline gap-4">
          <h2 className="text-2xl font-semibold tracking-tight md:text-4xl">Articles</h2>
          <a
            href="/articles"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            View all →
          </a>
        </motion.div>
        <SectionUnderline className="mb-10" />

        {articles.length === 0 ? (
          <p className="text-muted-foreground">No articles yet. Check back soon.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((article, i) => (
              <ArticleCard
                key={article.slug}
                article={article}
                index={i}
                featured={i === 0 && articles.length > 1}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
