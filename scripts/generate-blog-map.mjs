#!/usr/bin/env node
// scripts/generate-blog-map.mjs — genera src/i18n/blogMap.json dinámico desde translationKey
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// VOLFREAD_ROOT permite redirigir el repo (tests con fixtures en tests/).
const root = process.env.VOLFREAD_ROOT
  ? path.resolve(process.env.VOLFREAD_ROOT)
  : path.resolve(__dirname, '..')
const contentRoot = path.join(root, 'packages/main/src/content/blog')
const outPath = path.join(root, 'packages/main/src/i18n/blogMap.json')

function parseList(value) {
  // "['a', 'b']" | "[a, b]" | "a" -> ['a','b'] (normalizado como content.config.ts)
  const inner = value.trim().replace(/^\[/, '').replace(/\]$/, '')
  if (!inner.trim()) return []
  return inner
    .split(',')
    .map((s) =>
      s
        .trim()
        .replace(/^['"]|['"]$/g, '')
        .toLowerCase()
        .trim()
    )
    .filter(Boolean)
}

function parseFrontmatter(file) {
  const txt = fs.readFileSync(file, 'utf8')
  const m = txt.match(/^---\s*\n([\s\S]*?)\n---/)
  if (!m) return {}
  const yaml = m[1]
  const data = {}
  for (const line of yaml.split('\n')) {
    const kv = line.match(/^\s*([A-Za-z0-9_]+)\s*:\s*(.+)\s*$/)
    if (!kv) continue
    let [, k, v] = kv
    v = v.trim()
    // strip quotes
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
      v = v.slice(1, -1)
    data[k] = v
  }
  return data
}

function walk(dir) {
  const entries = []
  if (!fs.existsSync(dir)) return entries
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name)
    if (entry.isDirectory()) entries.push(...walk(p))
    else if (entry.isFile() && (p.endsWith('.md') || p.endsWith('.mdx'))) entries.push(p)
  }
  return entries
}

const files = walk(contentRoot)
const map = {}
// Taxonomías y fechas para SEO: qué tags/categorías existen por idioma (evita
// hreflang hacia 404) y lastmod del sitemap. Solo posts publicables (sin draft/hidden).
const taxonomy = {
  es: { tags: new Set(), categories: new Set() },
  en: { tags: new Set(), categories: new Set() },
}
const postDates = {}

for (const file of files) {
  const rel = path.relative(contentRoot, file) // es/primeros-pasos/index.md
  const slug = rel.replace(/\/index\.mdx?$/, '').replace(/\.mdx?$/, '') // es/primeros-pasos
  const data = parseFrontmatter(file)
  const lang = slug.startsWith('en/') ? 'en' : 'es'
  const key = slug.replace(/^(es|en)\//, '')
  if (data.translationKey) {
    const target = data.translationKey.trim()
    // map is bidirectional: current slug -> target, and we will also ensure reverse when processing target file
    if (key && target) {
      map[key] = target
    }
  }
  const isDraft = data.draft === 'true' || data.hidden === 'true'
  if (!isDraft && taxonomy[lang]) {
    for (const t of parseList(data.tags ?? '')) taxonomy[lang].tags.add(t)
    const cats = parseList(data.categories ?? '')
    if (data.category)
      cats.push(
        data.category
          .trim()
          .replace(/^['"]|['"]$/g, '')
          .toLowerCase()
      )
    for (const c of cats.length ? cats : ['general']) taxonomy[lang].categories.add(c)
    const lastmod = data.updatedDate ?? data.pubDate ?? data.date
    if (key && lastmod && !Number.isNaN(Date.parse(lastmod)))
      postDates[`${lang}/${key}`] = new Date(lastmod).toISOString()
  }
}

// Ensure bidirectional completeness: if a.md -> b, then b -> a if not already
for (const [k, v] of Object.entries({ ...map })) {
  if (!map[v]) map[v] = k
}

fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, JSON.stringify(map, null, 2) + '\n')
console.log(
  `[generate-blog-map] ${Object.keys(map).length} entradas → ${path.relative(root, outPath)}`
)
if (Object.keys(map).length) console.log(map)

const taxonomyOut = Object.fromEntries(
  Object.entries(taxonomy).map(([lang, sets]) => [
    lang,
    { tags: [...sets.tags].sort(), categories: [...sets.categories].sort() },
  ])
)
const taxonomyPath = path.join(path.dirname(outPath), 'taxonomyMap.json')
fs.writeFileSync(taxonomyPath, JSON.stringify(taxonomyOut, null, 2) + '\n')
console.log(
  `[generate-blog-map] taxonomías → ${path.relative(root, taxonomyPath)} ` +
    `(es:${taxonomyOut.es.tags.length}t/${taxonomyOut.es.categories.length}c en:${taxonomyOut.en.tags.length}t/${taxonomyOut.en.categories.length}c)`
)

const datesPath = path.join(path.dirname(outPath), 'postDates.json')
fs.writeFileSync(datesPath, JSON.stringify(postDates, null, 2) + '\n')
console.log(
  `[generate-blog-map] ${Object.keys(postDates).length} fechas → ${path.relative(root, datesPath)}`
)
