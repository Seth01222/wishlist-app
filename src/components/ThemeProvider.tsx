'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { type AccentColor, type ColorMode, DEFAULT_ACCENT, DEFAULT_MODE } from '@/lib/theme'

type ThemeContextType = {
  mode: ColorMode
  accent: AccentColor
  setMode: (m: ColorMode) => void
  setAccent: (a: AccentColor) => void
  toggleMode: () => void
}

const ThemeContext = createContext<ThemeContextType | null>(null)

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider')
  return ctx
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Start with defaults — the inline script already set the correct DOM state,
  // so the page looks right visually. We sync React's state to match the DOM
  // after mount so the toggle button icon and color picker highlight are correct.
  const [mode, setModeRaw] = useState<ColorMode>(DEFAULT_MODE)
  const [accent, setAccentRaw] = useState<AccentColor>(DEFAULT_ACCENT)

  useEffect(() => {
    // Read what the DOM actually has (set by the anti-flash script), not defaults
    const html = document.documentElement
    const domMode: ColorMode = html.classList.contains('dark') ? 'dark' : 'light'
    const domAccent = (html.getAttribute('data-accent') as AccentColor) || DEFAULT_ACCENT
    setModeRaw(domMode)
    setAccentRaw(domAccent)
  }, [])

  function setMode(m: ColorMode) {
    setModeRaw(m)
    const html = document.documentElement
    if (m === 'dark') html.classList.add('dark')
    else html.classList.remove('dark')
    try { localStorage.setItem('wl-mode', m) } catch {}
  }

  function setAccent(a: AccentColor) {
    setAccentRaw(a)
    document.documentElement.setAttribute('data-accent', a)
    try { localStorage.setItem('wl-accent', a) } catch {}
  }

  function toggleMode() {
    setMode(mode === 'dark' ? 'light' : 'dark')
  }

  return (
    <ThemeContext.Provider value={{ mode, accent, setMode, setAccent, toggleMode }}>
      {children}
    </ThemeContext.Provider>
  )
}
