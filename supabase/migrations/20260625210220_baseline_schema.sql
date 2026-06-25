-- Baseline schema — captures tables that already exist in production.
-- This migration is marked as applied without running (see README / migration notes).
-- Run: npx supabase migration repair --status applied 20260625210220

-- ─── Wishlists ───────────────────────────────────────────────────────────────
create table if not exists public.wishlists (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  description text,
  emoji       text,
  archived    boolean default false,
  is_shared   boolean default false,
  share_token text unique,
  created_at  timestamptz default now()
);

alter table public.wishlists enable row level security;

create policy "Users manage own wishlists"
  on public.wishlists for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── Wishlist items ───────────────────────────────────────────────────────────
create table if not exists public.wishlist_items (
  id             uuid primary key default gen_random_uuid(),
  wishlist_id    uuid not null references public.wishlists(id) on delete cascade,
  name           text not null,
  url            text,
  image_url      text,
  notes          text,
  target_price   numeric(10,2),
  auto_price     numeric(10,2),
  auto_currency  text default 'USD',
  star_rating    integer default 0 check (star_rating between 0 and 5),
  quantity       integer default 1 check (quantity >= 1),
  purchased      boolean default false,
  purchased_at   timestamptz,
  tags           text[],
  created_at     timestamptz default now()
);

alter table public.wishlist_items enable row level security;

create policy "Users manage items in own wishlists"
  on public.wishlist_items for all
  using  (exists (select 1 from public.wishlists w where w.id = wishlist_id and w.user_id = auth.uid()))
  with check (exists (select 1 from public.wishlists w where w.id = wishlist_id and w.user_id = auth.uid()));

-- ─── Price records ────────────────────────────────────────────────────────────
create table if not exists public.price_records (
  id           uuid primary key default gen_random_uuid(),
  item_id      uuid not null references public.wishlist_items(id) on delete cascade,
  price        numeric(10,2) not null,
  retailer     text,
  retailer_url text,
  recorded_at  timestamptz default now()
);

alter table public.price_records enable row level security;

create policy "Users read price records for own items"
  on public.price_records for all
  using (exists (
    select 1 from public.wishlist_items i
    join public.wishlists w on w.id = i.wishlist_id
    where i.id = item_id and w.user_id = auth.uid()
  ));
