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
  created_at  timestamptz not null default now()
);

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
  created_at    timestamptz not null default now()
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

create index if not exists wishlists_user_id_idx        on public.wishlists (user_id);
create index if not exists wishlist_items_wishlist_id_idx on public.wishlist_items (wishlist_id);

-- ─── Row Level Security ──────────────────────────────────────────────────────

alter table public.wishlists      enable row level security;
alter table public.wishlist_items enable row level security;
alter table public.profiles       enable row level security;

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
