-- Run after riff-schema.sql. Public files are readable/downloadable by anyone
-- with the link. Only the author can upload or remove an attachment.

alter table public.riffs
    add column if not exists comments_enabled boolean not null default true,
    add column if not exists allow_branches boolean not null default true,
    add column if not exists deleted_at timestamptz;

create table if not exists public.riff_moderators (
    email text primary key check (email = lower(email)),
    created_at timestamptz not null default now()
);
-- Add your email to enable the in-app moderation inbox, e.g.:
-- insert into public.riff_moderators (email) values ('you@example.com') on conflict do nothing;

update public.riffs set allow_branches = false where kind = 'black';
grant update (content, comments_enabled, allow_branches) on public.riffs to authenticated;
revoke delete on public.riffs from authenticated;

create or replace function public.soft_delete_riff(p_riff_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare can_remove boolean;
begin
    select exists (
        select 1 from public.riffs r
         where r.id = p_riff_id and (
             r.author_id = (select auth.uid())
             or exists (select 1 from public.riff_moderators m where m.email = lower((select auth.jwt() ->> 'email')))
         )
    ) into can_remove;
    if not can_remove then return false; end if;
    update public.riffs
       set content = '[deleted]', deleted_at = now()
     where id = p_riff_id and deleted_at is null;
    return can_remove;
end;
$$;
revoke all on function public.soft_delete_riff(uuid) from public;
grant execute on function public.soft_delete_riff(uuid) to authenticated;

create or replace function public.set_riff_root()
returns trigger language plpgsql set search_path = '' as $$
declare parent_root uuid; parent_kind text;
begin
    if new.kind = 'black' and exists (select 1 from public.riffs child where child.parent_riff_id = new.id) then
        raise exception 'A Riff with branches cannot become a Black Riff';
    end if;
    if new.kind = 'black' then new.allow_branches := false; end if;
    if new.parent_riff_id is null then new.root_riff_id := new.id; return new; end if;
    if new.kind <> 'riff' then raise exception 'Black Riffs cannot be branches'; end if;
    if tg_op = 'UPDATE' and new.parent_riff_id is not distinct from old.parent_riff_id then return new; end if;
    select root_riff_id, kind into parent_root, parent_kind from public.riffs where id = new.parent_riff_id;
    if not found then raise exception 'Parent Riff does not exist'; end if;
    if parent_kind <> 'riff' then raise exception 'Black Riffs cannot be branched'; end if;
    if not exists (select 1 from public.riffs where id = new.parent_riff_id and allow_branches) then
        raise exception 'This Riff does not allow branches';
    end if;
    if new.id = new.parent_riff_id then raise exception 'A Riff cannot branch from itself'; end if;
    if exists (
        with recursive descendants(id) as (
            select child.id from public.riffs child where child.parent_riff_id = new.id
            union all
            select child.id from public.riffs child join descendants parent on child.parent_riff_id = parent.id
        ) select 1 from descendants where id = new.parent_riff_id
    ) then raise exception 'A Riff cannot branch from one of its descendants'; end if;
    new.root_riff_id := parent_root;
    return new;
end;
$$;

create table if not exists public.riff_attachments (
    id uuid primary key default gen_random_uuid(),
    riff_id uuid not null references public.riffs(id) on delete cascade,
    author_id uuid not null references auth.users(id) on delete cascade,
    filename text not null check (char_length(filename) between 1 and 255),
    storage_path text not null unique,
    public_url text not null,
    mime_type text not null default 'application/octet-stream',
    byte_size bigint not null check (byte_size >= 0),
    created_at timestamptz not null default now()
);
create index if not exists riff_attachments_riff_idx on public.riff_attachments(riff_id, created_at);
alter table public.riff_attachments enable row level security;
drop policy if exists "Attachments are publicly readable" on public.riff_attachments;
drop policy if exists "Authors can attach files to their Riffs" on public.riff_attachments;
drop policy if exists "Authors can remove their attachments" on public.riff_attachments;
create policy "Attachments are publicly readable" on public.riff_attachments
    for select to anon, authenticated using (true);
create policy "Authors can attach files to their Riffs" on public.riff_attachments
    for insert to authenticated with check (
        author_id = (select auth.uid())
        and exists (select 1 from public.riffs r where r.id = riff_id and r.author_id = (select auth.uid()) and r.deleted_at is null)
    );
create policy "Authors can remove their attachments" on public.riff_attachments
    for delete to authenticated using (author_id = (select auth.uid()));
drop policy if exists "Moderators can remove reported attachments" on public.riff_attachments;
create policy "Moderators can remove reported attachments" on public.riff_attachments for delete to authenticated using (
    exists (select 1 from public.riff_moderators m where m.email = lower((select auth.jwt() ->> 'email')))
);
revoke all on public.riff_attachments from public, anon, authenticated;
grant select on public.riff_attachments to anon, authenticated;
grant insert, delete on public.riff_attachments to authenticated;
grant all on public.riff_attachments to service_role;

create table if not exists public.riff_likes (
    riff_id uuid not null references public.riffs(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    created_at timestamptz not null default now(),
    primary key (riff_id, user_id)
);
create table if not exists public.riff_saves (
    riff_id uuid not null references public.riffs(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    created_at timestamptz not null default now(),
    primary key (riff_id, user_id)
);
create table if not exists public.riff_reposts (
    riff_id uuid not null references public.riffs(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    created_at timestamptz not null default now(),
    primary key (riff_id, user_id)
);
create table if not exists public.riff_follows (
    follower_id uuid not null references auth.users(id) on delete cascade,
    followed_id uuid not null references auth.users(id) on delete cascade,
    created_at timestamptz not null default now(),
    primary key (follower_id, followed_id),
    check (follower_id <> followed_id)
);
create table if not exists public.riff_comments (
    id uuid primary key default gen_random_uuid(),
    riff_id uuid not null references public.riffs(id) on delete cascade,
    author_id uuid not null references auth.users(id) on delete cascade,
    content text not null check (char_length(trim(content)) between 1 and 1000),
    created_at timestamptz not null default now()
);
create table if not exists public.riff_reports (
    id uuid primary key default gen_random_uuid(),
    reporter_id uuid not null references auth.users(id) on delete cascade,
    target_type text not null check (target_type in ('riff', 'comment')),
    target_id uuid not null,
    reason text not null check (char_length(trim(reason)) between 3 and 500),
    status text not null default 'open' check (status in ('open', 'reviewed', 'dismissed')),
    created_at timestamptz not null default now(),
    unique (reporter_id, target_type, target_id)
);
alter table public.riff_reports add column if not exists status text not null default 'open';
create index if not exists riff_comments_riff_created_idx on public.riff_comments(riff_id, created_at);
create index if not exists riff_follows_followed_idx on public.riff_follows(followed_id);

alter table public.riff_likes enable row level security;
alter table public.riff_saves enable row level security;
alter table public.riff_reposts enable row level security;
alter table public.riff_follows enable row level security;
alter table public.riff_comments enable row level security;
alter table public.riff_reports enable row level security;
alter table public.riff_moderators enable row level security;

drop policy if exists "Likes are publicly readable" on public.riff_likes;
drop policy if exists "Users manage their own likes" on public.riff_likes;
create policy "Users manage their own likes" on public.riff_likes for all to authenticated
    using (user_id = (select auth.uid())) with check (
        user_id = (select auth.uid()) and exists (select 1 from public.riffs r where r.id = riff_id and r.deleted_at is null)
    );
drop policy if exists "Users manage their own saves" on public.riff_saves;
create policy "Users manage their own saves" on public.riff_saves for all to authenticated
    using (user_id = (select auth.uid())) with check (
        user_id = (select auth.uid()) and exists (select 1 from public.riffs r where r.id = riff_id and r.deleted_at is null)
    );
drop policy if exists "Reposts are publicly readable" on public.riff_reposts;
create policy "Reposts are publicly readable" on public.riff_reposts for select to anon, authenticated using (true);
drop policy if exists "Users manage their own reposts" on public.riff_reposts;
create policy "Users manage their own reposts" on public.riff_reposts for all to authenticated
    using (user_id = (select auth.uid())) with check (
        user_id = (select auth.uid()) and exists (select 1 from public.riffs r where r.id = riff_id and r.deleted_at is null)
    );
drop policy if exists "Follows are publicly readable" on public.riff_follows;
create policy "Follows are publicly readable" on public.riff_follows for select to anon, authenticated using (true);
drop policy if exists "Users manage their own follows" on public.riff_follows;
create policy "Users manage their own follows" on public.riff_follows for all to authenticated
    using (follower_id = (select auth.uid())) with check (follower_id = (select auth.uid()));
drop policy if exists "Comments are publicly readable" on public.riff_comments;
create policy "Comments are publicly readable" on public.riff_comments for select to anon, authenticated using (true);
drop policy if exists "Users add their own comments" on public.riff_comments;
create policy "Users add their own comments" on public.riff_comments for insert to authenticated with check (
    author_id = (select auth.uid())
    and exists (select 1 from public.riffs r where r.id = riff_id and r.comments_enabled and r.deleted_at is null)
);
drop policy if exists "Authors can delete their comments" on public.riff_comments;
create policy "Authors can delete their comments" on public.riff_comments for delete to authenticated
    using (author_id = (select auth.uid()));
drop policy if exists "Users can report Riffs and comments" on public.riff_reports;
create policy "Users can report Riffs and comments" on public.riff_reports for insert to authenticated with check (
    reporter_id = (select auth.uid())
    and (
        (target_type = 'riff' and exists (select 1 from public.riffs r where r.id = target_id and r.deleted_at is null))
        or (target_type = 'comment' and exists (select 1 from public.riff_comments c where c.id = target_id))
    )
);
drop policy if exists "Moderators can review reports" on public.riff_reports;
create policy "Moderators can review reports" on public.riff_reports for select to authenticated using (
    exists (select 1 from public.riff_moderators m where m.email = lower((select auth.jwt() ->> 'email')))
);
drop policy if exists "Moderators can update reports" on public.riff_reports;
create policy "Moderators can update reports" on public.riff_reports for update to authenticated using (
    exists (select 1 from public.riff_moderators m where m.email = lower((select auth.jwt() ->> 'email')))
) with check (
    exists (select 1 from public.riff_moderators m where m.email = lower((select auth.jwt() ->> 'email')))
);
drop policy if exists "Moderators can delete reported comments" on public.riff_comments;
create policy "Moderators can delete reported comments" on public.riff_comments for delete to authenticated using (
    exists (select 1 from public.riff_moderators m where m.email = lower((select auth.jwt() ->> 'email')))
);
drop policy if exists "Users can read their moderator role" on public.riff_moderators;
create policy "Users can read their moderator role" on public.riff_moderators for select to authenticated using (
    email = lower((select auth.jwt() ->> 'email'))
);

revoke all on public.riff_likes, public.riff_saves, public.riff_reposts, public.riff_follows, public.riff_comments, public.riff_reports from public, anon, authenticated;
revoke all on public.riff_moderators from public, anon, authenticated;
grant select on public.riff_likes, public.riff_reposts, public.riff_follows, public.riff_comments to anon, authenticated;
grant select, insert, delete on public.riff_likes, public.riff_saves, public.riff_reposts, public.riff_follows to authenticated;
grant insert, delete on public.riff_comments to authenticated;
grant insert on public.riff_reports to authenticated;
grant select on public.riff_moderators to authenticated;
grant select, update (status) on public.riff_reports to authenticated;
grant all on public.riff_likes, public.riff_saves, public.riff_reposts, public.riff_follows, public.riff_comments, public.riff_reports to service_role;

drop function if exists public.get_riff_social_stats(uuid);
create or replace function public.get_riff_social_stats(p_riff_ids uuid[])
returns table (riff_id uuid, likes bigint, comments bigint, reposts bigint, branches bigint, liked boolean, saved boolean, reposted boolean)
language sql stable security definer set search_path = '' as $$
    select
        r.id,
        (select count(*) from public.riff_likes l where l.riff_id = r.id),
        (select count(*) from public.riff_comments c where c.riff_id = r.id),
        (select count(*) from public.riff_reposts rp where rp.riff_id = r.id),
        (select count(*) from public.riffs branch where branch.parent_riff_id = r.id and branch.deleted_at is null),
        exists (select 1 from public.riff_likes l where l.riff_id = r.id and l.user_id = (select auth.uid())),
        exists (select 1 from public.riff_saves s where s.riff_id = r.id and s.user_id = (select auth.uid())),
        exists (select 1 from public.riff_reposts rp where rp.riff_id = r.id and rp.user_id = (select auth.uid()))
      from unnest(coalesce(p_riff_ids, '{}'::uuid[])) requested(id)
      join public.riffs r on r.id = requested.id;
$$;
revoke all on function public.get_riff_social_stats(uuid[]) from public;
grant execute on function public.get_riff_social_stats(uuid[]) to anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('riff-files', 'riff-files', true, 52428800, null)
on conflict (id) do update set public = true, file_size_limit = 52428800, allowed_mime_types = null;
drop policy if exists "Authors upload Riff files" on storage.objects;
drop policy if exists "Authors delete Riff files" on storage.objects;
drop policy if exists "Moderators delete reported Riff files" on storage.objects;
create policy "Authors upload Riff files" on storage.objects for insert to authenticated
    with check (bucket_id = 'riff-files' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy "Authors delete Riff files" on storage.objects for delete to authenticated
    using (bucket_id = 'riff-files' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy "Moderators delete reported Riff files" on storage.objects for delete to authenticated using (
    bucket_id = 'riff-files'
    and exists (
        select 1 from public.riff_attachments a
        join public.riff_moderators m on m.email = lower((select auth.jwt() ->> 'email'))
        where a.storage_path = storage.objects.name
    )
);
