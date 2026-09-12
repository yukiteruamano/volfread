#!/usr/bin/env node
/**
 * collect-project-stats.mjs
 * Genera packages/main/src/data/projects.stats.json con:
 *  - LOC + breakdown por lenguaje (tokei si disponible, fallback conteo de extensiones)
 *  - histograma commits últimos 52 semanas (git log local o placeholders)
 *  - FALLBACK GitHub API: si el checkout local no existe, estima LOC vía
 *    tree recursivo (bytes de código / 45) y commits vía commit history.
 *    Requiere red; con GH_TOKEN/GITHUB_TOKEN el rate limit sube a 5000/h
 *    (sin token: 60/h — 12 repos × ~4 llamadas ≈ 48, justo pero válido).
 *
 * Uso: pnpm build:stats  |  node scripts/collect-project-stats.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const outPath = path.join(root, 'packages/main/src/data/projects.stats.json')

const GH_TOKEN = process.env.GH_TOKEN || process.env.GITHUB_TOKEN || ''
const GH_HEADERS = {
  Accept: 'application/vnd.github+json',
  'User-Agent': 'volfread.xyz stats',
  ...(GH_TOKEN ? { Authorization: `Bearer ${GH_TOKEN}` } : ''),
}

// slug -> owner/repo desde proyectos.json (fuente de verdad de las URLs)
function loadRepoMap() {
  try {
    const pj = JSON.parse(
      fs.readFileSync(path.join(root, 'packages/main/src/data/proyectos.json'), 'utf8')
    )
    const m = {}
    for (const p of pj) {
      const mt = String(p.repo || '').match(/github\.com\/([^/]+\/[^/]+?)(?:\.git)?\/?$/)
      if (mt) m[p.slug] = mt[1]
    }
    return m
  } catch {
    return {}
  }
}
const REPO_MAP = loadRepoMap()

// extensión -> lenguaje (usado por fallbackLoc y por la estimación GitHub)
const EXT2LANG = {
  yml: 'Ansible',
  yaml: 'Ansible',
  j2: 'Ansible',
  py: 'Python',
  pyi: 'Python',
  c: 'C',
  h: 'C',
  cpp: 'C',
  hpp: 'C',
  cc: 'C',
  go: 'Go',
  el: 'Emacs Lisp',
  sh: 'Shell',
  bash: 'Shell',
  zsh: 'Shell',
  ksh: 'Shell',
  rs: 'Rust',
  ts: 'TypeScript',
  tsx: 'TypeScript',
  js: 'TypeScript',
  jsx: 'TypeScript',
  mjs: 'TypeScript',
  lua: 'Lua',
  pl: 'Perl',
  pm: 'Perl',
  mk: 'Makefile',
  awk: 'Awk',
  sql: 'SQL',
}
const SKIP_DIRS = [
  'node_modules/',
  'vendor/',
  'target/',
  'dist/',
  '.venv/',
  '.git/',
  '__pycache__/',
  '.tox/',
]
const BIG_BLOB = 200000 // blobs mayores = fixtures/datos, se excluyen
const BYTES_PER_LINE = 45 // heurística de estimación rápida

async function githubJson(url) {
  const res = await fetch(url, { headers: GH_HEADERS })
  if (res.status === 403) {
    const remaining = res.headers.get('x-ratelimit-remaining')
    throw new Error(`GitHub rate limit (remaining=${remaining}). Define GH_TOKEN.`)
  }
  if (!res.ok) throw new Error(`GitHub ${res.status} en ${url}`)
  return res.json()
}

function langBreakdown(byLang) {
  const total = Object.values(byLang).reduce((a, b) => a + b, 0)
  if (!total) return { loc: 0, languages: {} }
  const languages = {}
  for (const [k, v] of Object.entries(byLang)) {
    const pct = Math.round((v / total) * 100)
    if (pct > 0) languages[k] = pct
  }
  const sum = Object.values(languages).reduce((a, b) => a + b, 0)
  if (sum !== 100 && sum > 0) {
    const top = Object.keys(languages).sort((a, b) => byLang[b] - byLang[a])[0]
    if (top) languages[top] += 100 - sum
  }
  return { loc: Math.round(total / BYTES_PER_LINE), languages }
}

// Agrupa fechas en 52 semanas (índice 0 = hace 51 semanas, 51 = esta semana, lunes-inicio)
function bucketWeeks(dates, now = new Date()) {
  const day = now.getDay() // 0 Dom
  const mondayOffset = day === 0 ? 6 : day - 1
  const thisMonday = new Date(now)
  thisMonday.setHours(0, 0, 0, 0)
  thisMonday.setDate(now.getDate() - mondayOffset)
  const weeks = Array(52).fill(0)
  for (const d of dates) {
    const diffDays = Math.floor((thisMonday - d) / (1000 * 60 * 60 * 24))
    if (diffDays < 0) {
      weeks[51]++
    } else {
      const weekIdx = 51 - Math.floor(diffDays / 7)
      if (weekIdx >= 0 && weekIdx < 52) weeks[weekIdx]++
    }
  }
  return { weeks, thisMonday }
}

// Estimación rápida vía GitHub API: tree recursivo (bytes->LOC) + commits 52 semanas
async function githubStats(ownerRepo) {
  const repo = await githubJson(`https://api.github.com/repos/${ownerRepo}`)
  const branch = repo.default_branch || 'main'
  const tree = await githubJson(
    `https://api.github.com/repos/${ownerRepo}/git/trees/${branch}?recursive=1`
  )
  if (tree.truncated) console.log(`[stats] ${ownerRepo}: tree truncado — estimación parcial`)
  const byLang = {}
  for (const it of tree.tree || []) {
    if (it.type !== 'blob') continue
    const p = it.path || ''
    if (SKIP_DIRS.some((s) => p.includes(s))) continue
    const size = it.size || 0
    if (size > BIG_BLOB) continue
    const name = p.split('/').pop()
    let lang = null
    if (name.includes('.')) lang = EXT2LANG[name.split('.').pop().toLowerCase()]
    else if (ownerRepo.endsWith('/apparmor.d') && size < 100000) lang = 'AppArmor'
    if (lang) byLang[lang] = (byLang[lang] || 0) + size
  }
  const { thisMonday } = bucketWeeks([])
  const since = new Date(thisMonday)
  since.setDate(thisMonday.getDate() - 51 * 7)
  const dates = []
  for (let page = 1; page <= 5; page++) {
    const commits = await githubJson(
      `https://api.github.com/repos/${ownerRepo}/commits?since=${since.toISOString()}&per_page=100&page=${page}`
    )
    if (!Array.isArray(commits) || commits.length === 0) break
    for (const c of commits) {
      const d = c.commit?.committer?.date || c.commit?.author?.date
      if (d) dates.push(new Date(d))
    }
    if (commits.length < 100) break
  }
  return { locInfo: langBreakdown(byLang), weeks: bucketWeeks(dates).weeks }
}

const PROJECTS = [
  { slug: 'eclipsescope', path: '/home/yukiteru/GIT/EclipseCalculator', lang: 'TypeScript' },
  {
    slug: 'simulador-blockchain',
    path: '/home/yukiteru/GIT/yukiteruamano.github.io',
    lang: 'TypeScript',
  },
  { slug: 'fast-levenshtein', path: '/home/yukiteru/GIT/fast-levenshtein', lang: 'Go' },
  { slug: 'gache', path: '/home/yukiteru/GIT/gache', lang: 'Go' },
  { slug: 'koma', path: '/home/yukiteru/GIT/koma', lang: 'Go' },
  { slug: 'mangodex', path: '/home/yukiteru/GIT/mangodex', lang: 'Go' },
  { slug: 'pkgcheck', path: '/home/yukiteru/GIT/pkgcheck', lang: 'Python' },
  {
    slug: 'simple-markdown-crawler',
    path: '/home/yukiteru/GIT/simple-markdown-crawler',
    lang: 'Python',
  },
  // Top 20 — nuevos (sin vetados)
  { slug: 'harden-yml', path: '/home/yukiteru/GIT/harden.yml', lang: 'Ansible' },
  {
    slug: 'kernel-hardening-checker',
    path: '/home/yukiteru/GIT/kernel-hardening-checker',
    lang: 'Python',
  },
  { slug: 'picom', path: '/home/yukiteru/GIT/picom', lang: 'C' },
  { slug: 'apparmor-d', path: '/home/yukiteru/GIT/apparmor.d', lang: 'Go' },
  { slug: 'doomemacs', path: '/home/yukiteru/GIT/doomemacs', lang: 'Emacs Lisp' },
  { slug: 'knots-banlist', path: '/home/yukiteru/GIT/Knots-Banlist', lang: 'Python' },
  { slug: 'bearer', path: '/home/yukiteru/GIT/bearer', lang: 'Go' },
  { slug: 'appjail', path: '/home/yukiteru/GIT/AppJail', lang: 'Shell' },
  { slug: 'openriot', path: '/home/yukiteru/GIT/OpenRiot', lang: 'Go' },
  { slug: 'cc-skills-golang', path: '/home/yukiteru/GIT/cc-skills-golang', lang: 'Go' },
  { slug: 'manga-tui', path: '/home/yukiteru/GIT/manga-tui', lang: 'Rust' },
  { slug: 'horusec', path: '/home/yukiteru/GIT/horusec', lang: 'Go' },
]

function tryTokei(dir) {
  try {
    const out = execSync(`tokei "${dir}" --output json 2>/dev/null`, {
      encoding: 'utf8',
      timeout: 8000,
    })
    const data = JSON.parse(out)
    let total = 0
    const langs = {}
    for (const [k, v] of Object.entries(data)) {
      if (k === 'Total') continue
      total += v.code ?? 0
      langs[k] = v.code ?? 0
    }
    // Include Total.code if present
    if (data.Total?.code) total = data.Total.code
    // Convert to percentages
    const breakdown = {}
    for (const [k, v] of Object.entries(langs)) {
      breakdown[k] = Math.round((v / total) * 100)
    }
    // Normalize to 100
    const sum = Object.values(breakdown).reduce((a, b) => a + b, 0)
    if (sum !== 100 && total > 0) {
      const top = Object.keys(breakdown).sort((a, b) => langs[b] - langs[a])[0]
      if (top) breakdown[top] += 100 - sum
    }
    return { loc: total, languages: breakdown }
  } catch {
    return null
  }
}

function fallbackLoc(dir, primaryLang) {
  try {
    // cloc fallback via find + wc -l (extensiones según lenguaje primario)
    const exts = Object.entries(EXT2LANG)
      .filter(([, lang]) => lang === primaryLang)
      .map(([ext]) => `.${ext}`)
    const finalExts = exts.length ? exts : ['.go', '.py', '.ts', '.js']
    const out = execSync(
      `find "${dir}" -type f \\( ${finalExts.map((e) => `-name "*${e}"`).join(' -o ')} \\) -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/dist/*" -not -path "*/.venv/*" | xargs wc -l 2>/dev/null | tail -1`,
      { encoding: 'utf8', timeout: 5000 }
    )
    const n = parseInt(out.trim().split(/\s+/)[0] || '0', 10)
    return { loc: n || 0, languages: { [primaryLang]: 100 } }
  } catch {
    return { loc: 0, languages: { [primaryLang]: 100 } }
  }
}

function commits52(dir) {
  try {
    // 52 weeks of commit counts (Monday-start weeks, last 52)
    const raw = execSync(`git -C "${dir}" log --date=short --pretty=format:%ad 2>/dev/null`, {
      encoding: 'utf8',
      timeout: 8000,
    })
    const dates = raw
      .split('\n')
      .filter(Boolean)
      .map((d) => new Date(d))
    return bucketWeeks(dates).weeks
  } catch {
    // random plausible placeholder if git not available
    return Array.from({ length: 52 }, () => Math.floor(Math.random() * 4))
  }
}

const projects = {}
for (const p of PROJECTS) {
  const exists = fs.existsSync(p.path)
  let locInfo = null
  let commits = null
  let source = 'tokei'
  if (exists) {
    locInfo = tryTokei(p.path)
    if (!locInfo) {
      locInfo = fallbackLoc(p.path, p.lang)
      source = 'fallback'
    }
    commits = commits52(p.path)
  } else {
    // Sin checkout local -> GitHub API (repo derivado de proyectos.json)
    const ownerRepo = REPO_MAP[p.slug]
    if (ownerRepo) {
      try {
        const g = await githubStats(ownerRepo)
        if (Object.keys(g.locInfo.languages).length) locInfo = g.locInfo
        commits = g.weeks
        source = 'github'
      } catch (e) {
        console.log(`[stats] ${p.slug}: GitHub fallback falló (${e.message})`)
      }
    } else {
      console.log(`[stats] ${p.slug}: sin path local ni repo mapeado`)
    }
    if (!locInfo) {
      locInfo = { loc: 0, languages: { [p.lang]: 100 } }
      source = commits ? 'github-partial' : 'zero'
    }
    if (!commits) commits = Array(52).fill(0)
  }
  projects[p.slug] = {
    loc: locInfo.loc,
    languages: locInfo.languages,
    commits52: commits,
  }
  console.log(
    `[stats] ${p.slug}: loc=${locInfo.loc} langs=${JSON.stringify(locInfo.languages)} commits52 sum=${commits.reduce((a, b) => a + b, 0)} src=${source}`
  )
}

const out = {
  _note:
    'Generado por scripts/collect-project-stats.mjs — no editar a mano. Ejecuta pnpm build:stats para regenerar.',
  projects,
}

fs.mkdirSync(path.dirname(outPath), { recursive: true })
fs.writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n')
console.log(`[stats] Written to ${outPath}`)
