# 《动物大战外星人》魔兽机制架构重构设计文档

> 版本：v1.0 ｜ 日期：2026-11-02 ｜ 目标：把硬编码的肉鸽战斗系统，重构为「高扩展技能基类 + 配置驱动 + 事件系统 + 元素联动」的魔兽风架构。

---

## 0. 现状盘点（重构基线）

| 需求项 | 现状 | 差距 |
|---|---|---|
| 派系/五行双标签 | 已有 `CATEGORY_MAP` + `ELEMENT_MAP` 两套独立枚举 | 标签挂载在 SKILLS 里但**未参与任何动态计算** |
| 职业黑名单 | 已有 `CLASSES.*.forbiddenCategories` | 逻辑散落在 `Player.canLearnSkill`，非配置驱动 |
| 本命技能槽 | 已有 `RACES.*.racialSkillId` | 无「固定槽 + 上限永远高 1 级」的显式机制 |
| DoT/HoT/AoE/CC/施法/冷却 | 全部**硬编码**在 `skill_manager.js`（约 2000 行 if/switch） | 无统一基类、无抽象 |
| 元素联动 | 无 | 完全缺失 |
| UI 主题切换 | 无 | 完全缺失（配色散落各文件） |
| 升级事件/阶段模型 | `gainExp` 里 `level++` 后无事件抛出 | 无事件总线，模型切换仅靠 level 阈值 |

**关键结论**：现有代码「能用」，但扩展性差——加一个新技能要改 4~5 处硬编码。本次重构的核心目标是**把"改业务逻辑"变成"改配置表"**。

---

## 1. 需求一：魔兽机制深度复刻（技能基类）

### 1.1 技能基类设计

新建 `js/skills/SkillBase.js`，作为所有技能的统一抽象基类。**保留现有 `SKILLS` 配置表作为数据源**，基类负责把配置"解释"为可执行的运行时行为。

```js
// js/skills/SkillBase.js
export default class SkillBase {
  constructor(skillId, level = 1) {
    this.id = skillId;
    this.level = level;
    this.def = SKILLS[skillId];          // 指向配置表
    this.category = this.def.category;   // 派系枚举
    this.element = this.def.element;     // 五行枚举

    // ===== 预留字段（配置表可覆盖，见 1.2）=====
    this.cooldown = this.def.cooldown || 0;        // 冷却（帧）
    this.castTime = this.def.castTime || 0;        // 施法读条（帧），0=瞬发
    this.range = this.def.range || 0;              // 施法距离，0=无限制
    this.targetType = this.def.targetType || 'auto'; // auto/nearest/self/area/direction
    this.aoeRadius = this.def.aoeRadius || 0;      // 范围效果半径

    // 状态效果（DoT/HoT/CC）统一结构
    this.effects = this.def.effects || [];         // 见 1.3

    // 运行时状态
    this._cooldownTimer = 0;   // 当前冷却计时
    this._castTimer = 0;       // 当前读条进度
    this._casting = false;     // 是否正在施法
  }

  // —— 生命周期钩子（子类可覆写）——
  isReady() { return this._cooldownTimer <= 0 && !this._casting; }
  startCast(player) { this._casting = true; this._castTimer = this.castTime; }
  tickCast(player) { if (this._castTimer > 0) this._castTimer--; return this._castTimer <= 0; }
  onCastComplete(player, ctx) {}       // 读条完成，触发技能
  cast(player, ctx) {}                 // 瞬发技能入口
  update(player, ctx) {}               // 每帧更新（持续型技能）
  render(ctx, player) {}               // 每帧渲染

  // —— 冷却系统 ——
  tickCooldown() { if (this._cooldownTimer > 0) this._cooldownTimer--; }
  putOnCooldown(reduce = 0) {
    this._cooldownTimer = Math.max(0, Math.round(this.cooldown * (1 - reduce)));
  }
}
```

### 1.2 配置表预留字段（在 `SKILLS[id]` 上扩展）

每个技能配置新增以下字段（现有技能**先填默认值**，新增技能按需填）：

```js
SKILLS.fire_blast = {
  id: 'fire_blast',
  name: '赤炎脉冲',
  category: 'COMBAT',       // 派系（已存在）
  element: 'FIRE',          // 五行（已存在）
  maxLevel: 6,

  // ===== 新增：机制字段 =====
  mechanism: 'PROJECTILE',  // 机制类型：PROJECTILE/AOE/DOT/HOT/CC/CHANNEL/PASSIVE/AURA/SUMMON
  cooldown: 90,             // 冷却（帧，60fps=1秒）0=无冷却
  castTime: 0,              // 施法读条（帧），>0 表示有读条
  range: 0,                 // 施法距离（px），0=无限
  aoeRadius: 0,             // 命中后的范围爆炸半径（px）
  targetType: 'nearest',    // auto/nearest/self/area/direction/random

  // ===== 新增：统一状态效果（DoT/HoT/CC 的标准载体）=====
  effects: [
    {
      type: 'DOT',          // DOT/HOT/CC/BUFF/DEBUFF
      dotKind: 'fire',      // 伤害类型细分（fire/poison/curse/bleed）
      school: 'physical',   // 伤害派系（physical/holy/fel/shadow/arcane）
      tickDamage: 6,        // 每跳伤害/治疗量
      tickInterval: 30,     // 每跳间隔（帧）
      duration: 180,        // 总持续（帧）
      // —— CC 专属字段 ——
      ccType: 'stun',       // stun/slow/freeze/knockback/fear/root
      slowPercent: 0.4,     // 减速百分比
      // —— BUFF/DEBUFF 专属 ——
      statKey: null,        // 如 'atkMultiplier'
      statDelta: 0,         // 如 +0.2
    },
  ],
};
```

### 1.3 五大机制的标准实现（举例）

| 机制 | 说明 | 关键实现点 |
|---|---|---|
| **DoT**（持续伤害） | 命中后挂一个持续掉血状态 | `effects[].type='DOT'`，在 `StatusEffectManager` 里每 `tickInterval` 跳一次 `tickDamage` |
| **HoT**（持续治疗） | 命中/释放后持续回血 | `effects[].type='HOT'`，tick 作用于 `player.heal()` |
| **AoE**（范围效果） | 以点/自身为中心的范围伤害 | `mechanism='AOE'` + `aoeRadius`，碰撞判定用现有 `SpatialHashGrid` |
| **CC**（控制状态） | 晕/减速/冰冻/击退/恐惧/定身 | `effects[].type='CC'` + `ccType`，挂在敌人 `slowDuration/curseDuration` 之上，新增统一 `statusEffects[]` |
| **施法读条** | 有 `castTime` 的技能需读条 | `startCast/tickCast/onCastComplete` 三段式，读条可被击退打断（预留 `interruptOnHit` 字段） |
| **冷却系统** | 统一 `tickCooldown/putOnCooldown` | 受 `player.cooldownReduce` 影响，已有被动 `stat_haste` 可复用 |

### 1.4 融合「魔兽 + 五行」的新技能名示例（配置表新增）

```js
export const NEW_SKILL_EXAMPLES = {
  holy_storm:   { name: '神圣风暴',  category: 'HOLY',   element: 'METAL' },   // 已有，作为标杆
  shadow_bolt:  { name: '暗影箭',    category: 'DEATH',  element: 'WATER' },   // 已有
  arcane_missiles:{ name:'奥术飞弹', category: 'ARCANE', element: 'METAL' },   // 已有

  // —— 以下为新增示例 ——
  ember_rain:   { name: '烈焰流星雨', category: 'FEL',    element: 'FIRE',   mechanism: 'AOE' },
  thorn_vine:   { name: '荆棘缠绕',   category: 'ARCANE', element: 'WOOD',   mechanism: 'CC',  ccType: 'root' },
  tidal_ward:   { name: '潮汐护盾',   category: 'HOLY',   element: 'WATER',  mechanism: 'HOT' },
  gale_step:    { name: '疾风步',     category: 'COMBAT', element: 'WIND',   mechanism: 'BUFF' },
  earthquake:   { name: '地震术',     category: 'ARCANE', element: 'EARTH',  mechanism: 'AOE' },
  thunder_bolt: { name: '雷霆一击',   category: 'COMBAT', element: 'THUNDER', mechanism: 'PROJECTILE' },
  golden_armor: { name: '金身不坏',   category: 'HOLY',   element: 'METAL',  mechanism: 'BUFF' },
};
```

---

## 2. 需求二：双轴平行标签 + 元素联动管理器

### 2.1 双轴标签（已有，规范化）

每个技能**必须**同时挂载两个独立枚举，互不耦合：

- **派系 `category`**：`COMBAT` / `HOLY` / `FEL` / `DEATH` / `ARCANE` / `PASSIVE` / `RACIAL`
- **五行 `element`**：`METAL` / `WOOD` / `WATER` / `FIRE` / `EARTH` / `THUNDER` / `WIND`

> 校验：新增技能时，两字段必填，缺失即抛错（`SkillBase` 构造函数里做断言）。

### 2.2 元素联动管理器

新建 `js/skills/ElementSynergyManager.js`，纯函数式计算，无副作用：

```js
export default class ElementSynergyManager {
  constructor() { this.synergyMap = SYNERGY_RULES; }

  // 输入：当前已学技能列表 → 输出：全局增益/减益
  compute(learnedSkills) {
    const ownedElements = new Set();
    for (const id in learnedSkills) {
      const e = SKILLS[id].element;
      if (e) ownedElements.add(e);
    }

    const result = { damageMul: 1.0, damageTakenMul: 1.0, buffs: [], debuffs: [] };
    for (const rule of this.synergyMap) {
      if (rule.required.every(e => ownedElements.has(e))) {
        result.damageMul *= rule.damageMul || 1;
        result.damageTakenMul *= rule.damageTakenMul || 1;
        (rule.buff ? result.buffs : result.debuffs).push(rule);
      }
    }
    return result;
  }
}
```

### 2.3 联动规则配置表（预留 + 示例）

```js
export const SYNERGY_RULES = [
  // 火 + 风 → 全局增伤（火借风势）
  { id: 'fire_wind',  required: ['FIRE', 'WIND'],   damageMul: 1.15, buff: true,  desc: '风助火势：全局伤害 +15%' },
  // 水 + 火 → 打怪伤害降低（水火相克，克制自身输出）
  { id: 'water_fire', required: ['WATER', 'FIRE'],  damageMul: 0.85, debuff: true, desc: '水火相克：打怪伤害 -15%' },
  // 雷 + 水 → 增伤（导电）
  { id: 'thunder_water', required: ['THUNDER', 'WATER'], damageMul: 1.2, buff: true, desc: '雷水共鸣：全局伤害 +20%' },
  // 木 + 土 → 回血增益
  { id: 'wood_earth', required: ['WOOD', 'EARTH'],  damageMul: 1.1, buff: true, desc: '木土相生：伤害 +10%，回血效率提升' },
  // 金 + 雷 → 增伤（导电强化）
  { id: 'metal_thunder', required: ['METAL', 'THUNDER'], damageMul: 1.18, buff: true, desc: '金雷共振：伤害 +18%' },
  // 三元素 combo 示例（扩展性验证）
  { id: 'fire_thunder_wind', required: ['FIRE', 'THUNDER', 'WIND'], damageMul: 1.35, buff: true, desc: '天地雷火：伤害 +35%' },
];
```

> **已确认（2026-11-02）**："水+火"的"减弱"指**打怪的伤害变低**，实现为 `damageMul: 0.85`（全局伤害 -15%），而非降低自身受伤。

---

## 3. 需求三：职业黑名单 + 本命槽

### 3.1 职业黑名单（已有，提升为配置驱动 + 校验）

现有 `CLASSES.*.forbiddenCategories` 已是黑名单。本次增强：

1. **拦截位置统一**：新建 `js/skills/SkillEligibility.js`（或复用 `Player.canLearnSkill`），所有技能学习必须经过统一入口校验。
2. **新增逐技能黑名单**（比"派系级"更细）：
   ```js
   CLASSES.holy_knight = {
     // ...现有字段...
     forbiddenCategories: ['FEL', 'DEATH'],        // 派系级（已有）
     forbiddenSkills: ['shadow_curse', 'bone_storm'], // 技能级（新增：即使派系允许也禁止）
   };
   ```
3. **校验优先级**：`RACIAL 专属` → `forbiddenSkills 精确` → `forbiddenCategories 派系` → 通过。

### 3.2 本命技能槽（需求三后半段）

新建本命槽机制，挂载在角色实体 `Player` 上：

```js
// Player 新增字段
this.innateSlot = {
  skillId: this.raceData.racialSkillId,  // 本命技能（鸡→母鸡下蛋，鸭→嘎嘎…）
  level: 1,                              // 初始 1 级
  maxLevel: 6,                           // 上限永远比普通技能高 1 级（普通=5，本命=6）
  locked: true,                          // 固定槽，不可替换
};
```

关键规则：
- 本命槽**固定**，随角色创建即确定，不可学习其他技能替换。
- 初始 `level = 1`（开局即拥有 1 级本命技）。
- 上限 `maxLevel = 普通技能上限(5) + 1 = 6`。
- 升级三选一时，本命技能**始终出现在候选池**（或独立显示），直到达到 `maxLevel`。

> 现状：`RACES.*.racialSkillId` 已存在，`main.js` 的 `startFight` 里已 `learnSkill(racialSkillId)` 赋予 1 级。本次把它**显式建模为本命槽**，并让 `getMaxSkillLevel` 对本命技返回 6（普通 5）。与现有 `affinitySkills`（共鸣突破 Lv6）语义合并统一。

---

## 4. 需求四：视觉解耦 + 阶段演化

### 4.1 UI 主题配置中心

新建 `js/ui/ThemeManager.js`，集中管理配色/风格，替换散落各文件的硬编码颜色：

```js
export const THEMES = {
  cute: {   // 可爱风格（当前默认）
    id: 'cute',
    bg: '#262038',
    primary: '#ff7a7a',
    accent: '#ffd66b',
    font: "'PingFang SC', sans-serif",
    rounded: 18,           // 圆角半径
    particleShape: 'star', // 粒子形状：star/bubble/circle
    // ... 完整色板（HUD/卡牌/结算/按钮）
  },
  dark: {   // 暗黑风格
    id: 'dark',
    bg: '#0b0c10',
    primary: '#c0392b',
    accent: '#f1c40f',
    font: "'PingFang SC', sans-serif",
    rounded: 6,
    particleShape: 'spark',
    // ...
  },
};

export default class ThemeManager extends TinyEmitter {
  constructor() { super(); this.current = THEMES.cute; }
  setTheme(id) { this.current = THEMES[id]; this.emit('theme:change', this.current); }
  get(key) { return this.current[key]; }
  getColor(key) { return this.current.colors[key]; }
}
```

> `GameUI` 渲染时不再直接写字面颜色，改为 `theme.getColor('primary')`。切换主题时 `theme:change` 事件触发重绘。

### 4.2 技能升级事件 + 特效预制体

新建 `js/effects/EffectLibrary.js`，作为特效预制体注册表：

```js
// 技能每次升级 → 抛事件 → 动态加载更高级特效预制体
export const EFFECT_PREFABS = {
  // key: `${skillId}@${level}`
  'fire_blast@1': { type: 'fireball', color: '#ff7a7a', particles: 'spark' },
  'fire_blast@5': { type: 'dragonRoar', color: '#ffd66b', particles: 'dragon' },  // 高级暗黑风预制体
  'fire_blast@6': { type: 'divineBurst', color: '#ffffff', particles: 'nova' },
  // ...
};

export class EffectLibrary {
  getPrefab(skillId, level) {
    return EFFECT_PREFABS[`${skillId}@${level}`]
      || EFFECT_PREFABS[`${skillId}@default`]
      || DEFAULT_PREFAB;
  }
}
```

**升级事件链路**（复用现有 `TinyEmitter`，全局 `EventBus`）：

```js
// js/base/eventBus.js —— 全局单例事件总线
import TinyEmitter from '../libs/tinyemitter';
export default new TinyEmitter();
```

```js
// SkillManager.learnSkill 里：
eventBus.emit('skill:levelup', { skillId, level: nextLvl, player });
// → EffectLibrary 监听，加载对应 level 的高级特效预制体
eventBus.on('skill:levelup', ({ skillId, level }) => {
  const prefab = EffectLibrary.getPrefab(skillId, level);
  skillManager.applyEffectPrefab(skillId, prefab);
});
```

### 4.3 角色阶段演化模型（每 10 级切模型）

严格按「`角色枚举 + 职业枚举`」组合键切换阶段模型：

```js
// 组合键：`${raceId}:${classId}`
// 阶段：stage1(1级) / stage2(10级) / stage3(20级) / stage4(30级) ...
export const MODEL_STAGES = {
  'chicken:warrior': {
    stage1: 'images/heroes/chicken.png',
    stage2: 'images/heroes/chicken_stage2.png',   // 热血漫画风
    stage3: 'images/heroes/chicken_stage3.png',
  },
  'chicken:holy_knight': { /* 不同职业 = 不同漫画风模型 */ },
  // ... 5 种族 × 6 职业 = 30 个组合，每个组合多阶段
};
```

```js
// Player.gainExp 里，level 跨过 10 的整数倍时：
const stage = Math.floor(this.level / 10) + 1;   // 10→2, 20→3
const modelKey = `${this.raceId}:${this.classId}`;
const modelPath = MODEL_STAGES[modelKey]?.[`stage${stage}`];
if (modelPath) {
  eventBus.emit('player:stagechange', { raceId, classId, stage, modelPath });
  // → 触发模型切换（热血漫画风贴图替换）
}
```

> 现状：已有 `getHeroEvolutionImage(raceId, level)` 按 level 切图（Lv1/3/5 三档）。本需求把它升级为**「种族×职业组合键 + 每 10 级一档」的精确阶段模型**，且阶段切换事件化。

---

## 5. 目录规划（新增/改动文件）

```
js/
├── base/
│   └── eventBus.js                    [新增] 全局事件总线（单例 TinyEmitter）
├── skills/
│   ├── SkillBase.js                   [新增] 技能基类（DoT/HoT/AoE/CC/施法/冷却抽象）
│   ├── SkillEligibility.js            [新增] 黑名单/本命槽统一校验入口
│   ├── ElementSynergyManager.js       [新增] 元素联动管理器
│   ├── skill_data.js                  [改造] 新增机制字段 + 新技能示例 + SYNERGY_RULES
│   └── skill_manager.js               [改造] 迁移硬编码逻辑到 SkillBase 子类/配置驱动
├── effects/
│   └── EffectLibrary.js               [新增] 特效预制体库（按 skillId@level 索引）
├── ui/
│   └── ThemeManager.js                [新增] UI 主题配置中心
├── player/
│   └── index.js                       [改造] 新增 innateSlot 本命槽 + 阶段模型切换
└── runtime/
    └── statusEffectManager.js         [新增] 统一 DoT/HoT/CC 状态管理器
```

---

## 6. 分阶段实施计划

| 阶段 | 内容 | 交付物 | 风险 |
|---|---|---|---|
| **P1** | 事件总线 + 技能基类 + 配置表字段扩展 | `eventBus.js`、`SkillBase.js`、`skill_data.js` 字段 | 低（纯新增，不动运行逻辑） |
| **P2** | 状态效果管理器 + 元素联动管理器 | `statusEffectManager.js`、`ElementSynergyManager.js` | 中（需接入 damage 链路） |
| **P3** | 黑名单统一 + 本命槽 | `SkillEligibility.js`、`Player.innateSlot` | 低 |
| **P4** | UI 主题中心 + 特效预制体 + 阶段模型 | `ThemeManager.js`、`EffectLibrary.js`、阶段切换 | 中（涉及渲染层） |
| **P5** | 迁移 skill_manager 硬编码到配置驱动 | 重构 `skill_manager.js` | 高（核心逻辑，需充分回归测试） |

---

## 7. 决策点（已全部确认 2026-11-02）

1. **"水+火"减弱语义**：✅ 打怪伤害降低 → `damageMul: 0.85`（全局 -15%）。
2. **阶段模型素材**：✅ 现有动物图做占位（不重新 AI 生成漫画风贴图，先复用现有 hero 图按阶段切换）。
3. **本命槽升级方式**：✅ 混在随机三选一里（本命技能作为普通候选参与随机抽取，不设独立入口）。
4. **施法读条打断**：✅ 怪物攻击**不打断**读条（读条不可被受击打断）。

---

> 本文档已根据确认结果固化。按 P1→P5 顺序实施。

---

## 8. 实施进度记录（2026-11-02）

### 已完成

| 阶段 | 状态 | 交付物 |
|---|---|---|
| P1 事件总线+基类+字段 | ✅ | `js/base/eventBus.js`、`js/skills/SkillBase.js`、`skill_data.js` 新增 `SYNERGY_RULES`/`SKILL_EXAMPLES` |
| P2 状态管理器+元素联动 | ✅ | `js/runtime/statusEffectManager.js`、`js/skills/ElementSynergyManager.js` |
| P3 黑名单+本命槽 | ✅ | `js/skills/SkillEligibility.js`、`Player.innateSlot`、`CLASSES.holy_knight.forbiddenSkills` |
| P4 主题+特效+阶段 | ✅ | `js/ui/ThemeManager.js`、`js/effects/EffectLibrary.js`、`js/player/modelStage.js` |
| P5 运行时接入 | ✅（架构接入） | `main.js` 接入元素联动（伤害×倍率）与状态管理器（每帧 tick）；`skill_manager.js` 抛 `skill:levelup` 事件；`player/index.js` 抛 `player:levelup`/`player:stagechange` |

### 运行时接入点

- **元素联动生效**：`main.js` 的 `onEnemyDamage()` 里 `damage = baseDamage × synergy.damageMul`，实时根据已学技能卡组计算。
- **状态效果生效**：`main.js` 的 `update()` 里 `statusEffects.update()` 每帧驱动 DoT/HoT/CC tick。
- **技能升级事件**：`SkillManager.learnSkill()` 抛 `skill:levelup`，`EffectLibrary.bindLevelUpEvents()` 可监听加载高级特效。
- **阶段切换事件**：`Player.gainExp()` 每逢 10 级抛 `player:stagechange`（按种族×职业组合键解析模型）。

### 遗留（后续独立迭代）

1. **`skill_manager.js` 的 2000+ 行硬编码技能逻辑尚未重写为 `SkillBase` 子类**。当前策略是「架构层 + 运行时接入」已完成，把每个技能逐个迁移为 `SkillBase` 子类是高风险的大工程，建议作为独立迭代分批进行。
2. **`SKILL_EXAMPLES` 示例技能尚未进入三选一**（只有配置，缺渲染/碰撞逻辑）。它们用于展示「配置驱动」用法，接入需补齐对应 `SkillBase` 子类。
3. **元素联动规则叠加**：多规则同时命中会乘法叠加（如「火+雷+风」会同时触发「火+风」×1.15 和「火+雷+风」×1.35 = ×1.55）。这是设计特性，如需上限需在 `ElementSynergyManager` 加 `maxMul` 钳制。

### 验证结果

- 全部 JS 文件通过 `node --check` 语法校验。
- 元素联动算法验证通过（火+水=0.85、火+风=1.15）。
- 无循环依赖（`skill_data.js` 为纯数据，单向被引用）。
- 全部新文件遵循项目现有 import 风格（不带 `.js` 后缀，小游戏构建器解析）。
