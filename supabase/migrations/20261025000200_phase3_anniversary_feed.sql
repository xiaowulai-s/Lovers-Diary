-- ============================================================================
-- Lovers Diary · 阶段 3
-- 纪念日列表排序：即将到来优先，其次按原始日期倒序
-- 依赖阶段 2 的 anniversaries 表与 RLS
-- 在 Supabase SQL Editor 执行本文件，成功后列表顺序才生效
-- ============================================================================

begin;

create or replace view public.anniversary_feed
with (security_invoker = true)
as
select
  a.*,
  case
    when a.recurring then (
      select min(candidate)
      from generate_series(
        greatest(
          extract(year from current_date)::int,
          extract(year from a.happened_on)::int
        ),
        greatest(
          extract(year from current_date)::int,
          extract(year from a.happened_on)::int
        ) + 1
      ) as years(year)
      cross join lateral (
        select make_date(
          years.year,
          extract(month from a.happened_on)::int,
          least(
            extract(day from a.happened_on)::int,
            extract(
              day from (
                make_date(
                  years.year,
                  extract(month from a.happened_on)::int,
                  1
                ) + interval '1 month - 1 day'
              )
            )::int
          )
        ) as candidate
      ) as occurrences
      where occurrences.candidate >= greatest(current_date, a.happened_on)
    )
    else case
      when a.happened_on >= current_date then a.happened_on
      else null
    end
  end as next_on
from public.anniversaries as a;

revoke all on public.anniversary_feed from anon;
grant select on public.anniversary_feed to authenticated;

notify pgrst, 'reload schema';

commit;
