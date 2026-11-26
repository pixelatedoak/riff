-- Per-user mute and inbox-hide settings for private conversations.
create table if not exists public.riff_conversation_preferences (
    user_id uuid not null references auth.users(id) on delete cascade,
    conversation_id uuid not null references public.riff_conversations(id) on delete cascade,
    is_muted boolean not null default false,
    hidden_at timestamptz,
    updated_at timestamptz not null default now(),
    primary key (user_id, conversation_id)
);

alter table public.riff_conversation_preferences enable row level security;

drop policy if exists "Users manage their own conversation preferences" on public.riff_conversation_preferences;
create policy "Users manage their own conversation preferences" on public.riff_conversation_preferences
    for all to authenticated
    using (user_id = (select auth.uid()))
    with check (user_id = (select auth.uid()));

revoke all on public.riff_conversation_preferences from public, anon, authenticated;
grant select, insert, update, delete on public.riff_conversation_preferences to authenticated;
grant all on public.riff_conversation_preferences to service_role;
