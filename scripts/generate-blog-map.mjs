#!/usr/bin/env node
// scripts/generate-blog-map.mjs — genera src/i18n/blogMap.json dinámico desde translationKey
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const contentRoot = path.join(root, 'packages/main/src/content/blog')
const outPath = path.join(root, 'packages/main/src/i18n/blogMap.json')

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

for (const file of files) {
  const rel = path.relative(contentRoot, file) // es/primeros-pasos/index.md
  const slug = rel.replace(/\/index\.mdx?$/, '').replace(/\.mdx?$/, '') // es/primeros-pasos
  const data = parseFrontmatter(file)
  if (!data.translationKey) continue
  const key = slug.replace(/^(es|en)\//, '')
  const target = data.translationKey.trim()
  // map is bidirectional: current slug -> target, and we will also ensure reverse when processing target file
  if (key && target) {
    map[key] = target
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
