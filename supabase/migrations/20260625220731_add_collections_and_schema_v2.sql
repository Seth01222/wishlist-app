-- Schema v2: adds collections (master lists), profiles, new item columns,
-- price-record columns, indexes, and tightened RLS policies.
-- Applied manually via SQL editor on 2026-06-25; marked applied with:
--   npx supabase migration repair --status applied 20260625220731

-- ─── New tables ───────────────────────────────────────────────────────────────

create table if not exists public.collections (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  emoji       text,
  description text,
  color       text,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  serpapi_key text,
  created_at  timestamptz not null default now()
);

-- ─── New columns on existing tables ──────────────────────────────────────────

alter table public.wishlists add column if not exists budget        numeric(12, 2);
alter table public.wishlists add column if not exists collection_id uuid references public.collections (id) on delete set null;
alter table public.wishlists add column if not exists sort_order    integer not null default 0;

alter table public.wishlist_items add column if not exists priority   smallint not null default 0;
alter table public.wishlist_items add column if not exists status     text not null default 'want';
alter table public.wishlist_items add column if not exists sort_order integer not null default 0;

alter table public.price_records add column if not exists currency text not null default 'USD';
alter table public.price_records add column if not exists source   text;

-- ─── Indexes ─────────────────────────────────────────────────────────────────

create index if not exists collections_user_id_idx         on public.collections (user_id);
create index if not exists wishlists_collection_id_idx     on public.wishlists (collection_id);
create index if not exists price_records_item_id_idx       on public.price_records (item_id, recorded_at);

-- ─── RLS ─────────────────────────────────────────────────────────────────────

alter table public.collections enable row level security;
alter table public.profiles    enable row level security;

drop policy if exists "collections_all_own" on public.collections;
create policy "collections_all_own" on public.collections
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Replace the old broad wishlist policies with tighter per-operation ones.
drop policy if exists "Users manage own wishlists" on public.wishlists;
drop policy if exists "wishlists_select_own" on public.wishlists;
drop policy if exists "wishlists_insert_own" on public.wishlists;
drop policy if exists "wishlists_update_own" on public.wishlists;
drop policy if exists "wishlists_delete_own" on public.wishlists;

create policy "wishlists_select_own" on public.wishlists
  for select using (auth.uid() = user_id);
create policy "wishlists_insert_own" on public.wishlists
  for insert with check (auth.uid() = user_id);
create policy "wishlists_update_own" on public.wishlists
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "wishlists_delete_own" on public.wishlists
  for delete using (auth.uid() = user_id);

-- Replace old broad item policy with per-operation ones.
drop policy if exists "Users manage items in own wishlists" on public.wishlist_items;
drop policy if exists "wishlist_items_select_own" on public.wishlist_items;
drop policy if exists "wishlist_items_insert_own" on public.wishlist_items;
drop policy if exists "wishlist_items_update_own" on public.wishlist_items;
drop policy if exists "wishlist_items_delete_own" on public.wishlist_items;

create policy "wishlist_items_select_own" on public.wishlist_items
  for select using (exists (select 1 from public.wishlists w where w.id = wishlist_items.wishlist_id and w.user_id = auth.uid()));
create policy "wishlist_items_insert_own" on public.wishlist_items
  for insert with check (exists (select 1 from public.wishlists w where w.id = wishlist_items.wishlist_id and w.user_id = auth.uid()));
create policy "wishlist_items_update_own" on public.wishlist_items
  for update using (exists (select 1 from public.wishlists w where w.id = wishlist_items.wishlist_id and w.user_id = auth.uid()));
create policy "wishlist_items_delete_own" on public.wishlist_items
  for delete using (exists (select 1 from public.wishlists w where w.id = wishlist_items.wishlist_id and w.user_id = auth.uid()));

-- Replace old broad price_records policy.
drop policy if exists "Users read price records for own items" on public.price_records;
drop policy if exists "price_records_select_own" on public.price_records;
drop policy if exists "price_records_insert_own" on public.price_records;

create policy "price_records_select_own" on public.price_records
  for select using (exists (select 1 from public.wishlist_items i join public.wishlists w on w.id = i.wishlist_id where i.id = price_records.item_id and w.user_id = auth.uid()));
create policy "price_records_insert_own" on public.price_records
  for insert with check (exists (select 1 from public.wishlist_items i join public.wishlists w on w.id = i.wishlist_id where i.id = price_records.item_id and w.user_id = auth.uid()));
