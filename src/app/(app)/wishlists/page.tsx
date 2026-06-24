import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { DEMO_COOKIE } from '@/lib/demo/config'
import { getDemoWishlists, getDemoItemSummary } from '@/lib/demo/data'
import WishlistsClient from './WishlistsClient'

export default async function WishlistsPage({
  searchParams,
}: {
  searchParams: Promise<{
    share?: string; shareTitle?: string
    sharePrice?: string; shareImage?: string; shareCurrency?: string
  }>
}) {
  const { share, shareTitle, sharePrice, shareImage, shareCurrency } = await searchParams
  // Quick-add payload from the bookmarklet / extension / iOS Share Sheet.
  const shareProps = { shareUrl: share, shareTitle, sharePrice, shareImage, shareCurrency }

  const cookieStore = await cookies()
  if (cookieStore.get(DEMO_COOKIE)?.value === '1') {
    return (
      <WishlistsClient
        initialWishlists={getDemoWishlists()}
        itemSummary={getDemoItemSummary()}
        {...shareProps}
      />
    )
  }

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
      {...shareProps}
    />
  )
}
