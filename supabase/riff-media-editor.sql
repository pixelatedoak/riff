-- Run this once in Supabase SQL Editor to enable image looks and stickers.
alter table public.riffs drop constraint if exists riffs_content_check;
alter table public.riffs add constraint riffs_content_check
    check (char_length(trim(content)) between 0 and 1000);

alter table public.riff_attachments
    add column if not exists media_filter text not null default 'none',
    add column if not exists sticker text,
    add column if not exists sort_order integer not null default 0;

do $$
begin
    if not exists (
        select 1 from pg_constraint
         where conname = 'riff_attachments_media_filter_check'
           and conrelid = 'public.riff_attachments'::regclass
    ) then
        alter table public.riff_attachments
            add constraint riff_attachments_media_filter_check
            check (media_filter in ('none', 'mono', 'warm', 'cool', 'fade', 'contrast'));
    end if;
    if not exists (
        select 1 from pg_constraint
         where conname = 'riff_attachments_sticker_length_check'
           and conrelid = 'public.riff_attachments'::regclass
    ) then
        alter table public.riff_attachments
            add constraint riff_attachments_sticker_length_check
            check (sticker is null or char_length(sticker) <= 12);
    end if;
    if not exists (
        select 1 from pg_constraint
         where conname = 'riff_attachments_sort_order_check'
           and conrelid = 'public.riff_attachments'::regclass
    ) then
        alter table public.riff_attachments
            add constraint riff_attachments_sort_order_check check (sort_order >= 0);
    end if;
end;
$$;
