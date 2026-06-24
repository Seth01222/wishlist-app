import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { DEMO_COOKIE, DEMO_EMAIL } from '@/lib/demo/config'
import NavBar from '@/components/NavBar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const isDemo = cookieStore.get(DEMO_COOKIE)?.value === '1'

  let email = DEMO_EMAIL
  if (!isDemo) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      redirect('/login')
    }
    email = user.email ?? ''
  }

  return (
    <div className="min-h-screen flex flex-col">
      <NavBar userEmail={email} />
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  )
}
