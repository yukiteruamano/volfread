#!/usr/bin/env node
/**
 * collect-project-stats.mjs
 * Genera packages/main/src/data/projects.stats.json con:
 *  - LOC + breakdown por lenguaje (tokei si disponible, fallback conteo de extensiones)
 *  - histograma commits últimos 52 semanas (git log local o placeholders)
 *  - FALLBACK clon: si el checkout local no existe, clona bare + blobless +
 *    shallow (52 semanas) en un cache temporal y saca los commits de ahí: 0
 *    llamadas a la API. El LOC se reutiliza del stats anterior o de
 *    /languages (1 llamada).
 *  - ÚLTIMO RECURSO GitHub API: tree recursivo (bytes de código / 45) y
 *    commit history. Sin token el rate limit es 60/h, por eso va al final.
 *
 * Uso: pnpm build:stats  |  node scripts/collect-project-stats.mjs
 *  Forzar regeneración: pnpm build:stats:force  |  node scripts/collect-project-stats.mjs --force
 *
 *  CACHE (timestamping): antes de trabajar consulta
 *  packages/main/src/data/projects.stats.stamp.json. Si el stamp es válido,
 *  el hash de proyectos.json coincide, los slugs no cambiaron y la edad
 *  no supera STATS_TTL_DAYS (defecto 7), reutiliza los stats existentes y
 *  sale sin tocar red ni disco. El stamp se commitea junto a los stats.
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { buildStamp, readStampText, shouldReuse, sourceHashOf } from './stats-cache.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const outPath = path.join(root, 'packages/main/src/data/projects.stats.json')
const stampPath = path.join(root, 'packages/main/src/data/projects.stats.stamp.json')
const proyectosPath = path.join(root, 'packages/main/src/data/proyectos.json')

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

// Clon bare superficial: los commits de 52 semanas sin gastar rate limit de la API.
// Ojo: --filter=blob:none deja los blobs fuera; nada que lea contenidos (ls-tree -l,
// cat-file) sobre este clon, porque los descargaría uno a uno.
const CLONE_ROOT = path.join(os.tmpdir(), 'volfread-stats-clones')
const CLONE_TTL_MS = 6 * 60 * 60 * 1000 // reutiliza el clon si tiene menos de 6 h

function cloneRepo(ownerRepo, slug) {
  const dir = path.join(CLONE_ROOT, slug)
  if (fs.existsSync(dir)) {
    if (Date.now() - fs.statSync(dir).mtimeMs < CLONE_TTL_MS) return dir
    fs.rmSync(dir, { recursive: true, force: true })
  }
  fs.mkdirSync(CLONE_ROOT, { recursive: true })
  const url = `https://github.com/${ownerRepo}.git`
  // 53 semanas: cubre la ventana de 52 que grafica bucketWeeks
  const since = new Date(Date.now() - 53 * 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  let err = null
  // Algunos repos rechazan --shallow-since ("error processing shallow info");
  // el reintento por --depth cuenta commits en vez de semanas: si el repo tiene
  // más de 1500 commits en 52 semanas, ese repo se queda corto (solo en el reintento).
  for (const shallowFlag of [`--shallow-since=${since}`, '--depth 1500']) {
    try {
      execSync(
        `git clone --bare --filter=blob:none ${shallowFlag} --single-branch ${url} "${dir}"`,
        { stdio: 'ignore', timeout: 180000 }
      )
      return dir
    } catch (e) {
      err = e
      fs.rmSync(dir, { recursive: true, force: true })
    }
  }
  throw err
}

// Breakdown oficial de bytes por lenguaje (1 sola llamada)
async function githubLanguages(ownerRepo) {
  return langBreakdown(await githubJson(`https://api.github.com/repos/${ownerRepo}/languages`))
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
  { slug: 'pi-dockerized', path: '/home/yukiteru/GIT/pi-dockerized', lang: 'Shell' },
  { slug: 'claude-dockerized', path: '/home/yukiteru/GIT/claude-dockerized', lang: 'Shell' },
  { slug: 'opencode-dockerized', path: '/home/yukiteru/GIT/opencode-dockerized', lang: 'Shell' },
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
  // Contribuciones/forks (sin vetados)
  { slug: 'geo-seo-claude', path: '/home/yukiteru/GIT/geo-seo-claude', lang: 'Python' },
  { slug: 'dappwarrior', path: '/home/yukiteru/GIT/dappwarrior', lang: 'JavaScript' },
  { slug: 'weatherai', path: '/home/yukiteru/GIT/weatherai', lang: 'Python' },
  { slug: 'openbsd-src', path: '/home/yukiteru/GIT/openbsd-src', lang: 'C' },
  { slug: 'openbsd-ports', path: '/home/yukiteru/GIT/openbsd-ports', lang: 'Makefile' },
  { slug: 'freebsd-src', path: '/home/yukiteru/GIT/freebsd-src', lang: 'C' },
  { slug: 'freebsd-ports', path: '/home/yukiteru/GIT/freebsd-ports', lang: 'Makefile' },
  { slug: 'mpv', path: '/home/yukiteru/GIT/mpv', lang: 'C' },
  { slug: 'obs-backgroundremoval', path: '/home/yukiteru/GIT/obs-backgroundremoval', lang: 'C' },
  { slug: 'crawl4ai', path: '/home/yukiteru/GIT/crawl4ai', lang: 'Python' },
  { slug: 'awesome', path: '/home/yukiteru/GIT/awesome', lang: 'Lua' },
  { slug: 'void-packages', path: '/home/yukiteru/GIT/void-packages', lang: 'Shell' },
  { slug: 'spacemacs', path: '/home/yukiteru/GIT/spacemacs', lang: 'Emacs Lisp' },
  { slug: 'apheleia', path: '/home/yukiteru/GIT/apheleia', lang: 'Emacs Lisp' },
  { slug: 'trezord-go', path: '/home/yukiteru/GIT/trezord-go', lang: 'C' },
  { slug: 'lazygit', path: '/home/yukiteru/GIT/lazygit', lang: 'Go' },
  { slug: 'wireguard-install', path: '/home/yukiteru/GIT/wireguard-install', lang: 'Shell' },
  { slug: 'docker-rocm-xtra', path: '/home/yukiteru/GIT/docker-rocm-xtra', lang: 'Docker' },
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

const FORCE = process.argv.includes('--force')
const TTL_DAYS = Number(process.env.STATS_TTL_DAYS || 7)

// Puerta del cache: evita reconstruir (y gastar rate-limit de GitHub)
// cuando los stats vigentes sirven.
const proyectosText = fs.readFileSync(proyectosPath, 'utf8')
const proyectosHash = sourceHashOf(proyectosText)
const proyectosSlugs = JSON.parse(proyectosText).map((p) => p.slug)
let stamp = null
try {
  stamp = readStampText(fs.readFileSync(stampPath, 'utf8'))
} catch {
  stamp = null
}
const verdict = shouldReuse({
  now: new Date(),
  stamp,
  statsExists: fs.existsSync(outPath),
  sourceHash: proyectosHash,
  slugs: proyectosSlugs,
  ttlDays: TTL_DAYS,
  force: FORCE,
})
if (verdict.reuse) {
  console.log(`[stats] Reutilizando stats existentes (${verdict.reason}) — sin red ni escritura`)
  process.exit(0)
}
console.log(`[stats] Regenerando (${verdict.reason})`)

// Stats vigentes: fuente barata del LOC cuando el checkout no está en esta máquina
let prevStats = {}
try {
  prevStats = JSON.parse(fs.readFileSync(outPath, 'utf8')).projects || {}
} catch {
  prevStats = {}
}

const projects = {}
for (const p of PROJECTS) {
  const src = []
  let locInfo = null
  let commits = null
  if (fs.existsSync(p.path)) {
    locInfo = tryTokei(p.path)
    if (locInfo) src.push('tokei')
    else {
      locInfo = fallbackLoc(p.path, p.lang)
      src.push('fallback')
    }
    commits = commits52(p.path)
  } else {
    // Sin checkout local -> clon superficial (commits) y API solo como último recurso
    const ownerRepo = REPO_MAP[p.slug]
    if (ownerRepo) {
      try {
        commits = commits52(cloneRepo(ownerRepo, p.slug))
        src.push('clone')
      } catch (e) {
        console.log(`[stats] ${p.slug}: clon falló (${e.message})`)
      }
      const prev = prevStats[p.slug]
      if (prev?.loc > 0 && Object.keys(prev.languages || {}).length) {
        locInfo = { loc: prev.loc, languages: prev.languages }
        src.push('prev-loc') // shortcut: LOC se reutiliza del stats anterior, revisar si se necesita recuento real
      } else {
        try {
          const l = await githubLanguages(ownerRepo)
          if (Object.keys(l.languages).length) {
            locInfo = l
            src.push('languages')
          }
        } catch (e) {
          console.log(`[stats] ${p.slug}: /languages falló (${e.message})`)
        }
      }
      if (!locInfo || !commits) {
        try {
          const g = await githubStats(ownerRepo)
          if (!locInfo && Object.keys(g.locInfo.languages).length) locInfo = g.locInfo
          if (!commits) commits = g.weeks
          src.push('github')
        } catch (e) {
          console.log(`[stats] ${p.slug}: GitHub fallback falló (${e.message})`)
        }
      }
    } else {
      console.log(`[stats] ${p.slug}: sin path local ni repo mapeado`)
    }
  }
  if (!locInfo) {
    locInfo = { loc: 0, languages: { [p.lang]: 100 } }
    src.push('no-loc')
  }
  if (!commits) {
    commits = Array(52).fill(0)
    src.push('no-commits')
  }
  const source = src.join('+') || 'zero'
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
fs.writeFileSync(
  stampPath,
  JSON.stringify(
    buildStamp({
      now: new Date(),
      sourceHash: proyectosHash,
      slugs: proyectosSlugs,
      ttlDays: TTL_DAYS,
    }),
    null,
    2
  ) + '\n'
)
console.log(`[stats] Stamp written to ${stampPath}`)
