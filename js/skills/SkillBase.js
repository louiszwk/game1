/**
 * 技能基类 (Skill Base) —— 高扩展的魔兽机制抽象
 *
 * 统一承载《魔兽世界》式核心机制：
 *   - DoT（持续伤害） / HoT（持续治疗）
 *   - AoE（范围效果）
 *   - CC（控制状态：晕/减速/冰冻/击退/恐惧/定身）
 *   - 施法读条（castTime）与冷却系统（cooldown）
 *
 * 数据来源：skill_data.js 的 SKILLS 配置表。基类负责把配置"解释"为运行时行为。
 * 每个具体技能可继承本类覆写生命周期钩子（cast/tickCast/onCastComplete/update/render）。
 *
 * 双轴标签（必须同时挂载，缺失即抛错）：
 *   - category 魔法派系：COMBAT/HOLY/FEL/DEATH/ARCANE/PASSIVE/RACIAL
 *   - element  五行自然属性：METAL/WOOD/WATER/FIRE/EARTH/THUNDER/WIND
 */
import { SKILLS } from './skill_data';

export const MECHANISM = {
  PROJECTILE: 'PROJECTILE', // 飞弹/投射物
  AOE: 'AOE',               // 范围效果
  DOT: 'DOT',               // 持续伤害
  HOT: 'HOT',               // 持续治疗
  CC: 'CC',                 // 控制状态
  CHANNEL: 'CHANNEL',       // 引导施法
  AURA: 'AURA',             // 光环（持续环绕）
  BUFF: 'BUFF',             // 增益
  PASSIVE: 'PASSIVE',       // 被动
  SUMMON: 'SUMMON',         // 召唤
};

export default class SkillBase {
  constructor(skillId, level = 1) {
    const def = SKILLS[skillId];
    if (!def) {
      throw new Error(`[SkillBase] 未找到技能配置: ${skillId}`);
    }

    this.id = skillId;
    this.level = level;
    this.def = def;

    // ===== 双轴平行标签（强制存在）=====
    this.category = def.category;
    this.element = def.element;
    if (!this.category || !this.element) {
      throw new Error(`[SkillBase] 技能 ${skillId} 缺少双轴标签: category=${this.category}, element=${this.element}`);
    }

    // ===== 机制字段（配置表可覆盖，未填则用默认值）=====
    this.mechanism = def.mechanism || MECHANISM.PROJECTILE;
    this.cooldown = def.cooldown || 0;        // 冷却（帧），0=无冷却
    this.castTime = def.castTime || 0;        // 施法读条（帧），0=瞬发
    this.range = def.range || 0;              // 施法距离（px），0=无限
    this.aoeRadius = def.aoeRadius || 0;      // 范围效果半径（px）
    this.targetType = def.targetType || 'auto'; // auto/nearest/self/area/direction/random

    // 状态效果（DoT/HoT/CC/BUFF/DEBUFF 的标准载体，见 skill_data 注释）
    this.effects = def.effects || [];

    // ===== 运行时状态 =====
    this._cooldownTimer = 0;
    this._castTimer = 0;
    this._casting = false;
  }

  // ================= 冷却系统 =================
  isReady() {
    return this._cooldownTimer <= 0 && !this._casting;
  }

  tickCooldown() {
    if (this._cooldownTimer > 0) {
      this._cooldownTimer--;
    }
  }

  putOnCooldown(reduce = 0) {
    this._cooldownTimer = Math.max(0, Math.round(this.cooldown * (1 - reduce)));
  }

  getCooldownRemaining() {
    return this._cooldownTimer;
  }

  // ================= 施法读条系统 =================
  // 注意：读条不可被受击打断（决策点4），因此不提供外部打断接口，由子类自行决定何时取消。
  startCast() {
    if (this.castTime <= 0) return; // 瞬发技能无需读条
    this._casting = true;
    this._castTimer = this.castTime;
  }

  tickCast() {
    if (!this._casting) return true;
    if (this._castTimer > 0) {
      this._castTimer--;
    }
    return this._castTimer <= 0; // 返回是否读条完成
  }

  isCasting() {
    return this._casting;
  }

  getCastProgress() {
    if (this.castTime <= 0) return 1;
    return 1 - this._castTimer / this.castTime;
  }

  // ================= 生命周期钩子（子类覆写）=================
  /** 读条完成后的实际触发 */
  onCastComplete(player, ctx) {}

  /** 瞬发技能的直接施放 */
  cast(player, ctx) {}

  /** 每帧更新（持续型技能：光环/持续伤害/引导） */
  update(player, ctx) {}

  /** 每帧渲染 */
  render(ctx, player) {}
}
