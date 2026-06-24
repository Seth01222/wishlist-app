import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { DEMO_COOKIE } from '@/lib/demo/config'
import { getDemoWishlist, getDemoItems, getDemoOtherLists } from '@/lib/demo/data'
import WishlistDetailClient from './WishlistDetailClient'

export default async function WishlistDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const cookieStore = await cookies()
  if (cookieStore.get(DEMO_COOKIE)?.value === '1') {
    const demoWishlist = getDemoWishlist(id)
    if (!demoWishlist) notFound()
    return (
      <WishlistDetailClient
        wishlist={demoWishlist}
        initialItems={getDemoItems(id)}
        otherLists={getDemoOtherLists()}
      />
    )
  }

  const supabase = await createClient()

  const [{ data: wishlist }, { data: items }, { data: allLists }] = await Promise.all([
    supabase.from('wishlists').select('id, name, description').eq('id', id).single(),
    supabase.from('wishlist_items')
      .select('id, name, url, image_url, notes, target_price, auto_price, auto_currency, star_rating, quantity, purchased, purchased_at, tags, created_at')
      .eq('wishlist_id', id)
      .order('created_at', { ascending: false }),
    supabase.from('wishlists').select('id, name, emoji').order('name'),
  ])

  if (!wishlist) notFound()

  return (
    <WishlistDetailClient
      wishlist={wishlist}
      initialItems={items ?? []}
      otherLists={allLists ?? []}
    />
  )
}
