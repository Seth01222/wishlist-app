import type { CSSProperties } from 'react'

// Shared form-field styling used across the app's inputs. Kept in one place so
// every text field looks identical.
export const INPUT_CLASS =
  'w-full px-3.5 py-2.5 rounded-lg border border-line bg-raised text-ink placeholder:text-ghost focus:outline-none focus:ring-2 focus:border-transparent transition-colors'

// Tailwind's `focus:ring-2` needs a ring color; we drive it from the active
// accent CSS variable.
export const RING_STYLE = { '--tw-ring-color': 'var(--a500)' } as CSSProperties
