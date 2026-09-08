import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const out = path.join(root, 'dist')
const mainDist = path.join(root, 'packages/main/dist')

const WEB_PACKAGES = ['eclipsescope', 'simulador-blockchain']

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true })
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name)
    const d = path.join(dst, entry.name)
    if (entry.isDirectory()) copyDir(s, d)
    else fs.copyFileSync(s, d)
  }
}

if (!fs.existsSync(mainDist)) {
  console.error(`[copy-dist] main dist not found at ${mainDist}. Run pnpm build:main first.`)
  process.exit(1)
}

console.log(`[copy-dist] Cleaning ${out}`)
fs.rmSync(out, { recursive: true, force: true })

console.log(`[copy-dist] Copying main dist → ${out}`)
copyDir(mainDist, out)

for (const pkg of WEB_PACKAGES) {
  const src = path.join(root, 'packages', pkg, 'dist')
  if (!fs.existsSync(src)) {
    console.warn(`[copy-dist] WARN: ${pkg} dist not found at ${src} — skipping (run pnpm --filter ${pkg} build)`)
    continue
  }
  const dst = path.join(out, 'proyectos', pkg, 'app')
  console.log(`[copy-dist] Copying ${pkg} dist → ${dst}`)
  copyDir(src, dst)
  // Hreflang ES inyección — garantiza TBT/Lighthouse hreflang válido incluso con builds reales externos
  const appHtml = path.join(dst, 'index.html')
  if (fs.existsSync(appHtml)) {
    let html = fs.readFileSync(appHtml, 'utf8')
    if (!html.includes('hreflang=')) {
      const canonical = `https://volfread.xyz/proyectos/${pkg}/app/`
      const inject = `    <link rel="canonical" href="${canonical}" />\n    <link rel="alternate" hreflang="es" href="${canonical}" />\n    <link rel="alternate" hreflang="x-default" href="${canonical}" />\n`
      if (html.includes('</title>')) html = html.replace('</title>', `</title>\n${inject.trimEnd()}`)
      else if (html.includes('</head>')) html = html.replace('</head>', `${inject}  </head>`)
      else html = inject + html
      fs.writeFileSync(appHtml, html)
      console.log(`[copy-dist] Injected hreflang es/x-default into ${pkg}/app/index.html`)
    }
  }
}

console.log('[copy-dist] Done. Output:', out)
console.log('[copy-dist] Verify: ls dist/proyectos/')
try {
  console.log(fs.readdirSync(path.join(out, 'proyectos')))
} catch {}
