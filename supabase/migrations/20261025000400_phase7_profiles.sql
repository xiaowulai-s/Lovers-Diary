-- Lovers Diary · Phase 7
-- 双人资料：昵称与头像
-- 仅两位白名单用户可读；每位用户只能新增/修改自己的资料。

begin;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_length check (char_length(display_name) <= 24),
  constraint profiles_avatar_path_length check (avatar_path is null or char_length(avatar_path) <= 512)
);

comment on table public.profiles is '两位授权用户的昵称与头像路径';

alter table public.profiles enable row level security;
alter table public.profiles force row level security;

drop policy if exists profiles_member_select on public.profiles;
create policy profiles_member_select
  on public.profiles for select to authenticated
  using ((select private.is_member()));

drop policy if exists profiles_self_insert on public.profiles;
create policy profiles_self_insert
  on public.profiles for insert to authenticated
  with check (
    (select private.is_member())
    and user_id = auth.uid()
    and (
      avatar_path is null
      or avatar_path like auth.uid()::text || '/profile/%'
    )
  );

drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update
  on public.profiles for update to authenticated
  using (
    (select private.is_member())
    and user_id = auth.uid()
  )
  with check (
    (select private.is_member())
    and user_id = auth.uid()
    and (
      avatar_path is null
      or avatar_path like auth.uid()::text || '/profile/%'
    )
  );

drop policy if exists profiles_self_delete on public.profiles;
create policy profiles_self_delete
  on public.profiles for delete to authenticated
  using (
    (select private.is_member())
    and user_id = auth.uid()
  );

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function private.touch_updated_at();

create index if not exists profiles_updated_at_idx
  on public.profiles (updated_at desc);

grant select, insert, update, delete on public.profiles to authenticated;
revoke all on public.profiles from anon;

notify pgrst, 'reload schema';

commit;
