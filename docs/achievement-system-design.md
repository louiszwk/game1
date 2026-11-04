# 《动物大战外星人》成就系统设计文档

> 版本：v1.0 ｜ 日期：2026-11-04 ｜ 定位：在现有 `achievementManager.js` 基础上，扩展为一套「做任务 → 解锁 → 领奖励 → 激励重玩」的完整成就闭环。

---

## 0. 现状盘点（扩展基线）

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

1. **扩成就清单**（覆盖更多玩法维度，尤其是装备系统）
2. **引入奖励分层**（从单一"积分加成"扩展为可兑现的多元奖励）
3. **完善 UI 体验**（分类页签、进度展示、解锁动效、奖励领取）
4. **打通装备系统联动**（成就 ↔ 装备互相驱动）

---

## 1. 成就分类体系

### 1.1 五大分类（现有基础上微调）

| 分类 id | 名称 | icon | 定位 | 现有成就数 |
|---|---|---|---|---|
| `combat` | 战斗杀敌 | ⚔️ | 击杀数量里程碑 | 5 |
| `growth` | 成长之路 | 🌱 | 等级/阶段/本命 | 5 |
| `victory` | 通关征服 | 👑 | 通关/难度 | 2 |
| `build` | 构筑大师 | 🔮 | 技能/元素/装备搭配 | 3 |
| `mastery` | 全图鉴 | 📖 | 职业/种族/收集 | 3 |

### 1.2 新增分类建议

| 分类 id | 名称 | icon | 定位 |
|---|---|---|---|
| `equipment` | 装备收藏 | 🛡️ | 装备收集/穿戴/传说（与装备系统联动） |

> 共 6 大分类，符合成就系统"全维度覆盖"的目标。

---

## 2. 成就清单设计

### 2.1 保留现有成就（20 个，不删除）

现有 20 个成就全部保留（击杀/成长/通关/搭配/图鉴），避免破坏已有存档。

### 2.2 新增成就清单（建议一次性补齐至 40+ 个）

#### A. 装备类成就（`equipment`，与装备系统联动）

| id | 名称 | 描述 | metric | target |
|---|---|---|---|---|
| `equip_first` | 初得神兵 | 首次拾取一件装备 | `equipCount` | 1 |
| `equip_20` | 军火库 | 累计拾取 20 件装备 | `equipCount` | 20 |
| `equip_100` | 装备大师 | 累计拾取 100 件装备 | `equipCount` | 100 |
| `epic_first` | 史诗降临 | 首次获得史诗级装备 | `epicCount` | 1 |
| `legendary_first` | 传说问世 | 首次获得传说级装备 | `legendaryCount` | 1 |
| `legendary_5` | 传说猎手 | 累计获得 5 件传说装备 | `legendaryCount` | 5 |
| `full_epic` | 全身史诗 | 单局 6 槽位全为史诗及以上 | `maxEpicSlots` | 6 |

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

## 3. 奖励体系升级

### 3.1 现有奖励（单一维度）

目前所有成就奖励都是 `scoreBonus`（积分加成），过于单一。

### 3.2 多元奖励设计

| 奖励类型 | 说明 | 示例 |
|---|---|---|
| `scoreBonus` | 结算积分加成 | 通关时额外 +1000 分 |
| `gold` | 局外货币（新增） | 用于解锁局外内容 |
| `unlockEquip` | 解锁装备图鉴 | 解锁一件新装备的掉落资格 |
| `unlockSkin` | 解锁皮肤/配色 | 解锁角色皮肤（预留） |
| `title` | 称号 | 展示在选人界面头像旁 |

### 3.3 奖励分层（稀有度映射）

| 成就难度 | 奖励档次 | 说明 |
|---|---|---|
| 普通成就（1 星） | 积分 +500~3000 | 随手可得的鼓励 |
| 进阶成就（2 星） | 积分 +3000~10000 + 金币 | 需要刻意追求 |
| 大师成就（3 星） | 积分 +10000+ + 装备图鉴解锁 | 高难挑战 |
| 传说成就（4 星） | 称号 + 皮肤 + 大量金币 | 骨灰级目标 |

---

## 4. UI 体验设计

### 4.1 成就面板（扩展现有 `renderAchievementsPanel`）

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

### 4.2 解锁动效

- 达成成就瞬间：**屏幕中央弹窗**（金色边框 + 成就名 + 图标 + 奖励），2 秒后自动消失
- 底部：**奖励入账提示**（如 "+1000 积分"）
- 音效：复用现有音效，可加短促的"叮"提示音

### 4.3 进度可视化

- 未解锁成就显示**进度条 + 当前值/目标值**（现有已支持）
- 新增：**"还差 X" 提示**（如"还差 123 次击杀"），强化目标感

---

## 5. 与装备系统的联动

| 联动方向 | 说明 |
|---|---|
| 装备 → 成就 | 拾取装备、获得传说、全身史诗触发装备类成就 |
| 成就 → 装备 | 成就奖励可解锁装备图鉴（`unlockEquip`），扩大装备掉落池 |
| 数据共享 | 二者共用 `eventBus` + `Storage`，成就管理器新增 `equipCount`/`legendaryCount` 等指标 |

---

## 6. 数据与事件扩展

### 6.1 新增指标（metrics）

```js
// 跨局持久化
equipCount: 0,        // 累计拾取装备数
epicCount: 0,         // 累计史诗装备数
legendaryCount: 0,    // 累计传说装备数
eliteKillCount: 0,    // 累计精英击杀
classWinSet: [],      // 各职业通关记录
raceWinSet: [],       // 各种族通关记录
comboCount: 0,        // 使用过的种族×职业组合数

// 单局会话
maxSingleHit: 0,      // 单局最高单次伤害
maxElementCount: 0,   // 单局元素数量
maxActiveSynergy: 0,  // 单局同时触发联动数
ultraCount: 0,        // 单局超武合成数
innateLv6Count: 0,    // 单局本命 Lv.6 次数
bossNoHitCount: 0,    // 单局无伤 Boss 次数
maxEpicSlots: 0,      // 单局史诗槽位数
bestClearTime: 0,     // 单局通关用时（秒）
```

### 6.2 新增事件（eventBus）

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

## 7. 实现路线

### Phase 1（扩数据层，最小侵入）
1. 扩展 `ACHIEVEMENTS` 配置表（新增装备类 + 各分类扩展成就）
2. 扩展 `metrics` + `load/save` 持久化字段
3. 新增事件监听（装备/暴击/精英/通关明细）

### Phase 2（装备系统接入后）
4. 装备系统上线后，接入 `equipment:pickup` / `equipment:equip` 事件
5. 记录 `equipCount` / `legendaryCount` 等指标

### Phase 3（UI 体验）
6. 成就面板加分类页签
7. 解锁动效 + 奖励入账提示
8. 奖励发放逻辑（金币/装备图鉴/称号）

---

## 8. 持久化兼容

### 8.1 版本迁移

现有存档 `STORAGE_KEY = 'animal_vs_alien_achievements_v1'`，新增字段后：

```js
load() 时对缺失字段做默认值兜底：
  if (typeof saved.equipCount !== 'number') saved.equipCount = 0;
  // ... 其余新增字段同理
```

**不升级 storage key**（保持 v1），避免老玩家成就进度丢失。新增字段用默认值兼容。

### 8.2 防存档损坏

- `load()` 增加 `try/catch`，损坏时回退空存档，不崩溃
- 关键数值做 `Number.isFinite` 校验

---

## 9. 关键设计原则

1. **成就 = 引导而非惩罚** —— 成就是"锦上添花"，不是"不完成就亏"的任务
2. **进度可视化** —— 让玩家随时知道"还差多少"，强化目标感
3. **奖励即时兑现** —— 解锁即给，不搞"攒够一起领"的负体验
4. **难度分层** —— 从"随手达成"到"骨灰级挑战"全覆盖，照顾各层次玩家
5. **与装备/技能系统耦合** —— 成就是系统的"仪表盘"，反映玩家在各维度的探索深度
