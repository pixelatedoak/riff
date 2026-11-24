-- Extends the existing profiles table created for Riff's auth MVP.
-- Run this in the Supabase SQL Editor.

alter table public.profiles
    add column if not exists username text,
    add column if not exists pronouns text,
    add column if not exists description text not null default '',
    add column if not exists links text[] not null default '{}'::text[],
    add column if not exists updated_at timestamptz not null default now();

create unique index if not exists profiles_username_lower_unique
    on public.profiles (lower(username))
    where username is not null and username <> '';

alter table public.profiles enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Public profiles are viewable by everyone" on public.profiles;

create policy "Public profiles are viewable by everyone"
    on public.profiles for select
    to anon, authenticated
    using (true);

create policy "Users can insert own profile"
    on public.profiles for insert
    to authenticated
    with check ((select auth.uid()) = id);

create policy "Users can update own profile"
    on public.profiles for update
    to authenticated
    using ((select auth.uid()) = id)
    with check ((select auth.uid()) = id);

revoke all on table public.profiles from public, anon, authenticated;
grant select on table public.profiles to anon, authenticated;
grant insert, update on table public.profiles to authenticated;
grant all on table public.profiles to service_role;
