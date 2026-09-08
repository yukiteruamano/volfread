// generate-csp.mjs - hashes CSP para scripts inline (ClientRouter + JSON-LD + 404)
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const publicHeaders = path.join(root, 'packages/main/public/_headers')
const distHeaders = path.join(root, 'packages/main/dist/_headers')
const distRoot = path.join(root, 'packages/main/dist')

function collectHtmlFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name)
    if (entry.isDirectory()) collectHtmlFiles(p, out)
    else if (entry.isFile() && entry.name.endsWith('.html')) out.push(p)
  }
  return out
}

if (!fs.existsSync(distRoot)) {
  console.error(`[generate-csp] dist not found at ${distRoot} - run pnpm --filter main build first`)
  process.exit(1)
}

const htmlFiles = collectHtmlFiles(distRoot)
const hashes = new Set()
const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi

let inlineCount = 0
for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8')
  let m
  while ((m = re.exec(html)) !== null) {
    const body = m[1]
    if (!body || !body.trim()) continue
    inlineCount++
    const hash = crypto.createHash('sha256').update(body).digest('base64')
    hashes.add(`'sha256-${hash}'`)
  }
}

if (hashes.size === 0) {
  console.warn('[generate-csp] WARN: no inline scripts found - check dist html')
}

const sortedHashes = [...hashes].sort()
const scriptSrcValue = `script-src 'self' https://giscus.app https://static.cloudflareinsights.com ${sortedHashes.join(' ')}`

console.log(`[generate-csp] Found ${htmlFiles.length} html files, ${inlineCount} inline script (dedup ${hashes.size} hashes)`)

function patchHeaders(filePath) {
  if (!fs.existsSync(filePath)) {
    console.warn(`[generate-csp] skip missing ${filePath}`)
    return false
  }
  let text = fs.readFileSync(filePath, 'utf8')
  const cspRe = /^\s*Content-Security-Policy:\s*default-src[^;]*;.*?script-src[^;]*;/m
  if (!cspRe.test(text)) {
    console.error(`[generate-csp] CSP line not found in ${filePath}`)
    return false
  }
  text = text.replace(/script-src[^;]*;/, `${scriptSrcValue};`)
  fs.writeFileSync(filePath, text)
  console.log(`[generate-csp] Patched ${path.relative(root, filePath)} (${hashes.size} hashes)`)
  return true
}

const patchedPublic = patchHeaders(publicHeaders)
const patchedDist = patchHeaders(distHeaders)

if (hashes.size > 60) {
  console.warn(`[generate-csp] WARN: ${hashes.size} hashes -> header ~${(scriptSrcValue.length / 1024).toFixed(1)} KiB. Cloudflare header limit ~8KB. Consider externalizing JSON-LD if it grows.`)
}

console.log(`[generate-csp] script-src length ${(scriptSrcValue.length / 1024).toFixed(2)} KiB`)
if (!patchedPublic && !patchedDist) process.exit(1)
