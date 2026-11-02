/**
 * 特效预制体库 (Effect Library)
 *
 * 技能每次升级抛出 'skill:levelup' 事件，动态加载更高级的特效预制体。
 * 索引键：`${skillId}@${level}`，缺失时回退到 `${skillId}@default` 或默认预制体。
 *
 * 视觉解耦：特效表现与技能逻辑分离，升级换特效只改这里。
 *
 * 【需求 B —— 多维度表现字段】
 * 每个预制体除基础 `type/color/particles/intensity` 外，新增三类强化表现字段：
 *   1. particleLayers —— 多层粒子系统挂载，支持同时叠加多种粒子类型
 *      [{ type, color, count, speed, spread, glow, life }]
 *   2. screenShake   —— 屏幕震动参数 { magnitude, duration, onCast/onImpact/onDeath }
 *   3. dynamicLight  —— 动态光源配置 { color, radius, intensity, falloff, flicker }
 *
 * 这些字段均为可选，渲染层读取后按需渲染；未填则回退默认。
 */
import eventBus from '../base/eventBus';

const DEFAULT_PREFAB = {
  type: 'burst',
  color: '#ffffff',
  particles: 'spark',
  intensity: 1,
  particleLayers: [],
  screenShake: null,
  dynamicLight: null,
};

export const EFFECT_PREFABS = {
  // —— 赤炎脉冲：随等级升级特效（低级火球 → 高级暗黑风龙吼/神威光翼）——
  'fire_blast@1': {
    type: 'fireball', color: '#ff7a7a', particles: 'spark', intensity: 1,
    particleLayers: [{ type: 'spark', color: '#ff7a7a', count: 12, speed: 3, glow: true }],
    screenShake: { magnitude: 1, duration: 6, trigger: 'onImpact' },
    dynamicLight: { color: '#ff7a7a', radius: 60, intensity: 0.4, flicker: true },
  },
  'fire_blast@2': {
    type: 'fireball', color: '#ff6b6b', particles: 'spark', intensity: 1.2,
    particleLayers: [
      { type: 'spark', color: '#ff6b6b', count: 16, speed: 3.5, glow: true },
      { type: 'circle', color: '#ffd66b', count: 6, speed: 2, glow: false },
    ],
    screenShake: { magnitude: 1.5, duration: 7, trigger: 'onImpact' },
    dynamicLight: { color: '#ff6b6b', radius: 70, intensity: 0.5, flicker: true },
  },
  'fire_blast@3': {
    type: 'pierce', color: '#ff8a80', particles: 'spark', intensity: 1.4,
    particleLayers: [
      { type: 'spark', color: '#ff8a80', count: 20, speed: 4, glow: true },
      { type: 'star', color: '#ffffff', count: 8, speed: 2.5, glow: false },
    ],
    screenShake: { magnitude: 2, duration: 8, trigger: 'onImpact' },
    dynamicLight: { color: '#ff8a80', radius: 85, intensity: 0.6, flicker: true },
  },
  'fire_blast@4': {
    type: 'aoeExplosion', color: '#ff9a7a', particles: 'star', intensity: 1.6,
    particleLayers: [
      { type: 'star', color: '#ff9a7a', count: 24, speed: 4.5, glow: true },
      { type: 'nova', color: '#ffffff', count: 10, speed: 3, glow: true },
    ],
    screenShake: { magnitude: 3, duration: 10, trigger: 'onImpact' },
    dynamicLight: { color: '#ff9a7a', radius: 110, intensity: 0.7, falloff: 2, flicker: true },
  },
  'fire_blast@5': {
    type: 'dragonRoar', color: '#ffd66b', particles: 'dragon', intensity: 2.0,
    particleLayers: [
      { type: 'dragon', color: '#ffd66b', count: 30, speed: 5, glow: true },
      { type: 'nova', color: '#ff6b6b', count: 14, speed: 4, glow: true },
    ],
    screenShake: { magnitude: 5, duration: 14, trigger: 'onCast' },
    dynamicLight: { color: '#ffd66b', radius: 160, intensity: 0.9, falloff: 2, flicker: true },
  },
  'fire_blast@6': {
    type: 'divineBurst', color: '#ffffff', particles: 'nova', intensity: 2.5,
    particleLayers: [
      { type: 'nova', color: '#ffffff', count: 40, speed: 6, glow: true },
      { type: 'dragon', color: '#ffd66b', count: 18, speed: 5, glow: true },
      { type: 'star', color: '#ff8a80', count: 16, speed: 4, glow: true },
    ],
    screenShake: { magnitude: 8, duration: 20, trigger: 'onCast' },
    dynamicLight: { color: '#ffffff', radius: 240, intensity: 1.0, falloff: 2, flicker: false },
  },

  // —— 圣光惩击 ——
  'holy_smite@1': {
    type: 'holyBolt', color: '#ffd66b', particles: 'star', intensity: 1,
    particleLayers: [{ type: 'star', color: '#ffd66b', count: 14, speed: 3, glow: true }],
    screenShake: { magnitude: 1, duration: 5, trigger: 'onImpact' },
    dynamicLight: { color: '#ffd66b', radius: 70, intensity: 0.5, flicker: false },
  },
  'holy_smite@5': {
    type: 'wrath', color: '#ffffff', particles: 'nova', intensity: 2.2,
    particleLayers: [
      { type: 'nova', color: '#ffffff', count: 30, speed: 5, glow: true },
      { type: 'star', color: '#ffd66b', count: 14, speed: 3.5, glow: true },
    ],
    screenShake: { magnitude: 6, duration: 16, trigger: 'onCast' },
    dynamicLight: { color: '#ffffff', radius: 200, intensity: 0.9, falloff: 2, flicker: false },
  },
  'holy_smite@6': {
    type: 'eternalJudgement', color: '#ffffff', particles: 'nova', intensity: 3,
    particleLayers: [
      { type: 'nova', color: '#ffffff', count: 44, speed: 6, glow: true },
      { type: 'star', color: '#ffd66b', count: 20, speed: 4, glow: true },
    ],
    screenShake: { magnitude: 9, duration: 22, trigger: 'onCast' },
    dynamicLight: { color: '#ffffff', radius: 280, intensity: 1.0, falloff: 2, flicker: false },
  },

  // —— 邪能火种 ——
  'fel_fire@1': {
    type: 'felFire', color: '#6ee06a', particles: 'spark', intensity: 1,
    particleLayers: [{ type: 'spark', color: '#6ee06a', count: 12, speed: 3, glow: true }],
    screenShake: { magnitude: 1, duration: 5, trigger: 'onImpact' },
    dynamicLight: { color: '#6ee06a', radius: 60, intensity: 0.4, flicker: true },
  },
  'fel_fire@5': {
    type: 'hellfireRain', color: '#6ee06a', particles: 'dragon', intensity: 2.4,
    particleLayers: [
      { type: 'dragon', color: '#6ee06a', count: 28, speed: 5, glow: true },
      { type: 'nova', color: '#c9f5a8', count: 12, speed: 4, glow: true },
    ],
    screenShake: { magnitude: 5, duration: 14, trigger: 'onCast' },
    dynamicLight: { color: '#6ee06a', radius: 170, intensity: 0.85, falloff: 2, flicker: true },
  },
  'fel_fire@6': {
    type: 'scorchedDemon', color: '#c9f5a8', particles: 'nova', intensity: 3,
    particleLayers: [
      { type: 'nova', color: '#c9f5a8', count: 40, speed: 6, glow: true },
      { type: 'dragon', color: '#6ee06a', count: 18, speed: 5, glow: true },
    ],
    screenShake: { magnitude: 8, duration: 20, trigger: 'onCast' },
    dynamicLight: { color: '#c9f5a8', radius: 250, intensity: 1.0, falloff: 2, flicker: true },
  },

  // —— 暗影箭 ——
  'shadow_bolt@1': {
    type: 'shadowBolt', color: '#a58bff', particles: 'circle', intensity: 1,
    particleLayers: [{ type: 'circle', color: '#a58bff', count: 10, speed: 2.5, glow: true }],
    screenShake: { magnitude: 1, duration: 4, trigger: 'onImpact' },
    dynamicLight: { color: '#a58bff', radius: 55, intensity: 0.35, flicker: true },
  },
  'shadow_bolt@5': {
    type: 'voidCollapse', color: '#8a6ff5', particles: 'nova', intensity: 2.5,
    particleLayers: [
      { type: 'nova', color: '#8a6ff5', count: 32, speed: 5, glow: true },
      { type: 'circle', color: '#c9bfff', count: 12, speed: 3.5, glow: true },
    ],
    screenShake: { magnitude: 6, duration: 16, trigger: 'onCast' },
    dynamicLight: { color: '#8a6ff5', radius: 190, intensity: 0.85, falloff: 2, flicker: true },
  },
  'shadow_bolt@6': {
    type: 'voidAnnihilate', color: '#c9bfff', particles: 'nova', intensity: 3,
    particleLayers: [
      { type: 'nova', color: '#c9bfff', count: 42, speed: 6, glow: true },
      { type: 'circle', color: '#8a6ff5', count: 18, speed: 4.5, glow: true },
    ],
    screenShake: { magnitude: 9, duration: 22, trigger: 'onCast' },
    dynamicLight: { color: '#c9bfff', radius: 270, intensity: 1.0, falloff: 2, flicker: true },
  },
};

export class EffectLibrary {
  static getPrefab(skillId, level) {
    return EFFECT_PREFABS[`${skillId}@${level}`]
      || EFFECT_PREFABS[`${skillId}@default`]
      || DEFAULT_PREFAB;
  }

  /**
   * 归一化预制体：补齐缺失的多维度字段，保证渲染层无需判空。
   * @param {object} prefab
   * @returns {{particleLayers: Array, screenShake: object|null, dynamicLight: object|null, ...}}
   */
  static normalize(prefab) {
    const p = prefab || DEFAULT_PREFAB;
    return {
      ...DEFAULT_PREFAB,
      ...p,
      particleLayers: Array.isArray(p.particleLayers) ? p.particleLayers : [],
      screenShake: p.screenShake || null,
      dynamicLight: p.dynamicLight || null,
    };
  }

  /**
   * 注册技能升级监听：升级时动态加载更高级特效预制体
   * @param {Function} onPrefab - 回调 (skillId, level, prefab) => void
   */
  static bindLevelUpEvents(onPrefab) {
    eventBus.on('skill:levelup', ({ skillId, level }) => {
      const prefab = EffectLibrary.getPrefab(skillId, level);
      if (typeof onPrefab === 'function') {
        onPrefab(skillId, level, prefab);
      }
    });
  }
}
