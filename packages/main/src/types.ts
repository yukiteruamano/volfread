// src/types.ts — tipos centrales para datos del portafolio.
// Evitan `as any` al consumir proyectos.json y projects.stats.json.

export interface Project {
  slug: string
  title: string
  description: string
  descriptionEn?: string
  divulgativa?: string
  divulgativaEn?: string
  tecnica?: string
  tecnicaEn?: string
  highlights?: string[]
  highlightsEn?: string[]
  type: 'web' | 'lib' | 'cli'
  lang: string
  stack: string[]
  repo: string
  pkg?: string
  featured?: boolean
}

export interface ProjectStats {
  loc: number
  languages: Record<string, number>
  commits52: number[]
}

export interface ProjectsStatsFile {
  _note: string
  /** Campo legacy: existía en versiones antiguas del JSON generado. */
  generatedAt?: string
  projects: Record<string, ProjectStats>
}
