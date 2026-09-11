import { defineCollection, z } from 'astro:content'

const blog = defineCollection({
  type: 'content',
  schema: ({ image }) =>
    z
      .object({
        title: z.string(),
        description: z.string(),
        pubDate: z.coerce.date().optional(),
        date: z.coerce.date().optional(),
        updatedDate: z.coerce.date().optional(),
        lang: z.enum(['es', 'en']).optional(),
        tags: z.array(z.string()).default([]),
        categories: z.array(z.string()).default([]),
        category: z.string().optional(),
        draft: z.boolean().default(false),
        hidden: z.boolean().optional(),
        comments: z.boolean().optional(),
        math: z.boolean().optional(),
        author: z.string().default('Jose Maldonado "Yukiteru Amano"'),
        cover: z.union([image(), z.string()]).optional(),
        image: z.union([image(), z.string()]).optional(),
        coverAlt: z.string().optional(),
        translationKey: z.string().optional(),
      })
      .transform((data) => {
        const d = data as typeof data & {
          date?: Date
          image?: unknown
          category?: string
          hidden?: boolean
        }
        if (!d.pubDate && d.date) d.pubDate = d.date as any
        if (!d.pubDate) throw new Error('pubDate (o date) requerido')
        if (!d.cover && d.image) d.cover = d.image as any
        if (d.category && (!d.categories || d.categories.length === 0)) {
          d.categories = [d.category]
        }
        if (!d.categories || d.categories.length === 0) d.categories = ['general']
        d.categories = d.categories.map((c: string) => c.toLowerCase().trim())
        d.tags = (d.tags ?? []).map((t: string) => t.toLowerCase().trim())
        if (typeof d.hidden === 'boolean' && d.draft === false) d.draft = !!d.hidden
        if (!d.lang) d.lang = 'es'
        d.lang = (d.lang as string).toLowerCase() as any
        return d
      }),
})

export const collections = { blog }
