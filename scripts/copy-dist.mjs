import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const out = path.join(root, 'dist')
const mainDist = path.join(root, 'packages/main/dist')

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

console.log('[copy-dist] Done. Output:', out)
console.log('[copy-dist] Verify: ls dist/')
try {
  console.log(fs.readdirSync(out))
} catch {}
