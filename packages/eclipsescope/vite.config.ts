import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Base must match the deployed subpath
export default defineConfig({
  base: '/proyectos/eclipsescope/app/',
  plugins: [react(), tailwindcss()],
  build: { outDir: 'dist', sourcemap: false },
})
