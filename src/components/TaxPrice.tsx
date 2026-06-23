'use client'

import { useTheme } from './ThemeProvider'

const fmtCurrency = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })

interface Props {
  /** Raw base price in dollars */
  price: number
  /** How to render:
   *  'card'   — two lines: big after-tax price + small "+$X.XX tax" below
   *  'row'    — one line: after-tax price + tiny "incl. tax" badge
   *  'total'  — one line: after-tax total + small "w/ X% tax" suffix
   */
  variant?: 'card' | 'row' | 'total'
  className?: string
}

export default function TaxPrice({ price, variant = 'card', className = '' }: Props) {
  const { taxEnabled, taxRate } = useTheme()
  const taxAmt = taxEnabled && taxRate > 0 ? price * (taxRate / 100) : 0
  const total  = price + taxAmt

  if (variant === 'card') {
    return (
      <div className={className}>
        <span className="font-bold text-lg" style={{ color: 'var(--a500)' }}>
          {fmtCurrency(total)}
        </span>
        {taxEnabled && taxRate > 0 && (
          <span className="block text-xs text-ghost mt-0.5">
            {fmtCurrency(price)} + {fmtCurrency(taxAmt)} tax
          </span>
        )}
      </div>
    )
  }

  if (variant === 'row') {
    return (
      <span className={`inline-flex items-center gap-1 ${className}`}>
        <span className="font-bold text-sm" style={{ color: 'var(--a500)' }}>
          {fmtCurrency(total)}
        </span>
        {taxEnabled && taxRate > 0 && (
          <span className="text-[10px] px-1 py-0.5 rounded bg-raised text-ghost leading-none">
            tax
          </span>
        )}
      </span>
    )
  }

  // 'total' variant
  return (
    <span className={`inline-flex items-baseline gap-1.5 ${className}`}>
      <span>{fmtCurrency(total)}</span>
      {taxEnabled && taxRate > 0 && (
        <span className="text-xs text-ghost font-normal">w/ {taxRate}% tax</span>
      )}
    </span>
  )
}
