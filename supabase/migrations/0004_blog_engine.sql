-- 0004_blog_engine.sql
-- YesBundles blog content engine: posts, authors, and an editor topic queue.
-- Additive. ENUM-like columns use text + CHECK (matches the app_entitlements
-- convention already in this DB). Applied to the Bundles project
-- (fbehngzqziimeefkjjjq) via the management API on 2026-06-29.

create extension if not exists "pgcrypto";

-- ── Authors ───────────────────────────────────────────────────────────
create table if not exists public.blog_authors (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text not null unique,
  bio        text,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- ── Posts ─────────────────────────────────────────────────────────────
create table if not exists public.blog_posts (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique,
  title            text not null,
  meta_description text,
  body_html        text,
  og_image_url     text,
  cluster          text not null check (cluster in ('finance','career','side_hustle')),
  author_id        uuid references public.blog_authors(id),
  status           text not null default 'draft' check (status in ('draft','published','archived')),
  tags             text[] not null default '{}',
  faqs             jsonb not null default '[]'::jsonb,
  published_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists blog_posts_status_published_idx
  on public.blog_posts (status, published_at desc);
create index if not exists blog_posts_cluster_idx
  on public.blog_posts (cluster);

-- ── Editor topic queue ────────────────────────────────────────────────
create table if not exists public.blog_topic_queue (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  cluster    text not null check (cluster in ('finance','career','side_hustle')),
  priority   int  not null default 0,
  status     text not null default 'pending' check (status in ('pending','in_progress','done')),
  source     text,
  created_at timestamptz not null default now()
);

create index if not exists blog_topic_queue_status_priority_idx
  on public.blog_topic_queue (status, priority desc, created_at);

-- ── RLS: published posts are world-readable; everything else is locked to
--     the service role (cron agents + server reads use service role). ────
alter table public.blog_posts   enable row level security;
alter table public.blog_authors enable row level security;

drop policy if exists "blog_posts public read published" on public.blog_posts;
create policy "blog_posts public read published"
  on public.blog_posts for select
  using (status = 'published');

drop policy if exists "blog_authors public read" on public.blog_authors;
create policy "blog_authors public read"
  on public.blog_authors for select
  using (true);
