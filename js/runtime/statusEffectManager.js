/**
 * 状态效果管理器 (Status Effect Manager)
 *
 * 统一承载 DoT（持续伤害）/ HoT（持续治疗）/ CC（控制状态）/ BUFF / DEBUFF。
 *
 * 所有状态效果都从技能配置的 `effects[]` 数组生成，结构：
 *   { type: 'DOT'|'HOT'|'CC'|'BUFF'|'DEBUFF',
 *     dotKind?, tickDamage?, tickHeal?, tickInterval?, duration?,
 *     ccType?, slowPercent?, statKey?, statDelta? }
 *
 * 决策点（已确认 2026-11-02）：CC 状态叠加到敌人现有 slowDuration/curseDuration 之上，
 * 但为避免破坏现有逻辑，本管理器作为「统一入口」提供标准 tick 驱动。
 */

export const EFFECT_TYPE = {
  DOT: 'DOT',
  HOT: 'HOT',
  CC: 'CC',
  BUFF: 'BUFF',
  DEBUFF: 'DEBUFF',
};

export default class StatusEffectManager {
  constructor() {
    // 敌人身上的活动状态 { enemyRef: [{ ...effect, tickTimer, remaining }] }
    this.enemyStatuses = new Map();
    // 玩家身上的活动状态（HoT/BUFF）
    this.playerStatuses = [];
  }

  /**
   * 给敌人施加一个状态效果
   * @param {Object} enemy - 敌人实体
   * @param {Object} effect - 效果配置（来自 skill.effects[]）
   * @param {number} level - 技能等级（用于缩放数值，可选）
   */
  applyToEnemy(enemy, effect, level = 1) {
    if (!enemy || !effect) return;
    const status = {
      ...effect,
      tickTimer: 0,
      remaining: (effect.duration || 60) * 1,
      level,
    };
    if (!this.enemyStatuses.has(enemy)) {
      this.enemyStatuses.set(enemy, []);
    }
    this.enemyStatuses.get(enemy).push(status);

    // CC 立即同步到敌人的既有字段（兼容现有 slowDuration/curseDuration 逻辑）
    if (effect.type === EFFECT_TYPE.CC) {
      this.applyCCToEnemy(enemy, effect);
    }
  }

  applyCCToEnemy(enemy, effect) {
    const ccType = effect.ccType || 'slow';
    const duration = effect.duration || 60;
    switch (ccType) {
      case 'slow':
        enemy.slowDuration = Math.max(enemy.slowDuration || 0, duration);
        enemy._slowPercent = effect.slowPercent || 0.4;
        break;
      case 'stun':
      case 'root':
      case 'freeze':
        // 晕/定身/冰冻：复用 curseDuration 的「不能移动」语义作为硬控载体
        enemy.curseDuration = Math.max(enemy.curseDuration || 0, duration);
        enemy._ccType = ccType;
        break;
      case 'knockback':
        // 击退由技能逻辑即时处理，不在这里持续
        break;
      default:
        enemy.slowDuration = Math.max(enemy.slowDuration || 0, duration);
        break;
    }
  }

  /**
   * 给玩家施加 HoT/BUFF
   */
  applyToPlayer(effect, level = 1) {
    if (!effect) return;
    this.playerStatuses.push({
      ...effect,
      tickTimer: 0,
      remaining: effect.duration || 60,
      level,
    });
  }

  /**
   * 每帧驱动：tick 所有状态，处理 DoT 伤害 / HoT 治疗 / 状态到期
   * @param {Object} ctx - { onEnemyDamage, player, ... }
   */
  update(ctx = {}) {
    if (this.enemyStatuses.size === 0 && this.playerStatuses.length === 0) return;
    const { onEnemyDamage, player } = ctx;

    // 敌人状态
    this.enemyStatuses.forEach((statuses, enemy) => {
      for (let i = statuses.length - 1; i >= 0; i--) {
        const st = statuses[i];
        st.remaining--;
        st.tickTimer++;

        if (st.type === EFFECT_TYPE.DOT) {
          const interval = st.tickInterval || 30;
          if (st.tickTimer >= interval && onEnemyDamage && enemy.active) {
            st.tickTimer = 0;
            const school = st.school || 'physical';
            const dmg = Math.round((st.tickDamage || 1) * (st.level || 1));
            onEnemyDamage(enemy, dmg, school, false);
          }
        }

        if (st.remaining <= 0) {
          statuses.splice(i, 1);
        }
      }
      if (statuses.length === 0) {
        this.enemyStatuses.delete(enemy);
      }
    });

    // 玩家状态
    for (let i = this.playerStatuses.length - 1; i >= 0; i--) {
      const st = this.playerStatuses[i];
      st.remaining--;
      st.tickTimer++;

      if (st.type === EFFECT_TYPE.HOT && player) {
        const interval = st.tickInterval || 60;
        if (st.tickTimer >= interval) {
          st.tickTimer = 0;
          player.heal(Math.round(st.tickHeal || 1));
        }
      }

      if (st.remaining <= 0) {
        this.playerStatuses.splice(i, 1);
      }
    }
  }

  /**
   * 清空所有状态（战斗重置时调用）
   */
  clear() {
    this.enemyStatuses.clear();
    this.playerStatuses = [];
  }

  /**
   * 查询敌人身上的状态数量（供 UI/调试）
   */
  getEnemyStatusCount(enemy) {
    const list = this.enemyStatuses.get(enemy);
    return list ? list.length : 0;
  }
}
