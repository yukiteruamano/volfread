import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const source = process.env.EC_SOURCE || '/home/yukiteru/GIT/EclipseCalculator'
if (!fs.existsSync(source)) {
  console.log(`[eclipsescope] EC_SOURCE not found at ${source}, keeping placeholder dist`)
  process.exit(0)
}
console.log(`[eclipsescope] Building real project from ${source} with base /proyectos/eclipsescope/app/`)
try {
  // tsc -b mirrors the source's build script (tsc -b && vite build); --base overrides vite.config which has no base
  execSync(`npx tsc -b`, { cwd: source, stdio: 'inherit', env: { ...process.env } })
  execSync(`npx vite build --base=/proyectos/eclipsescope/app/`, { cwd: source, stdio: 'inherit', env: { ...process.env } })
  const srcDist = path.join(source, 'dist')
  const dstDist = path.join(import.meta.dirname, 'dist')
  fs.rmSync(dstDist, { recursive: true, force: true })
  fs.cpSync(srcDist, dstDist, { recursive: true })
  console.log(`[eclipsescope] Copied ${srcDist} -> ${dstDist}`)
} catch (e) {
  console.error(e); process.exit(1)
}
