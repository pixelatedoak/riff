-- Run in Supabase SQL Editor to enable chat replies and a shared custom sticker library.
alter table public.riff_messages
    add column if not exists reply_to_message_id uuid references public.riff_messages(id) on delete set null,
    add column if not exists sticker_data jsonb;

alter table public.riff_messages
    drop constraint if exists riff_messages_content_or_giphy_check,
    drop constraint if exists riff_messages_sticker_data_check;

alter table public.riff_messages
    add constraint riff_messages_sticker_data_check
        check (
            sticker_data is null or (
                jsonb_typeof(sticker_data) = 'object'
                and char_length(coalesce(sticker_data->>'label', '')) between 1 and 24
                and char_length(coalesce(sticker_data->>'text', '')) between 1 and 18
                and coalesce(sticker_data->>'background', '') ~ '^#[0-9a-fA-F]{6}$'
                and coalesce(sticker_data->>'foreground', '') ~ '^#[0-9a-fA-F]{6}$'
            )
        ),
    add constraint riff_messages_content_or_giphy_check
        check (
            (content is not null and char_length(trim(content)) between 1 and 5000)
            or (giphy_id is not null and (content is null or char_length(content) <= 5000))
            or (sticker_data is not null and (content is null or char_length(trim(content)) between 1 and 5000))
        );

create table if not exists public.riff_user_stickers (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    label text not null check (char_length(trim(label)) between 1 and 24),
    text text not null check (char_length(trim(text)) between 1 and 18),
    background text not null check (background ~ '^#[0-9a-fA-F]{6}$'),
    foreground text not null check (foreground ~ '^#[0-9a-fA-F]{6}$'),
    created_at timestamptz not null default now()
);

create index if not exists riff_user_stickers_owner_created_idx
    on public.riff_user_stickers(user_id, created_at desc);

alter table public.riff_user_stickers enable row level security;
drop policy if exists "Users manage their own stickers" on public.riff_user_stickers;
create policy "Users manage their own stickers" on public.riff_user_stickers
    for all to authenticated
    using (user_id = (select auth.uid()))
    with check (user_id = (select auth.uid()));

revoke all on public.riff_user_stickers from public, anon, authenticated;
grant select, insert, update, delete on public.riff_user_stickers to authenticated;
grant all on public.riff_user_stickers to service_role;
