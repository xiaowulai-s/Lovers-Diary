-- Lovers Diary · Phase 8B-1
-- 年度回顾聚合与导出辅助索引

begin;

create index if not exists anniversaries_happened_on_idx
  on public.anniversaries (happened_on);
create index if not exists love_notes_created_at_idx
  on public.love_notes (created_at desc);
create index if not exists food_records_eaten_on_idx
  on public.food_records (eaten_on desc);
create index if not exists todo_items_completed_at_idx
  on public.todo_items (completed_at desc);
create index if not exists photo_entries_taken_at_idx
  on public.photo_entries (taken_at desc);

create or replace function public.get_year_review(target_year integer)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with bounds as (
    select
      make_date(target_year, 1, 1) as start_date,
      make_date(target_year + 1, 1, 1) as end_date
  ),
  city_counts as (
    select
      city,
      count(*)::int as count
    from public.food_records, bounds
    where eaten_on >= bounds.start_date
      and eaten_on < bounds.end_date
      and city is not null
      and btrim(city) <> ''
    group by city
    order by count desc, city
    limit 3
  ),
  favorite_foods as (
    select
      name,
      count(*)::int as count
    from public.food_records, bounds
    where eaten_on >= bounds.start_date
      and eaten_on < bounds.end_date
      and is_favorite
    group by name
    order by count desc, name
    limit 5
  ),
  photo_samples as (
    select
      id,
      storage_path,
      thumb_path,
      caption,
      taken_at
    from public.photo_entries, bounds
    where taken_at >= bounds.start_date
      and taken_at < bounds.end_date
    order by taken_at desc, id desc
    limit 6
  )
  select jsonb_build_object(
    'year', target_year,
    'anniversaries', (
      select count(*)::int
      from public.anniversaries, bounds
      where happened_on >= bounds.start_date
        and happened_on < bounds.end_date
    ),
    'notes', (
      select count(*)::int
      from public.love_notes, bounds
      where created_at >= bounds.start_date
        and created_at < bounds.end_date
    ),
    'food', (
      select count(*)::int
      from public.food_records, bounds
      where eaten_on >= bounds.start_date
        and eaten_on < bounds.end_date
    ),
    'todos_completed', (
      select count(*)::int
      from public.todo_items, bounds
      where completed_at >= bounds.start_date
        and completed_at < bounds.end_date
    ),
    'photos', (
      select count(*)::int
      from public.photo_entries, bounds
      where taken_at >= bounds.start_date
        and taken_at < bounds.end_date
    ),
    'cities', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object('city', city, 'count', count)
          order by count desc, city
        )
        from city_counts
      ),
      '[]'::jsonb
    ),
    'favorite_foods', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object('name', name, 'count', count)
          order by count desc, name
        )
        from favorite_foods
      ),
      '[]'::jsonb
    ),
    'photo_samples', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', id,
            'storage_path', storage_path,
            'thumb_path', thumb_path,
            'caption', caption,
            'taken_at', taken_at
          )
          order by taken_at desc, id desc
        )
        from photo_samples
      ),
      '[]'::jsonb
    )
  );
$$;

revoke all on function public.get_year_review(integer) from public;
revoke all on function public.get_year_review(integer) from anon;
grant execute on function public.get_year_review(integer) to authenticated;

notify pgrst, 'reload schema';

commit;
