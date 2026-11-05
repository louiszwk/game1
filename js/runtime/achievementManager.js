/**
 * 成就管理器 (Achievement Manager) —— v2.0 云端用户体系与全域成就系统
 *
 * 【需求 2.0 —— 云端用户体系 + 成就持久化 + 奖励闭环 + 40+ 全品类成就】
 * 1. 静默监听玩家全维度战斗行为（击杀、技能、装备、连携、通关、速通）。
 * 2. 6 大分类体系：战斗杀敌、成长之路、通关征服、构筑大师、全图鉴、装备收藏。
 * 3. 本地与微信云数据库双向融合：秒级本地响应，异步增量上云，多端安全漫游。
 */

import eventBus from '../base/eventBus';
import UserManager from './userManager';

let instance;

// 本地存储键（保持 v1 键兼容，平滑迁移）
const STORAGE_KEY = 'animal_vs_alien_achievements_v1';

/**
 * 6 大分类元数据
 */
export const ACHIEVEMENT_CATEGORIES = [
  { key: 'all', name: '全部', icon: '🏆' },
  { key: 'combat', name: '战斗', icon: '⚔️' },
  { key: 'growth', name: '成长', icon: '🌱' },
  { key: 'victory', name: '通关', icon: '👑' },
  { key: 'build', name: '构筑', icon: '🔮' },
  { key: 'mastery', name: '图鉴', icon: '📖' },
  { key: 'equipment', name: '装备', icon: '🛡️' },
];

/**
 * 40+ 全量成就配置清单
 */
export const ACHIEVEMENTS = [
  // ===================== 1. 战斗杀敌 (combat) =====================
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
  {
    id: 'kills_10000',
    name: '屠神至尊',
    desc: '累计击杀 10000 只外星大军',
    category: 'combat',
    metric: 'totalKills',
    target: 10000,
    reward: { type: 'title', value: '星界屠神' },
  },
  {
    id: 'run_kills_200',
    name: '无情割草机',
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
  {
    id: 'crit_kill',
    name: '一击必杀',
    desc: '单次暴击命中造成 500+ 点伤害',
    category: 'combat',
    metric: 'maxSingleHit',
    target: 500,
    reward: { type: 'scoreBonus', value: 5000 },
  },
  {
    id: 'combat_nuke',
    name: '毁天灭地',
    desc: '单次暴击命中伤害突破 10000 点',
    category: 'combat',
    metric: 'maxSingleHit',
    target: 10000,
    reward: { type: 'title', value: '毁灭先锋' },
  },
  {
    id: 'boss_slayer',
    name: '母巢猎手',
    desc: '累计消灭 10 只母巢领主 Boss',
    category: 'combat',
    metric: 'bossKillCount',
    target: 10,
    reward: { type: 'title', value: '斩首使' },
  },
  {
    id: 'elite_kill_50',
    name: '精英克星',
    desc: '累计击杀 50 只强力精英外星生物',
    category: 'combat',
    metric: 'eliteKillCount',
    target: 50,
    reward: { type: 'scoreBonus', value: 12000 },
  },
  {
    id: 'boss_no_hit',
    name: '无伤弑神',
    desc: '击杀任意 Boss 期间未受到任何伤害',
    category: 'combat',
    metric: 'bossNoHitCount',
    target: 1,
    reward: { type: 'title', value: '幻影身法' },
  },

  // ===================== 2. 成长之路 (growth) =====================
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
    id: 'innate_6',
    name: '天命极境',
    desc: '本命技能成功突破至 Lv.6 神话极境',
    category: 'growth',
    metric: 'innateLv6Count',
    target: 1,
    reward: { type: 'title', value: '极境至尊' },
  },
  {
    id: 'level_20',
    name: '成熟之路',
    desc: '单局角色等级达到 20 级',
    category: 'growth',
    metric: 'maxLevelReached',
    target: 20,
    reward: { type: 'scoreBonus', value: 2000 },
  },
  {
    id: 'level_40',
    name: '神力觉醒',
    desc: '单局角色等级达到 40 级',
    category: 'growth',
    metric: 'maxLevelReached',
    target: 40,
    reward: { type: 'scoreBonus', value: 8000 },
  },
  {
    id: 'stage_5',
    name: '神话临世',
    desc: '触发角色神力光效阶段演化（第 5 阶段）',
    category: 'growth',
    metric: 'maxStageReached',
    target: 5,
    reward: { type: 'scoreBonus', value: 10000 },
  },
  {
    id: 'level_50',
    name: '超凡入圣',
    desc: '单局角色等级达到 50 级',
    category: 'growth',
    metric: 'maxLevelReached',
    target: 50,
    reward: { type: 'title', value: '绝世强者' },
  },
  {
    id: 'level_60',
    name: '至尊天神',
    desc: '单局角色等级达到 60 级满级极境',
    category: 'growth',
    metric: 'maxLevelReached',
    target: 60,
    reward: { type: 'title', value: '至尊天神' },
  },
  {
    id: 'stage_7',
    name: '天神下凡',
    desc: '触发角色至尊天神终极演化（第 7 阶段）',
    category: 'growth',
    metric: 'maxStageReached',
    target: 7,
    reward: { type: 'scoreBonus', value: 20000 },
  },

  // ===================== 3. 通关征服 (victory) =====================
  {
    id: 'victory_first',
    name: '地球守护者',
    desc: '首次击败最终 Boss「深渊大恶魔·玛洛诺斯」通关',
    category: 'victory',
    metric: 'victoryCount',
    target: 1,
    reward: { type: 'title', value: '地球救星' },
  },
  {
    id: 'victory_5',
    name: '星际战神',
    desc: '累计击溃深渊大恶魔通关 5 次',
    category: 'victory',
    metric: 'victoryCount',
    target: 5,
    reward: { type: 'scoreBonus', value: 50000 },
  },
  {
    id: 'victory_10',
    name: '星际不灭传说',
    desc: '累计通关 10 次，成为银河传奇',
    category: 'victory',
    metric: 'victoryCount',
    target: 10,
    reward: { type: 'title', value: '不灭星魂' },
  },
  {
    id: 'speed_run',
    name: '光速破阵',
    desc: '在 8 分钟（480秒）内极速通关游戏',
    category: 'victory',
    metric: 'bestClearTimeRecord',
    target: 1, // 达成标志
    reward: { type: 'title', value: '极光闪电' },
  },
  {
    id: 'low_build_win',
    name: '极限苦修者',
    desc: '仅修习 3 门主动技能赢得最终决战胜利',
    category: 'victory',
    metric: 'lowBuildWinCount',
    target: 1,
    reward: { type: 'title', value: '苦修宗师' },
  },

  // ===================== 4. 构筑大师 (build) =====================
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
    id: 'triple_synergy',
    name: '羁绊宗师',
    desc: '单局同时激活 3 组五行元素联动增益',
    category: 'build',
    metric: 'maxActiveSynergy',
    target: 3,
    reward: { type: 'scoreBonus', value: 8000 },
  },
  {
    id: 'full_element',
    name: '五行圆满',
    desc: '单局技能与装备集齐 5 种不同自然属性',
    category: 'build',
    metric: 'maxElementCount',
    target: 5,
    reward: { type: 'title', value: '五行造物主' },
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
    desc: '单局将 6 门技能全部升至满级',
    category: 'build',
    metric: 'runMaxSkillCount',
    target: 6,
    reward: { type: 'scoreBonus', value: 12000 },
  },
  {
    id: 'ultra_first',
    name: '超武出世',
    desc: '首次将技能突破演变为全屏超武形态',
    category: 'build',
    metric: 'ultraCount',
    target: 1,
    reward: { type: 'scoreBonus', value: 6000 },
  },

  // ===================== 5. 全图鉴 (mastery) =====================
  {
    id: 'class_3',
    name: '多面手',
    desc: '体验使用过 3 种不同职业',
    category: 'mastery',
    metric: 'classesPlayed',
    target: 3,
    reward: { type: 'scoreBonus', value: 3000 },
  },
  {
    id: 'class_6',
    name: '全能战神',
    desc: '体验使用过全部 6 种职业',
    category: 'mastery',
    metric: 'classesPlayed',
    target: 6,
    reward: { type: 'title', value: '战阵宗师' },
  },
  {
    id: 'race_5',
    name: '万兽之王',
    desc: '体验使用过全部 5 大动物种族',
    category: 'mastery',
    metric: 'racesPlayed',
    target: 5,
    reward: { type: 'title', value: '万兽领主' },
  },
  {
    id: 'all_class_win',
    name: '全职业制霸',
    desc: '使用全部 6 种职业分别通关 1 次',
    category: 'mastery',
    metric: 'classWinCount',
    target: 6,
    reward: { type: 'title', value: '六道霸主' },
  },
  {
    id: 'all_race_win',
    name: '全种族制霸',
    desc: '使用全部 5 种动物种族分别通关 1 次',
    category: 'mastery',
    metric: 'raceWinCount',
    target: 5,
    reward: { type: 'title', value: '百兽天尊' },
  },
  {
    id: 'combo_30',
    name: '组合大师',
    desc: '体验过 20 种以上动物种族与职业组合',
    category: 'mastery',
    metric: 'comboCount',
    target: 20,
    reward: { type: 'scoreBonus', value: 20000 },
  },

  // ===================== 6. 装备收藏 (equipment) =====================
  {
    id: 'equip_first',
    name: '初得神兵',
    desc: '首次在战场上拾取并穿戴一件装备',
    category: 'equipment',
    metric: 'equipCount',
    target: 1,
    reward: { type: 'scoreBonus', value: 1000 },
  },
  {
    id: 'equip_20',
    name: '移动军火库',
    desc: '累计拾取并装备 20 件战利品',
    category: 'equipment',
    metric: 'equipCount',
    target: 20,
    reward: { type: 'scoreBonus', value: 5000 },
  },
  {
    id: 'equip_50',
    name: '武装整备',
    desc: '累计拾取并装备 50 件战利品',
    category: 'equipment',
    metric: 'equipCount',
    target: 50,
    reward: { type: 'scoreBonus', value: 8000 },
  },
  {
    id: 'equip_100',
    name: '百炼成钢',
    desc: '累计拾取并装备 100 件战利品',
    category: 'equipment',
    metric: 'equipCount',
    target: 100,
    reward: { type: 'title', value: '武装大师' },
  },
  {
    id: 'epic_first',
    name: '史诗降临',
    desc: '首次斩获一件紫色史诗级装备',
    category: 'equipment',
    metric: 'epicCount',
    target: 1,
    reward: { type: 'scoreBonus', value: 4000 },
  },
  {
    id: 'legendary_first',
    name: '传说问世',
    desc: '击败首领或天命爆发，首次斩获金色传说神装',
    category: 'equipment',
    metric: 'legendaryCount',
    target: 1,
    reward: { type: 'title', value: '天命神选' },
  },
  {
    id: 'legendary_5',
    name: '传说猎手',
    desc: '累计获得过 5 件传说级神装',
    category: 'equipment',
    metric: 'legendaryCount',
    target: 5,
    reward: { type: 'title', value: '神装收藏家' },
  },
  {
    id: 'full_epic',
    name: '璀璨武装',
    desc: '单局全身 16 个部位全部达成史诗及以上品质',
    category: 'equipment',
    metric: 'maxEpicSlots',
    target: 16,
    reward: { type: 'title', value: '金光披甲' },
  },
];

export default class AchievementManager {
  constructor() {
    if (instance) return instance;
    instance = this;

    this.userManager = new UserManager();

    // 跨局与单局指标集
    this.metrics = {
      // 跨局持久化指标
      totalKills: 0,
      innateMaxCount: 0,
      victoryCount: 0,
      classesPlayed: 0,
      racesPlayed: 0,
      comboCount: 0,
      equipCount: 0,
      epicCount: 0,
      legendaryCount: 0,
      eliteKillCount: 0,
      bossKillCount: 0,
      bossNoHitCount: 0,
      innateLv6Count: 0,
      ultraCount: 0,
      lowBuildWinCount: 0,
      bestClearTimeRecord: 0,
      bestClearSeconds: 9999, // 最快通关秒数
      classWinCount: 0,
      raceWinCount: 0,
      _classSet: [],
      _raceSet: [],
      _comboSet: [],
      _classWinSet: [],
      _raceWinSet: [],

      // 单局会话指标（新开战清零）
      runKills: 0,
      maxLevelReached: 0,
      maxStageReached: 0,
      runMaxSkillCount: 0,
      synergyBuffCount: 0,
      maxSingleHit: 0,
      maxElementCount: 0,
      maxActiveSynergy: 0,
      maxEpicSlots: 0,
      playerHitDuringBoss: false,
    };

    // 已解锁成就 ID 集合
    this.unlocked = new Set();

    this._lastSaveTime = 0;
    this._saveTimer = null;

    // 1. 本地读取
    this.load();

    // 2. 尝试从云数据库拉取
    this.syncFromCloud();

    // 3. 注册事件监听
    this._bindEvents();
  }

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
   * 加载本地数据
   */
  load() {
    const saved = this._storageGet(STORAGE_KEY);
    if (saved && typeof saved === 'object') {
      const numKeys = [
        'totalKills', 'innateMaxCount', 'victoryCount', 'classesPlayed', 'racesPlayed',
        'comboCount', 'equipCount', 'epicCount', 'legendaryCount', 'eliteKillCount',
        'bossKillCount', 'bossNoHitCount', 'innateLv6Count', 'ultraCount', 'lowBuildWinCount',
        'bestClearTimeRecord', 'bestClearSeconds', 'classWinCount', 'raceWinCount'
      ];
      numKeys.forEach((k) => {
        if (typeof saved[k] === 'number') this.metrics[k] = saved[k];
      });

      const arrKeys = ['_classSet', '_raceSet', '_comboSet', '_classWinSet', '_raceWinSet'];
      arrKeys.forEach((k) => {
        if (Array.isArray(saved[k])) this.metrics[k] = saved[k];
      });

      if (Array.isArray(saved.unlocked)) {
        saved.unlocked.forEach((id) => this.unlocked.add(id));
      }
    }
  }

  /**
   * 本地持久化保存
   */
  save() {
    this._storageSet(STORAGE_KEY, {
      totalKills: this.metrics.totalKills,
      innateMaxCount: this.metrics.innateMaxCount,
      victoryCount: this.metrics.victoryCount,
      classesPlayed: this.metrics.classesPlayed,
      racesPlayed: this.metrics.racesPlayed,
      comboCount: this.metrics.comboCount,
      equipCount: this.metrics.equipCount,
      epicCount: this.metrics.epicCount,
      legendaryCount: this.metrics.legendaryCount,
      eliteKillCount: this.metrics.eliteKillCount,
      bossKillCount: this.metrics.bossKillCount,
      bossNoHitCount: this.metrics.bossNoHitCount,
      innateLv6Count: this.metrics.innateLv6Count,
      ultraCount: this.metrics.ultraCount,
      lowBuildWinCount: this.metrics.lowBuildWinCount,
      bestClearTimeRecord: this.metrics.bestClearTimeRecord,
      bestClearSeconds: this.metrics.bestClearSeconds,
      classWinCount: this.metrics.classWinCount,
      raceWinCount: this.metrics.raceWinCount,
      _classSet: this.metrics._classSet,
      _raceSet: this.metrics._raceSet,
      _comboSet: this.metrics._comboSet,
      _classWinSet: this.metrics._classWinSet,
      _raceWinSet: this.metrics._raceWinSet,
      unlocked: Array.from(this.unlocked),
    });
  }

  /**
   * 节流写入本地与云端
   */
  saveThrottled() {
    const now = Date.now();
    if (!this._lastSaveTime || now - this._lastSaveTime > 3500) {
      this._lastSaveTime = now;
      this.save();
      this.saveCloudThrottled();
    } else if (!this._saveTimer) {
      this._saveTimer = setTimeout(() => {
        this._saveTimer = null;
        this._lastSaveTime = Date.now();
        this.save();
        this.saveCloudThrottled();
      }, 3500);
    }
  }

  /**
   * 云数据库异步同步（拉取并合并）
   */
  async syncFromCloud() {
    if (!this.userManager || !this.userManager.cloudReady || !this.userManager.cloudDb) {
      return;
    }
    try {
      const db = this.userManager.cloudDb;
      const res = await db.collection('achievements').limit(1).get();
      if (res && res.data && res.data.length > 0) {
        const cloudData = res.data[0];
        // 1. 合并已解锁成就列表
        if (Array.isArray(cloudData.unlocked)) {
          cloudData.unlocked.forEach((id) => this.unlocked.add(id));
        }
        // 2. 跨端取最大值合并指标
        if (cloudData.metrics) {
          const m = cloudData.metrics;
          for (const k in m) {
            if (typeof m[k] === 'number') {
              if (k === 'bestClearSeconds') {
                this.metrics[k] = Math.min(this.metrics[k] || 9999, m[k]);
              } else {
                this.metrics[k] = Math.max(this.metrics[k] || 0, m[k]);
              }
            } else if (Array.isArray(m[k])) {
              const merged = Array.from(new Set([...(this.metrics[k] || []), ...m[k]]));
              this.metrics[k] = merged;
            }
          }
        }
        this._checkAll();
        this.save();
      } else {
        // 云端无记录，首次写入成就主档
        await db.collection('achievements').add({
          data: {
            unlocked: Array.from(this.unlocked),
            metrics: this.metrics,
            updatedAt: db.serverDate ? db.serverDate() : new Date(),
          },
        });
      }
    } catch (e) {}
  }

  /**
   * 节流上传云端
   */
  saveCloudThrottled() {
    if (!this.userManager || !this.userManager.cloudReady || !this.userManager.cloudDb) {
      return;
    }
    if (this._cloudTimer) return;
    this._cloudTimer = setTimeout(() => {
      this._cloudTimer = null;
      this.flushCloud();
    }, 4000);
  }

  /**
   * 立即上传成就进度至云端
   */
  async flushCloud() {
    if (!this.userManager || !this.userManager.cloudReady || !this.userManager.cloudDb) {
      return;
    }
    try {
      const db = this.userManager.cloudDb;
      const updateData = {
        unlocked: Array.from(this.unlocked),
        metrics: {
          totalKills: this.metrics.totalKills,
          innateMaxCount: this.metrics.innateMaxCount,
          victoryCount: this.metrics.victoryCount,
          classesPlayed: this.metrics.classesPlayed,
          racesPlayed: this.metrics.racesPlayed,
          comboCount: this.metrics.comboCount,
          equipCount: this.metrics.equipCount,
          epicCount: this.metrics.epicCount,
          legendaryCount: this.metrics.legendaryCount,
          eliteKillCount: this.metrics.eliteKillCount,
          bossKillCount: this.metrics.bossKillCount,
          bossNoHitCount: this.metrics.bossNoHitCount,
          innateLv6Count: this.metrics.innateLv6Count,
          ultraCount: this.metrics.ultraCount,
          lowBuildWinCount: this.metrics.lowBuildWinCount,
          bestClearTimeRecord: this.metrics.bestClearTimeRecord,
          bestClearSeconds: this.metrics.bestClearSeconds,
          classWinCount: this.metrics.classWinCount,
          raceWinCount: this.metrics.raceWinCount,
          _classSet: this.metrics._classSet,
          _raceSet: this.metrics._raceSet,
          _comboSet: this.metrics._comboSet,
          _classWinSet: this.metrics._classWinSet,
          _raceWinSet: this.metrics._raceWinSet,
        },
        updatedAt: db.serverDate ? db.serverDate() : new Date(),
      };

      const res = await db.collection('achievements').where({}).update({ data: updateData });
      if (res && res.stats && res.stats.updated === 0) {
        await db.collection('achievements').add({ data: updateData });
      }
    } catch (e) {}
  }

  /**
   * 记录一次击杀
   */
  recordKill() {
    this.metrics.totalKills++;
    this.metrics.runKills++;
    this._checkAll();
    this.saveThrottled();
  }

  /**
   * 记录精英怪物被击杀
   */
  recordEliteKill() {
    this.metrics.eliteKillCount++;
    this._checkAll();
    this.saveThrottled();
  }

  /**
   * 记录 Boss 被击杀
   */
  recordBossKill(isNoHit = false) {
    this.metrics.bossKillCount = (this.metrics.bossKillCount || 0) + 1;
    if (isNoHit && !this.metrics.playerHitDuringBoss) {
      this.metrics.bossNoHitCount++;
    }
    this._checkAll();
    this.save();
    this.saveCloudThrottled();
  }

  /**
   * 记录玩家在打 Boss 时受伤
   */
  recordPlayerHitDuringBoss() {
    this.metrics.playerHitDuringBoss = true;
  }

  /**
   * 记录一次装备拾取或穿戴
   */
  recordEquipmentAcquired(item) {
    if (!item) return;
    this.metrics.equipCount++;
    const rank = (item.rarity && item.rarity.rank) ? item.rarity.rank : 1;
    if (rank >= 4) {
      this.metrics.epicCount++;
    }
    if (rank === 5) {
      this.metrics.legendaryCount++;
    }
    this._checkAll();
    this.saveThrottled();
  }

  /**
   * 更新当前已穿戴的史诗及以上装备槽位数
   */
  updateMaxEpicSlots(count) {
    if (count > this.metrics.maxEpicSlots) {
      this.metrics.maxEpicSlots = count;
      this._checkAll();
    }
  }

  /**
   * 记录单次暴击伤害
   */
  recordHitDamage(damage, isCrit = false) {
    if (isCrit && damage > this.metrics.maxSingleHit) {
      this.metrics.maxSingleHit = damage;
      this._checkAll();
    }
  }

  /**
   * 记录一次满级本命技能
   */
  recordInnateMax(level = 5) {
    this.metrics.innateMaxCount++;
    if (level >= 6) {
      this.metrics.innateLv6Count++;
      this.metrics.ultraCount++;
    }
    this._checkAll();
    this.save();
    this.saveCloudThrottled();
  }

  /**
   * 记录一次通关胜利
   */
  recordVictory(info = {}) {
    this.metrics.victoryCount++;

    const clearSeconds = Math.round(info.time || 0);
    if (clearSeconds > 0) {
      this.metrics.bestClearSeconds = Math.min(this.metrics.bestClearSeconds, clearSeconds);
      if (clearSeconds <= 480) {
        this.metrics.bestClearTimeRecord = 1; // 8 分钟内速通达成
      }
    }

    if (info.activeSkillsCount && info.activeSkillsCount <= 3) {
      this.metrics.lowBuildWinCount++;
    }

    if (info.classId && this.metrics._classWinSet.indexOf(info.classId) === -1) {
      this.metrics._classWinSet.push(info.classId);
      this.metrics.classWinCount = this.metrics._classWinSet.length;
    }

    if (info.raceId && this.metrics._raceWinSet.indexOf(info.raceId) === -1) {
      this.metrics._raceWinSet.push(info.raceId);
      this.metrics.raceWinCount = this.metrics._raceWinSet.length;
    }

    this._checkAll();
    this.save();
    this.flushCloud();

    if (this.userManager) {
      this.userManager.recordBattleFinished(clearSeconds);
    }
  }

  /**
   * 记录单局满级技能数量
   */
  updateRunMaxSkillCount(count) {
    if (count > this.metrics.runMaxSkillCount) {
      this.metrics.runMaxSkillCount = count;
      this._checkAll();
    }
  }

  /**
   * 记录元素联动与拥有元素种类数
   */
  updateElementMetrics(elementCount, activeSynergyCount) {
    let changed = false;
    if (elementCount > this.metrics.maxElementCount) {
      this.metrics.maxElementCount = elementCount;
      changed = true;
    }
    if (activeSynergyCount > this.metrics.maxActiveSynergy) {
      this.metrics.maxActiveSynergy = activeSynergyCount;
      changed = true;
    }
    if (changed) this._checkAll();
  }

  /**
   * 记录一次元素联动增益触发
   */
  recordSynergyBuff() {
    this.metrics.synergyBuffCount++;
    this._checkAll();
  }

  /**
   * 记录使用过的职业
   */
  recordClassUsed(classId) {
    if (!classId || this.metrics._classSet.indexOf(classId) !== -1) return;
    this.metrics._classSet.push(classId);
    this.metrics.classesPlayed = this.metrics._classSet.length;
    this._checkAll();
    this.save();
  }

  /**
   * 记录使用过的种族
   */
  recordRaceUsed(raceId) {
    if (!raceId || this.metrics._raceSet.indexOf(raceId) !== -1) return;
    this.metrics._raceSet.push(raceId);
    this.metrics.racesPlayed = this.metrics._raceSet.length;
    this._checkAll();
    this.save();
  }

  /**
   * 记录种族×职业组合
   */
  recordComboUsed(raceId, classId) {
    if (!raceId || !classId) return;
    const comboKey = `${raceId}_${classId}`;
    if (this.metrics._comboSet.indexOf(comboKey) === -1) {
      this.metrics._comboSet.push(comboKey);
      this.metrics.comboCount = this.metrics._comboSet.length;
      this._checkAll();
      this.save();
    }
  }

  /**
   * 更新单局最高等级
   */
  updateMaxLevel(level) {
    if (level > this.metrics.maxLevelReached) {
      this.metrics.maxLevelReached = level;
      this._checkAll();
    }
  }

  /**
   * 更新单局最高阶段
   */
  updateMaxStage(stage) {
    if (stage > this.metrics.maxStageReached) {
      this.metrics.maxStageReached = stage;
      this._checkAll();
    }
  }

  /**
   * 全面检查成就是否满足达成条件
   */
  _checkAll() {
    for (let i = 0; i < ACHIEVEMENTS.length; i++) {
      const ach = ACHIEVEMENTS[i];
      if (this.unlocked.has(ach.id)) continue;
      const val = this.metrics[ach.metric];
      if (typeof val === 'number' && val >= ach.target) {
        this._unlock(ach);
      }
    }
  }

  /**
   * 解锁成就
   */
  _unlock(ach) {
    this.unlocked.add(ach.id);
    this.save();
    this.saveCloudThrottled();

    // 抛出全网成就广播事件
    try {
      eventBus.emit('achievement:unlock', {
        id: ach.id,
        name: ach.name,
        desc: ach.desc,
        category: ach.category,
        reward: ach.reward,
      });
    } catch (e) {}
  }

  /**
   * 某成就是否已解锁
   */
  isUnlocked(id) {
    return this.unlocked.has(id);
  }

  /**
   * 获取所有已解锁成就列表
   */
  getUnlocked() {
    return ACHIEVEMENTS.filter((a) => this.unlocked.has(a.id));
  }

  /**
   * 获取玩家已获得的所有称号
   */
  getUnlockedTitles() {
    const titles = [];
    for (const a of this.getUnlocked()) {
      if (a.reward && a.reward.type === 'title') {
        titles.push(a.reward.value);
      }
    }
    return titles;
  }

  /**
   * 获取当前展示佩戴的最高称号
   */
  getActiveTitle() {
    const titles = this.getUnlockedTitles();
    if (titles.length === 0) return '新手指挥官';
    return titles[titles.length - 1]; // 默认佩戴最新获得的称号
  }

  /**
   * 获取累计总积分奖励
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
   * 新战局重置单局指标
   */
  resetSession() {
    if (this._saveTimer) {
      clearTimeout(this._saveTimer);
      this._saveTimer = null;
      this.save();
    }
    this.metrics.runKills = 0;
    this.metrics.maxLevelReached = 0;
    this.metrics.maxStageReached = 0;
    this.metrics.runMaxSkillCount = 0;
    this.metrics.synergyBuffCount = 0;
    this.metrics.maxSingleHit = 0;
    this.metrics.maxElementCount = 0;
    this.metrics.maxActiveSynergy = 0;
    this.metrics.maxEpicSlots = 0;
    this.metrics.playerHitDuringBoss = false;
  }

  /**
   * 获取所有成就视图对象（支持按分类筛选）
   */
  getAchievements(category = 'all') {
    return ACHIEVEMENTS
      .filter((a) => category === 'all' || a.category === category)
      .map((a) => {
        const val = this.metrics[a.metric] || 0;
        const unlocked = this.unlocked.has(a.id);
        const progress = Math.min(1, val / a.target);
        const remaining = Math.max(0, a.target - val);
        return {
          ...a,
          unlocked,
          current: val,
          progress,
          remaining,
        };
      });
  }

  /**
   * 获取总览统计
   */
  getStats() {
    return {
      total: ACHIEVEMENTS.length,
      unlockedCount: this.unlocked.size,
      percent: Math.round((this.unlocked.size / ACHIEVEMENTS.length) * 100),
    };
  }

  /**
   * 绑定事件总线
   */
  _bindEvents() {
    // 击杀事件
    try {
      eventBus.on('enemy:killed', () => this.recordKill());
      eventBus.on('enemy:elite_killed', () => this.recordEliteKill());
      eventBus.on('enemy:boss_killed', (data) => this.recordBossKill(data && data.noHit));
      eventBus.on('player:hit_in_boss', () => this.recordPlayerHitDuringBoss());
    } catch (e) {}

    // 装备事件
    try {
      eventBus.on('equipment:pickup', ({ item }) => this.recordEquipmentAcquired(item));
      eventBus.on('equipment:max_epic_slots', ({ count }) => this.updateMaxEpicSlots(count));
    } catch (e) {}

    // 伤害与暴击
    try {
      eventBus.on('combat:hit', ({ damage, isCrit }) => this.recordHitDamage(damage, isCrit));
    } catch (e) {}

    // 技能与本命
    try {
      eventBus.on('skill:innatemax', ({ level }) => this.recordInnateMax(level));
      eventBus.on('skill:maxcount', ({ count }) => this.updateRunMaxSkillCount(count));
      eventBus.on('synergy:buff', () => this.recordSynergyBuff());
      eventBus.on('synergy:updated', ({ elementCount, activeSynergyCount }) => {
        this.updateElementMetrics(elementCount, activeSynergyCount);
      });
    } catch (e) {}

    // 角色成长
    try {
      eventBus.on('player:levelup', ({ level }) => this.updateMaxLevel(level));
      eventBus.on('player:stagechange', ({ stage }) => this.updateMaxStage(stage));
    } catch (e) {}

    // 战局通关
    try {
      eventBus.on('game:victory', (data) => this.recordVictory(data || {}));
    } catch (e) {}
  }
}
