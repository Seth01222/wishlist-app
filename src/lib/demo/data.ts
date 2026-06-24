// Seed data for demo mode. The shapes below mirror the Supabase rows the real
// pages query, so the selector functions can feed the existing client
// components without any changes to those components.

const img = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=600&q=80&auto=format&fit=crop`

// Build an ISO timestamp `daysAgo` days before now, so "sort by date" looks real.
const daysAgo = (d: number) => new Date(Date.now() - d * 86_400_000).toISOString()

export type DemoWishlist = {
  id: string
  name: string
  description: string | null
  emoji: string | null
  archived: boolean
  budget: number | null
  created_at: string
}

export type DemoPriceRecord = {
  id: string
  item_id: string
  price: number
  currency: string
  source: string
  recorded_at: string
}

export type DemoItem = {
  id: string
  wishlist_id: string
  name: string
  url: string | null
  image_url: string | null
  notes: string | null
  target_price: number | null
  auto_price: number | null
  auto_currency: string | null
  star_rating: number
  quantity: number
  purchased: boolean
  purchased_at: string | null
  tags: string[] | null
  created_at: string
}

const WISHLISTS: DemoWishlist[] = [
  { id: 'list-tech',    name: 'Tech & Gadgets',    description: 'Upgrades for my desk setup',          emoji: '🎧', archived: false, budget: 1200, created_at: daysAgo(2) },
  { id: 'list-wardrobe',name: 'Wardrobe Refresh',  description: 'Spring clothing haul',                 emoji: '👟', archived: false, budget: 650,  created_at: daysAgo(9) },
  { id: 'list-birthday',name: 'Birthday Wishlist',  description: 'Ideas for friends & family to grab',   emoji: '🎂', archived: false, budget: 150,  created_at: daysAgo(15) },
  { id: 'list-home',    name: 'Home & Kitchen',     description: 'Making the apartment nicer',           emoji: '🏠', archived: false, budget: 800,  created_at: daysAgo(28) },
  { id: 'list-gaming',  name: 'Gaming Setup',       description: 'Saved for later — already finished!',  emoji: '🎮', archived: true,  budget: 1500, created_at: daysAgo(60) },
]

const ITEMS: DemoItem[] = [
  // ── Tech & Gadgets ───────────────────────────────────────────────
  { id: 'i-headphones', wishlist_id: 'list-tech', name: 'Sony WH-1000XM5 Noise-Cancelling Headphones',
    url: 'https://www.amazon.com/dp/B09XS7JWHH', image_url: img('1505740420928-5e560c06d30e'),
    notes: 'Wait for a sale — these drop to ~$330 around the holidays.', target_price: 330, auto_price: 398, auto_currency: 'USD',
    star_rating: 5, quantity: 1, purchased: false, purchased_at: null, tags: ['audio', 'work', 'travel'], created_at: daysAgo(2) },
  { id: 'i-keyboard', wishlist_id: 'list-tech', name: 'Keychron K2 Mechanical Keyboard (Brown switches)',
    url: 'https://www.keychron.com/products/keychron-k2-wireless-mechanical-keyboard', image_url: img('1587829741301-dc798b83add3'),
    notes: 'Hot-swappable version so I can try different switches.', target_price: 80, auto_price: 89, auto_currency: 'USD',
    star_rating: 4, quantity: 1, purchased: false, purchased_at: null, tags: ['desk', 'accessories'], created_at: daysAgo(3) },
  { id: 'i-monitor', wishlist_id: 'list-tech', name: 'Dell UltraSharp 27" 4K Monitor (U2723QE)',
    url: 'https://www.dell.com/en-us/shop/dell-ultrasharp-27-4k-usb-c-hub-monitor-u2723qe', image_url: img('1527443224154-c4a3942d3acf'),
    notes: 'USB-C hub means one cable to the laptop. Big want.', target_price: 480, auto_price: 569, auto_currency: 'USD',
    star_rating: 5, quantity: 1, purchased: false, purchased_at: null, tags: ['desk', 'work'], created_at: daysAgo(5) },
  { id: 'i-smartwatch', wishlist_id: 'list-tech', name: 'Apple Watch Series 9 (GPS, 45mm)',
    url: 'https://www.apple.com/apple-watch-series-9/', image_url: img('1523275335684-37898b6baf30'),
    notes: 'Got this for my birthday 🎉', target_price: 400, auto_price: 429, auto_currency: 'USD',
    star_rating: 5, quantity: 1, purchased: true, purchased_at: daysAgo(1), tags: ['wearable'], created_at: daysAgo(6) },

  // ── Wardrobe Refresh ─────────────────────────────────────────────
  { id: 'i-shoes', wishlist_id: 'list-wardrobe', name: 'Nike Pegasus 41 Running Shoes',
    url: 'https://www.nike.com/t/pegasus-41-mens-road-running-shoes', image_url: img('1542291026-7eec264c27ff'),
    notes: 'Size 10.5. Need a new pair before the half marathon.', target_price: 110, auto_price: 140, auto_currency: 'USD',
    star_rating: 4, quantity: 1, purchased: false, purchased_at: null, tags: ['shoes', 'running'], created_at: daysAgo(9) },
  { id: 'i-jacket', wishlist_id: 'list-wardrobe', name: 'Patagonia Nano Puff Insulated Jacket',
    url: 'https://www.patagonia.com/product/mens-nano-puff-jacket/', image_url: img('1551028719-00167b16eac5'),
    notes: 'Navy or black. Great for layering.', target_price: 180, auto_price: 239, auto_currency: 'USD',
    star_rating: 5, quantity: 1, purchased: false, purchased_at: null, tags: ['outerwear'], created_at: daysAgo(10) },
  { id: 'i-jeans', wishlist_id: 'list-wardrobe', name: "Levi's 511 Slim Fit Jeans",
    url: 'https://www.levi.com/US/en_US/clothing/men/jeans/511-slim-fit-mens-jeans', image_url: img('1542272604-787c3835535d'),
    notes: null, target_price: 50, auto_price: 69, auto_currency: 'USD',
    star_rating: 4, quantity: 2, purchased: false, purchased_at: null, tags: ['basics'], created_at: daysAgo(12) },
  { id: 'i-sunglasses', wishlist_id: 'list-wardrobe', name: 'Ray-Ban Wayfarer Sunglasses',
    url: 'https://www.ray-ban.com/usa/sunglasses/wayfarer', image_url: img('1511499767150-a48a237f0083'),
    notes: 'Classic black frames.', target_price: 130, auto_price: 161, auto_currency: 'USD',
    star_rating: 3, quantity: 1, purchased: false, purchased_at: null, tags: ['accessories'], created_at: daysAgo(13) },

  // ── Birthday Wishlist ────────────────────────────────────────────
  { id: 'i-book', wishlist_id: 'list-birthday', name: 'Project Hail Mary by Andy Weir (Hardcover)',
    url: 'https://www.amazon.com/dp/0593135202', image_url: img('1544947950-fa07a98d237f'),
    notes: 'Everyone says this is incredible.', target_price: 18, auto_price: 24, auto_currency: 'USD',
    star_rating: 5, quantity: 1, purchased: false, purchased_at: null, tags: ['books'], created_at: daysAgo(15) },
  { id: 'i-boardgame', wishlist_id: 'list-birthday', name: 'Catan Board Game',
    url: 'https://www.amazon.com/dp/B00U26V4VQ', image_url: img('1610890716171-6b1bb98ffd09'),
    notes: 'For game nights.', target_price: 35, auto_price: 44, auto_currency: 'USD',
    star_rating: 4, quantity: 1, purchased: false, purchased_at: null, tags: ['games', 'family'], created_at: daysAgo(16) },
  { id: 'i-frother', wishlist_id: 'list-birthday', name: 'Aeropress Coffee Maker',
    url: 'https://aeropress.com/products/aeropress-coffee-maker', image_url: img('1495474472287-4d71bcdd2085'),
    notes: 'Best cup of coffee for camping trips.', target_price: 30, auto_price: 39, auto_currency: 'USD',
    star_rating: 5, quantity: 1, purchased: false, purchased_at: null, tags: ['coffee', 'kitchen'], created_at: daysAgo(18) },
  { id: 'i-lego', wishlist_id: 'list-birthday', name: 'LEGO Botanicals — Dried Flower Bouquet',
    url: 'https://www.lego.com/en-us/product/dried-flower-centerpiece-10314', image_url: img('1585366119957-e9730b6d0f60'),
    notes: 'Looks great on a shelf and never wilts.', target_price: 50, auto_price: 59, auto_currency: 'USD',
    star_rating: 4, quantity: 1, purchased: true, purchased_at: daysAgo(4), tags: ['decor'], created_at: daysAgo(20) },

  // ── Home & Kitchen ───────────────────────────────────────────────
  { id: 'i-airfryer', wishlist_id: 'list-home', name: 'Ninja Air Fryer (4 qt)',
    url: 'https://www.amazon.com/dp/B07FDJMC9Q', image_url: img('1626074353765-517a681e40be'),
    notes: 'Perfect size for two people.', target_price: 80, auto_price: 99, auto_currency: 'USD',
    star_rating: 5, quantity: 1, purchased: false, purchased_at: null, tags: ['kitchen', 'appliances'], created_at: daysAgo(28) },
  { id: 'i-vacuum', wishlist_id: 'list-home', name: 'iRobot Roomba j7+ Robot Vacuum',
    url: 'https://www.amazon.com/dp/B094NQNDXX', image_url: img('1558317374-067fb5f30001'),
    notes: 'Self-emptying base is the dream. Splurge item.', target_price: 500, auto_price: 599, auto_currency: 'USD',
    star_rating: 4, quantity: 1, purchased: false, purchased_at: null, tags: ['appliances', 'cleaning'], created_at: daysAgo(30) },
  { id: 'i-knives', wishlist_id: 'list-home', name: 'Victorinox 8" Chef Knife',
    url: 'https://www.amazon.com/dp/B000638D32', image_url: img('1593618998160-e34014e67546'),
    notes: 'Highest-rated budget chef knife.', target_price: 40, auto_price: 45, auto_currency: 'USD',
    star_rating: 5, quantity: 1, purchased: false, purchased_at: null, tags: ['kitchen'], created_at: daysAgo(33) },

  // ── Gaming Setup (archived) ──────────────────────────────────────
  { id: 'i-console', wishlist_id: 'list-gaming', name: 'PlayStation 5 Slim Console',
    url: 'https://www.amazon.com/dp/B0CL5KNB9M', image_url: img('1486401899868-0e435ed85128'),
    notes: null, target_price: 450, auto_price: 499, auto_currency: 'USD',
    star_rating: 5, quantity: 1, purchased: true, purchased_at: daysAgo(45), tags: ['console'], created_at: daysAgo(60) },
  { id: 'i-controller', wishlist_id: 'list-gaming', name: 'DualSense Wireless Controller',
    url: 'https://www.amazon.com/dp/B08FC6C75Y', image_url: img('1592840496694-26d035b52b48'),
    notes: 'Second controller for co-op.', target_price: 60, auto_price: 69, auto_currency: 'USD',
    star_rating: 4, quantity: 2, purchased: true, purchased_at: daysAgo(45), tags: ['accessories'], created_at: daysAgo(58) },
  { id: 'i-chair', wishlist_id: 'list-gaming', name: 'Secretlab TITAN Evo Gaming Chair',
    url: 'https://secretlab.co/products/titan-evo', image_url: img('1598550476439-6847785fcea6'),
    notes: 'Worth every penny for long sessions.', target_price: 480, auto_price: 549, auto_currency: 'USD',
    star_rating: 5, quantity: 1, purchased: true, purchased_at: daysAgo(50), tags: ['furniture'], created_at: daysAgo(59) },
]

/* ── Synthetic price history ──────────────────────────────────────
 * Real price history accumulates over time in the price_records table. For the
 * demo we generate a believable series per item (deterministic, so it's stable
 * across renders) ending at the item's current auto_price. Some items trend
 * down to their lowest-ever today, others wobble — so the sparkline, "lowest
 * ever", and price-drop insights all have something to show.
 */
function seeded(seed: string) {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619) }
  return () => { h += 0x6d2b79f5; let t = h; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}

const HISTORY: Record<string, DemoPriceRecord[]> = (() => {
  const out: Record<string, DemoPriceRecord[]> = {}
  for (const it of ITEMS) {
    const end = it.auto_price ?? it.target_price
    if (end == null) continue
    const rnd = seeded(it.id)
    const start = new Date(it.created_at).getTime()
    const span = Date.now() - start
    const points = 6 + Math.floor(rnd() * 4) // 6–9 points
    // Half the items drift down to "lowest today"; others started lower.
    const trendDown = rnd() > 0.5
    const startMult = trendDown ? 1 + (0.12 + rnd() * 0.18) : 1 - (0.05 + rnd() * 0.08)
    const recs: DemoPriceRecord[] = []
    for (let p = 0; p < points; p++) {
      const f = p / (points - 1)
      const base = end * (startMult + (1 - startMult) * f)
      const noise = p === points - 1 ? 1 : 1 + (rnd() - 0.5) * 0.06
      const price = Math.max(1, Math.round(base * noise * 100) / 100)
      recs.push({
        id: `${it.id}-h${p}`,
        item_id: it.id,
        price: p === points - 1 ? Number(end) : price,
        currency: it.auto_currency ?? 'USD',
        source: p === points - 1 ? 'auto' : 'auto',
        recorded_at: new Date(start + (span * p) / (points - 1)).toISOString(),
      })
    }
    out[it.id] = recs
  }
  return out
})()

/* ── Selectors that match each page's Supabase query shape ── */

// Wishlists list page: ordered by created_at descending.
export function getDemoWishlists() {
  return [...WISHLISTS].sort((a, b) => b.created_at.localeCompare(a.created_at))
}

// Price history for every item in a list, keyed by item id (oldest → newest).
export function getDemoPriceHistory(wishlistId: string): Record<string, DemoPriceRecord[]> {
  const out: Record<string, DemoPriceRecord[]> = {}
  for (const it of ITEMS) {
    if (it.wishlist_id === wishlistId && HISTORY[it.id]) out[it.id] = HISTORY[it.id]
  }
  return out
}

// Lightweight per-item rows used for list cards' counts/totals.
export function getDemoItemSummary() {
  return ITEMS.map(i => ({
    wishlist_id: i.wishlist_id,
    purchased: i.purchased,
    auto_price: i.auto_price,
    target_price: i.target_price,
    quantity: i.quantity,
  }))
}

// Single wishlist header for the detail page (id, name, description, budget).
export function getDemoWishlist(id: string) {
  const w = WISHLISTS.find(w => w.id === id)
  return w ? { id: w.id, name: w.name, description: w.description, budget: w.budget } : null
}

// Items for a list, newest first. (The detail page's Item type doesn't include
// wishlist_id; leaving the extra field on the object is harmless.)
export function getDemoItems(wishlistId: string) {
  return ITEMS.filter(i => i.wishlist_id === wishlistId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
}

// Used by the "move item to another list" dropdown.
export function getDemoOtherLists() {
  return [...WISHLISTS]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(w => ({ id: w.id, name: w.name, emoji: w.emoji }))
}
