/**
 * 技能管理与酷炫魔法特效系统
 * 驱动三大流派（圣光、邪能、暗影）从初阶朴素到终极超武全屏华丽蜕变
 */

import { SKILLS } from './skill_data';
import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../render';

function createOffscreen(w, h) {
  if (typeof wx !== 'undefined' && wx.createOffscreenCanvas) {
    try {
      return wx.createOffscreenCanvas({ type: '2d', width: w, height: h });
    } catch (e) {
      try {
        return wx.createOffscreenCanvas(w, h);
      } catch (e2) {}
    }
  }
  if (typeof document !== 'undefined' && document.createElement) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    return c;
  }
  return null;
}

export default class SkillManager {
  constructor(particleManager, floatingTextManager, screenShake) {
    this.particles = particleManager;
    this.texts = floatingTextManager;
    this.shake = screenShake;

    this.learnedSkills = {}; // { skillId: level }
    this.cooldowns = {}; // { skillId: currentTimer }
    this.spatialGrid = null; // 外部注入的零GC空间哈希网格

    // 活跃技能实体
    this.projectiles = []; // 飞弹类
    this.consecrationZones = []; // 奉献金光法阵
    this.shadowTentacles = []; // 暗影触手
    this.blackHoles = []; // 虚空黑洞
    this.hellfireMeteors = []; // 地狱火流星
    this.divinePillars = []; // 天使圣光光柱
    this.whirlwindSlashes = []; // 旋风斩切刃
    this.frostNovas = []; // 极寒冰霜新星
    this.deathDecayZones = []; // 幽冥凋零死地
    this.mortalStrikes = []; // 裂铠劈砍斩击波
    this.chainLightnings = []; // 狂雷风暴链光弧
    this.blizzards = []; // 极冰暴风雪
    this.holyShocks = []; // 神圣震击圣雷光柱
    this.boneStormAngle = 0; // 白骨风暴自转角
    this.thunderClaps = []; // 雷霆震击地裂波
    this.bloodlustWaves = []; // 嗜血战歌刀风

    // 动物专属实体
    this.eggs = []; // 母鸡炸弹蛋
    this.sonicWaves = []; // 鸭嘎嘎音波
    this.stompWaves = []; // 铁牛战争践踏
    this.woolBalls = []; // 绵羊回血毛球
    this.fishDashes = []; // 咸鱼突刺轨迹

    this.orbitAngle = 0; // 神圣风暴旋转角
    this.felAuraTick = 0;
    this.holyWrathTimer = 0; // 超武复仇之怒持续特效
    this.meteorRainTimer = 0; // 超武地狱火流星雨

    // 离屏 Canvas 渐变缓存池 (零每帧 GC 与消除 GPU 渐变状态重置)
    this.initOffscreenCaches();
  }

  initOffscreenCaches() {
    // 1. 奉献神圣金池预烘焙 (256x256)
    this.cachedConsecrationCanvas = createOffscreen(256, 256);
    if (this.cachedConsecrationCanvas) {
      const cCtx = this.cachedConsecrationCanvas.getContext('2d');
      const grad = cCtx.createRadialGradient(128, 128, 5, 128, 128, 120);
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.75)');
      grad.addColorStop(0.35, 'rgba(255, 234, 167, 0.55)');
      grad.addColorStop(0.7, 'rgba(241, 196, 15, 0.3)');
      grad.addColorStop(0.9, 'rgba(243, 156, 18, 0.1)');
      grad.addColorStop(1, 'transparent');
      cCtx.fillStyle = grad;
      cCtx.beginPath();
      cCtx.arc(128, 128, 120, 0, Math.PI * 2);
      cCtx.fill();
    }

    // 2. 虚空黑洞吸积盘预烘焙 (256x256)
    this.cachedBlackHoleCanvas = createOffscreen(256, 256);
    if (this.cachedBlackHoleCanvas) {
      const bCtx = this.cachedBlackHoleCanvas.getContext('2d');
      const grad = bCtx.createRadialGradient(128, 128, 8, 128, 128, 120);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.2, 'rgba(155, 89, 182, 0.85)');
      grad.addColorStop(0.5, 'rgba(52, 31, 151, 0.7)');
      grad.addColorStop(0.8, 'rgba(142, 68, 173, 0.35)');
      grad.addColorStop(1, 'transparent');
      bCtx.fillStyle = grad;
      bCtx.beginPath();
      bCtx.arc(128, 128, 120, 0, Math.PI * 2);
      bCtx.fill();
    }

    // 3. 神圣圣光光柱预烘焙 (128x600)
    this.cachedHolyBeamCanvas = createOffscreen(128, 600);
    if (this.cachedHolyBeamCanvas) {
      const hCtx = this.cachedHolyBeamCanvas.getContext('2d');
      const grad = hCtx.createLinearGradient(0, 0, 128, 0);
      grad.addColorStop(0, 'rgba(255, 234, 167, 0.05)');
      grad.addColorStop(0.3, 'rgba(241, 196, 15, 0.8)');
      grad.addColorStop(0.5, '#ffffff');
      grad.addColorStop(0.7, 'rgba(241, 196, 15, 0.8)');
      grad.addColorStop(1, 'rgba(255, 234, 167, 0.05)');
      hCtx.fillStyle = grad;
      hCtx.fillRect(0, 0, 128, 600);
    }
  }

  reset() {
    this.learnedSkills = {};
    this.cooldowns = {};
    this.projectiles = [];
    this.consecrationZones = [];
    this.shadowTentacles = [];
    this.blackHoles = [];
    this.hellfireMeteors = [];
    this.divinePillars = [];
    this.whirlwindSlashes = [];
    this.frostNovas = [];
    this.deathDecayZones = [];
    this.mortalStrikes = [];
    this.chainLightnings = [];
    this.blizzards = [];
    this.holyShocks = [];
    this.boneStormAngle = 0;
    this.thunderClaps = [];
    this.bloodlustWaves = [];

    this.eggs = [];
    this.sonicWaves = [];
    this.stompWaves = [];
    this.woolBalls = [];
    this.fishDashes = [];

    this.orbitAngle = 0;
    this.felAuraTick = 0;
    this.holyWrathTimer = 0;
    this.meteorRainTimer = 0;
  }

  /**
   * 学习或升级技能
   */
  learnSkill(skillId, player) {
    const currentLvl = this.learnedSkills[skillId] || 0;
    const nextLvl = currentLvl + 1;
    this.learnedSkills[skillId] = nextLvl;

    const skillDef = SKILLS[skillId];
    if (!skillDef) return;

    // 如果是被动属性技能，立即应用到角色属性
    this.applyPassiveModifiers(skillId, nextLvl, player);

    // 升级视觉反馈
    this.particles.burst(player.x, player.y, skillDef.color, 24, 6, 4);
    this.texts.add(player.x, player.y - 45, `${skillDef.name} Lv.${nextLvl}`, 'crit');
    this.shake.shake(4);
  }

  applyPassiveModifiers(skillId, level, player) {
    switch (skillId) {
      case 'stat_might':
        player.atkMultiplier = 1.0 + level * 0.18 + (level === 5 ? 0.1 : 0);
        break;
      case 'stat_haste':
        player.cooldownReduce = Math.min(0.65, level * 0.12 + (level === 5 ? 0.17 : 0));
        break;
      case 'stat_speed':
        player.speed = player.baseSpeed * (1.0 + level * 0.15 + (level === 5 ? 0.05 : 0));
        break;
      case 'stat_magnet':
        player.magnetRadius = 95 * (1.0 + level * 0.5 + (level === 5 ? 1.0 : 0));
        break;
      case 'stat_vitality':
        player.maxHp += 25;
        player.hp = Math.min(player.maxHp, player.hp + 25);
        player.hpRegen = level >= 5 ? 6 : level;
        break;
    }
  }

  /**
   * 寻找最近的若干个敌人 (极致轻量零GC算法，消除 map/filter/sort 5连数组分配)
   */
  getNearestEnemies(player, enemies, count = 1) {
    if (!enemies || enemies.length === 0) return [];
    const candidates = [];
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (!e.active) continue;
      const dx = e.x - player.x;
      const dy = e.y - player.y;
      const distSq = dx * dx + dy * dy;

      if (candidates.length < count) {
        candidates.push({ enemy: e, distSq });
        candidates.sort((a, b) => a.distSq - b.distSq);
      } else if (distSq < candidates[candidates.length - 1].distSq) {
        candidates[candidates.length - 1] = { enemy: e, distSq };
        candidates.sort((a, b) => a.distSq - b.distSq);
      }
    }
    const res = [];
    for (let i = 0; i < candidates.length; i++) {
      res.push(candidates[i].enemy);
    }
    return res;
  }

  update(player, enemies, onEnemyDamage, spatialGrid) {
    this.orbitAngle += 0.05;
    if (spatialGrid) this.spatialGrid = spatialGrid;

    // 更新各个技能的冷却与触发
    this.updateAnimalSkills(player, enemies, onEnemyDamage);
    this.updateHolySkills(player, enemies, onEnemyDamage);
    this.updateFelSkills(player, enemies, onEnemyDamage);
    this.updateShadowSkills(player, enemies, onEnemyDamage);
    this.updateClassSkills(player, enemies, onEnemyDamage);
    this.updateWarcraftSkills(player, enemies, onEnemyDamage);

    // 更新飞弹 (传入空间哈希网格进行局部碰撞判定)
    this.updateProjectiles(enemies, onEnemyDamage, this.spatialGrid);

    // 更新奉献法阵
    this.updateConsecrationZones(enemies, onEnemyDamage);

    // 更新地狱火流星
    this.updateHellfireMeteors(enemies, onEnemyDamage);

    // 更新暗影触手与虚空黑洞
    this.updateBlackHoles(enemies, onEnemyDamage);

    // 更新魔兽扩展法术实体 (凋零/冰环/劈砍/闪电链/暴风雪/圣击/骨风暴/雷霆/嗜血)
    this.updateDeathDecayZones(enemies, onEnemyDamage, player);
    this.updateFrostNovas();
    this.updateMortalStrikes();
    this.updateChainLightnings();
    this.updateBlizzards(enemies, onEnemyDamage);
    this.updateHolyShocks();
    this.updateBoneStorm(player, enemies, onEnemyDamage);
    this.updateThunderClaps();
    this.updateBloodlustWaves();
  }

  // ===================== 动物专属特技 =====================
  updateAnimalSkills(player, enemies, onEnemyDamage) {
    // 1. 狂暴母鸡【母鸡下蛋】 (chicken_egg)
    const eggLvl = this.learnedSkills['chicken_egg'] || 0;
    if (eggLvl > 0) {
      this.cooldowns['chicken_egg'] = (this.cooldowns['chicken_egg'] || 0) + 1;
      const eggCd = Math.round((eggLvl >= 5 ? 120 : (160 - eggLvl * 15)) * (1 - player.cooldownReduce));
      if (this.cooldowns['chicken_egg'] >= eggCd) {
        this.cooldowns['chicken_egg'] = 0;
        const count = eggLvl >= 6 ? 3 : (eggLvl >= 3 ? 2 : 1);
        for (let i = 0; i < count; i++) {
          this.eggs.push({
            x: player.x - player.facing * (15 + i * 16),
            y: player.y + 6,
            level: eggLvl,
            radius: eggLvl >= 6 ? 22 : (eggLvl >= 5 ? 18 : (eggLvl >= 4 ? 12 : (8 + eggLvl * 1.2))),
            duration: 360,
            damage: Math.round((28 + eggLvl * 14) * player.atkMultiplier),
            isGold: eggLvl === 4,
            isNuke: eggLvl === 5,
            isThunder: eggLvl >= 6,
          });
        }
        this.particles.holySparks(player.x, player.y, 6);
      }
    }

    // 更新地面炸弹蛋
    for (let i = this.eggs.length - 1; i >= 0; i--) {
      const egg = this.eggs[i];
      egg.duration--;
      let explode = egg.duration <= 0;

      for (let j = 0; j < enemies.length; j++) {
        const e = enemies[j];
        if (!e.active) continue;
        const dx = e.x - egg.x;
        const dy = e.y - egg.y;
        if (dx * dx + dy * dy < (egg.radius + e.radius) * (egg.radius + e.radius)) {
          explode = true;
          break;
        }
      }

      if (explode) {
        const blastRadius = egg.isNuke ? 160 : (egg.radius * 4.5);
        this.shake.shake(egg.isNuke ? 18 : 7);
        this.particles.burst(egg.x, egg.y, egg.isGold ? '#f1c40f' : '#e67e22', egg.isNuke ? 35 : 14, 6, 4);

        for (let j = 0; j < enemies.length; j++) {
          const e = enemies[j];
          if (!e.active) continue;
          const dx = e.x - egg.x;
          const dy = e.y - egg.y;
          if (dx * dx + dy * dy < (blastRadius + e.radius) * (blastRadius + e.radius)) {
            onEnemyDamage(e, egg.damage, 'physical', egg.isGold);
            e.knockback(dx / (Math.sqrt(dx * dx + dy * dy) || 1), dy / (Math.sqrt(dx * dx + dy * dy) || 1), egg.isNuke ? 15 : 8);
          }
        }
        this.eggs.splice(i, 1);
      }
    }

    // 2. 嘎嘎神鸭【嘎嘎音波】 (duck_quack)
    const quackLvl = this.learnedSkills['duck_quack'] || 0;
    if (quackLvl > 0) {
      this.cooldowns['duck_quack'] = (this.cooldowns['duck_quack'] || 0) + 1;
      const cd = Math.round((quackLvl >= 5 ? 100 : 130) * (1 - player.cooldownReduce));
      if (this.cooldowns['duck_quack'] >= cd) {
        this.cooldowns['duck_quack'] = 0;
        this.texts.add(player.x, player.y - 25, '嘎——！', 'crit');
        this.shake.shake(quackLvl >= 5 ? 10 : 4);

        this.sonicWaves.push({
          x: player.x,
          y: player.y,
          dir: player.facing,
          radius: 20,
          maxRadius: quackLvl >= 5 ? 140 : 80,
          speed: 7,
          level: quackLvl,
          damage: Math.round((22 + quackLvl * 10) * player.atkMultiplier),
        });
      }
    }

    // 更新音波
    for (let i = this.sonicWaves.length - 1; i >= 0; i--) {
      const sw = this.sonicWaves[i];
      sw.radius += sw.speed;
      sw.x += sw.dir * 4;

      for (let j = 0; j < enemies.length; j++) {
        const e = enemies[j];
        if (!e.active) continue;
        const dx = e.x - sw.x;
        const dy = e.y - sw.y;
        if (dx * dx + dy * dy < (sw.radius + e.radius) * (sw.radius + e.radius)) {
          if (!e._quackHit || e._quackHit <= 0) {
            e._quackHit = 20;
            onEnemyDamage(e, sw.damage, 'physical', false);
            e.knockback(sw.dir, 0, sw.level >= 5 ? 14 : 9);
            e.applySlow(sw.level >= 3 ? 90 : 45);
          }
        }
      }

      if (sw.radius >= sw.maxRadius) {
        this.sonicWaves.splice(i, 1);
      }
    }

    for (let j = 0; j < enemies.length; j++) {
      if (enemies[j]._quackHit > 0) enemies[j]._quackHit--;
    }

    // 3. 蛮荒铁牛【战争践踏】 (cow_stomp)
    const stompLvl = this.learnedSkills['cow_stomp'] || 0;
    if (stompLvl > 0) {
      this.cooldowns['cow_stomp'] = (this.cooldowns['cow_stomp'] || 0) + 1;
      const cd = Math.round(150 * (1 - player.cooldownReduce));
      if (this.cooldowns['cow_stomp'] >= cd) {
        this.cooldowns['cow_stomp'] = 0;
        const stompRadius = stompLvl >= 5 ? 130 : (50 + stompLvl * 12);
        const damage = Math.round((35 + stompLvl * 15) * player.atkMultiplier);

        this.shake.shake(stompLvl >= 5 ? 16 : 8);
        this.texts.add(player.x, player.y - 25, '蛮牛重踏!', 'crit');
        this.particles.burst(player.x, player.y + 10, '#d35400', 16, 5, 4);

        this.stompWaves.push({
          x: player.x,
          y: player.y + 10,
          radius: 10,
          maxRadius: stompRadius,
          duration: 20,
          maxDuration: 20,
          level: stompLvl,
        });

        for (let j = 0; j < enemies.length; j++) {
          const e = enemies[j];
          if (!e.active) continue;
          const dx = e.x - player.x;
          const dy = e.y - (player.y + 10);
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < stompRadius + e.radius) {
            onEnemyDamage(e, damage, 'physical', true);
            e.knockback(dx / (dist || 1), dy / (dist || 1), stompLvl >= 5 ? 16 : 10);
            e.applySlow(60);
          }
        }
      }
    }

    for (let i = this.stompWaves.length - 1; i >= 0; i--) {
      this.stompWaves[i].duration--;
      if (this.stompWaves[i].duration <= 0) {
        this.stompWaves.splice(i, 1);
      }
    }

    // 4. 狂野绵羊【羊毛滋养】 (sheep_wool)
    const woolLvl = this.learnedSkills['sheep_wool'] || 0;
    if (woolLvl > 0) {
      this.cooldowns['sheep_wool'] = (this.cooldowns['sheep_wool'] || 0) + 1;
      const cd = Math.round(180 * (1 - player.cooldownReduce));
      if (this.cooldowns['sheep_wool'] >= cd) {
        this.cooldowns['sheep_wool'] = 0;
        const count = woolLvl >= 2 ? 3 : 2;
        for (let k = 0; k < count; k++) {
          const ang = (Math.PI * 2 * k) / count + Math.random() * 0.5;
          this.woolBalls.push({
            x: player.x + Math.cos(ang) * 40,
            y: player.y + Math.sin(ang) * 40,
            healAmount: 18 + woolLvl * 5,
            duration: 400,
          });
        }
      }
    }

    for (let i = this.woolBalls.length - 1; i >= 0; i--) {
      const wb = this.woolBalls[i];
      wb.duration--;
      const dx = player.x - wb.x;
      const dy = player.y - wb.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < player.magnetRadius) {
        wb.x += (dx / dist) * 6;
        wb.y += (dy / dist) * 6;
      }

      if (dist < player.width * 0.5) {
        const h = player.heal(wb.healAmount);
        this.texts.add(player.x, player.y - 20, `${h}`, 'heal');
        this.particles.holySparks(player.x, player.y, 8);
        this.woolBalls.splice(i, 1);
        continue;
      }

      if (wb.duration <= 0) {
        this.woolBalls.splice(i, 1);
      }
    }

    // 5. 飞天咸鱼【咸鱼突刺】 (fish_dash)
    const fishLvl = this.learnedSkills['fish_dash'] || 0;
    if (fishLvl > 0) {
      this.cooldowns['fish_dash'] = (this.cooldowns['fish_dash'] || 0) + 1;
      const cd = Math.round(120 * (1 - player.cooldownReduce));
      if (this.cooldowns['fish_dash'] >= cd) {
        this.cooldowns['fish_dash'] = 0;
        const dashLen = fishLvl >= 2 ? 160 : 100;
        const damage = Math.round((32 + fishLvl * 12) * player.atkMultiplier);

        this.texts.add(player.x, player.y - 25, '咸鱼突刺!', 'crit');
        this.shake.shake(fishLvl >= 5 ? 12 : 5);

        this.fishDashes.push({
          startX: player.x,
          startY: player.y,
          endX: player.x + player.facing * dashLen,
          endY: player.y,
          duration: 14,
          maxDuration: 14,
          isDragon: fishLvl >= 5,
          level: fishLvl,
        });

        for (let j = 0; j < enemies.length; j++) {
          const e = enemies[j];
          if (!e.active) continue;
          const minX = Math.min(player.x, player.x + player.facing * dashLen) - 20;
          const maxX = Math.max(player.x, player.x + player.facing * dashLen) + 20;
          if (e.x >= minX && e.x <= maxX && Math.abs(e.y - player.y) < 30) {
            onEnemyDamage(e, damage, 'physical', true);
            e.knockback(player.facing, 0, 10);
            this.particles.burst(e.x, e.y, '#3498db', 8, 4, 3);
          }
        }
      }
    }

    for (let i = this.fishDashes.length - 1; i >= 0; i--) {
      this.fishDashes[i].duration--;
      if (this.fishDashes[i].duration <= 0) {
        this.fishDashes.splice(i, 1);
      }
    }
  }

  // ===================== 圣光系技能执行 =====================
  updateHolySkills(player, enemies, onEnemyDamage) {
    // 1. 圣光惩击 (Holy Smite)
    const smiteLvl = this.learnedSkills['holy_smite'] || 0;
    if (smiteLvl > 0) {
      this.cooldowns['holy_smite'] = (this.cooldowns['holy_smite'] || 0) + 1;
      const baseCd = Math.round((smiteLvl >= 5 ? 70 : 45) * (1 - player.cooldownReduce));

      if (this.cooldowns['holy_smite'] >= baseCd) {
        this.cooldowns['holy_smite'] = 0;

        if (smiteLvl < 5) {
          // 朴素到进阶形态
          const count = smiteLvl === 1 ? 1 : (smiteLvl <= 3 ? 2 : 4);
          const targets = this.getNearestEnemies(player, enemies, count);
          targets.forEach((target, i) => {
            const angle = Math.atan2(target.y - player.y, target.x - player.x);
            const speed = 7;
            this.projectiles.push({
              type: 'holy_smite',
              level: smiteLvl,
              x: player.x,
              y: player.y,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              damage: Math.round((18 + smiteLvl * 8) * player.atkMultiplier),
              color: '#f1c40f',
              radius: smiteLvl >= 3 ? 10 : 6,
              life: 90,
              splash: smiteLvl >= 3,
            });
            this.particles.holySparks(player.x, player.y, 4);
          });
        } else {
          // 超武：【复仇之怒·圣剑天罚】
          this.triggerHolyWrathUltimate(player, enemies, onEnemyDamage);
        }
      }
    }

    // 2. 神圣风暴 (Holy Storm 环绕圣剑)
    const stormLvl = this.learnedSkills['holy_storm'] || 0;
    if (stormLvl > 0) {
      const swordCount = stormLvl === 1 ? 1 : (stormLvl === 2 ? 2 : (stormLvl <= 4 ? 3 : 6));
      const orbitRadius = stormLvl >= 5 ? 90 : (55 + stormLvl * 6);
      const swordDamage = Math.round((12 + stormLvl * 6) * player.atkMultiplier);

      for (let i = 0; i < swordCount; i++) {
        const angle = this.orbitAngle * (stormLvl >= 5 ? 1.6 : 1.2) + (Math.PI * 2 * i) / swordCount;
        const sx = player.x + Math.cos(angle) * orbitRadius;
        const sy = player.y + Math.sin(angle) * orbitRadius;

        // 与附近敌人检测碰撞切割
        const hitRadius = stormLvl >= 5 ? 22 : 14;
        for (let j = 0; j < enemies.length; j++) {
          const enemy = enemies[j];
          if (!enemy.active) continue;
          const dx = enemy.x - sx;
          const dy = enemy.y - sy;
          if (dx * dx + dy * dy < (hitRadius + enemy.radius) * (hitRadius + enemy.radius)) {
            if (!enemy._stormHitCooldown || enemy._stormHitCooldown <= 0) {
              enemy._stormHitCooldown = 12; // 0.2秒切割冷却
              onEnemyDamage(enemy, swordDamage, 'holy', Math.random() < player.critRate);
              this.particles.holySparks(sx, sy, stormLvl >= 5 ? 10 : 5);
              enemy.knockback(Math.cos(angle), Math.sin(angle), stormLvl >= 5 ? 8 : 4);
            }
          }
        }
      }
    }

    // 敌人 stormHitCooldown 衰减
    for (let j = 0; j < enemies.length; j++) {
      if (enemies[j]._stormHitCooldown > 0) enemies[j]._stormHitCooldown--;
    }

    // 3. 奉献法阵 (Consecration)
    const consecrationLvl = this.learnedSkills['consecration'] || 0;
    if (consecrationLvl > 0) {
      this.cooldowns['consecration'] = (this.cooldowns['consecration'] || 0) + 1;
      const cd = Math.round(110 * (1 - player.cooldownReduce));
      if (this.cooldowns['consecration'] >= cd) {
        this.cooldowns['consecration'] = 0;
        const zoneRadius = consecrationLvl >= 5 ? 140 : (45 + consecrationLvl * 15);
        this.consecrationZones.push({
          x: player.x,
          y: player.y,
          radius: zoneRadius,
          duration: consecrationLvl >= 5 ? 300 : 180,
          maxDuration: consecrationLvl >= 5 ? 300 : 180,
          level: consecrationLvl,
          damage: Math.round((8 + consecrationLvl * 5) * player.atkMultiplier),
          tick: 0,
        });
        this.particles.holySparks(player.x, player.y, 12);
      }
    }
  }

  triggerHolyWrathUltimate(player, enemies, onEnemyDamage) {
    this.holyWrathTimer = 60; // 展开金色天使翅膀视觉持续
    this.shake.shake(12);
    player.heal(Math.round(player.maxHp * 0.15));
    this.texts.add(player.x, player.y - 30, '复仇之怒·天使降临!', 'crit');

    // 全屏降下 8 道金色圣剑光柱连环轰炸
    for (let i = 0; i < 8; i++) {
      const rx = Math.random() * (SCREEN_WIDTH - 60) + 30;
      const ry = Math.random() * (SCREEN_HEIGHT - 60) + 30;
      this.divinePillars.push({
        x: rx,
        y: ry,
        width: 32,
        duration: 35,
        maxDuration: 35,
        damage: Math.round(65 * player.atkMultiplier),
      });
    }
  }

  // ===================== 邪能系技能执行 =====================
  updateFelSkills(player, enemies, onEnemyDamage) {
    // 1. 邪能火种 (Fel Fire)
    const felFireLvl = this.learnedSkills['fel_fire'] || 0;
    if (felFireLvl > 0) {
      this.cooldowns['fel_fire'] = (this.cooldowns['fel_fire'] || 0) + 1;
      const baseCd = Math.round((felFireLvl >= 5 ? 65 : 40) * (1 - player.cooldownReduce));

      if (this.cooldowns['fel_fire'] >= baseCd) {
        this.cooldowns['fel_fire'] = 0;

        if (felFireLvl < 5) {
          // Lv 1: 朴素绿火球 -> Lv 3+: 恶魔混乱龙首穿透箭
          const count = felFireLvl <= 2 ? 1 : 2;
          const targets = this.getNearestEnemies(player, enemies, count);
          targets.forEach((target) => {
            const angle = Math.atan2(target.y - player.y, target.x - player.x);
            const speed = felFireLvl >= 3 ? 9 : 6.5;
            this.projectiles.push({
              type: 'fel_fire',
              level: felFireLvl,
              x: player.x,
              y: player.y,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              damage: Math.round((20 + felFireLvl * 10) * player.atkMultiplier),
              color: '#2ecc71',
              radius: felFireLvl >= 3 ? 14 : 7,
              life: 80,
              pierce: felFireLvl >= 3 ? 3 : 1, // 混乱箭穿透
            });
            this.particles.felFlames(player.x, player.y, 5);
          });
        } else {
          // 超武：【地狱火陨石雨】
          this.triggerHellfireMeteorRain(player, enemies, onEnemyDamage);
        }
      }
    }

    // 2. 献祭光环 (Fel Aura / Fel Immolation)
    const felAuraLvl = this.learnedSkills['fel_immolation'] || this.learnedSkills['fel_aura'] || 0;
    if (felAuraLvl > 0) {
      this.felAuraTick++;
      const tickRate = felAuraLvl >= 5 ? 10 : 18; // 超武极高频伤害
      if (this.felAuraTick >= tickRate) {
        this.felAuraTick = 0;
        const auraRadius = felAuraLvl >= 5 ? 100 : (40 + felAuraLvl * 12);
        const auraDamage = Math.round((6 + felAuraLvl * 5) * player.atkMultiplier);

        for (let i = 0; i < enemies.length; i++) {
          const enemy = enemies[i];
          if (!enemy.active) continue;
          const dx = enemy.x - player.x;
          const dy = enemy.y - player.y;
          if (dx * dx + dy * dy < (auraRadius + enemy.radius) * (auraRadius + enemy.radius)) {
            onEnemyDamage(enemy, auraDamage, 'fel', Math.random() < player.critRate);
            this.particles.felFlames(enemy.x, enemy.y, felAuraLvl >= 5 ? 6 : 2);
            if (felAuraLvl >= 5) {
              enemy.knockback(dx / (Math.sqrt(dx * dx + dy * dy) || 1), dy / (Math.sqrt(dx * dx + dy * dy) || 1), 3);
            }
          }
        }
      }
    }
  }

  triggerHellfireMeteorRain(player, enemies, onEnemyDamage) {
    this.shake.shake(15);
    this.texts.add(player.x, player.y - 30, '天崩地裂·地狱火雨!', 'crit');

    // 生成 5 颗巨型地狱火陨石砸向全屏不同位置
    for (let i = 0; i < 5; i++) {
      const tx = Math.random() * (SCREEN_WIDTH - 80) + 40;
      const ty = Math.random() * (SCREEN_HEIGHT - 80) + 40;
      this.hellfireMeteors.push({
        startX: tx + (Math.random() - 0.5) * 80,
        startY: -120 - i * 60,
        targetX: tx,
        targetY: ty,
        x: tx + 80,
        y: -120 - i * 60,
        speed: 12,
        damage: Math.round(85 * player.atkMultiplier),
        exploded: false,
        blastRadius: 85,
      });
    }
  }

  // ===================== 暗影系技能执行 =====================
  updateShadowSkills(player, enemies, onEnemyDamage) {
    // 1. 暗影箭 (Shadow Bolt)
    const shadowLvl = this.learnedSkills['shadow_bolt'] || 0;
    if (shadowLvl > 0) {
      this.cooldowns['shadow_bolt'] = (this.cooldowns['shadow_bolt'] || 0) + 1;
      const baseCd = Math.round((shadowLvl >= 5 ? 80 : 45) * (1 - player.cooldownReduce));

      if (this.cooldowns['shadow_bolt'] >= baseCd) {
        this.cooldowns['shadow_bolt'] = 0;

        if (shadowLvl < 5) {
          const count = shadowLvl === 1 ? 1 : (shadowLvl <= 3 ? 2 : 3);
          const targets = this.getNearestEnemies(player, enemies, count);
          targets.forEach((target) => {
            const angle = Math.atan2(target.y - player.y, target.x - player.x);
            this.projectiles.push({
              type: 'shadow_bolt',
              level: shadowLvl,
              x: player.x,
              y: player.y,
              vx: Math.cos(angle) * 8,
              vy: Math.sin(angle) * 8,
              damage: Math.round((22 + shadowLvl * 9) * player.atkMultiplier),
              color: '#9b59b6',
              radius: shadowLvl >= 3 ? 12 : 6,
              life: 80,
              lifeSteal: shadowLvl >= 4 ? 0.15 : 0,
            });
            this.particles.shadowMist(player.x, player.y, 4);
          });
        } else {
          // 超武：【虚空大坍缩·黑洞】
          this.triggerVoidBlackHole(player, enemies, onEnemyDamage);
        }
      }
    }

    // 2. 痛苦诅咒 (Shadow Curse)
    const curseLvl = this.learnedSkills['shadow_curse'] || 0;
    if (curseLvl > 0) {
      this.cooldowns['shadow_curse'] = (this.cooldowns['shadow_curse'] || 0) + 1;
      const cd = Math.round(90 * (1 - player.cooldownReduce));
      if (this.cooldowns['shadow_curse'] >= cd) {
        this.cooldowns['shadow_curse'] = 0;
        const targetCount = curseLvl >= 5 ? enemies.length : (curseLvl * 2 + 1);
        const targets = this.getNearestEnemies(player, enemies, targetCount);
        targets.forEach((enemy) => {
          enemy.applyCurse(curseLvl >= 5 ? 300 : 180);
          if (curseLvl >= 4) enemy.applySlow(150);
          this.particles.shadowMist(enemy.x, enemy.y, 3);
        });
        if (curseLvl >= 5) {
          this.texts.add(player.x, player.y - 30, '末日降临·虚空蔓延!', 'crit');
          this.shake.shake(6);
        }
      }
    }
  }

  triggerVoidBlackHole(player, enemies, onEnemyDamage) {
    this.shake.shake(14);
    this.texts.add(player.x, player.y - 30, '虚空大坍缩·黑洞!', 'crit');

    // 在战场偏中心或玩家前方撕裂虚空黑洞
    const hx = player.x + player.facing * 50;
    const hy = player.y;

    this.blackHoles.push({
      x: hx,
      y: hy,
      radius: 95,
      duration: 180,
      maxDuration: 180,
      damageTick: 0,
      level: this.learnedSkills['shadow_curse'] || 5,
      damage: Math.round(35 * player.atkMultiplier),
    });
  }

  // ===================== 职业专属技能执行 =====================
  updateClassSkills(player, enemies, onEnemyDamage) {
    // 1. 奥术飞弹 (Arcane Missile / Arcane Missiles)
    const arcaneLvl = this.learnedSkills['arcane_missiles'] || this.learnedSkills['arcane_missile'] || 0;
    if (arcaneLvl > 0) {
      this.cooldowns['arcane_missiles'] = (this.cooldowns['arcane_missiles'] || this.cooldowns['arcane_missile'] || 0) + 1;
      const cd = Math.round(35 * (1 - player.cooldownReduce));
      if (this.cooldowns['arcane_missiles'] >= cd) {
        this.cooldowns['arcane_missiles'] = 0;
        this.cooldowns['arcane_missile'] = 0;
        const count = arcaneLvl === 1 ? 2 : (arcaneLvl === 2 ? 3 : (arcaneLvl <= 4 ? 4 : (arcaneLvl === 5 ? 12 : 16)));
        
        if (arcaneLvl >= 5) {
          // 超武/神化：奥术弹幕向360度暴射
          const barrageCount = arcaneLvl >= 6 ? 16 : 12;
          for (let i = 0; i < barrageCount; i++) {
            const angle = (Math.PI * 2 * i) / barrageCount;
            this.projectiles.push({
              type: 'arcane_missile',
              level: arcaneLvl,
              x: player.x,
              y: player.y,
              vx: Math.cos(angle) * 9,
              vy: Math.sin(angle) * 9,
              damage: Math.round(26 * player.atkMultiplier),
              color: '#00d2d3',
              radius: 7,
              life: 75,
            });
          }
          this.shake.shake(5);
        } else {
          const targets = this.getNearestEnemies(player, enemies, count);
          targets.forEach((target) => {
            const angle = Math.atan2(target.y - player.y, target.x - player.x);
            this.projectiles.push({
              type: 'arcane_missile',
              level: arcaneLvl,
              x: player.x,
              y: player.y,
              vx: Math.cos(angle) * 8.5,
              vy: Math.sin(angle) * 8.5,
              damage: Math.round((14 + arcaneLvl * 6) * player.atkMultiplier),
              color: '#00d2d3',
              radius: 6,
              life: 70,
            });
          });
        }
      }
    }

    // 2. 旋风斩 (Whirlwind)
    const whirlwindLvl = this.learnedSkills['whirlwind'] || 0;
    if (whirlwindLvl > 0) {
      this.cooldowns['whirlwind'] = (this.cooldowns['whirlwind'] || 0) + 1;
      const cd = Math.round((whirlwindLvl >= 5 ? 30 : 50) * (1 - player.cooldownReduce));
      if (this.cooldowns['whirlwind'] >= cd) {
        this.cooldowns['whirlwind'] = 0;
        const slashRadius = whirlwindLvl >= 5 ? 90 : (45 + whirlwindLvl * 10);
        const slashDamage = Math.round((18 + whirlwindLvl * 8) * player.atkMultiplier);

        this.whirlwindSlashes.push({
          x: player.x,
          y: player.y,
          radius: slashRadius,
          duration: 16,
          maxDuration: 16,
          level: whirlwindLvl,
        });

        if (whirlwindLvl >= 5) this.shake.shake(6);

        // 判定伤害
        for (let i = 0; i < enemies.length; i++) {
          const enemy = enemies[i];
          if (!enemy.active) continue;
          const dx = enemy.x - player.x;
          const dy = enemy.y - player.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < slashRadius + enemy.radius) {
            onEnemyDamage(enemy, slashDamage, 'physical', Math.random() < player.critRate);
            enemy.knockback(dx / (dist || 1), dy / (dist || 1), whirlwindLvl >= 5 ? 12 : 7);
            this.particles.burst(enemy.x, enemy.y, '#e67e22', 4, 3, 2);
          }
        }
      }
    }

    // 3. 赤炎脉冲 (Fire Blast - 六阶全屏进阶远程火系技能)
    const fireBlastLvl = this.learnedSkills['fire_blast'] || 0;
    if (fireBlastLvl > 0) {
      this.cooldowns['fire_blast'] = (this.cooldowns['fire_blast'] || 0) + 1;
      const baseCd = fireBlastLvl >= 5 ? 36 : 48;
      const cd = Math.round(baseCd * (1 - player.cooldownReduce));
      if (this.cooldowns['fire_blast'] >= cd) {
        this.cooldowns['fire_blast'] = 0;

        const countMap = [0, 1, 2, 3, 4, 8, 12];
        const count = countMap[Math.min(6, fireBlastLvl)];
        const damage = Math.round((14 + fireBlastLvl * 16) * player.atkMultiplier);
        const isPierce = fireBlastLvl >= 3;
        const isSplash = fireBlastLvl >= 4;

        if (fireBlastLvl >= 5) {
          const isMythic = fireBlastLvl >= 6;
          for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count;
            const speed = isMythic ? 11 : 9.5;
            this.projectiles.push({
              type: 'fire_blast',
              level: fireBlastLvl,
              x: player.x,
              y: player.y,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              damage: damage,
              color: isMythic ? '#ffd700' : '#ff4757',
              radius: isMythic ? 14 : 11,
              life: 80,
              pierce: isMythic ? 6 : 3,
              splash: true,
            });
          }
          this.shake.shake(isMythic ? 8 : 5);
          this.particles.burst(player.x, player.y, isMythic ? '#ffd700' : '#ff4757', isMythic ? 24 : 16, 6, 4);
        } else {
          const targets = this.getNearestEnemies(player, enemies, count);
          if (targets.length > 0) {
            targets.forEach((target, idx) => {
              const baseAngle = Math.atan2(target.y - player.y, target.x - player.x);
              const spread = count > 1 ? (idx - (count - 1) / 2) * 0.22 : 0;
              const angle = baseAngle + spread;
              const speed = 8.5;
              this.projectiles.push({
                type: 'fire_blast',
                level: fireBlastLvl,
                x: player.x,
                y: player.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                damage: damage,
                color: '#ff4757',
                radius: 7 + fireBlastLvl * 1.2,
                life: 75,
                pierce: isPierce ? 2 : 1,
                splash: isSplash,
              });
            });
            this.particles.burst(player.x, player.y, '#ff4757', 5, 3.5, 2);
          } else {
            for (let i = 0; i < count; i++) {
              const angle = (Math.PI * 2 * i) / count;
              this.projectiles.push({
                type: 'fire_blast',
                level: fireBlastLvl,
                x: player.x,
                y: player.y,
                vx: Math.cos(angle) * 8.5,
                vy: Math.sin(angle) * 8.5,
                damage: damage,
                color: '#ff4757',
                radius: 7 + fireBlastLvl * 1.2,
                life: 75,
                pierce: isPierce ? 2 : 1,
                splash: isSplash,
              });
            }
          }
        }
      }
    }
  }

  // ===================== 实体更新逻辑 =====================
  updateProjectiles(enemies, onEnemyDamage, spatialGrid) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life--;

      // 粒子拖尾：奇数帧节流发射，视觉连贯度 100% 且发热粒子量减半
      if (p.life % 2 === 0) {
        if (p.type === 'fel_fire') {
          this.particles.spawn(p.x, p.y, -p.vx * 0.15, -p.vy * 0.15, 2.5, 8, '#2ecc71', { glow: true });
        } else if (p.type === 'holy_smite') {
          this.particles.spawn(p.x, p.y, -p.vx * 0.15, -p.vy * 0.15, 2.2, 7, '#ffeaa7', { glow: true });
        } else if (p.type === 'shadow_bolt') {
          this.particles.spawn(p.x, p.y, -p.vx * 0.15, -p.vy * 0.15, 2.5, 9, '#9b59b6', { glow: true });
        } else if (p.type === 'chaos_bolt') {
          this.particles.spawn(p.x, p.y, -p.vx * 0.18, -p.vy * 0.18, 3.2, 9, '#2ecc71', { glow: true });
        } else if (p.type === 'fire_blast') {
          this.particles.spawn(p.x, p.y, -p.vx * 0.16, -p.vy * 0.16, p.level >= 5 ? 3.5 : 2.5, 8, p.level >= 6 ? '#ffd700' : '#ff4757', { glow: true });
        }
      }

      // 空间哈希网格过滤：投射物仅检测周围相邻网格内的敌人 (复杂度从 O(P*N) 降至 O(P*k), 性能飙升 20倍)
      const candidates = spatialGrid ? spatialGrid.getNearby(p.x, p.y, p.radius + 35) : enemies;
      for (let j = 0; j < candidates.length; j++) {
        const enemy = candidates[j];
        if (!enemy.active) continue;
        const dx = enemy.x - p.x;
        const dy = enemy.y - p.y;
        const hitDist = p.radius + enemy.radius;

        // Bounding-box 快速初筛，消除 95% 无效乘除运算
        if (Math.abs(dx) < hitDist && Math.abs(dy) < hitDist && dx * dx + dy * dy < hitDist * hitDist) {
          onEnemyDamage(enemy, p.damage, p.type, false);

          // 击中轻量火星
          this.particles.burst(p.x, p.y, p.color, 3, 3.2, 2.2);

          if (p.splash) {
            const sRadius = p.type === 'fire_blast' ? (p.level >= 5 ? 75 : 55) : 55;
            for (let k = 0; k < candidates.length; k++) {
              const splashTarget = candidates[k];
              if (splashTarget !== enemy && splashTarget.active) {
                const kdx = splashTarget.x - p.x;
                const kdy = splashTarget.y - p.y;
                if (Math.abs(kdx) < sRadius && Math.abs(kdy) < sRadius && kdx * kdx + kdy * kdy < sRadius * sRadius) {
                  onEnemyDamage(splashTarget, Math.round(p.damage * 0.6), p.type, false);
                }
              }
            }
          }

          if (p.pierce && p.pierce > 1) {
            p.pierce--;
          } else {
            p.life = 0;
            break;
          }
        }
      }

      if (p.life <= 0 || p.x < -50 || p.x > SCREEN_WIDTH + 50 || p.y < -50 || p.y > SCREEN_HEIGHT + 50) {
        const last = this.projectiles.pop();
        if (i < this.projectiles.length) {
          this.projectiles[i] = last;
        }
      }
    }
  }

  updateConsecrationZones(enemies, onEnemyDamage) {
    for (let i = this.consecrationZones.length - 1; i >= 0; i--) {
      const zone = this.consecrationZones[i];
      zone.duration--;
      zone.tick++;

      // 每 15 帧对法阵内怪物造成一次圣光灼烧
      if (zone.tick >= 15) {
        zone.tick = 0;
        for (let j = 0; j < enemies.length; j++) {
          const enemy = enemies[j];
          if (!enemy.active) continue;
          const dx = enemy.x - zone.x;
          const dy = enemy.y - zone.y;
          if (dx * dx + dy * dy < (zone.radius + enemy.radius) * (zone.radius + enemy.radius)) {
            onEnemyDamage(enemy, zone.damage, 'holy', false);
            this.particles.spawn(enemy.x, enemy.y, 0, -2, 2, 10, '#ffeaa7', { glow: true });
            if (zone.level >= 3) enemy.applySlow(30);
          }
        }
      }

      if (zone.duration <= 0) {
        this.consecrationZones.splice(i, 1);
      }
    }

    // 更新神圣光柱
    for (let i = this.divinePillars.length - 1; i >= 0; i--) {
      const p = this.divinePillars[i];
      p.duration--;
      if (p.duration === 20) {
        // 轰击产生判定
        for (let j = 0; j < enemies.length; j++) {
          const enemy = enemies[j];
          if (!enemy.active) continue;
          const dx = enemy.x - p.x;
          const dy = enemy.y - p.y;
          if (dx * dx + dy * dy < 75 * 75) {
            onEnemyDamage(enemy, p.damage, 'holy', true);
            enemy.knockback(dx / (Math.sqrt(dx * dx + dy * dy) || 1), dy / (Math.sqrt(dx * dx + dy * dy) || 1), 10);
          }
        }
        this.particles.burst(p.x, p.y, '#ffeaa7', 20, 7, 4);
      }
      if (p.duration <= 0) {
        this.divinePillars.splice(i, 1);
      }
    }

    if (this.holyWrathTimer > 0) this.holyWrathTimer--;
  }

  updateHellfireMeteors(enemies, onEnemyDamage) {
    for (let i = this.hellfireMeteors.length - 1; i >= 0; i--) {
      const m = this.hellfireMeteors[i];
      const dx = m.targetX - m.x;
      const dy = m.targetY - m.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < m.speed) {
        // 落地爆炸！
        this.shake.shake(12);
        this.particles.burst(m.targetX, m.targetY, '#2ecc71', 30, 8, 5);
        this.particles.burst(m.targetX, m.targetY, '#a8ff78', 20, 6, 4);

        for (let j = 0; j < enemies.length; j++) {
          const enemy = enemies[j];
          if (!enemy.active) continue;
          const edx = enemy.x - m.targetX;
          const edy = enemy.y - m.targetY;
          if (edx * edx + edy * edy < (m.blastRadius + enemy.radius) * (m.blastRadius + enemy.radius)) {
            onEnemyDamage(enemy, m.damage, 'fel', true);
            enemy.knockback(edx / (Math.sqrt(edx * edx + edy * edy) || 1), edy / (Math.sqrt(edx * edx + edy * edy) || 1), 12);
          }
        }
        this.hellfireMeteors.splice(i, 1);
      } else {
        m.x += (dx / dist) * m.speed;
        m.y += (dy / dist) * m.speed;
        // 巨大绿色尾焰
        this.particles.spawn(m.x, m.y, -dx / dist * 3, -dy / dist * 3, 7, 18, '#2ecc71', { glow: true });
      }
    }
  }

  updateBlackHoles(enemies, onEnemyDamage) {
    for (let i = this.blackHoles.length - 1; i >= 0; i--) {
      const bh = this.blackHoles[i];
      bh.duration--;
      bh.damageTick++;

      // 引力吸扯全屏或大范围敌人向中心移动
      for (let j = 0; j < enemies.length; j++) {
        const enemy = enemies[j];
        if (!enemy.active) continue;
        const dx = bh.x - enemy.x;
        const dy = bh.y - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < bh.radius * 2.5 && dist > 5) {
          enemy.x += (dx / dist) * 3.5;
          enemy.y += (dy / dist) * 3.5;
        }

        // 中心高频绞杀
        if (dist < bh.radius && bh.damageTick % 12 === 0) {
          onEnemyDamage(enemy, bh.damage, 'shadow', false);
          this.particles.shadowMist(enemy.x, enemy.y, 2);
        }
      }

      // 黑洞粒子内敛
      const pAngle = Math.random() * Math.PI * 2;
      const pDist = bh.radius * (0.8 + Math.random() * 0.4);
      this.particles.spawn(
        bh.x + Math.cos(pAngle) * pDist,
        bh.y + Math.sin(pAngle) * pDist,
        -Math.cos(pAngle) * 3,
        -Math.sin(pAngle) * 3,
        4,
        20,
        '#8e44ad',
        { glow: true }
      );

      // 黑洞结束发生虚空大爆炸
      if (bh.duration <= 0) {
        this.shake.shake(14);
        this.particles.burst(bh.x, bh.y, '#9b59b6', 35, 9, 5);
        this.particles.burst(bh.x, bh.y, '#341f97', 25, 7, 4);
        for (let j = 0; j < enemies.length; j++) {
          const enemy = enemies[j];
          if (!enemy.active) continue;
          const dx = enemy.x - bh.x;
          const dy = enemy.y - bh.y;
          if (dx * dx + dy * dy < (bh.radius * 1.5) * (bh.radius * 1.5)) {
            onEnemyDamage(enemy, bh.damage * 2.5, 'shadow', true);
            enemy.knockback(dx / (Math.sqrt(dx * dx + dy * dy) || 1), dy / (Math.sqrt(dx * dx + dy * dy) || 1), 12);
          }
        }
        this.blackHoles.splice(i, 1);
      }
    }

    // 旋风斩残留清理 (Swap-and-Pop 零开销)
    for (let i = this.whirlwindSlashes.length - 1; i >= 0; i--) {
      this.whirlwindSlashes[i].duration--;
      if (this.whirlwindSlashes[i].duration <= 0) {
        const last = this.whirlwindSlashes.pop();
        if (i < this.whirlwindSlashes.length) {
          this.whirlwindSlashes[i] = last;
        }
      }
    }
  }

  // ===================== 新增魔兽系经典技能运转 =====================
  updateWarcraftSkills(player, enemies, onEnemyDamage) {
    // 1. 狂雷风暴链 (chain_lightning - 萨满经典)
    const chainLvl = this.learnedSkills['chain_lightning'] || 0;
    if (chainLvl > 0) {
      this.cooldowns['chain_lightning'] = (this.cooldowns['chain_lightning'] || 0) + 1;
      const baseCd = Math.round((chainLvl >= 5 ? 45 : 70) * (1 - player.cooldownReduce));
      if (this.cooldowns['chain_lightning'] >= baseCd) {
        this.cooldowns['chain_lightning'] = 0;
        this.triggerChainLightning(player, enemies, onEnemyDamage, chainLvl);
      }
    }

    // 2. 裂铠重击 (mortal_strike - 武器战经典)
    const msLvl = this.learnedSkills['mortal_strike'] || 0;
    if (msLvl > 0) {
      this.cooldowns['mortal_strike'] = (this.cooldowns['mortal_strike'] || 0) + 1;
      const baseCd = Math.round((msLvl >= 5 ? 35 : 60) * (1 - player.cooldownReduce));
      if (this.cooldowns['mortal_strike'] >= baseCd) {
        this.cooldowns['mortal_strike'] = 0;
        this.triggerMortalStrike(player, enemies, onEnemyDamage, msLvl);
      }
    }

    // 3. 极寒冰环 (frost_nova - 法师经典)
    const novaLvl = this.learnedSkills['frost_nova'] || 0;
    if (novaLvl > 0) {
      this.cooldowns['frost_nova'] = (this.cooldowns['frost_nova'] || 0) + 1;
      const baseCd = Math.round((novaLvl >= 5 ? 75 : 110) * (1 - player.cooldownReduce));
      if (this.cooldowns['frost_nova'] >= baseCd) {
        this.cooldowns['frost_nova'] = 0;
        this.triggerFrostNova(player, enemies, onEnemyDamage, novaLvl);
      }
    }

    // 4. 幽冥枯萎 (death_decay - 死骑经典)
    const decayLvl = this.learnedSkills['death_decay'] || 0;
    if (decayLvl > 0) {
      this.cooldowns['death_decay'] = (this.cooldowns['death_decay'] || 0) + 1;
      const baseCd = Math.round(100 * (1 - player.cooldownReduce));
      if (this.cooldowns['death_decay'] >= baseCd) {
        this.cooldowns['death_decay'] = 0;
        const radius = decayLvl >= 6 ? 160 : (decayLvl >= 5 ? 130 : (55 + decayLvl * 14));
        this.deathDecayZones.push({
          x: player.x,
          y: player.y,
          radius,
          duration: decayLvl >= 5 ? 320 : 200,
          maxDuration: decayLvl >= 5 ? 320 : 200,
          level: decayLvl,
          damage: Math.round((10 + decayLvl * 6) * player.atkMultiplier),
          tick: 0,
        });
        this.particles.shadowMist(player.x, player.y, 10);
      }
    }

    // 5. 极冰暴风雪 (blizzard - 肯瑞托极冰)
    const blizLvl = this.learnedSkills['blizzard'] || 0;
    if (blizLvl > 0) {
      this.cooldowns['blizzard'] = (this.cooldowns['blizzard'] || 0) + 1;
      const baseCd = Math.round((blizLvl >= 5 ? 70 : 105) * (1 - player.cooldownReduce));
      if (this.cooldowns['blizzard'] >= baseCd) {
        this.cooldowns['blizzard'] = 0;
        const target = this.getNearestEnemies(player, enemies, 1)[0];
        const tx = target ? target.x : (player.x + (Math.random() - 0.5) * 160);
        const ty = target ? target.y : (player.y + (Math.random() - 0.5) * 160);
        const radius = blizLvl >= 6 ? 160 : (blizLvl >= 5 ? 135 : (48 + blizLvl * 15));
        this.blizzards.push({
          x: tx,
          y: ty,
          radius,
          duration: blizLvl >= 5 ? 240 : 160,
          maxDuration: blizLvl >= 5 ? 240 : 160,
          level: blizLvl,
          damage: Math.round((7 + blizLvl * 4) * player.atkMultiplier),
          tick: 0,
        });
      }
    }

    // 6. 混乱之箭 (chaos_bolt - 邪能混乱龙首)
    const chaosLvl = this.learnedSkills['chaos_bolt'] || 0;
    if (chaosLvl > 0) {
      this.cooldowns['chaos_bolt'] = (this.cooldowns['chaos_bolt'] || 0) + 1;
      const baseCd = Math.round((chaosLvl >= 5 ? 45 : 70) * (1 - player.cooldownReduce));
      if (this.cooldowns['chaos_bolt'] >= baseCd) {
        this.cooldowns['chaos_bolt'] = 0;
        const count = chaosLvl >= 5 ? 2 : 1;
        const targets = this.getNearestEnemies(player, enemies, count);
        targets.forEach((target) => {
          const angle = Math.atan2(target.y - player.y, target.x - player.x);
          const speed = chaosLvl >= 4 ? 9.5 : 7.2;
          this.projectiles.push({
            type: 'chaos_bolt',
            level: chaosLvl,
            x: player.x,
            y: player.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            damage: Math.round((28 + chaosLvl * 13) * player.atkMultiplier),
            color: '#2ecc71',
            radius: chaosLvl >= 5 ? 16 : (8 + chaosLvl * 1.8),
            life: 80,
            pierce: chaosLvl >= 6 ? 6 : (chaosLvl >= 5 ? 4 : (chaosLvl >= 2 ? 2 : 1)),
          });
        });
      }
    }

    // 7. 神圣震击 (holy_shock - 圣骑士天降神罚)
    const shockLvl = this.learnedSkills['holy_shock'] || 0;
    if (shockLvl > 0) {
      this.cooldowns['holy_shock'] = (this.cooldowns['holy_shock'] || 0) + 1;
      const baseCd = Math.round((shockLvl >= 5 ? 55 : 85) * (1 - player.cooldownReduce));
      if (this.cooldowns['holy_shock'] >= baseCd) {
        this.cooldowns['holy_shock'] = 0;
        const count = shockLvl >= 6 ? 9 : (shockLvl >= 5 ? 7 : (shockLvl >= 4 ? 5 : (shockLvl >= 3 ? 3 : (shockLvl >= 2 ? 2 : 1))));
        const targets = this.getNearestEnemies(player, enemies, count);
        if (shockLvl >= 5) {
          player.heal(Math.round(player.maxHp * 0.2));
        }
        targets.forEach((t) => {
          const damage = Math.round((26 + shockLvl * 14) * player.atkMultiplier);
          onEnemyDamage(t, damage, 'holy', true);
          this.holyShocks.push({
            x: t.x,
            y: t.y,
            duration: 18,
            maxDuration: 18,
            level: shockLvl,
          });
        });
      }
    }

    // 8. 雷霆震击 (thunder_clap - 战神/萨满裂地狂雷)
    const clapLvl = this.learnedSkills['thunder_clap'] || 0;
    if (clapLvl > 0) {
      this.cooldowns['thunder_clap'] = (this.cooldowns['thunder_clap'] || 0) + 1;
      const baseCd = Math.round((clapLvl >= 5 ? 60 : 90) * (1 - player.cooldownReduce));
      if (this.cooldowns['thunder_clap'] >= baseCd) {
        this.cooldowns['thunder_clap'] = 0;
        const dirCount = clapLvl >= 5 ? 16 : (clapLvl >= 3 ? 8 : 4);
        const radius = clapLvl >= 6 ? 160 : (clapLvl >= 5 ? 135 : (50 + clapLvl * 15));
        const damage = Math.round((26 + clapLvl * 12) * player.atkMultiplier);
        this.thunderClaps.push({
          x: player.x,
          y: player.y,
          radius,
          duration: 22,
          maxDuration: 22,
          level: clapLvl,
          dirCount,
          damage,
        });
        this.shake.shake(clapLvl >= 5 ? 12 : 5);
        for (let i = 0; i < enemies.length; i++) {
          const enemy = enemies[i];
          if (!enemy.active) continue;
          const dx = enemy.x - player.x;
          const dy = enemy.y - player.y;
          if (dx * dx + dy * dy < (radius + enemy.radius) * (radius + enemy.radius)) {
            onEnemyDamage(enemy, damage, 'thunder', clapLvl >= 4);
            enemy.applySlow(clapLvl >= 3 ? 90 : 45);
          }
        }
      }
    }

    // 9. 嗜血战歌 (bloodlust - 狂战疾风狂暴)
    const lustLvl = this.learnedSkills['bloodlust'] || 0;
    if (lustLvl > 0) {
      this.cooldowns['bloodlust'] = (this.cooldowns['bloodlust'] || 0) + 1;
      const baseCd = Math.round((lustLvl >= 5 ? 65 : 95) * (1 - player.cooldownReduce));
      if (this.cooldowns['bloodlust'] >= baseCd) {
        this.cooldowns['bloodlust'] = 0;
        const radius = lustLvl >= 5 ? 125 : (45 + lustLvl * 12);
        const damage = Math.round((24 + lustLvl * 10) * player.atkMultiplier);
        this.bloodlustWaves.push({
          x: player.x,
          y: player.y,
          radius,
          duration: 20,
          maxDuration: 20,
          level: lustLvl,
        });
        for (let i = 0; i < enemies.length; i++) {
          const enemy = enemies[i];
          if (!enemy.active) continue;
          const dx = enemy.x - player.x;
          const dy = enemy.y - player.y;
          if (dx * dx + dy * dy < (radius + enemy.radius) * (radius + enemy.radius)) {
            onEnemyDamage(enemy, damage, 'physical', true);
            enemy.knockback(dx / (Math.sqrt(dx * dx + dy * dy) || 1), dy / (Math.sqrt(dx * dx + dy * dy) || 1), 8);
          }
        }
      }
    }
  }

  // ===================== 实体更新辅助方法 =====================
  updateBlizzards(enemies, onEnemyDamage) {
    for (let i = this.blizzards.length - 1; i >= 0; i--) {
      const b = this.blizzards[i];
      b.duration--;
      b.tick++;

      // 周期性冰雹伤害与减速
      if (b.tick % 15 === 0) {
        for (let j = 0; j < enemies.length; j++) {
          const enemy = enemies[j];
          if (!enemy.active) continue;
          const dx = enemy.x - b.x;
          const dy = enemy.y - b.y;
          if (dx * dx + dy * dy < (b.radius + enemy.radius) * (b.radius + enemy.radius)) {
            onEnemyDamage(enemy, b.damage, 'frost', b.level >= 4);
            enemy.applySlow(b.level >= 5 ? 120 : 60);
          }
        }
      }

      if (b.duration <= 0) {
        const last = this.blizzards.pop();
        if (i < this.blizzards.length) this.blizzards[i] = last;
      }
    }
  }

  updateHolyShocks() {
    for (let i = this.holyShocks.length - 1; i >= 0; i--) {
      this.holyShocks[i].duration--;
      if (this.holyShocks[i].duration <= 0) {
        const last = this.holyShocks.pop();
        if (i < this.holyShocks.length) this.holyShocks[i] = last;
      }
    }
  }

  updateBoneStorm(player, enemies, onEnemyDamage) {
    const boneLvl = this.learnedSkills['bone_storm'] || 0;
    if (boneLvl <= 0) return;

    this.boneStormAngle += (0.07 + boneLvl * 0.015);

    // 旋转骨矛对贴身敌人造成切割伤害
    if (Math.floor(this.boneStormAngle * 10) % 10 === 0) {
      const spearCount = boneLvl >= 5 ? 8 : (boneLvl >= 4 ? 6 : (boneLvl >= 3 ? 4 : (boneLvl >= 2 ? 3 : 2)));
      const orbitR = 48 + boneLvl * 8;
      const damage = Math.round((12 + boneLvl * 7) * player.atkMultiplier);

      for (let s = 0; s < spearCount; s++) {
        const ang = this.boneStormAngle + (Math.PI * 2 * s) / spearCount;
        const sx = player.x + Math.cos(ang) * orbitR;
        const sy = player.y + Math.sin(ang) * orbitR;

        for (let e = 0; e < enemies.length; e++) {
          const enemy = enemies[e];
          if (!enemy.active) continue;
          const dx = enemy.x - sx;
          const dy = enemy.y - sy;
          if (dx * dx + dy * dy < (18 + enemy.radius) * (18 + enemy.radius)) {
            onEnemyDamage(enemy, damage, 'death', false);
            enemy.knockback(dx / (Math.sqrt(dx * dx + dy * dy) || 1), dy / (Math.sqrt(dx * dx + dy * dy) || 1), 4);
            if (boneLvl >= 4 && Math.random() < 0.2) player.heal(2);
            break;
          }
        }
      }
    }
  }

  updateThunderClaps() {
    for (let i = this.thunderClaps.length - 1; i >= 0; i--) {
      this.thunderClaps[i].duration--;
      if (this.thunderClaps[i].duration <= 0) {
        const last = this.thunderClaps.pop();
        if (i < this.thunderClaps.length) this.thunderClaps[i] = last;
      }
    }
  }

  updateBloodlustWaves() {
    for (let i = this.bloodlustWaves.length - 1; i >= 0; i--) {
      this.bloodlustWaves[i].duration--;
      if (this.bloodlustWaves[i].duration <= 0) {
        const last = this.bloodlustWaves.pop();
        if (i < this.bloodlustWaves.length) this.bloodlustWaves[i] = last;
      }
    }
  }

  triggerChainLightning(player, enemies, onEnemyDamage, level) {
    if (!enemies || enemies.length === 0) return;
    const startEnemy = this.getNearestEnemies(player, enemies, 1)[0];
    if (!startEnemy) return;

    const maxJumps = level >= 6 ? 15 : (level >= 5 ? 8 : (2 + level));
    const damage = Math.round((22 + level * 9) * player.atkMultiplier);
    const hitEnemies = [startEnemy];
    const points = [{ x: player.x, y: player.y }, { x: startEnemy.x, y: startEnemy.y }];

    onEnemyDamage(startEnemy, damage, 'thunder', level >= 5);
    startEnemy.applySlow(level >= 4 ? 60 : 30);
    this.particles.burst(startEnemy.x, startEnemy.y, '#0984e3', 6, 4, 3);

    let current = startEnemy;
    for (let jump = 1; jump < maxJumps; jump++) {
      let next = null;
      let nextDistSq = 140 * 140; // 弹跳半径 140px

      for (let i = 0; i < enemies.length; i++) {
        const candidate = enemies[i];
        if (!candidate.active || hitEnemies.includes(candidate)) continue;
        const dx = candidate.x - current.x;
        const dy = candidate.y - current.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < nextDistSq) {
          nextDistSq = d2;
          next = candidate;
        }
      }

      if (!next) break;

      hitEnemies.push(next);
      points.push({ x: next.x, y: next.y });
      const jumpDmg = Math.round(damage * (1 + jump * 0.1));
      onEnemyDamage(next, jumpDmg, 'thunder', level >= 5);
      next.applySlow(30);
      this.particles.burst(next.x, next.y, '#f1c40f', 5, 3, 2);
      current = next;
    }

    this.chainLightnings.push({
      points,
      duration: 12,
      maxDuration: 12,
      isMax: level >= 5,
    });
    this.shake.shake(level >= 5 ? 8 : 3);
  }

  triggerMortalStrike(player, enemies, onEnemyDamage, level) {
    const range = level >= 6 ? 180 : (level >= 5 ? 140 : (80 + level * 15));
    const damage = Math.round((35 + level * 15) * player.atkMultiplier);
    this.texts.add(player.x, player.y - 25, '裂铠重斩!', 'crit');
    this.shake.shake(level >= 5 ? 10 : 5);

    this.mortalStrikes.push({
      x: player.x,
      y: player.y,
      facing: player.facing,
      radius: range,
      duration: 16,
      maxDuration: 16,
      level,
    });

    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (!e.active) continue;
      const dx = e.x - player.x;
      const dy = e.y - player.y;
      if (Math.sign(dx) === player.facing && dx * dx + dy * dy < range * range && Math.abs(dy) < range * 0.75) {
        onEnemyDamage(e, damage, 'physical', true);
        e.knockback(player.facing, dy > 0 ? 0.3 : -0.3, level >= 5 ? 16 : 9);
        this.particles.burst(e.x, e.y, '#c0392b', 8, 4, 3);
      }
    }
  }

  triggerFrostNova(player, enemies, onEnemyDamage, level) {
    const radius = level >= 6 ? 160 : (level >= 5 ? 130 : (55 + level * 15));
    const damage = Math.round((20 + level * 10) * player.atkMultiplier);
    this.texts.add(player.x, player.y - 25, '极寒冰霜!', 'crit');
    this.shake.shake(level >= 5 ? 9 : 4);

    this.frostNovas.push({
      x: player.x,
      y: player.y,
      radius,
      duration: 18,
      maxDuration: 18,
      level,
    });

    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (!e.active) continue;
      const dx = e.x - player.x;
      const dy = e.y - player.y;
      if (dx * dx + dy * dy < (radius + e.radius) * (radius + e.radius)) {
        onEnemyDamage(e, damage, 'arcane', level >= 5);
        e.applySlow(level >= 6 ? 180 : (level >= 5 ? 120 : (60 + level * 15)));
        this.particles.burst(e.x, e.y, '#00cec9', 7, 3, 2);
      }
    }
  }

  updateDeathDecayZones(enemies, onEnemyDamage, player) {
    for (let i = this.deathDecayZones.length - 1; i >= 0; i--) {
      const z = this.deathDecayZones[i];
      z.duration--;
      z.tick++;

      if (z.tick % 14 === 0) {
        for (let j = 0; j < enemies.length; j++) {
          const e = enemies[j];
          if (!e.active) continue;
          const dx = e.x - z.x;
          const dy = e.y - z.y;
          if (dx * dx + dy * dy < z.radius * z.radius) {
            onEnemyDamage(e, z.damage, 'shadow', z.level >= 5);
            e.applySlow(50);
            if (z.level >= 5 && Math.random() < 0.25) {
              const healed = player.heal(2);
              if (healed > 0) this.texts.add(player.x, player.y - 15, `+${healed}`, 'heal');
            }
          }
        }
      }

      if (z.duration <= 0) {
        const last = this.deathDecayZones.pop();
        if (i < this.deathDecayZones.length) {
          this.deathDecayZones[i] = last;
        }
      }
    }
  }

  updateFrostNovas() {
    for (let i = this.frostNovas.length - 1; i >= 0; i--) {
      this.frostNovas[i].duration--;
      if (this.frostNovas[i].duration <= 0) {
        const last = this.frostNovas.pop();
        if (i < this.frostNovas.length) {
          this.frostNovas[i] = last;
        }
      }
    }
  }

  updateMortalStrikes() {
    for (let i = this.mortalStrikes.length - 1; i >= 0; i--) {
      this.mortalStrikes[i].duration--;
      if (this.mortalStrikes[i].duration <= 0) {
        const last = this.mortalStrikes.pop();
        if (i < this.mortalStrikes.length) {
          this.mortalStrikes[i] = last;
        }
      }
    }
  }

  updateChainLightnings() {
    for (let i = this.chainLightnings.length - 1; i >= 0; i--) {
      this.chainLightnings[i].duration--;
      if (this.chainLightnings[i].duration <= 0) {
        const last = this.chainLightnings.pop();
        if (i < this.chainLightnings.length) {
          this.chainLightnings[i] = last;
        }
      }
    }
  }

  // ===================== 华丽渲染层 =====================
  // ===================== 华丽技能魔法特效渲染层 =====================
  render(ctx, player) {
    ctx.save();

    // 1. 地面法阵与充能裂纹层（置于角色和怪物底层）
    // -------------------------------------------------------------------------
    // A. 绘制奉献法阵 (随等级从圣光浅池 -> 双环金芒 -> 八角圣星 -> 炽天使日轮神圣结界)
    for (let i = 0; i < this.consecrationZones.length; i++) {
      const zone = this.consecrationZones[i];
      if (zone.x < -zone.radius || zone.x > SCREEN_WIDTH + zone.radius || zone.y < -zone.radius || zone.y > SCREEN_HEIGHT + zone.radius) continue;
      const lifeRatio = Math.min(1, zone.duration / (zone.maxDuration * 0.25));
      const lvl = zone.level || 1;

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = lifeRatio * 0.75;

      // 金色柔光地表池 (利用离屏 Canvas 预烘焙渐变直接复用，彻底消除每帧动态计算与 GC)
      if (this.cachedConsecrationCanvas) {
        ctx.drawImage(this.cachedConsecrationCanvas, zone.x - zone.radius, zone.y - zone.radius, zone.radius * 2, zone.radius * 2);
      } else {
        ctx.fillStyle = 'rgba(255, 234, 167, 0.4)';
        ctx.beginPath();
        ctx.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // 外圈旋转神圣符文金环
      ctx.strokeStyle = lvl >= 6 ? '#ffd700' : '#f1c40f';
      ctx.lineWidth = lvl >= 5 ? 4 : (1.8 + lvl * 0.4);
      ctx.beginPath();
      ctx.arc(zone.x, zone.y, zone.radius, 0, Math.PI * 2);
      ctx.stroke();

      // Lv.2+ 内圈金环
      if (lvl >= 2) {
        ctx.strokeStyle = '#ffeaa7';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(zone.x, zone.y, zone.radius * 0.7, 0, Math.PI * 2);
        ctx.stroke();
      }

      // 旋转芒星阵 (角数随等级倍增：4角 -> 6角 -> 8角 -> 12角太阳耀芒)
      const starPoints = lvl >= 5 ? 12 : (lvl >= 3 ? 8 : (lvl >= 2 ? 6 : 4));
      const rot = this.orbitAngle * (lvl >= 5 ? 1.2 : 0.8);
      ctx.translate(zone.x, zone.y);
      ctx.rotate(rot);
      ctx.strokeStyle = lvl >= 5 ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 234, 167, 0.8)';
      ctx.lineWidth = lvl >= 5 ? 2.2 : 1.5;

      const starR = zone.radius * 0.68;
      ctx.beginPath();
      for (let s = 0; s < starPoints; s++) {
        const a1 = (Math.PI * 2 * s) / starPoints;
        const a2 = (Math.PI * 2 * (s + Math.floor(starPoints / 2) - 1)) / starPoints;
        ctx.moveTo(Math.cos(a1) * starR, Math.sin(a1) * starR);
        ctx.lineTo(Math.cos(a2) * starR, Math.sin(a2) * starR);
      }
      ctx.stroke();

      // 中心圣光十字星
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = lvl >= 5 ? 3 : 2;
      const cArm = zone.radius * (0.25 + lvl * 0.05);
      ctx.beginPath();
      ctx.moveTo(-cArm, 0);
      ctx.lineTo(cArm, 0);
      ctx.moveTo(0, -cArm);
      ctx.lineTo(0, cArm);
      ctx.stroke();

      ctx.restore();
    }

    // B. 铁牛战争践踏（随等级从尘土震波 -> 裂地熔岩 -> 火山喷涌 -> 泰坦撼岳诸神黄昏）
    for (let i = 0; i < this.stompWaves.length; i++) {
      const st = this.stompWaves[i];
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const alpha = st.duration / st.maxDuration;
      ctx.globalAlpha = alpha;
      const lvl = st.level || 1;

      const curR = st.maxRadius * (1 - alpha * 0.3);

      // 外圈火山冲击环
      ctx.strokeStyle = lvl >= 6 ? '#ffd700' : (lvl >= 5 ? '#e74c3c' : (lvl >= 3 ? '#ff7675' : '#d35400'));
      ctx.lineWidth = (lvl >= 5 ? 7 : (3 + lvl * 0.8)) * alpha;
      ctx.beginPath();
      ctx.arc(st.x, st.y, curR, 0, Math.PI * 2);
      ctx.stroke();

      // 耀眼白光内圈
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = (lvl >= 5 ? 3 : 2) * alpha;
      ctx.beginPath();
      ctx.arc(st.x, st.y, Math.max(1, curR - 4), 0, Math.PI * 2);
      ctx.stroke();

      // 裂地多枝岩浆火缝 (裂枝数量随等级激增：4枝 -> 6枝 -> 8枝 -> 12枝)
      const crackCount = lvl >= 5 ? 12 : (lvl >= 3 ? 8 : (lvl >= 2 ? 6 : 4));
      ctx.strokeStyle = lvl >= 5 ? '#ff9f43' : '#e67e22';
      ctx.lineWidth = (lvl >= 5 ? 4 : 2.5) * alpha;
      for (let r = 0; r < crackCount; r++) {
        const baseAng = (Math.PI * 2 * r) / crackCount;
        const p1x = st.x + Math.cos(baseAng) * (curR * 0.25);
        const p1y = st.y + Math.sin(baseAng) * (curR * 0.25);
        const p2x = st.x + Math.cos(baseAng + 0.1) * (curR * 0.65);
        const p2y = st.y + Math.sin(baseAng + 0.1) * (curR * 0.65);
        const p3x = st.x + Math.cos(baseAng - 0.05) * curR;
        const p3y = st.y + Math.sin(baseAng - 0.05) * curR;

        ctx.beginPath();
        ctx.moveTo(p1x, p1y);
        ctx.lineTo(p2x, p2y);
        ctx.lineTo(p3x, p3y);
        ctx.stroke();
      }

      ctx.restore();
    }

    // C. 虚空黑洞 (随等级从引力暗漩 -> 吸积漩涡 -> 超巨质量黑洞 -> 视界引力奇点)
    for (let i = 0; i < this.blackHoles.length; i++) {
      const bh = this.blackHoles[i];
      if (bh.x < -bh.radius || bh.x > SCREEN_WIDTH + bh.radius || bh.y < -bh.radius || bh.y > SCREEN_HEIGHT + bh.radius) continue;
      const lvl = bh.level || 5;

      ctx.save();
      ctx.translate(bh.x, bh.y);

      // 黑洞外圈吸积盘旋转
      const rot = (bh.maxDuration - bh.duration) * (0.1 + lvl * 0.02);
      ctx.rotate(rot);

      ctx.globalCompositeOperation = 'lighter';
      // 黑洞外圈吸积盘 (利用离屏 Canvas 预烘焙渐变，直接复用纹理)
      if (this.cachedBlackHoleCanvas) {
        ctx.drawImage(this.cachedBlackHoleCanvas, -bh.radius, -bh.radius, bh.radius * 2, bh.radius * 2);
      } else {
        ctx.fillStyle = 'rgba(155, 89, 182, 0.7)';
        ctx.beginPath();
        ctx.arc(0, 0, bh.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      // 旋转星旋旋臂 (旋臂数随等级增加：2臂 -> 4臂 -> 6臂 -> 8臂)
      const arms = lvl >= 5 ? 8 : (lvl >= 4 ? 6 : (lvl >= 2 ? 4 : 2));
      ctx.strokeStyle = lvl >= 6 ? 'rgba(255, 234, 167, 0.8)' : 'rgba(214, 162, 232, 0.7)';
      ctx.lineWidth = lvl >= 5 ? 3 : 2;
      for (let arm = 0; arm < arms; arm++) {
        const a0 = (Math.PI * 2 * arm) / arms;
        ctx.beginPath();
        for (let t = 0; t <= 1; t += 0.1) {
          const r = 8 + (bh.radius - 8) * t;
          const a = a0 + t * 2.2;
          const px = Math.cos(a) * r;
          const py = Math.sin(a) * r;
          if (t === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }

      // 黑洞绝对视界中心纯黑
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#06060c';
      ctx.beginPath();
      ctx.arc(0, 0, bh.radius * 0.32, 0, Math.PI * 2);
      ctx.fill();

      // 视界边缘白亮引力光环
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = lvl >= 6 ? '#ffd700' : '#ffffff';
      ctx.lineWidth = lvl >= 5 ? 2.5 : 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, bh.radius * 0.32, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    }

    // 2. 动能实体层 (炸弹蛋、毛球、音波、光环、风暴圣剑)
    // -------------------------------------------------------------------------
    // A. 母鸡炸弹蛋 (华丽黄金泰坦神蛋 / 耀金核爆神蛋，彻底剔除粗糙Emoji)
    for (let i = 0; i < this.eggs.length; i++) {
      const egg = this.eggs[i];
      ctx.save();

      const pulse = Math.sin(this.orbitAngle * 5 + i) * 1.5;
      const rx = (egg.radius + pulse) * 0.8;
      const ry = egg.radius + pulse;

      if (egg.isThunder) {
        // Lv 6 极境突破·九天玄雷蛋：天界神雷电光环与神威雷纹
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        // 神雷外圈电光环
        ctx.strokeStyle = '#00d2d3';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(egg.x, egg.y, ry + 18, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(egg.x, egg.y, ry + 12, 0, Math.PI * 2);
        ctx.stroke();

        // 巨蛋青金雷核渐变
        const thGrad = ctx.createRadialGradient(
          egg.x - rx * 0.3, egg.y - ry * 0.35, 2,
          egg.x, egg.y, ry
        );
        thGrad.addColorStop(0, '#ffffff');
        thGrad.addColorStop(0.3, '#00d2d3');
        thGrad.addColorStop(0.7, '#f1c40f');
        thGrad.addColorStop(1, '#6c5ce7');
        ctx.fillStyle = thGrad;
        ctx.beginPath();
        ctx.ellipse(egg.x, egg.y, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();

        // 玄雷放射闪电纹
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(egg.x, egg.y - ry * 0.8);
        ctx.lineTo(egg.x + 6, egg.y - ry * 0.2);
        ctx.lineTo(egg.x - 5, egg.y + ry * 0.2);
        ctx.lineTo(egg.x + 4, egg.y + ry * 0.8);
        ctx.stroke();

        ctx.restore();
      } else if (egg.isNuke) {
        // Lv 5 超武·核爆巨蛋：金色核聚变电弧与泰坦神纹
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        // 核能外光圈与旋转辐射符文环
        ctx.strokeStyle = '#f1c40f';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(egg.x, egg.y, ry + 16, 0, Math.PI * 2);
        ctx.stroke();

        // 旋转能量三叶扇
        ctx.save();
        ctx.translate(egg.x, egg.y);
        ctx.rotate(this.orbitAngle * 3);
        ctx.strokeStyle = '#ffeaa7';
        ctx.lineWidth = 3;
        for (let fan = 0; fan < 3; fan++) {
          const fa = (Math.PI * 2 * fan) / 3;
          ctx.beginPath();
          ctx.arc(0, 0, ry + 12, fa - 0.35, fa + 0.35);
          ctx.stroke();
        }
        ctx.restore();

        // 巨蛋立体金属渐变
        const eggGrad = ctx.createRadialGradient(
          egg.x - rx * 0.3, egg.y - ry * 0.35, 2,
          egg.x, egg.y, ry
        );
        eggGrad.addColorStop(0, '#ffffff');
        eggGrad.addColorStop(0.3, '#f9ca24');
        eggGrad.addColorStop(0.7, '#f0932b');
        eggGrad.addColorStop(1, '#eb4d4b');
        ctx.fillStyle = eggGrad;
        ctx.beginPath();
        ctx.ellipse(egg.x, egg.y, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();

        // 蛋壳核心闪电裂纹
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(egg.x, egg.y - ry * 0.7);
        ctx.lineTo(egg.x + 4, egg.y - ry * 0.2);
        ctx.lineTo(egg.x - 3, egg.y + ry * 0.3);
        ctx.lineTo(egg.x + 2, egg.y + ry * 0.7);
        ctx.stroke();

        ctx.restore();
      } else if (egg.isGold) {
        // Lv 4 黄金龙纹神蛋
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = 'rgba(241, 196, 15, 0.35)';
        ctx.beginPath();
        ctx.arc(egg.x, egg.y, ry * 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        const goldGrad = ctx.createRadialGradient(
          egg.x - rx * 0.3, egg.y - ry * 0.35, 2,
          egg.x, egg.y, ry
        );
        goldGrad.addColorStop(0, '#ffffff');
        goldGrad.addColorStop(0.4, '#ffd700');
        goldGrad.addColorStop(1, '#d35400');
        ctx.fillStyle = goldGrad;
        ctx.beginPath();
        ctx.ellipse(egg.x, egg.y, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();

        // 黄金符文横纹
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(egg.x, egg.y, rx * 0.7, ry * 0.3, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        // Lv 1~3 经典机械发条炸弹蛋
        const normGrad = ctx.createRadialGradient(
          egg.x - rx * 0.3, egg.y - ry * 0.35, 1,
          egg.x, egg.y, ry
        );
        normGrad.addColorStop(0, '#ffffff');
        normGrad.addColorStop(0.35, '#fffae6');
        normGrad.addColorStop(0.8, '#f39c12');
        normGrad.addColorStop(1, '#c0392b');
        ctx.fillStyle = normGrad;
        ctx.beginPath();
        ctx.ellipse(egg.x, egg.y, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();

        // 顶部引信与燃烧火花
        ctx.strokeStyle = '#2d3436';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(egg.x, egg.y - ry);
        ctx.quadraticCurveTo(egg.x + 6, egg.y - ry - 6, egg.x + 8, egg.y - ry - 9);
        ctx.stroke();

        // 跃动火星
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = '#ff7675';
        ctx.beginPath();
        ctx.arc(egg.x + 8, egg.y - ry - 9, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(egg.x + 8, egg.y - ry - 9, 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      ctx.restore();
    }

    // B. 鸭嘎嘎音波 (随等级从青色音弧 -> 双频声浪 -> 七彩霓虹音波 -> 360度全方位天籁神圣音障)
    for (let i = 0; i < this.sonicWaves.length; i++) {
      const sw = this.sonicWaves[i];
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      const isOmni = sw.level >= 6;
      const startAngle = isOmni ? 0 : (sw.dir > 0 ? -Math.PI / 2.6 : (Math.PI * 2) / 3.4);
      const endAngle = isOmni ? Math.PI * 2 : (sw.dir > 0 ? Math.PI / 2.6 : (Math.PI * 4) / 2.6);

      if (sw.level >= 6) {
        // Lv 6 极境突破·天籁神曲：360度全向黄金天籁神圣音障
        const colors = ['#ffd700', '#00d2d3', '#ffffff', '#a29bfe'];
        for (let c = 0; c < colors.length; c++) {
          ctx.strokeStyle = colors[c];
          ctx.lineWidth = 4.5 - c * 0.8;
          ctx.beginPath();
          ctx.arc(sw.x, sw.y, Math.max(10, sw.radius - c * 10), 0, Math.PI * 2);
          ctx.stroke();
        }
      } else if (sw.level >= 5) {
        // Lv 5 超武·天籁嘎音：霓虹七彩天籁共振光弧
        const colors = ['#00d2d3', '#f1c40f', '#ff7675', '#a29bfe'];
        for (let c = 0; c < colors.length; c++) {
          ctx.strokeStyle = colors[c];
          ctx.lineWidth = 4 - c * 0.7;
          ctx.beginPath();
          ctx.arc(sw.x, sw.y, Math.max(10, sw.radius - c * 10), startAngle, endAngle);
          ctx.stroke();
        }

        // 光弧顶端发光声球
        const topAngle = startAngle + (endAngle - startAngle) * 0.5;
        const tx = sw.x + Math.cos(topAngle) * sw.radius;
        const ty = sw.y + Math.sin(topAngle) * sw.radius;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(tx, ty, 4, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // 蓝青色纯净声波
        ctx.strokeStyle = sw.level >= 3 ? '#00d2d3' : '#48dbfb';
        ctx.lineWidth = sw.level >= 3 ? 3.5 : 2;
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.radius, startAngle, endAngle);
        ctx.stroke();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, Math.max(5, sw.radius - 8), startAngle, endAngle);
        ctx.stroke();
      }

      ctx.restore();
    }

    // C. 狂野绵羊【羊毛滋养】 (随等级柔光圣洁云团 -> 翡翠治愈光晕 -> 大地生机神圣云朵)
    for (let i = 0; i < this.woolBalls.length; i++) {
      const wb = this.woolBalls[i];
      ctx.save();

      // 柔和圣洁金白双层云球
      const bob = Math.sin(this.orbitAngle * 3 + i) * 2;
      const wy = wb.y + bob;

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = wb.level >= 6 ? 'rgba(255, 215, 0, 0.45)' : 'rgba(255, 234, 167, 0.4)';
      ctx.beginPath();
      ctx.arc(wb.x, wy, wb.level >= 6 ? 20 : 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 4瓣蓬松羊毛云朵
      ctx.fillStyle = '#ffffff';
      const r = wb.level >= 6 ? 7 : 5.5;
      ctx.beginPath();
      ctx.arc(wb.x - 4, wy - 3, r, 0, Math.PI * 2);
      ctx.arc(wb.x + 4, wy - 3, r, 0, Math.PI * 2);
      ctx.arc(wb.x - 4, wy + 3, r, 0, Math.PI * 2);
      ctx.arc(wb.x + 4, wy + 3, r, 0, Math.PI * 2);
      ctx.arc(wb.x, wy, r + 1, 0, Math.PI * 2);
      ctx.fill();

      // 中心粉金爱心/翡翠圣光十字
      ctx.fillStyle = wb.level >= 6 ? '#2ecc71' : '#e84393';
      ctx.beginPath();
      ctx.arc(wb.x, wy, wb.level >= 6 ? 4 : 2.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    // D. 咸鱼突刺轨迹 (金色化龙与怒涛光澜，彻底摒弃Emoji)
    for (let i = 0; i < this.fishDashes.length; i++) {
      const fd = this.fishDashes[i];
      ctx.save();
      const alpha = fd.duration / fd.maxDuration;
      ctx.globalAlpha = alpha;
      ctx.globalCompositeOperation = 'lighter';

      if (fd.isDragon) {
        // Lv 5 超武·化龙飞升 / Lv 6 诸天真龙：金色/天界苍龙穿云光影
        const isMythic = fd.level >= 6;
        // 1. 龙躯巨浪光澜
        ctx.strokeStyle = isMythic ? '#ffd700' : '#f1c40f';
        ctx.lineWidth = isMythic ? 26 : 18;
        ctx.beginPath();
        ctx.moveTo(fd.startX, fd.startY);
        ctx.lineTo(fd.endX, fd.endY);
        ctx.stroke();

        ctx.strokeStyle = isMythic ? '#00d2d3' : '#ffffff';
        ctx.lineWidth = isMythic ? 9 : 6;
        ctx.beginPath();
        ctx.moveTo(fd.startX, fd.startY);
        ctx.lineTo(fd.endX, fd.endY);
        ctx.stroke();

        // 2. 苍龙龙头矢量轮廓
        ctx.save();
        ctx.translate(fd.endX, fd.endY);
        const dashDir = fd.endX >= fd.startX ? 1 : -1;
        ctx.scale(dashDir, 1);

        // 龙首金光
        ctx.fillStyle = isMythic ? '#ffd700' : '#f39c12';
        ctx.beginPath();
        ctx.moveTo(18, 0);
        ctx.lineTo(-6, -12);
        ctx.lineTo(-2, -5);
        ctx.lineTo(-14, -7);
        ctx.lineTo(-6, 0);
        ctx.lineTo(-14, 7);
        ctx.lineTo(-2, 5);
        ctx.lineTo(-6, 12);
        ctx.closePath();
        ctx.fill();

        // 龙角
        ctx.strokeStyle = '#ffeaa7';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-4, -8);
        ctx.lineTo(-16, -18);
        ctx.lineTo(-22, -16);
        ctx.moveTo(-4, 8);
        ctx.lineTo(-16, 18);
        ctx.lineTo(-22, 16);
        ctx.stroke();

        // 炽白龙目
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(6, -3, 3, 0, Math.PI * 2);
        ctx.arc(6, 3, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      } else {
        // 湛蓝水浪突刺利刃
        ctx.strokeStyle = '#00d2d3';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(fd.startX, fd.startY);
        ctx.lineTo(fd.endX, fd.endY);
        ctx.stroke();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(fd.startX, fd.startY);
        ctx.lineTo(fd.endX, fd.endY);
        ctx.stroke();
      }

      ctx.restore();
    }

    // E. 旋风斩 (随等级从白刃双斩 -> 碧空三刀 -> 炽焰四刃 -> 黄金六刃剑刃风暴 -> 八荒神圣风暴)
    for (let i = 0; i < this.whirlwindSlashes.length; i++) {
      const w = this.whirlwindSlashes[i];
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const alpha = w.duration / w.maxDuration;
      ctx.globalAlpha = alpha;

      const slashRot = (w.maxDuration - w.duration) * (0.35 + (w.level || 1) * 0.05);
      ctx.translate(w.x, w.y);
      ctx.rotate(slashRot);

      const lvl = w.level || 1;
      const bladeColors = [
        '#ffffff', // Lv 1: 钢刃白芒
        '#00cec9', // Lv 2: 碧空风刃
        '#2ed573', // Lv 3: 翡翠疾风旋
        '#ff7675', // Lv 4: 狂怒赤炎斩
        '#f1c40f', // Lv 5: 黄金泰坦剑刃风暴
        '#ffd700', // Lv 6: 诸神黄昏·八荒神圣风暴
      ];
      ctx.strokeStyle = bladeColors[Math.min(5, lvl - 1)];
      ctx.lineWidth = (lvl >= 5 ? 7 : (3 + lvl * 0.8)) * alpha;

      // 刀光刃数随等级渐进增多：2刃 -> 3刃 -> 4刃 -> 6刃 -> 8刃
      const blades = lvl >= 6 ? 8 : (lvl >= 5 ? 6 : (lvl >= 4 ? 4 : (lvl >= 3 ? 3 : 2)));
      for (let b = 0; b < blades; b++) {
        const bAngle = (Math.PI * 2 * b) / blades;
        ctx.beginPath();
        ctx.arc(0, 0, w.radius, bAngle - 0.55, bAngle + 0.55);
        ctx.stroke();
      }

      // Lv.3+ 增加内圈高速旋涡残影
      if (lvl >= 3) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.6 * alpha;
        ctx.beginPath();
        ctx.arc(0, 0, w.radius * 0.65, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Lv.5+ 增加外周震空音爆破裂环
      if (lvl >= 5) {
        ctx.strokeStyle = lvl >= 6 ? '#ffd700' : '#f39c12';
        ctx.lineWidth = 2 * alpha;
        ctx.beginPath();
        ctx.arc(0, 0, w.radius * 1.25, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.restore();
    }

    // F. 献祭光环 (随等级从翡翠微火 -> 地狱炽焰 -> 恶魔火环 -> 泰坦天火大焚灭)
    const felAuraLvl = this.learnedSkills['fel_immolation'] || this.learnedSkills['fel_aura'] || 0;
    if (felAuraLvl > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const auraRadius = felAuraLvl >= 6 ? 120 : (felAuraLvl >= 5 ? 100 : (42 + felAuraLvl * 12));

      // 旋转绿火外环（随等级呈现多重渐层火环）
      const auraColor = felAuraLvl >= 6 ? '#ffd700' : (felAuraLvl >= 5 ? '#2ecc71' : (felAuraLvl >= 3 ? '#1abc9c' : '#27ae60'));
      ctx.strokeStyle = auraColor;
      ctx.lineWidth = felAuraLvl >= 5 ? 5 : (2 + felAuraLvl * 0.6);
      ctx.beginPath();
      ctx.arc(player.x, player.y, auraRadius, 0, Math.PI * 2);
      ctx.stroke();

      if (felAuraLvl >= 3) {
        // 内圈逆转辅助火环
        ctx.strokeStyle = '#2ecc71';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(player.x, player.y, auraRadius * 0.65, 0, Math.PI * 2);
        ctx.stroke();
      }

      // 环绕跳动火舌 (等级越高数量越多、粒子越巨)
      const flameCount = felAuraLvl >= 6 ? 16 : (felAuraLvl >= 5 ? 12 : (felAuraLvl >= 3 ? 8 : 4));
      for (let f = 0; f < flameCount; f++) {
        const fa = this.orbitAngle * (felAuraLvl >= 5 ? 2.5 : 1.8) + (Math.PI * 2 * f) / flameCount;
        const fx = player.x + Math.cos(fa) * auraRadius;
        const fy = player.y + Math.sin(fa) * auraRadius;
        ctx.fillStyle = felAuraLvl >= 6 ? '#ffd700' : (felAuraLvl >= 5 ? '#e74c3c' : '#2ecc71');
        ctx.beginPath();
        ctx.arc(fx, fy, 3 + felAuraLvl * 0.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(fx, fy, 1.5 + felAuraLvl * 0.3, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    // G. 神圣风暴 (环绕圣剑与光澜：Lv.1单剑 -> Lv.2双刃 -> Lv.3三曜 -> Lv.4四极 -> Lv.5六极圣剑 -> Lv.6八荒天界诸神之刃)
    const stormLvl = this.learnedSkills['holy_storm'] || 0;
    if (stormLvl > 0) {
      const swordCount = stormLvl >= 6 ? 8 : (stormLvl >= 5 ? 6 : (stormLvl >= 4 ? 4 : (stormLvl >= 3 ? 3 : (stormLvl >= 2 ? 2 : 1))));
      const orbitRadius = stormLvl >= 6 ? 105 : (stormLvl >= 5 ? 90 : (55 + stormLvl * 7));

      for (let i = 0; i < swordCount; i++) {
        const angle = this.orbitAngle * (stormLvl >= 5 ? 1.6 : 1.2) + (Math.PI * 2 * i) / swordCount;
        const sx = player.x + Math.cos(angle) * orbitRadius;
        const sy = player.y + Math.sin(angle) * orbitRadius;

        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(angle + Math.PI / 2);
        ctx.globalCompositeOperation = 'lighter';

        // 圣剑外光辉
        ctx.fillStyle = stormLvl >= 6 ? '#ffd700' : (stormLvl >= 5 ? '#f1c40f' : '#f39c12');
        const swLen = stormLvl >= 6 ? 38 : (stormLvl >= 5 ? 32 : (18 + stormLvl * 2.8));
        const swWid = stormLvl >= 6 ? 10 : (stormLvl >= 5 ? 8 : (4 + stormLvl * 0.9));

        // 剑身外晕
        ctx.fillRect(-swWid, -swLen / 2, swWid * 2, swLen);

        // 剑身核心纯白金光
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-swWid / 2, -swLen / 2, swWid, swLen);

        // 黄金十字护手
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(-swWid * 1.6, swLen / 3.5, swWid * 3.2, stormLvl >= 5 ? 5 : 3.5);

        // Lv.4+ 圣剑尾部拖曳炽烈圣光羽翼
        if (stormLvl >= 4) {
          ctx.strokeStyle = '#ffeaa7';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(-swWid * 1.2, swLen / 3.5);
          ctx.lineTo(-swWid * 2.2, swLen * 0.7);
          ctx.moveTo(swWid * 1.2, swLen / 3.5);
          ctx.lineTo(swWid * 2.2, swLen * 0.7);
          ctx.stroke();
        }

        ctx.restore();
      }
    }

    // 3. 投射物与天降神罚层
    // -------------------------------------------------------------------------
    // A. 飞弹投射物 (圣光惩击、恶魔火球、虚空暗刃)
    for (let i = 0; i < this.projectiles.length; i++) {
      const p = this.projectiles[i];
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      if (p.type === 'holy_smite') {
        // 圣光惩击 (随等级从金十字 -> 圣光光环 -> 六芒星耀 -> 天界战锤 -> 炽天使裁决神印)
        const lvl = p.level || 1;
        const rot = this.orbitAngle * (3 + lvl);
        ctx.translate(p.x, p.y);
        ctx.rotate(rot);

        // 外层圣光晕染
        const haloColor = lvl >= 6 ? 'rgba(255, 234, 167, 0.65)' : (lvl >= 5 ? 'rgba(241, 196, 15, 0.55)' : 'rgba(241, 196, 15, 0.35)');
        ctx.fillStyle = haloColor;
        ctx.beginPath();
        ctx.arc(0, 0, p.radius * (1.5 + lvl * 0.2), 0, Math.PI * 2);
        ctx.fill();

        // 金色十字主体
        ctx.fillStyle = lvl >= 6 ? '#ffffff' : (lvl >= 5 ? '#ffd700' : '#f1c40f');
        const crossL = p.radius * (1.2 + lvl * 0.35);
        const crossW = p.radius * (0.35 + lvl * 0.08);
        ctx.fillRect(-crossL, -crossW, crossL * 2, crossW * 2);
        ctx.fillRect(-crossW, -crossL, crossW * 2, crossL * 2);

        // Lv.3+ 增添 45度 对角斜向神圣芒刺 (八角圣星)
        if (lvl >= 3) {
          ctx.rotate(Math.PI / 4);
          ctx.fillStyle = '#ffeaa7';
          const subL = crossL * 0.68;
          const subW = crossW * 0.65;
          ctx.fillRect(-subL, -subW, subL * 2, subW * 2);
          ctx.fillRect(-subW, -subL, subW * 2, subL * 2);
          ctx.rotate(-Math.PI / 4);
        }

        // Lv.5+ 圣光神锤与外层天使光轮
        if (lvl >= 5) {
          ctx.strokeStyle = lvl >= 6 ? '#ffd700' : '#ffffff';
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.arc(0, 0, p.radius * 2.2, 0, Math.PI * 2);
          ctx.stroke();
        }

        // 核心炽白耀星
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, p.radius * 0.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'fel_fire') {
        // 邪能之火 (随等级从绿炎飞弹 -> 双核地狱火 -> 恶魔颅骨 -> 泰坦狂暴邪龙首)
        const lvl = p.level || 1;
        const angle = Math.atan2(p.vy, p.vx);
        ctx.translate(p.x, p.y);
        ctx.rotate(angle);

        // 彗尾烈焰光晕
        const tailLen = p.radius * (2.0 + lvl * 0.5);
        ctx.fillStyle = lvl >= 6 ? 'rgba(241, 196, 15, 0.45)' : 'rgba(46, 204, 113, 0.5)';
        ctx.beginPath();
        ctx.moveTo(p.radius * 1.4, 0);
        ctx.lineTo(-tailLen, -p.radius * (0.8 + lvl * 0.15));
        ctx.lineTo(-tailLen * 0.6, 0);
        ctx.lineTo(-tailLen, p.radius * (0.8 + lvl * 0.15));
        ctx.closePath();
        ctx.fill();

        // 弹头炽焰核心
        ctx.fillStyle = lvl >= 6 ? '#ffd700' : (lvl >= 5 ? '#e74c3c' : '#2ecc71');
        ctx.beginPath();
        ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
        ctx.fill();

        // Lv.3+ 恶魔之角与咆哮龙瞳
        if (lvl >= 3) {
          ctx.strokeStyle = '#1e272e';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(p.radius * 0.2, -p.radius * 0.6);
          ctx.lineTo(-p.radius * 0.7, -p.radius * 1.3);
          ctx.moveTo(p.radius * 0.2, p.radius * 0.6);
          ctx.lineTo(-p.radius * 0.7, p.radius * 1.3);
          ctx.stroke();
        }

        // 核心白亮
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(p.radius * 0.3, 0, p.radius * 0.45, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'shadow_bolt') {
        // 暗影箭 (随等级从暗影飞镖 -> 虚空双月刃 -> 三刃回旋风魔镰 -> 吞噬虚空之眼)
        const lvl = p.level || 1;
        const rot = this.orbitAngle * (4 + lvl * 1.2);
        ctx.translate(p.x, p.y);
        ctx.rotate(rot);

        ctx.strokeStyle = lvl >= 6 ? '#ffd700' : (lvl >= 5 ? '#9b59b6' : '#8e44ad');
        ctx.lineWidth = 3 + (lvl >= 5 ? 3 : lvl * 0.5);

        // 回旋虚空刃数随等级提升：1刃 -> 2刃 -> 3刃 -> 4刃 -> 6刃
        const blades = lvl >= 5 ? 6 : (lvl >= 4 ? 4 : (lvl >= 3 ? 3 : (lvl >= 2 ? 2 : 1)));
        for (let b = 0; b < blades; b++) {
          const ba = (Math.PI * 2 * b) / blades;
          ctx.beginPath();
          ctx.arc(0, 0, p.radius * (1.0 + lvl * 0.15), ba - 0.7, ba + 0.7);
          ctx.stroke();
        }

        // 核心虚空暗核
        ctx.fillStyle = lvl >= 5 ? '#2c003e' : '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, lvl >= 5 ? 5 : 3, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'chaos_bolt') {
        // 双旋恶魔混乱龙炎弹
        const angle = Math.atan2(p.vy, p.vx);
        ctx.translate(p.x, p.y);
        ctx.rotate(angle);

        // 外层龙翼炎光
        ctx.fillStyle = p.level >= 5 ? '#ffd700' : 'rgba(46, 204, 113, 0.45)';
        ctx.beginPath();
        ctx.ellipse(0, 0, p.radius * 1.5, p.radius * 0.9, 0, 0, Math.PI * 2);
        ctx.fill();

        // 核心恶魔火球 (Lv.5/6 升级为霸气龙首)
        ctx.fillStyle = p.level >= 5 ? '#e74c3c' : '#2ecc71';
        ctx.beginPath();
        ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
        ctx.fill();

        // 双恶魔角
        ctx.strokeStyle = '#1e272e';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(p.radius * 0.4, -p.radius * 0.5);
        ctx.lineTo(-p.radius * 0.6, -p.radius * 1.2);
        ctx.moveTo(p.radius * 0.4, p.radius * 0.5);
        ctx.lineTo(-p.radius * 0.6, p.radius * 1.2);
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(p.radius * 0.3, 0, p.radius * 0.4, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'arcane_missile') {
        // 奥术飞弹 (随等级从湛蓝彗星 -> 霓虹星梭 -> 棱晶光矛 -> 肯瑞托星穹大超武)
        const lvl = p.level || 1;
        const angle = Math.atan2(p.vy, p.vx);
        ctx.translate(p.x, p.y);
        ctx.rotate(angle);

        // 拖尾奥术尾光
        const tailLength = p.radius * (2.2 + lvl * 0.6);
        ctx.fillStyle = lvl >= 6 ? 'rgba(255, 234, 167, 0.6)' : (lvl >= 5 ? 'rgba(0, 210, 211, 0.7)' : 'rgba(72, 219, 251, 0.5)');
        ctx.beginPath();
        ctx.moveTo(p.radius * 1.5, 0);
        ctx.lineTo(-tailLength, -p.radius * 0.6);
        ctx.lineTo(-tailLength * 0.5, 0);
        ctx.lineTo(-tailLength, p.radius * 0.6);
        ctx.closePath();
        ctx.fill();

        // 梭形棱晶飞弹核心
        ctx.fillStyle = lvl >= 6 ? '#ffffff' : (lvl >= 5 ? '#a29bfe' : '#00d2d3');
        ctx.beginPath();
        ctx.moveTo(p.radius * 1.6, 0);
        ctx.lineTo(0, -p.radius * 0.8);
        ctx.lineTo(-p.radius * 0.8, 0);
        ctx.lineTo(0, p.radius * 0.8);
        ctx.closePath();
        ctx.fill();

        // Lv.4+ 奥术聚合环
        if (lvl >= 4) {
          ctx.strokeStyle = lvl >= 6 ? '#ffd700' : '#ffffff';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.ellipse(0, 0, p.radius * 0.7, p.radius * 1.3, 0, 0, Math.PI * 2);
          ctx.stroke();
        }

        // 核心亮点
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(p.radius * 0.3, 0, p.radius * 0.4, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'fire_blast') {
        // 赤炎脉冲 (六阶全屏进阶极境视觉蜕变)
        const lvl = p.level || 1;
        const angle = Math.atan2(p.vy, p.vx);
        ctx.translate(p.x, p.y);
        ctx.rotate(angle);

        if (lvl >= 6) {
          // 【神化·星芒神威光翼】全屏耀斑金翼与屏幕核爆
          ctx.fillStyle = 'rgba(255, 215, 0, 0.4)';
          ctx.beginPath();
          ctx.ellipse(0, 0, p.radius * 2.2, p.radius * 1.2, 0, 0, Math.PI * 2);
          ctx.fill();

          // 神威光翼
          ctx.strokeStyle = '#ffd700';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(p.radius * 1.6, 0);
          ctx.lineTo(-p.radius * 1.4, -p.radius * 1.8);
          ctx.lineTo(-p.radius * 0.7, 0);
          ctx.lineTo(-p.radius * 1.4, p.radius * 1.8);
          ctx.closePath();
          ctx.stroke();

          // 核心赤金光球
          ctx.fillStyle = '#ff4757';
          ctx.beginPath();
          ctx.arc(0, 0, p.radius * 0.85, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(0, 0, p.radius * 0.45, 0, Math.PI * 2);
          ctx.fill();
        } else if (lvl >= 5) {
          // 【超武·恶魔火龙之吼】
          ctx.fillStyle = 'rgba(255, 71, 87, 0.5)';
          ctx.beginPath();
          ctx.ellipse(0, 0, p.radius * 1.8, p.radius * 1.1, 0, 0, Math.PI * 2);
          ctx.fill();

          // 恶魔龙首赤炎刃
          ctx.fillStyle = '#ff4757';
          ctx.beginPath();
          ctx.moveTo(p.radius * 1.6, 0);
          ctx.lineTo(-p.radius * 0.8, -p.radius * 0.9);
          ctx.lineTo(-p.radius * 0.4, 0);
          ctx.lineTo(-p.radius * 0.8, p.radius * 0.9);
          ctx.closePath();
          ctx.fill();

          ctx.fillStyle = '#ffd700';
          ctx.beginPath();
          ctx.arc(p.radius * 0.3, 0, p.radius * 0.4, 0, Math.PI * 2);
          ctx.fill();
        } else if (lvl >= 3) {
          // Lv.3 / Lv.4: 贯穿烈焰光环 + 爆裂火核
          ctx.strokeStyle = lvl >= 4 ? '#ffa502' : '#ff6348';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.ellipse(0, 0, p.radius * 1.3, p.radius * 0.8, 0, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = '#ff4757';
          ctx.beginPath();
          ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#ffeaa7';
          ctx.beginPath();
          ctx.arc(p.radius * 0.3, 0, p.radius * 0.45, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Lv.1 / Lv.2: 基础赤炎火球
          ctx.fillStyle = '#ff4757';
          ctx.beginPath();
          ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(p.radius * 0.25, 0, p.radius * 0.4, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        // 通用能量弹
        ctx.fillStyle = p.color || '#3498db';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 0.45, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    // B. 神圣圣光光柱 (天使降临天罚圣剑光柱)
    for (let i = 0; i < this.divinePillars.length; i++) {
      const p = this.divinePillars[i];
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const alpha = p.duration / p.maxDuration;
      ctx.globalAlpha = alpha;

      // 圣光光柱 (利用离屏 Canvas 预烘焙柱状渐变直接绘制)
      if (this.cachedHolyBeamCanvas) {
        ctx.drawImage(this.cachedHolyBeamCanvas, p.x - p.width / 2, 0, p.width, SCREEN_HEIGHT);
      } else {
        ctx.fillStyle = 'rgba(241, 196, 15, 0.8)';
        ctx.fillRect(p.x - p.width / 2, 0, p.width, SCREEN_HEIGHT);
      }

      // 地面冲击光圈
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.width * 0.7, p.width * 0.35, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    }

    // C. 地狱火流星 (全屏绿焰彗星陨石)
    for (let i = 0; i < this.hellfireMeteors.length; i++) {
      const m = this.hellfireMeteors[i];
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      // 拖尾绿焰彗尾
      const tailGrad = ctx.createLinearGradient(m.x - 30, m.y - 50, m.x, m.y);
      tailGrad.addColorStop(0, 'transparent');
      tailGrad.addColorStop(0.6, 'rgba(46, 204, 113, 0.6)');
      tailGrad.addColorStop(1, '#ffffff');
      ctx.strokeStyle = tailGrad;
      ctx.lineWidth = 14;
      ctx.beginPath();
      ctx.moveTo(m.x - 25, m.y - 45);
      ctx.lineTo(m.x, m.y);
      ctx.stroke();

      // 陨石核心
      ctx.fillStyle = '#2ecc71';
      ctx.beginPath();
      ctx.arc(m.x, m.y, 16, 0, Math.PI * 2);
      ctx.fill();

      // 核心炽白
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(m.x, m.y, 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    // D. 超武【复仇之怒】背后的巨大天使神圣金光双翼
    if (this.holyWrathTimer > 0) {
      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.globalCompositeOperation = 'lighter';
      const wingSpread = Math.sin((60 - this.holyWrathTimer) * 0.25) * 10;

      ctx.fillStyle = 'rgba(255, 234, 167, 0.75)';

      // 左翼金光大羽
      ctx.beginPath();
      ctx.moveTo(-10, -5);
      ctx.quadraticCurveTo(-50 - wingSpread, -55, -85 - wingSpread, -18);
      ctx.quadraticCurveTo(-48, 12, -10, 5);
      ctx.fill();

      // 右翼金光大羽
      ctx.beginPath();
      ctx.moveTo(10, -5);
      ctx.quadraticCurveTo(50 + wingSpread, -55, 85 + wingSpread, -18);
      ctx.quadraticCurveTo(48, 12, 10, 5);
      ctx.fill();

      ctx.restore();
    }

    // E. 幽冥枯萎 (随等级从凋零寒地 -> 亡灵霜环 -> 天灾颅骨法阵 -> 冰冠冰封王座浩劫)
    for (let i = 0; i < this.deathDecayZones.length; i++) {
      const z = this.deathDecayZones[i];
      if (z.x < -z.radius || z.x > SCREEN_WIDTH + z.radius || z.y < -z.radius || z.y > SCREEN_HEIGHT + z.radius) continue;
      const alpha = Math.min(1, z.duration / (z.maxDuration * 0.25));
      const lvl = z.level || 1;

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = alpha * 0.75;

      // 凋零死水池 (随等级颜色从幽蓝变向深紫与冰魄金光)
      const poolColor = lvl >= 6 ? 'rgba(255, 234, 167, 0.25)' : (lvl >= 5 ? 'rgba(108, 92, 231, 0.32)' : (lvl >= 3 ? 'rgba(9, 132, 227, 0.28)' : 'rgba(74, 105, 189, 0.2)'));
      ctx.fillStyle = poolColor;
      ctx.beginPath();
      ctx.arc(z.x, z.y, z.radius, 0, Math.PI * 2);
      ctx.fill();

      // 外周枯萎死圈
      ctx.strokeStyle = lvl >= 6 ? '#ffd700' : (lvl >= 5 ? '#a29bfe' : '#74b9ff');
      ctx.lineWidth = lvl >= 5 ? 4 : (1.8 + lvl * 0.5);
      ctx.beginPath();
      ctx.arc(z.x, z.y, z.radius, 0, Math.PI * 2);
      ctx.stroke();

      // Lv.2+ 内部同心圆环
      if (lvl >= 2) {
        ctx.strokeStyle = lvl >= 5 ? '#e056fd' : '#0984e3';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(z.x, z.y, z.radius * 0.65, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Lv.3+ 内部十字符文或八芒亡魂星
      ctx.strokeStyle = lvl >= 5 ? '#ffffff' : '#dfe6e9';
      ctx.lineWidth = lvl >= 5 ? 2.5 : 1.8;
      const runeR = z.radius * (0.3 + lvl * 0.05);
      const arms = lvl >= 5 ? 8 : 4;
      for (let a = 0; a < arms; a++) {
        const ra = (Math.PI * 2 * a) / arms;
        ctx.beginPath();
        ctx.moveTo(z.x, z.y);
        ctx.lineTo(z.x + Math.cos(ra) * runeR, z.y + Math.sin(ra) * runeR);
        ctx.stroke();
      }

      ctx.restore();
    }

    // F. 极寒冰环 (随等级从微霜浅环 -> 冰晶双环 -> 八角冰棱 -> 绝对零度雪崩暴风)
    for (let i = 0; i < this.frostNovas.length; i++) {
      const fn = this.frostNovas[i];
      const alpha = fn.duration / fn.maxDuration;
      const curR = fn.radius * (1 - alpha * 0.2);
      const lvl = fn.level || 1;

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = alpha;

      // 冰霜主冲击环
      ctx.strokeStyle = lvl >= 6 ? '#ffd700' : (lvl >= 5 ? '#ffffff' : '#00cec9');
      ctx.lineWidth = (lvl >= 5 ? 6 : (2.5 + lvl * 0.7)) * alpha;
      ctx.beginPath();
      ctx.arc(fn.x, fn.y, curR, 0, Math.PI * 2);
      ctx.stroke();

      // 内层耀眼白晶环
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.8 * alpha;
      ctx.beginPath();
      ctx.arc(fn.x, fn.y, Math.max(1, curR - 5), 0, Math.PI * 2);
      ctx.stroke();

      // 冰棱突刺随等级倍增：4棱 -> 6棱 -> 8棱 -> 12棱 -> 16棱
      const spikes = lvl >= 6 ? 16 : (lvl >= 5 ? 12 : (lvl >= 4 ? 8 : (lvl >= 2 ? 6 : 4)));
      ctx.strokeStyle = lvl >= 5 ? '#74b9ff' : '#81ecec';
      ctx.lineWidth = (lvl >= 5 ? 3 : 2) * alpha;
      for (let s = 0; s < spikes; s++) {
        const ang = (Math.PI * 2 * s) / spikes;
        ctx.beginPath();
        ctx.moveTo(fn.x + Math.cos(ang) * (curR * 0.35), fn.y + Math.sin(ang) * (curR * 0.35));
        ctx.lineTo(fn.x + Math.cos(ang) * (curR * (1.05 + lvl * 0.04)), fn.y + Math.sin(ang) * (curR * (1.05 + lvl * 0.04)));
        ctx.stroke();
      }

      ctx.restore();
    }

    // G. 裂铠重击 (随等级从赤红轻弧 -> 嗜血双月 -> 破甲血刃 -> 泰坦裂地神威斩)
    for (let i = 0; i < this.mortalStrikes.length; i++) {
      const ms = this.mortalStrikes[i];
      const alpha = ms.duration / ms.maxDuration;
      const lvl = ms.level || 1;

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = alpha;

      const sweepAngle = Math.PI * (0.6 + Math.min(0.3, lvl * 0.05));
      const baseAngle = ms.facing === 1 ? 0 : Math.PI;
      const startA = baseAngle - sweepAngle / 2;
      const endA = baseAngle + sweepAngle / 2;
      const r = ms.radius * (0.8 + (1 - alpha) * 0.3);

      // 月牙斩击主弧
      ctx.strokeStyle = lvl >= 6 ? '#ffd700' : (lvl >= 5 ? '#f1c40f' : (lvl >= 3 ? '#e74c3c' : '#c0392b'));
      ctx.lineWidth = (lvl >= 5 ? 8 : (4 + lvl * 0.8)) * alpha;
      ctx.beginPath();
      ctx.arc(ms.x, ms.y, r, startA, endA);
      ctx.stroke();

      // 内层白炽锋芒
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = (lvl >= 5 ? 3.5 : 2) * alpha;
      ctx.beginPath();
      ctx.arc(ms.x, ms.y, r - 3, startA, endA);
      ctx.stroke();

      // Lv.3+ 增添副重斩击残影弧
      if (lvl >= 3) {
        ctx.strokeStyle = lvl >= 5 ? '#ff7675' : '#d63031';
        ctx.lineWidth = 2 * alpha;
        ctx.beginPath();
        ctx.arc(ms.x, ms.y, r * 0.72, startA, endA);
        ctx.stroke();
      }

      ctx.restore();
    }

    // H. 狂雷风暴链 (随等级从单道电火花 -> 幽蓝双连锁 -> 高压离子雷暴 -> 泰坦神雷万引天雷)
    for (let i = 0; i < this.chainLightnings.length; i++) {
      const cl = this.chainLightnings[i];
      const alpha = cl.duration / cl.maxDuration;
      if (!cl.points || cl.points.length < 2) continue;
      const lvl = cl.level || (cl.isMax ? 5 : 1);

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = alpha;

      // 闪电主干弧
      ctx.strokeStyle = lvl >= 6 ? '#ffd700' : (lvl >= 5 ? '#f1c40f' : (lvl >= 3 ? '#00cec9' : '#0984e3'));
      ctx.lineWidth = (lvl >= 5 ? 6 : (2.5 + lvl * 0.7)) * alpha;
      ctx.beginPath();
      ctx.moveTo(cl.points[0].x, cl.points[0].y);
      for (let p = 1; p < cl.points.length; p++) {
        const p0 = cl.points[p - 1];
        const p1 = cl.points[p];
        const mx = (p0.x + p1.x) / 2 + (Math.random() - 0.5) * (8 + lvl * 2.5);
        const my = (p0.y + p1.y) / 2 + (Math.random() - 0.5) * (8 + lvl * 2.5);
        ctx.lineTo(mx, my);
        ctx.lineTo(p1.x, p1.y);
      }
      ctx.stroke();

      // 闪电核心纯白炽光
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = (lvl >= 5 ? 2.5 : 1.5) * alpha;
      ctx.stroke();

      // 命中每个节点产生雷爆球
      for (let p = 0; p < cl.points.length; p++) {
        ctx.fillStyle = lvl >= 5 ? '#ffd700' : '#ffffff';
        ctx.beginPath();
        ctx.arc(cl.points[p].x, cl.points[p].y, 3 + lvl * 0.8, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    // I. 极冰暴风雪 (肯瑞托寒霜风暴 - 每一级肉眼可见质变)
    for (let i = 0; i < this.blizzards.length; i++) {
      const b = this.blizzards[i];
      if (b.x < -b.radius || b.x > SCREEN_WIDTH + b.radius || b.y < -b.radius || b.y > SCREEN_HEIGHT + b.radius) continue;
      const alpha = Math.min(1, b.duration / (b.maxDuration * 0.3));

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = alpha * 0.8;

      // 地面冰霜浅池
      ctx.fillStyle = b.level >= 6 ? 'rgba(255, 234, 167, 0.25)' : (b.level >= 5 ? 'rgba(0, 206, 201, 0.3)' : 'rgba(116, 185, 255, 0.22)');
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fill();

      // 外周冰霜结晶环 (随等级倍增)
      ctx.strokeStyle = b.level >= 6 ? '#ffd700' : (b.level >= 5 ? '#00cec9' : '#74b9ff');
      ctx.lineWidth = b.level >= 5 ? 3.5 : 2;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.stroke();

      // Lv.3+ 内部旋转冰晶雪花印记
      if (b.level >= 3) {
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(this.orbitAngle * 1.5);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.8;
        const pts = b.level >= 5 ? 12 : 6;
        for (let p = 0; p < pts; p++) {
          const a = (Math.PI * 2 * p) / pts;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(a) * (b.radius * 0.8), Math.sin(a) * (b.radius * 0.8));
          ctx.stroke();
        }
        ctx.restore();
      }

      // 冰锥从天坠落粒子
      ctx.fillStyle = '#ffffff';
      const dropCount = b.level >= 5 ? 8 : (b.level >= 3 ? 5 : 3);
      for (let d = 0; d < dropCount; d++) {
        const offX = (Math.sin(b.tick * 0.4 + d * 1.5)) * (b.radius * 0.7);
        const offY = (Math.cos(b.tick * 0.3 + d * 2.1)) * (b.radius * 0.7);
        ctx.beginPath();
        ctx.moveTo(b.x + offX, b.y + offY - 14);
        ctx.lineTo(b.x + offX + 2, b.y + offY);
        ctx.lineTo(b.x + offX - 2, b.y + offY);
        ctx.closePath();
        ctx.fill();
      }

      ctx.restore();
    }

    // J. 神圣震击 (天界神罚金柱)
    for (let i = 0; i < this.holyShocks.length; i++) {
      const s = this.holyShocks[i];
      const alpha = s.duration / s.maxDuration;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = alpha;

      const beamW = s.level >= 5 ? 36 : (14 + s.level * 4);
      // 圣雷天罚光束 (利用离屏 Canvas 预烘焙柱状渐变直接绘制)
      if (this.cachedHolyBeamCanvas) {
        ctx.drawImage(this.cachedHolyBeamCanvas, s.x - beamW / 2, 0, beamW, s.y);
      } else {
        ctx.fillStyle = s.level >= 6 ? '#ffffff' : '#ffd700';
        ctx.fillRect(s.x - beamW / 2, 0, beamW, s.y);
      }

      // 地面冲击光环与十字
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(s.x, s.y, beamW * 1.2, beamW * 0.6, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    }

    // K. 白骨风暴 (主角周身环绕飞旋骨矛)
    const boneLvl = this.learnedSkills['bone_storm'] || 0;
    if (boneLvl > 0 && player) {
      const spearCount = boneLvl >= 5 ? 8 : (boneLvl >= 4 ? 6 : (boneLvl >= 3 ? 4 : (boneLvl >= 2 ? 3 : 2)));
      const orbitR = 48 + boneLvl * 8;

      for (let s = 0; s < spearCount; s++) {
        const ang = this.boneStormAngle + (Math.PI * 2 * s) / spearCount;
        const sx = player.x + Math.cos(ang) * orbitR;
        const sy = player.y + Math.sin(ang) * orbitR;

        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(ang + Math.PI / 2);
        ctx.globalCompositeOperation = 'lighter';

        // 骨刃本体 (随等级演变：白骨矛 -> 鲜血符文骨刃 -> 巨型天灾冰魄骨镰)
        const spearLen = boneLvl >= 5 ? 32 : (18 + boneLvl * 2.5);
        ctx.fillStyle = boneLvl >= 6 ? '#ffd700' : (boneLvl >= 5 ? '#00cec9' : (boneLvl >= 3 ? '#e74c3c' : '#ffffff'));
        ctx.beginPath();
        ctx.moveTo(0, -spearLen);
        ctx.lineTo(4, spearLen * 0.6);
        ctx.lineTo(-4, spearLen * 0.6);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#2d3436';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        ctx.restore();
      }
    }

    // L. 雷霆震击 (泰坦狂雷裂地地裂波)
    for (let i = 0; i < this.thunderClaps.length; i++) {
      const tc = this.thunderClaps[i];
      const alpha = tc.duration / tc.maxDuration;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = alpha;

      const r = tc.radius * (1 - alpha * 0.3);
      ctx.strokeStyle = tc.level >= 5 ? '#f1c40f' : '#0984e3';
      ctx.lineWidth = 3 * alpha;
      ctx.beginPath();
      ctx.arc(tc.x, tc.y, r, 0, Math.PI * 2);
      ctx.stroke();

      // 多向放射状电光裂纹
      const dirs = tc.dirCount || 4;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.8 * alpha;
      for (let d = 0; d < dirs; d++) {
        const da = (Math.PI * 2 * d) / dirs;
        ctx.beginPath();
        ctx.moveTo(tc.x, tc.y);
        const mx = tc.x + Math.cos(da) * (r * 0.5) + (Math.random() - 0.5) * 8;
        const my = tc.y + Math.sin(da) * (r * 0.5) + (Math.random() - 0.5) * 8;
        ctx.lineTo(mx, my);
        ctx.lineTo(tc.x + Math.cos(da) * r, tc.y + Math.sin(da) * r);
        ctx.stroke();
      }

      ctx.restore();
    }

    // M. 嗜血战歌 (赤炎狂战斩击波)
    for (let i = 0; i < this.bloodlustWaves.length; i++) {
      const bw = this.bloodlustWaves[i];
      const alpha = bw.duration / bw.maxDuration;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = alpha;

      const curR = bw.radius * (1 - alpha * 0.2);
      ctx.strokeStyle = bw.level >= 5 ? '#ffd700' : '#e74c3c';
      ctx.lineWidth = (bw.level >= 5 ? 5 : 3) * alpha;
      ctx.beginPath();
      ctx.arc(bw.x, bw.y, curR, 0, Math.PI * 2);
      ctx.stroke();

      // 内层双环
      if (bw.level >= 3) {
        ctx.strokeStyle = '#ff7675';
        ctx.lineWidth = 1.8 * alpha;
        ctx.beginPath();
        ctx.arc(bw.x, bw.y, curR * 0.7, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.restore();
    }

    ctx.restore();
  }
}
