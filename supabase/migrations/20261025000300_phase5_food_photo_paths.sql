-- ============================================================================
-- Lovers Diary · 阶段 5
-- 允许另一半编辑美食记录时替换照片
--
-- 背景：Storage 上传策略仍强制文件路径以当前 auth.uid() 开头。
-- 原先数据库额外要求路径前缀必须等于记录 created_by，
-- 导致账号 B 无法替换账号 A 创建记录里的照片。此迁移只移除这两个多余约束。
-- ============================================================================

begin;

alter table public.food_records
  drop constraint if exists food_records_photo_path_owner_check;

alter table public.food_records
  drop constraint if exists food_records_thumb_path_owner_check;

notify pgrst, 'reload schema';

commit;
