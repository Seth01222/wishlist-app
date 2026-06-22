@AGENTS.md

# Wishlist App — Project Reference

A personal wishlist PWA that tracks products, looks up prices, and syncs across all devices.

## Hard Constraints
- **Everything must stay FREE.** Stop and explain tradeoffs before using any paid service.
- **Price lookup must use only free or official-free methods** — or user-supplied API keys for optional paid modes.

## Stack
| Layer | Tool | Why free |
|---|---|---|
| Frontend + API | Next.js 14 (App Router, TypeScript) | Open source |
| Styling | Tailwind CSS | Open source |
| Hosting | Vercel free tier | Free for personal projects |
| Auth + Database + Realtime | Supabase free tier | 500MB DB, 50k MAU, 2 projects |
| PWA | next-pwa | Open source |

## Price Lookup — Three Modes
Users can choose any mode per lookup:

1. **URL Mode (free, always):** User pastes a product URL. App fetches that page and reads price from structured data (JSON-LD / microdata). Works on most major retailers. May break if a site changes its markup. Free forever.

2. **SerpAPI Mode (free tier: 100 searches/month):** App queries Google Shopping via SerpAPI. Shows prices from multiple retailers for a search query. Requires a free SerpAPI account (key stored in user's Supabase profile). 100/month is enough for light personal use.

3. **Claude AI Mode (pay-per-use, user's own key):** User provides their own Anthropic API key. Claude searches the web and compares prices intelligently. Very cheap (~$0.01–0.05 per search). User controls when to use it. Key stored encrypted in Supabase.

## Database Schema
- `wishlists` — user's lists (name, description, is_shared, share_token)
- `wishlist_items` — items in a list (name, url, image, notes, target_price, priority, tags)
- `price_records` — price history per item (price, retailer, retailer_url, recorded_at)

## Feature Build Order
1. Project setup + git + GitHub connection
2. Supabase + auth (sign up / log in)
3. Create and manage wishlists (CRUD)
4. Add items to wishlists (manual entry)
5. Price lookup — URL mode
6. Price lookup — SerpAPI mode
7. Price lookup — Claude AI mode
8. PWA setup (installable on iPhone + Mac)
9. Price alerts (email when price drops below target)
10. Price history charts
11. Tags + priority ranking
12. Shareable lists (public link)

## User
- Complete beginner — explain everything in plain language
- Already has GitHub; needs Vercel + Supabase accounts (walk through creation)
- Tracks: Amazon, electronics, clothing, general merchandise
