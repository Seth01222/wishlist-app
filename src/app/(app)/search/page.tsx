import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { DEMO_COOKIE } from '@/lib/demo/config'
import { getDemoSearchItems } from '@/lib/demo/data'
import SearchClient, { type SearchRow } from './SearchClient'

export default async function SearchPage() {
  const cookieStore = await cookies()
  if (cookieStore.get(DEMO_COOKIE)?.value === '1') {
    const items = getDemoSearchItems().map(i => ({
      id: i.id, name: i.name, image_url: i.image_url,
      auto_price: i.auto_price, target_price: i.target_price,
      priority: i.priority, status: i.status, purchased: i.purchased,
      tags: i.tags, wishlist_id: i.wishlist_id, list_name: i.list_name, list_emoji: i.list_emoji,
    })) as SearchRow[]
    return <SearchClient items={items} />
  }

  const supabase = await createClient()
  const { data } = await supabase
    .from('wishlist_items')
    .select('id, name, image_url, auto_price, target_price, priority, status, purchased, tags, wishlist_id, wishlists(name, emoji)')
    .order('priority', { ascending: false })

  type Row = {
    id: string; name: string; image_url: string | null
    auto_price: number | null; target_price: number | null
    priority: number | null; status: string | null; purchased: boolean | null
    tags: string[] | null; wishlist_id: string
    wishlists: { name: string | null; emoji: string | null } | { name: string | null; emoji: string | null }[] | null
  }

  const items: SearchRow[] = ((data ?? []) as Row[]).map(r => {
    const w = Array.isArray(r.wishlists) ? r.wishlists[0] : r.wishlists
    return {
      id: r.id, name: r.name, image_url: r.image_url,
      auto_price: r.auto_price, target_price: r.target_price,
      priority: r.priority, status: r.status, purchased: r.purchased,
      tags: r.tags, wishlist_id: r.wishlist_id,
      list_name: w?.name ?? 'List', list_emoji: w?.emoji ?? null,
    }
  })

  return <SearchClient items={items} />
}
