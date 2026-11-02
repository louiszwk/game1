/**
 * 统一音频管理器 (Audio Manager) —— 音频解耦与事件绑定
 *
 * 【需求 D】
 * 1. 统一管理 BGM 与各类技能音效。
 * 2. 监听 eventBus 抛出的「技能施放 / 技能升级 / 阶段演化」事件，
 *    自动播放配置表（SOUND_MAP）中预留的对应音效文件。
 * 3. 配置表预留音效文件接口，音效文件缺失时静默降级（不播放、不报错）。
 *
 * 事件监听：
 *   - skill:cast     技能施放  → 按 skillId 查 SOUND_MAP.skills
 *   - skill:levelup   技能升级  → 播放升级音效
 *   - player:stagechange 阶段演化 → 播放阶段音效
 *
 * 音效文件路径约定：audio/ 目录下。
 */
import eventBus from '../base/eventBus';

let instance;

/**
 * 音效配置表（预留接口，音效文件缺失时静默降级）
 */
export const SOUND_MAP = {
  // 全局通用音效
  common: {
    levelup: 'audio/levelup.mp3',     // 技能升级音效
    stagechange: 'audio/stage.mp3',   // 阶段演化音效
    shoot: 'audio/bullet.mp3',        // 射击/基础施放
    explosion: 'audio/boom.mp3',      // 爆炸
  },

  // 按技能 ID 映射的音效文件（预留接口，可逐个补充）
  skills: {
    // fire_blast: 'audio/fire_blast.mp3',
    // holy_smite: 'audio/holy_smite.mp3',
    // shadow_bolt: 'audio/shadow_bolt.mp3',
    // fel_fire: 'audio/fel_fire.mp3',
  },

  // 按技能派系（category）映射的音效文件（skills 未命中时的回退）
  categories: {
    // HOLY: 'audio/holy.mp3',
    // FEL: 'audio/fel.mp3',
    // SHADOW: 'audio/shadow.mp3',
    // COMBAT: 'audio/combat.mp3',
  },
};

export default class AudioManager {
  constructor() {
    if (instance) return instance;
    instance = this;

    this.enabled = true;         // 全局音频开关
    this.volume = 1.0;           // 全局音量 0~1
    this._cache = {};            // 音效 InnerAudioContext 缓存
    this._bindEvents();
  }

  /**
   * 创建（或复用）一个音频上下文
   */
  _createAudio(src) {
    if (!src) return null;
    if (this._cache[src]) return this._cache[src];

    let audio = null;
    try {
      if (typeof wx !== 'undefined' && wx.createInnerAudioContext) {
        audio = wx.createInnerAudioContext();
        audio.src = src;
      }
    } catch (e) {}

    if (audio) {
      this._cache[src] = audio;
    }
    return audio;
  }

  /**
   * 播放一段音效（音效文件缺失时静默降级）
   * @param {string} src 音频文件路径
   * @param {{ loop?: boolean, volume?: number }} options
   */
  play(src, options = {}) {
    if (!this.enabled || !src) return;
    const audio = this._createAudio(src);
    if (!audio) return;

    try {
      audio.loop = options.loop || false;
      audio.volume = (options.volume !== undefined ? options.volume : this.volume);
      audio.currentTime = 0;
      audio.play();
    } catch (e) {}
  }

  /**
   * 播放背景音乐（循环）
   */
  playBgm(src = 'audio/bgm.mp3') {
    if (!this.enabled) return;
    const audio = this._createAudio(src);
    if (!audio) return;
    try {
      audio.loop = true;
      audio.volume = this.volume;
      audio.play();
    } catch (e) {}
  }

  /**
   * 停止背景音乐
   */
  stopBgm(src = 'audio/bgm.mp3') {
    const audio = this._cache[src];
    if (audio) {
      try { audio.stop(); } catch (e) {}
    }
  }

  /**
   * 静音开关
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) {
      this.stopBgm();
    }
  }

  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  /**
   * 根据技能 ID 解析对应音效（skills 精确命中 → categories 派系回退 → 通用射击）
   * @param {string} skillId
   * @param {string} category 技能派系
   */
  _resolveSkillSound(skillId, category) {
    if (SOUND_MAP.skills[skillId]) return SOUND_MAP.skills[skillId];
    if (category && SOUND_MAP.categories[category]) return SOUND_MAP.categories[category];
    return SOUND_MAP.common.shoot;
  }

  /**
   * 绑定 eventBus 事件：技能施放 / 技能升级 / 阶段演化
   */
  _bindEvents() {
    // 技能施放
    try {
      eventBus.on('skill:cast', ({ skillId, category }) => {
        this.play(this._resolveSkillSound(skillId, category));
      });
    } catch (e) {}

    // 技能升级
    try {
      eventBus.on('skill:levelup', () => {
        this.play(SOUND_MAP.common.levelup);
      });
    } catch (e) {}

    // 阶段演化
    try {
      eventBus.on('player:stagechange', () => {
        this.play(SOUND_MAP.common.stagechange);
      });
    } catch (e) {}
  }
}
