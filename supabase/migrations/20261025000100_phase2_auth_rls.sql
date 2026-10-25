-- ============================================================================
-- Lovers Diary · 阶段 2
-- 两个授权账号的白名单、六张业务表、RLS、私有照片 Storage
--
-- 执行前：
-- 1. 在 Supabase Authentication → Users 中创建两个邮箱密码账号
-- 2. 执行 select id, email from auth.users order by created_at;
-- 3. 把下面两处 1111... / 2222... 换成这两个账号的真实 UUID
-- 4. 在 Authentication → Providers → Email 中关闭公开注册（Allow new users to sign up）
-- 5. 整份脚本粘贴到 SQL Editor 执行
-- ============================================================================

begin;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

-- ---------------------------------------------------------------------------
-- 授权白名单：只有这两个 UUID 能读写任何业务数据
-- ---------------------------------------------------------------------------
create or replace function private.is_member()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select auth.uid() in (
    '53b3f75b-ad01-4e8b-a5d6-64267e6f1cf3'::uuid,
    '789ce8b3-1c45-4dc1-91c2-ffb6a17a053a'::uuid
  );
$$;

revoke all on function private.is_member() from public;
grant execute on function private.is_member() to authenticated;

-- 客户端登录后调用，用于识别“能登录但不在白名单”的第三账号
create or replace function public.is_authorized()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select private.is_member();
$$;

revoke all on function public.is_authorized() from public, anon;
grant execute on function public.is_authorized() to authenticated;

-- ---------------------------------------------------------------------------
-- updated_at 触发器
-- ---------------------------------------------------------------------------
create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function private.touch_updated_at() from public;
grant execute on function private.touch_updated_at() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 表结构
-- ---------------------------------------------------------------------------
create table if not exists public.anniversaries (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  happened_on date not null,
  kind text not null default 'custom',
  recurring boolean not null default false,
  note text,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint anniversaries_title_len check (char_length(btrim(title)) between 1 and 80),
  constraint anniversaries_kind_check check (kind in ('together', 'birthday', 'anniversary', 'trip', 'custom')),
  constraint anniversaries_note_len check (note is null or char_length(note) <= 500)
);

create index if not exists anniversaries_happened_on_idx
  on public.anniversaries (happened_on desc);
create index if not exists anniversaries_created_at_idx
  on public.anniversaries (created_at desc, id desc);
create unique index if not exists anniversaries_single_together_idx
  on public.anniversaries (kind) where kind = 'together';

create table if not exists public.photo_albums (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order integer not null default 0,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint photo_albums_name_len check (char_length(btrim(name)) between 1 and 40)
);

create unique index if not exists photo_albums_name_unique_idx
  on public.photo_albums (lower(btrim(name)));
create index if not exists photo_albums_sort_idx
  on public.photo_albums (sort_order, created_at);

create table if not exists public.photo_entries (
  id uuid primary key default gen_random_uuid(),
  album_id uuid references public.photo_albums (id) on delete set null,
  storage_path text not null,
  thumb_path text,
  caption text,
  taken_at timestamptz not null default now(),
  width integer not null,
  height integer not null,
  size_bytes integer not null,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint photo_entries_storage_path_unique unique (storage_path),
  constraint photo_entries_dimensions_check check (width > 0 and height > 0),
  constraint photo_entries_size_check check (size_bytes between 1 and 512000),
  constraint photo_entries_caption_len check (caption is null or char_length(caption) <= 280),
  constraint photo_entries_path_owner_check
    check (split_part(storage_path, '/', 1) = created_by::text),
  constraint photo_entries_thumb_path_owner_check
    check (thumb_path is null or split_part(thumb_path, '/', 1) = created_by::text)
);

create index if not exists photo_entries_created_at_idx
  on public.photo_entries (created_at desc, id desc);
create index if not exists photo_entries_album_created_at_idx
  on public.photo_entries (album_id, created_at desc, id desc);
create index if not exists photo_entries_taken_at_idx
  on public.photo_entries (taken_at desc);

create table if not exists public.love_notes (
  id uuid primary key default gen_random_uuid(),
  body text not null,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint love_notes_body_len check (char_length(btrim(body)) between 1 and 1000)
);

create index if not exists love_notes_created_at_idx
  on public.love_notes (created_at desc, id desc);

create table if not exists public.food_records (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  eaten_on date not null,
  eaten_at time not null default localtime,
  city text,
  shop text,
  note text,
  is_favorite boolean not null default false,
  photo_path text,
  thumb_path text,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint food_records_name_len check (char_length(btrim(name)) between 1 and 80),
  constraint food_records_city_len check (city is null or char_length(city) <= 40),
  constraint food_records_shop_len check (shop is null or char_length(shop) <= 80),
  constraint food_records_note_len check (note is null or char_length(note) <= 500),
  constraint food_records_photo_path_owner_check
    check (photo_path is null or split_part(photo_path, '/', 1) = created_by::text),
  constraint food_records_thumb_path_owner_check
    check (thumb_path is null or split_part(thumb_path, '/', 1) = created_by::text)
);

create index if not exists food_records_eaten_on_idx
  on public.food_records (eaten_on desc, created_at desc);
create index if not exists food_records_created_at_idx
  on public.food_records (created_at desc, id desc);
create index if not exists food_records_favorite_idx
  on public.food_records (eaten_on desc) where is_favorite;

create table if not exists public.todo_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  note text,
  due_on date,
  is_done boolean not null default false,
  completed_at timestamptz,
  sort_order integer not null default 0,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint todo_items_title_len check (char_length(btrim(title)) between 1 and 120),
  constraint todo_items_note_len check (note is null or char_length(note) <= 500),
  constraint todo_items_completion_check
    check ((is_done and completed_at is not null) or (not is_done and completed_at is null))
);

create index if not exists todo_items_due_on_idx
  on public.todo_items (due_on, is_done, sort_order);
create index if not exists todo_items_created_at_idx
  on public.todo_items (created_at desc, id desc);

-- ---------------------------------------------------------------------------
-- updated_at 触发器绑定
-- ---------------------------------------------------------------------------
drop trigger if exists anniversaries_touch_updated_at on public.anniversaries;
create trigger anniversaries_touch_updated_at
  before update on public.anniversaries
  for each row execute function private.touch_updated_at();

drop trigger if exists photo_albums_touch_updated_at on public.photo_albums;
create trigger photo_albums_touch_updated_at
  before update on public.photo_albums
  for each row execute function private.touch_updated_at();

drop trigger if exists photo_entries_touch_updated_at on public.photo_entries;
create trigger photo_entries_touch_updated_at
  before update on public.photo_entries
  for each row execute function private.touch_updated_at();

drop trigger if exists love_notes_touch_updated_at on public.love_notes;
create trigger love_notes_touch_updated_at
  before update on public.love_notes
  for each row execute function private.touch_updated_at();

drop trigger if exists food_records_touch_updated_at on public.food_records;
create trigger food_records_touch_updated_at
  before update on public.food_records
  for each row execute function private.touch_updated_at();

drop trigger if exists todo_items_touch_updated_at on public.todo_items;
create trigger todo_items_touch_updated_at
  before update on public.todo_items
  for each row execute function private.touch_updated_at();

-- ---------------------------------------------------------------------------
-- 六张表强制 RLS：两个白名单 UUID 可读写，其他 authenticated 用户无行可见
-- ---------------------------------------------------------------------------
alter table public.anniversaries enable row level security;
alter table public.anniversaries force row level security;

drop policy if exists anniversaries_member_select on public.anniversaries;
create policy anniversaries_member_select
  on public.anniversaries for select to authenticated
  using ((select private.is_member()));

drop policy if exists anniversaries_member_insert on public.anniversaries;
create policy anniversaries_member_insert
  on public.anniversaries for insert to authenticated
  with check ((select private.is_member()) and created_by = auth.uid());

drop policy if exists anniversaries_member_update on public.anniversaries;
create policy anniversaries_member_update
  on public.anniversaries for update to authenticated
  using ((select private.is_member()))
  with check ((select private.is_member()));

drop policy if exists anniversaries_member_delete on public.anniversaries;
create policy anniversaries_member_delete
  on public.anniversaries for delete to authenticated
  using ((select private.is_member()));

alter table public.photo_albums enable row level security;
alter table public.photo_albums force row level security;

drop policy if exists photo_albums_member_select on public.photo_albums;
create policy photo_albums_member_select
  on public.photo_albums for select to authenticated
  using ((select private.is_member()));

drop policy if exists photo_albums_member_insert on public.photo_albums;
create policy photo_albums_member_insert
  on public.photo_albums for insert to authenticated
  with check ((select private.is_member()) and created_by = auth.uid());

drop policy if exists photo_albums_member_update on public.photo_albums;
create policy photo_albums_member_update
  on public.photo_albums for update to authenticated
  using ((select private.is_member()))
  with check ((select private.is_member()));

drop policy if exists photo_albums_member_delete on public.photo_albums;
create policy photo_albums_member_delete
  on public.photo_albums for delete to authenticated
  using ((select private.is_member()));

alter table public.photo_entries enable row level security;
alter table public.photo_entries force row level security;

drop policy if exists photo_entries_member_select on public.photo_entries;
create policy photo_entries_member_select
  on public.photo_entries for select to authenticated
  using ((select private.is_member()));

drop policy if exists photo_entries_member_insert on public.photo_entries;
create policy photo_entries_member_insert
  on public.photo_entries for insert to authenticated
  with check ((select private.is_member()) and created_by = auth.uid());

drop policy if exists photo_entries_member_update on public.photo_entries;
create policy photo_entries_member_update
  on public.photo_entries for update to authenticated
  using ((select private.is_member()))
  with check ((select private.is_member()));

drop policy if exists photo_entries_member_delete on public.photo_entries;
create policy photo_entries_member_delete
  on public.photo_entries for delete to authenticated
  using ((select private.is_member()));

alter table public.love_notes enable row level security;
alter table public.love_notes force row level security;

drop policy if exists love_notes_member_select on public.love_notes;
create policy love_notes_member_select
  on public.love_notes for select to authenticated
  using ((select private.is_member()));

drop policy if exists love_notes_member_insert on public.love_notes;
create policy love_notes_member_insert
  on public.love_notes for insert to authenticated
  with check ((select private.is_member()) and created_by = auth.uid());

drop policy if exists love_notes_member_update on public.love_notes;
create policy love_notes_member_update
  on public.love_notes for update to authenticated
  using ((select private.is_member()))
  with check ((select private.is_member()));

drop policy if exists love_notes_member_delete on public.love_notes;
create policy love_notes_member_delete
  on public.love_notes for delete to authenticated
  using ((select private.is_member()));

alter table public.food_records enable row level security;
alter table public.food_records force row level security;

drop policy if exists food_records_member_select on public.food_records;
create policy food_records_member_select
  on public.food_records for select to authenticated
  using ((select private.is_member()));

drop policy if exists food_records_member_insert on public.food_records;
create policy food_records_member_insert
  on public.food_records for insert to authenticated
  with check ((select private.is_member()) and created_by = auth.uid());

drop policy if exists food_records_member_update on public.food_records;
create policy food_records_member_update
  on public.food_records for update to authenticated
  using ((select private.is_member()))
  with check ((select private.is_member()));

drop policy if exists food_records_member_delete on public.food_records;
create policy food_records_member_delete
  on public.food_records for delete to authenticated
  using ((select private.is_member()));

alter table public.todo_items enable row level security;
alter table public.todo_items force row level security;

drop policy if exists todo_items_member_select on public.todo_items;
create policy todo_items_member_select
  on public.todo_items for select to authenticated
  using ((select private.is_member()));

drop policy if exists todo_items_member_insert on public.todo_items;
create policy todo_items_member_insert
  on public.todo_items for insert to authenticated
  with check ((select private.is_member()) and created_by = auth.uid());

drop policy if exists todo_items_member_update on public.todo_items;
create policy todo_items_member_update
  on public.todo_items for update to authenticated
  using ((select private.is_member()))
  with check ((select private.is_member()));

drop policy if exists todo_items_member_delete on public.todo_items;
create policy todo_items_member_delete
  on public.todo_items for delete to authenticated
  using ((select private.is_member()));

-- 只允许 authenticated 访问业务表，匿名密钥不能读写
revoke all on table public.anniversaries from anon;
revoke all on table public.photo_albums from anon;
revoke all on table public.photo_entries from anon;
revoke all on table public.love_notes from anon;
revoke all on table public.food_records from anon;
revoke all on table public.todo_items from anon;

grant select, insert, update, delete on table public.anniversaries to authenticated;
grant select, insert, update, delete on table public.photo_albums to authenticated;
grant select, insert, update, delete on table public.photo_entries to authenticated;
grant select, insert, update, delete on table public.love_notes to authenticated;
grant select, insert, update, delete on table public.food_records to authenticated;
grant select, insert, update, delete on table public.todo_items to authenticated;

-- ---------------------------------------------------------------------------
-- 私有照片桶：仅白名单成员可签名读取；上传路径必须为 auth.uid()/...
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'photos',
  'photos',
  false,
  512000,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists photos_member_select on storage.objects;
create policy photos_member_select
  on storage.objects for select to authenticated
  using (bucket_id = 'photos' and (select private.is_member()));

drop policy if exists photos_member_insert on storage.objects;
create policy photos_member_insert
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'photos'
    and (select private.is_member())
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

drop policy if exists photos_member_delete on storage.objects;
create policy photos_member_delete
  on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and (select private.is_member()));

notify pgrst, 'reload schema';

commit;
