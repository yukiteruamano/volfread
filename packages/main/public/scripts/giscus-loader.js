// giscus-loader.js — externalizado para CSP sin unsafe-inline
// Carga https://giscus.app/client.js con SRI pin. Actualizar hash al cambiar versión de giscus.
// Hash actual (2026-09): sha384-UwLZGbJGvkTzz0719+xEzUm/idqwzs0yZN8aB9Se5vUXHbyRyDWw9yqZTIsOsJ7x
// Generar con: curl -sL https://giscus.app/client.js | openssl dgst -sha384 -binary | openssl base64 -A
;(function () {
  var container = document.querySelector('.giscus')
  if (!container) return
  var wrapper = container.closest('.giscus-wrapper')
  var lang = (wrapper && wrapper.getAttribute('data-lang')) || document.documentElement.lang || 'es'
  var repo =
    (wrapper && wrapper.getAttribute('data-repo')) || container.getAttribute('data-repo') || ''
  var repoId = (wrapper && wrapper.getAttribute('data-repo-id')) || ''
  var category = (wrapper && wrapper.getAttribute('data-category')) || 'General'
  var categoryId = (wrapper && wrapper.getAttribute('data-category-id')) || ''

  // Si repo no configurado, mostrar placeholder sin cargar giscus
  if (
    !repo ||
    repo.indexOf('/') === -1 ||
    repo.indexOf('REPLACE_WITH') !== -1 ||
    !repoId ||
    repoId.indexOf('REPLACE_WITH') !== -1
  ) {
    var p = document.createElement('p')
    p.className = 'text-xs text-volf-muted-2 mt-2'
    p.textContent =
      'Comentarios desactivados hasta configurar Giscus (repo + Discussions). Ver src/components/Giscus.astro.'
    container.appendChild(p)
    return
  }

  var script = document.createElement('script')
  script.src = 'https://giscus.app/client.js'
  script.async = true
  script.crossOrigin = 'anonymous'
  script.integrity = 'sha384-UwLZGbJGvkTzz0719+xEzUm/idqwzs0yZN8aB9Se5vUXHbyRyDWw9yqZTIsOsJ7x'
  script.setAttribute('data-repo', repo)
  script.setAttribute('data-repo-id', repoId)
  script.setAttribute('data-category', category)
  script.setAttribute('data-category-id', categoryId)
  script.setAttribute('data-mapping', 'pathname')
  script.setAttribute('data-strict', '0')
  script.setAttribute('data-reactions-enabled', '1')
  script.setAttribute('data-emit-metadata', '0')
  script.setAttribute('data-input-position', 'bottom')
  script.setAttribute('data-theme', 'dark')
  script.setAttribute('data-lang', lang)
  script.setAttribute('data-loading', 'lazy')
  container.appendChild(script)
})()
