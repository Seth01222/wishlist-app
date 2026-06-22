'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function NavBar({ userEmail }: { userEmail: string }) {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <Link href="/wishlists" className="flex items-center gap-2.5 font-semibold text-slate-900 hover:text-indigo-600 transition">
          <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-600">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </span>
          My Wishlist
        </Link>

        <div className="flex items-center gap-4">
          <span className="hidden sm:block text-sm text-slate-500 truncate max-w-[200px]">{userEmail}</span>
          <button
            onClick={handleSignOut}
            className="text-sm text-slate-600 hover:text-slate-900 font-medium transition px-3 py-1.5 rounded-lg hover:bg-slate-100"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  )
}
