# 爱苏日记

仅供两名固定授权用户使用的 Android 私密情侣日记 App。

- 技术：Expo SDK 58 / React Native 0.88 / TypeScript strict
- 后端：Supabase Auth + Postgres + Storage + RLS
- 发布：EAS preview APK + expo-updates preview 频道
- 当前版本：`1.2.0` / `versionCode 4` / runtime `1.2.0`

---

## 功能

### 纪念日
- 在一起天数、最近纪念日
- 纪念日增删改、每年重复、分页
- 「在一起」全表唯一，日期不能晚于今天

### 相册
- 拍照或相册多选，单次最多 10 张
- 自动压缩：最长边 1920、质量 0.8、≤500KB
- 缩略图、私有 Storage、批量 signed URL
- 网格/动态视图、分页、全屏查看、删除
- 自定义相册、照片说明、收藏、只看收藏

### 小窝
- 最近照片、相册入口、小纸条增删改
- 双人昵称与头像
- 纸条作者显示昵称和头像

### 美食
- 按月日历、点日期查看当天记录
- 照片、名称、日期时间、城市、店铺、备注、收藏
- 月统计与收藏标记

### 计划
- 待办/日历双视图
- 新增、完成、撤销完成、编辑、删除
- 按到期日排序、日历圆点

### 查找与回顾
- 全局搜索：纪念日、纸条、美食、计划、照片说明
- 中文 `pg_trgm` 索引
- 年度回顾：最近 5 年、12 张照片、每类 5 条摘要、页内详情
- JSON 备份：全部表 + 照片路径 + 4 小时 signed URL

---

## 安全模型

- 所有业务表启用并强制 RLS
- 仅两个固定 UUID 可读写
- 登录后调用 `is_authorized` RPC，失败即阻断，不显示私密内容
- 客户端只使用 Supabase publishable key，绝不使用 service_role
- `photos` 桶为私有；上传路径必须以 `auth.uid()` 开头
- 读取照片与头像使用 4 小时 signed URL
- 第三账号：App 内被拦截；REST 查询为空；写入被 RLS 拒绝

---

## 快速开始

### 1. 环境

- Node.js
- Expo Go（SDK 58）
- Windows PowerShell 或等价终端

```powershell
npm install
Copy-Item .env.example .env
```

在 `.env` 填写：

```env
EXPO_PUBLIC_SUPABASE_URL=https://你的项目.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

注意：

- URL 必须是项目根地址，不能带 `/rest/v1/`
- 只能填 publishable key，不能填 service_role

### 2. 启动

```powershell
npm start -- --clear
```

Expo CLI 与手机 Expo Go 需要登录同一个 Expo 账号。

### 3. Supabase 初始化

按顺序执行 `supabase/migrations/` 下的 SQL：

```text
20261025000100_phase2_auth_rls.sql
20261025000200_phase3_anniversary_feed.sql
20261025000300_phase5_food_photo_paths.sql
20261025000400_phase7_profiles.sql
20261025000500_phase8a_search_favorites.sql
20261025000600_phase8b_year_review.sql
20261025000700_phase8b_review_details.sql
```

这些 SQL 包含：

- 表、索引、触发器
- RLS 策略与两个授权 UUID
- 私有 `photos` 桶与 Storage 策略
- `anniversary_feed` 视图
- `is_authorized`、`search_content`、`get_year_review` 函数

publishable key 没有 DDL 权限，必须在 Supabase SQL Editor 执行。完整配置见 [HANDOFF.md](./docs/HANDOFF.md)。

### 4. 校验

```powershell
npm run typecheck
npm run lint
npx expo export --platform android --output-dir "$env:TEMP\lovers-check" --clear
```

---

## 构建与热更新

### 首次 APK

```powershell
npx eas-cli login --no-browser
npm run build:preview
```

- 云端 EAS Build
- preview profile 输出 APK
- 禁止本地 `expo prebuild`、Gradle 或原生构建

### 后续 JS 更新

```powershell
npm run update:preview -- --message "本次改动说明"
```

- 只适用于 JS/样式/文案改动
- 手机彻底关闭并重开两次
- 保持 `version` 不变，否则 runtime 不再匹配
- 新增原生模块、插件、权限、图标、启动图后，必须升 version/versionCode 并重新构建 APK

详细流程见 [update-guide.md](./docs/update-guide.md)。

---

## 目录结构

```text
src/
  components/       通用 UI
  navigation/       5 Tab 导航
  providers/        Auth、React Query
  screens/          5 个 Tab 与认证页面
  features/
    anniversaries/  纪念日
    photos/         照片与相册
    loveNotes/      小纸条
    profiles/       双人资料
    food/           美食
    plans/          计划
    search/         全局搜索
    review/         年度回顾与备份
  lib/              Supabase、signed URLs、数据库类型
  theme/            设计 token
supabase/migrations/ SQL 迁移
docs/                交接、计划、更新指引
assets/              图标与启动图
```

---

## 已知限制

- 仍依赖海外 Supabase；启动需要网络，无离线模式
- 应用锁、截图屏蔽、隐私中心尚未实现
- 本地提醒、照片 ZIP/加密备份、统一动态与离线写入队列尚未实现
- 全局搜索点击结果只进入对应 Tab，不打开单条记录
- 年度回顾仅最近 5 年；导出为全部数据
- JSON 备份只含 signed URL，不含照片文件，链接 4 小时后失效

完整功能状态见 [next-phase-plan.md](./docs/next-phase-plan.md)。

---

## 文档

- [项目交接文档](./docs/HANDOFF.md)
- [下一阶段开发计划](./docs/next-phase-plan.md)
- [手机端更新指引](./docs/update-guide.md)
- [国内网络部署设计（暂停）](./docs/domestic-network-design.md)

---

## 隐私与版权

- 当前仓库中的角色图标由用户提供，可能受版权保护
- 仅适合私人使用；公开分发、上架或商用前必须确认授权
- 不要提交 `.env`、service_role key、APK 或用户私密数据
- `logo.jpg` 为图标来源文件，Git 已保留；如公开仓库，请先确认版权
