-- Lovers Diary · Phase 8A
-- 全局搜索、照片说明收藏与 pg_trgm 索引

begin;

create extension if not exists pg_trgm with schema extensions;
set search_path = public, extensions;

alter table public.photo_entries
  add column if not exists is_favorite boolean not null default false;

create index if not exists photo_entries_favorite_idx
  on public.photo_entries (is_favorite, created_at desc);

create index if not exists anniversaries_title_trgm_idx
  on public.anniversaries using gin (title gin_trgm_ops);
create index if not exists anniversaries_note_trgm_idx
  on public.anniversaries using gin (note gin_trgm_ops);
create index if not exists love_notes_body_trgm_idx
  on public.love_notes using gin (body gin_trgm_ops);
create index if not exists food_records_name_trgm_idx
  on public.food_records using gin (name gin_trgm_ops);
create index if not exists food_records_city_trgm_idx
  on public.food_records using gin (city gin_trgm_ops);
create index if not exists food_records_shop_trgm_idx
  on public.food_records using gin (shop gin_trgm_ops);
create index if not exists food_records_note_trgm_idx
  on public.food_records using gin (note gin_trgm_ops);
create index if not exists todo_items_title_trgm_idx
  on public.todo_items using gin (title gin_trgm_ops);
create index if not exists todo_items_note_trgm_idx
  on public.todo_items using gin (note gin_trgm_ops);
create index if not exists photo_entries_caption_trgm_idx
  on public.photo_entries using gin (caption gin_trgm_ops);

create or replace function public.search_content(search_query text)
returns table (
  kind text,
  item_id uuid,
  title text,
  subtitle text,
  happened_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  with input as (
    select nullif(btrim(search_query), '') as q
  ),
  pattern as (
    select
      '%' ||
      replace(
        replace(
          replace(q, '\', '\\'),
          '%',
          '\%'
        ),
        '_',
        '\_'
      ) ||
      '%' as p
    from input
    where q is not null
  ),
  matches as (
    select
      'anniversary'::text as kind,
      a.id as item_id,
      a.title,
      concat_ws(
        ' · ',
        a.happened_on::text,
        case a.kind
          when 'birthday' then '生日'
          when 'anniversary' then '纪念'
          when 'trip' then '旅行'
          when 'custom' then '标记'
          else '在一起'
        end
      ) as subtitle,
      a.created_at as happened_at
    from public.anniversaries a, pattern
    where a.title ilike pattern.p or a.note ilike pattern.p

    union all

    select
      'note',
      n.id,
      left(n.body, 80),
      '小纸条',
      n.created_at
    from public.love_notes n, pattern
    where n.body ilike pattern.p

    union all

    select
      'food',
      f.id,
      f.name,
      concat_ws(' · ', f.eaten_on::text, f.city, f.shop),
      f.created_at
    from public.food_records f, pattern
    where f.name ilike pattern.p
      or f.city ilike pattern.p
      or f.shop ilike pattern.p
      or f.note ilike pattern.p

    union all

    select
      'todo',
      t.id,
      t.title,
      concat_ws(' · ', case when t.is_done then '已完成' else '待办' end, t.due_on::text),
      t.created_at
    from public.todo_items t, pattern
    where t.title ilike pattern.p or t.note ilike pattern.p

    union all

    select
      'photo',
      p.id,
      coalesce(nullif(p.caption, ''), '照片'),
      '照片 · ' || to_char(p.taken_at, 'YYYY.MM.DD'),
      p.created_at
    from public.photo_entries p, pattern
    where p.caption ilike pattern.p
  ),
  ranked as (
    select
      kind,
      item_id,
      title,
      subtitle,
      happened_at,
      row_number() over (
        partition by kind
        order by happened_at desc, item_id desc
      ) as rn
    from matches
  )
  select kind, item_id, title, subtitle, happened_at
  from ranked
  where rn <= 8
  order by happened_at desc
  limit 40;
$$;

revoke all on function public.search_content(text) from public;
revoke all on function public.search_content(text) from anon;
grant execute on function public.search_content(text) to authenticated;

notify pgrst, 'reload schema';

commit;
