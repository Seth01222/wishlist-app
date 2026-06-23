import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import WishlistDetailClient from './WishlistDetailClient'

export default async function WishlistDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
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
