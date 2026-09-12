const root = document.getElementById('root')
if (root) {
  const wrapper = document.createElement('div')
  wrapper.style.cssText =
    'min-height:100vh;background:#0A0A0A;color:#F5F5F5;display:flex;align-items:center;justify-content:center;padding:2rem;font-family:system-ui'
  const inner = document.createElement('div')
  inner.style.cssText = 'max-width:560px;text-align:center'
  const icon = document.createElement('div')
  icon.style.cssText =
    'display:inline-flex;height:48px;width:48px;align-items:center;justify-content:center;border-radius:12px;background:#FF6B00;font-size:20px'
  icon.textContent = '⛓️'
  const h1 = document.createElement('h1')
  h1.style.cssText = 'margin-top:16px;font-size:28px;font-weight:900;letter-spacing:-0.02em'
  h1.textContent = 'Simulador Blockchain'
  const p = document.createElement('p')
  p.style.cssText = 'margin-top:8px;color:#A3A3A3'
  p.textContent = 'Simulación educativa de cadena de bloques — minería, transacciones, P2P.'
  const card = document.createElement('div')
  card.style.cssText =
    'margin-top:24px;border:1px solid #262626;background:#141414;border-radius:16px;padding:20px;text-align:left'
  const cardTitle = document.createElement('p')
  cardTitle.style.cssText = 'font-size:13px;font-weight:700;color:#FF6B00'
  cardTitle.textContent = 'Placeholder del workspace'
  const cardText = document.createElement('p')
  cardText.style.cssText = 'margin-top:8px;font-size:13px;line-height:1.6;color:#A3A3A3'
  cardText.textContent =
    'Build placeholder de packages/simulador-blockchain. En producción este dist se reemplaza por el build real de yukiteruamano.github.io compilado con --base-href /proyectos/simulador-blockchain/app/.'
  const link = document.createElement('a')
  link.href = '/'
  link.style.cssText =
    'margin-top:16px;display:inline-flex;border-radius:999px;background:#FF6B00;padding:8px 20px;font-size:13px;font-weight:800;color:#fff;text-decoration:none'
  link.textContent = '← Volver a volfread.xyz'
  card.append(cardTitle, cardText, link)
  inner.append(icon, h1, p, card)
  wrapper.appendChild(inner)
  root.appendChild(wrapper)
}
