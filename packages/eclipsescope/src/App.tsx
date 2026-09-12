export default function App() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F5F5F5] flex flex-col items-center justify-center p-8">
      <div className="max-w-xl text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#FF6B00] text-xl">🌑</div>
        <h1 className="mt-4 text-3xl font-black tracking-tight">EclipseScope</h1>
        <p className="mt-2 text-[#A3A3A3]">Calculador de eclipses solares — ciclos de Saros y elementos besselianos.</p>
        <div className="mt-6 rounded-2xl border border-[#262626] bg-[#141414] p-6 text-left">
          <p className="text-sm font-semibold text-[#FF6B00]">Placeholder del workspace</p>
          <p className="mt-2 text-sm leading-relaxed text-[#A3A3A3]">
            Este es el build placeholder de <code className="text-[#FFB84D]">packages/eclipsescope</code>.
            En producción este dist es reemplazado por el build real de{' '}
            <code className="text-[#FFB84D]">/home/yukiteru/GIT/EclipseCalculator</code> (repo <code className="text-white">EclipseScope</code>) compilado con{' '}
            <code className="text-white">base: '/proyectos/eclipsescope/app/'</code>.
          </p>
          <p className="mt-3 text-xs text-[#737373]">
            Para wirear el proyecto real: <code>EC_SOURCE=/home/yukiteru/GIT/EclipseCalculator pnpm --filter eclipsescope build:real</code> o
            copia el dist manualmente. Ver <code>AGENTS.md §3</code>.
          </p>
          <a href="/" className="mt-4 inline-flex rounded-full bg-[#FF6B00] px-5 py-2 text-sm font-bold text-white hover:bg-[#FF8533]">
            ← Volver a volfread.xyz
          </a>
        </div>
      </div>
    </div>
  )
}
