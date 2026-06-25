@AGENTS.md

# Wishlist App — Project Reference

A personal wishlist PWA that tracks products, looks up prices, and syncs across all devices.

## Hard Constraints
- **Everything must stay FREE.** Stop and explain tradeoffs before using any paid service.
- **Price lookup must use only free or official-free methods** — or user-supplied API keys for optional paid modes.

## Stack
| Layer | Tool | Why free |
|---|---|---|
| Frontend + API | Next.js 16 (App Router, TypeScript) | Open source |
| Styling | Tailwind CSS v4 | Open source |
| Hosting | Vercel free tier | Free for personal projects |
| Auth + Database + Realtime | Supabase free tier | 500MB DB, 50k MAU, 2 projects |
| PWA | Custom service worker (`public/sw.js`) + `manifest.json` | No dependency |

> **Next.js 16 note:** middleware was renamed — the auth gate lives in
> `src/proxy.ts` and exports a `proxy()` function (not `middleware.ts`). See
> AGENTS.md before writing framework code.

## Price Lookup — Three Modes
Users can choose any mode per lookup:

1. **URL Mode (free, always):** User pastes a product URL. App fetches that page and reads price from structured data (JSON-LD / microdata). Works on most major retailers. May break if a site changes its markup. Free forever.

2. **SerpAPI Mode (free tier: 100 searches/month):** App queries Google Shopping via SerpAPI. Shows prices from multiple retailers for a search query. Requires a free SerpAPI account (key stored in user's Supabase profile). 100/month is enough for light personal use.

3. **Claude AI Mode (pay-per-use, user's own key):** User provides their own Anthropic API key. Claude searches the web and compares prices intelligently. Very cheap (~$0.01–0.05 per search). User controls when to use it. Key stored encrypted in Supabase.

## Database Schema
The source of truth is [`supabase/schema.sql`](supabase/schema.sql) (run it in the
Supabase SQL editor to recreate the DB). Current tables:
- `collections` — master lists (a level above categories): `user_id`, `name`, `emoji`,
  `description`, `color` (accent id), `sort_order`, `created_at`
- `wishlists` — categories within a master list: `user_id`, `name`, `description`, `emoji`,
  `archived`, `budget`, `collection_id`, `sort_order`, `created_at`
- `wishlist_items` — items in a list: `wishlist_id`, `name`, `url`, `image_url`, `notes`,
  `target_price`, `auto_price`, `auto_currency`, `star_rating`, `quantity`, `purchased`,
  `purchased_at`, `tags`, `priority` (0–3), `status` ('want'|'saved'|'got'; 'got' ⟺
  `purchased`), `sort_order`, `created_at`
- `price_records` — price history per item: `item_id`, `price`, `currency`, `source`,
  `recorded_at` (powers sparkline / lowest-ever / drop badges)
- `profiles` — per-user settings: `id` (= auth user id), `serpapi_key`, `created_at`

**Security:** the app's SELECT queries do not filter by `user_id`; per-user isolation is
enforced entirely by Row Level Security (policies in `schema.sql`). RLS must stay enabled.

Planned tables (not built yet):
- `price_records` — price history per item (feature #10)
- public sharing — `share_token` / `is_shared` (feature #12)

## Feature Build Order
(✅ = built, ⬜ = planned)
1. ✅ Project setup + git + GitHub connection
2. ✅ Supabase + auth (sign up / log in)
3. ✅ Create and manage wishlists (CRUD)
4. ✅ Add items to wishlists (manual entry)
5. ✅ Price lookup — URL mode (`src/app/api/fetch-url`), best-effort (blocked by Amazon etc.)
   - ✅ Automatic capture via bookmarklet + browser extension (`extension/`, `/tools`) —
     runs in the user's browser so it works on Amazon. Shared extractor: `extension/extract.js`.
6. 🟡 Price lookup — SerpAPI mode: "search by name" implemented (`/api/search`, `/tools`,
   user's key in `profiles`). Query-based, not the originally-planned URL-based flow.
7. ⬜ Price lookup — Claude AI mode
8. ✅ PWA setup (installable on iPhone + Mac)
9. ⬜ Price alerts (email when price drops below target)
10. ✅ Price history charts — "price smarts": per-item sparkline, target progress bar,
    lowest-ever / drop badges, per-item re-check, per-list budget meter. Customizable via
    the "Price insights" settings (localStorage; `src/lib/usePriceInsights.tsx`).
    Components in `src/components/price/`; pure helpers in `src/lib/price.ts`.
11. ✅ Tags + priority ranking (tags, star rating, real `priority` field with badges/sort/filter)
12. ⬜ Shareable lists (public link) — note: `/share-target` only *receives* iOS shares

## Organization (master lists, statuses, bulk, search)
- **Master lists** (`collections`): a top-level grouping above categories, switched via the
  pill switcher on `/wishlists` (`CollectionSwitcher`/`CollectionModal`). Customizable emoji,
  color, name, description. Categories carry `collection_id`.
- **Statuses**: items are `want` → `saved` (set aside) → `got`. `got` stays in sync with
  `purchased`. The list budget meter intertwines: got/saved/want segments vs. budget.
- **Priority**: 0–3 (`PRIORITY_META` in `src/lib/itemMeta.ts`), with badges, sort, filter, bulk.
- **Bulk actions** (`BulkBar`): select items → set status/priority, move, delete.
- **Drag-to-reorder**: "Manual order" sort persists `sort_order`.
- **Global search**: `/search` searches all items with status/priority/tag/price filters.

## Demo Mode
A no-account demo is gated by the `wl-demo` cookie (`src/lib/demo/`). It serves
seeded data and swaps in an in-memory Supabase mock so writes don't hit the DB.
See the README's "Demo mode" section.

## User
- Complete beginner — explain everything in plain language
- Already has GitHub; needs Vercel + Supabase accounts (walk through creation)
- Tracks: Amazon, electronics, clothing, general merchandise
