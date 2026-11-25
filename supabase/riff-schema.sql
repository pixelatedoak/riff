-- Core text-first Riff system: open Riffs can branch; Black Riffs are standalone.

create table if not exists public.riffs (
    id uuid primary key default gen_random_uuid(),
    author_id uuid not null references auth.users(id) on delete cascade,
    parent_riff_id uuid references public.riffs(id) on delete cascade,
    root_riff_id uuid not null references public.riffs(id) on delete cascade,
    kind text not null check (kind in ('riff', 'black')),
    content text not null check (char_length(trim(content)) between 0 and 1000),
    comments_enabled boolean not null default true,
    allow_branches boolean not null default true,
    deleted_at timestamptz,
    created_at timestamptz not null default now()
);

alter table public.riffs
    add column if not exists comments_enabled boolean not null default true,
    add column if not exists allow_branches boolean not null default true,
    add column if not exists deleted_at timestamptz;

create index if not exists riffs_feed_created_idx
    on public.riffs (created_at desc)
    where parent_riff_id is null;

create index if not exists riffs_parent_created_idx
    on public.riffs (parent_riff_id, created_at asc)
    where parent_riff_id is not null;

create index if not exists riffs_root_created_idx
    on public.riffs (root_riff_id, created_at asc);

create index if not exists riffs_author_created_idx
    on public.riffs (author_id, created_at desc);

create or replace function public.set_riff_root()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
    parent_root uuid;
    parent_kind text;
begin
    if new.kind = 'black' and exists (
        select 1
          from public.riffs child
         where child.parent_riff_id = new.id
    ) then
        raise exception 'A Riff with branches cannot become a Black Riff';
    end if;

    if new.kind = 'black' then
        new.allow_branches := false;
    end if;

    if new.parent_riff_id is null then
        new.root_riff_id := new.id;
        return new;
    end if;

    if new.kind <> 'riff' then
        raise exception 'Black Riffs cannot be branches';
    end if;

    if tg_op = 'UPDATE' and new.parent_riff_id is not distinct from old.parent_riff_id then
        return new;
    end if;

    select root_riff_id, kind
      into parent_root, parent_kind
      from public.riffs
     where id = new.parent_riff_id;

    if not found then
        raise exception 'Parent Riff does not exist';
    end if;

    if parent_kind <> 'riff' then
        raise exception 'Black Riffs cannot be branched';
    end if;

    if not exists (select 1 from public.riffs where id = new.parent_riff_id and allow_branches) then
        raise exception 'This Riff does not allow branches';
    end if;

    if new.id = new.parent_riff_id then
        raise exception 'A Riff cannot branch from itself';
    end if;

    if exists (
        with recursive descendants(id) as (
            select child.id
              from public.riffs child
             where child.parent_riff_id = new.id
            union all
            select child.id
              from public.riffs child
              join descendants parent on child.parent_riff_id = parent.id
        )
        select 1 from descendants where id = new.parent_riff_id
    ) then
        raise exception 'A Riff cannot branch from one of its descendants';
    end if;

    new.root_riff_id := parent_root;
    return new;
end;
$$;

drop trigger if exists set_riff_root_before_write on public.riffs;
create trigger set_riff_root_before_write
    before insert or update on public.riffs
    for each row execute function public.set_riff_root();

alter table public.riffs enable row level security;

drop policy if exists "Riffs are publicly readable" on public.riffs;
drop policy if exists "Users can create their own Riffs" on public.riffs;
drop policy if exists "Users can update their own Riffs" on public.riffs;
drop policy if exists "Users can delete their own Riffs" on public.riffs;

create policy "Riffs are publicly readable"
    on public.riffs for select
    to anon, authenticated
    using (true);

create policy "Users can create their own Riffs"
    on public.riffs for insert
    to authenticated
    with check (
        author_id = (select auth.uid())
        and (parent_riff_id is null or kind = 'riff')
    );

create policy "Users can update their own Riffs"
    on public.riffs for update
    to authenticated
    using (author_id = (select auth.uid()))
    with check (author_id = (select auth.uid()));

create policy "Users can delete their own Riffs"
    on public.riffs for delete
    to authenticated
    using (author_id = (select auth.uid()));

revoke all on table public.riffs from public, anon, authenticated;
grant select on table public.riffs to anon, authenticated;
grant insert, delete on table public.riffs to authenticated;
grant update (content, comments_enabled, allow_branches) on table public.riffs to authenticated;
grant all on table public.riffs to service_role;
