import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { DEMO_COOKIE } from '@/lib/demo/config'
import { getDemoWishlists, getDemoItemSummary, getDemoCollections } from '@/lib/demo/data'
import SchemaNotice from '@/components/SchemaNotice'
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
        initialCollections={getDemoCollections()}
        {...shareProps}
      />
    )
  }

  const supabase = await createClient()
  let schemaOutdated = false

  // Newer columns (collection_id, sort_order). Fall back to the base columns if
  // the database hasn't been migrated yet, instead of returning nothing.
  let { data: wishlists, error: wlErr } = await supabase.from('wishlists')
    .select('id, name, description, created_at, emoji, archived, collection_id, sort_order')
    .order('created_at', { ascending: false })
  if (wlErr) {
    schemaOutdated = true
    const fb = await supabase.from('wishlists')
      .select('id, name, description, created_at, emoji, archived')
      .order('created_at', { ascending: false })
    wishlists = (fb.data ?? []) as typeof wishlists
  }

  const [{ data: itemSummary }, colRes] = await Promise.all([
    supabase.from('wishlist_items').select('wishlist_id, purchased, auto_price, target_price, quantity'),
    supabase.from('collections').select('id, name, emoji, description, color, sort_order').order('sort_order', { ascending: true }),
  ])
  if (colRes.error) schemaOutdated = true

  return (
    <>
      {schemaOutdated && <SchemaNotice />}
      <WishlistsClient
        initialWishlists={wishlists ?? []}
        itemSummary={itemSummary ?? []}
        initialCollections={colRes.data ?? []}
        {...shareProps}
      />
    </>
  )
}
