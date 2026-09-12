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
        const pubDate = data.pubDate ?? data.date
        if (!pubDate) throw new Error('pubDate (o date) requerido')
        const rawCategories =
          data.category && data.categories.length === 0 ? [data.category] : data.categories
        const categories = (rawCategories.length > 0 ? rawCategories : ['general']).map((c) =>
          c.toLowerCase().trim()
        )
        const tags = (data.tags ?? []).map((t) => t.toLowerCase().trim())
        const lang = (data.lang ?? 'es').toLowerCase()
        if (lang !== 'es' && lang !== 'en') throw new Error(`lang inválido: ${data.lang}`)
        if (typeof data.hidden === 'boolean' && data.draft === false) data.draft = !!data.hidden
        return {
          ...data,
          pubDate,
          cover: data.cover ?? data.image,
          categories,
          tags,
          lang,
        }
      }),
})

export const collections = { blog }
