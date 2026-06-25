import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { DEMO_COOKIE } from '@/lib/demo/config'
import { getDemoWishlist, getDemoItems, getDemoOtherLists, getDemoPriceHistory } from '@/lib/demo/data'
import type { PriceRecord } from '@/lib/price'
import SchemaNotice from '@/components/SchemaNotice'
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
        historyByItem={getDemoPriceHistory(id)}
      />
    )
  }

  const supabase = await createClient()
  let schemaOutdated = false

  // Header — try with budget, fall back without it on un-migrated DBs.
  let { data: wishlist, error: wErr } = await supabase.from('wishlists').select('id, name, description, budget').eq('id', id).single()
  if (wErr) {
    const fb = await supabase.from('wishlists').select('id, name, description').eq('id', id).single()
    wishlist = fb.data as typeof wishlist
    if (fb.data) schemaOutdated = true
  }
  if (!wishlist) notFound()

  // Items — try with the new columns, fall back to the base set.
  const fullItemCols = 'id, name, url, image_url, notes, target_price, auto_price, auto_currency, star_rating, quantity, purchased, purchased_at, tags, priority, status, sort_order, created_at'
  const baseItemCols = 'id, name, url, image_url, notes, target_price, auto_price, auto_currency, star_rating, quantity, purchased, purchased_at, tags, created_at'
  let { data: items, error: iErr } = await supabase.from('wishlist_items').select(fullItemCols).eq('wishlist_id', id).order('created_at', { ascending: false })
  if (iErr) {
    schemaOutdated = true
    const fb = await supabase.from('wishlist_items').select(baseItemCols).eq('wishlist_id', id).order('created_at', { ascending: false })
    items = (fb.data ?? []) as typeof items
  }

  const { data: allLists } = await supabase.from('wishlists').select('id, name, emoji').order('name')

  // Price history (table may not exist yet).
  const itemIds = (items ?? []).map(i => i.id)
  const historyByItem: Record<string, PriceRecord[]> = {}
  if (itemIds.length > 0) {
    const { data: records, error: pErr } = await supabase
      .from('price_records')
      .select('item_id, price, currency, recorded_at')
      .in('item_id', itemIds)
      .order('recorded_at', { ascending: true })
    if (pErr) schemaOutdated = true
    for (const r of records ?? []) {
      ;(historyByItem[r.item_id] ??= []).push({ price: Number(r.price), currency: r.currency, recorded_at: r.recorded_at })
    }
  }

  return (
    <>
      {schemaOutdated && <SchemaNotice />}
      <WishlistDetailClient
        wishlist={wishlist}
        initialItems={items ?? []}
        otherLists={allLists ?? []}
        historyByItem={historyByItem}
      />
    </>
  )
}
