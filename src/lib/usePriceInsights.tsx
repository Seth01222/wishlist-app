'use client'

// User-customizable display settings for the price-smarts widgets. Persisted to
// localStorage (free, no DB) and shared app-wide via context so the settings
// panel and every widget stay in sync.

import { createContext, useContext, useEffect, useState } from 'react'

export type SparkRange = 0 | 30 | 90 // 0 = all time

export type PriceSettings = {
  showProgress: boolean
  showSparkline: boolean
  showBadges: boolean
  showBudget: boolean
  sparkRange: SparkRange
}

export const DEFAULT_SETTINGS: PriceSettings = {
  showProgress: true,
  showSparkline: true,
  showBadges: true,
  showBudget: true,
  sparkRange: 0,
}

const KEY = 'wl-price-settings'

type Ctx = { settings: PriceSettings; update: (patch: Partial<PriceSettings>) => void; reset: () => void }
const PriceCtx = createContext<Ctx | null>(null)

export function PriceInsightsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<PriceSettings>(DEFAULT_SETTINGS)

  // Load saved settings after mount (avoids SSR/hydration mismatch).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY)
      if (raw) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) })
    } catch { /* ignore */ }
  }, [])

  function update(patch: Partial<PriceSettings>) {
    setSettings(prev => {
      const next = { ...prev, ...patch }
      try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* ignore */ }
      return next
    })
  }

  function reset() {
    try { localStorage.removeItem(KEY) } catch { /* ignore */ }
    setSettings(DEFAULT_SETTINGS)
  }

  return <PriceCtx.Provider value={{ settings, update, reset }}>{children}</PriceCtx.Provider>
}

export function usePriceSettings(): Ctx {
  const ctx = useContext(PriceCtx)
  // Fallback so components don't crash if rendered outside the provider.
  if (!ctx) return { settings: DEFAULT_SETTINGS, update: () => {}, reset: () => {} }
  return ctx
}
