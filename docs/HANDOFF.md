# 爱苏日记 · 项目交接文档

最后更新：2026-10-25  
当前版本：`1.2.0` / `versionCode 4` / runtime `1.2.0`  
App 名称：爱苏日记  
Android 包名：`com.loversdiary.app`  
GitHub：`https://github.com/xiaowulai-s/Lovers-Diary.git`

---

## 1. 项目定位

仅供两名固定授权用户使用的私密情侣日记 Android App。

核心原则：

- 原创浅色 UI，但当前桌面图标使用用户提供的角色图，公开分发前必须确认版权
- Supabase Auth / Postgres / Storage / RLS
- 客户端只使用 publishable key，绝不使用 service_role
- 所有业务表强制 RLS，仅两个固定 UUID 可读写
- 照片存私有 `photos` 桶，路径必须以 `auth.uid()` 开头，读取走 signed URL
- 5 个底部 Tab：纪念日、相册、小窝、美食、计划
- 禁止本地原生构建；APK 只通过 EAS Build 生成，后续 JS 走 EAS Update

---

## 2. 当前交付状态

已通过真机验收：

- 初始化、认证与 RLS、第三账号拦截
- 纪念日增删改、在一起天数、分页、排序
- 照片/拍照/压缩/缩略图/相册/全屏/删除/signed URL
- 小窝纸条、双人昵称头像
- 美食月历、当天记录、照片、收藏、月统计
- 计划待办/日历、完成、编辑、删除
- 全局搜索、照片说明/收藏
- 年度回顾（最近 5 年、12 张照片、每类 5 条摘要、页内详情）
- JSON 备份（全部表 + 照片路径 + 4 小时 signed URL）
- EAS preview APK + preview OTA

最近一次 OTA 更新组：`24fd1eaa-b684-401a-a1c1-de7de1745ebe`

未实现功能、优先级与边界详见：

- [README.md](../README.md)
- [next-phase-plan.md](./next-phase-plan.md)
- [update-guide.md](./update-guide.md)
- [domestic-network-design.md](./domestic-network-design.md)（国内部署设计，已暂停，不要擅自迁移）

---

## 3. 技术栈

- Expo SDK 58
- React Native 0.88
- React 19.3
- TypeScript 6，`strict` + `noUncheckedIndexedAccess`
- React Navigation 7
- React Query 5
- Supabase JS 2.118
- EAS Build / EAS Update

已安装的原生能力：

- expo-image / expo-image-picker / expo-image-manipulator
- expo-file-system / expo-sharing
- expo-local-authentication / expo-screen-capture
- expo-secure-store / expo-crypto
- expo-notifications / expo-haptics
- expo-updates

注意：应用锁、通知、截图保护还没有接入代码，只安装了原生模块。

---

## 4. 目录结构

```text
App.tsx
index.ts
app.json
eas.json
package.json
tsconfig.json
.env

src/
  components/       通用 UI：TabBar、Card、PageHeader、BrandMark、AppButton 等
  navigation/       RootNavigator、Tab 类型
  providers/        AuthProvider、AppProviders
  screens/          5 个 Tab 页面、登录、启动、鉴权失败
  lib/              supabase、signedUrls、database.types、date、env
  theme/            颜色、字体、间距、圆角
  features/
    anniversaries/  纪念日表单、分页、天数计算
    photos/         压缩、上传、signed URL、相册、查看器、收藏
    loveNotes/      小纸条
    profiles/       昵称、头像
    search/         全局搜索
    food/           美食月历与表单
    plans/          待办与日历
    review/         年度回顾、详情、JSON 导出

supabase/migrations/ 全部 SQL 迁移
docs/                交接、计划、更新指引、国内部署设计
assets/              App 图标、启动图、品牌徽章
```

---

## 5. 环境与启动

工作目录：`d:\Demo\Lovers Diary`  
Shell：Windows PowerShell

```powershell
npm install
npm start -- --clear
```

Expo Go 要求：

- Expo Go 必须支持 SDK 58
- Expo CLI 与手机 Expo Go 必须登录同一个 Expo 账号
- 若浏览器登录失败，可用 `npx expo login --no-browser` 或 `EXPO_TOKEN`

环境变量在 `.env`：

```env
EXPO_PUBLIC_SUPABASE_URL=https://qhbqtthrjailuuvyjhat.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_VnDP2TgtW0N7phdkBEXxcQ_sgKSE4P4
```

关键规则：

- URL 必须是项目根地址，不能带 `/rest/v1/`
- 只能使用 `sb_publishable_...`
- 不要读取、复制或写入 service_role key
- `.env` 与 `eas.json` 中的 Supabase 配置必须保持一致

Supabase 项目：

- ref：`qhbqtthrjailuuvyjhat`
- URL：`https://qhbqtthrjailuuvyjhat.supabase.co`

EAS：

- owner：`hou123454321`
- projectId：`a7579d69-8d12-40ed-a0be-13c9d00c6cae`
- 构建 profile：`preview`，APK，internal distribution
- OTA 频道：`preview`
- App 的 `updates.url` 已指向该 EAS 项目

### 5.1 Supabase 配置核对表

| 配置项 | 当前值 / 位置 | 备注 |
| --- | --- | --- |
| Project URL | `https://qhbqtthrjailuuvyjhat.supabase.co` | `.env` 与 `eas.json` 两处一致 |
| Project ref | `qhbqtthrjailuuvyjhat` | 控制台项目 ID |
| Publishable key | `sb_publishable_VnDP2TgtW0N7phdkBEXxcQ_sgKSE4P4` | 客户端可公开 key；不要替换成 service_role |
| EAS preview env | `eas.json` → `build.preview.env` | 本地 `.env` 必须一致 |
| EAS production env | `eas.json` → `build.production.env` | 当前未发布生产渠道 |
| Auth Provider | Email | 控制台 Authentication → Providers |
| 公开注册 | 关闭 | 客户端无注册入口，账号手动创建 |
| 授权账号 | 2 个固定 UUID | 硬编码在 `20261025000100_phase2_auth_rls.sql` |
| 邮箱确认 | 两位用户已确认 | 未确认账号无法登录 |
| 客户端 Session | AsyncStorage + autoRefresh | `src/lib/supabase.ts` |
| Storage bucket | `photos` | 私有，非 public |
| 单文件上限 | `512000` bytes | 照片与头像都受此限制 |
| 允许 MIME | `image/jpeg`、`image/png`、`image/webp` | 见 Phase 2 SQL |
| signed URL TTL | 4 小时 | 照片、头像、JSON 备份链接一致 |
| Realtime | 未启用 | 进入 Tab/刷新时重新查询 |
| Supabase CLI 配置 | 无 `supabase/config.toml` | 迁移由 SQL Editor 手工执行 |
| Dashboard | `https://supabase.com/dashboard/project/qhbqtthrjailuuvyjhat` | 控制台入口 |
| SQL Editor | `https://supabase.com/dashboard/project/qhbqtthrjailuuvyjhat/sql/new` | 执行 migrations |

如果更换 Supabase 项目或轮换 key，必须同步修改：

1. `.env`
2. `eas.json` 的 `preview.env`
3. `eas.json` 的 `production.env`

更换后重新发布 OTA；若已更换原生构建中的环境值，则必须重新构建 APK。

不要让下一位 AI 索取 Expo/Supabase 密码。优先复用本机已登录的 CLI 会话或用户自行登录。

---

## 6. 数据库与 RLS

### 6.1 表

- `anniversaries`：纪念日与唯一的「在一起」锚点
- `photo_albums`：自定义相册
- `photo_entries`：照片记录、caption、is_favorite、路径与尺寸
- `love_notes`：小纸条
- `food_records`：美食记录、图片路径、收藏
- `todo_items`：计划/待办
- `profiles`：双人昵称与头像

### 6.2 视图与函数

- `public.anniversary_feed`：带 `next_on` 的纪念日排序视图，`security_invoker`
- `private.is_member()`：两个固定 UUID 的白名单判断
- `private.touch_updated_at()`：更新时间触发器
- `public.is_authorized()`：登录后校验账号是否在授权名单
- `public.search_content(text)`：全局搜索 RPC，`security_invoker`，仅 authenticated 可执行
- `public.get_year_review(integer)`：年度回顾聚合 RPC，`security_invoker`，仅 authenticated 可执行
- `pg_trgm`：安装在 `extensions` schema，用于中文搜索索引
- RPC 内部依赖底层表 RLS；没有绕过 RLS 的 security definer 查询

### 6.3 RLS 与 Storage

- 6 张业务表 + `profiles` 全部启用并强制 RLS
- 6 张业务表各 4 条策略：select / insert / update / delete
- `profiles` 4 条策略：两位成员可读，只能新增/更新/删除自己的行
- `is_authorized` / `search_content` / `get_year_review` 仅授予 authenticated
- `anon` 没有业务表权限
- `photos` bucket 私有，`public = false`
- 单文件上限 `512000` bytes，允许 JPEG/PNG/WebP
- Storage select：白名单成员可签名读取
- Storage insert：路径第一段必须等于 `auth.uid()`
- Storage delete：白名单成员可删除
- Storage 没有 update 策略；换图必须上传新对象
- 头像路径必须是 `auth.uid()/profile/...`
- Storage 读取通过 signed URL，TTL 4 小时
- 客户端不持有 service_role，signed URL 由用户 session 调用生成

三个账号验收要求：

1. 第三账号在 App 登录后：`is_authorized` 返回 false，自动退出
2. 第三账号通过 REST 查询 7 张表：全部返回空数组
3. 第三账号尝试写入任一业务表：被 RLS 拒绝
4. 第三账号尝试给已有照片生成 signed URL：被拒绝
5. 两个授权账号仍能互读对方纸条、美食、照片、计划和资料

### 6.4 SQL 迁移顺序

全部按文件名顺序执行过：

```text
20261025000100_phase2_auth_rls.sql
20261025000200_phase3_anniversary_feed.sql
20261025000300_phase5_food_photo_paths.sql
20261025000400_phase7_profiles.sql
20261025000500_phase8a_search_favorites.sql
20261025000600_phase8b_year_review.sql
20261025000700_phase8b_review_details.sql
```

重建数据库时必须按顺序执行。  
客户端 publishable key 没有 DDL 权限，迁移必须由用户在 Supabase SQL Editor 执行。

当前没有 `supabase/config.toml`，不要假设 `supabase db push` 会自动应用迁移；也不要对远程项目执行 `supabase db reset`。

- SQL Editor：`https://supabase.com/dashboard/project/qhbqtthrjailuuvyjhat/sql/new`
- Authentication Users：`https://supabase.com/dashboard/project/qhbqtthrjailuuvyjhat/auth/users`
- Storage：`https://supabase.com/dashboard/project/qhbqtthrjailuuvyjhat/storage/buckets`

---

## 7. 认证流程

1. `AuthProvider` 从本地读取 Supabase session
2. 没有 session → 登录页
3. 有 session → 调用 `is_authorized` RPC
4. RPC 失败 → 鉴权失败页，不显示任何私密数据（fail-closed）
5. RPC 返回 false → 立即本地登出，提示不在授权名单
6. RPC 返回 true → 显示 5 个 Tab

当前没有注册入口，Supabase Auth 的公开注册已关闭，两个账号由控制台手动创建。

已知限制：启动和切换数据都需要网络；没有离线授权或离线读取。

---

## 8. 关键实现与文件

### 认证

- [AuthProvider.tsx](../src/providers/AuthProvider.tsx)
- [RootNavigator.tsx](../src/navigation/RootNavigator.tsx)
- [supabase.ts](../src/lib/supabase.ts)

### 纪念日

- [AnniversariesScreen.tsx](../src/screens/AnniversariesScreen.tsx)
- [AnniversaryFormSheet.tsx](../src/features/anniversaries/AnniversaryFormSheet.tsx)
- [useAnniversaries.ts](../src/features/anniversaries/useAnniversaries.ts)
- [utils.ts](../src/features/anniversaries/utils.ts)

排序使用 `anniversary_feed.next_on`，不要退回只按 `happened_on` 排序。

### 照片

- [imagePipeline.ts](../src/features/photos/imagePipeline.ts)
- [uploadImage.ts](../src/features/photos/uploadImage.ts)
- [usePhotos.ts](../src/features/photos/usePhotos.ts)
- [PhotoViewer.tsx](../src/features/photos/PhotoViewer.tsx)
- [PhotosScreen.tsx](../src/screens/PhotosScreen.tsx)
- [signedUrls.ts](../src/lib/signedUrls.ts)

规则：

- 照片最长边 1920，初始质量 0.8，最终 ≤500KB
- 缩略图 480px
- 头像最长边 512，目标 ≤300KB，最终上限 500KB
- 头像新路径 `uid/profile/avatar-*.jpg`
- 删除照片时清理原图与缩略图
- 收藏筛选使用 `photo_entries.is_favorite`

### 小窝与资料

- [HomeScreen.tsx](../src/screens/HomeScreen.tsx)
- [LoveNoteFormSheet.tsx](../src/features/loveNotes/LoveNoteFormSheet.tsx)
- [ProfileSheet.tsx](../src/features/profiles/ProfileSheet.tsx)
- [ProfileAvatar.tsx](../src/features/profiles/ProfileAvatar.tsx)
- [useProfiles.ts](../src/features/profiles/useProfiles.ts)

### 美食与计划

- [FoodScreen.tsx](../src/screens/FoodScreen.tsx)
- [FoodFormSheet.tsx](../src/features/food/FoodFormSheet.tsx)
- [useFood.ts](../src/features/food/useFood.ts)
- [PlansScreen.tsx](../src/screens/PlansScreen.tsx)
- [useTodos.ts](../src/features/plans/useTodos.ts)

### 搜索、回顾、导出

- [SearchSheet.tsx](../src/features/search/SearchSheet.tsx)
- [useSearch.ts](../src/features/search/useSearch.ts)
- [YearReviewSheet.tsx](../src/features/review/YearReviewSheet.tsx)
- [ReviewDetailSheet.tsx](../src/features/review/ReviewDetailSheet.tsx)
- [useYearReview.ts](../src/features/review/useYearReview.ts)
- [exportBackup.ts](../src/features/review/exportBackup.ts)

---

## 9. 构建与 OTA

### 校验

```powershell
npm run typecheck
npm run lint
npx expo export --platform android --output-dir "$env:TEMP\lovers-check" --clear
```

### 构建 preview APK

```powershell
npm run build:preview
```

- 云端 EAS 构建
- 不要执行 `expo prebuild`、Gradle 或任何本地原生构建
- 构建完成后安装 APK

### 发布 JS 更新

```powershell
npm run update:preview -- --message "本次改动说明"
```

- 只在纯 JS/样式/文案改动时使用
- 手机彻底关闭再打开两次应用更新
- 不要修改 `version`，否则 runtime 改变
- 新增原生模块、插件、权限、图标、启动图后必须升 version/versionCode 并重新构建 APK

当前版本规则：

- JS-only：保持 `1.2.0` / runtime `1.2.0`
- 新原生能力：建议 `1.3.0` / `versionCode 5`，重新构建 APK

详见 [update-guide.md](./update-guide.md)。

---

## 10. 本轮已修复的关键问题

- 时间输入不能输入冒号：改为小时/分钟两个数字框
- `EXPO_PUBLIC_SUPABASE_URL` 带 `/rest/v1/` 导致所有请求失败：已改根地址
- 纪念日列表排序错误：新增 `anniversary_feed` 视图，按下一次发生日期排序
- 美食照片跨账号替换失败：移除数据库多余路径所有者约束，Storage 仍限制上传前缀
- 搜索页键盘弹出导致面板折叠：移除搜索面板的 `KeyboardAvoidingView height`
- 头像/资料 RLS：只允许本人改自己的 `profiles` 行
- 资料表未建时：错误文案提示执行 Phase 7 SQL
- 年度回顾只显示数字：扩展 RPC，增加照片、纸条、美食、计划、纪念日摘要与页内详情

---

## 11. 常见坑

1. **剪贴板不可靠**：不要把重要 SQL 只放在对话剪贴板，始终提供文件路径。
2. **Publishable key 不能执行 DDL**：建表、RLS、RPC 必须用户在 SQL Editor 执行。
3. **PostgREST schema cache**：迁移末尾有 `notify pgrst, 'reload schema'`，执行后稍等再试。
4. **固定 UUID**：白名单在两个迁移中硬编码；更换账号必须同步更新 SQL。
5. **Storage 路径**：客户端 key 无法绕过 RLS；上传前缀必须是当前用户 UID。
6. **EAS runtime**：APK runtime 与 OTA runtime 不一致时收不到更新。
7. **Expo Go**：SDK 58 + 登录 Expo 账号；它不是最终 APK 环境。
8. **海外网络**：Supabase 与 EAS 都在海外；手机无法直连时登录/数据会失败。国内迁移设计已暂停。
9. **图标版权**：当前图标是用户提供的受版权保护角色，不要公开分发或商用。
10. **JSON 备份**：只包含 signed URL，4 小时后不可用；照片文件没有打包。

---

## 12. 下一位 AI 的建议顺序

1. **应用锁 + 截图保护 + 隐私中心**（当前最大缺口）
   - 原生模块已安装，可直接做 JS 层
   - 需要确认 PIN/自动锁定时间/截图开关
2. **本地提醒**
   - 纪念日、待办、写日记提醒
   - 通知模块已在 1.2.0 APK 中
3. **照片 ZIP/加密备份**
   - 需要先确认纯 JS 还是原生打包
4. **离线缓存与写入队列**
5. **统一动态、回应、美食评分/标签、计划负责人**
6. 国内无 VPN 部署：已设计但明确暂停，不要自行开始迁移

功能状态总表见 [next-phase-plan.md](./next-phase-plan.md)。

---

## 13. 交接检查清单

- [ ] 能运行 `npm install` 与 `npm start`
- [ ] `npx expo whoami` / `npx eas-cli whoami` 可用
- [ ] `.env` 与 `eas.json` 的 Supabase 配置一致
- [ ] 两个授权账号可登录
- [ ] 第三账号被 `is_authorized` 拦截
- [ ] 所有 SQL 迁移已执行
- [ ] `npm run typecheck` 通过
- [ ] `npm run lint` 通过
- [ ] 能构建 preview APK
- [ ] 能发布 preview OTA
- [ ] 已阅读 `update-guide.md` 与 `next-phase-plan.md`
- [ ] 已知悉图标版权与海外网络限制
