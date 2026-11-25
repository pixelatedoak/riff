-- Create a public profile from the username chosen during signup.
-- Run in Supabase SQL Editor after profile-schema.sql.

alter table public.profiles
    add column if not exists username text;

create unique index if not exists profiles_username_lower_unique
    on public.profiles (lower(username))
    where username is not null and username <> '';

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    new_username text := lower(trim(coalesce(new.raw_user_meta_data ->> 'username', '')));
begin
    if new_username !~ '^[a-z0-9_]{3,24}$' then
        new_username := null;
    end if;

    insert into public.profiles (id, username, full_name, avatar_url)
    values (
        new.id,
        new_username,
        nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), ''),
        nullif(trim(coalesce(new.raw_user_meta_data ->> 'avatar_url', '')), '')
    )
    on conflict (id) do nothing;

    return new;
end;
$$;

drop trigger if exists create_profile_after_signup on auth.users;
create trigger create_profile_after_signup
    after insert on auth.users
    for each row execute function public.create_profile_for_new_user();
