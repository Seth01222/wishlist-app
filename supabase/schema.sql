-- ============================================================================
-- Wishlist App — database schema
-- ============================================================================
-- This file is the source of truth for the Supabase database. It can be run on
-- a fresh Supabase project to recreate every table, index, and security policy.
--
-- HOW TO APPLY:
--   Supabase dashboard → SQL Editor → paste this file → Run.
--   (Re-running is safe: it uses IF NOT EXISTS / CREATE OR REPLACE and drops
--    policies before recreating them.)
--
-- WHY THIS MATTERS — Row Level Security (RLS):
--   The app's SELECT queries do NOT filter by user_id (see
--   src/app/(app)/wishlists/page.tsx). Per-user data isolation is enforced
--   ENTIRELY by the RLS policies below. If RLS is disabled, every signed-in
--   user can read everyone's data. Do not turn RLS off.
-- ============================================================================

-- ─── Tables ────────────────────────────────────────────────────────────────

create table if not exists public.wishlists (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  description text,
  emoji       text,
  archived    boolean not null default false,
  budget      numeric(12, 2),
  created_at  timestamptz not null default now()
);
-- Master lists ("collections"): a top-level grouping above the per-category
-- lists. A user can have several; each list (category) optionally belongs to one.
create table if not exists public.collections (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  emoji       text,
  description text,
  color       text,            -- accent id (e.g. 'indigo', 'rose') for theming the master list
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

-- For databases created before these columns existed:
alter table public.wishlists add column if not exists budget        numeric(12, 2);
alter table public.wishlists add column if not exists collection_id uuid references public.collections (id) on delete set null;
alter table public.wishlists add column if not exists sort_order    integer not null default 0;

create table if not exists public.wishlist_items (
  id            uuid primary key default gen_random_uuid(),
  wishlist_id   uuid not null references public.wishlists (id) on delete cascade,
  name          text not null,
  url           text,
  image_url     text,
  notes         text,
  target_price  numeric(12, 2),
  auto_price    numeric(12, 2),
  auto_currency text,
  star_rating   smallint not null default 0,
  quantity      integer not null default 1,
  purchased     boolean not null default false,
  purchased_at  timestamptz,
  tags          text[],
  priority      smallint not null default 0,        -- 0 none · 1 low · 2 medium · 3 high
  status        text not null default 'want',       -- 'want' | 'saved' | 'got'
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now()
);

-- For databases created before these columns existed:
alter table public.wishlist_items add column if not exists priority   smallint not null default 0;
alter table public.wishlist_items add column if not exists status     text not null default 'want';
alter table public.wishlist_items add column if not exists sort_order integer not null default 0;

-- Price history: one row per observed price for an item, used for the
-- sparkline, "lowest ever" and price-drop insights. Rows are appended whenever
-- a price is captured (add / re-check / manual edit). Ownership is inherited
-- through the item's parent wishlist.
create table if not exists public.price_records (
  id          uuid primary key default gen_random_uuid(),
  item_id     uuid not null references public.wishlist_items (id) on delete cascade,
  price       numeric(12, 2) not null,
  currency    text not null default 'USD',
  source      text,  -- 'manual' | 'auto' | 'capture' | 'serpapi'
  recorded_at timestamptz not null default now()
);

-- Per-user settings, including the optional SerpApi key used by the
-- "search by name" price-lookup mode. One row per user.
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  serpapi_key text,
  created_at  timestamptz not null default now()
);

-- ─── Indexes ───────────────────────────────────────────────────────────────
-- Speeds up the per-user list query and the per-list items query.

create index if not exists collections_user_id_idx        on public.collections (user_id);
create index if not exists wishlists_user_id_idx          on public.wishlists (user_id);
create index if not exists wishlists_collection_id_idx    on public.wishlists (collection_id);
create index if not exists wishlist_items_wishlist_id_idx  on public.wishlist_items (wishlist_id);
create index if not exists price_records_item_id_idx       on public.price_records (item_id, recorded_at);

-- ─── Row Level Security ──────────────────────────────────────────────────────

alter table public.collections    enable row level security;
alter table public.wishlists      enable row level security;
alter table public.wishlist_items enable row level security;
alter table public.price_records  enable row level security;
alter table public.profiles       enable row level security;

-- Collections: a user may only touch their own.
drop policy if exists "collections_all_own" on public.collections;
create policy "collections_all_own" on public.collections
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Price records: ownership inherited through the item's parent wishlist.
drop policy if exists "price_records_select_own" on public.price_records;
create policy "price_records_select_own" on public.price_records
  for select using (
    exists (
      select 1 from public.wishlist_items i
      join public.wishlists w on w.id = i.wishlist_id
      where i.id = price_records.item_id and w.user_id = auth.uid()
    )
  );

drop policy if exists "price_records_insert_own" on public.price_records;
create policy "price_records_insert_own" on public.price_records
  for insert with check (
    exists (
      select 1 from public.wishlist_items i
      join public.wishlists w on w.id = i.wishlist_id
      where i.id = price_records.item_id and w.user_id = auth.uid()
    )
  );

-- Profiles: a user may only read/write their own row.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Wishlists: a user may only touch their own rows.
drop policy if exists "wishlists_select_own" on public.wishlists;
create policy "wishlists_select_own" on public.wishlists
  for select using (auth.uid() = user_id);

drop policy if exists "wishlists_insert_own" on public.wishlists;
create policy "wishlists_insert_own" on public.wishlists
  for insert with check (auth.uid() = user_id);

drop policy if exists "wishlists_update_own" on public.wishlists;
create policy "wishlists_update_own" on public.wishlists
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "wishlists_delete_own" on public.wishlists;
create policy "wishlists_delete_own" on public.wishlists
  for delete using (auth.uid() = user_id);

-- Wishlist items: ownership is inherited through the parent wishlist. (Items
-- carry no user_id of their own — the app inserts them with only a wishlist_id.)
drop policy if exists "wishlist_items_select_own" on public.wishlist_items;
create policy "wishlist_items_select_own" on public.wishlist_items
  for select using (
    exists (
      select 1 from public.wishlists w
      where w.id = wishlist_items.wishlist_id and w.user_id = auth.uid()
    )
  );

drop policy if exists "wishlist_items_insert_own" on public.wishlist_items;
create policy "wishlist_items_insert_own" on public.wishlist_items
  for insert with check (
    exists (
      select 1 from public.wishlists w
      where w.id = wishlist_items.wishlist_id and w.user_id = auth.uid()
    )
  );

drop policy if exists "wishlist_items_update_own" on public.wishlist_items;
create policy "wishlist_items_update_own" on public.wishlist_items
  for update using (
    exists (
      select 1 from public.wishlists w
      where w.id = wishlist_items.wishlist_id and w.user_id = auth.uid()
    )
  );

drop policy if exists "wishlist_items_delete_own" on public.wishlist_items;
create policy "wishlist_items_delete_own" on public.wishlist_items
  for delete using (
    exists (
      select 1 from public.wishlists w
      where w.id = wishlist_items.wishlist_id and w.user_id = auth.uid()
    )
  );

-- ============================================================================
-- NOT YET IMPLEMENTED (referenced in CLAUDE.md's roadmap, not used by the app):
--   • price_records  — per-item price history (feature #10)
--   • public sharing — share_token / is_shared columns (feature #12)
-- Add these here when those features are built so this file stays the single
-- source of truth.
-- ============================================================================
