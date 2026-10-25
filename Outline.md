请开发仅供两名授权用户使用的 Android 私密情侣日记 App，原创浅色简洁 UI，不复制任何品牌或素材。技术：Expo+React Native+TypeScript strict、Supabase、Expo Go、EAS Build/Update；禁用本地原生构建；客户端只用 publishable key。

所有表强制 RLS，仅两个固定 UUID 可读写；私有 Storage，路径以 auth。uid() 开头，使用 signed URL；最后用第三账号验证越权失败。

功能：纪念日增删改和在一起天数；照片/拍照、多选压缩（最长边1920、质量0.8、≤500KB）、动态、全屏、删除、自定义相册；小窝含动态、相册和可增删改小纸条；美食月历，点日期弹出当天记录，含照片、名称、时间、城市、店铺、备注、收藏和月统计；计划含待办/日历、完成、编辑和删除。

数据表：anniversaries、photo_entries、photo_albums、love_notes、food_records、todo_items，全部配置 RLS 和索引。底部5个Tab：纪念日、相册、小窝、美食、计划。

要求 Tab 缓存、分页、缩略图、分批生成 signed URL 和错误重试。EAS preview 输出 APK，配置 expo-updates preview 频道；首次装 APK，之后纯 JS 热更新。

分阶段实施：初始化、认证 RLS、纪念日、图片、小窝/美食/计划、性能测试和打包。每阶段先说明方案、给完整代码、运行 tsc/lint、提供真机步骤，等我确认再继续。