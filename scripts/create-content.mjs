#!/usr/bin/env node
// scripts/create-content.mjs — scaffold bilingüe para blog
// Uso: make create-content  (interactivo)  |  make create-content ES=slug ES=slug EN=slug
import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const blogRoot = path.join(root, 'packages/main/src/content/blog')

function slugify(s) {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function titleFromSlug(slug) {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function parseArgs() {
  const args = process.argv.slice(2)
  const out = {}
  for (const a of args) {
    const m = a.match(/^--?([^=]+)=(.+)$/)
    if (m) out[m[1].toLowerCase()] = m[2]
    const m2 = a.match(/^(es|en)=(.+)$/i)
    if (m2) out[m2[1].toLowerCase()] = m2[2]
  }
  return out
}

async function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => rl.question(question, (ans) => { rl.close(); resolve(ans) }))
}

function buildContent({ esSlug, enSlug }) {
  const iso = new Date().toISOString()
  const es = `---
title: '${titleFromSlug(esSlug)}'
description: 'Descripción breve del artículo en español (150 chars).'
pubDate: ${iso}
lang: es
categories: ['general']
tags: []
cover: './cover.webp'
coverAlt: ''
translationKey: '${enSlug}'
draft: true
math: false
author: 'Jose Maldonado "Yukiteru Amano"'
---

¡Hola, viajero!

Escribe aquí el contenido en Markdown. Cuando añadas imágenes, colócalas en esta carpeta y referéncialas así:

\`\`\`markdown
![alt](./mi-imagen.webp)
\`\`\`

> Coloca tu \`cover.webp\` en esta misma carpeta. Se usará como portada del post.
> Para fórmulas usa \`math: true\` en frontmatter y escribe \`$E=mc^2$\` inline o \`$$\\int$$ \` display.

Ejemplo inline: $E=mc^2$ y display:

$$
\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}
$$
`
  const en = `---
title: '${titleFromSlug(enSlug)}'
description: 'Brief description in English (150 chars).'
pubDate: ${iso}
lang: en
categories: ['general']
tags: []
cover: './cover.webp'
coverAlt: ''
translationKey: '${esSlug}'
draft: true
math: false
author: 'Jose Maldonado "Yukiteru Amano"'
---

Hello, traveler!

Write your content here in Markdown. When you add images, place them in this folder and reference them like:

\`\`\`markdown
![alt](./my-image.webp)
\`\`\`

> Place your \`cover.webp\` in this folder. It will be used as the post cover.
> For math, set \`math: true\` and write \`$E=mc^2$\` inline or \`$$\\int$$ \` display.

Example inline: $E=mc^2$ and display:

$$
\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}
$$
`
  return { es, en }
}

async function main() {
  const args = parseArgs()
  let esSlug = args.es || args.es
  let enSlug = args.en || args.en

  if (!esSlug) esSlug = (await prompt('Nombre Art Español (slug): ')).trim()
  if (!enSlug) enSlug = (await prompt('Nombre Art Ingles (slug): ')).trim()

  if (!esSlug || !enSlug) {
    console.error('✗ Ambos slugs son requeridos.')
    process.exit(1)
  }

  const esRaw = esSlug
  const enRaw = enSlug
  esSlug = slugify(esSlug)
  enSlug = slugify(enSlug)

  if (esRaw !== esSlug) console.log(`  → ES slugificado: "${esRaw}" → "${esSlug}"`)
  if (enRaw !== enSlug) console.log(`  → EN slugificado: "${enRaw}" → "${enSlug}"`)

  const esDir = path.join(blogRoot, 'es', esSlug)
  const enDir = path.join(blogRoot, 'en', enSlug)
  const { es, en } = buildContent({ esSlug, enSlug })

  let created = 0
  // placeholder cover: usar og-default.png como base webp si existe
  const placeholderSrc = path.join(root, 'packages/main/public/og-default.png')
  for (const [dir, content] of [
    [esDir, es],
    [enDir, en],
  ]) {
    const file = path.join(dir, 'index.md')
    if (fs.existsSync(file)) {
      const ans = (await prompt(`⚠ ${path.relative(root, file)} ya existe. ¿Sobrescribir? (y/N): `)).trim().toLowerCase()
      if (ans !== 'y' && ans !== 's') {
        console.log(`  ↷ Saltando ${path.relative(root, dir)}`)
        continue
      }
    }
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(file, content)
    console.log(`✓ Creado ${path.relative(root, file)}`)
    // crear cover.webp placeholder si no existe
    const coverPath = path.join(dir, 'cover.webp')
    if (!fs.existsSync(coverPath) && !fs.existsSync(path.join(dir, 'cover.png')) && !fs.existsSync(path.join(dir, 'cover.jpg'))) {
      try {
        if (fs.existsSync(placeholderSrc)) {
          fs.copyFileSync(placeholderSrc, coverPath)
          console.log(`  ↳ placeholder ${path.relative(root, coverPath)} (desde og-default.png)`)
        } else {
          fs.writeFileSync(coverPath, '')
          console.log(`  ↳ placeholder vacío ${path.relative(root, coverPath)}`)
        }
      } catch (e) {
        console.log(`  ! no se pudo crear placeholder cover: ${e.message}`)
      }
    }
    created++
  }

  if (created === 0) {
    console.log('— Nada creado.')
  } else {
    console.log(`\n✓ Scaffold listo. Edita frontmatter y contenido, añade cover.webp en cada carpeta.`)
    console.log(`  ES: ${path.relative(root, path.join(esDir, 'index.md'))}`)
    console.log(`  EN: ${path.relative(root, path.join(enDir, 'index.md'))}`)
    console.log(`\n  make build && make preview  → http://localhost:4321/blog/${esSlug}`)
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
