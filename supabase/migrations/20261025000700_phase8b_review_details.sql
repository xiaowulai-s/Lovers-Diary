-- Lovers Diary · Phase 8B-1 补充
-- 年度回顾增加真实内容摘要：纪念日、纸条、美食、完成计划、12 张照片

begin;

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
    select city, count(*)::int as count
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
    select name, count(*)::int as count
    from public.food_records, bounds
    where eaten_on >= bounds.start_date
      and eaten_on < bounds.end_date
      and is_favorite
    group by name
    order by count desc, name
    limit 5
  ),
  anniversary_items as (
    select id, title, happened_on, kind, recurring, note
    from public.anniversaries, bounds
    where happened_on >= bounds.start_date
      and happened_on < bounds.end_date
    order by happened_on desc, id desc
    limit 5
  ),
  note_items as (
    select
      n.id,
      n.body,
      n.created_at,
      nullif(p.display_name, '') as author_name
    from public.love_notes n
    left join public.profiles p on p.user_id = n.created_by, bounds
    where n.created_at >= bounds.start_date
      and n.created_at < bounds.end_date
    order by n.created_at desc, n.id desc
    limit 5
  ),
  food_items as (
    select
      id,
      name,
      eaten_on,
      eaten_at,
      city,
      shop,
      note,
      is_favorite,
      photo_path,
      thumb_path
    from public.food_records, bounds
    where eaten_on >= bounds.start_date
      and eaten_on < bounds.end_date
    order by eaten_on desc, eaten_at desc, id desc
    limit 5
  ),
  todo_items_year as (
    select id, title, note, due_on, completed_at
    from public.todo_items, bounds
    where completed_at >= bounds.start_date
      and completed_at < bounds.end_date
    order by completed_at desc, id desc
    limit 5
  ),
  photo_samples as (
    select id, storage_path, thumb_path, caption, taken_at
    from public.photo_entries, bounds
    where taken_at >= bounds.start_date
      and taken_at < bounds.end_date
    order by taken_at desc, id desc
    limit 12
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
    'anniversary_items', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', id,
            'title', title,
            'happened_on', happened_on,
            'kind', kind,
            'recurring', recurring,
            'note', note
          )
          order by happened_on desc, id desc
        )
        from anniversary_items
      ),
      '[]'::jsonb
    ),
    'note_items', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', id,
            'body', body,
            'created_at', created_at,
            'author_name', author_name
          )
          order by created_at desc, id desc
        )
        from note_items
      ),
      '[]'::jsonb
    ),
    'food_items', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', id,
            'name', name,
            'eaten_on', eaten_on,
            'eaten_at', eaten_at,
            'city', city,
            'shop', shop,
            'note', note,
            'is_favorite', is_favorite,
            'photo_path', photo_path,
            'thumb_path', thumb_path
          )
          order by eaten_on desc, eaten_at desc, id desc
        )
        from food_items
      ),
      '[]'::jsonb
    ),
    'todo_items', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', id,
            'title', title,
            'note', note,
            'due_on', due_on,
            'completed_at', completed_at
          )
          order by completed_at desc, id desc
        )
        from todo_items_year
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
