import { createBrowserClient } from '@supabase/ssr'
import { isDemoBrowser } from '@/lib/demo/config'
import { createDemoClient } from '@/lib/demo/mockClient'

export function createClient() {
  // In demo mode, swap in an in-memory client so reads/writes never touch
  // Supabase (and never error on a missing/invalid key).
  if (isDemoBrowser()) {
    return createDemoClient() as unknown as ReturnType<typeof createBrowserClient>
  }
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
