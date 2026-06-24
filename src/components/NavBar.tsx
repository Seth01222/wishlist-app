'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTheme } from './ThemeProvider'
import { ACCENTS } from '@/lib/theme'

export default function NavBar({ userEmail }: { userEmail: string }) {
  const router = useRouter()
  const { mode, accent, toggleMode, setAccent, taxEnabled, taxRate, setTaxEnabled, setTaxRate } = useTheme()
  const [taxInput, setTaxInput] = useState(String(taxRate || ''))
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="bg-card border-b border-line sticky top-0 z-40">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link
          href="/wishlists"
          className="flex items-center gap-2.5 font-semibold text-ink hover:text-[var(--a500)] transition-colors"
        >
          <span
            className="flex items-center justify-center w-7 h-7 rounded-lg text-sm"
            style={{ background: 'var(--a600)', color: 'var(--a-on)' }}
          >
            ♥
          </span>
          <span className="hidden sm:block">My Wishlist</span>
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Quick Add tools (bookmarklet / extension) */}
          <Link
            href="/tools"
            className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-dim hover:text-ink hover:bg-raised transition-colors text-sm font-medium"
            title="Quick Add — bookmarklet & browser extension"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/></svg>
            <span className="hidden sm:block">Quick Add</span>
          </Link>

          {/* Dark mode toggle */}
          <button
            onClick={toggleMode}
            className="p-2 rounded-lg text-dim hover:text-ink hover:bg-raised transition-colors"
            title={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {mode === 'dark' ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>

          {/* User menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu(v => !v)}
              className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg text-dim hover:text-ink hover:bg-raised transition-colors"
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                style={{ background: 'var(--a600)', color: 'var(--a-on)' }}
              >
                {userEmail[0].toUpperCase()}
              </div>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showMenu && (
              <div className="absolute right-0 top-full mt-1.5 w-56 bg-card border border-line rounded-xl shadow-xl overflow-hidden z-50">
                {/* Email */}
                <div className="px-4 py-3 border-b border-line">
                  <p className="text-xs text-ghost">Signed in as</p>
                  <p className="text-sm font-medium text-ink truncate mt-0.5">{userEmail}</p>
                </div>

                {/* Accent color picker */}
                <div className="px-4 py-3 border-b border-line">
                  <p className="text-xs text-ghost mb-2">Accent color</p>
                  <div className="flex gap-1.5">
                    {ACCENTS.map(a => (
                      <button
                        key={a.id}
                        onClick={() => setAccent(a.id)}
                        title={a.label}
                        className="w-6 h-6 rounded-full transition-transform hover:scale-110"
                        style={{
                          background: a.hex,
                          outline: accent === a.id ? `2px solid ${a.hex}` : 'none',
                          outlineOffset: '2px',
                          boxShadow: accent === a.id ? '0 0 0 1px var(--line)' : 'none',
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Sales tax */}
                <div className="px-4 py-3 border-b border-line">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-ghost">Sales tax</p>
                    <button
                      role="switch"
                      aria-checked={taxEnabled}
                      onClick={() => setTaxEnabled(!taxEnabled)}
                      className={`relative w-8 rounded-full transition-colors spring ${taxEnabled ? '' : 'bg-line'}`}
                      style={{ height: '18px', ...(taxEnabled ? { background: 'var(--a600)' } : {}) }}
                    >
                      <span
                        className="absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-transform"
                        style={{ transform: taxEnabled ? 'translateX(14px)' : 'translateX(0)' }}
                      />
                    </button>
                  </div>
                  {taxEnabled && (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max="30"
                        step="0.01"
                        value={taxInput}
                        onChange={e => {
                          setTaxInput(e.target.value)
                          const n = parseFloat(e.target.value)
                          if (!isNaN(n) && n >= 0) setTaxRate(n)
                        }}
                        placeholder="8.25"
                        className="w-20 px-2 py-1 text-sm rounded-lg border border-line bg-raised text-ink focus:outline-none focus:ring-2 focus:border-transparent"
                        style={{ '--tw-ring-color': 'var(--a500)' } as React.CSSProperties}
                        autoFocus
                      />
                      <span className="text-sm text-dim">% rate</span>
                    </div>
                  )}
                </div>

                {/* Sign out */}
                <button
                  onClick={() => { setShowMenu(false); handleSignOut() }}
                  className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-dim hover:text-red-400 hover:bg-red-500/5 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
