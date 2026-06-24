# My Wishlist

A personal wishlist app (installable as a PWA) that tracks products you want,
looks up their prices, and syncs across all your devices. Built to stay on
free tiers end-to-end.

> **New here? Try it without signing up.** On the login page, click
> **"🛍️ Try the demo — no account needed"**. You'll get a sample account
> pre-filled with several wishlists and items so you can explore the whole app.
> Nothing you do in the demo is saved.

---

## Features

- **Wishlists (CRUD):** create, rename, add an emoji icon, archive, and delete lists.
- **Items:** name, product URL, image, notes, target price, quantity, star
  rating, and tags. Mark items as purchased to track spending and savings.
- **Price lookup (URL mode):** paste a product URL and the app reads the price
  and image from the page's structured data (JSON-LD / Open Graph / microdata).
- **Sales-tax toggle:** optionally show prices with your local tax rate applied.
- **Import:** bulk-add items from pasted text.
- **Dark mode + accent colors:** pick a theme; it's remembered per device.
- **Installable PWA:** add to your home screen on iPhone/Mac; supports the iOS
  Share Sheet so you can share a product straight into a list.
- **Demo mode:** explore with seeded data and no account (see above).

---

## Tech stack

| Layer | Tool | Notes |
|---|---|---|
| Framework | **Next.js 16** (App Router, TypeScript) | Uses the new `proxy.ts` (renamed from `middleware.ts` in v16) |
| Styling | Tailwind CSS v4 | |
| Auth + Database | Supabase | Postgres + Auth, with Row Level Security |
| Hosting | Vercel | Free tier |
| PWA | Hand-rolled `public/sw.js` + `manifest.json` | No external PWA dependency |

---

## Running locally

### 1. Prerequisites
- Node.js 18.18+ (Node 20+ recommended)
- A free [Supabase](https://supabase.com) project

### 2. Install
```bash
git clone https://github.com/Seth01222/wishlist-app.git
cd wishlist-app
npm install
```

### 3. Set up the database
In your Supabase project, open **SQL Editor**, paste the contents of
[`supabase/schema.sql`](supabase/schema.sql), and run it. This creates the
tables and—critically—the Row Level Security policies that keep each user's
data private.

### 4. Configure environment variables
Copy the example file and fill in your Supabase values:
```bash
cp .env.local.example .env.local
```

| Variable | Required | Where to find it |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase → Settings → API → `anon` `public` key |

> ⚠️ Use the **`anon` / `public`** key — **not** the `service_role` key. The
> `service_role` key bypasses Row Level Security and must never ship to the browser.

### 5. Run
```bash
npm run dev
```
Open http://localhost:3000.

---

## Deploying to Vercel

1. Import the repo at [vercel.com/new](https://vercel.com/new).
2. **Framework Preset must be `Next.js`.** If it's set to "Other", every route
   returns a 404 even though the build succeeds. (This is the #1 cause of a
   blank/404 deployment.)
3. **Root Directory** should be the repo root (blank or `.`).
4. Add the two environment variables from the table above under
   **Settings → Environment Variables**, enabled for **Production**.
5. Deploy.

> ⚠️ `NEXT_PUBLIC_*` variables are baked into the build, not read at runtime.
> If you add or change them, you must **redeploy** for the change to take effect.
> A symptom of stale/missing keys is an **"Invalid API key"** error on login.

---

## How price lookup works

CLAUDE.md describes three planned modes. Currently implemented:

- **URL mode (free, always on):** the `/api/fetch-url` route fetches the product
  page server-side and extracts price/title/image from JSON-LD, Open Graph,
  Twitter cards, and common microdata. It only follows `http(s)` URLs and blocks
  requests to private/internal addresses (SSRF protection).

Planned (see CLAUDE.md): SerpAPI mode and Claude AI mode, both using
user-supplied keys.

---

## Project structure

```
src/
  app/
    (auth)/            login & signup pages
    (app)/             authenticated app (wishlists, item detail)
    api/fetch-url/     server-side price/metadata scraper
    share-target/      iOS Share Sheet landing route
    page.tsx           redirects to /wishlists or /login
  components/          UI building blocks (NavBar, cards, modals, etc.)
  lib/
    supabase/          browser & server Supabase clients
    demo/              demo-mode cookie, seed data, and mock client
  proxy.ts             auth gate (Next.js 16 "proxy", formerly middleware)
public/                manifest, service worker, icons
supabase/schema.sql    database tables + RLS policies
```

---

## Demo mode (developer notes)

Demo mode is gated by a single cookie (`wl-demo`). When present:
- `src/proxy.ts` and the server components treat the session as authenticated
  and serve seed data from `src/lib/demo/data.ts`.
- The browser Supabase client (`src/lib/supabase/client.ts`) is swapped for an
  in-memory mock (`src/lib/demo/mockClient.ts`), so reads/writes never touch
  Supabase and never error on a missing key. Changes live only in memory and
  reset on reload.

Signing out clears the cookie and returns to the real login.
