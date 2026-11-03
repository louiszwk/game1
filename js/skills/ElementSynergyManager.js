/**
 * 元素联动管理器 (Element Synergy Manager)
 *
 * 基于「双轴平行标签」中的五行自然属性（金木水火土风雷），
 * 动态计算当前技能卡组触发的属性克制与增益/减益。
 *
 * 纯函数式计算，无副作用。输入已学技能集合，输出全局增益系数。
 *
 * 决策点（已确认 2026-11-02）：
 *   "水+火" → 打怪伤害降低（damageMul 0.85），非自身减伤。
 */
import { SKILLS, SYNERGY_RULES } from './skill_data';
import eventBus from '../base/eventBus';

export default class ElementSynergyManager {
  constructor() {
    this.synergyMap = SYNERGY_RULES || [];
    // 预计算缓存：彻底消除每一帧每次命中敌人调用 compute() 造成的对象频繁分配与垃圾回收 (GC)
    this.cachedResult = {
      damageMul: 1.0,
      activeRules: [],
      ownedElements: [],
    };
    this.damageMul = 1.0;
    this._synergyBuffEmitted = false;
  }

  /**
   * 重置联动状态
   */
  reset() {
    this.cachedResult = {
      damageMul: 1.0,
      activeRules: [],
      ownedElements: [],
    };
    this.damageMul = 1.0;
    this._synergyBuffEmitted = false;
  }

  /**
   * 仅在学习/升级技能时调用：更新联动缓存并触发成就事件
   * @param {Object} learnedSkills
   * @returns {Object} cachedResult
   */
  recompute(learnedSkills) {
    this.cachedResult = this.compute(learnedSkills);
    this.damageMul = this.cachedResult.damageMul;

    // 成就监听：首次触发元素联动增益时发射事件
    if (!this._synergyBuffEmitted && this.cachedResult.activeRules) {
      for (let i = 0; i < this.cachedResult.activeRules.length; i++) {
        if (this.cachedResult.activeRules[i].buff) {
          this._synergyBuffEmitted = true;
          try {
            eventBus.emit('synergy:buff', { rules: this.cachedResult.activeRules });
          } catch (e) {}
          break;
        }
      }
    }

    return this.cachedResult;
  }

  /**
   * 提取当前已学技能集合所覆盖的五行元素集合
   * @param {Object} learnedSkills - { skillId: level }
   * @returns {Set<string>} 元素枚举集合
   */
  collectOwnedElements(learnedSkills) {
    const owned = new Set();
    if (!learnedSkills) return owned;
    for (const id in learnedSkills) {
      const skill = SKILLS[id];
      if (skill && skill.element) {
        owned.add(skill.element);
      }
    }
    return owned;
  }

  /**
   * 计算当前技能卡组的元素联动增益
   * @param {Object} learnedSkills - { skillId: level }
   * @returns {{
   *   damageMul: number,          // 全局伤害倍率
   *   activeRules: Array,         // 已触发的规则列表
   *   ownedElements: string[],    // 已拥有的元素
   * }}
   */
  compute(learnedSkills) {
    const ownedElements = this.collectOwnedElements(learnedSkills);
    const result = {
      damageMul: 1.0,
      activeRules: [],
      ownedElements: Array.from(ownedElements),
    };

    for (let i = 0; i < this.synergyMap.length; i++) {
      const rule = this.synergyMap[i];
      const required = rule.required || [];
      let allOwned = true;
      for (let j = 0; j < required.length; j++) {
        if (!ownedElements.has(required[j])) {
          allOwned = false;
          break;
        }
      }
      if (allOwned) {
        result.damageMul *= (rule.damageMul || 1.0);
        result.activeRules.push(rule);
      }
    }

    // 保留 3 位小数，避免浮点误差
    result.damageMul = Math.round(result.damageMul * 1000) / 1000;
    return result;
  }

  /**
   * 获取单个元素的克制说明（预留：可扩展为元素 vs 敌人属性的克制）
   * @param {string} element - 五行元素枚举
   */
  getElementInfo(element) {
    const map = {
      METAL: { strongVs: 'WOOD', weakVs: 'FIRE', desc: '金克木，被火克' },
      WOOD: { strongVs: 'EARTH', weakVs: 'METAL', desc: '木克土，被金克' },
      WATER: { strongVs: 'FIRE', weakVs: 'EARTH', desc: '水克火，被土克' },
      FIRE: { strongVs: 'METAL', weakVs: 'WATER', desc: '火克金，被水克' },
      EARTH: { strongVs: 'WATER', weakVs: 'WOOD', desc: '土克水，被木克' },
      THUNDER: { strongVs: 'WATER', weakVs: 'EARTH', desc: '雷克水，被土克' },
      WIND: { strongVs: 'FIRE', weakVs: 'METAL', desc: '风助火，被金制' },
    };
    return map[element] || null;
  }
}
