-- Run after riff-messaging.sql to enable GIPHY messages in existing Riff chats.
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
