'use client'

import { useState } from 'react'

interface Props {
  value: number        // 0–5
  onChange?: (v: number) => void
  readonly?: boolean
  size?: 'sm' | 'md'
}

export default function StarRating({ value, onChange, readonly, size = 'sm' }: Props) {
  const [hover, setHover] = useState(0)
  const display = hover || value
  const fontSize = size === 'md' ? 'text-lg' : 'text-sm'

  return (
    <div
      className="flex items-center gap-0.5"
      onMouseLeave={() => setHover(0)}
      title={value ? `${value} star${value !== 1 ? 's' : ''}` : 'Unrated'}
    >
      {[1, 2, 3, 4, 5].map(s => (
        <button
          key={s}
          type="button"
          disabled={readonly}
          onMouseEnter={() => !readonly && setHover(s)}
          onClick={() => onChange?.(s === value ? 0 : s)}
          className={`${fontSize} leading-none spring-icon ${readonly ? 'cursor-default' : 'cursor-pointer'}`}
          aria-label={`${s} star`}
        >
          <span style={{ color: s <= display ? 'var(--a500)' : 'var(--ghost)', transition: 'color 0.1s' }}>
            {s <= display ? '★' : '☆'}
          </span>
        </button>
      ))}
    </div>
  )
}
