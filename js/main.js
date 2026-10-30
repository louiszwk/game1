import { DPR, canvas } from './render'; // 初始化Canvas与DPR
import Player from './player/index';
import BackGround from './runtime/background';
import Music from './runtime/music';
import DataBus from './databus';
import Joystick from './controls/joystick';
import { GemManager } from './loot/gem';
import { EnemyHordeManager } from './npc/enemy';
import { ParticleManager, ScreenShake } from './effects/particle';
import { FloatingTextManager } from './effects/floating_text';
import SkillManager from './skills/skill_manager';
import GameUI from './ui/game_ui';
import { RACES, CLASSES } from './skills/skill_data';

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

  constructor() {
    this.frameInterval = 1000 / 60; // 16.666ms 严格 60 FPS 步进
    this.lastFrameTime = 0;

    // 预绑定高频回调函数，彻底消除每一帧创建 240+ 闭包对象的垃圾回收 (GC) 停顿与发热
    this.boundLoop = this.loop.bind(this);
    this.boundOnEnemyDamage = this.onEnemyDamage.bind(this);
    this.boundOnEnemyDeath = this.onEnemyDeath.bind(this);
    this.boundOnPlayerHit = this.onPlayerHit.bind(this);
    this.boundOnCollectGem = this.onCollectGem.bind(this);

    this.skillManager = new SkillManager(this.particles, this.texts, this.shake);

    // 绑定 UI 事件
    this.gameUI.on('startGame', ({ raceId, classId }) => {
      this.startFight(raceId, classId);
    });

    this.gameUI.on('selectUpgrade', (skillId) => {
      this.skillManager.learnSkill(skillId, this.player);
      GameGlobal.databus.resumeFight();
    });

    this.gameUI.on('restartGame', () => {
      GameGlobal.databus.reset();
    });

    // 启动帧循环
    safeCancelAnim(this.aniId);
    this.aniId = safeReqAnim(this.boundLoop);
  }

  /**
   * 选定动物种族与职业，正式开战
   */
  startFight(raceId, classId) {
    GameGlobal.databus.startFight();
    this.player.setup(raceId, classId);

    // 清理战斗实体
    this.gemManager.clear();
    this.enemyHorde.reset();
    this.particles.clear();
    this.texts.clear();
    this.skillManager.reset();

    // 赋予所选进化职业初始技能
    const classData = CLASSES[classId] || CLASSES.holy_knight;
    this.skillManager.learnSkill(classData.initSkill, this.player);

    // 赋予所选动物种族专属特技！
    const raceData = RACES[raceId] || RACES.chicken;
    if (raceData.racialSkillId) {
      this.skillManager.learnSkill(raceData.racialSkillId, this.player);
    }

    try {
      GameGlobal.musicManager.playBgm();
    } catch (e) {}
  }

  // ===================== 伤害与击杀处理 =====================
  onEnemyDamage(enemy, baseDamage, school = 'physical', forceCrit = false) {
    if (!enemy.active) return;

    let damage = Math.round(baseDamage);
    const isCrit = forceCrit || Math.random() < this.player.critRate;
    if (isCrit) damage = Math.round(damage * 1.6);

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

    // 掉落灵魂碎片或补给
    const rand = Math.random();
    if (rand < 0.04) {
      this.gemManager.spawn(enemy.x, enemy.y, 25, 'meat'); // 掉落烤肉
    } else if (rand < 0.055) {
      this.gemManager.spawn(enemy.x, enemy.y, 1, 'magnet'); // 掉落磁铁
    } else {
      this.gemManager.spawn(enemy.x, enemy.y, enemy.exp, 'exp');
    }

    // 奢华多段阵亡爆发 (冲击环 + 碎芒 + 升腾灵魂)
    this.particles.monsterDeath(enemy.x, enemy.y, enemy.typeData);

    // 精英与Boss阵亡震屏
    if (enemy.typeData.isBoss) {
      this.shake.shake(16);
      try { wx.vibrateShort({ type: 'heavy' }); } catch (e) {}
    } else if (enemy.typeData.isElite) {
      this.shake.shake(7);
    }
  }

  onPlayerHit(damage) {
    const res = this.player.takeDamage(damage);
    if (res.dodge) {
      this.texts.add(this.player.x, this.player.y, '闪避!', 'dodge');
      return;
    }

    if (res.taken) {
      this.texts.add(this.player.x, this.player.y, `-${res.damage}`, 'crit');
      this.shake.shake(6);
      this.particles.burst(this.player.x, this.player.y, '#e74c3c', 8, 3, 2);

      if (this.player.hp <= 0) {
        GameGlobal.databus.gameOver();
        this.shake.shake(18);
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
    } else {
      const leveledUp = this.player.gainExp(gem.value);
      this.particles.spawn(this.player.x, this.player.y, 0, -2, 2.5, 12, gem.color, { glow: true });

      if (leveledUp) {
        GameGlobal.databus.pauseForLevelUp();
        this.gameUI.generateUpgradeChoices(this.skillManager.learnedSkills, this.player);
        this.texts.add(this.player.x, this.player.y - 45, '★ 境界突破 LEVEL UP! ★', 'crit');
        this.particles.levelUpBurst(this.player.x, this.player.y);
        this.shake.shake(9);
        try { wx.vibrateShort({ type: 'heavy' }); } catch (e) {}
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

    if (state === 'LEVEL_UP') {
      // 升级暂停战斗逻辑，但允许粒子与飘字自然收尾
      this.particles.update();
      this.texts.update();
      return;
    }

    if (state === 'PLAYING') {
      GameGlobal.databus.frame++;
      if (GameGlobal.databus.frame % 60 === 0) {
        GameGlobal.databus.time++;
        this.enemyHorde.gameTimeSeconds = GameGlobal.databus.time;
      }

      this.bg.update();
      this.shake.update();

      // 玩家移动与状态更新
      this.player.move(this.joystick.dirX, this.joystick.dirY, this.joystick.intensity);
      this.player.update();

      // 技能与投射物运转 (使用零GC预绑定函数)
      this.skillManager.update(
        this.player,
        this.enemyHorde.enemies,
        this.boundOnEnemyDamage
      );

      // 怪物潮
      this.enemyHorde.update(
        this.player,
        this.boundOnEnemyDeath,
        this.boundOnPlayerHit
      );

      // 战利品掉落拾取
      this.gemManager.update(this.player, this.boundOnCollectGem);

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
      this.skillManager.learnedSkills
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
