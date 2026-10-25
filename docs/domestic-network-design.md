# 爱苏日记 · 去海外依赖与长期免费方案（v4 设计稿）

状态：**设计阶段，暂不实施**（v4 补充了全量备选方案调研，候选从 5 条收敛到 4 条；v1–v3 保留在 git 历史中）
基线：`v1.1.1`、Expo SDK 58 / RN 0.88 / TS strict、Supabase（Postgres + Auth + Storage + RLS）、EAS Build / EAS Update
目标用户：固定两名授权用户

> **v4 相对 v3 的变化**
> 1. **全量调研了 12 条替代路线**（新增：七牛云 Kodo、自建 PocketBase、Hasura、微信云开发、uniCloud、Appwrite/Nhost、VPS+对象存储组合方案），逐一给出否决理由，避免以后重复调研（§3.1、§3.2）
> 2. **提炼出三条硬性淘汰条件**，可快速排除绝大多数免费 BaaS（§3.5）
> 3. **新增决策树**，把 12 条路线收敛到 4 条候选（§3.5）
> 4. **新增方案 I 细化**：VPS 跑 Supabase + 照片外置到国内对象存储，照片出网成本更低（§3.3）
>
> **v3 相对 v2 的关键修正**
> 1. **迁移成本被高估了**：v2 说「必须换 SDK」，实测证明**可以保留 `@supabase/supabase-js`**，只用一个自定义 `fetch` 改写路径前缀（§5.2.1）。有真实生产案例验证：27 个业务文件 + 44 处 `auth.*` 调用点零改动。
> 2. **Storage 兼容层仍未落地**：CloudBase 的 Storage HTTP API 路径与 Supabase 完全不同（`POST /v1/storages/object/sign/:bucketId` vs Supabase 的 `/storage/v1/object/sign/...`），这部分**必须写适配代码**，是整个迁移的真实工作量所在（§5.2.2）。

---

## 0. 先明确一件事：什么叫「完全不依赖海外网络」

这句话有两种截然不同的解法，成本差 10 倍以上。必须先分开：

| 层级 | 含义 | 影响面 | 本方案是否覆盖 |
| --- | --- | --- | --- |
| **L1 终端运行链路** | 手机 App 在运行时不请求任何海外域名（登录、读写、照片、启动更新检查） | 用户体验 | ✅ 完全覆盖 |
| **L2 开发运维链路** | 开发、构建、发布全过程也不碰海外（构建 APK、推 OTA、装依赖） | 你的工作流 | ⚠️ 部分覆盖，需你选一次构建方案 |

> **关键推论**：只要做到 L1，**海外依赖就只剩「构建 APK」这一个偶发动作**。之后的纯 JS 改动走国内自建 OTA，就再也不用构建了。所以 L2 的成本可以被压到很低（见 §7）。

---

## 1. 结论先行

1. **能做，且能做到长期 0 元，但不是靠单一免费托管服务。**
   CloudBase 免费体验版只有 6 个月（续期靠社交分享活动，政策到 2026-12-30），**不能当长期方案**。
2. **真正的长期免费路径是「自建 + 复用国内现有硬件/带宽」**，前提是你有台能常开的设备（NAS / 旧电脑 / 软路由）且有公网可达性。
3. **最低成本、最低风险的务实路线**：CloudBase PG 免费体验版跑 6 个月做验证 → 同时把客户端适配层做好 → 半年后按「实测数据」在「升级 19.9 元/月」「自建轻量 VPS（38–99 元/年）」「家里自建（0 元）」三条里选一条。
4. **本方案发现的最大技术风险不是网络，而是 CloudBase PG 的计费模型**：上海地域 PostgreSQL 按 **342 资源点/(核·小时)** 计 CPU 消耗，3000 点/月 ≈ 平均 0.012 核。这大概率不够用（详见 §5.4）。**这一条必须第一优先级实测验证。**
5. **迁移成本比预想低（v3 修正）**：CloudBase PG 的网关是 **PostgREST 兼容层**，可以**保留 `@supabase/supabase-js`**，只用一个自定义 `fetch` 改写路径前缀。真实生产案例验证过：27 个业务文件 + 44 处 `auth.*` 调用点零改动。本项目 22 处调用点中 **19 处（数据层）可完全不动**。
6. **真正的硬骨头是 Storage**：CloudBase 的 Storage HTTP 端点与 Supabase 完全不同（`POST /v1/storages/object/sign/:bucketId`），必须写约 150–200 行适配器。这是整个迁移唯一的核心新代码。
7. **v1/v2 需要纠正的三处**：认证 UID 类型不兼容（会导致 SQL 迁移直接报错）、PG 的 CPU 计费未被评估、EAS Build 本身也在海外这个矛盾被漏掉。v3 另修正一处：v2 高估了迁移成本（以为必须换 SDK）。详见 §5、§6、§7。
8. **v4 新增结论**：全量调研 12 条替代路线后，**没有任何一条能同时满足「国内直连 + 长期免费 + 保留现有 RLS 权限模型」**。所有免费档 BaaS（LeanCloud、七牛云、微信云开发、uniCloud、Appwrite/Nhost/PocketBase）都在「权限模型」这一条上出局。最终候选收敛为 **A / C / D / I** 四条（§3.1、§3.5）。

---

## 2. 海外依赖清单与阻断等级

| 依赖 | 用途 | 阻断 L1？ | 阻断 L2？ | 处置 |
| --- | --- | --- | --- | --- |
| `*.supabase.co` | Auth / Postgres / Storage / RLS | **是** | 是 | 换国内后端（§5） |
| `u.expo.dev` | EAS Update 启动检查 | 否（可回退内置 JS） | — | 改指国内自建 Updates（§7.2） |
| `expo.dev` / EAS Build | 云端构建 APK | 否 | **是** | 换国内 CI（§7.1） |
| `registry.npmjs.org` | 装依赖 | 否 | 是（弱） | 换 npmmirror（可选） |
| 图片 / 字体 / 图标 | 已打包进 APK | 否 | 否 | 无需处理 |

**L1 验收口径**：手机不挂 VPN，用移动/联通/电信网络，能登录、读写、看照片；App 启动不发出任何海外请求（严格模式抓包核对）。

---

## 3. 方案总览：12 条路线的调研结果

| 路线 | L1 | 长期免费 | 改造成本 | 可靠性 | 数据迁移 | 结论 |
| --- | --- | --- | --- | --- | --- | --- |
| **A. CloudBase PG（免费体验版）** | ✅ | ❌ 仅 6 个月（+ 不确定续期） | **小～中**：数据层零改动，Storage 要写适配层 | 托管，99.95% SLA 仅付费版 | 中等 | **首选做半程验证，不做长期方案** |
| **B. CloudBase 文档型数据库（NoSQL）** | ✅ | ❌ 同上 | **高**：RLS→权限规则，SQL 视图要重写 | 同上 | 高 | 备选（当 PG 计费撑不住时） |
| **C. 国内 VPS 自建 Supabase** | ✅ | ❌ 但 **38–99 元/年** | **低**：SQL/RLS 原样迁 | 自己负责（备份/升级） | 低 | **长期性价比最优** |
| **D. 家里设备自建 Supabase / PocketBase** | ⚠️ 取决于网络 | ✅ **真 0 元** | 低～中 | 取决于家庭宽带与电力 | 低 | 长期 0 元的唯一路径，但有可用性前提 |
| **E. LeanCloud 开发版** | ✅ | ✅ 永久免费档 | 🔴 **极高**（见 §5.7） | 托管 | 极高 | ❌ **不推荐** |
| **F. 七牛云 Kodo + 自建轻后端** | ✅ | 🟠 存储 10GB/月免费但**流量无免费额度** | 高：要自己写鉴权层 | 自己负责 | 中 | ❌ 流量成本劝退 |
| **G. 自建 PocketBase** | ✅ | ✅ **真 0 元** | 🔴 高：SQLite + 规则串，权限模型要重写 | 单机 | 中 | ❌ 见 §3.2 |
| **H. 自建 Hasura + PG** | ✅ | ❌ 但要服务器 | 中：改 GraphQL | 自己负责 | 中 | 🟠 可行但无收益 |
| **I. 组合方案：国内 VPS 跑 Supabase + 国内对象存储放照片** | ✅ | ❌ 38–99 元/年 | **低**（同 C，只是照片外置） | 自己负责 | 低 | ✅ **见 §3.3 推荐** |

### 3.1 全量备选方案总览（含本次新增调研）

除了已评估的 A–E，我把国内其它可能路径也查了一遍。**结论：没有一个能同时满足「国内直连 + 长期免费 + 保留现有 RLS 权限模型」。**

| 方案 | 国内直连 | 长期免费 | 保留 RLS 语义 | 迁移工时 | 判定 |
| --- | --- | --- | --- | --- | --- |
| **A. CloudBase PG** | ✅ | ❌ 6 个月 | ✅ 原生 | 小～中 | **首选半程验证** |
| **B. CloudBase NoSQL** | ✅ | ❌ 6 个月 | ❌ 权限规则 | 高 | 备选 |
| **C. VPS 自建 Supabase** | ✅ | ❌ 38–99 元/年 | ✅ 原生 | 低 | **长期最优** |
| **D. 家里设备自建** | ⚠️ | ✅ 0 元 | ✅ 原生 | 低 | 0 元唯一路径 |
| **E. LeanCloud** | ✅ | ✅ 永久 | ❌ 无 ACL | 极高 | 已否决 |
| **F. 七牛云 Kodo** | ✅ | 🟠 部分 | ❌ 无 RLS | 高 | 已否决 |
| **G. 自建 PocketBase** | ✅ | ✅ 0 元 | ❌ SQLite 规则串 | 高 | 已否决 |
| **H. 自建 Hasura + PG** | ✅ | ❌ 要服务器 | 🟠 改 GraphQL 权限 | 中 | 无额外收益 |
| **I. VPS + 对象存储组合** | ✅ | ❌ 38–99 元/年 | ✅ 原生 | 低 | **同 C，照片成本更低** |
| **J. 微信云开发** | ✅ | ✅ 永久免费档 | ❌ MongoDB 模型 | 高 | 同 LeanCloud，无 RLS |
| **K. uniCloud** | ✅ | 🟠 有免费档 | ❌ 自有权限模型 | 高 | 同 LeanCloud |
| **L. Appwrite / Nhost 自托管** | ✅ | ✅ 0 元 | ❌ 权限模型全变 | 极高 | 不适合本项目 |

### 3.2 几个被否掉的方案的否决理由（避免以后重复调研）

**F. 七牛云 Kodo**：存储侧免费额度确实诱人——**标准存储 10GB/月、CDN 回源 10GB/月、PUT/DELETE 10万次/月、GET 100万次/月，按月发放、永久免费**。但两个致命问题：
1. **HTTPS 流量没有免费额度**。官方计费说明原文：「当域名使用 HTTPS 协议时，无论请求是否使用 HTTPS，都是按 HTTPS 流量收费，且**没有免费额度**」。React Native 只能用 HTTPS。相册浏览约 5.4 GB/月 → 约 1.9 元/月，且**超出即付费，没有免费天花板**。
2. **Kodo 是纯对象存储，没有数据库**。要跑起来必须自己写一整套鉴权 + API 层，等于自建后端（回到路线 C 的工作量），但还不能复用现成的 RLS。

**G. 自建 PocketBase**：单文件、零依赖、真的 0 元，很诱人。但：
- 内嵌 **SQLite**，不是 Postgres → `timestamptz`、`uuid` 默认值、部分索引、表达式索引、`pg_trgm` 全都没有
- **权限是 per-collection 的规则串**，不是 RLS SQL
- `_File` 不可变，改文件只能删了重传
- 单节点设计，不能水平扩展
- 文档明确警告 v1.0.0 前不保证向后兼容

对本项目（要 `anniversary_feed` 递归视图 + `pg_trgm` 中文搜索 + 严格 RLS）**不成立**。

**H. 自建 Hasura + PG**：数据库还是 Postgres，权限模型是 Hasura 的 role-based（不是 RLS SQL），但 API 变成 GraphQL——现有 22 处 `supabase.from()` 调用全部要改写。**等于付出改写成本，却没换来任何免费优势**（服务器照样要钱）。

**J. 微信云开发**：底层就是 CloudBase，但数据库是 MongoDB 兼容模型，无 RLS。本质上是 LeanCloud 的同类——永久免费但砍掉了权限模型。且**只适合小程序**，我们是 Android App。

**K. uniCloud**：DCloud 的产品，和 CloudBase 思路一致但权限模型是自有的，同样没有 RLS。且和 Expo/React Native 的生态不匹配。

**L. Appwrite / Nhost / PocketBase 自托管**：都是「Postgres 或类似 + 自有权限模型 + 自有 SDK」的路线。关键事实（来自对比评测）：
- Appwrite 数据库**不是 Postgres**（是 MariaDB/Postgres 支撑的文档层），RLS 变成 collection/document 上的 permission 字符串
- Nhost 是 Postgres + Hasura GraphQL，**API 全部改 GraphQL**
- PocketBase 是 SQLite
- **共同点：都需要自建服务器（要钱或要家里的设备），且权限模型都要重写**

对「仅两人 + 强制 RLS + 私有桶」的项目，**没有一个划算**。

### 3.3 方案 I 细化：VPS + 对象存储分离（照片成本更优）

这是对路线 C 的一个优化。照片是唯一的大流量项，把它从 VPS 挪到对象存储：

```
┌──────────────┐      ┌─────────────────┐      ┌──────────────┐
│  自建 Supabase │      │ 国内对象存储      │      │  照片        │
│  （VPS）      │      │ COS / OSS / 七牛  │      │  私有桶       │
│  · 六张表     │      │  · 签名 URL       │      │  · ≤500KB    │
│  · RLS 原样   │      │  · 预签名         │      │  · 路径前缀   │
│  · Auth      │      │                 │      │    = uid()   │
└──────────────┘      └─────────────────┘      └──────────────┘
     38–99 元/年            约 0.1–0.5 元/月
```

**收益**：
- VPS 带宽费用消失（照片不再从 VPS 出网）
- 对象存储按量极便宜：COS 标准存储约 0.099 元/GB/月，七牛 0.115 元/GB/月
- COS 个人用户有 **50GB 标准存储免费 6 个月**（一次性，非每月）
- 照片的签名 URL 由对象存储直接出，**RLS 校验改在客户端/服务端做**（自建时自己实现）

**代价**：
- 要写两套适配器（Supabase Storage + 对象存储），而不是一个
- 照片的权限校验要自己写（不再是数据库 RLS 强制）
- 复杂度上升

**判定**：如果 VPS 带宽是 3M 固定带宽（99 元/年那档），照片出网会成为瓶颈。**此时方案 I 值得做**；如果买的是不限流量的轻量服务器（38/68 元档，200M 峰值），则直接用 Supabase 自带的 Storage 即可，不必拆开。

### 3.4 LeanCloud 评估结论

**结论：LeanCloud 不能作为本项目的 Supabase 替代品。** 不是因为它不好，而是因为它的免费档恰好砍掉了本项目的立命之本。

| 需求 | LeanCloud 开发版 | 结果 |
| --- | --- | --- |
| 两个固定用户白名单 + 越权防护 | **开发版不支持 ACL 权限管理** | 🔴 致命 |
| RLS 行级策略（`private.is_member()`） | 无 RLS 概念，只有 ACL / 云引擎钩子 | 🔴 需重写整个权限模型 |
| 私有照片桶 + 签名链接 | 文件 URL **任何人拿到就能访问**，精细控制需自建 token 服务 | 🔴 需自建 |
| `anniversary_feed` 递归日期视图 | 无 SQL 视图、无 `generate_series`，LeanDB MySQL 5.6 且**按云引擎实例计费** | 🟠 视图逻辑要搬去客户端或 Hook |
| Postgres 特性（`timestamptz`/`uuid`/`jsonb`/部分索引/`pg_trgm`） | 数据存储是 MongoDB 模型；LeanDB 是 MySQL 5.6 | 🟠 全部要改 |
| 文件 HTTPS 流量 | **0.36 元/GB，无免费额度**（HTTP 才有 500MB/天免费） | 🟠 约 5.4 GB/月 → 约 19 元/月 |
| 商用版最低消费 | 中国节点 **30 元/天** = 900 元/月 | 🔴 商用版不可接受 |

**唯一优势**：LeanCloud 开发版是**真永久免费**（不像 CloudBase 有 6 个月大限），且国内直连、不依赖海外网络。但代价是把上面这些全推翻重做。

> **判断依据**：本项目 `Outline.md` 的核心约束是「仅供两名授权用户使用」「所有表强制 RLS」「私有 Storage + signed URL」「第三账号验证越权失败」。LeanCloud 免费档在这几条上全部缺位，而 CloudBase PG 免费版**全部原生支持**——数据库层几乎零改动。
>
> **如果哪天你愿意放弃「只有两个人」的强约束**（比如将来想开放给更多朋友用），LeanCloud 才开始有吸引力，因为那时它的 ACL 限制和 3 万次/天配额反而不再是问题。

### 3.5 决策树：怎么从 12 条路线里收敛到 1 条

```
第一步：回答「家里有没有 7×24 常开且公网可达的设备？」
  │
  ├─ 有 ─────────────────────────────────────────► 路线 D
  │   （真 0 元，SQL/RLS 原样迁，唯一代价是可用性）
  │
  └─ 没有
      │
      第二步：回答「能接受每年 38–99 元吗？」
        │
        ├─ 能 ────────────────────────────────────► 路线 C 或 I
        │   │                                      （长期最优，无免费额度焦虑）
        │   │  └─ 若 VPS 是固定带宽 → 选 I（照片外置）
        │   │  └─ 若 VPS 是不限流量   → 选 C（Storage 一起跑）
        │   │
        │   └─ 不能 ─────────────────────────────► 路线 A（先跑 6 个月）
        │       │                                  （唯一能撑满 6 个月的免费托管）
        │       │
        │       └─ Phase 0 实测后若 PG CPU 撑不住 ──► 路线 B（NoSQL，改造量大）
        │
        └─ 若你愿意放宽「仅限两人」的约束 ──────────► E / J / K 任选
            （这些免费档的短板正是权限模型）
```

**三条硬性淘汰条件**（命中任一，直接出局，不必再调研）：

| 淘汰条件 | 出局方案 |
| --- | --- |
| 免费档不提供 RLS / ACL 行级权限 | E LeanCloud、F 七牛云、J 微信云开发、K uniCloud、L Appwrite/Nhost |
| 数据模型不是 Postgres（要重写视图/索引/约束） | B（同系列但改造量大）、G PocketBase |
| 文件 HTTPS 流量无免费额度且使用量 > 5 GB/月 | F 七牛云、E LeanCloud |

### 3.6 为什么 A 不能当长期方案

- 免费体验版：每账号 1 个环境、3000 资源点/月、**有效期 6 个月**，到期前 1 个月内可参与「社交分享 0 元续期 6 个月」活动，**该活动有效期至 2026-12-30**，之后政策未知。
- 免费环境**不支持加购资源包、不支持按量付费** → 一旦超额度，没有「按需付一点」的平滑路径，只能停用或升级。
- 免费体验版若绑定小程序发布，到期时间会被改为上线后第 15 天，随后进停服隔离期，未转付费将被**销毁环境**。（我们不做小程序，但要留意这条规则的适用口径。）
- 免费体验环境**存在功能使用限制**，官方明确写「如需完整功能，可在控制台手动调整为付费环境」。

### 3.7 为什么 C 是长期性价比最优

两人使用、数据量极小（照片 ≤500KB/张，年增约几百 MB～几 GB），一台最便宜的国内轻量应用服务器足够跑 Supabase 全家桶。年成本 38–99 元，对比「个人版 19.9 元/月 = 238.8 元/年」，省一半以上，且：
- 没有资源点/配额概念，不会突然停服
- 没有「6 个月大限」
- SQL、RLS、Storage 全部原样迁移，代码改动最小
- 代价：要自己管备份、升级、证书续期

### 3.8 为什么 D 值得认真考虑

0 元，且数据完全在自己手里。但硬前提：
- 设备要 7×24 常开（耗电、噪音、故障）
- 需要公网可达：家宽公网 IP（很多是 CGNAT，没有）、或内网穿透（国内 frp 节点稳定性参差；Cloudflare Tunnel 本身在海外）
- 两个固定用户的低频场景对可用性容忍度高，**这是 D 唯一的优势也是唯一的机会**

---

## 4. 推荐架构（无论选 A/C/D，客户端结构一致）

```
┌─────────────────────────────────────────────┐
│  页面 / 业务 Hooks（usePhotos / useFood…）   │  ← 现有 9000 行代码基本不动
├─────────────────────────────────────────────┤
│  ★ 后端适配层 src/lib/backend/              │  ← 本次新增，隔离所有后端差异
│    ├ auth   : signIn/signOut/session/rpc     │
│    ├ db     : from().select()…/rpc()         │
│    └ storage: upload/remove/createSignedUrls │
├─────────────────────────────────────────────┤
│  后端实现（可切换）                          │
│    ├ SupabaseImpl   （现状，回滚用）         │
│    └ CloudBaseImpl  （国内主线路）           │
├─────────────────────────────────────────────┤
│  React Query 缓存层（现有，不动）            │
└─────────────────────────────────────────────┘
```

**为什么必须先做适配层**：现在 `supabase` 这个对象被 **8 个文件直接 import**，共 **22 处调用点**（`from` 12、`storage` 3、`auth` 5、`rpc` 1）。CloudBase PG 与 Supabase 在**认证 SDK、REST base path、Storage API 形态**上都有硬差异（§5.2），如果直接改每个 Hook，每次换后端都要重改一遍。有了适配层，后端切换是一次性动作。

---

## 5. CloudBase PG 迁移可行性（逐项核实结论）

### 5.1 环境与计费（已核实）

| 项 | 结论 |
| --- | --- |
| 免费体验版可选 PostgreSQL？ | ✅ **可以**。上海地域 + 免费体验版 + PostgreSQL 数据库是官方支持的组合 |
| 免费额度 | 3000 资源点/月，6 个月，单账号 1 个环境 |
| PG 计费（上海） | **CPU 342 点/(核·小时)**；容量 0.5 点/(GB·小时)；共享实例按实际使用计量 |
| 云存储 | 读/写请求 10 点/万次；标准存储 3.94 点/(GB·天)；CDN 流量 210 点/GB |
| 认证 | 500 点/万次 |
| 云函数 | 13.3 点/万次 + 0.11108 点/(GB·s) |
| 静态托管 / HTTP 网关 | 210 点/GB（中国大陆边缘加速） |
| 新加坡地域 | 仅支持 PG，但**在海外**，违背目标 → **只考虑上海地域** |

### 5.2 兼容性逐项核实

| 能力 | Supabase（现状） | CloudBase PG | 结论 |
| --- | --- | --- | --- |
| SQL 建表 / 索引 / 触发器 / 视图 | ✅ | ✅ 同为 PostgreSQL | ✅ 原样可用 |
| `auth.uid()` | 返回 `uuid` | **返回 `text`** | ⚠️ **必须改**（见 5.3） |
| `auth.users.id` | `uuid` | **`VARCHAR(64)`**（值形如 UUID 字符串） | ⚠️ 白名单值要换成新后端实际 ID |
| 三角色 `anon/authenticated/service_role` | ✅ | ✅ 语义一致 | ✅ |
| `GRANT` + `RLS` 双层权限 | ✅ | ✅ 完全一致 | ✅ |
| `CREATE POLICY` 写法 | ✅ | ✅ 同一套 PG 语法 | ✅ |
| `storage.foldername(name)` | ✅ | ✅ 官方迁移文档确认可用 | ✅ |
| `gen_random_uuid()` | ✅ | ✅ PG13+ 内置 | ✅ |
| `storage.buckets` / `storage.objects` | ✅ | ✅ 同名 schema | ✅ |
| Storage 私有桶 + RLS | ✅ | ✅ RLS 是唯一闸门 | ✅ |
| 批量签名链接 | `createSignedUrls(paths[])` | `createSignedUrls(paths[])`，**单次 ≤500** | ✅ 语义一致，字段名略不同 |
| Realtime 订阅 | ✅ | ❌ **不支持** | ✅ **本项目未使用，无影响**（用的是 React Query + 手动刷新） |
| `pg_graphql` | ✅ | ❌ 不支持 | ✅ 本项目未使用 |
| DDL 通道 | SQL Editor / 直连 | 云 API `ExecutePGSql`（逐条） | ⚠️ 迁移脚本要改分发方式 |
| REST base path | `/rest/v1/<table>` | **`/v1/rdb/rest/<table>`** | 🟡 **只差前缀，可自动改写**（见 5.2.1） |
| 认证端点 | `/auth/v1/token?grant_type=password` | `/auth/v1/signin` | ⚠️ 协议不同，但 `/auth/v1/*` 前缀一致 |
| 客户端 SDK | `@supabase/supabase-js` | `@cloudbase/js-sdk` | 🟡 **不必换！见 5.2.1** |
| `db.from().select().eq().order().range()` | ✅ | ✅ PostgREST 兼容，链式 API 一致 | ✅ 已实测 `.eq/.order/.maybeSingle/.count=exact` 可用 |
| Storage 上传 | `upload(path, Uint8Array)` | `bucket.upload(key, File)` | 🔴 **必须写适配层**（见 5.2.2） |
| Storage 批量签名 | `/storage/v1/object/sign/<bucket>` | **`POST /v1/storages/object/sign/:bucketId`** | 🔴 **路径完全不同，必须写适配层** |
| 关闭公开注册 | Supabase Dashboard 开关 | 控制台「身份认证 → 登录方式」 | ✅ 有对应能力 |
| React Native 适配 | 原生支持 | `@cloudbase/adapter-rn`（RN 0.76+ / Expo SDK 52+） | ✅ 有官方 RN 适配器，但需装 `react-native-mmkv`（原生模块，要重出 APK） |

**关键结论（v3 修正）**：数据库层（SQL + RLS + 视图 + 触发器）几乎零改动搬走；**客户端也能保留 `@supabase/supabase-js` 不换**；真实工作量集中在 **Storage 适配层**（上传 + 批量签名 + 删除）这一块。

### 5.2.1 零改动方案：保留 supabase-js，只改路径前缀（v3 新增，已验证）

CloudBase 网关提供 **PostgREST 兼容层**，与 Supabase 的唯一差别是路径前缀。这让「换后端」从"重写所有业务代码"降级为"加一个 fetch 拦截器"。

```ts
// src/lib/backend/cloudbaseFetch.ts —— 全项目唯一的后端差异注入点
const SUPABASE_REST_PREFIX = '/rest/v1/';
const CLOUDBASE_REST_PREFIX = '/v1/rdb/rest/';

export const cloudbaseFetch: typeof fetch = (input, init) => {
  const rawUrl =
    typeof input === 'string' ? input
    : input instanceof URL ? input.toString()
    : input.url;
  return fetch(rawUrl.replace(SUPABASE_REST_PREFIX, CLOUDBASE_REST_PREFIX), init);
};
```

注入到现有 client（`src/lib/supabase.ts` 只需小改）：

```ts
const client = createClient<Database>(url, publishableKey, {
  auth: { /* 见 5.2.3 */ },
  global: { fetch: cloudbaseFetch },   // ← 唯一的数据层改动
});
```

**这意味着本项目 22 处 `supabase.*` 调用点（`from` 12、`storage` 3、`auth` 5、`rpc` 1）中，19 处（`from` + `rpc`）可以完全不改。**

**参考实例**：`liangdabiao/cloudbase-saas-starter` 的 `docs/CLOUDBASE-MIGRATION.md` 是真实生产迁移记录，记录了：
- 27 个业务文件、44 处 `supabase.auth.*` 调用点零改动
- 实测通过：路径改写 7/7 命中、`anon` 查询 200、RLS 拦截返回 0 行、`service_role` 可读、`maybeSingle()` 无结果返回 null 不报错、`eq + order + count=exact` 可用
- 已知注意点：`count=exact` 与 `limit` 同时用时 PostgREST 返回 **206 Partial Content**（正常行为，非错误）

### 5.2.2 真正的硬骨头：Storage 适配层

v2 把 Storage 当成"语义一致只改 SDK"，**这是误判**。实测两者的 HTTP 端点完全不同：

| 能力 | Supabase Storage | CloudBase PG Storage | 差异 |
| --- | --- | --- | --- |
| 上传对象 | `POST /storage/v1/object/<bucket>/<path>` | `POST /v1/storages/object/<bucket>/...` | 🔴 路径 + 请求体都不同 |
| 批量签名 | `POST /storage/v1/object/sign/<bucket>` | **`POST /v1/storages/object/sign/:bucketId`** | 🔴 路径不同，**单次 ≤500** |
| 单个签名 | `POST /storage/v1/object/sign/<bucket>/<path>` | `POST /v1/storages/object/sign/:bucketId/...` | 🔴 不同 |
| 删除 | `DELETE /storage/v1/object/<bucket>` | `DELETE /v1/storages/object/<bucket>` | 🔴 不同 |
| 下载 | `GET /storage/v1/object/...` | `GET /v1/storages/object/...` | 🔴 不同 |

**好消息**：CloudBase 的语义与 Supabase 高度对应——`createSignedUrl` / `createSignedUrls` / `download` / `getPublicUrl` 都存在，`createSignedUrls` 同样支持批量（≤500，超出 Supabase 的 50，需分批）。

**迁移工作量落到具体三个文件**：

| 文件 | 现状 | 需要做什么 |
| --- | --- | --- |
| `src/lib/signedUrls.ts` | `supabase.storage.createSignedUrls(paths)` | 改为调 CloudBase 的 `POST /v1/storages/object/sign/photos`，**保留现有「50 个一批 + 3 次重试」策略**（CloudBase 单次上限 500，50 更稳） |
| `src/features/photos/uploadImage.ts` | `supabase.storage.upload(path, Uint8Array)` | 改为 CloudBase 上传端点；⚠️ **RN 下需 base64 编码**（官方 RN 适配器明确要求 `contentEncoding: 'base64'`） |
| `src/features/photos/usePhotos.ts` | 删照片走 `supabase.storage.remove()` | 改为 CloudBase 删除端点 |

### 5.2.3 认证的三种选择（需实测后定）

| 方案 | 做法 | 成本 | 风险 |
| --- | --- | --- | --- |
| **① 换 `@cloudbase/js-sdk`** | 用官方 `@cloudbase/adapter-rn` | 中 | ⚠️ 需装 `react-native-mmkv`（原生模块 → **要重出 APK**）；且需核实 `signInWithPassword` 参数名是 `email` 还是 `username` |
| **② 保留 supabase-js 的 auth 表象** | 按参考案例自建 `cb-auth.ts`（bcrypt + jose 签 JWT） | **高**（该案例用了 572 行） | 需自建会话/刷新/吊销；**本项目只有 2 个固定用户，不值得** |
| **③ 走 CloudBase 原生 `/auth/v1/signin`** | 手写 fetch 调用 + 自己管理 token | 低～中 | 需实测邮箱密码登录、token 刷新、公开注册关闭 |

> **本项目建议 ①**：只有 2 个固定用户，官方适配器能覆盖登录态持久化。虽然要重出一次 APK（装 mmkv），但一次成本换长期稳定，比自建 572 行 auth 更划算。
>
> **关键提醒**：若用 ① 或 ③，`supabase-js` 自带的会话管理必须关掉（`persistSession: false`、`autoRefreshToken: false`、`detectSessionInUrl: false`），否则它会持久化并刷新一个不存在的 Supabase 会话，把 token 发给网关导致 401。这是参考案例踩过的坑。

### 5.3 ⚠️ 必须修正的硬伤：UID 类型不兼容

现有迁移脚本里：

```sql
-- supabase/migrations/20261025000100_phase2_auth_rls.sql
created_by uuid not null default auth.uid(),          -- ❌ CloudBase: auth.uid() 返回 text
'53b3f75b-...'::uuid in (...)                         -- ❌ text 与 uuid 比较 → 类型错误
create table ... id uuid primary key default gen_random_uuid()  -- ⚠️ 主键类型也要统一
```

CloudBase 的 `auth.uid()` 返回 `text`，`auth.users.id` 是 `VARCHAR(64)`。这会**直接导致迁移脚本执行失败**，不是风格问题。

处置方案（设计阶段已定，实施时按此改）：
- 业务表 `created_by` 改为 `varchar(64)`；主键 `id` 可保留 `uuid`（业务无关）或统一改 `bigserial`/`varchar`
- 白名单函数改为 `auth.uid() in ('<cloudbase-uid-1>', '<cloudbase-uid-2>')`（纯字符串比较，去掉 `::uuid`）
- `photo_entries_path_owner_check` 等约束里的 `created_by::text` 相应去掉类型转换
- 客户端 `database.types.ts` 需重新生成对应类型

### 5.4 ⚠️ 资源点消耗量化与风险

按两人日常使用（每天各 10 次数据操作、翻 100 张照片）估算：

| 消耗项 | 月用量 | 资源点 | 占比 | 判断 |
| --- | --- | --- | --- | --- |
| 认证调用 | 300 次 | ~15 | 0.5% | ✅ 无压力 |
| 存储容量 | 1 GB | ~118 | 4% | ✅ 无压力（可存约 25 GB） |
| 存储读请求 | 1.5 万次 | ~15 | 0.5% | ✅ 无压力 |
| CDN 流量 | 3–5 GB | 630–1050 | 21–35% | ⚠️ **次要风险**，靠缩略图+缓存压住 |
| 数据库调用 | 6000 次 | 按 CPU 计 | — | — |
| **PG CPU** | 平均占用 X 核 × 720 h | **342·X·720** | — | 🔴 **主要风险** |

**算一下 PG CPU**：3000 点 ÷ 342 点/(核·小时) = **8.77 核·小时/月** = 平均只能占用 **0.012 核**（约 1.2% 单核）。

PostgreSQL 共享实例即使完全空闲，也有 autovacuum、checkpoint、统计信息更新、监控采样等后台开销，**很容易超过 1.2% 单核**。一旦超过：
- 免费环境无「按量付费」开关 → 不能平滑加钱
- 资源点耗尽后行为不确定（限流 / 停用）
- 19.9 元/月个人版 = 40000 点 = 117 核·小时/月 = 平均 0.16 核，**宽裕但也不是无限**

> 🔴 **Phase 0 第一优先级动作**：开免费环境，空载 + 轻负载各跑 24 小时，看控制台「套餐用量」里 PG 的 CPU 曲线，**外推月度**。这一个数字决定后面选 A / B / C。
>
> 附录：如果 PG 撑不住免费额度，备选是改用**文档型数据库（NoSQL）**——它按「调用次数 200 点/万次 + 容量 40 点/(GB·天)」计费，3000 点 ≈ 15 万次调用/月，非常宽裕。代价是：没有 RLS（要改用权限规则或把鉴权下沉到云函数）、`anniversary_feed` 这个含递归日期计算的 SQL 视图要改到客户端或云函数实现。**改造量从「中」变「高」，但数据模型本身（6 张简单表）足够简单，可控。**

### 5.5 Storage 迁移

- 现有桶 `photos`：`public=false`、`file_size_limit=512000`、MIME 白名单 → CloudBase 侧同样建 Bucket，RLS 策略照搬（`bucket_id='photos'` + 路径首段 = `auth.uid()`）
- 对象迁移：`pg_dump` 不含对象内容，需用 SDK 遍历下载→上传（或用官方 Supabase→CloudBase 存储迁移工具）
- 现有路径 `auth.uid()/xxx-timestamp.jpg` 格式保留，迁移后路径前缀校验规则不变
- 缩略图与 ≤500KB 校验逻辑在客户端（`uploadImage.ts`），不受影响

### 5.6 Auth 迁移（两个固定用户）

官方明确：`auth` schema 由平台管理，**不提供 dump/restore**，建议通过认证 API 重新创建账号。
- 两个用户在 CloudBase 侧**重新注册**（关闭公开注册，只由管理员创建）
- 拿到两个新 UID → 替换白名单函数里的两个字符串
- 密码哈希无法迁移 → **两个账号各重置一次密码**（一次性操作，需提前告知）
- 迁移后**必须重跑第三账号越权验证**：能登录但非白名单 → 读不到任何表、拿不到任何照片签名链接

---

## 6. 客户端适配层设计（v3 修订：范围大幅缩小）

**v3 修正**：v2 设计了一整套 `Backend` 抽象接口（auth/db/storage 三组方法全部自己封装）。既然已验证**可以保留 `supabase-js` 只改路径前缀**，这个抽象层**过度设计了**。真正需要自己写的只有 Storage 三个方法。

### 6.1 v3 推荐的最小改动方案

```
src/lib/supabase.ts          ← 改一处：注入 cloudbaseFetch + 切换 auth 实现
src/lib/storageAdapter.ts    ← 新增：Storage 三个方法的适配（唯一新写的核心代码）
src/lib/signedUrls.ts        ← 改 import，逻辑不动
src/features/photos/uploadImage.ts  ← 改 import，逻辑不动
src/features/photos/usePhotos.ts    ← 改 import，逻辑不动
src/providers/AuthProvider.tsx      ← 改 import，逻辑不动
6 个业务 Hook                 ← 只改 import，逻辑不动
src/lib/database.types.ts   ← 重新生成（uid 类型变了）
```

**数据层（`from` / `rpc`，19 处调用）→ 零改动。**
**Storage 层（3 处调用）→ 走 `storageAdapter.ts` 适配。**
**Auth 层（5 处调用）→ 换实现，接口形状保持 `supabase.auth.*` 不变。**

### 6.2 Storage 适配器契约

```ts
// src/lib/storageAdapter.ts
export type StorageAdapter = {
  upload(
    path: string,
    bytes: Uint8Array,
    opts: { contentType: string; upsert: boolean },
  ): Promise<{ error: unknown }>;

  remove(paths: string[]): Promise<void>;

  createSignedUrls(
    paths: string[],
    expiresIn: number,
  ): Promise<Record<string, string>>;
};
```

两个实现：

```ts
// supabaseStorage.ts —— 现有逻辑平移，行为不变
export const supabaseStorage: StorageAdapter = {
  upload: (path, bytes, opts) =>
    supabase.storage.from('photos').upload(path, bytes, {
      contentType: opts.contentType, cacheControl: '3600', upsert: opts.upsert,
    }),
  remove: async (paths) => { await supabase.storage.from('photos').remove(paths); },
  createSignedUrls: (paths, expiresIn) => createSignedUrlMap(paths, expiresIn),
};

// cloudbaseStorage.ts —— 走 CloudBase PG Storage HTTP API
// · upload  : POST /v1/storages/object/photos/...   (RN 需 base64 编码)
// · remove  : DELETE /v1/storages/object/photos
// · sign    : POST /v1/storages/object/sign/photos   (单次 ≤500)
// 认证头：Authorization: Bearer <用户 access_token>
```

### 6.3 开关与回滚

```ts
// src/lib/backend.ts
export const storage: StorageAdapter =
  env.backend === 'cloudbase' ? cloudbaseStorage : supabaseStorage;
```

```bash
# .env
EXPO_PUBLIC_BACKEND=supabase    # 或 cloudbase
```

**回滚保证**：改一个环境变量即切回旧后端，旧实现保留至少一个验收周期。

### 6.4 改造工作量重估（v3 修正）

| 项 | v2 估 | **v3 估** | 说明 |
| --- | --- | --- | --- |
| 数据层 + 6 个 Hook | 中 | **极小** | 只改 import，19 处调用零改动 |
| Storage 适配 | 中 | **中** | 唯一新写的核心代码，约 150–200 行 |
| Auth 适配 | 中 | **小～中** | 换 `@cloudbase/adapter-rn` 或自写 fetch |
| SQL 改写（uid 类型） | 小 | **小** | 改 3 处类型 + 换 2 个 UID 值 |
| 数据 + 文件迁移 | 中 | **中** | 照片需遍历下载上传 |
| 联调回归 | 中 | **中** | 5 个 Tab + 第三账号越权验证 |
| **合计** | 1–1.5 周 | **1 周左右** | 前提：认证方案实测通过 |

**回滚保证**：`EXPO_PUBLIC_BACKEND=supabase` 一个环境变量即可切回旧后端，旧实现保留至少一个验收周期。

---

## 6.5 产品决策：同步策略保持现状（已确认）

**决策：保留「进 Tab 重新查」，不做实时更新。**

已核实当前代码的真实刷新机制（`AppProviders.tsx` + 各 Hook）：

| 机制 | 状态 | 说明 |
| --- | --- | --- |
| mutation 后 `invalidateQueries` | ✅ **生效** | 纸条、计划、美食、照片、纪念日都有 |
| Tab 切回时组件重挂载 → `refetchOnMount` | ✅ **生效** | `lazy: true` + `freezeOnBlur: true`，切走再切回会重新挂载并触发重查 |
| 下拉刷新 | ✅ 部分生效 | 仅 `AnniversariesScreen` 和 `PhotosScreen` 有 `RefreshControl` |
| `refetchOnWindowFocus: true` | ❌ **不生效** | 见下方说明 |
| 服务端推送（Realtime） | ❌ 未使用 | 本项目从未订阅 Supabase Realtime |

**为什么 `refetchOnWindowFocus` 在 RN 下无效**（已验证 `node_modules`）：
TanStack Query v5 的 `focusManager` 默认实现是 `window.addEventListener('visibilitychange', ...)`。React Native 在 `Libraries/Core/setUpGlobals.js` 里只做了 `globalThis.window = globalThis`，**RN 全局没有 `addEventListener`，也不存在 `visibilitychange` 事件**（`onlineManager` 依赖的 `online`/`offline` 事件同理）。因此该配置在 RN 下静默失效。`@tanstack/react-query` 与 `@tanstack/query-core` 中也搜不到任何 `AppState` 引用，即无内置 RN 适配。

**这不影响本次决策**：既然目标就是「进 Tab 重新查」，而该机制本来就在工作，**无需任何代码改动**。

副作用提醒：`onlineManager` 同样失效，意味着**断网恢复后不会自动重试**，需依赖用户下拉刷新或切 Tab 触发。若后续觉得断网体验差，追加一行即可（与后端选谁无关）：

```ts
// src/providers/AppProviders.tsx
import { focusManager } from '@tanstack/react-query';
import { AppState } from 'react-native';

AppState.addEventListener('change', (s) => focusManager.setFocused(s === 'active'));
```

**对后端选型的影响：无。** 无论选 A/B/C/D，数据同步都靠「进 Tab 重查 + 写后失效重查」完成，不依赖 Realtime、不依赖轮询。**这恰好让 LeanCloud 的「不支持 Realtime」不再是问题——但它的 ACL 与文件权限问题依然致命（§3.0）。**

---

## 3.9 LeanCloud 逐项适配度详细评估

如果仍要考虑 LeanCloud，以下是把本项目需求逐条对照的结果。**结论：不推荐**（见 §3.0），此处保留细节供复查。

### 3.9.1 致命项：开发版不支持 ACL 权限管理

- LeanCloud 的安全模型是 **Class 级 + 对象级 ACL + 角色（RBAC）**，**不是 RLS**
- **开发版（免费档）不包含权限管理功能**（ACL、角色、黑名单等功能在开发版不可用/受限），需要升级到商用版才能用
- 商用版中国节点**每日最低消费 30 元** = **900 元/月** —— 对一个情侣 App 完全不可接受

即使勉强用云引擎 Hook（`beforeSave` / `beforeFind`）在服务端做白名单校验，也会带来：
- 云引擎实例每天 ¥2.00（开发版 3 线程免费，但商用版要钱）
- 每次读写都要多一跳网络往返
- Hook 里要自己实现整套白名单判定，等于**把 RLS 重写一遍**，却没有 RLS 的数据库级保证

### 3.9.2 致命项：文件存储没有私有桶概念

官方 FAQ 原文：
> 「由于知道文件 URL 的任何用户都可以访问文件，因此需要为 `_File` Class 和引用文件的 Class 设置合适的 Class 权限和 ACL」
> 「如果希望能够更精细地控制文件访问权限……建议使用支持访问权限控制的第三方文件存储服务商……token 的获取需要自行在云引擎或自己的服务器上部署一个简单的生成访问 token 的 API 服务」

本项目现状是「私有桶 + 4 小时 TTL 批量签名链接 + 路径前缀 = `auth.uid()`」,这是 Supabase Storage 的标准能力。在 LeanCloud 上要么:
1. 依赖 ACL（开发版不可用）
2. 自建 token 服务（又回到要自己运维服务器）

### 3.9.3 数据模型不兼容

| 本项目用到 | LeanCloud 数据存储（MongoDB 模型） |
| --- | --- |
| `timestamptz` + `now()` 默认值 | 无数据库默认值，需 Hook 填充 |
| `uuid` 主键 + `gen_random_uuid()` | 自增 `objectId`，语义不同 |
| `date` / `time` 字段 | 需转字符串或 Date |
| `jsonb` 字段 | 支持（无 schema 强类型） |
| 部分索引 `where kind='together'` | 不支持部分索引 |
| 表达式索引 `lower(btrim(name))` | 不支持 |
| `pg_trgm` 中文搜索（Phase 8 计划中） | 无全文检索 |
| `anniversary_feed` 视图（`generate_series` + `lateral` + `make_date`） | **无 SQL 视图、无 `generate_series`**，逻辑要搬到客户端或 Hook |
| 触发器 `touch_updated_at` | 需用 `afterSave` Hook 或客户端赋值 |
| `check` 约束、RLS `WITH CHECK` | 无，需 Hook 校验 |

LeanDB（云引擎提供的 MySQL）也帮不上忙：**只有 MySQL 5.6**，不支持 CTE / 窗口函数 / JSON 函数，且**创建实例即开始计费**（0.5GB 内存起）。

### 3.9.4 流量成本（这是免费档的硬伤）

LeanCloud 中国节点文件流量计费：

| 协议 | 国内访问 | 海外访问 |
| --- | --- | --- |
| HTTP | **每天 500 MB 免费**，超出 0.30 元/GB | 0.40 元/GB |
| HTTPS | **无免费流量**，0.36 元/GB | 0.60 元/GB |

React Native 只能用 HTTPS（`expo-image` 强制 https）。本项目浏览照片的流量估算：

```
每次打开相册浏览 30 张（缩略图 + 原图各一次）
  ≈ 30 × (0.1MB + 0.5MB) = 18 MB/次
每天 10 次 ≈ 180 MB/天 ≈ 5.4 GB/月
  → 5.4 GB × 0.36 元/GB ≈ 1.94 元/月
若浏览更频繁（20 次/天）→ 约 3.9 元/月
```

单看流量还不算贵，但**叠加「HTTPS 无免费额度」这一点**，加上文件存储空间（0.0053 元/GB/天）、对象存储请求（1.0 元/万次）各项叠加后，**免费档实际是「超额即按量付费」**，并不存在真正的免费天花板。对比 CloudBase 免费体验版虽然有 3000 点上限，但超额可以**直接升级套餐**（19.9 元/月封顶），成本可预测性更好。

### 3.9.5 API 请求数核算（这一项 LeanCloud 反而占优）

LeanCloud 开发版：3 万次/天 REST 请求。

本项目每次「进 Tab 重新查」的请求数：
- 纸条 1 次、计划 1 次、美食 1 次、相册 2 次（列表 + 相册表）、照片 1 次
- 照片的签名链接批量生成：LeanCloud 无批量签名接口，需逐个请求 → **30 张照片 = 30 次请求**
- 合计约 **35–40 次/次刷新**

两人各刷 20 次/天 ≈ 1600 次/天。**3 万次/天完全够用**（只占 5%）。这一项不是问题。

### 3.9.6 LeanCloud 的真实优点（不因上述结论而否认）

- ✅ **永久免费档**，没有 CloudBase 的 6 个月大限
- ✅ 国内直连，访问速度好，不依赖海外网络
- ✅ 数据导入导出、每日备份（开发版不支持自动备份，但有导出）
- ✅ 内建账户系统（邮箱注册、密码重置、登录态管理）
- ✅ 云引擎可承载 Hook（`beforeSave` 等），服务端校验可行

**如果这些优点对你更重要，而你能接受放宽「仅限两人 + 强制 RLS + 私有桶」这几条硬约束，LeanCloud 值得重新评估。** 但对当前 `Outline.md` 定义的产品形态，它不成立。

---

## 3.10 LeanCloud 迁移工作量粗估（若仍要迁）

| 任务 | 说明 | 估工 |
| --- | --- | --- |
| 认证替换 | `@leancloud/react-native` 替换 supabase-js Auth，session 管理重写 | 1–2 天 |
| 数据层重写 | 6 张表 MongoDB 化，类型定义全部重写 | 3–5 天 |
| 权限模型 | Class ACL + `beforeSave`/`beforeFind` Hook 实现白名单 | 3–5 天 |
| 文件存储 | 上传改 `AV.File`，**签名链接要自建 token 服务** | 3–5 天 |
| 视图逻辑 | `anniversary_feed` 递归日期计算搬到客户端或 Hook | 1–2 天 |
| 触发器/约束 | `updated_at`、各种 check 约束改 Hook 或客户端 | 1–2 天 |
| 联调回归 | 5 个 Tab 全流程 + 第三账号越权验证 | 2–3 天 |
| **合计** | | **约 3–4 周** |

对比 CloudBase PG 路线（路线 A/C）：**约 1–1.5 周**，因为 SQL 与 RLS 基本原样搬。

---

---

## 3.11 与本项目无直接关系

---

---

## 7. 构建与更新链路（解决 L2）

### 7.1 APK 构建（三选一）

| 方案 | 海外依赖 | 成本 | 与 Outline「禁用本地原生构建」的关系 |
| --- | --- | --- | --- |
| **① 继续用 EAS Build** | 依赖 expo.dev | EAS 免费额度有限 | 现状；但构建时需外网 |
| **② 国内 CI 构建**（腾讯云 CNB 1600 核时/月免费 / 阿里云云效） | 无 | 0 | 在容器内 prebuild+Gradle，**不是本地构建**，不违反精神；需配阿里云 Maven 镜像 |
| **③ 本机构建**（`expo prebuild` + Gradle） | 无 | 0 | ❌ 明确违反 Outline 约束 |

**推荐 ②**：Outline 禁的是「本地原生构建」（怕环境脏、怕 Gradle 坑），CI 容器里跑不污染本机，同时满足「零海外依赖」。首次需处理：Android SDK 许可、Gradle 发行版下载镜像、Maven 国内镜像。

### 7.2 OTA 更新（三选一）

| 方案 | 海外依赖 | 复杂度 | 评价 |
| --- | --- | --- | --- |
| **① 保留 EAS Update** | 依赖 `u.expo.dev` | 零 | 不满足 L1 严格口径（可回退但仍发请求） |
| **② 自建 Expo Updates 服务器** | 无 | 中 | 需实现 Expo Updates Protocol v1：`GET /api/manifest` + `GET /api/assets/*`；代码签名用 `expo/code-signing-certificates` 生成，私钥只存 CI |
| **③ 去掉 OTA，改手动 APK 分发** | 无 | 零 | 对 2 人 App 够用；但每次改动都要重出 APK |

**自建 Updates 的部署形态**（CloudBase 云函数即可，无需常驻服务器）：
- 更新包（`expo export` 产物）存 **云存储**
- 一张 `updates` 表记录：runtimeVersion、channel、manifest 字段、bundle 路径、发布时间
- 云函数：读库 → 生成并签名 manifest → 返回；资源走云存储直链
- 发布脚本：`npx expo export --platform android` → 上传云存储 → 写库 → 用私钥签名
- ⚠️ `eas update` CLI **不支持**推自建服务器，需自写发布脚本
- ⚠️ 改 `updates.url` 属于**原生配置**，必须重出一次 APK（一次性成本）

**决策建议**：先按 ③ 走通「零海外请求」的闭环（改文案重出 APK、装上、验证无海外请求），再按需升级到 ②。因为 2 人使用场景下，JS 改动频率并不高。

---

## 8. 数据迁移方案（A 或 C 通用）

1. **导出**：`pg_dump --schema-only` + `--data-only`，六张业务表 + `anniversary_feed` 视图定义 + `private` schema 函数
2. **改写**：按 §5.3 调整 UID 类型；`notify pgrst, 'reload schema'` 可保留（无害）
3. **导入**：小表用 SQL 编辑器直接粘贴；`auth.users` 不导入（§5.6）
4. **文件**：单独跑 Storage 迁移（遍历 download → upload），保留 `auth.uid()/` 前缀
5. **切换窗口**：迁移期间**短暂停写**（你们自己选时间），避免增量丢失
6. **回滚**：原 Supabase 项目保留至少一个完整验收周期，只读

**迁移后必做**：用第三账号重跑越权验证（读写六张表 + 拿照片签名链接，全部必须失败）。

---

## 9. 分阶段实施（暂不执行）

| Phase | 内容 | 产出 | 阻断后续？ |
| --- | --- | --- | --- |
| **0. 计费实测** | 开 CloudBase 免费环境（上海 + PG），空载/轻载各 24h，记录 PG CPU、存储、流量曲线 | **月度外推表**，决定路线 | 🔴 是，决定 A/B/C |
| **1. 兼容性验证**（v3 细化） | 建空库跑改写后的 SQL；两账号注册登录；`is_authorized` RPC；**验 `cloudbaseFetch` 路径改写**；**验 Storage 三端点（上传/批量签名/删除）**；**验 RN base64 上传**；越权测试 | 可行性结论 + 实际改造清单 | 🔴 是 |
| **2. 适配层落地** | 写 `storageAdapter.ts`（两个实现）；`supabase.ts` 注入 `cloudbaseFetch`；换 auth 实现 | 数据层零改动，Storage 走适配器 | 否 |
| **3. 数据与文件迁移** | 导表 → 导文件 → 换白名单 UID → 跑通全部 Tab | 新后端数据一致 | 否 |
| **4. 零海外验证** | 改 `updates.url` 或移除 OTA；重出 APK；国内运营商网络抓包 | **L1 达成** | 否 |
| **5. 构建链路替换** | 国内 CI 跑通 prebuild+Gradle 出 APK | L2 达成 | 否 |
| **6. 长稳与退路** | 资源点监控、告警、备份、切换预案 | 长期运行手册 | 否 |

**Phase 1 优先级排序**（若时间有限，按此顺序验，每项都能独立否掉方案）：
1. **PG CPU 月度外推**（决定路线 A/C）
2. **Storage 三端点**（决定 Storage 适配方案是否成立）
3. **Auth 登录闭环**（决定是否要重出 APK 装 mmkv）
4. `cloudbaseFetch` 路径改写（几乎必过，最后验）

---

## 10. 验收标准

- [ ] 手机不挂 VPN，国内运营商网络可登录、读写六张表、浏览/上传/删除照片
- [ ] App 启动与运行期间，抓包**零海外域名请求**（含 `u.expo.dev`）
- [ ] 两个账号数据与迁移前一致；照片可看、可删
- [ ] 第三账号：登录后读不到任何表、拿不到任何照片签名链接
- [ ] RLS 策略在 CloudBase 上语义等价（对照 §5.2 逐项过）
- [ ] 资源点月度外推 ≤ 2500 点（留 20% 余量）；超出有告警与降级预案
- [ ] 断网/弱网有明确提示，不白屏、不误删
- [ ] 回滚开关可用：改一个环境变量即切回旧后端

---

## 11. 风险登记

| 风险 | 概率 | 影响 | 缓解 |
| --- | --- | --- | --- |
| **PG CPU 计费超免费额度** | **高** | 免费环境不可用 | Phase 0 实测；备选 B（NoSQL）或 C（VPS） |
| 免费体验版 6 个月到期无法续 | 中 | 服务中断 | 提前 1 个月完成转付费或迁至 C |
| CloudBase Storage SDK 与 RN 不兼容 | 中 | 照片链路返工 | Phase 1 优先验证 upload/createSignedUrls |
| Auth 密码哈希不可迁移 | **确定** | 两用户需重置密码 | 提前沟通，选低峰期操作 |
| 白名单 UUID 变更遗漏 | 中 | 越权或误锁 | 迁移后强制跑第三账号验证 |
| 国内 CI 跑 Gradle 遇依赖下载失败 | 中 | 构建链路卡住 | 配阿里云 Maven 镜像；缓存策略 |
| 自建 Updates 签名/回滚出错 | 中 | 更新下发失败 | 先用手动 APK 方案，OTA 作为增强项 |
| 家庭宽带 CGNAT 无公网 IP | 高（选 D 时） | 不可达 | 选 C；或 D + 内网穿透双保险 |

---

## 12. 决策状态

### 已确认

| # | 决策 | 状态 | 影响 |
| --- | --- | --- | --- |
| 1 | **同步策略保持现状**：进 Tab 重新查，不做实时更新 | ✅ 已确认（2026-10-25） | 无需任何代码改动；§6.5 记录了机制核实结论 |
| 2 | **LeanCloud 作为 Supabase 替代** | ❌ 已否决 | 开发版无 ACL、HTTPS 流量无免费额度、SQL 视图/RLS 全缺；详见 §3.4、§3.9 |
| 3 | **七牛云 Kodo 作为 Supabase 替代** | ❌ 已否决 | Kodo 只是对象存储，无数据库/RLS；HTTPS 流量无免费额度；详见 §3.2 |
| 4 | **PocketBase / Appwrite / Nhost 自托管** | ❌ 已否决 | 权限模型全变（规则串/permission 字符串/GraphQL role），数据模型非 Postgres；详见 §3.2 |
| 5 | **微信云开发 / uniCloud** | ❌ 已否决 | MongoDB 模型，无 RLS；且微信云开发只适合小程序 |
| 6 | **Hasura + PG 自托管** | ❌ 已否决 | API 改 GraphQL，付出改写成本却无免费优势 |
| 7 | **共性淘汰条件** | ✅ 已提炼 | 三条硬性条件可快速排除绝大多数免费 BaaS，见 §3.5 |

**→ 最终候选收敛为四条：A（CloudBase PG）、C（VPS 自建）、D（家里自建）、I（VPS + 对象存储分离）。**

### 待确认

1. **【最关键】路线选择**：先跑 Phase 0 实测（免费，不花钱）还是直接上 C（38–99 元/年，长期省心）？
   → 我建议：**先花一周做 Phase 0**，拿到真实账单数据再决定，避免拍脑袋。
2. **「完全不依赖海外」是否包含构建链路（L2）？** 只要求 L1 的话，改动量最小、EAS Build 可继续用。
3. **家里是否有 7×24 常开的设备 + 公网可达性？** 有 → D（真 0 元）值得认真设计；没有 → 走 C。
4. **两个账号能否接受迁移时各重置一次密码？**（这是 Auth 迁移的确定成本）
5. **是否必须保留纯 JS 热更新？** 需要 → 自建 Updates（§7.2②）；不需要 → 手动 APK 分发最省心。
6. **迁移期间能否短暂停写？** 建议停写 1 小时以内。
7. **原 Supabase 项目保留多久作回滚源？** 建议 ≥1 个完整验收周期（约 1 个月）。
8. **Outline 的「禁用本地原生构建」是否可放宽到「本机构建 + 国内 CI」？** 影响 §7.1 选型。

---

## 13. 参考

- CloudBase 定价与免费体验：https://cloud.tencent.com/product/tcbs
- 资源点计费标准：https://cloud.tencent.com/document/buy-guide/876/127357
- CloudBase 从 Supabase 迁移：https://docs.cloudbase.net/quick-start/migration/supabase
- PG 模式云存储与 RLS：https://docs.cloudbase.net/storage/pg/introduce
- PG 存储 HTTP API：https://docs.cloudbase.net/http-api/storage-pg/pg-storage-api
- PG 模式身份认证：https://docs.cloudbase.net/authentication-v2/auth/auth-pg
- Expo 自定义 Updates 服务器：https://docs.expo.dev/eas-update/custom-updates-server/
- Expo Updates Protocol v1：https://docs.expo.dev/technical-specs/expo-updates-1/
- 官方示例实现：https://github.com/expo/custom-expo-updates-server
- LeanCloud 价格（已否决，仅备查）：https://www.leancloud.cn/pricing/
- LeanCloud 数据与安全（ACL）：https://docs.leancloud.cn/sdk/storage/guide/security
- LeanCloud 文件存储 FAQ（无私有桶）：https://docs.leancloud.cn/sdk/storage/faq/
- LeanCloud 文件流量计费（HTTPS 无免费额度）：https://leancloudblog.com/wen-jian-cun-chu-quan-mian-zhi-chi-hai-wai-cdn-he-https-fang-wen-xie-yi/
- 七牛云免费额度（已否决，仅备查）：https://developer.qiniu.com/af/12968/freequota
- 七牛云按量计费（HTTPS 无免费额度）：https://developer.qiniu.com/af/12990/real-spending-detail-describe
- 腾讯云 COS 免费额度（50GB/6 个月）：https://qcloud.com/doc/product/436/6240
- 阿里云轻量服务器 / ECS 价格：https://developer.aliyun.com/article/1705124
- Supabase 自托管对比（Appwrite/Nhost/PocketBase 的权限模型差异）：https://markaicode.com/alternatives/supabase-alternatives
