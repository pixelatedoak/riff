-- Run after riff-schema.sql and riff-social-upgrade.sql.

create table if not exists public.riff_notifications (
    id uuid primary key default gen_random_uuid(),
    recipient_id uuid not null references auth.users(id) on delete cascade,
    actor_id uuid not null references auth.users(id) on delete cascade,
    type text not null check (type in ('like', 'comment', 'repost', 'follow', 'branch', 'new_riff')),
    source_id uuid not null,
    riff_id uuid references public.riffs(id) on delete cascade,
    created_at timestamptz not null default now(),
    read_at timestamptz,
    unique (recipient_id, actor_id, type, source_id),
    check (recipient_id <> actor_id)
);

create index if not exists riff_notifications_recipient_created_idx
    on public.riff_notifications(recipient_id, created_at desc);
create index if not exists riff_notifications_unread_idx
    on public.riff_notifications(recipient_id, created_at desc)
    where read_at is null;

alter table public.riff_notifications enable row level security;
drop policy if exists "Users read their own notifications" on public.riff_notifications;
drop policy if exists "Users update their own notifications" on public.riff_notifications;
drop policy if exists "Users delete their own notifications" on public.riff_notifications;

create policy "Users read their own notifications"
    on public.riff_notifications for select to authenticated
    using (recipient_id = (select auth.uid()));
create policy "Users update their own notifications"
    on public.riff_notifications for update to authenticated
    using (recipient_id = (select auth.uid()))
    with check (recipient_id = (select auth.uid()));
create policy "Users delete their own notifications"
    on public.riff_notifications for delete to authenticated
    using (recipient_id = (select auth.uid()));

revoke all on public.riff_notifications from public, anon, authenticated;
grant select, delete on public.riff_notifications to authenticated;
grant update (read_at) on public.riff_notifications to authenticated;
grant all on public.riff_notifications to service_role;

create or replace function public.create_riff_notification(
    p_recipient_id uuid,
    p_actor_id uuid,
    p_type text,
    p_source_id uuid,
    p_riff_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
    if p_recipient_id is null or p_actor_id is null or p_recipient_id = p_actor_id then
        return;
    end if;

    insert into public.riff_notifications(recipient_id, actor_id, type, source_id, riff_id)
    values (p_recipient_id, p_actor_id, p_type, p_source_id, p_riff_id)
    on conflict (recipient_id, actor_id, type, source_id) do nothing;
end;
$$;
revoke all on function public.create_riff_notification(uuid, uuid, text, uuid, uuid) from public, anon, authenticated;

create or replace function public.notify_riff_like()
returns trigger language plpgsql security definer set search_path = '' as $$
declare recipient uuid;
begin
    select r.author_id into recipient from public.riffs r where r.id = new.riff_id and r.deleted_at is null;
    perform public.create_riff_notification(recipient, new.user_id, 'like', new.riff_id, new.riff_id);
    return new;
end;
$$;

create or replace function public.notify_riff_repost()
returns trigger language plpgsql security definer set search_path = '' as $$
declare recipient uuid;
begin
    select r.author_id into recipient from public.riffs r where r.id = new.riff_id and r.deleted_at is null;
    perform public.create_riff_notification(recipient, new.user_id, 'repost', new.riff_id, new.riff_id);
    return new;
end;
$$;

create or replace function public.notify_riff_comment()
returns trigger language plpgsql security definer set search_path = '' as $$
declare recipient uuid;
begin
    select r.author_id into recipient from public.riffs r where r.id = new.riff_id and r.deleted_at is null;
    perform public.create_riff_notification(recipient, new.author_id, 'comment', new.id, new.riff_id);
    return new;
end;
$$;

create or replace function public.notify_riff_follow()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
    perform public.create_riff_notification(new.followed_id, new.follower_id, 'follow', new.followed_id, null);
    return new;
end;
$$;

create or replace function public.notify_riff_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
declare recipient uuid;
begin
    if new.parent_riff_id is not null then
        select r.author_id into recipient from public.riffs r where r.id = new.parent_riff_id and r.deleted_at is null;
        perform public.create_riff_notification(recipient, new.author_id, 'branch', new.id, new.id);
    else
        insert into public.riff_notifications(recipient_id, actor_id, type, source_id, riff_id)
        select f.follower_id, new.author_id, 'new_riff', new.id, new.id
        from public.riff_follows f
        where f.followed_id = new.author_id and f.follower_id <> new.author_id
        on conflict (recipient_id, actor_id, type, source_id) do nothing;
    end if;
    return new;
end;
$$;

drop trigger if exists riff_like_notification on public.riff_likes;
create trigger riff_like_notification after insert on public.riff_likes
    for each row execute function public.notify_riff_like();
drop trigger if exists riff_repost_notification on public.riff_reposts;
create trigger riff_repost_notification after insert on public.riff_reposts
    for each row execute function public.notify_riff_repost();
drop trigger if exists riff_comment_notification on public.riff_comments;
create trigger riff_comment_notification after insert on public.riff_comments
    for each row execute function public.notify_riff_comment();
drop trigger if exists riff_follow_notification on public.riff_follows;
create trigger riff_follow_notification after insert on public.riff_follows
    for each row execute function public.notify_riff_follow();
drop trigger if exists riff_insert_notification on public.riffs;
create trigger riff_insert_notification after insert on public.riffs
    for each row execute function public.notify_riff_insert();
