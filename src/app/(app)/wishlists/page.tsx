import { createClient } from '@/lib/supabase/server'
import WishlistsClient from './WishlistsClient'

export default async function WishlistsPage({
  searchParams,
}: {
  searchParams: Promise<{ share?: string; shareTitle?: string }>
}) {
  const { share, shareTitle } = await searchParams
  const supabase = await createClient()

  const [{ data: wishlists }, { data: itemSummary }] = await Promise.all([
    supabase.from('wishlists')
      .select('id, name, description, created_at, emoji, archived')
      .order('created_at', { ascending: false }),
    supabase.from('wishlist_items')
      .select('wishlist_id, purchased, auto_price, target_price, quantity'),
  ])

  return (
    <WishlistsClient
      initialWishlists={wishlists ?? []}
      itemSummary={itemSummary ?? []}
      shareUrl={share}
      shareTitle={shareTitle}
    />
  )
}
