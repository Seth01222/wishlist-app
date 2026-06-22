import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import NavBar from '@/components/NavBar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen flex flex-col">
      <NavBar userEmail={user.email ?? ''} />
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  )
}
