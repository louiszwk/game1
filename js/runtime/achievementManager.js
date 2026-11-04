/**
 * 成就管理器 (Achievement Manager) —— 持久化与成就系统
 *
 * 【需求 F】
 * 1. 通过事件总线静默监听玩家行为（累计击杀、满级本命技能次数、累计升级次数等），
 *    达成阈值即解锁成就，无需玩家主动操作。
 * 2. 支持本地数据保存 / 读取（wx.setStorageSync / getStorageSync，浏览器 localStorage 降级）。
 * 3. 解锁持久化奖励，提升重玩价值。
 *
 * 监听事件（eventBus）：
 *   - enemy:killed       累计击杀  → 触发「百人斩」「千人斩」等
 *   - skill:levelup      技能升级  → 统计满级本命技能次数
 *   - player:levelup     角色升级  → 累计升级次数
 *   - player:stagechange 阶段演化  → 神力光效阶段成就
 *
 * 成就定义见 ACHIEVEMENTS 配置表，含奖励（可扩展为属性加成/解锁内容）。
 */
import eventBus from '../base/eventBus';

let instance;

// 本地存储键
const STORAGE_KEY = 'animal_vs_alien_achievements_v1';

/**
 * 成就定义配置表
 * 每个成就：id / 名称 / 描述 / 达成条件（metric 指标 + target 阈值）/ 奖励
 *
 * 分类：
 *   - combat  战斗杀敌（累计击杀）
 *   - growth  成长（满级技能 / 等级 / 阶段）
 *   - victory 通关（击败最终 Boss / 通关次数）
 *   - build   搭配（元素联动 / 满级技能数量）
 *   - mastery 全图鉴（职业 / 种族体验）
 */
export const ACHIEVEMENTS = [
  // ===== 战斗杀敌 =====
  {
    id: 'kills_100',
    name: '百人斩',
    desc: '累计击杀 100 只外星怪',
    category: 'combat',
    metric: 'totalKills',
    target: 100,
    reward: { type: 'scoreBonus', value: 1000 },
  },
  {
    id: 'kills_1000',
    name: '千人斩',
    desc: '累计击杀 1000 只外星怪',
    category: 'combat',
    metric: 'totalKills',
    target: 1000,
    reward: { type: 'scoreBonus', value: 10000 },
  },
  {
    id: 'kills_5000',
    name: '屠戮者',
    desc: '累计击杀 5000 只外星怪',
    category: 'combat',
    metric: 'totalKills',
    target: 5000,
    reward: { type: 'scoreBonus', value: 50000 },
  },

  // ===== 成长 =====
  {
    id: 'innate_max_1',
    name: '天命初醒',
    desc: '首次将本命技能升至满级',
    category: 'growth',
    metric: 'innateMaxCount',
    target: 1,
    reward: { type: 'scoreBonus', value: 3000 },
  },
  {
    id: 'innate_max_5',
    name: '血脉共鸣',
    desc: '累计 5 次将本命技能升至满级',
    category: 'growth',
    metric: 'innateMaxCount',
    target: 5,
    reward: { type: 'scoreBonus', value: 15000 },
  },
  {
    id: 'level_20',
    name: '成熟之路',
    desc: '单局角色等级达到 20 级（成熟阶段）',
    category: 'growth',
    metric: 'maxLevelReached',
    target: 20,
    reward: { type: 'scoreBonus', value: 2000 },
  },
  {
    id: 'level_40',
    name: '神力觉醒',
    desc: '单局角色等级达到 40 级（神力光效阶段）',
    category: 'growth',
    metric: 'maxLevelReached',
    target: 40,
    reward: { type: 'scoreBonus', value: 8000 },
  },
  {
    id: 'stage_5',
    name: '神话临世',
    desc: '触发神力光效阶段演化（第 5 阶段）',
    category: 'growth',
    metric: 'maxStageReached',
    target: 5,
    reward: { type: 'scoreBonus', value: 10000 },
  },

  // ===== 通关 =====
  {
    id: 'victory_first',
    name: '地球守护者',
    desc: '首次击败最终 Boss「母巢主脑·泽拉斯」通关',
    category: 'victory',
    metric: 'victoryCount',
    target: 1,
    reward: { type: 'scoreBonus', value: 20000 },
  },
  {
    id: 'victory_5',
    name: '星际战神',
    desc: '累计通关 5 次',
    category: 'victory',
    metric: 'victoryCount',
    target: 5,
    reward: { type: 'scoreBonus', value: 50000 },
  },

  // ===== 单局击杀（会话内） =====
  {
    id: 'run_kills_200',
    name: '割草机',
    desc: '单局击杀 200 只外星怪',
    category: 'combat',
    metric: 'runKills',
    target: 200,
    reward: { type: 'scoreBonus', value: 3000 },
  },
  {
    id: 'run_kills_500',
    name: '无双乱舞',
    desc: '单局击杀 500 只外星怪',
    category: 'combat',
    metric: 'runKills',
    target: 500,
    reward: { type: 'scoreBonus', value: 8000 },
  },

  // ===== 搭配（build） =====
  {
    id: 'synergy_buff',
    name: '元素共鸣',
    desc: '触发一次元素联动增益（如风助火势）',
    category: 'build',
    metric: 'synergyBuffCount',
    target: 1,
    reward: { type: 'scoreBonus', value: 1500 },
  },
  {
    id: 'max_skill_3',
    name: '绝学大师',
    desc: '单局将 3 门技能升至满级',
    category: 'build',
    metric: 'runMaxSkillCount',
    target: 3,
    reward: { type: 'scoreBonus', value: 5000 },
  },
  {
    id: 'max_skill_6',
    name: '万法归一',
    desc: '单局将 6 门技能升至满级',
    category: 'build',
    metric: 'runMaxSkillCount',
    target: 6,
    reward: { type: 'scoreBonus', value: 12000 },
  },

  // ===== 全图鉴 =====
  {
    id: 'class_3',
    name: '多面手',
    desc: '使用过 3 种不同职业',
    category: 'mastery',
    metric: 'classesPlayed',
    target: 3,
    reward: { type: 'scoreBonus', value: 3000 },
  },
  {
    id: 'class_6',
    name: '全能战神',
    desc: '使用过全部 6 种职业',
    category: 'mastery',
    metric: 'classesPlayed',
    target: 6,
    reward: { type: 'scoreBonus', value: 10000 },
  },
  {
    id: 'race_5',
    name: '万兽之王',
    desc: '使用过全部 5 大种族',
    category: 'mastery',
    metric: 'racesPlayed',
    target: 5,
    reward: { type: 'scoreBonus', value: 10000 },
  },
];

export default class AchievementManager {
  constructor() {
    if (instance) return instance;
    instance = this;

    // 运行时累计指标（本次会话）
    this.metrics = {
      // 跨局持久化指标
      totalKills: 0,        // 累计击杀（跨局）
      innateMaxCount: 0,    // 满级本命技能次数（跨局）
      victoryCount: 0,      // 通关次数（跨局）
      classesPlayed: 0,     // 使用过的不同职业数（跨局，去重）
      racesPlayed: 0,       // 使用过的不同种族数（跨局，去重）
      _classSet: [],        // 已使用职业集合（持久化辅助）
      _raceSet: [],         // 已使用种族集合（持久化辅助）
      // 单局会话指标（resetSession 清零）
      maxLevelReached: 0,   // 单局最高等级
      maxStageReached: 0,   // 单局最高阶段
      runKills: 0,          // 单局击杀数
      runMaxSkillCount: 0,  // 单局满级技能数
      synergyBuffCount: 0,  // 单局触发元素联动增益次数
    };

    // 已解锁成就 ID 集合
    this.unlocked = new Set();

    this._lastSaveTime = 0;
    this._saveTimer = null;

    // 加载本地持久化数据
    this.load();

    // 绑定事件监听
    this._bindEvents();
  }

  /**
   * 本地存储适配：优先微信小游戏，浏览器降级 localStorage
   */
  _storageGet(key) {
    try {
      if (typeof wx !== 'undefined' && wx.getStorageSync) {
        return wx.getStorageSync(key);
      }
      if (typeof localStorage !== 'undefined') {
        const v = localStorage.getItem(key);
        return v ? JSON.parse(v) : null;
      }
    } catch (e) {}
    return null;
  }

  _storageSet(key, value) {
    try {
      if (typeof wx !== 'undefined' && wx.setStorageSync) {
        wx.setStorageSync(key, value);
        return;
      }
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, JSON.stringify(value));
      }
    } catch (e) {}
  }

  /**
   * 加载本地持久化数据
   */
  load() {
    const saved = this._storageGet(STORAGE_KEY);
    if (saved) {
      // 恢复跨局累计指标
      if (typeof saved.totalKills === 'number') this.metrics.totalKills = saved.totalKills;
      if (typeof saved.innateMaxCount === 'number') this.metrics.innateMaxCount = saved.innateMaxCount;
      if (typeof saved.victoryCount === 'number') this.metrics.victoryCount = saved.victoryCount;
      if (typeof saved.classesPlayed === 'number') this.metrics.classesPlayed = saved.classesPlayed;
      if (typeof saved.racesPlayed === 'number') this.metrics.racesPlayed = saved.racesPlayed;
      if (Array.isArray(saved._classSet)) this.metrics._classSet = saved._classSet;
      if (Array.isArray(saved._raceSet)) this.metrics._raceSet = saved._raceSet;
      // 恢复已解锁成就
      if (Array.isArray(saved.unlocked)) {
        saved.unlocked.forEach((id) => this.unlocked.add(id));
      }
    }
  }

  /**
   * 保存本地持久化数据（累计击杀 / 满级次数 / 通关次数 / 图鉴 / 已解锁成就）
   */
  save() {
    this._storageSet(STORAGE_KEY, {
      totalKills: this.metrics.totalKills,
      innateMaxCount: this.metrics.innateMaxCount,
      victoryCount: this.metrics.victoryCount,
      classesPlayed: this.metrics.classesPlayed,
      racesPlayed: this.metrics.racesPlayed,
      _classSet: this.metrics._classSet,
      _raceSet: this.metrics._raceSet,
      unlocked: Array.from(this.unlocked),
    });
  }

  /**
   * 节流存盘：高频击杀时避免频繁同步写入闪存造成发热掉帧
   */
  saveThrottled() {
    const now = Date.now();
    if (!this._lastSaveTime || now - this._lastSaveTime > 4000) {
      this._lastSaveTime = now;
      this.save();
    } else if (!this._saveTimer) {
      this._saveTimer = setTimeout(() => {
        this._saveTimer = null;
        this._lastSaveTime = Date.now();
        this.save();
      }, 4000);
    }
  }

  /**
   * 记录一次击杀（静默累计 + 检查成就）
   */
  recordKill() {
    this.metrics.totalKills++;
    this.metrics.runKills++;
    this._checkAll();
    this.saveThrottled();
  }

  /**
   * 记录一次满级本命技能（静默累计 + 检查成就）
   */
  recordInnateMax() {
    this.metrics.innateMaxCount++;
    this._checkAll();
    this.save();
  }

  /**
   * 记录一次通关胜利（跨局累计 + 检查成就）
   */
  recordVictory() {
    this.metrics.victoryCount++;
    this._checkAll();
    this.save();
  }

  /**
   * 记录单局满级技能数量（用于 build 成就）
   */
  updateRunMaxSkillCount(count) {
    if (count > this.metrics.runMaxSkillCount) {
      this.metrics.runMaxSkillCount = count;
      this._checkAll();
    }
  }

  /**
   * 记录一次元素联动增益触发（build 成就）
   */
  recordSynergyBuff() {
    this.metrics.synergyBuffCount++;
    this._checkAll();
  }

  /**
   * 记录使用过的职业（图鉴成就，去重）
   */
  recordClassUsed(classId) {
    if (!classId || this.metrics._classSet.indexOf(classId) !== -1) return;
    this.metrics._classSet.push(classId);
    this.metrics.classesPlayed = this.metrics._classSet.length;
    this._checkAll();
    this.save();
  }

  /**
   * 记录使用过的种族（图鉴成就，去重）
   */
  recordRaceUsed(raceId) {
    if (!raceId || this.metrics._raceSet.indexOf(raceId) !== -1) return;
    this.metrics._raceSet.push(raceId);
    this.metrics.racesPlayed = this.metrics._raceSet.length;
    this._checkAll();
    this.save();
  }

  /**
   * 更新单局最高等级（会话内，不持久化）
   */
  updateMaxLevel(level) {
    if (level > this.metrics.maxLevelReached) {
      this.metrics.maxLevelReached = level;
      this._checkAll();
    }
  }

  /**
   * 更新单局最高阶段（会话内）
   */
  updateMaxStage(stage) {
    if (stage > this.metrics.maxStageReached) {
      this.metrics.maxStageReached = stage;
      this._checkAll();
    }
  }

  /**
   * 检查所有成就是否达成
   */
  _checkAll() {
    for (const ach of ACHIEVEMENTS) {
      if (this.unlocked.has(ach.id)) continue; // 已解锁跳过
      const value = this.metrics[ach.metric];
      if (typeof value === 'number' && value >= ach.target) {
        this._unlock(ach);
      }
    }
  }

  /**
   * 解锁成就
   */
  _unlock(ach) {
    this.unlocked.add(ach.id);
    // 抛出成就解锁事件（供 UI 弹窗 / 音频等消费）
    try {
      eventBus.emit('achievement:unlock', {
        id: ach.id,
        name: ach.name,
        desc: ach.desc,
        reward: ach.reward,
      });
    } catch (e) {}
    this.save();
  }

  /**
   * 查询某成就是否已解锁
   */
  isUnlocked(id) {
    return this.unlocked.has(id);
  }

  /**
   * 获取所有已解锁成就
   */
  getUnlocked() {
    return ACHIEVEMENTS.filter((a) => this.unlocked.has(a.id));
  }

  /**
   * 获取累计总奖励（积分加成）
   */
  getTotalScoreBonus() {
    let total = 0;
    for (const a of this.getUnlocked()) {
      if (a.reward && a.reward.type === 'scoreBonus') {
        total += a.reward.value;
      }
    }
    return total;
  }

  /**
   * 重置单局会话指标（新一局开始时调用，保留跨局持久化指标）
   */
  resetSession() {
    if (this._saveTimer) { clearTimeout(this._saveTimer); this._saveTimer = null; this.save(); }
    this.metrics.maxLevelReached = 0;
    this.metrics.maxStageReached = 0;
    this.metrics.runKills = 0;
    this.metrics.runMaxSkillCount = 0;
    this.metrics.synergyBuffCount = 0;
  }

  /**
   * 获取所有成就（含解锁状态与当前进度，供成就查看 UI 使用）
   */
  getAchievements() {
    return ACHIEVEMENTS.map((a) => {
      const value = this.metrics[a.metric] || 0;
      return {
        ...a,
        unlocked: this.unlocked.has(a.id),
        current: value,
        progress: Math.min(1, value / a.target),
      };
    });
  }

  /**
   * 获取成就总览统计
   */
  getStats() {
    return {
      total: ACHIEVEMENTS.length,
      unlockedCount: this.unlocked.size,
    };
  }

  /**
   * 绑定事件总线监听（静默监听玩家行为）
   */
  _bindEvents() {
    // 累计击杀（enemy:killed）
    try {
      eventBus.on('enemy:killed', () => {
        this.recordKill();
      });
    } catch (e) {}

    // 满级本命技能（skill:innatemax）
    try {
      eventBus.on('skill:innatemax', () => {
        this.recordInnateMax();
      });
    } catch (e) {}

    // 通关胜利（game:victory）
    try {
      eventBus.on('game:victory', () => {
        this.recordVictory();
      });
    } catch (e) {}

    // 元素联动增益触发（synergy:buff）
    try {
      eventBus.on('synergy:buff', () => {
        this.recordSynergyBuff();
      });
    } catch (e) {}

    // 单局满级技能数量（skill:maxcount）
    try {
      eventBus.on('skill:maxcount', ({ count }) => {
        this.updateRunMaxSkillCount(count);
      });
    } catch (e) {}

    // 角色升级
    try {
      eventBus.on('player:levelup', ({ level }) => {
        this.updateMaxLevel(level);
      });
    } catch (e) {}

    // 阶段演化
    try {
      eventBus.on('player:stagechange', ({ stage }) => {
        this.updateMaxStage(stage);
      });
    } catch (e) {}
  }
}
