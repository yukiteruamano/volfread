// blog-filter.js — deferred, handles category/tag chips, event delegation, no duplicate listeners
;(function () {
  var ctrl
  function init() {
    var cats = document.querySelector('[data-cat-filter]')
    var tags = document.querySelector('[data-tag-filter]')
    var cards = document.querySelectorAll('[data-post-card]')
    var empty = document.querySelector('[data-filter-empty]')
    if ((!cats && !tags) || !cards.length) return
    if (cats && cats.dataset.boundFilter) return
    if (cats) cats.dataset.boundFilter = '1'
    if (tags) tags.dataset.boundFilter = '1'

    var activeCat = 'all'
    var activeTag = null

    function apply() {
      var v = 0
      cards.forEach(function (c) {
        var cCats = (c.getAttribute('data-categories') || '').split(',').map(function (s) {
          return s.trim()
        })
        var cTags = (c.getAttribute('data-tags') || '').split(',').map(function (s) {
          return s.trim()
        })
        var catOk = activeCat === 'all' || cCats.indexOf(activeCat) !== -1
        var tagOk = !activeTag || cTags.indexOf(activeTag) !== -1
        var show = catOk && tagOk
        c.hidden = !show
        if (show) v++
      })
      if (empty) empty.hidden = v !== 0
    }

    function bind(container) {
      if (!container) return
      // delegation: one listener per container
      container.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-filter]')
        if (!btn || !container.contains(btn)) return
        var val = btn.getAttribute('data-filter')
        var t = btn.getAttribute('data-type')
        if (t === 'category') {
          activeCat = activeCat === val ? 'all' : val
          container.querySelectorAll('[data-type="category"]').forEach(function (b) {
            var on = b.getAttribute('data-filter') === activeCat
            b.classList.toggle('bg-volf-orange', on)
            b.classList.toggle('text-white', on)
            b.classList.toggle('border-transparent', on)
            b.setAttribute('aria-pressed', String(on))
          })
        } else {
          activeTag = activeTag === val ? null : val
          container.querySelectorAll('[data-type="tag"]').forEach(function (b) {
            var on = b.getAttribute('data-filter') === activeTag
            b.classList.toggle('bg-volf-orange', on)
            b.classList.toggle('text-white', on)
            b.classList.toggle('border-transparent', on)
            b.setAttribute('aria-pressed', String(on))
          })
        }
        apply()
      })
    }

    bind(cats)
    bind(tags)
  }

  function initWithCleanup() {
    if (ctrl) ctrl.abort()
    ctrl = new AbortController()
    init()
    document.addEventListener(
      'astro:before-swap',
      function () {
        if (ctrl) ctrl.abort()
      },
      { signal: ctrl.signal }
    )
  }

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', initWithCleanup)
  else initWithCleanup()
  document.addEventListener('astro:page-load', initWithCleanup)
  document.addEventListener('astro:after-swap', initWithCleanup)
})()
