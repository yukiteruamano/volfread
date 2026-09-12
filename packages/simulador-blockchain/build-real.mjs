import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'
const source = process.env.SB_SOURCE || '/home/yukiteru/GIT/yukiteruamano.github.io'
if (!fs.existsSync(source)) {
  console.log(`[simulador-blockchain] SB_SOURCE not found at ${source}, keeping placeholder`)
  process.exit(0)
}
console.log(`[simulador-blockchain] Building real Angular project from ${source}`)
try {
  execSync(`npx ng build --base-href /proyectos/simulador-blockchain/app/ --output-path dist`, { cwd: source, stdio: 'inherit' })
  const srcDist = path.join(source, 'dist')
  // Angular v19 application builder outputs to dist/browser or dist/<project>/browser (and legacy docs/ if outputPath not overridden)
  let candidates = [path.join(srcDist, 'browser'), path.join(srcDist, 'simulador-blockchain', 'browser'), srcDist, path.join(source, 'docs', 'browser'), path.join(source, 'docs')]
  let src = candidates.find(p => fs.existsSync(path.join(p, 'index.html')))
  if (!src) throw new Error('No index.html found in Angular dist candidates: ' + candidates.join(', '))
  const dst = path.join(import.meta.dirname, 'dist')
  fs.rmSync(dst, { recursive: true, force: true })
  fs.cpSync(src, dst, { recursive: true })
  console.log(`[simulador-blockchain] Copied ${src} -> ${dst}`)
} catch (e) { console.error(e); process.exit(1) }
