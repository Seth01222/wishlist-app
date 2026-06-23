'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password !== confirmPassword) { setError("Passwords don't match."); return }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: `${window.location.origin}/wishlists` },
    })
    if (error) { setError(error.message); setLoading(false) }
    else { setMessage('Check your email for a confirmation link, then sign in.'); setLoading(false) }
  }

  if (message) {
    return (
      <div className="text-center">
        <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--a50)' }}>
          <svg className="w-6 h-6" style={{ color: 'var(--a500)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-ink mb-2">Check your email</h3>
        <p className="text-dim text-sm">{message}</p>
        <Link href="/login" className="mt-4 inline-block text-sm font-medium hover:opacity-80 transition-opacity" style={{ color: 'var(--a500)' }}>
          Back to sign in
        </Link>
      </div>
    )
  }

  const inputClass = "w-full px-3.5 py-2.5 rounded-lg border border-line bg-raised text-ink placeholder:text-ghost focus:outline-none focus:ring-2 focus:border-transparent transition-colors"
  const inputStyle = { '--tw-ring-color': 'var(--a500)' } as React.CSSProperties

  return (
    <>
      <h2 className="text-xl font-semibold text-ink mb-6">Create your account</h2>
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
      )}
      <form onSubmit={handleSignup} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-ink mb-1.5">Email</label>
          <input id="email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} className={inputClass} style={inputStyle} placeholder="you@example.com" />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-ink mb-1.5">Password</label>
          <input id="password" type="password" autoComplete="new-password" required value={password} onChange={e => setPassword(e.target.value)} className={inputClass} style={inputStyle} placeholder="At least 8 characters" />
        </div>
        <div>
          <label htmlFor="confirm" className="block text-sm font-medium text-ink mb-1.5">Confirm password</label>
          <input id="confirm" type="password" autoComplete="new-password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={inputClass} style={inputStyle} placeholder="••••••••" />
        </div>
        <button
          type="submit" disabled={loading}
          className="w-full py-2.5 px-4 rounded-lg font-medium disabled:opacity-40 transition-colors"
          style={{ background: 'var(--a600)', color: 'var(--a-on)' }}
        >
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-dim">
        Already have an account?{' '}
        <Link href="/login" className="font-medium hover:opacity-80 transition-opacity" style={{ color: 'var(--a500)' }}>
          Sign in
        </Link>
      </p>
    </>
  )
}
