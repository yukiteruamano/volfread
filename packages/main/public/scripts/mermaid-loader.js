// mermaid-loader.js — render cliente de diagramas Mermaid en el blog (CSP-friendly)
// Sin inline, sin innerHTML con datos no confiables (solo textContent).
// Se carga con defer tras /scripts/mermaid.min.js, solo en posts con ```mermaid.
// El diagrama se muestra como SVG inline clicable (lo abre el lightbox) y
// ofrece descarga del vector. Sin raster a canvas (los SVG con foreignObject
// contaminan el canvas y el navegador bloquea la exportación).
// Compatible con Astro ClientRouter (astro:page-load / astro:after-swap).
;(function () {
  var INITIALIZED = false
  var counter = 0

  function lang() {
    return (document.documentElement.lang || 'es').toLowerCase().slice(0, 2)
  }

  function t(es, en) {
    return lang() === 'en' ? en : es
  }

  function slug() {
    var parts = window.location.pathname.split('/').filter(Boolean)
    var raw = parts.length ? parts[parts.length - 1] : 'diagrama'
    var clean = raw
      .toLowerCase()
      .normalize('NFD')
      .replace(/[^\x00-\x7F]/g, '')
      .replace(/[^a-z0-9-_]+/g, '-')
      .replace(/^-+|-+$/g, '')
    return clean || 'diagrama'
  }

  function info(stage, detail) {
    try {
      if (typeof console !== 'undefined' && typeof console.info === 'function') {
        console.info('[mermaid] ' + stage, detail || '')
      }
    } catch {
      // consola no disponible: silencio
    }
  }

  function report(stage, detail) {
    try {
      if (typeof console !== 'undefined' && typeof console.warn === 'function') {
        console.warn('[mermaid] ' + stage, detail || '')
      }
    } catch {
      // consola no disponible: silencio
    }
  }

  function initMermaid() {
    if (INITIALIZED || !window.mermaid) return
    window.mermaid.initialize({
      startOnLoad: false,
      theme: 'dark',
      securityLevel: 'strict',
      flowchart: { htmlLabels: false },
      themeVariables: {
        primaryColor: '#FF6B00',
        primaryTextColor: '#F5F5F5',
        primaryBorderColor: '#FF6B00',
        lineColor: '#A3A3A3',
        background: '#0A0A0A',
        mainBkg: '#141414',
        nodeBorder: '#262626',
        clusterBkg: '#141414',
        edgeLabelBackground: '#0A0A0A',
      },
    })
    INITIALIZED = true
  }

  function findMermaidBlocks(scope) {
    // Astro/Shiki puede poner la clase language-mermaid o data-language="mermaid"
    // en el <pre> o en el <code> según versión y tema. Cubrimos las variantes.
    var out = []
    scope.querySelectorAll('pre').forEach(function (pre) {
      var code = pre.querySelector(':scope > code') || pre.querySelector('code')
      if (!code) return
      var cls = (pre.className || '') + ' ' + (code.className || '')
      var dataLang = pre.getAttribute('data-language') || code.getAttribute('data-language') || ''
      if (/mermaid/i.test(cls) || /mermaid/i.test(dataLang)) out.push({ pre: pre, code: code })
    })
    return out
  }

  function download(blob, filename) {
    var url = URL.createObjectURL(blob)
    var a = document.createElement('a')
    a.href = url
    a.download = filename
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.setTimeout(function () {
      URL.revokeObjectURL(url)
    }, 4000)
  }

  // Clon autocontenido del SVG: dimensiones en píxeles (manda viewBox si el
  // width es porcentaje o falta), namespace y tipografía genérica.
  function serializeSvg(svg) {
    var clone = svg.cloneNode(true)
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    clone.removeAttribute('style')
    clone.removeAttribute('class')
    var vb = (clone.getAttribute('viewBox') || '').trim().split(/[\s,]+/)
    var attrW = (clone.getAttribute('width') || '').trim()
    var attrH = (clone.getAttribute('height') || '').trim()
    var w = /%$/.test(attrW) || !attrW ? NaN : parseFloat(attrW)
    var h = /%$/.test(attrH) || !attrH ? NaN : parseFloat(attrH)
    if (!(w > 0)) w = parseFloat(vb[2])
    if (!(h > 0)) h = parseFloat(vb[3])
    if (!(w > 0) || !(h > 0)) throw new Error('no-dimensions')
    clone.setAttribute('width', String(Math.round(w)))
    clone.setAttribute('height', String(Math.round(h)))
    var style = document.createElementNS('http://www.w3.org/2000/svg', 'style')
    style.textContent =
      'text{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace !important}'
    clone.insertBefore(style, clone.firstChild)
    return new XMLSerializer().serializeToString(clone)
  }

  function exportSVG(figure, n) {
    var svg = figure.querySelector('svg')
    if (!svg) return
    try {
      var text = serializeSvg(svg)
      download(
        new Blob([text], { type: 'image/svg+xml;charset=utf-8' }),
        slug() + '-' + t('diagrama', 'diagram') + '-' + n + '.svg'
      )
    } catch (e) {
      report('export-svg-failed', e instanceof Error ? e.message : String(e))
      disableDownload(figure)
    }
  }

  function disableDownload(figure) {
    figure.querySelectorAll('.mermaid-toolbar button').forEach(function (btn) {
      btn.disabled = true
      btn.title = t('Exportación no disponible', 'Export unavailable')
    })
  }

  function attachDownload(figure, n) {
    if (figure.querySelector('.mermaid-toolbar')) return
    var bar = document.createElement('div')
    bar.className = 'mermaid-toolbar'
    var btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'mermaid-dl'
    btn.textContent = t('Descargar SVG', 'Download SVG')
    btn.setAttribute('aria-label', t('Descargar diagrama como SVG', 'Download diagram as SVG'))
    btn.addEventListener('click', function () {
      exportSVG(figure, n)
    })
    bar.appendChild(btn)
    figure.appendChild(bar)
  }

  function notifyRendered(figure) {
    try {
      document.dispatchEvent(new CustomEvent('mermaid:rendered', { detail: { figure: figure } }))
    } catch {
      // Sin CustomEvent: el lightbox tiene MutationObserver de respaldo
    }
  }

  function onRendered(figure, n) {
    var svg = figure.querySelector('svg')
    if (!svg) {
      figure.remove()
      return false
    }
    try {
      var hasFO = !!svg.querySelector('foreignObject')
      info(hasFO ? 'foreignObject-present' : 'foreignObject-absent', 'id=' + (svg.id || '?'))
    } catch {
      // inspección no disponible: seguir igualmente
    }
    attachDownload(figure, n)
    notifyRendered(figure)
    return true
  }

  async function renderAll(root) {
    var scope = root || document
    if (!window.mermaid) return
    var blocks = findMermaidBlocks(scope)
    if (!blocks.length) return
    initMermaid()
    var jobs = []
    blocks.forEach(function (item) {
      var code = item.code
      var pre = item.pre
      if (pre.dataset.mermaidDone) return
      pre.dataset.mermaidDone = '1'
      var text = code.textContent || ''
      if (!text.trim()) return
      counter += 1
      var n = counter
      var figure = document.createElement('figure')
      figure.className = 'mermaid'
      figure.setAttribute('role', 'img')
      figure.setAttribute('aria-label', t('Diagrama Mermaid ', 'Mermaid diagram ') + n)
      var div = document.createElement('div')
      div.className = 'mermaid-diagram'
      div.id = 'mermaid-diagram-' + n
      // textContent: el contenido nunca se interpreta como HTML antes del render
      // Directiva init por diagrama: pide texto SVG puro (sin foreignObject).
      if (!/%%\{\s*init\s*:/i.test(text)) {
        text = "%%{init: {'flowchart': {'htmlLabels': false}}}%%\n" + text
      }
      div.textContent = text
      figure.appendChild(div)
      pre.parentNode.insertBefore(figure, pre)
      pre.hidden = true
      var fail = function (err) {
        if (err) report('render-failed', err instanceof Error ? err.message : String(err))
        figure.remove()
        delete pre.dataset.mermaidDone
        pre.hidden = false
      }
      var job
      try {
        if (typeof window.mermaid.run === 'function') {
          job = window.mermaid
            .run({ nodes: [div] })
            .then(function () {
              if (!onRendered(figure, n)) fail()
            })
            .catch(fail)
        } else if (typeof window.mermaid.init === 'function') {
          window.mermaid.init(undefined, div)
          job = Promise.resolve().then(function () {
            if (!onRendered(figure, n)) fail()
          })
        } else {
          fail()
          job = Promise.resolve()
        }
      } catch (e) {
        fail(e instanceof Error ? e : new Error(String(e)))
        job = Promise.resolve()
      }
      jobs.push(job)
    })
    await Promise.all(jobs)
  }

  function boot() {
    renderAll(document)
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot)
  } else {
    boot()
  }
  document.addEventListener('astro:page-load', boot)
  document.addEventListener('astro:after-swap', boot)
})()
