# 爱苏日记 手机端更新指引

适用项目：`爱苏日记`  
Android 包名：`com.loversdiary.app`  
更新通道：`preview`  
当前版本：`1.2.0`  
runtimeVersion 策略：`appVersion`

---

## 1. 先区分三种环境

| 环境 | 用途 | 更新方式 |
| --- | --- | --- |
| Expo Go | 开发、调试 | Metro 热更新，不经过 EAS Update |
| preview APK | 真机验收、日常使用 | 首次安装 APK，之后用 EAS Update 推送 JS |
| 数据库 / Storage | 数据与权限 | Supabase SQL，不涉及 App 安装 |

重要：

- Expo Go 里的修改只存在于开发服务器，不会自动进入手机上的 APK。
- preview APK 必须先用 EAS 构建并安装一次。
- 安装 APK 后，纯 JS 修复和功能通过 EAS Update 更新，不需要重新打包。
- 只要新增或删除原生模块，就必须重新构建 APK。

---

## 2. 首次构建并安装 preview APK

前置条件：

- 本机已登录 Expo / EAS 账号
- `app.json` 已有真实 `extra.eas.projectId` 和 `updates.url`
- `.env` 已填 Supabase URL 与 publishable key
- `eas.json` 的 `preview.env` 与 `.env` 使用同一个 Supabase 项目

命令：

```powershell
npx eas-cli whoami
npm run typecheck
npm run lint
npm run build:preview
```

说明：

- `npm run build:preview` 使用 EAS 云端构建，输出 APK。
- 首次构建会提示创建 Android Keystore，选择自动生成。
- 第一版 APK 会包含当前所有原生模块：
  - expo-image
  - expo-image-picker
  - expo-image-manipulator
  - expo-file-system
  - expo-updates
- 构建完成后，用 EAS 提供的链接下载 APK，在 Android 上允许安装未知应用后安装。

如本机未登录：

```powershell
npx eas-cli login --no-browser
```

浏览器登录异常时，可在 `expo.dev` 创建 Access Token：

```powershell
$env:EXPO_TOKEN = '只放在当前终端，不要提交'
npx eas-cli whoami
```

---

## 3. 日常更新：只改 JS

### 适用情况

- 页面、组件、样式、文案
- 业务逻辑、表单校验
- 查询条件、分页、缓存策略
- 不新增原生依赖

### 发布前检查

```powershell
npm run typecheck
npm run lint
npm start
```

在 Expo Go 中完成功能验证，并确认 `.env` 中的 Supabase URL 与 publishable key 正确。

### 发布更新

```powershell
npm run update:preview -- --message "修复美食时间输入"
```

等命令显示更新发布成功后，到手机端：

1. 从最近任务中彻底关闭 App。
2. 重新打开 App，App 启动时会检查并下载更新。
3. 再彻底关闭并重新打开一次，新 JS 生效。
4. 如需验证，发布前先改一处可见文案，例如小窝的说明文字。

当前 `expo-updates` 使用默认启动检查行为（ON_LOAD）：下载完成后通常在下一次启动应用。

### 发布后确认

- EAS 控制台的 Updates 页面能看到对应 `preview` 更新
- 手机在联网状态下重新打开 App 后出现改动
- 更新不会影响 Supabase 数据，已写入的照片、纸条、计划仍保留

---

## 4. 什么时候必须重新构建 APK

出现以下任一情况，EAS Update 无法生效，必须执行 `npm run build:preview` 并重新安装 APK：

- 新增或删除带原生代码的依赖，例如大多数 `expo-*` 包
- 修改 `app.json` 插件、Android 权限、包名、应用名
- 修改图标、启动图、原生闪屏配置
- 升级 Expo SDK 或 React Native
- 修改 `version`、`versionCode` 或 `runtimeVersion`
- 修改 `eas.json` 中原生构建相关配置

### 原生版本升级流程

1. 修改 `app.json`：

```json
{
  "version": "1.2.1",
  "android": {
    "versionCode": 5
  }
}
```

2. 重新构建：

```powershell
npm run build:preview
```

3. 手机安装新 APK（覆盖安装即可）。

4. 新 APK 的 runtimeVersion 会变成 `1.2.1`。之后发布更新时，必须使用对应的新版本代码，旧 APK 不会收到 1.2.1 的更新。

注意：

- 只改 JS 时不要把 `version` 从 `1.2.0` 改掉，否则 runtime 不再匹配。
- 不要把原生模块通过 EAS Update 推给旧 APK，旧 APK 没有对应原生代码，会在运行时崩溃。

---

## 5. 只改数据库或 RLS

如果只修改表、索引、约束或 RLS：

1. 把迁移放在 `supabase/migrations/`
2. 在 Supabase SQL Editor 执行
3. 不需要更新 APK，也不需要发布 EAS Update
4. 用第三账号重新验证读、写越权均被拒绝

只有客户端也修改了表字段、查询或表单时，才需要按第 3 节发布新 JS。

---

## 6. 环境变量规则

| 位置 | 作用 |
| --- | --- |
| `.env` | 本地 Expo Go 开发；本机执行 EAS Update 时打包 JS 使用 |
| `eas.json` → `build.preview.env` | EAS 云端构建 APK 时注入 |
| EAS 控制台环境变量 | 可选，当前未使用 |

规则：

- 两处 Supabase URL 与 publishable key 必须一致
- 客户端只允许 publishable key，严禁 service_role key
- `.env` 已在 `.gitignore` 中，不要提交
- 更换 Supabase 项目时，`.env` 与 `eas.json` 同时修改；改完后发布一次 JS 更新或重建 APK

---

## 7. 版本与 runtime 规则

当前配置：

```json
"runtimeVersion": {
  "policy": "appVersion"
}
```

含义：

- runtime 由 `version` 决定
- `version` 保持 `1.2.0` 时，所有 `1.2.0` 的 APK 都能接收 `preview` 的 JS 更新
- 修改 `version` 后，旧 APK 不再接收新 runtime 的更新
- 因此：**只改 JS 不动 version；改原生代码时再升 version 和 versionCode**

---

## 8. 回滚与故障处理

### 更新没有生效

依次检查：

1. APK 是否由 `preview` profile 构建
2. APK 的 runtimeVersion 是否与更新匹配
3. 是否执行的是 `--channel preview`
4. 手机能否访问 `u.expo.dev`
5. 是否彻底关闭并重新打开了 App
6. 更新是否只包含 JS；若新增原生模块，必须重新构建 APK

### 推了一个有问题的 JS 更新

优先发布修复版：

```powershell
npm run update:preview -- --message "修复上一版问题"
```

也可以在 EAS 控制台 Updates 页面选择上一个可用版本重新发布/回退。保留一份可用 APK；如果 App 已经无法启动，重新安装 APK 是最可靠的恢复方式。

### EAS 登录失败

- 确认使用 Expo Go 中同一个 Expo 账号
- 忘记密码：`https://expo.dev/forgot-password`
- 账号是 Google/GitHub 登录：使用浏览器或 Access Token
- 不要把 token、密码写进项目文件或 Git

### 构建失败

- 检查 `npx eas-cli whoami`
- 检查 `app.json` 的 projectId 是否存在
- 检查 `.env` 与 `eas.json` 环境变量
- 检查 Android 包名、versionCode
- 检查网络是否能访问 Expo / EAS 服务

---

## 9. 每次发布检查清单

### JS 更新

- [ ] `npm run typecheck` 通过
- [ ] `npm run lint` 通过
- [ ] Expo Go 中验证功能
- [ ] `.env` 使用正确 Supabase 项目
- [ ] 没有新增原生模块
- [ ] `npm run update:preview -- --message "..."`
- [ ] 手机彻底关闭并打开两次
- [ ] 真机确认改动生效，旧数据仍存在

### 原生 APK 更新

- [ ] 确认确实改动了原生依赖或配置
- [ ] 提升 `version` 与 `versionCode`
- [ ] `npm run build:preview`
- [ ] 安装新 APK
- [ ] 验证登录、照片、纸条、美食、计划
- [ ] 之后的新 JS 更新使用新的 runtime

### 数据库 / RLS 更新

- [ ] 迁移文件已保存到 `supabase/migrations/`
- [ ] Supabase SQL Editor 执行成功
- [ ] 授权账号读写正常
- [ ] 第三账号读写均被拒绝

---

## 10. 常用命令速查

```powershell
# 开发
npm start

# 静态检查
npm run typecheck
npm run lint

# 发布 preview JS 更新
npm run update:preview -- --message "本次改动说明"

# 构建 preview APK
npm run build:preview

# 查看 Expo 当前账号
npx eas-cli whoami

# 登录 EAS
npx eas-cli login --no-browser
```

禁止使用本地原生构建：不要执行 `expo prebuild`、`expo run:android`、Gradle 或生成 `android/` 目录。所有 APK 均由 EAS 云端生成。
