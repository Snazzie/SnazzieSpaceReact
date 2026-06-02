import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const posts = (await getCollection('articles', ({ data }) => !data.draft))
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());

  return rss({
    title: 'Aaron Cooper — Articles',
    description: 'Technical articles and project breakdowns by Aaron Cooper.',
    site: context.site ?? 'https://snazzie.space',
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.excerpt,
      pubDate: post.data.date,
      link: `/articles/${post.id}/`,
    })),
    customData: '<language>en-gb</language>',
  });
}
