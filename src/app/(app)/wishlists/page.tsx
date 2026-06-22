import { createClient } from '@/lib/supabase/server'
import WishlistsClient from './WishlistsClient'

export default async function WishlistsPage() {
  const supabase = await createClient()
  const { data: wishlists } = await supabase
    .from('wishlists')
    .select('id, name, description, created_at')
    .order('created_at', { ascending: false })

  return <WishlistsClient initialWishlists={wishlists ?? []} />
}
