-- AhnajakMC Store Supabase schema
-- Run this in Supabase SQL Editor once.
create extension if not exists pgcrypto;

create table if not exists users (
  discord_id text primary key,
  username text not null,
  global_name text,
  avatar text,
  role text not null default 'user' check (role in ('owner','admin','user')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists settings (
  guild_id text primary key,
  store_name text not null default 'AhnajakMC Store',
  description text default '',
  banner_url text,
  logo_url text,
  how_to_use text default '',
  terms_privacy text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists servers (
  id uuid primary key default gen_random_uuid(),
  guild_id text not null,
  name text not null,
  plugin_api_key text not null,
  plugin_url text,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists servers_guild_idx on servers(guild_id);

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  guild_id text not null,
  name text not null,
  description text default '',
  logo_url text,
  enabled boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists categories_guild_idx on categories(guild_id);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  guild_id text not null,
  server_id uuid references servers(id) on delete set null,
  category_id uuid references categories(id) on delete set null,
  name text not null,
  description text default '',
  logo_url text,
  price numeric(10,2) not null default 0,
  commands jsonb not null default '[]'::jsonb,
  enabled boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists products_guild_idx on products(guild_id);

create table if not exists orders (
  id text primary key,
  guild_id text not null,
  server_id uuid references servers(id) on delete set null,
  product_id uuid references products(id) on delete set null,
  username text not null,
  amount numeric(10,2) not null default 0,
  status text not null default 'pending' check (status in ('pending','paid','plugin_sent','plugin_failed','cancelled','expired')),
  payment_ref text,
  paid_at timestamptz,
  plugin_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists orders_guild_idx on orders(guild_id);
create index if not exists orders_status_idx on orders(status);

-- Initial owner row. Username can be updated after first Discord login.
insert into users(discord_id, username, role)
values ('1446502651637534772', 'kbenzzz.', 'owner')
on conflict (discord_id) do update set role='owner', username=excluded.username;
