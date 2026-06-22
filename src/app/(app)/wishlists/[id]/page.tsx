import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import WishlistDetailClient from './WishlistDetailClient'

export default async function WishlistDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: wishlist } = await supabase
    .from('wishlists')
    .select('id, name, description')
    .eq('id', id)
    .single()

  if (!wishlist) notFound()

  const { data: items } = await supabase
    .from('wishlist_items')
    .select('id, name, url, image_url, notes, target_price, priority, tags, created_at')
    .eq('wishlist_id', id)
    .order('created_at', { ascending: false })

  return <WishlistDetailClient wishlist={wishlist} initialItems={items ?? []} />
}
