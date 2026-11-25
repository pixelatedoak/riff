-- Private one-to-one messaging for Riff. Run in the Supabase SQL Editor.
create table if not exists public.riff_conversations (
    id uuid primary key default gen_random_uuid(),
    user_one uuid not null references auth.users(id) on delete cascade,
    user_two uuid not null references auth.users(id) on delete cascade,
    created_by uuid not null references auth.users(id) on delete cascade,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint riff_conversations_distinct_users check (user_one <> user_two),
    constraint riff_conversations_canonical_pair check (user_one < user_two),
    constraint riff_conversations_pair_unique unique (user_one, user_two)
);

create table if not exists public.riff_messages (
    id uuid primary key default gen_random_uuid(),
    conversation_id uuid not null references public.riff_conversations(id) on delete cascade,
    sender_id uuid not null references auth.users(id) on delete cascade,
    recipient_id uuid not null references auth.users(id) on delete cascade,
    content text,
    giphy_id text,
    created_at timestamptz not null default now(),
    read_at timestamptz,
    constraint riff_messages_distinct_users check (sender_id <> recipient_id)
);

alter table public.riff_messages
    add column if not exists giphy_id text,
    alter column content drop not null;

alter table public.riff_messages
    drop constraint if exists riff_messages_content_check,
    drop constraint if exists riff_messages_giphy_id_check,
    drop constraint if exists riff_messages_content_or_giphy_check;

alter table public.riff_messages
    add constraint riff_messages_giphy_id_check
        check (giphy_id is null or giphy_id ~ '^[A-Za-z0-9]+$'),
    add constraint riff_messages_content_or_giphy_check
        check (
            (content is not null and char_length(trim(content)) between 1 and 5000)
            or (giphy_id is not null and (content is null or char_length(content) <= 5000))
        );

create index if not exists riff_conversations_user_one_updated_idx on public.riff_conversations(user_one, updated_at desc);
create index if not exists riff_conversations_user_two_updated_idx on public.riff_conversations(user_two, updated_at desc);
create index if not exists riff_messages_conversation_created_idx on public.riff_messages(conversation_id, created_at desc);
create index if not exists riff_messages_recipient_unread_idx on public.riff_messages(recipient_id, created_at desc) where read_at is null;

alter table public.riff_conversations enable row level security;
alter table public.riff_messages enable row level security;

drop policy if exists "Participants can view their conversations" on public.riff_conversations;
create policy "Participants can view their conversations" on public.riff_conversations
    for select to authenticated using ((select auth.uid()) in (user_one, user_two));
drop policy if exists "Users can start their own conversations" on public.riff_conversations;
create policy "Users can start their own conversations" on public.riff_conversations
    for insert to authenticated with check (
        created_by = (select auth.uid())
        and (select auth.uid()) in (user_one, user_two)
    );

drop policy if exists "Participants can read messages" on public.riff_messages;
create policy "Participants can read messages" on public.riff_messages
    for select to authenticated using (
        exists (
            select 1 from public.riff_conversations c
             where c.id = conversation_id and (select auth.uid()) in (c.user_one, c.user_two)
        )
    );
drop policy if exists "Participants can send messages" on public.riff_messages;
create policy "Participants can send messages" on public.riff_messages
    for insert to authenticated with check (
        sender_id = (select auth.uid())
        and recipient_id <> sender_id
        and exists (
            select 1 from public.riff_conversations c
             where c.id = conversation_id
               and (sender_id = c.user_one and recipient_id = c.user_two
                    or sender_id = c.user_two and recipient_id = c.user_one)
        )
    );
drop policy if exists "Recipients can mark messages read" on public.riff_messages;
create policy "Recipients can mark messages read" on public.riff_messages
    for update to authenticated using (recipient_id = (select auth.uid()))
    with check (recipient_id = (select auth.uid()) and read_at is not null);

revoke all on public.riff_conversations, public.riff_messages from public, anon, authenticated;
grant select, insert on public.riff_conversations to authenticated;
grant select, insert on public.riff_messages to authenticated;
grant update (read_at) on public.riff_messages to authenticated;
grant all on public.riff_conversations, public.riff_messages to service_role;

create or replace function public.bump_riff_conversation_on_message()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
    update public.riff_conversations set updated_at = new.created_at where id = new.conversation_id;
    return new;
end;
$$;
revoke all on function public.bump_riff_conversation_on_message() from public, anon, authenticated;
drop trigger if exists riff_message_bumps_conversation on public.riff_messages;
create trigger riff_message_bumps_conversation after insert on public.riff_messages
    for each row execute function public.bump_riff_conversation_on_message();

-- Enable live updates when the standard Supabase Realtime publication exists.
do $$
begin
    if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
       and not exists (
           select 1 from pg_publication_tables
            where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'riff_messages'
       ) then
        alter publication supabase_realtime add table public.riff_messages;
    end if;
end;
$$;
