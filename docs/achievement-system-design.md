# 《动物大战外星人》成就系统设计文档

> 版本：v2.0 ｜ 日期：2026-11-04 ｜ 定位：在现有 `achievementManager.js` 基础上，升级为「云端用户体系 + 成就持久化 + 奖励闭环」的完整成就系统。

---

## 0. 重大变更说明（v1.0 → v2.0）

| 维度 | v1.0（旧） | v2.0（本次） |
|---|---|---|
| 存储方式 | 纯本地 `wx.setStorageSync` | **微信云开发云数据库**（本地缓存仅作离线兜底） |
| 用户体系 | 无用户概念 | **基于 `_openid` 的用户体系**，自动识别玩家 |
| 数据范围 | 仅成就进度 | **用户信息 + 成就进度 + 游戏统计** |
| 跨设备 | 不支持 | **换机/重装后云端自动恢复** |
| 防作弊 | 无 | 敏感字段走云函数校验 |

**一句话**：成就系统要「记录用户信息」，用**云开发**把「用户信息 + 成就进度」存到云端数据库，本地 `Storage` 降级为快速读取缓存。

---

## 1. 现状盘点（扩展基线）

现有 `js/runtime/achievementManager.js` 已具备：

| 能力 | 现状 |
|---|---|
| 成就定义 | 已有 20 个成就（`ACHIEVEMENTS` 配置表） |
| 事件监听 | 已绑定 `enemy:killed` / `skill:innatemax` / `game:victory` / `synergy:buff` / `skill:maxcount` / `player:levelup` / `player:stagechange` |
| 持久化 | 已有 `wx.setStorageSync` + localStorage 降级 |
| 查询接口 | 已有 `getAchievements()` / `getStats()` / `isUnlocked()` / `getUnlocked()` |
| 解锁事件 | 已有 `achievement:unlock` 事件抛出 |
| 成就 UI | 已有选人界面「🏆成就」入口 + `renderAchievementsPanel` |

**关键结论**：成就系统的「数据层 + 监听层」已成型，本次设计的核心是：

1. **引入云开发用户体系**（记录用户信息，云端持久化成就）
2. **扩成就清单**（覆盖更多玩法维度，尤其是装备系统）
3. **引入奖励分层**（从单一"积分加成"扩展为可兑现的多元奖励）
4. **完善 UI 体验**（分类页签、进度展示、解锁动效、奖励领取）
5. **打通装备系统联动**（成就 ↔ 装备互相驱动）

---

## 2. 云开发用户体系（核心新增）

### 2.1 技术选型

- **平台**：微信小游戏云开发（`wx.cloud`，`compileType: "game"` 已支持）
- **环境**：`wx.cloud.init({ env: '<环境ID>', traceUser: true })`
- **用户标识**：云数据库每条记录**自动附加 `_openid`**，无需手动登录、无需调 `wx.login` 获取 code
- **权限模型**：数据库集合设「仅创建者可读写」，天然实现用户数据隔离

### 2.2 初始化时机

```
game.js 入口（或 main.js 构造器）内：
  wx.cloud.init({ env: 'animal-vs-alien-prod', traceUser: true })

首次 init 后，由云函数 `getOpenId` 返回 openid 缓存到本地，
作为「用户已初始化」的标记（openid 本身亦可由前端直接获取）。
```

### 2.3 用户信息字段

| 字段 | 类型 | 说明 | 来源 |
|---|---|---|---|
| `_openid` | string | 用户唯一标识（自动） | 系统 |
| `nickname` | string | 昵称 | `wx.getUserProfile`（需用户授权） |
| `avatarUrl` | string | 头像 | 同上 |
| `createTime` | serverDate | 首次建档时间 | 系统 |
| `lastLoginTime` | serverDate | 最近登录 | 系统 |
| `totalPlayCount` | number | 累计局数 | 累加 |
| `totalPlaySeconds` | number | 累计游玩时长（秒） | 累加 |

> ⚠️ 隐私合规：昵称/头像属于用户敏感信息，**必须**通过 `wx.getUserProfile` 用户主动授权后才能获取与上传；未授权时仅记录 `_openid` 与游戏统计，昵称头像留空。

---

## 3. 云端数据模型（数据库集合设计）

### 3.1 集合清单

| 集合名 | 用途 | 权限 | 记录数/用户 |
|---|---|---|---|
| `users` | 用户基本信息 | 仅创建者可读写 | 1 条 |
| `achievements` | 成就进度（已解锁成就 + 指标） | 仅创建者可读写 | 1 条 |
| `achievement_logs` | 成就解锁流水（审计/回放） | 仅创建者可读写 | N 条 |

### 3.2 `users` 集合（用户信息）

```js
{
  _id: 'auto',
  _openid: 'oXXXX',          // 自动
  nickname: '玩家小明',
  avatarUrl: 'cloud://...',
  createTime: ServerDate,
  lastLoginTime: ServerDate,
  totalPlayCount: 128,
  totalPlaySeconds: 43210,
}
```

### 3.3 `achievements` 集合（成就主档）

```js
{
  _id: 'auto',
  _openid: 'oXXXX',          // 自动
  unlocked: ['kills_100', 'innate_max_1', ...],  // 已解锁成就 id 列表
  metrics: {                 // 跨局累计指标（与本地 metrics 同构）
    totalKills: 1000,
    innateMaxCount: 3,
    victoryCount: 2,
    equipCount: 20,
    legendaryCount: 1,
    // ... 其余指标
  },
  updatedAt: ServerDate,
}
```

### 3.4 `achievement_logs` 集合（解锁流水）

```js
{
  _id: 'auto',
  _openid: 'oXXXX',          // 自动
  achievementId: 'legendary_first',
  name: '传说问世',
  unlockedAt: ServerDate,
  reward: { type: 'title', value: '传说猎手' },
}
```

### 3.5 前端直连 vs 云函数

| 操作 | 方式 | 理由 |
|---|---|---|
| 读用户信息 / 成就进度 | **前端直连** | 高频读取，权限「仅创建者可读写」已足够安全 |
| 写成就进度 / 用户信息 | **前端直连** | 非敏感数据，直接 `update` |
| 解锁判定 + 奖励发放 | **云函数** | 关键路径需服务端校验，防止前端篡改进度直接刷奖励 |
| 排行榜（可选扩展） | **云函数** | 需要跨用户聚合查询 |

---

## 4. 成就分类体系

### 4.1 六大分类

| 分类 id | 名称 | icon | 定位 |
|---|---|---|---|
| `combat` | 战斗杀敌 | ⚔️ | 击杀数量里程碑 |
| `growth` | 成长之路 | 🌱 | 等级/阶段/本命 |
| `victory` | 通关征服 | 👑 | 通关/难度 |
| `build` | 构筑大师 | 🔮 | 技能/元素/装备搭配 |
| `mastery` | 全图鉴 | 📖 | 职业/种族/收集 |
| `equipment` | 装备收藏 | 🛡️ | 装备收集/穿戴/传说（与装备系统联动） |

---

## 5. 成就清单设计

### 5.1 保留现有成就（20 个，不删除）

现有 20 个成就全部保留，避免破坏已有存档。

### 5.2 新增成就清单（补齐至 40+ 个）

#### A. 装备类成就（`equipment`，与装备系统联动）

| id | 名称 | 描述 | metric | target |
|---|---|---|---|---|
| `equip_first` | 初得神兵 | 首次拾取一件装备 | `equipCount` | 1 |
| `equip_20` | 军火库 | 累计拾取 20 件装备 | `equipCount` | 20 |
| `equip_100` | 装备大师 | 累计拾取 100 件装备 | `equipCount` | 100 |
| `epic_first` | 史诗降临 | 首次获得史诗级装备 | `epicCount` | 1 |
| `legendary_first` | 传说问世 | 首次获得传说级装备 | `legendaryCount` | 1 |
| `legendary_5` | 传说猎手 | 累计获得 5 件传说装备 | `legendaryCount` | 5 |
| `full_epic` | 全身史诗 | 单局 16 部位全为史诗及以上 | `maxEpicSlots` | 16 |

#### B. 战斗深度成就（`combat` 扩展）

| id | 名称 | 描述 | metric | target |
|---|---|---|---|---|
| `kills_10000` | 屠神 | 累计击杀 10000 只 | `totalKills` | 10000 |
| `crit_kill` | 一击必杀 | 单局一次暴击造成 500+ 伤害 | `maxSingleHit` | 500 |
| `elite_kill_50` | 精英克星 | 累计击杀 50 只精英怪 | `eliteKillCount` | 50 |
| `boss_no_hit` | 无伤弑神 | 无伤击败一次 Boss | `bossNoHitCount` | 1 |

#### C. 构筑深度成就（`build` 扩展）

| id | 名称 | 描述 | metric | target |
|---|---|---|---|---|
| `full_element` | 五行圆满 | 单局集齐 5 种元素技能 | `maxElementCount` | 5 |
| `triple_synergy` | 羁绊大师 | 单局同时触发 3 个元素联动 | `maxActiveSynergy` | 3 |
| `ultra_first` | 超武出世 | 首次合成超武（技能满级突破） | `ultraCount` | 1 |
| `innate_6` | 天命圆满 | 本命技能升至 Lv.6 神话极境 | `innateLv6Count` | 1 |

#### D. 挑战成就（`victory` 扩展，激励高玩）

| id | 名称 | 描述 | metric | target |
|---|---|---|---|---|
| `victory_10` | 星际传说 | 累计通关 10 次 | `victoryCount` | 10 |
| `speed_run` | 速通者 | 单局 8 分钟内通关 | `bestClearTime` | 480 |
| `low_build_win` | 极限通关 | 仅 3 门技能通关 | `minSkillWin` | 3 |

#### E. 探索成就（`mastery` 扩展）

| id | 名称 | 描述 | metric | target |
|---|---|---|---|---|
| `all_class_win` | 全职业制霸 | 用全部 6 职业各通关 1 次 | `classWinSet` | 6 |
| `all_race_win` | 全种族制霸 | 用全部 5 种族各通关 1 次 | `raceWinSet` | 5 |
| `combo_30` | 组合大师 | 使用过 30 种种族×职业组合 | `comboCount` | 30 |

---

## 6. 奖励体系升级

### 6.1 多元奖励设计

| 奖励类型 | 说明 | 示例 |
|---|---|---|
| `scoreBonus` | 结算积分加成 | 通关时额外 +1000 分 |
| `gold` | 局外货币（新增） | 用于解锁局外内容 |
| `unlockEquip` | 解锁装备图鉴 | 解锁一件新装备的掉落资格 |
| `unlockSkin` | 解锁皮肤/配色 | 解锁角色皮肤（预留） |
| `title` | 称号 | 展示在选人界面头像旁 |

### 6.2 奖励分层（稀有度映射）

| 成就难度 | 奖励档次 | 说明 |
|---|---|---|
| 普通成就（1 星） | 积分 +500~3000 | 随手可得的鼓励 |
| 进阶成就（2 星） | 积分 +3000~10000 + 金币 | 需要刻意追求 |
| 大师成就（3 星） | 积分 +10000+ + 装备图鉴解锁 | 高难挑战 |
| 传说成就（4 星） | 称号 + 皮肤 + 大量金币 | 骨灰级目标 |

### 6.3 奖励发放安全

- 解锁判定与奖励发放放在**云函数** `unlockAchievement`，服务端校验进度真实性后写入
- 防止前端直接篡改 `unlocked` 数组刷奖励

---

## 7. UI 体验设计

### 7.1 成就面板（扩展现有 `renderAchievementsPanel`）

```
┌────────────────────────────────┐
│  🏆 成就图鉴        12/45 已解锁 │  ← 顶部总览
├────────────────────────────────┤
│  [⚔️战斗][🌱成长][👑通关]      │  ← 分类页签（6 类）
│  [🔮构筑][📖图鉴][🛡️装备]      │
├────────────────────────────────┤
│  ✅ 百人斩          已解锁      │  ← 已解锁（金色高亮）
│  ⬜ 千人斩  进度 ▓▓▓░░  123/1000│  ← 未解锁（进度条）
│  ⬜ 屠神    进度 ▓░░░░ 8000/10000│
│  ...                            │
└────────────────────────────────┘
```

### 7.2 用户信息展示

- 成就面板顶部展示**用户头像 + 昵称 + 累计局数/时长**（来自云 `users` 集合）
- 未授权用户信息时，显示默认头像 + "未设置昵称"，点击触发 `wx.getUserProfile` 授权

### 7.3 解锁动效

- 达成成就瞬间：**屏幕中央弹窗**（金色边框 + 成就名 + 图标 + 奖励），2 秒后自动消失
- 底部：**奖励入账提示**（如 "+1000 积分"）
- 音效：复用现有音效，可加短促的"叮"提示音

### 7.4 进度可视化

- 未解锁成就显示**进度条 + 当前值/目标值**（现有已支持）
- 新增：**"还差 X" 提示**（如"还差 123 次击杀"），强化目标感

---

## 8. 与装备系统的联动

| 联动方向 | 说明 |
|---|---|
| 装备 → 成就 | 拾取装备、获得传说、全身史诗触发装备类成就 |
| 成就 → 装备 | 成就奖励可解锁装备图鉴（`unlockEquip`），扩大装备掉落池 |
| 数据共享 | 二者共用 `eventBus` + 云数据库，成就管理器新增 `equipCount`/`legendaryCount` 等指标 |

---

## 9. 数据与事件扩展

### 9.1 新增指标（metrics，云端 `achievements.metrics` 同构）

```js
// 跨局持久化（云端）
equipCount: 0,        // 累计拾取装备数
epicCount: 0,         // 累计史诗装备数
legendaryCount: 0,    // 累计传说装备数
eliteKillCount: 0,    // 累计精英击杀
classWinSet: [],      // 各职业通关记录
raceWinSet: [],       // 各种族通关记录
comboCount: 0,        // 使用过的种族×职业组合数

// 单局会话（本地，结算时上传云端）
maxSingleHit: 0,      // 单局最高单次伤害
maxElementCount: 0,   // 单局元素数量
maxActiveSynergy: 0,  // 单局同时触发联动数
ultraCount: 0,        // 单局超武合成数
innateLv6Count: 0,    // 单局本命 Lv.6 次数
bossNoHitCount: 0,    // 单局无伤 Boss 次数
maxEpicSlots: 0,      // 单局史诗槽位数
bestClearTime: 0,     // 单局通关用时（秒）
```

### 9.2 新增事件（eventBus）

| 事件名 | 触发时机 | 携带数据 |
|---|---|---|
| `equipment:pickup` | 拾取装备 | `{ slot, rarity }` |
| `equipment:equip` | 装备到槽位 | `{ slot, item }` |
| `combat:crit` | 造成暴击 | `{ damage }` |
| `enemy:elite_killed` | 击杀精英 | — |
| `enemy:boss_killed` | 击杀 Boss | `{ noHit }` |
| `build:ultra` | 合成超武 | `{ skillId }` |
| `build:synergy` | 触发元素联动 | `{ ruleCount }` |
| `game:clear` | 通关 | `{ clearTime, skills, raceId, classId }` |

---

## 10. 云端同步策略（本地 ↔ 云）

### 10.1 读写分层

```
┌──────────────┐        读(缓存)        ┌──────────────┐
│  本地 Storage │ ◄─────────────────── │  游戏逻辑     │
│  (快速读取)   │                       │  (achievement │
└──────┬───────┘                       │   Manager)    │
       │ 兜底/离线                      └──────┬───────┘
       │                                        │ 写(节流)
       │                                        ▼
       │                                 ┌──────────────┐
       └──────── 降级读取 ◄───────────── │  云数据库     │
                                          │ (users/achv) │
                                          └──────────────┘
```

### 10.2 同步时机

| 时机 | 动作 |
|---|---|
| 首次启动 | 云数据库拉取 `users` + `achievements`，写入本地缓存 |
| 成就解锁 | 本地立即更新（保证 UI 即时）+ **节流上传云端**（云函数判定后写库） |
| 每局结算 | 上传单局指标（`bestClearTime`/`maxEpicSlots` 等） |
| 退出/切后台 | `wx.onHide` 时触发一次 flush，尽量补传未同步数据 |

### 10.3 冲突与降级

- **本地为准 → 云端合并**：本地指标是"事实源"，上传用**累加/取 max** 语义（如 `totalKills += 增量`），避免覆盖丢数据
- **离线/弱网**：写入本地缓存，标记 `dirty`，联网后补传
- **云不可用**：完全退化为本地模式（现有逻辑），不影响游戏可玩性

### 10.4 成本控制

- 云数据库按**调用次数**计费（基础套餐约 20 万次/月），故：
  - 成就解锁是**低频事件**（一局几次），直连即可
  - 用户信息更新**节流**（如每 30s 或每局结算才写）
  - 不逐帧、不逐击杀同步，避免刷爆调用额度

---

## 11. 实现路线

### Phase 1（云开发接入 + 数据层）
1. 新建 `cloudfunctions/`（`getOpenId`、`unlockAchievement` 两个云函数）
2. `wx.cloud.init` 接入，创建 `users` / `achievements` / `achievement_logs` 三个集合
3. `achievementManager` 增加云读写封装（读云端 → 本地缓存 → 本地为准 → 节流回传）

### Phase 2（成就清单扩充）
4. 扩展 `ACHIEVEMENTS` 配置表（新增装备类 + 各分类扩展成就）
5. 扩展 `metrics` + 云端字段同步
6. 新增事件监听（装备/暴击/精英/通关明细）

### Phase 3（装备系统接入后）
7. 装备系统上线后，接入 `equipment:pickup` / `equipment:equip` 事件
8. 记录 `equipCount` / `legendaryCount` 等指标

### Phase 4（UI 体验）
9. 成就面板加分类页签 + 用户信息展示
10. 解锁动效 + 奖励入账提示
11. 云函数发放奖励（金币/装备图鉴/称号）

---

## 12. 数据安全与合规

### 12.1 防作弊

| 风险 | 对策 |
|---|---|
| 前端篡改进度刷奖励 | 关键解锁判定走云函数，服务端校验 |
| 重复领取奖励 | 云函数用 `achievement_logs` 幂等去重 |
| 伪造击杀数 | 单局指标由云函数按规则核验（可选，成本权衡） |

### 12.2 隐私合规

- 昵称/头像必须 `wx.getUserProfile` 主动授权，未授权不上传
- 上传用户信息需在隐私协议中明示用途（微信平台要求）
- 仅收集游戏运行必需的最小信息

### 12.3 存量存档迁移

- 现有本地存档 key `animal_vs_alien_achievements_v1` 的进度，首次接入云端时**上传一次**作为初始值
- 迁移后本地仍保留，作为离线缓存

---

## 13. 关键设计原则

1. **成就 = 引导而非惩罚** —— 成就是"锦上添花"，不是"不完成就亏"的任务
2. **进度可视化** —— 让玩家随时知道"还差多少"，强化目标感
3. **奖励即时兑现** —— 解锁即给，不搞"攒够一起领"的负体验
4. **难度分层** —— 从"随手达成"到"骨灰级挑战"全覆盖，照顾各层次玩家
5. **与装备/技能系统耦合** —— 成就是系统的"仪表盘"，反映玩家在各维度的探索深度
6. **云端为主、本地兜底** —— 云数据库保证跨设备/防丢失，本地缓存保证弱网可玩
7. **最小成本** —— 云调用按需节流，不做逐帧/逐击杀的冗余同步
