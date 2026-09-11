// search.js — deferred, handles SearchBox toggle + blog search, no parser blocking
;(function () {
  var ctrl
  function init() {
    var box = document.querySelector('[data-search-box]')
    if (!box) return
    if (box.dataset.boundSearch) return
    box.dataset.boundSearch = '1'

    var btn = box.querySelector('[data-search-toggle]')
    var panel = document.getElementById('search-panel')
    var input = box.querySelector('[data-search-input]')
    var results = box.querySelector('[data-search-results]')
    var empty = box.querySelector('[data-search-empty]')
    if (!btn || !panel || !input) return

    function setOpen(open) {
      btn.setAttribute('aria-expanded', String(open))
      panel.hidden = !open
      if (open)
        setTimeout(function () {
          input.focus()
        }, 10)
    }

    if (!document.documentElement.dataset.searchGlobalBound) {
      document.documentElement.dataset.searchGlobalBound = '1'
      document.addEventListener('click', function (e) {
        var b = document.querySelector('[data-search-box]')
        var p = document.getElementById('search-panel')
        if (!b || !p || p.hidden) return
        if (!b.contains(e.target)) {
          var bt = b.querySelector('[data-search-toggle]')
          if (bt) bt.setAttribute('aria-expanded', 'false')
          p.hidden = true
        }
      })
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
          var p = document.getElementById('search-panel')
          var b = document.querySelector('[data-search-box]')
          if (p && !p.hidden) {
            p.hidden = true
            if (b) {
              var bt = b.querySelector('[data-search-toggle]')
              if (bt) bt.setAttribute('aria-expanded', 'false')
            }
          }
        }
      })
    }

    btn.addEventListener('click', function () {
      setOpen(panel.hidden)
    })

    function norm(s) {
      return (s || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
    }
    function getIndex() {
      var el = document.getElementById('blog-search-index')
      if (el) {
        try {
          return JSON.parse(el.textContent)
        } catch (e) {
          return []
        }
      }
      return []
    }
    function render(list) {
      if (!results || !empty) return
      results.innerHTML = ''
      if (list.length === 0) {
        results.classList.add('hidden')
        if (input.value.trim()) empty.classList.remove('hidden')
        else empty.classList.add('hidden')
        return
      }
      empty.classList.add('hidden')
      results.classList.remove('hidden')
      list.slice(0, 5).forEach(function (p) {
        var li = document.createElement('li')
        var a = document.createElement('a')
        a.href = p.url
        a.className =
          'flex gap-3 rounded-xl border border-transparent bg-volf-bg/60 p-2 hover:border-volf-orange/30 hover:bg-volf-surface transition'
        var imgWrap = document.createElement('div')
        imgWrap.className =
          'shrink-0 w-14 h-14 rounded-lg overflow-hidden bg-volf-surface border border-volf-border'
        if (p.cover) {
          var img = document.createElement('img')
          img.src = p.cover
          img.alt = ''
          img.loading = 'lazy'
          img.className = 'h-full w-full object-cover'
          imgWrap.appendChild(img)
        } else {
          imgWrap.textContent = 'VOLF'
          imgWrap.className += ' grid place-items-center text-[10px] font-bold text-volf-orange'
        }
        var txt = document.createElement('div')
        txt.className = 'min-w-0'
        var t = document.createElement('p')
        t.className = 'text-xs font-semibold text-volf-text line-clamp-2'
        t.textContent = p.title
        var d = document.createElement('p')
        d.className = 'text-[11px] text-volf-muted line-clamp-1'
        d.textContent = p.description || ''
        txt.appendChild(t)
        txt.appendChild(d)
        a.appendChild(imgWrap)
        a.appendChild(txt)
        li.appendChild(a)
        results.appendChild(li)
      })
    }
    var idx = getIndex()
    function filterCards(q) {
      var nq = norm(q)
      var cards = document.querySelectorAll('[data-post-card]')
      if (!cards.length) return 0
      var visible = 0
      cards.forEach(function (c) {
        var hay = norm(c.getAttribute('data-searchable') || '')
        var show = !nq || hay.indexOf(nq) !== -1
        c.hidden = !show
        if (show) visible++
      })
      var emptyCards = document.querySelector('[data-filter-empty]')
      if (emptyCards) emptyCards.hidden = visible !== 0
      return visible
    }
    var debounce
    input.addEventListener('input', function () {
      clearTimeout(debounce)
      debounce = setTimeout(function () {
        var q = input.value.trim()
        var nq = norm(q)
        if (!nq) {
          render([])
          filterCards('')
          return
        }
        var filtered = idx.filter(function (p) {
          var hay = norm(
            p.title +
              ' ' +
              p.description +
              ' ' +
              (p.tags || []).join(' ') +
              ' ' +
              (p.categories || []).join(' ')
          )
          return hay.indexOf(nq) !== -1
        })
        render(filtered)
        filterCards(q)
      }, 150)
    })
    if (results)
      results.addEventListener('click', function (e) {
        if (e.target.closest('a')) setOpen(false)
      })
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
