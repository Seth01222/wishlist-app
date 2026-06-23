export type AccentColor = 'indigo' | 'rose' | 'emerald' | 'amber' | 'violet' | 'sky'
export type ColorMode = 'dark' | 'light'

export const ACCENTS: { id: AccentColor; label: string; hex: string }[] = [
  { id: 'indigo',  label: 'Indigo',  hex: '#6366f1' },
  { id: 'violet',  label: 'Violet',  hex: '#8b5cf6' },
  { id: 'rose',    label: 'Rose',    hex: '#f43f5e' },
  { id: 'emerald', label: 'Emerald', hex: '#10b981' },
  { id: 'amber',   label: 'Amber',   hex: '#f59e0b' },
  { id: 'sky',     label: 'Sky',     hex: '#0ea5e9' },
]

export const DEFAULT_ACCENT: AccentColor = 'indigo'
export const DEFAULT_MODE: ColorMode = 'dark'
