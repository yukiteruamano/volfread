import rss from '@astrojs/rss'
import { getCollection } from 'astro:content'
import { blogEntrySlug } from '../../i18n/utils'
import type { APIContext } from 'astro'

export async function GET(context: APIContext) {
  const posts = await getCollection(
    'blog',
    ({ data }) => data.lang === 'en' && (!import.meta.env.PROD || !data.draft)
  )
  posts.sort((a, b) => b.data.pubDate!.valueOf() - a.data.pubDate!.valueOf())
  return rss({
    title: 'volfread.xyz — Blog (EN)',
    description: 'Notes on development, Go, Python, web and blockchain.',
    site: context.site ?? 'https://volfread.xyz',
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate!,
      link: `/en/blog/${blogEntrySlug(post.id)}`,
    })),
    customData: '<language>en</language>',
  })
}
