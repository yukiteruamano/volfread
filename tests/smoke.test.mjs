// tests/smoke.test.mjs — humo sin red del repo volfread.xyz.
// Fixtures en tmp + VOLFREAD_ROOT: nunca toca el árbol real (solo lectura).
// Ejecutar: `node --test tests/` o `pnpm test`.
// Alcance: scripts de build, datos del portafolio y headers de seguridad.
// Fuera de alcance (requieren red/entorno): astro check/build, collect-project-stats
// en vivo (GitHub API) — cubiertos por `make ci` en CI con GH_TOKEN.
import { describe, it, before } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const REPO = path.resolve(import.meta.dirname, '..')
const SCRIPTS = path.join(REPO, 'scripts')

function tmpRoot(name) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `volfread-${name}-`))
  return dir
}

function runScript(file, root) {
  execFileSync(process.execPath, [path.join(SCRIPTS, file)], {
    env: { ...process.env, VOLFREAD_ROOT: root },
    stdio: 'pipe',
  })
}

function writeFile(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, content)
}

describe('portafolio: proyectos.json', () => {
  let projects
  before(() => {
    projects = JSON.parse(
      fs.readFileSync(path.join(REPO, 'packages/main/src/data/proyectos.json'), 'utf8')
    )
  })

  it('tiene slugs únicos', () => {
    const slugs = projects.map((p) => p.slug)
    assert.equal(new Set(slugs).size, slugs.length, 'slugs duplicados')
    assert.ok(slugs.length > 0)
  })

  it('cada ficha trae campos obligatorios + pares bilingües', () => {
    for (const p of projects) {
      assert.ok(p.slug && p.title && p.description, `campos base en ${p.slug}`)
      assert.ok(['web', 'lib', 'cli'].includes(p.type), `type válido en ${p.slug}`)
      assert.ok(p.lang && Array.isArray(p.stack), `lang/stack en ${p.slug}`)
      assert.ok(/^https:\/\//.test(p.repo), `repo https en ${p.slug}`)
      assert.equal(typeof p.featured, 'boolean', `featured booleano en ${p.slug}`)
      for (const base of ['description', 'divulgativa', 'tecnica', 'highlights']) {
        const en = `${base}En`
        if (p[base] !== undefined) assert.ok(p[en], `${en} falta en ${p.slug}`)
      }
    }
  })

  it('PROJECTS de collect-project-stats cubre slugs del portafolio', () => {
    const src = fs.readFileSync(path.join(SCRIPTS, 'collect-project-stats.mjs'), 'utf8')
    const inScript = new Set([...src.matchAll(/slug:\s*'([^']+)'/g)].map((m) => m[1]))
    const inData = new Set(projects.map((p) => p.slug))
    for (const slug of inScript) {
      assert.ok(inData.has(slug), `slug ${slug} del script sin ficha en proyectos.json`)
    }
  })
})

describe('scripts con fixtures (VOLFREAD_ROOT)', () => {
  it('copy-dist fusiona main + webs e inyecta hreflang', () => {
    const root = tmpRoot('copydist')
    writeFile(
      path.join(root, 'packages/main/dist/index.html'),
      '<html><head></head><body>main</body></html>'
    )
    writeFile(
      path.join(root, 'packages/eclipsescope/dist/index.html'),
      '<html><head><title>x</title></head><body>app</body></html>'
    )
    // simulador-blockchain ausente a propósito: debe avisar y seguir
    runScript('copy-dist.mjs', root)
    const outIndex = fs.readFileSync(path.join(root, 'dist/index.html'), 'utf8')
    assert.match(outIndex, /main/)
    const appIndex = fs.readFileSync(
      path.join(root, 'dist/proyectos/eclipsescope/app/index.html'),
      'utf8'
    )
    assert.match(appIndex, /hreflang="es"/)
    assert.match(appIndex, /hreflang="x-default"/)
    assert.ok(!fs.existsSync(path.join(root, 'dist/proyectos/simulador-blockchain')))
  })

  it('generate-csp hashea inline scripts en public y dist', () => {
    const root = tmpRoot('csp')
    const headers =
      "/*\n  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'\n"
    writeFile(path.join(root, 'packages/main/public/_headers'), headers)
    writeFile(path.join(root, 'packages/main/dist/_headers'), headers)
    writeFile(
      path.join(root, 'packages/main/dist/a.html'),
      '<html><head><script>console.log(1)</script><script src="/x.js"></script></head></html>'
    )
    runScript('generate-csp.mjs', root)
    for (const h of ['packages/main/public/_headers', 'packages/main/dist/_headers']) {
      const text = fs.readFileSync(path.join(root, h), 'utf8')
      assert.match(text, /script-src[^;]*'sha256-[A-Za-z0-9+/=]+'/)
    }
  })

  it('generate-blog-map enlaza translationKey en ambos sentidos', () => {
    const root = tmpRoot('blogmap')
    writeFile(
      path.join(root, 'packages/main/src/content/blog/es/mi-post/index.md'),
      '---\ntitle: A\ntranslationKey: my-post\n---\n\nHola\n'
    )
    writeFile(
      path.join(root, 'packages/main/src/content/blog/en/my-post/index.md'),
      '---\ntitle: B\ntranslationKey: mi-post\n---\n\nHi\n'
    )
    runScript('generate-blog-map.mjs', root)
    const map = JSON.parse(
      fs.readFileSync(path.join(root, 'packages/main/src/i18n/blogMap.json'), 'utf8')
    )
    assert.equal(map['mi-post'], 'my-post')
    assert.equal(map['my-post'], 'mi-post')
  })

  it('todos los scripts pasan node --check', () => {
    for (const f of fs.readdirSync(SCRIPTS).filter((f) => f.endsWith('.mjs'))) {
      execFileSync(process.execPath, ['--check', path.join(SCRIPTS, f)], { stdio: 'pipe' })
    }
  })
})

describe('stats-cache: timestamping', () => {
  let cache
  before(async () => {
    cache = await import('../scripts/stats-cache.mjs')
  })

  const base = {
    now: new Date('2026-10-02T12:00:00.000Z'),
    stamp: null,
    statsExists: true,
    sourceHash: 'sha256:abc',
    slugs: ['a', 'b'],
    ttlDays: 7,
    force: false,
  }
  const freshStamp = {
    generatedAt: '2026-10-01T12:00:00.000Z',
    ttlDays: 7,
    sourceHash: 'sha256:abc',
    slugs: ['b', 'a'],
  }

  it('reutiliza con stamp vigente', () => {
    const v = cache.shouldReuse({ ...base, stamp: freshStamp })
    assert.equal(v.reuse, true)
  })

  it('regenera con --force aunque esté vigente', () => {
    const v = cache.shouldReuse({ ...base, stamp: freshStamp, force: true })
    assert.equal(v.reuse, false)
  })

  it('regenera si expiró el TTL', () => {
    const v = cache.shouldReuse({
      ...base,
      stamp: { ...freshStamp, generatedAt: '2026-09-20T12:00:00.000Z' },
    })
    assert.equal(v.reuse, false)
  })

  it('regenera si cambió proyectos.json o los slugs', () => {
    assert.equal(
      cache.shouldReuse({ ...base, stamp: freshStamp, sourceHash: 'sha256:zzz' }).reuse,
      false
    )
    assert.equal(
      cache.shouldReuse({ ...base, stamp: { ...freshStamp, slugs: ['a', 'b', 'c'] } }).reuse,
      false
    )
  })

  it('regenera sin stamp, sin stats o con stamp corrupto', () => {
    assert.equal(cache.shouldReuse({ ...base, stamp: null }).reuse, false)
    assert.equal(cache.shouldReuse({ ...base, stamp: freshStamp, statsExists: false }).reuse, false)
    assert.equal(cache.shouldReuse({ ...base, stamp: { basura: 1 } }).reuse, false)
    assert.equal(cache.readStampText('no-json{{{'), null)
    assert.equal(cache.readStampText('{"generatedAt":123}'), null)
  })

  it('sourceHash es estable y buildStamp ordena slugs', () => {
    assert.equal(cache.sourceHashOf('x'), cache.sourceHashOf('x'))
    assert.notEqual(cache.sourceHashOf('x'), cache.sourceHashOf('y'))
    const s = cache.buildStamp({
      now: base.now,
      sourceHash: 'sha256:abc',
      slugs: ['b', 'a'],
      ttlDays: 7,
    })
    assert.deepEqual(s.slugs, ['a', 'b'])
    assert.equal(s.generatedAt, '2026-10-02T12:00:00.000Z')
  })
})

describe('seguridad: _headers', () => {
  let headers
  before(() => {
    headers = fs.readFileSync(path.join(REPO, 'packages/main/public/_headers'), 'utf8')
  })

  it('script-src sin unsafe-inline ni blob:', () => {
    const m = headers.match(/script-src[^;]*;/)
    assert.ok(m, 'hay script-src')
    assert.doesNotMatch(m[0], /unsafe-inline/)
  })

  it('HSTS sin preload e img-src sin blob:', () => {
    const hsts = headers.match(/Strict-Transport-Security:[^\n]*/)
    assert.ok(hsts && /max-age=31536000; includeSubDomains/.test(hsts[0]), 'hay HSTS')
    assert.doesNotMatch(hsts[0], /preload/)
    const img = headers.match(/img-src[^;]*;/)
    assert.ok(img && !/blob:/.test(img[0]), 'img-src sin blob:')
  })
})
