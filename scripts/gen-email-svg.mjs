import opentype from 'opentype.js'
import fs from 'node:fs'

const fontPath = '/usr/share/fonts/TTF/LiberationMono-Regular.ttf'
const text = 'yukiteruamano@volfread.xyz'
const buffer = fs.readFileSync(fontPath)
const font = opentype.parse(buffer)
const fontSize = 13
const startX = 0
const startY = 13
// Get path for whole string
const path = font.getPath(text, startX, startY, fontSize)
// Get bounding box
const box = path.getBoundingBox()
console.log('box', box)
const width = Math.ceil(box.x2 - box.x1 + 4)
const height = 18
// Normalize path to viewBox 0 0 width height
// Path is already at startX,startY, we need to shift to 0,0 viewBox
// We'll just use path.toSVG with viewBox based on box
const svgPath = path.toPathData(2)
// Create SVG with viewBox 0 0 width height
const svg = `<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Correo electrónico" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" class="inline-block align-middle select-none" aria-hidden="true"><path d="${svgPath}" fill="currentColor"/></svg>`
console.log(svg.slice(0, 500))
fs.writeFileSync('/tmp/email.svg', svg)
console.log('written to /tmp/email.svg, width', width)
