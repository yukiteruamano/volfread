// stats-cache.mjs — lógica pura del cache de projects.stats.json (sin red ni I/O).
// `collect-project-stats.mjs` la usa al arrancar; los tests la ejercitan aquí.
// Regla: reutilizar stats si hay stamp válido, hash de proyectos.json intacto,
// mismos slugs y edad <= ttlDays. `--force` (o force:true) siempre regenera.
import crypto from 'node:crypto'

export function sourceHashOf(proyectosJsonText) {
  return 'sha256:' + crypto.createHash('sha256').update(proyectosJsonText, 'utf8').digest('hex')
}

export function readStampText(text) {
  try {
    const stamp = JSON.parse(text)
    if (!stamp || typeof stamp !== 'object') return null
    if (typeof stamp.generatedAt !== 'string') return null
    if (!Array.isArray(stamp.slugs)) return null
    return stamp
  } catch {
    return null
  }
}

function sameSlugs(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false
  const sortedA = [...a].sort()
  const sortedB = [...b].sort()
  return sortedA.every((s, i) => s === sortedB[i])
}

export function shouldReuse({ now, stamp, statsExists, sourceHash, slugs, ttlDays, force }) {
  if (force) return { reuse: false, reason: 'force' }
  if (!stamp) return { reuse: false, reason: 'sin stamp' }
  if (!statsExists) return { reuse: false, reason: 'sin stats' }
  if (stamp.sourceHash !== sourceHash) return { reuse: false, reason: 'proyectos.json cambió' }
  if (!sameSlugs(stamp.slugs, slugs)) return { reuse: false, reason: 'slugs cambiaron' }
  const ageMs = now instanceof Date ? now.getTime() - new Date(stamp.generatedAt).getTime() : NaN
  if (!Number.isFinite(ageMs) || ageMs < 0) return { reuse: false, reason: 'stamp inválido' }
  const ageDays = ageMs / 86400000
  const ttl = Number(ttlDays)
  if (!Number.isFinite(ttl) || ttl < 0) return { reuse: false, reason: 'ttl inválido' }
  if (ageDays > ttl) return { reuse: false, reason: `expirado (${ageDays.toFixed(1)}d > ${ttl}d)` }
  return { reuse: true, reason: `vigente (${ageDays.toFixed(1)}d/${ttl}d)` }
}

export function buildStamp({ now, sourceHash, slugs, ttlDays }) {
  return {
    generatedAt: (now instanceof Date ? now : new Date()).toISOString(),
    ttlDays,
    sourceHash,
    slugs: [...slugs].sort(),
  }
}
