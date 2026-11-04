import { DPR, canvas } from './render'; // 初始化Canvas与DPR
import Player from './player/index';
import BackGround from './runtime/background';
import Music from './runtime/music';
import AudioManager from './runtime/audioManager';
import DataBus from './databus';
import Joystick from './controls/joystick';
import { GemManager } from './loot/gem';
import { EnemyHordeManager } from './npc/enemy';
import { GAME_TARGET_DURATION } from './npc/WaveManager';
import { ParticleManager, ScreenShake } from './effects/particle';
import { FloatingTextManager } from './effects/floating_text';
import SkillManager from './skills/skill_manager';
import GameUI from './ui/game_ui';
import { RACES, CLASSES } from './skills/skill_data';
import { SpatialHashGrid } from './base/spatial_grid';
import ElementSynergyManager from './skills/ElementSynergyManager';
import StatusEffectManager from './runtime/statusEffectManager';
import AchievementManager from './runtime/achievementManager';
import EquipmentManager from './equipment/EquipmentManager';
import eventBus from './base/eventBus';

// 安全获取上屏 Canvas 与 2D 绘图上下文
const mainCanvas = canvas || (typeof GameGlobal !== 'undefined' && GameGlobal.canvas) || (typeof wx !== 'undefined' && wx.createCanvas ? wx.createCanvas() : null);
const ctx = mainCanvas ? mainCanvas.getContext('2d') : null;

const safeReqAnim = (cb) => {
  if (typeof requestAnimationFrame !== 'undefined') return requestAnimationFrame(cb);
  if (typeof window !== 'undefined' && window.requestAnimationFrame) return window.requestAnimationFrame(cb);
  return setTimeout(cb, 16);
};

const safeCancelAnim = (id) => {
  if (typeof cancelAnimationFrame !== 'undefined') return cancelAnimationFrame(id);
  if (typeof window !== 'undefined' && window.cancelAnimationFrame) return window.cancelAnimationFrame(id);
  clearTimeout(id);
};

GameGlobal.databus = new DataBus();
GameGlobal.musicManager = new Music();
// 统一音频管理器（监听技能施放/升级/阶段演化事件，自动播放对应音效）
GameGlobal.audioManager = new AudioManager();
// 成就管理器（静默监听玩家行为，支持本地持久化 Save/Load）
GameGlobal.achievementManager = new AchievementManager();


/**
 * 游戏主控制器 (Main)
 * 驱动魔兽动物割草肉鸽完整生命周期与交互体验
 */
export default class Main {
  aniId = 0;
  bg = new BackGround();
  player = new Player();
  joystick = new Joystick();
  gemManager = new GemManager();
  enemyHorde = new EnemyHordeManager();
  particles = new ParticleManager();
  texts = new FloatingTextManager();
  shake = new ScreenShake();
  gameUI = new GameUI();
  elementSynergy = new ElementSynergyManager();
  statusEffects = new StatusEffectManager();
  equipmentManager = new EquipmentManager();

  constructor() {
    this.frameInterval = 1000 / 60; // 16.666ms 严格 60 FPS 步进
    this.lastFrameTime = 0;
    GameGlobal.equipmentManager = this.equipmentManager;
    GameGlobal.gameUI = this.gameUI;
    GameGlobal.gemManager = this.gemManager;

    // 预绑定高频回调函数，彻底消除每一帧创建 240+ 闭包对象的垃圾回收 (GC) 停顿与发热
    this.boundLoop = this.loop.bind(this);
    this.boundOnEnemyDamage = this.onEnemyDamage.bind(this);
    this.boundOnEnemyDeath = this.onEnemyDeath.bind(this);
    this.boundOnPlayerHit = this.onPlayerHit.bind(this);
    this.boundOnCollectGem = this.onCollectGem.bind(this);

    this.spatialGrid = new SpatialHashGrid(80);
    this.skillManager = new SkillManager(this.particles, this.texts, this.shake);

    // 绑定 UI 事件
    this.gameUI.on('startGame', ({ raceId, classId }) => {
      this.startFight(raceId, classId);
    });

    this.gameUI.on('selectUpgrade', (skillId) => {
      if (skillId) {
        this.skillManager.learnSkill(skillId, this.player);
      }

      // 元素联动即时重算并更新缓存（注入装备元素，零 GC、无重复计算）
      this.elementSynergy.recompute(this.skillManager.learnedSkills, this.equipmentManager.collectOwnedElements());

      // 消费一次升级机会
      if (this.player.pendingLevelUps > 0) {
        this.player.pendingLevelUps--;
      }

      // 若还有待选升级次数，连续弹出下一轮三选一；否则恢复战斗
      if (this.player.pendingLevelUps > 0) {
        this.gameUI.generateUpgradeChoices(this.skillManager.learnedSkills, this.player);
      } else {
        GameGlobal.databus.resumeFight();
      }
    });

    this.gameUI.on('restartGame', () => {
      this.joystick.reset();
      GameGlobal.databus.reset();
    });

    // 重新挑战当前组合 (保留动物与职业快速重开)
    this.gameUI.on('restartCurrentFight', () => {
      this.joystick.reset();
      this.startFight(this.player.raceId, this.player.classId);
    });

    // 串联怪物波次预警提醒
    this.enemyHorde.onWaveNotice = (waveNum, title) => {
      this.gameUI.showWaveAlert(waveNum, title);
    };

    // 成就解锁局内视听反馈
    eventBus.on('achievement:unlock', ({ name }) => {
      this.texts.add(this.player.x, this.player.y - 65, '🏆 成就: ' + name, 'crit');
      this.particles.holySparks(this.player.x, this.player.y, 16);
      try { wx.vibrateShort({ type: 'medium' }); } catch (e) {}
    });

    // 最终 Boss 决战预警（第 11 分钟母巢主脑降临）
    this.enemyHorde.onFinalBoss = () => {
      this.gameUI.showWaveAlert(99, '⚠️ 母巢主脑·泽拉斯降临！决战开始！');
      try { wx.vibrateShort({ type: 'heavy' }); } catch (e) {}
    };

    // 启动帧循环
    safeCancelAnim(this.aniId);
    this.aniId = safeReqAnim(this.boundLoop);
  }

  /**
   * 【战斗实体初始化】实例化 Player 对象进入战斗场景。
   *
   * 与 UI 预览严格解耦：无论选人界面展示了何种「最高阶最终形态」立绘，
   * 进入战斗时数据与视觉都必须重置回 1 级状态（使用原生 Canvas 降级渲染）。
   * Player.setup() 内部会将 level 重置为 1、exp/属性回归初始值，
   * 且 1 级时 getHeroEvolutionImage 返回 null → 走 Canvas 原生矢量绘制。
   *
   * @param {string} raceId 种族
   * @param {string} classId 职业
   */
  initPlayerEntity(raceId, classId) {
    this.player.setup(raceId, classId);
  }

  /**
   * 选定动物种族与职业，正式开战
   */
  startFight(raceId, classId) {
    GameGlobal.databus.startFight();
    this.initPlayerEntity(raceId, classId);

    // 重置成就管理器单局会话指标（保留跨局持久化指标）
    try { GameGlobal.achievementManager.resetSession(); } catch (e) {}

    // 记录使用过的职业与种族（图鉴成就）
    try {
      GameGlobal.achievementManager.recordClassUsed(classId);
      GameGlobal.achievementManager.recordRaceUsed(raceId);
    } catch (e) {}

    // 清理战斗实体
    this.gemManager.clear();
    this.enemyHorde.reset();
    this.particles.clear();
    this.texts.clear();
    this.skillManager.reset();
    this.statusEffects.clear();
    this.elementSynergy.reset();

    // 重置波次提示状态
    this.gameUI.waveAlert = null;
    this.gameUI.currentWave = 0;

    // 赋予所选进化职业初始技能
    const classData = CLASSES[classId] || CLASSES.holy_knight;
    this.skillManager.learnSkill(classData.initSkill, this.player);

    // 赋予所选动物种族专属特技！
    const raceData = RACES[raceId] || RACES.chicken;
    if (raceData.racialSkillId) {
      this.skillManager.learnSkill(raceData.racialSkillId, this.player);
    }

    // 初始化 16 部位装备（全套初始白板护甲并聚合数值）
    this.equipmentManager.initBattle(this.player);

    // 初始化计算一次元素联动缓存（零 GC 预缓存，融合装备五行元素）
    this.elementSynergy.recompute(this.skillManager.learnedSkills, this.equipmentManager.collectOwnedElements());

    try {
      GameGlobal.musicManager.playBgm();
    } catch (e) {}
  }

  // ===================== 伤害与击杀处理 =====================
  onEnemyDamage(enemy, baseDamage, school = 'physical', forceCrit = false) {
    if (!enemy.active) return;

    // 元素联动：直接读取预缓存的全局伤害倍率（零 GC、无重复计算）
    let damage = Math.round(baseDamage * this.elementSynergy.damageMul);
    const isCrit = forceCrit || Math.random() < this.player.critRate;
    if (isCrit) {
      const critMul = this.player.critDmgMultiplier || 1.6;
      damage = Math.round(damage * critMul);
    }

    const res = enemy.takeDamage(damage, isCrit);
    if (res.actualDamage > 0) {
      // 打击火星与受击反馈
      this.particles.hitImpact(enemy.x, enemy.y, '#ffffff', isCrit);

      // 伤害跳字
      let textType = isCrit ? 'crit' : 'normal';
      if (!isCrit) {
        if (school === 'holy') textType = 'holy';
        else if (school === 'fel') textType = 'fel';
        else if (school === 'shadow') textType = 'shadow';
      }
      this.texts.add(enemy.x, enemy.y, `${res.actualDamage}`, textType);

      // 吸血属性生效
      if (this.player.lifeSteal > 0 && Math.random() < 0.4) {
        const stolen = Math.max(1, Math.round(res.actualDamage * this.player.lifeSteal));
        const healed = this.player.heal(stolen);
        if (healed > 0) {
          this.texts.add(this.player.x, this.player.y, `${healed}`, 'heal');
        }
      }
    }

    if (res.dead) {
      this.onEnemyDeath(enemy);
    }
  }

  onEnemyDeath(enemy, isCurse = false) {
    GameGlobal.databus.kills++;
    GameGlobal.databus.score += enemy.exp * 10;

    // 发射击杀事件（成就管理器静默监听累计击杀）
    try { eventBus.emit('enemy:killed', { enemy }); } catch (e) {}

    // 时间轴经验产出率（需求 E：随时间推进加速经验产出）
    const expRate = (this.enemyHorde.expRate) || 1.0;
    const expValue = Math.max(1, Math.round(enemy.exp * expRate));

    // 掉落灵魂碎片或补给
    const rand = Math.random();
    if (rand < 0.04) {
      this.gemManager.spawn(enemy.x, enemy.y, 25, 'meat'); // 掉落烤肉
    } else if (rand < 0.055) {
      this.gemManager.spawn(enemy.x, enemy.y, 1, 'magnet'); // 掉落磁铁
    } else {
      this.gemManager.spawn(enemy.x, enemy.y, expValue, 'exp');
    }

    // 装备掉落判定（Boss 100%必爆，精英怪 16%，普通怪 2.5%，结合时间轴与传说保底）
    const equipDrop = this.equipmentManager.rollDrop(enemy, GameGlobal.databus.time);
    if (equipDrop) {
      this.gemManager.spawnEquipment(enemy.x, enemy.y, equipDrop);
    }

    // 奢华多段阵亡爆发 (冲击环 + 碎芒 + 升腾灵魂)
    this.particles.monsterDeath(enemy.x, enemy.y, enemy.typeData);

    // 精英与Boss阵亡震屏 (克制舒适的震屏体验)
    if (enemy.typeData.isBoss) {
      this.shake.shake(8);
      try { wx.vibrateShort({ type: 'medium' }); } catch (e) {}

      // 最终 Boss 被击败 → 通关胜利（12 分钟节奏终局）
      if (enemy.isFinalBoss) {
        this.onVictory();
      }
    } else if (enemy.typeData.isElite) {
      this.shake.shake(3);
    }
  }

  /**
   * 通关胜利：击败最终 Boss（母巢主脑·泽拉斯）
   */
  onVictory() {
    if (GameGlobal.databus.state === 'GAME_OVER') return; // 防重复触发
    this.equipmentManager.finishBattle(true);
    GameGlobal.databus.setVictory();
    this.shake.shake(10);
    try { wx.vibrateShort({ type: 'heavy' }); } catch (e) {}
    // 记录通关成就
    try { eventBus.emit('game:victory', { time: GameGlobal.databus.time, kills: GameGlobal.databus.kills }); } catch (e) {}
  }

  onPlayerHit(damage) {
    const res = this.player.takeDamage(damage);
    if (res.dodge) {
      this.texts.add(this.player.x, this.player.y, '闪避!', 'dodge');
      return;
    }

    if (res.shieldBlock) {
      this.texts.add(this.player.x, this.player.y, '羊毛格挡!', 'heal');
      this.particles.holySparks(this.player.x, this.player.y, 8);
      return;
    }

    if (res.taken) {
      this.texts.add(this.player.x, this.player.y, `-${res.damage}`, 'crit');
      this.shake.shake(2); // 轻微受击顿挫，杜绝持续剧烈晃动
      this.particles.burst(this.player.x, this.player.y, '#e74c3c', 8, 3, 2);

      if (this.player.hp <= 0) {
        this.equipmentManager.finishBattle(false);
        GameGlobal.databus.gameOver();
        this.shake.shake(8);
        this.particles.burst(this.player.x, this.player.y, '#c0392b', 30, 7, 4);
      }
    }
  }

  onCollectGem(gem) {
    if (gem.type === 'meat') {
      const healed = this.player.heal(30);
      this.texts.add(this.player.x, this.player.y, `${healed}`, 'heal');
      this.particles.holySparks(this.player.x, this.player.y, 8);
    } else if (gem.type === 'magnet') {
      this.gemManager.magnetAll(this.player);
      this.texts.add(this.player.x, this.player.y, '全图聚灵!', 'crit');
      this.particles.burst(this.player.x, this.player.y, '#f1c40f', 20, 6, 3);
    } else if (gem.type === 'equipment') {
      const equipRes = this.equipmentManager.equip(gem.equipmentData, this.player);
      if (equipRes.success) {
        const rarity = gem.equipmentData.rarity;
        const itemName = gem.equipmentData.name;
        this.texts.add(this.player.x, this.player.y - 45, `+${itemName}`, rarity.rank >= 4 ? 'crit' : 'heal');
        this.particles.holySparks(this.player.x, this.player.y, rarity.rank >= 4 ? 20 : 10);
        if (equipRes.isLegendary) {
          this.shake.shake(6);
          try { wx.vibrateShort({ type: 'heavy' }); } catch (e) {}
        }
        // 装备属性生效后重算元素联动
        this.elementSynergy.recompute(this.skillManager.learnedSkills, this.equipmentManager.collectOwnedElements());
      } else {
        // 未能替换（防降级保护/传说锁定），分解为经验碎晶反馈玩家
        const scrapExp = (gem.equipmentData.rarity.rank + 1) * 8;
        this.player.gainExp(scrapExp);
        this.texts.add(this.player.x, this.player.y - 35, `分解 +${scrapExp}经验`, 'normal');
      }
    } else {
      const leveledUp = this.player.gainExp(gem.value);
      this.particles.spawn(this.player.x, this.player.y, 0, -2, 2.5, 12, gem.color, { glow: true });

      if (leveledUp) {
        // ⭐ 升级瞬间强行切断摇杆状态，断开拖拽惯性，杜绝误触技能
        this.joystick.reset();

        // 仅在当前尚未处于升级状态时触发暂停与首次弹出（避免多次重复生成选择卡牌）
        if (GameGlobal.databus.state !== 'LEVEL_UP') {
          GameGlobal.databus.pauseForLevelUp();
          this.gameUI.generateUpgradeChoices(this.skillManager.learnedSkills, this.player);
        }
        this.texts.add(this.player.x, this.player.y - 45, '★ 境界突破 LEVEL UP! ★', 'crit');
        this.particles.levelUpBurst(this.player.x, this.player.y);
        this.shake.shake(3);
        try { wx.vibrateShort({ type: 'light' }); } catch (e) {}
      }
    }
  }

  // ===================== 帧逻辑更新 =====================
  update() {
    const state = GameGlobal.databus.state;

    if (state === 'SELECT' || state === 'GAME_OVER') {
      this.bg.update();
      return;
    }

    if (state === 'LEVEL_UP' || (this.gameUI && this.gameUI.showEquipmentSheet)) {
      // 升级或查阅装备面板时暂停战斗与摇杆移动，允许粒子与飘字自然收尾
      if (this.gameUI && this.gameUI.showEquipmentSheet) {
        this.joystick.reset();
      }
      this.particles.update();
      this.texts.update();
      return;
    }

    if (state === 'PLAYING') {
      GameGlobal.databus.frame++;
      if (GameGlobal.databus.frame % 60 === 0) {
        GameGlobal.databus.time++;
        this.enemyHorde.gameTimeSeconds = GameGlobal.databus.time;

        // 12 分钟超时结算：若最终 Boss 仍未被击败，则判定失败（节奏硬上限）
        // 若决战期最终 Boss 仍在场，提供狂暴决战延展期（最多 45 秒），给玩家冲刺绝杀机会
        if (GameGlobal.databus.time >= GAME_TARGET_DURATION) {
          const hasBossAlive = this.enemyHorde.enemies.some(e => e.active && e.typeData && e.typeData.isBoss);
          if (hasBossAlive && GameGlobal.databus.time < GAME_TARGET_DURATION + 45) {
            // 决战狂暴期：允许加时直至击败 Boss 或玩家阵亡
          } else {
            this.equipmentManager.finishBattle(false);
            GameGlobal.databus.gameOver();
            return;
          }
        }
      }

      this.bg.update();
      this.shake.update();

      // 空间哈希网格构建：O(N) 极速映射，大幅降低后续多重碰撞检测
      this.spatialGrid.build(this.enemyHorde.enemies);

      // 玩家移动与状态更新
      this.player.move(this.joystick.dirX, this.joystick.dirY, this.joystick.intensity);
      this.player.update();

      // 技能与投射物运转 (传入空间哈希网格实现局部碰撞过滤，传入宝石管理器实现雷磁吸取)
      this.skillManager.update(
        this.player,
        this.enemyHorde.enemies,
        this.boundOnEnemyDamage,
        this.spatialGrid,
        this.gemManager
      );

      // 怪物潮 (传入已学技能以判断是否达到解锁远程怪的标准)
      this.enemyHorde.update(
        this.player,
        this.boundOnEnemyDeath,
        this.boundOnPlayerHit,
        this.skillManager.learnedSkills
      );

      // 战利品掉落拾取
      this.gemManager.update(this.player, this.boundOnCollectGem);

      // 状态效果管理器（DoT 持续伤害 / HoT 持续治疗 / CC 控制状态 tick）
      this.statusEffects.update({
        onEnemyDamage: this.boundOnEnemyDamage,
        player: this.player,
      });

      // 特效更新
      this.particles.update();
      this.texts.update();
    }
  }

  lastFrameTime = 0;
  frameInterval = 1000 / 60; // 锁定 60 FPS (~16.6ms)

  // ===================== 帧画面渲染 =====================
  render() {
    if (!ctx || !mainCanvas) return;
    ctx.clearRect(0, 0, mainCanvas.width, mainCanvas.height);

    const state = GameGlobal.databus.state;

    ctx.save();
    // 关键：整体缩放至 Retina 物理分辨率
    ctx.scale(DPR, DPR);
    ctx.imageSmoothingEnabled = true;
    ctx.shadowBlur = 0; // 确保每帧初始状态无模糊残留

    ctx.save();
    // 应用震屏
    if (state === 'PLAYING') {
      this.shake.apply(ctx);
    }

    // 绘制背景
    this.bg.render(ctx);

    if (state === 'PLAYING' || state === 'LEVEL_UP') {
      // 战利品
      this.gemManager.render(ctx);

      // 技能底层法阵/光环/黑洞
      this.skillManager.render(ctx, this.player);

      // 怪物
      this.enemyHorde.render(ctx);

      // 主角
      this.player.render(ctx);

      // 粒子与伤害跳字
      this.particles.render(ctx);
      this.texts.render(ctx);
    }

    ctx.restore(); // 恢复镜头震颤

    // 绘制摇杆（仅在战斗中）
    if (state === 'PLAYING') {
      this.joystick.render(ctx);
    }

    // 绘制游戏界面与弹窗
    this.gameUI.render(
      ctx,
      state,
      this.player,
      {
        time: GameGlobal.databus.time,
        kills: GameGlobal.databus.kills,
        score: GameGlobal.databus.score,
      },
      this.skillManager.learnedSkills,
      this.equipmentManager
    );

    ctx.restore(); // 恢复整体 DPR scale
  }

  // 帧循环驱动：精准 60 FPS 步进限速，杜绝高刷屏 120Hz 暴走发热
  loop(timestamp = 0) {
    this.aniId = safeReqAnim(this.boundLoop);

    if (this.lastFrameTime === 0) {
      this.lastFrameTime = timestamp;
      this.update();
      this.render();
      return;
    }

    const elapsed = timestamp - this.lastFrameTime;
    // 严格 60 FPS 步进限速 (~16.2ms)，彻底拦截 90Hz/120Hz 高刷屏的无谓空转
    if (elapsed >= 16.2) {
      this.lastFrameTime = timestamp - Math.min(elapsed - 16.2, 16.2);
      this.update();
      this.render();
    }
  }
}
