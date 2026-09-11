// ui.js — unifica Header mobile menu + copy-btn, defer, CSP-friendly, sin innerHTML y sin leak de listeners
;(function () {
  var ctrl
  function initCopy() {
    document.querySelectorAll('.copy-btn').forEach(function (btn) {
      if (btn.dataset.bound) return
      btn.dataset.bound = '1'
      btn.addEventListener('click', function () {
        var code = btn.getAttribute('data-copy') || ''
        navigator.clipboard.writeText(code).then(function () {
          var toast = btn.closest('section')?.querySelector('.copy-toast')
          if (toast) {
            toast.classList.remove('hidden')
            setTimeout(function () {
              toast.classList.add('hidden')
            }, 2000)
          }
          var origHTML = btn.innerHTML
          // usa textContent para evitar innerHTML con datos no confiables; restaura HTML estático confiable
          btn.textContent =
            btn.getAttribute('data-copied-text') ||
            (document.documentElement.lang === 'en' ? 'Copied ✓' : 'Copiado ✓')
          var t = setTimeout(function () {
            btn.innerHTML = origHTML
          }, 2000)
          // limpia timeout si navega antes
          document.addEventListener(
            'astro:before-swap',
            function () {
              clearTimeout(t)
            },
            { once: true, signal: ctrl ? ctrl.signal : undefined }
          )
        })
      })
    })
  }
  function initMenu() {
    var btn = document.getElementById('mobile-menu-btn')
    var menu = document.getElementById('mobile-menu')
    if (!btn || !menu || btn.dataset.bound) return
    btn.dataset.bound = '1'
    function setOpen(open) {
      btn.setAttribute('aria-expanded', String(open))
      menu.hidden = !open
      var m = btn.querySelector('.menu-icon'),
        c = btn.querySelector('.close-icon')
      if (m) m.classList.toggle('hidden', open)
      if (c) c.classList.toggle('hidden', !open)
      if (open) {
        var a = menu.querySelector('a')
        a && a.focus()
      }
    }
    btn.addEventListener('click', function () {
      setOpen(menu.hidden)
    })
    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) setOpen(false)
    })
    if (!document.documentElement.dataset.uiGlobalBound) {
      document.documentElement.dataset.uiGlobalBound = '1'
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && menu && !menu.hidden) setOpen(false)
      })
      document.addEventListener('click', function (e) {
        if (menu && !menu.hidden && !e.target.closest('#mobile-nav-root')) setOpen(false)
      })
    }
  }
  function init() {
    if (ctrl) ctrl.abort()
    ctrl = new AbortController()
    initMenu()
    initCopy()
    document.addEventListener(
      'astro:before-swap',
      function () {
        if (ctrl) ctrl.abort()
      },
      { signal: ctrl.signal }
    )
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init)
  else init()
  document.addEventListener('astro:page-load', init)
  document.addEventListener('astro:after-swap', init)
})()
