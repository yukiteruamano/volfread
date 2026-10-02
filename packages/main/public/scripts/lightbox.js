// lightbox.js — galería lightbox para imágenes de artículos (CSP-friendly)
// Sin dependencias, solo textContent (nunca innerHTML con datos no confiables).
// Alcance: imágenes dentro de .prose-blog (contenido del post) + PNG de Mermaid.
// Compatible con Astro ClientRouter y con el render asíncrono de Mermaid
// (evento 'mermaid:rendered' + MutationObserver de respaldo).
;(function () {
  var overlay = null
  var items = []
  var index = 0
  var lastFocused = null
  var moTimer = null

  function lang() {
    return (document.documentElement.lang || 'es').toLowerCase().slice(0, 2)
  }

  function t(es, en) {
    return lang() === 'en' ? en : es
  }

  function scope() {
    return document.querySelector('.prose-blog')
  }

  function figureSvgUrl(figure) {
    // Serializa el SVG del diagrama a URL data: para mostrarlo grande.
    // (Mostrar no contamina canvas; solo la exportación a PNG estaba vetada.)
    if (figure._lightboxUrl) return figure._lightboxUrl
    var svg = figure.querySelector('svg')
    if (!svg) return null
    try {
      var clone = svg.cloneNode(true)
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
      var vb = (clone.getAttribute('viewBox') || '').trim().split(/[\s,]+/)
      var attrW = (clone.getAttribute('width') || '').trim()
      var attrH = (clone.getAttribute('height') || '').trim()
      var w = /%$/.test(attrW) || !attrW ? NaN : parseFloat(attrW)
      var h = /%$/.test(attrH) || !attrH ? NaN : parseFloat(attrH)
      if (!(w > 0)) w = parseFloat(vb[2])
      if (!(h > 0)) h = parseFloat(vb[3])
      if (!(w > 0) || !(h > 0)) return null
      clone.setAttribute('width', String(Math.round(w)))
      clone.setAttribute('height', String(Math.round(h)))
      var text = new XMLSerializer().serializeToString(clone)
      var url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(text)
      figure._lightboxUrl = url
      return url
    } catch {
      return null
    }
  }

  function collect() {
    var root = scope()
    if (!root) return []
    var seen = {}
    var out = []
    root.querySelectorAll('img').forEach(function (img) {
      if (img.hidden || !img.getAttribute('src')) return
      var src = img.currentSrc || img.src
      if (!src || seen[src]) return
      seen[src] = true
      out.push({ src: src, alt: img.getAttribute('alt') || '' })
    })
    root.querySelectorAll('figure.mermaid').forEach(function (figure) {
      var url = figureSvgUrl(figure)
      if (!url || seen[url]) return
      seen[url] = true
      out.push({ src: url, alt: figure.getAttribute('aria-label') || '' })
    })
    return out
  }

  function refresh() {
    items = collect()
    if (overlay) {
      if (!items.length) {
        close()
        return
      }
      if (index > items.length - 1) index = items.length - 1
      render()
    }
  }

  function scheduleRefresh() {
    if (moTimer) window.clearTimeout(moTimer)
    moTimer = window.setTimeout(refresh, 300)
  }

  function el(tag, cls, text) {
    var node = document.createElement(tag)
    if (cls) node.className = cls
    if (text) node.textContent = text
    return node
  }

  function build() {
    overlay = el('div', 'volf-lightbox')
    overlay.setAttribute('role', 'dialog')
    overlay.setAttribute('aria-modal', 'true')
    overlay.setAttribute('aria-label', t('Galería de imágenes', 'Image gallery'))
    overlay.hidden = true

    var backdrop = el('div', 'volf-lightbox-backdrop')
    backdrop.addEventListener('click', close)
    overlay.appendChild(backdrop)

    var box = el('div', 'volf-lightbox-box')
    overlay.appendChild(box)

    var btnClose = el('button', 'volf-lightbox-close', '×')
    btnClose.type = 'button'
    btnClose.setAttribute('aria-label', t('Cerrar', 'Close'))
    btnClose.addEventListener('click', close)
    box.appendChild(btnClose)

    var btnPrev = el('button', 'volf-lightbox-prev', '‹')
    btnPrev.type = 'button'
    btnPrev.setAttribute('aria-label', t('Imagen anterior', 'Previous image'))
    btnPrev.addEventListener('click', function () {
      step(-1)
    })
    box.appendChild(btnPrev)

    var stage = el('figure', 'volf-lightbox-stage')
    box.appendChild(stage)
    var view = el('img', 'volf-lightbox-view')
    view.alt = ''
    stage.appendChild(view)
    var caption = el('figcaption', 'volf-lightbox-caption')
    stage.appendChild(caption)

    var btnNext = el('button', 'volf-lightbox-next', '›')
    btnNext.type = 'button'
    btnNext.setAttribute('aria-label', t('Imagen siguiente', 'Next image'))
    btnNext.addEventListener('click', function () {
      step(1)
    })
    box.appendChild(btnNext)

    var foot = el('div', 'volf-lightbox-foot')
    box.appendChild(foot)
    var counter = el('p', 'volf-lightbox-counter')
    foot.appendChild(counter)
    var thumbs = el('div', 'volf-lightbox-thumbs')
    foot.appendChild(thumbs)

    document.body.appendChild(overlay)
    document.addEventListener('keydown', onKey)
  }

  function render() {
    if (!overlay || !items.length) return
    var item = items[index]
    var view = overlay.querySelector('.volf-lightbox-view')
    view.src = item.src
    view.alt = item.alt
    var caption = overlay.querySelector('.volf-lightbox-caption')
    caption.textContent = item.alt
    caption.hidden = !item.alt
    overlay.querySelector('.volf-lightbox-counter').textContent =
      String(index + 1) + ' / ' + String(items.length)
    var multi = items.length > 1
    overlay.querySelector('.volf-lightbox-prev').hidden = !multi
    overlay.querySelector('.volf-lightbox-next').hidden = !multi
    overlay.querySelector('.volf-lightbox-thumbs').hidden = !multi
    var thumbs = overlay.querySelector('.volf-lightbox-thumbs')
    thumbs.textContent = ''
    if (multi) {
      items.forEach(function (it, i) {
        var b = document.createElement('button')
        b.type = 'button'
        b.className = 'volf-lightbox-thumb' + (i === index ? ' is-active' : '')
        b.setAttribute('aria-label', t('Ver imagen ', 'View image ') + String(i + 1))
        var thumb = document.createElement('img')
        thumb.src = it.src
        thumb.alt = ''
        thumb.loading = 'lazy'
        thumb.decoding = 'async'
        b.appendChild(thumb)
        ;(function (pos) {
          b.addEventListener('click', function () {
            index = pos
            render()
          })
        })(i)
        thumbs.appendChild(b)
      })
      var active = thumbs.querySelector('.is-active')
      if (active && typeof active.scrollIntoView === 'function') {
        active.scrollIntoView({ block: 'nearest', inline: 'center' })
      }
    }
  }

  function open(i) {
    refresh()
    if (!items.length) return
    if (!overlay) build()
    index = i
    lastFocused = document.activeElement
    render()
    overlay.hidden = false
    document.body.style.overflow = 'hidden'
    var btnClose = overlay.querySelector('.volf-lightbox-close')
    if (btnClose) btnClose.focus()
  }

  function close() {
    if (!overlay || overlay.hidden) return
    overlay.hidden = true
    document.body.style.overflow = ''
    if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus()
  }

  function step(d) {
    if (!items.length) return
    index = (index + d + items.length) % items.length
    render()
  }

  function onKey(e) {
    if (!overlay || overlay.hidden) return
    if (e.key === 'Escape') close()
    else if (e.key === 'ArrowLeft') step(-1)
    else if (e.key === 'ArrowRight') step(1)
  }

  function onClick(e) {
    if (overlay && !overlay.hidden) return
    // Los botones (descargas) y enlaces no abren la galería
    if (e.target.closest && e.target.closest('button, a')) return
    var target = e.target.closest ? e.target.closest('.prose-blog img, figure.mermaid') : null
    if (!target) return
    refresh()
    var src = null
    if (target.tagName === 'IMG') {
      if (target.hidden) return
      src = target.currentSrc || target.src
    } else {
      src = figureSvgUrl(target)
    }
    if (!src) return
    var pos = items.findIndex(function (it) {
      return it.src === src
    })
    open(pos >= 0 ? pos : 0)
  }

  function boot() {
    refresh()
  }

  document.addEventListener('click', onClick)
  document.addEventListener('mermaid:rendered', scheduleRefresh)
  document.addEventListener('astro:page-load', boot)
  document.addEventListener('astro:after-swap', boot)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      boot()
      var root = scope()
      if (root && typeof MutationObserver === 'function') {
        new MutationObserver(scheduleRefresh).observe(root, { childList: true, subtree: true })
      }
    })
  } else {
    boot()
    var early = scope()
    if (early && typeof MutationObserver === 'function') {
      new MutationObserver(scheduleRefresh).observe(early, { childList: true, subtree: true })
    }
  }
})()
