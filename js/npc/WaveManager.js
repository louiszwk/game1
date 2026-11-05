/**
 * 波次管理器 —— 时间轴 (Timeline) 与全局节奏控制 (Wave Manager / Timeline)
 *
 * 【需求 E —— 全局节奏与波次控制】
 * 单局目标时长 10~12 分钟（600~720 秒），直至击杀最终 Boss。
 * 通过「时间轴」把三大成长维度与进度强绑定：
 *   1. 经验产出率（expRate）    —— 随时间推进加速，保证玩家能在 10~12 分钟内成型
 *   2. 敌人数值膨胀曲线（statCurve）—— 血量/攻击/速度随进度非线性增长
 *   3. 波次节奏（wavePacing）   —— 刷怪间隔/批次随进度收窄
 *
 * 时间轴分段（以 720 秒为满进度）：
 *   0 ~ 120s   开局发育期：低压力，高经验率（让玩家快速成型）
 *   120 ~ 300s 中期爬坡期：压力上升，经验率平稳
 *   300 ~ 600s 后期高压期：敌人强度暴涨，经验率提升冲刺
 *   600 ~ 720s 终局决战期：最终 Boss 阶段，经验率封顶
 *
 * 本模块是纯函数式工具，由 EnemyHordeManager / main.js 消费，
 * 将「时间进度」翻译为「数值系数」，实现节奏与进度的强绑定。
 */

// 单局目标时长（秒）
export const GAME_TARGET_DURATION = 900; // 15 分钟结算
export const GAME_MIN_DURATION = 720;    // 12 分钟下限
export const FINAL_BOSS_TIME = 810;      // 最终 Boss 出现时间点（第 13.5 分钟）

// 时间轴分段定义
export const TIMELINE_PHASES = [
  { key: 'early',    name: '开局发育期', start: 0,   end: 180 },
  { key: 'mid',      name: '中期爬坡期', start: 180, end: 450 },
  { key: 'late',     name: '后期割草期', start: 450, end: 600 },
  { key: 'final',    name: '终局决战期', start: 600, end: 900 },
];

/**
 * 核心波次与全局难度管理器 (WaveManager)
 * 设定 15 分钟总时长，600 秒（10分钟）作为难度分水岭（修罗场阈值）。
 */
export class WaveManager {
  constructor() {
    this.gameTime = 0; // 游戏进行时间(秒)
    this.difficultyMultiplier = 1.0;
  }

  update(dt) {
    this.gameTime += dt;
    this.updateDifficultyCurve();
  }

  updateDifficultyCurve() {
    if (this.gameTime < 600) {
      // 满级前（<600s）：温和的线性增长，割草爽感期
      // 10分钟时怪物血量/攻击最多增长到 1.5 倍
      this.difficultyMultiplier = 1.0 + (this.gameTime / 600) * 0.5;
    } else {
      // 满级后（>600s）：难度陡增 (Spike Escalation)，检验构筑
      // 基础系数跃升至 2.5，并随时间快速膨胀至 4.0
      const hardModeTime = this.gameTime - 600;
      this.difficultyMultiplier = 2.5 + (hardModeTime / 300) * 1.5;
    }
  }

  getEnemyStatsBase(baseHp, baseAtk) {
    return {
      hp: Math.floor(baseHp * this.difficultyMultiplier),
      atk: Math.floor(baseAtk * (this.gameTime > 600 ? this.difficultyMultiplier * 1.2 : this.difficultyMultiplier)), // 满级后攻击额外翻倍加成
      speedBoost: this.gameTime > 600 ? 1.25 : 1.0 // 满级后移速提升25%
    };
  }
}

/**
 * 归一化游戏进度（0~1），按 15 分钟目标时长线性映射并封顶。
 * @param {number} timeSeconds 游戏时间（秒）
 * @returns {number} 0~1 进度
 */
export function getProgress(timeSeconds) {
  return Math.max(0, Math.min(1, timeSeconds / GAME_TARGET_DURATION));
}

/**
 * 解析当前时间轴阶段
 * @param {number} timeSeconds
 * @returns {{ key: string, name: string, start: number, end: number }}
 */
export function getPhase(timeSeconds) {
  for (const p of TIMELINE_PHASES) {
    if (timeSeconds >= p.start && timeSeconds < p.end) return p;
  }
  return TIMELINE_PHASES[TIMELINE_PHASES.length - 1];
}

/**
 * 经验产出率（随时间推进加速）
 * 开局 1.0，中后期平稳提升，保证玩家能在 10 分钟左右达成 60 级满级。
 * @param {number} timeSeconds
 * @returns {number} 经验倍率
 */
export function getExpRate(timeSeconds) {
  const t = timeSeconds;
  if (t < 180) return 1.0;
  if (t < 450) return 1.0 + (t - 180) / 270 * 0.5;      // 1.0 → 1.5
  if (t < 600) return 1.5 + (t - 450) / 150 * 0.5;      // 1.5 → 2.0
  return 2.0; // 满级后经验率维持高位
}

/**
 * 敌人数值膨胀曲线（600 秒为分水岭，满级前割草，满级后硬核高难）
 * @param {number} timeSeconds
 * @returns {{ hp: number, atk: number, speed: number }}
 */
export function getStatCurve(timeSeconds) {
  if (timeSeconds < 600) {
    // 满级前（<600s）：温和的线性增长，割草爽感期
    const diff = 1.0 + (timeSeconds / 600) * 0.5;
    return {
      hp: diff,
      atk: diff,
      speed: 1.0 + (timeSeconds / 600) * 0.15,
    };
  } else {
    // 满级后（>600s）：难度陡增 (Spike Escalation)，检验满级技能与神装构筑
    const hardModeTime = timeSeconds - 600;
    const diff = 2.5 + (hardModeTime / 300) * 1.5;
    return {
      hp: diff,
      atk: diff * 1.2,
      speed: 1.25 + (hardModeTime / 300) * 0.12,
    };
  }
}

/**
 * 波次节奏（刷怪间隔/批次随进度收窄）
 * @param {number} timeSeconds
 * @returns {{ intervalMul: number, batchAdd: number }}
 */
export function getWavePacing(timeSeconds) {
  const p = getProgress(timeSeconds);
  // 刷怪间隔倍率：1.0 收窄到 0.55
  const intervalMul = Math.max(0.55, 1.0 - p * 0.45);
  // 额外批次：后期 +0 ~ +2
  const batchAdd = p < 0.5 ? 0 : (p < 0.8 ? 1 : 2);
  return { intervalMul, batchAdd };
}

/**
 * 判断当前是否进入最终 Boss 决战阶段
 * @param {number} timeSeconds
 * @returns {boolean}
 */
export function isFinalBossPhase(timeSeconds) {
  return timeSeconds >= FINAL_BOSS_TIME;
}

/**
 * 综合节奏快照（供 main.js / EnemyHordeManager 一帧调用一次）
 * @param {number} timeSeconds
 * @returns {{ progress, phase, expRate, statCurve, pacing, isFinalBoss }}
 */
export function getTimelineSnapshot(timeSeconds) {
  return {
    progress: getProgress(timeSeconds),
    phase: getPhase(timeSeconds),
    expRate: getExpRate(timeSeconds),
    statCurve: getStatCurve(timeSeconds),
    pacing: getWavePacing(timeSeconds),
    isFinalBoss: isFinalBossPhase(timeSeconds),
  };
}

/* ============================================================================
 * 【需求 3 —— 动态心流与割草体验（非线性难度曲线）】
 *
 * 敌人「生成密度」与「数值属性」必须和玩家成长「解耦」，并形成强烈对比：
 *
 *   ┌─ 前期（0 ~ 180s，第 1~3 分钟）── 少量 · 高血量 · 高攻击 ─┐
 *   │  生成稀疏，单体肉厚伤高，压迫感十足、令人吃力。            │
 *   │  玩家此时尚未成型，靠走位与技能穿插苦苦支撑。               │
 *   └────────────────────────────────────────────────────────┘
 *   ┌─ 中后期（180s+）── 海量群聚 Swarm · 单体变脆 ────────────┐
 *   │  玩家多重 AoE、弹射技能成型，转为海量低血量小怪蜂拥而上，    │
 *   │  一记 AOE 清屏，彻底释放「割草」的畅快成就感。              │
 *   └────────────────────────────────────────────────────────┘
 *
 * 核心曲线：生成密度单调上升（前慢后快），单体血量/攻击在前期给一个
 * 「高峰」制造压迫，随后随玩家 AoE 成型而回落（相对变脆），形成
 * 「吃力 → 割草」的心流反转。
 * ========================================================================== */

/**
 * 动态心流快照：返回当前时刻的「生成密度系数」与「单体数值系数」。
 *
 * @param {number} timeSeconds 游戏时间（秒）
 * @returns {{
 *   density: number,       // 生成密度系数（>1 群聚，越大越 swarm）
 *   batchMul: number,      // 批次数量乘数
 *   hpMul: number,         // 单体血量乘数（前期高 → 后期回落）
 *   atkMul: number,        // 单体攻击乘数（前期高 → 后期回落）
 *   swarm: boolean         // 是否进入割草群聚阶段
 * }}
 */
export function getFlowCurve(timeSeconds) {
  const t = timeSeconds;

  // —— 前期（0~180s）：少量 · 高血量 · 高攻击，制造压迫感 ——
  // 血量/攻击在 30~150s 之间给一个「压迫高峰」（约 1.35x），
  // 让玩家在成型前感到吃力、步步惊心。
  let hpMul;
  let atkMul;
  if (t < 30) {
    hpMul = 1.15;   // 开局稍肉
    atkMul = 1.10;
  } else if (t < 90) {
    // 压迫感爬坡
    const k = (t - 30) / 60;
    hpMul = 1.15 + k * 0.20;   // → 1.35
    atkMul = 1.10 + k * 0.20;  // → 1.30
  } else if (t < 150) {
    // 压迫高峰维持
    hpMul = 1.35;
    atkMul = 1.30;
  } else if (t < 180) {
    // 逐步过渡：单体开始「变脆」的前奏
    const k = (t - 150) / 30;
    hpMul = 1.35 - k * 0.20;   // → 1.15
    atkMul = 1.30 - k * 0.15;  // → 1.15
  } else {
    // —— 中后期（180s+）：海量群聚 · 单体变脆 ——
    // 血量/攻击随玩家 AoE 成型持续「相对回落」，生成密度暴涨。
    const p = getProgress(t); // 0.25 → 1.0
    // 单体血量从 1.15 回落到 0.55（后期小怪一击即碎，割草爽感）
    hpMul = Math.max(0.55, 1.15 - (p - 0.25) * 0.80);
    // 单体攻击回落到 0.75（数量补偿威胁，但单次不再致命）
    atkMul = Math.max(0.75, 1.15 - (p - 0.25) * 0.55);
  }

  // —— 生成密度：前慢后快，非线性上升 ——
  // 前期稀疏（压迫感来自单体质量），后期群聚（割草感来自海量数量）
  let density;
  let batchMul;
  if (t < 60) {
    density = 0.75;      // 开局极稀疏
    batchMul = 1;
  } else if (t < 180) {
    const k = (t - 60) / 120;
    density = 0.75 + k * 0.45;   // → 1.20
    batchMul = 1 + Math.floor(k * 1.0); // 1 → 2
  } else {
    const p = getProgress(t);
    // 群聚爆发：密度 1.4 → 2.6，批次 3 → 6，彻底 swarm
    density = 1.40 + (p - 0.25) * 1.60;
    batchMul = Math.min(6, 3 + Math.floor((p - 0.25) / 0.15));
  }

  return {
    density,
    batchMul,
    hpMul,
    atkMul,
    swarm: t >= 180,
  };
}

/**
 * 心流快照别名（向后兼容统一入口）
 */
export function getFlowSnapshot(timeSeconds) {
  return getFlowCurve(timeSeconds);
}
