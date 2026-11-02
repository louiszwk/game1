/**
 * 技能资格校验 (Skill Eligibility) —— 职业黑名单 + 本命槽的统一校验入口
 *
 * 校验优先级（从高到低）：
 *   1. RACIAL 种族专属特技：仅本种族可修习自己的本命特技
 *   2. forbiddenSkills 技能级黑名单：即使派系允许也禁止
 *   3. forbiddenCategories 派系级黑名单：禁止修习敌对/冲突派系
 *   4. 通过
 *
 * 决策点（已确认 2026-11-02）：本命技能升级混在随机三选一里，不设独立入口。
 */
import { SKILLS, RACES, CLASSES } from './skill_data';

export default class SkillEligibility {
  /**
   * 判断某角色能否学习某技能
   * @param {Object} player - 玩家实体（含 raceId/classId/raceData/classData）
   * @param {string} skillId
   * @returns {boolean}
   */
  static canLearn(player, skillId) {
    const skill = SKILLS[skillId];
    if (!skill) return false;
    if (!player) return true; // 无角色上下文时默认允许（由调用方自行判断）

    // 1. 种族专属特技：仅本种族可修习自己的本命技
    if (skill.category === 'RACIAL') {
      const race = RACES[player.raceId];
      return race && race.racialSkillId === skillId;
    }

    const classData = player.classData || (player.classId ? CLASSES[player.classId] : null);
    if (!classData) return true;

    // 2. 技能级黑名单（精确拦截）
    if (Array.isArray(classData.forbiddenSkills) && classData.forbiddenSkills.includes(skillId)) {
      return false;
    }

    // 3. 派系级黑名单
    if (Array.isArray(classData.forbiddenCategories) && classData.forbiddenCategories.includes(skill.category)) {
      return false;
    }

    return true;
  }

  /**
   * 获取某技能在此角色身上的最大可学等级
   * 本命技能（种族本命槽）上限 = 普通上限 + 1（即 6）
   * @param {Object} player
   * @param {string} skillId
   * @returns {number}
   */
  static getMaxLevel(player, skillId) {
    const skill = SKILLS[skillId];
    if (!skill) return 5;

    const baseMax = skill.maxLevel || 5;

    // 本命槽：上限永远比普通技能高 1 级
    if (player && player.raceData && player.raceData.racialSkillId === skillId) {
      return baseMax + 1;
    }

    // 种族天命共鸣技能（可突破至 Lv.6）
    if (player && player.raceData && player.raceData.affinitySkills && player.raceData.affinitySkills.includes(skillId)) {
      return Math.max(baseMax, 6);
    }

    return baseMax;
  }

  /**
   * 判断某技能是否为该角色的本命技能
   */
  static isInnateSkill(player, skillId) {
    return Boolean(player && player.raceData && player.raceData.racialSkillId === skillId);
  }
}
