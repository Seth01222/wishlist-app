'use client'

import { useState } from 'react'

// Re-fetch the current price for a single item. Shows inline loading / success /
// "couldn't fetch" feedback (retailers like Amazon often block the request).
export default function RecheckButton({ onClick, className = '' }: { onClick: () => Promise<boolean>; className?: string }) {
  const [state, setState] = useState<'idle' | 'loading' | 'ok' | 'fail'>('idle')

  async function go(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation()
    if (state === 'loading') return
    setState('loading')
    let ok = false
    try { ok = await onClick() } catch { ok = false }
    setState(ok ? 'ok' : 'fail')
    setTimeout(() => setState('idle'), 2200)
  }

  const title = state === 'fail' ? "Couldn't fetch price (site may block it)" : state === 'ok' ? 'Price updated' : 'Re-check price'
  const color = state === 'ok' ? 'text-emerald-500' : state === 'fail' ? 'text-amber-500' : 'text-ghost hover:text-ink'

  return (
    <button onClick={go} title={title} className={`inline-flex items-center gap-1 text-[11px] font-medium spring ${color} ${className}`}>
      {state === 'ok' ? (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
      ) : state === 'fail' ? (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
      ) : (
        <svg className={`w-3.5 h-3.5 ${state === 'loading' ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
      )}
      <span>{state === 'loading' ? 'Checking…' : state === 'ok' ? 'Updated' : state === 'fail' ? 'Blocked' : 'Re-check'}</span>
    </button>
  )
}
