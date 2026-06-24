'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { DEMO_EMAIL, setDemoCookie } from '@/lib/demo/config'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Enter demo mode: no Supabase, just a cookie + pre-seeded data.
  function startDemo() {
    setDemoCookie()
    router.push('/wishlists')
    router.refresh()
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    // The demo account skips Supabase entirely (any password works).
    if (email.trim().toLowerCase() === DEMO_EMAIL) {
      startDemo()
      return
    }
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false) }
    else { router.push('/wishlists'); router.refresh() }
  }

  return (
    <>
      <h2 className="text-xl font-semibold text-ink mb-6">Sign in</h2>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-ink mb-1.5">Email</label>
          <input
            id="email" type="email" autoComplete="email" required
            value={email} onChange={e => setEmail(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-lg border border-line bg-raised text-ink placeholder:text-ghost focus:outline-none focus:ring-2 focus:border-transparent transition-colors"
            style={{ '--tw-ring-color': 'var(--a500)' } as React.CSSProperties}
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-ink mb-1.5">Password</label>
          <input
            id="password" type="password" autoComplete="current-password" required
            value={password} onChange={e => setPassword(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-lg border border-line bg-raised text-ink placeholder:text-ghost focus:outline-none focus:ring-2 focus:border-transparent transition-colors"
            style={{ '--tw-ring-color': 'var(--a500)' } as React.CSSProperties}
            placeholder="••••••••"
          />
        </div>
        <button
          type="submit" disabled={loading}
          className="w-full py-2.5 px-4 rounded-lg font-medium disabled:opacity-40 transition-colors"
          style={{ background: 'var(--a600)', color: 'var(--a-on)' }}
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <div className="my-5 flex items-center gap-3 text-xs text-ghost">
        <span className="flex-1 h-px bg-line" />
        or
        <span className="flex-1 h-px bg-line" />
      </div>

      <button
        type="button" onClick={startDemo}
        className="w-full py-2.5 px-4 rounded-lg font-medium border border-line bg-raised text-ink hover:bg-line transition-colors"
      >
        🛍️ Try the demo — no account needed
      </button>
      <p className="mt-2 text-center text-xs text-ghost">
        Explore a sample account with pre-filled wishlists and items.
      </p>

      <p className="mt-6 text-center text-sm text-dim">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="font-medium hover:opacity-80 transition-opacity" style={{ color: 'var(--a500)' }}>
          Create one free
        </Link>
      </p>
    </>
  )
}
