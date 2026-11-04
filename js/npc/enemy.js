/**
 * 魔兽怪物潮系统 (Enemy Horde System)
 * 包含亡灵食尸鬼、军团小鬼、骷髅勇士、恶魔守卫、憎恶Boss等
 *
 * 【需求 G —— 敌人视觉规范资产字段】
 * 每个敌人在数据结构中预留「暗黑硬核热血漫画风」贴图/动画资产路径字段：
 *   - art: { base: 基础贴图路径, anim: { idle/walk/attack/hurt/death } 动画帧序列路径 }
 *   - artStyle: 'darkManga' 固定标识，与 UI 主题「暗黑」保持一致
 * 渲染层优先读 art 资产；未提供时回退到现有 Canvas 矢量绘制。
 */

import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../render';
import { getTimelineSnapshot, getFlowCurve, FINAL_BOSS_TIME } from './WaveManager';

export const ENEMY_TYPES = {
  // 1. 异星飞蚤 (Xeno Swarmer) - 疾速跳跃成群蜂拥 (墨绿甲壳暗黑幼体)
  XENO_SWARMER: {
    name: '异星飞蚤',
    hp: 20,
    speed: 2.3,
    radius: 12,
    damage: 8,
    exp: 1,
    color: '#2e5c3e',
    glowColor: '#4a7a5a',
    icon: '🦗',
  },
  // 2. 异形突击兵 (Xeno Trooper) - 暗黑小灰人突击兵
  XENO_TROOPER: {
    name: '异形突击兵',
    hp: 40,
    speed: 1.7,
    radius: 15,
    damage: 13,
    exp: 2,
    color: '#40285a',
    glowColor: '#5a4a8a',
    icon: '👾',
  },
  // 3. ⭐ 强酸喷吐兽 (Xeno Acid Spitter) - 远程怪：喷射高腐蚀毒液弹
  XENO_ACID_SPITTER: {
    name: '强酸喷吐兽',
    hp: 32,
    speed: 1.3,
    radius: 14,
    damage: 12,
    exp: 3,
    isRanged: true,
    shootInterval: 160, // 降低射速，留出充足反应与走位时间
    projectileType: 'acid',
    color: '#3f6a3a',
    glowColor: '#5a8a4a',
    icon: '🦎',
  },
  // 4. ⭐ 幽浮突击艇 (UFO Scout) - 远程怪：悬浮飞碟发射高频离子激光
  UFO_SCOUT: {
    name: '幽浮突击艇',
    hp: 50,
    speed: 1.6,
    radius: 16,
    damage: 14,
    exp: 4,
    isRanged: true,
    shootInterval: 140, // 降低射速，避免激光暴雨压制
    projectileType: 'laser',
    color: '#3a5a62',
    glowColor: '#2a3438',
    icon: '🛸',
  },
  // 5. 异星重装泰坦 (Xeno Behemoth) - 精英外星巨兽：深红重甲
  XENO_BEHEMOTH: {
    name: '装甲巨形泰坦',
    hp: 190,
    speed: 1.4,
    radius: 26,
    damage: 25,
    exp: 10,
    isElite: true,
    color: '#6a2a22',
    glowColor: '#8a3a30',
    icon: '🦖',
  },
  // 6. 👑 母巢主脑·泽拉斯 (Hive Brainmaster) - 终极异星领主Boss：灵能念波全屏暴虐
  BOSS_HIVE_MIND: {
    name: '母巢主脑·泽拉斯',
    hp: 800,
    speed: 1.0,
    radius: 38,
    damage: 32,
    exp: 40,
    isBoss: true,
    isRanged: true,
    shootInterval: 65,
    projectileType: 'psychic',
    color: '#40285a',
    glowColor: '#5a4a8a',
    icon: '🧠',
  },

  // 7. 🔭 星际狙击手 (Xeno Sniper) - 远程狙击手：超远射程单体高伤激光狙
  XENO_SNIPER: {
    name: '星际狙击手',
    hp: 46,
    speed: 1.2,
    radius: 14,
    damage: 22,
    exp: 5,
    isRanged: true,
    shootInterval: 200, // 低频高伤：长蓄力狙击
    projectileType: 'snipe', // 高速贯穿狙击弹
    color: '#4a3a5a',
    glowColor: '#6a5a8a',
    icon: '🔭',
  },
  // 8. 💣 范围投弹手 (Xeno Bomber) - 范围投弹手：抛射范围溅射毒爆弹
  XENO_BOMBER: {
    name: '范围投弹手',
    hp: 58,
    speed: 1.1,
    radius: 17,
    damage: 18,
    exp: 6,
    isRanged: true,
    shootInterval: 240, // 低频高威胁：抛物线范围轰炸
    projectileType: 'bomb', // 范围溅射炸弹
    color: '#5a4a2a',
    glowColor: '#7a5a3a',
    icon: '💣',
  },
  // 9. ⚡ 激光巨兽 (Xeno Laser Beast) - 激光怪：引导式持续激光扫射
  XENO_LASER_BEAST: {
    name: '激光巨兽',
    hp: 70,
    speed: 1.0,
    radius: 20,
    damage: 16,
    exp: 7,
    isRanged: true,
    shootInterval: 120, // 高频低伤：持续激光扫射
    projectileType: 'beam', // 引导激光束
    color: '#3a4a5a',
    glowColor: '#5a7a9a',
    icon: '⚡',
  },
};

// 兼容映射历史键值
ENEMY_TYPES.GHOUL = ENEMY_TYPES.XENO_SWARMER;
ENEMY_TYPES.IMP = ENEMY_TYPES.XENO_TROOPER;
ENEMY_TYPES.SKELETON = ENEMY_TYPES.XENO_ACID_SPITTER;
ENEMY_TYPES.FELGUARD = ENEMY_TYPES.XENO_BEHEMOTH;
ENEMY_TYPES.BOSS_ABOMINATION = ENEMY_TYPES.BOSS_HIVE_MIND;

/**
 * 敌人视觉规范 —— 暗黑硬核热血漫画风资产路径（需求 G）
 *
 * 统一为每个敌人类型注入预留的贴图/动画资产字段：
 *   artStyle: 'darkManga'（与 UI 暗黑主题一致）
 *   art.base: 基础贴图路径（空字符串 = 未提供，回退 Canvas 矢量绘制）
 *   art.anim: { idle/walk/attack/hurt/death } 动画帧序列路径（空 = 暂无）
 *
 * 资产命名约定（预留，供后续美术填充）：
 *   images/enemies/manga/<typeKey>_base.png
 *   images/enemies/manga/<typeKey>_{idle|walk|attack|hurt|death}.png
 */
const DARK_MANGA_ART_STYLE = 'darkManga';

function attachEnemyArtDefaults() {
  const typeKeys = Object.keys(ENEMY_TYPES).filter(
    (k) => !['GHOUL', 'IMP', 'SKELETON', 'FELGUARD', 'BOSS_ABOMINATION'].includes(k)
  );
  for (const key of typeKeys) {
    const t = ENEMY_TYPES[key];
    if (!t || typeof t !== 'object') continue;
    if (!t.artStyle) t.artStyle = DARK_MANGA_ART_STYLE;
    if (!t.art) {
      t.art = {
        base: '', // 预留：暗黑硬核热血漫画风基础贴图
        anim: { idle: '', walk: '', attack: '', hurt: '', death: '' },
      };
    }
  }
}
attachEnemyArtDefaults();

/**
 * 获取敌人暗黑漫画风贴图路径（预留接口，供渲染层读取）
 * @param {string} typeKey 敌人类型键
 * @returns {string} 贴图路径（空字符串表示未提供）
 */
export function getEnemyArtBase(typeKey) {
  const t = ENEMY_TYPES[typeKey];
  return (t && t.art && t.art.base) || '';
}

/**
 * 获取敌人动画帧路径（预留接口）
 * @param {string} typeKey 敌人类型键
 * @param {string} animName idle/walk/attack/hurt/death
 * @returns {string} 动画帧路径（空字符串表示未提供）
 */
export function getEnemyArtAnim(typeKey, animName) {
  const t = ENEMY_TYPES[typeKey];
  if (t && t.art && t.art.anim) {
    return t.art.anim[animName] || '';
  }
  return '';
}

// 全局波次演进配置表 (前 60 秒全程慢节奏、少怪、易割草，后续阶梯爆发)
// 前 8 波为「新手引导 + 阶梯爆发」，第 8 波之后进入「无限波次循环」模式。
export const WAVE_CONFIG = [
  { wave: 1, time: 0,   title: '异星幼体 · 探路先遣', interval: 88, batch: 1, hpScale: 0.70, speedScale: 0.82 },
  { wave: 2, time: 20,  title: '异形工虫 · 蜂拥增援', interval: 75, batch: 1, hpScale: 0.75, speedScale: 0.85 },
  { wave: 3, time: 40,  title: '突击兵锋 · 生化渗透', interval: 64, batch: 1, hpScale: 0.85, speedScale: 0.90 },
  { wave: 4, time: 60,  title: '主力军团 · 全面进犯', interval: 48, batch: 2, hpScale: 1.00, speedScale: 1.00 }, // 1分钟爆发
  { wave: 5, time: 85,  title: '装甲泰坦 · 撼地重锤', interval: 40, batch: 2, hpScale: 1.15, speedScale: 1.00 },
  { wave: 6, time: 115, title: '生化剧毒 · 强酸喷吐', interval: 34, batch: 2, hpScale: 1.25, speedScale: 1.05 },
  { wave: 7, time: 150, title: '幽浮突袭 · 离子飞碟', interval: 28, batch: 3, hpScale: 1.40, speedScale: 1.10 },
  { wave: 8, time: 180, title: '泽拉斯亲临 · 母巢决战', interval: 22, batch: 3, hpScale: 1.60, speedScale: 1.15 },
];

/**
 * 无限波次循环配置（第 8 波之后，按周期循环，持续强化）
 * 每循环一轮：波次号 +8，数值膨胀继续叠加，敌人强度随波次线性增长。
 */
export const ENDLESS_WAVE_CONFIG = {
  baseInterval: 20,       // 基础刷怪间隔（帧），随循环递减
  minInterval: 12,        // 刷怪间隔下限
  cycleLength: 8,         // 一个循环的波次数（与 WAVE_CONFIG 长度对齐）
  hpGrowthPerCycle: 0.22, // 每循环血量膨胀系数
  speedGrowthPerCycle: 0.04, // 每循环速度膨胀系数
};

/**
 * 根据游戏时间，解析当前无限波次（无限循环，永不卡死）
 * 前 8 波走 WAVE_CONFIG 固定时间表；第 8 波后进入无限循环：
 *   wave = 8 + floor((time - 180) / 周期时长) 循环递增
 *
 * @param {number} timeSeconds 游戏时间（秒）
 * @returns {{ wave: number, cycle: number, interval: number, batch: number, hpScale: number, speedScale: number, title: string, isEndless: boolean }}
 */
export function resolveWave(timeSeconds) {
  // 1. 前 8 波：按固定时间表
  let targetIdx = 0;
  for (let i = WAVE_CONFIG.length - 1; i >= 0; i--) {
    if (timeSeconds >= WAVE_CONFIG[i].time) {
      targetIdx = i;
      break;
    }
  }

  const lastWave = WAVE_CONFIG[WAVE_CONFIG.length - 1]; // 第 8 波
  const lastCfg = WAVE_CONFIG[targetIdx];

  // 2. 未超过第 8 波：直接返回固定配置
  if (targetIdx < WAVE_CONFIG.length - 1 || timeSeconds < lastWave.time + 1) {
    return {
      wave: lastCfg.wave,
      cycle: 0,
      interval: lastCfg.interval,
      batch: lastCfg.batch,
      hpScale: lastCfg.hpScale,
      speedScale: lastCfg.speedScale,
      title: lastCfg.title,
      isEndless: false,
    };
  }

  // 3. 第 8 波之后：进入无限循环
  // 每 30 秒推进一个循环波次，无限递增
  const ENDLESS_PERIOD = 30; // 每个循环波次的时长（秒）
  const elapsedSinceBoss = timeSeconds - lastWave.time;
  const cycleOffset = Math.floor(elapsedSinceBoss / ENDLESS_PERIOD); // 0,1,2,3...
  const waveNum = lastWave.wave + cycleOffset; // 9,10,11,...

  // 数值膨胀：随循环轮次持续增强
  const cycle = Math.floor(cycleOffset / ENDLESS_WAVE_CONFIG.cycleLength) + 1;
  const hpScale = lastCfg.hpScale + cycle * ENDLESS_WAVE_CONFIG.hpGrowthPerCycle;
  const speedScale = Math.min(1.6, lastCfg.speedScale + cycle * ENDLESS_WAVE_CONFIG.speedGrowthPerCycle);
  const interval = Math.max(ENDLESS_WAVE_CONFIG.minInterval, Math.floor(lastCfg.interval - cycleOffset * 0.6));

  return {
    wave: waveNum,
    cycle,
    interval,
    batch: Math.min(6, lastCfg.batch + Math.floor(cycleOffset / 3)),
    hpScale,
    speedScale,
    title: `母巢复苏 · 无尽第 ${cycle} 轮`,
    isEndless: true,
  };
}

export class Enemy {
  constructor() {
    this.reset();
  }

  reset() {
    this.x = 0;
    this.y = 0;
    this.hp = 20;
    this.maxHp = 20;
    this.speed = 1.8;
    this.radius = 14;
    this.damage = 10;
    this.exp = 1;
    this.typeKey = 'GHOUL';
    this.typeData = ENEMY_TYPES.GHOUL;
    this.active = false;

    this.vx = 0;
    this.vy = 0;
    this.kbX = 0; // 击退冲量
    this.kbY = 0;
    this.hitFlash = 0; // 受击白光闪烁帧数

    this.curseDuration = 0; // 受到痛苦诅咒持续时间
    this.curseTick = 0;
    this.slowDuration = 0; // 减速状态
    this.attackCooldown = 0; // 怪物普攻冷却，避免一瞬间秒杀玩家
    this.shootCooldown = Math.floor(Math.random() * 40); // 远程射击计时器
    this.pulse = Math.random() * Math.PI * 2;
  }

  init(typeKey, x, y, waveHpScale = 1.0) {
    this.typeKey = typeKey;
    this.typeData = ENEMY_TYPES[typeKey] || ENEMY_TYPES.XENO_SWARMER;

    this.maxHp = Math.round(this.typeData.hp * waveHpScale);
    this.hp = this.maxHp;
    this.speed = this.typeData.speed * (0.9 + Math.random() * 0.2);
    this.radius = this.typeData.radius;
    this.damage = this.typeData.damage;
    this.exp = this.typeData.exp;

    this.x = x;
    this.y = y;
    this.active = true;
    this.kbX = 0;
    this.kbY = 0;
    this.hitFlash = 0;
    this.curseDuration = 0;
    this.slowDuration = 0;
    this.attackCooldown = 0;
    this.shootCooldown = Math.floor(Math.random() * 40);
  }

  knockback(dirX, dirY, force = 6) {
    this.kbX += dirX * force;
    this.kbY += dirY * force;
  }

  applyCurse(durationFrames = 180) {
    this.curseDuration = durationFrames;
  }

  applySlow(durationFrames = 120) {
    this.slowDuration = durationFrames;
  }

  takeDamage(amount, isCrit = false) {
    if (!this.active) return { dead: false, actualDamage: 0 };

    this.hp -= amount;
    this.hitFlash = 4; // 闪白4帧

    if (this.hp <= 0) {
      this.active = false;
      return { dead: true, actualDamage: amount };
    }

    return { dead: false, actualDamage: amount };
  }

  update(player) {
    if (!this.active) return null;

    this.pulse += 0.1;

    if (this.attackCooldown > 0) {
      this.attackCooldown--;
    }

    // 衰减击退
    this.x += this.kbX;
    this.y += this.kbY;
    this.kbX *= 0.85;
    this.kbY *= 0.85;

    // 处理痛苦诅咒持续掉血
    if (this.curseDuration > 0) {
      this.curseDuration--;
      this.curseTick++;
      if (this.curseTick >= 30) {
        this.curseTick = 0;
        this.hp -= 4;
        this.hitFlash = 2;
        if (this.hp <= 0) {
          this.active = false;
          return { dead: true, curseDeath: true };
        }
      }
    }

    // 计算到玩家距离
    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // 远程外星怪（强酸喷吐怪、幽浮飞碟、领主Boss）远程发射外星电浆/强酸
    let shootEvent = null;
    if (this.typeData.isRanged && dist < 280) {
      this.shootCooldown = (this.shootCooldown || 0) + 1;
      const interval = this.typeData.shootInterval || 85;
      if (this.shootCooldown >= interval) {
        this.shootCooldown = 0;
        shootEvent = {
          shoot: true,
          x: this.x,
          y: this.y,
          targetX: player.x,
          targetY: player.y,
          projectileType: this.typeData.projectileType || 'acid',
          damage: this.damage,
        };
      }
    }

    if (dist > 2) {
      let currentSpeed = this.speed;
      if (this.slowDuration > 0) {
        this.slowDuration--;
        currentSpeed *= 0.6; // 减速40%
      }

      // 远程怪在舒适射程（130~210px）放慢突进并侧向环绕，给玩家带来真正的外星远程压迫感！
      if (this.typeData.isRanged && dist < 210 && dist > 120) {
        currentSpeed *= 0.35;
        this.vx = (-dy / dist) * currentSpeed;
        this.vy = (dx / dist) * currentSpeed;
      } else {
        this.vx = (dx / dist) * currentSpeed;
        this.vy = (dy / dist) * currentSpeed;
      }

      this.x += this.vx;
      this.y += this.vy;
    }

    if (this.hitFlash > 0) {
      this.hitFlash--;
    }

    return shootEvent;
  }

  render(ctx) {
    if (!this.active) return;

    // 屏幕视口裁剪：屏幕外怪物零开销快速跳过绘制
    if (
      this.x < -this.radius - 25 ||
      this.x > SCREEN_WIDTH + this.radius + 25 ||
      this.y < -this.radius - 25 ||
      this.y > SCREEN_HEIGHT + this.radius + 25
    ) {
      return;
    }

    ctx.save();

    // 地面柔和椭圆阴影
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + this.radius * 0.85, this.radius * 0.85, this.radius * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();

    const isHit = this.hitFlash > 0;

    // 绘制专属外星人入侵者形象 (统一走矢量 Canvas 绘制，萌凶卡通风格，不依赖图片贴图)
    switch (this.typeKey) {
      case 'XENO_SWARMER':
      case 'GHOUL':
        this.drawXenoSwarmer(ctx, isHit);
        break;
      case 'XENO_TROOPER':
      case 'IMP':
        this.drawXenoTrooper(ctx, isHit);
        break;
      case 'XENO_ACID_SPITTER':
      case 'SKELETON':
        this.drawXenoAcidSpitter(ctx, isHit);
        break;
      case 'UFO_SCOUT':
        this.drawUfoScout(ctx, isHit);
        break;
      case 'XENO_BEHEMOTH':
      case 'FELGUARD':
        this.drawXenoBehemoth(ctx, isHit);
        break;
      case 'BOSS_HIVE_MIND':
      case 'BOSS_ABOMINATION':
        this.drawHiveMindBoss(ctx, isHit);
        break;
      case 'XENO_SNIPER':
        this.drawXenoSniper(ctx, isHit);
        break;
      case 'XENO_BOMBER':
        this.drawXenoBomber(ctx, isHit);
        break;
      case 'XENO_LASER_BEAST':
        this.drawXenoLaserBeast(ctx, isHit);
        break;
      default:
        this.drawXenoSwarmer(ctx, isHit);
        break;
    }

    // 痛苦诅咒紫光符文环
    if (this.curseDuration > 0) {
      ctx.save();
      ctx.strokeStyle = 'rgba(155, 89, 182, 0.85)';
      ctx.lineWidth = 1.8;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // 精英怪 / Boss / 残血怪物血条绘制
    if (this.typeData.isElite || this.typeData.isBoss || this.hp < this.maxHp) {
      this.renderEnemyHealthBar(ctx);
    }

    ctx.restore();
  }

  // 1. 🦗 异星飞蚤 (暗黑外星幼体：墨绿几丁甲壳、血红复眼、节肢利足、锐利触须)
  drawXenoSwarmer(ctx, isHit) {
    const r = this.radius;
    const legWiggle = Math.sin(this.pulse * 2.5) * 2;

    ctx.save();
    ctx.translate(this.x, this.y);

    // 头顶两根锐利触须
    ctx.strokeStyle = '#2e5c3e';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-4, -r * 0.6); ctx.quadraticCurveTo(-8, -r * 1.1, -5, -r * 1.3);
    ctx.moveTo(4, -r * 0.6); ctx.quadraticCurveTo(8, -r * 1.1, 5, -r * 1.3);
    ctx.stroke();
    ctx.fillStyle = '#3f6f52';
    ctx.beginPath();
    ctx.arc(-5, -r * 1.32, 2.2, 0, Math.PI * 2);
    ctx.arc(5, -r * 1.32, 2.2, 0, Math.PI * 2);
    ctx.fill();

    // 六条尖锐节肢足
    ctx.strokeStyle = '#1f4a34';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(-r * 0.4, -2); ctx.lineTo(-r * 0.95, -6 + legWiggle);
    ctx.moveTo(-r * 0.4, 2); ctx.lineTo(-r * 0.95, 6 + legWiggle);
    ctx.moveTo(r * 0.4, -2); ctx.lineTo(r * 0.95, -6 - legWiggle);
    ctx.moveTo(r * 0.4, 2); ctx.lineTo(r * 0.95, 6 - legWiggle);
    ctx.stroke();
    ctx.fillStyle = '#3f6f52';
    ctx.beginPath();
    ctx.arc(-r * 0.98, -7 + legWiggle, 2.4, 0, Math.PI * 2);
    ctx.arc(-r * 0.98, 7 + legWiggle, 2.4, 0, Math.PI * 2);
    ctx.arc(r * 0.98, -7 - legWiggle, 2.4, 0, Math.PI * 2);
    ctx.arc(r * 0.98, 7 - legWiggle, 2.4, 0, Math.PI * 2);
    ctx.fill();

    // 墨绿几丁质甲壳
    const shellGrad = ctx.createRadialGradient(-2, -3, 1, 0, 0, r * 0.95);
    shellGrad.addColorStop(0, '#4a7a5a');
    shellGrad.addColorStop(0.6, '#2e5c3e');
    shellGrad.addColorStop(1, '#1a3a28');
    ctx.fillStyle = isHit ? '#ffffff' : shellGrad;
    ctx.strokeStyle = '#0f2418';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.85, r * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 甲壳冷光
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.beginPath();
    ctx.ellipse(-2, 3, r * 0.4, r * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();

    // 血红复眼 (冷血无光凝视：暗色眼窝 + 狭长发光竖瞳，无萌系高光)
    const eyeY = -2;
    // 深陷的眼窝阴影
    ctx.fillStyle = '#0a1810';
    ctx.beginPath();
    ctx.ellipse(r * 0.32, eyeY, 4.6, 5.4, -0.15, 0, Math.PI * 2);
    ctx.ellipse(r * 0.68, eyeY, 4.6, 5.4, 0.15, 0, Math.PI * 2);
    ctx.fill();
    // 狭长暗红发光竖瞳 (向眉心内倾)
    const px = r * 0.08;
    ctx.fillStyle = '#ff2e1a';
    ctx.beginPath();
    ctx.ellipse(r * 0.34 - px, eyeY, 1.5, 3.4, 0, 0, Math.PI * 2);
    ctx.ellipse(r * 0.66 + px, eyeY, 1.5, 3.4, 0, 0, Math.PI * 2);
    ctx.fill();
    // 瞳孔发光外溢
    ctx.fillStyle = 'rgba(255, 60, 30, 0.35)';
    ctx.beginPath();
    ctx.ellipse(r * 0.34 - px, eyeY, 2.6, 4.6, 0, 0, Math.PI * 2);
    ctx.ellipse(r * 0.66 + px, eyeY, 2.6, 4.6, 0, 0, Math.PI * 2);
    ctx.fill();
    // 眉脊：厚实锋利的几丁质骨刃，向眉心深压
    ctx.strokeStyle = '#0f2418';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(r * 0.12, eyeY - 7.5); ctx.lineTo(r * 0.52, eyeY - 3.5);
    ctx.moveTo(r * 0.88, eyeY - 7.5); ctx.lineTo(r * 0.48, eyeY - 3.5);
    ctx.stroke();

    // 锋利口器 + 尖牙利齿
    ctx.strokeStyle = '#0f2418';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(r * 0.5, 3.5, 2.2, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
    // 上下两排锐利獠牙
    ctx.fillStyle = '#e8f0ea';
    ctx.beginPath();
    ctx.moveTo(r * 0.3, 4.2); ctx.lineTo(r * 0.42, 2.2); ctx.lineTo(r * 0.48, 4.2);
    ctx.moveTo(r * 0.52, 4.2); ctx.lineTo(r * 0.62, 2.2); ctx.lineTo(r * 0.68, 4.2);
    ctx.fill();

    ctx.restore();
  }

  // 2. 👾 异形突击兵 (暗黑小灰人突击兵：惨白骨质长颅、漆黑巨眼、消瘦躯干)
  drawXenoTrooper(ctx, isHit) {
    const r = this.radius;
    const bob = Math.sin(this.pulse * 2.0) * 1.5;

    ctx.save();
    ctx.translate(this.x, this.y);

    // 消瘦暗紫躯干
    const bodyGrad = ctx.createRadialGradient(-2, -3, 1, 0, 0, r * 1.0);
    bodyGrad.addColorStop(0, '#5a4a8a');
    bodyGrad.addColorStop(0.6, '#4a3478');
    bodyGrad.addColorStop(1, '#1e1430');
    ctx.fillStyle = isHit ? '#ffffff' : bodyGrad;
    ctx.strokeStyle = '#2a1e4a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 4, r * 0.7, r * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 细长反曲腿
    ctx.fillStyle = '#2a1e4a';
    ctx.beginPath();
    ctx.ellipse(-r * 0.25, r * 0.85, 3, 2.5, 0, 0, Math.PI * 2);
    ctx.ellipse(r * 0.25, r * 0.85, 3, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // 惨白骨质长颅
    const headGrad = ctx.createRadialGradient(-3, -6, 2, 0, -6, r * 0.95);
    headGrad.addColorStop(0, '#5a4a8a');
    headGrad.addColorStop(0.6, '#40285a');
    headGrad.addColorStop(1, '#2a1a3a');
    ctx.fillStyle = isHit ? '#ffffff' : headGrad;
    ctx.strokeStyle = '#2a1e4a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -r * 0.35, r * 0.72, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 漆黑空洞巨眼 (无高光冷血凝视 + 狭长发光竖瞳，侵略性)
    ctx.fillStyle = '#05070a';
    ctx.beginPath();
    ctx.ellipse(-r * 0.28, -r * 0.42, 5.8, 7.2, -0.12, 0, Math.PI * 2);
    ctx.ellipse(r * 0.28, -r * 0.42, 5.8, 7.2, 0.12, 0, Math.PI * 2);
    ctx.fill();
    // 狭长血红发光竖瞳 (内倾)
    ctx.fillStyle = '#ff2e1a';
    ctx.beginPath();
    ctx.ellipse(-r * 0.29, -r * 0.42, 1.3, 3.4, 0, 0, Math.PI * 2);
    ctx.ellipse(r * 0.29, -r * 0.42, 1.3, 3.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 50, 30, 0.3)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.29, -r * 0.42, 2.6, 5.0, 0, 0, Math.PI * 2);
    ctx.ellipse(r * 0.29, -r * 0.42, 2.6, 5.0, 0, 0, Math.PI * 2);
    ctx.fill();
    // 眉脊：骨刃状厚重眉脊，向眉心深压
    ctx.strokeStyle = '#1e1430';
    ctx.lineWidth = 4.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-r * 0.46, -r * 0.68); ctx.lineTo(-r * 0.1, -r * 0.5);
    ctx.moveTo(r * 0.46, -r * 0.68); ctx.lineTo(r * 0.1, -r * 0.5);
    ctx.stroke();

    // 细长利爪手臂
    ctx.strokeStyle = '#2a1e4a';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-r * 0.6, 0); ctx.quadraticCurveTo(-r * 0.95, 2, -r * 0.8, 6 + bob);
    ctx.moveTo(r * 0.6, 0); ctx.quadraticCurveTo(r * 0.95, 2, r * 0.8, 6 + bob);
    ctx.stroke();
    // 末端尖爪
    ctx.fillStyle = '#e8e0d0';
    ctx.beginPath();
    ctx.moveTo(-r * 0.82, 5 + bob); ctx.lineTo(-r * 0.9, 8 + bob); ctx.lineTo(-r * 0.74, 6 + bob);
    ctx.moveTo(r * 0.82, 5 + bob); ctx.lineTo(r * 0.9, 8 + bob); ctx.lineTo(r * 0.74, 6 + bob);
    ctx.fill();

    // 獠牙巨口 (满口尖牙)
    ctx.strokeStyle = '#2a1e4a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, -r * 0.18, 2.5, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
    ctx.fillStyle = '#e8e0d0';
    ctx.beginPath();
    ctx.moveTo(-2.2, -r * 0.1); ctx.lineTo(-1, -r * 0.35); ctx.lineTo(-0.2, -r * 0.1);
    ctx.moveTo(0.4, -r * 0.1); ctx.lineTo(1.4, -r * 0.35); ctx.lineTo(2.2, -r * 0.1);
    ctx.fill();

    ctx.restore();
  }

  // 3. 🦎 强酸喷吐兽 (暗黑强酸喷吐兽：臃肿酸绿身躯、竖瞳、喷酸巨口)
  drawXenoAcidSpitter(ctx, isHit) {
    const r = this.radius;
    const breathe = Math.sin(this.pulse * 1.8) * 2.5;

    ctx.save();
    ctx.translate(this.x, this.y);

    // 臃肿酸绿巨腹
    const acidGrad = ctx.createRadialGradient(-3, -4, 2, 0, 0, r * 0.95);
    acidGrad.addColorStop(0, '#5a8a4a');
    acidGrad.addColorStop(0.6, '#3f6a3a');
    acidGrad.addColorStop(1, '#2a4a2a');
    ctx.fillStyle = isHit ? '#ffffff' : acidGrad;
    ctx.strokeStyle = '#1a301a';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.85 + breathe, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 脊背毒囊
    ctx.fillStyle = '#4a7a42';
    ctx.strokeStyle = '#1a301a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(-r * 0.25, -r * 0.85, 3.5, 0, Math.PI * 2);
    ctx.arc(r * 0.3, -r * 0.85, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 酸囊荧光
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 3, r * 0.42, r * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();

    // 爬虫竖瞳 (冷血狭长发光凝视，无萌系高光)
    ctx.fillStyle = '#0a1a0c';
    ctx.beginPath();
    ctx.ellipse(-r * 0.3, -r * 0.1, 4.6, 5.6, -0.1, 0, Math.PI * 2);
    ctx.ellipse(r * 0.3, -r * 0.1, 4.6, 5.6, 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#aaff2e';
    ctx.beginPath();
    ctx.ellipse(-r * 0.3, -r * 0.1, 1.2, 3.4, 0, 0, Math.PI * 2);
    ctx.ellipse(r * 0.3, -r * 0.1, 1.2, 3.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(170, 255, 46, 0.3)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.3, -r * 0.1, 2.4, 4.8, 0, 0, Math.PI * 2);
    ctx.ellipse(r * 0.3, -r * 0.1, 2.4, 4.8, 0, 0, Math.PI * 2);
    ctx.fill();
    // 眉脊：厚实骨刃眉脊
    ctx.strokeStyle = '#1a301a';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-r * 0.5, -r * 0.34); ctx.lineTo(-r * 0.16, -r * 0.18);
    ctx.moveTo(r * 0.5, -r * 0.34); ctx.lineTo(r * 0.16, -r * 0.18);
    ctx.stroke();

    // 前端喷酸巨口 (满口尖牙)
    ctx.fillStyle = '#1a301a';
    ctx.beginPath();
    ctx.arc(r * 0.5, 4, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8f0ea';
    ctx.beginPath();
    ctx.moveTo(r * 0.42, 2.5); ctx.lineTo(r * 0.52, 0.8); ctx.lineTo(r * 0.6, 2.5);
    ctx.moveTo(r * 0.5, 5.5); ctx.lineTo(r * 0.62, 7); ctx.lineTo(r * 0.72, 5.5);
    ctx.fill();
    // 蓄力滴落的酸液
    ctx.fillStyle = '#5a8a4a';
    ctx.beginPath();
    ctx.arc(r * 0.75, 7 + breathe, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // 4. 🛸 幽浮突击艇 (暗黑幽浮：金属灰蓝飞碟、幽光座舱、小灰人驾驶员)
  drawUfoScout(ctx, isHit) {
    const r = this.radius;
    const floatY = Math.sin(this.pulse * 2.0) * 3;

    ctx.save();
    ctx.translate(this.x, this.y + floatY);

    // 底部反重力幽光
    ctx.fillStyle = 'rgba(60, 80, 90, 0.3)';
    ctx.beginPath();
    ctx.ellipse(0, 9, r * 0.65, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // 金属灰蓝飞碟主盘
    const discGrad = ctx.createLinearGradient(0, -r * 0.5, 0, r * 0.5);
    discGrad.addColorStop(0, '#5a6a72');
    discGrad.addColorStop(0.5, '#3a4a52');
    discGrad.addColorStop(1, '#2a3438');
    ctx.fillStyle = isHit ? '#ffffff' : discGrad;
    ctx.strokeStyle = '#1a2428';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.05, r * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 幽光座舱玻璃罩
    ctx.fillStyle = isHit ? '#ffffff' : 'rgba(90, 110, 120, 0.85)';
    ctx.strokeStyle = '#3a5a62';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(0, -5, r * 0.42, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 座舱内小灰人驾驶员 (冷血发光凝视，无高光)
    ctx.fillStyle = '#2a3a2e';
    ctx.beginPath();
    ctx.arc(0, -6.5, 4.5, 0, Math.PI * 2);
    ctx.fill();
    // 漆黑狭长眼窝
    ctx.fillStyle = '#05070a';
    ctx.beginPath();
    ctx.ellipse(-1.6, -7, 2.0, 2.4, -0.1, 0, Math.PI * 2);
    ctx.ellipse(1.6, -7, 2.0, 2.4, 0.1, 0, Math.PI * 2);
    ctx.fill();
    // 血红发光竖瞳
    ctx.fillStyle = '#ff2e1a';
    ctx.beginPath();
    ctx.ellipse(-1.6, -7, 0.9, 1.8, 0, 0, Math.PI * 2);
    ctx.ellipse(1.6, -7, 0.9, 1.8, 0, 0, Math.PI * 2);
    ctx.fill();
    // 眉脊
    ctx.strokeStyle = '#1a2428';
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-3.6, -9.4); ctx.lineTo(-1.6, -8.2);
    ctx.moveTo(3.6, -9.4); ctx.lineTo(1.6, -8.2);
    ctx.stroke();
    // 尖牙
    ctx.fillStyle = '#e8e0d0';
    ctx.beginPath();
    ctx.moveTo(-1.8, -4.5); ctx.lineTo(-1, -6); ctx.lineTo(-0.2, -4.5);
    ctx.moveTo(0.4, -4.5); ctx.lineTo(1.2, -6); ctx.lineTo(2, -4.5);
    ctx.fill();

    // 飞碟周圈循环闪烁的警示舷灯
    for (let i = 0; i < 4; i++) {
      const ang = this.pulse * 2.5 + (Math.PI / 2) * i;
      const lx = Math.cos(ang) * (r * 0.82);
      const ly = Math.sin(ang) * (r * 0.34);
      ctx.fillStyle = i % 2 === 0 ? '#8a2a30' : '#ffd66b';
      ctx.beginPath();
      ctx.arc(lx, ly, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.beginPath();
      ctx.arc(lx - 0.7, ly - 0.7, 0.8, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  // 5. 🦖 异星重装泰坦 (暗黑重装泰坦：深红重甲巨躯、暴虐复眼、粗壮巨拳)
  drawXenoBehemoth(ctx, isHit) {
    const r = this.radius;
    const stomp = Math.sin(this.pulse * 1.5) * 2.5;

    ctx.save();
    ctx.translate(this.x, this.y);

    // 深红重甲巨躯
    const bodyGrad = ctx.createRadialGradient(-3, -4, 2, 0, 0, r * 0.95);
    bodyGrad.addColorStop(0, '#8a3a30');
    bodyGrad.addColorStop(0.6, '#6a2a22');
    bodyGrad.addColorStop(1, '#4a1e1a');
    ctx.fillStyle = isHit ? '#ffffff' : bodyGrad;
    ctx.strokeStyle = '#30120e';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.arc(0, stomp, r * 0.88, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 脊背熔岩散热孔
    ctx.fillStyle = '#ffd66b';
    ctx.beginPath();
    for (let i = -2; i <= 2; i++) {
      ctx.arc(i * 6, stomp - r * 0.7, 2.2, 0, Math.PI * 2);
    }
    ctx.fill();

    // 暴虐金色复眼 (无高光冷血凝视 + 发光怒瞳)
    ctx.fillStyle = '#140804';
    ctx.beginPath();
    ctx.ellipse(-6, stomp - 3, 6.2, 6.8, -0.1, 0, Math.PI * 2);
    ctx.ellipse(6, stomp - 3, 6.2, 6.8, 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff8a00';
    ctx.beginPath();
    ctx.ellipse(-5.5, stomp - 2.5, 2.4, 3.6, 0, 0, Math.PI * 2);
    ctx.ellipse(6.5, stomp - 2.5, 2.4, 3.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 138, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(-5.5, stomp - 2.5, 3.8, 5.2, 0, 0, Math.PI * 2);
    ctx.ellipse(6.5, stomp - 2.5, 3.8, 5.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#140804';
    ctx.beginPath();
    ctx.ellipse(-5.5, stomp - 2.5, 1.1, 2.6, 0, 0, Math.PI * 2);
    ctx.ellipse(6.5, stomp - 2.5, 1.1, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();
    // 眉脊：厚重骨刃眉脊，向眉心深压
    ctx.strokeStyle = '#30120e';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-11.5, stomp - 9.5); ctx.lineTo(-3, stomp - 6);
    ctx.moveTo(11.5, stomp - 9.5); ctx.lineTo(3, stomp - 6);
    ctx.stroke();

    // 粗壮生化巨拳 (带尖刺指节)
    ctx.fillStyle = '#6a2a22';
    ctx.strokeStyle = '#30120e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(-r * 0.9, stomp + 2, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(r * 0.9, stomp + 2, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // 拳上尖刺
    ctx.fillStyle = '#ffd66b';
    ctx.beginPath();
    ctx.moveTo(-r * 1.05, stomp - 1); ctx.lineTo(-r * 1.3, stomp - 3); ctx.lineTo(-r * 0.95, stomp + 1);
    ctx.moveTo(r * 1.05, stomp - 1); ctx.lineTo(r * 1.3, stomp - 3); ctx.lineTo(r * 0.95, stomp + 1);
    ctx.fill();

    // 獠牙骨角
    ctx.fillStyle = '#ffd66b';
    ctx.strokeStyle = '#30120e';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-7, stomp - r * 0.7);
    ctx.quadraticCurveTo(-13, stomp - r * 1.15, -8, stomp - r * 1.2);
    ctx.lineTo(-5, stomp - r * 0.75);
    ctx.closePath();
    ctx.moveTo(7, stomp - r * 0.7);
    ctx.quadraticCurveTo(13, stomp - r * 1.15, 8, stomp - r * 1.2);
    ctx.lineTo(5, stomp - r * 0.75);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 獠牙巨口 (满口尖牙)
    ctx.strokeStyle = '#30120e';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(0, stomp + 4, 3.5, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
    ctx.fillStyle = '#ffd66b';
    ctx.beginPath();
    ctx.moveTo(-3, stomp + 2.5); ctx.lineTo(-2, stomp + 0.5); ctx.lineTo(-1, stomp + 2.5);
    ctx.moveTo(1, stomp + 2.5); ctx.lineTo(2, stomp + 0.5); ctx.lineTo(3, stomp + 2.5);
    ctx.fill();

    ctx.restore();
  }

  // 6. 🧠 母巢主脑·泽拉斯 (虚空母巢主脑：暗紫灵能脑髓、血红独眼、蜿蜒触手)
  drawHiveMindBoss(ctx, isHit) {
    const r = this.radius;
    const brainPulse = Math.sin(this.pulse * 2.0) * 3.5;
    const tentWave = Math.sin(this.pulse * 1.5) * 6;

    ctx.save();
    ctx.translate(this.x, this.y);

    // 暗紫灵能光晕
    ctx.fillStyle = 'rgba(90, 50, 120, 0.25)';
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.35 + brainPulse, 0, Math.PI * 2);
    ctx.fill();

    // 下方蜿蜒外星触手
    ctx.strokeStyle = '#40285a';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-12, r * 0.5);
    ctx.quadraticCurveTo(-22, r * 1.1 + tentWave, -14, r * 1.5 - tentWave);
    ctx.moveTo(0, r * 0.6);
    ctx.quadraticCurveTo(0, r * 1.2 - tentWave, 4, r * 1.6 + tentWave);
    ctx.moveTo(12, r * 0.5);
    ctx.quadraticCurveTo(22, r * 1.1 + tentWave, 14, r * 1.5 - tentWave);
    ctx.stroke();
    // 触手
    ctx.fillStyle = '#50386a';
    ctx.beginPath();
    ctx.arc(-14, r * 1.5 - tentWave, 3.5, 0, Math.PI * 2);
    ctx.arc(4, r * 1.6 + tentWave, 3.5, 0, Math.PI * 2);
    ctx.arc(14, r * 1.5 - tentWave, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // 巨型暗紫脑髓
    const brainGrad = ctx.createRadialGradient(-3, -6, 3, 0, -2, r * 1.0);
    brainGrad.addColorStop(0, '#5a4a8a');
    brainGrad.addColorStop(0.6, '#40285a');
    brainGrad.addColorStop(1, '#2a1a3a');
    ctx.fillStyle = isHit ? '#ffffff' : brainGrad;
    ctx.strokeStyle = '#1e1430';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, -2, r * 0.95 + brainPulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 大脑沟回褶皱
    ctx.strokeStyle = 'rgba(50, 28, 90, 0.6)';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(-r * 0.5, -r * 0.6);
    ctx.quadraticCurveTo(-r * 0.2, -r * 0.1, -r * 0.6, r * 0.4);
    ctx.moveTo(r * 0.5, -r * 0.6);
    ctx.quadraticCurveTo(r * 0.2, -r * 0.1, r * 0.6, r * 0.4);
    ctx.moveTo(0, -r * 0.8);
    ctx.lineTo(0, r * 0.4);
    ctx.stroke();

    // 中央血红独眼
    ctx.fillStyle = '#0d0510';
    ctx.beginPath();
    ctx.ellipse(0, 0, 13, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    // 血红魔眼 (冷血发光凝视，无高光，多层深红灼目)
    ctx.fillStyle = '#a01818';
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#e02218';
    ctx.beginPath();
    ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ff3b1a';
    ctx.beginPath();
    ctx.arc(0, 0, 2.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#160208';
    ctx.beginPath();
    ctx.ellipse(0, 0, 0.9, 3.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // 魔眼外溢血光
    ctx.fillStyle = 'rgba(224, 34, 24, 0.35)';
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();

    // 怒眉 (暗紫利刃状骨脊，向眉心深压)
    ctx.strokeStyle = '#1e1430';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-11, -11); ctx.lineTo(-4, -6);
    ctx.moveTo(11, -11); ctx.lineTo(4, -6);
    ctx.stroke();

    // 满口獠牙 (脑髓下方裂开的尖牙巨口)
    ctx.fillStyle = '#e8e0d0';
    ctx.beginPath();
    ctx.moveTo(-8, 8); ctx.lineTo(-6, 3); ctx.lineTo(-4, 8);
    ctx.moveTo(-2, 9); ctx.lineTo(0, 3); ctx.lineTo(2, 9);
    ctx.moveTo(4, 8); ctx.lineTo(6, 3); ctx.lineTo(8, 8);
    ctx.fill();

    ctx.restore();
  }

  // 7. 🔭 星际狙击手（暗黑硬核：细长暗紫狙身、红色瞄准镜、蓄力枪口）
  drawXenoSniper(ctx, isHit) {
    const r = this.radius;
    const aimBob = Math.sin(this.pulse * 1.5) * 1.5;

    ctx.save();
    ctx.translate(this.x, this.y);

    // 细长暗紫狙身
    const bodyGrad = ctx.createRadialGradient(-2, -3, 1, 0, 0, r * 0.9);
    bodyGrad.addColorStop(0, '#6a5a8a');
    bodyGrad.addColorStop(0.6, '#4a3a5a');
    bodyGrad.addColorStop(1, '#2a1a3a');
    ctx.fillStyle = isHit ? '#ffffff' : bodyGrad;
    ctx.strokeStyle = '#1e1430';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.55, r * 0.9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 独眼瞄准镜（冷血红光，无高光）
    ctx.fillStyle = '#0a0f16';
    ctx.beginPath();
    ctx.arc(0, -r * 0.35, 4.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff2e1a';
    ctx.beginPath();
    ctx.arc(0, -r * 0.35, 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 46, 26, 0.35)';
    ctx.beginPath();
    ctx.arc(0, -r * 0.35, 3.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0a0f16';
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.35, 0.9, 2.0, 0, 0, Math.PI * 2);
    ctx.fill();
    // 眉脊
    ctx.strokeStyle = '#1e1430';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-3.8, -r * 0.62); ctx.lineTo(-0.5, -r * 0.48);
    ctx.moveTo(3.8, -r * 0.62); ctx.lineTo(0.5, -r * 0.48);
    ctx.stroke();
    // 尖牙
    ctx.fillStyle = '#e8e0d0';
    ctx.beginPath();
    ctx.moveTo(-2.5, r * 0.25); ctx.lineTo(-1.5, 0); ctx.lineTo(-0.5, r * 0.25);
    ctx.moveTo(0.5, r * 0.25); ctx.lineTo(1.5, 0); ctx.lineTo(2.5, r * 0.25);
    ctx.fill();

    // 长狙枪管（蓄力时闪烁）
    const glow = (Math.sin(this.pulse * 3) + 1) * 0.5;
    ctx.strokeStyle = '#8a2a30';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, r * 0.6);
    ctx.lineTo(0, r * 1.4 + aimBob);
    ctx.stroke();
    ctx.fillStyle = `rgba(255, 80, 80, ${0.5 + glow * 0.5})`;
    ctx.beginPath();
    ctx.arc(0, r * 1.45 + aimBob, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // 8. 💣 范围投弹手（暗黑硬核：臃肿暗金躯体、投弹臂、危险爆炸标志）
  drawXenoBomber(ctx, isHit) {
    const r = this.radius;
    const armSwing = Math.sin(this.pulse * 1.8) * 3;

    ctx.save();
    ctx.translate(this.x, this.y);

    // 臃肿暗金躯体
    const bodyGrad = ctx.createRadialGradient(-3, -4, 2, 0, 0, r * 0.95);
    bodyGrad.addColorStop(0, '#7a5a3a');
    bodyGrad.addColorStop(0.6, '#5a4a2a');
    bodyGrad.addColorStop(1, '#3a2a1a');
    ctx.fillStyle = isHit ? '#ffffff' : bodyGrad;
    ctx.strokeStyle = '#241a0e';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.88, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 危险爆炸警告标志
    ctx.fillStyle = '#f1c40f';
    ctx.strokeStyle = '#c0392b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, -r * 0.2, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#c0392b';
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.2 - 3); ctx.lineTo(1.5, -r * 0.2); ctx.lineTo(0, -r * 0.2 + 3); ctx.lineTo(-1.5, -r * 0.2);
    ctx.closePath();
    ctx.fill();

    // 独眼 (冷血发光凝视，无高光)
    ctx.fillStyle = '#0a0f16';
    ctx.beginPath();
    ctx.arc(-r * 0.35, -r * 0.35, 4.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff2e1a';
    ctx.beginPath();
    ctx.arc(-r * 0.35, -r * 0.35, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 46, 26, 0.32)';
    ctx.beginPath();
    ctx.arc(-r * 0.35, -r * 0.35, 3.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0a0f16';
    ctx.beginPath();
    ctx.ellipse(-r * 0.35, -r * 0.35, 0.8, 1.8, 0, 0, Math.PI * 2);
    ctx.fill();
    // 眉脊
    ctx.strokeStyle = '#241a0e';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-r * 0.56, -r * 0.56); ctx.lineTo(-r * 0.2, -r * 0.42);
    ctx.stroke();
    // 满口尖牙
    ctx.fillStyle = '#e8e0d0';
    ctx.beginPath();
    ctx.moveTo(-r * 0.2, r * 0.3); ctx.lineTo(-r * 0.1, r * 0.05); ctx.lineTo(0, r * 0.3);
    ctx.moveTo(r * 0.1, r * 0.3); ctx.lineTo(r * 0.22, r * 0.05); ctx.lineTo(r * 0.3, r * 0.3);
    ctx.fill();

    // 投弹臂（挥舞炸弹）
    ctx.strokeStyle = '#3a2a1a';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(r * 0.5, 2);
    ctx.quadraticCurveTo(r * 1.0, 4 + armSwing, r * 1.15, 2 + armSwing);
    ctx.stroke();
    // 手中炸弹
    ctx.fillStyle = '#2d3436';
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(r * 1.2, 2 + armSwing, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#f1c40f';
    ctx.fillRect(r * 1.2 - 1, 2 + armSwing - 8, 2, 5);

    ctx.restore();
  }

  // 9. ⚡ 激光巨兽（暗黑硬核：金属蓝灰重甲、幽蓝能量核心、蓄能激光炮）
  drawXenoLaserBeast(ctx, isHit) {
    const r = this.radius;
    const chargePulse = (Math.sin(this.pulse * 2.5) + 1) * 0.5;

    ctx.save();
    ctx.translate(this.x, this.y);

    // 金属蓝灰重甲
    const bodyGrad = ctx.createRadialGradient(-3, -4, 2, 0, 0, r * 0.95);
    bodyGrad.addColorStop(0, '#5a7a9a');
    bodyGrad.addColorStop(0.6, '#3a4a5a');
    bodyGrad.addColorStop(1, '#1e2a38');
    ctx.fillStyle = isHit ? '#ffffff' : bodyGrad;
    ctx.strokeStyle = '#121a24';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 幽蓝能量核心（蓄能时脉冲发光）
    const coreR = 6 + chargePulse * 3;
    const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, coreR + 4);
    coreGrad.addColorStop(0, '#ffffff');
    coreGrad.addColorStop(0.4, '#00d2d3');
    coreGrad.addColorStop(1, 'rgba(0, 120, 140, 0)');
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(0, 0, coreR + 4, 0, Math.PI * 2);
    ctx.fill();

    // 复眼 (冷血发光凝视，无高光)
    ctx.fillStyle = '#05070a';
    ctx.beginPath();
    ctx.ellipse(-r * 0.35, -r * 0.3, 4.4, 5.0, -0.1, 0, Math.PI * 2);
    ctx.ellipse(r * 0.35, -r * 0.3, 4.4, 5.0, 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff2e1a';
    ctx.beginPath();
    ctx.ellipse(-r * 0.35, -r * 0.3, 1.4, 3.0, 0, 0, Math.PI * 2);
    ctx.ellipse(r * 0.35, -r * 0.3, 1.4, 3.0, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 46, 26, 0.3)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.35, -r * 0.3, 2.6, 4.2, 0, 0, Math.PI * 2);
    ctx.ellipse(r * 0.35, -r * 0.3, 2.6, 4.2, 0, 0, Math.PI * 2);
    ctx.fill();
    // 眉脊
    ctx.strokeStyle = '#121a24';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-r * 0.5, -r * 0.5); ctx.lineTo(-r * 0.18, -r * 0.38);
    ctx.moveTo(r * 0.5, -r * 0.5); ctx.lineTo(r * 0.18, -r * 0.38);
    ctx.stroke();
    // 满口尖牙
    ctx.fillStyle = '#e8f0ea';
    ctx.beginPath();
    ctx.moveTo(-3, r * 0.3); ctx.lineTo(-2, r * 0.05); ctx.lineTo(-1, r * 0.3);
    ctx.moveTo(1, r * 0.3); ctx.lineTo(2, r * 0.05); ctx.lineTo(3, r * 0.3);
    ctx.fill();

    // 两侧激光炮管
    ctx.strokeStyle = '#2a3a4a';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-r * 0.7, 4); ctx.lineTo(-r * 1.1, 6);
    ctx.moveTo(r * 0.7, 4); ctx.lineTo(r * 1.1, 6);
    ctx.stroke();
    ctx.fillStyle = `rgba(0, 210, 211, ${0.4 + chargePulse * 0.6})`;
    ctx.beginPath();
    ctx.arc(-r * 1.15, 6, 3, 0, Math.PI * 2);
    ctx.arc(r * 1.15, 6, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  renderEnemyHealthBar(ctx) {
    const isBoss = this.typeData.isBoss;
    const isElite = this.typeData.isElite;
    const barW = isBoss ? 80 : (isElite ? 48 : Math.max(26, this.radius * 1.8));
    const barH = isBoss ? 7 : (isElite ? 5 : 4);
    const barX = this.x - barW / 2;
    const barY = this.y - this.radius - (isBoss ? 18 : 9);

    ctx.save();
    // 底槽
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);

    const ratio = Math.max(0, this.hp / this.maxHp);
    if (isBoss) {
      ctx.fillStyle = '#e74c3c';
    } else if (isElite) {
      ctx.fillStyle = '#f39c12';
    } else {
      ctx.fillStyle = '#2ecc71';
    }

    ctx.fillRect(barX, barY, barW * ratio, barH);

    // Boss 尊号
    if (isBoss) {
      ctx.fillStyle = '#f1c40f';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('👑 外星母巢主脑 · 泽拉斯', this.x, barY - 4);
    }
    ctx.restore();
  }
}

export class EnemyHordeManager {
  constructor() {
    this.enemies = [];
    this.pool = [];
    for (let i = 0; i < 120; i++) {
      this.pool.push(new Enemy());
    }
    this.spawnTimer = 0;
    this.currentWave = 0; // 当前波次
    this.onWaveNotice = null; // 波次提醒回调
    this.gameTimeSeconds = 0;
    this.alienProjectiles = []; // 外星人远程发射的强酸/激光/灵能飞弹（活跃）
    // 敌方飞弹对象池（需求 2：避免海量实体频繁 new 引发 GC 与发热）
    this.projectilePool = [];
    // 最终 Boss 决战标记（需求：12 分钟节奏，第 11 分钟一次性召唤母巢主脑）
    this.finalBossSpawned = false; // 最终 Boss 是否已召唤
  }

  reset() {
    this.clear();
    this.spawnTimer = 0;
    this.currentWave = 0;
    this.gameTimeSeconds = 0;
    this.alienProjectiles = [];
    this.finalBossSpawned = false;
  }

  clear() {
    while (this.enemies.length > 0) {
      const e = this.enemies.pop();
      e.reset();
      this.pool.push(e);
    }
    // 回收所有活跃飞弹到对象池
    while (this.alienProjectiles.length > 0) {
      this.projectilePool.push(this.alienProjectiles.pop());
    }
  }

  /**
   * 从对象池获取一枚敌方飞弹并初始化（需求 2：零 GC 投射物复用）
   * @returns {object} 飞弹对象
   */
  acquireProjectile() {
    let p = this.projectilePool.pop();
    if (!p) {
      // 池空则复用最老的一枚（Swap-and-Pop 取头），仍不足才新建
      if (this.alienProjectiles.length > 0) {
        p = this.alienProjectiles.shift();
      } else {
        p = { x: 0, y: 0, vx: 0, vy: 0, radius: 6, type: 'acid', damage: 0, life: 0 };
      }
    }
    return p;
  }

  /**
   * 从屏幕外边缘随机坐标生成敌人
   */
  getRandomSpawnPos() {
    const pad = 35;
    const side = Math.floor(Math.random() * 4);
    let x = 0;
    let y = 0;

    switch (side) {
      case 0:
        x = Math.random() * SCREEN_WIDTH;
        y = -pad;
        break;
      case 1:
        x = SCREEN_WIDTH + pad;
        y = Math.random() * SCREEN_HEIGHT;
        break;
      case 2:
        x = Math.random() * SCREEN_WIDTH;
        y = SCREEN_HEIGHT + pad;
        break;
      case 3:
        x = -pad;
        y = Math.random() * SCREEN_HEIGHT;
        break;
    }

    return { x, y };
  }

  spawnEnemy(typeKey, waveHpScale = 1.0) {
    const pos = this.getRandomSpawnPos();
    let enemy = this.pool.pop();
    if (!enemy) {
      if (this.enemies.length > 85) {
        enemy = this.enemies.shift();
      } else {
        enemy = new Enemy();
      }
    }
    enemy.init(typeKey, pos.x, pos.y, waveHpScale);
    this.enemies.push(enemy);
    return enemy;
  }

  update(player, onEnemyDeath, onPlayerHit, learnedSkills = {}) {
    this.spawnTimer++;

    // 1. 无限波次解析（修复第 8 波后不出怪 Bug）
    const currentCfg = resolveWave(this.gameTimeSeconds);

    if (this.currentWave !== currentCfg.wave) {
      this.currentWave = currentCfg.wave;
      if (this.onWaveNotice) {
        this.onWaveNotice(this.currentWave, currentCfg.title);
      }
    }

    const playerLvl = (player && player.level) || 1;
    const levelScale = 1.0 + (playerLvl - 1) * 0.12;

    // 时间轴快照（需求 E：经验产出率 / 数值膨胀 / 波次节奏与进度强绑定）
    const timeline = getTimelineSnapshot(this.gameTimeSeconds);
    const statCurve = timeline.statCurve;       // { hp, atk, speed }
    const pacing = timeline.pacing;             // { intervalMul, batchAdd }

    // 动态心流曲线（需求 3：前期少量高血高攻压迫，后期海量脆皮割草）
    const flow = getFlowCurve(this.gameTimeSeconds);

    // 前 60 秒严格按大间隔出怪，1分钟后逐步加速；无限波次持续收窄间隔
    // 生成密度与玩家成长解耦：间隔仅由时间轴 + 心流密度决定（不再随等级变快）
    const spawnInterval = Math.max(
      currentCfg.isEndless ? 8 : 12,
      Math.floor(currentCfg.interval * pacing.intervalMul / flow.density)
    );
    // 敌人数值膨胀 = 波次血量 × 等级 × 时间轴血量曲线 × 心流单体血量
    // 心流曲线让前期单体「肉厚伤高」，后期「变脆」，形成割草反转
    const timeScale = currentCfg.hpScale * levelScale * statCurve.hp * flow.hpMul;

    // 时间轴经验产出率（供经验掉落使用，由 main.js 读取）
    this.expRate = timeline.expRate;
    this.timeline = timeline;
    this.flow = flow;

    // 统计玩家已习得的远程技能数量
    const RANGED_SKILL_KEYS = [
      'fire_blast',      // 赤炎脉冲
      'holy_smite',      // 圣光惩击
      'arcane_missiles', // 奥术飞弹
      'arcane_missile',
      'shadow_bolt',     // 灭世暗影箭
      'chaos_bolt',      // 混乱之箭
      'chain_lightning', // 狂雷风暴链
      'holy_shock',      // 神圣震击
      'blizzard',        // 极冰暴风雪
      'fel_fire',        // 邪能火种
      'duck_quack'       // 超频嘎嘎音波
    ];

    let rangedSkillCount = 0;
    if (learnedSkills) {
      for (let i = 0; i < RANGED_SKILL_KEYS.length; i++) {
        const k = RANGED_SKILL_KEYS[i];
        if (learnedSkills[k] && learnedSkills[k] > 0) {
          rangedSkillCount++;
        }
      }
    }

    // 严格卡住远程怪出场阈值：
    // 必须满足【玩家等级高 (Lv >= 8)】且【时间充分 (>= 150秒)】且【已掌握多门远程技能 (>= 2门)】
    const canSpawnBasicRanged = playerLvl >= 8 && this.gameTimeSeconds >= 150 && rangedSkillCount >= 2;
    const canSpawnHighTierRanged = playerLvl >= 12 && this.gameTimeSeconds >= 240 && rangedSkillCount >= 3;

    // 周期性生成外星怪群
    if (this.spawnTimer >= spawnInterval) {
      this.spawnTimer = 0;

      // 前期同屏数量上限保护：前30秒≤12只，前60秒≤20只，避免新手被怪群围剿
      const maxAliveLimit = this.finalBossSpawned ? 6 : (this.gameTimeSeconds < 30 ? 12 : (this.gameTimeSeconds < 60 ? 20 : 85));
      if (this.enemies.length < maxAliveLimit) {

        // 批次数量由「心流密度」驱动（与玩家等级解耦）：
        //   前期少量（压迫感来自单体质量），后期海量 swarm（割草爽感来自数量）
        const baseBatch = this.finalBossSpawned ? 1 : (this.gameTimeSeconds < 60 ? 1 : (playerLvl >= 5 ? currentCfg.batch : 1));
        const batchCount = this.finalBossSpawned ? 1 : Math.min(8, Math.max(1, Math.round((baseBatch + pacing.batchAdd) * flow.batchMul)));

        for (let b = 0; b < batchCount; b++) {
          let type = 'XENO_SWARMER';
          const rand = Math.random();

          if (canSpawnHighTierRanged) {
            if (rand < 0.12) {
              type = 'XENO_SNIPER';        // 星际狙击手（新）
            } else if (rand < 0.24) {
              type = 'XENO_BOMBER';        // 范围投弹手（新）
            } else if (rand < 0.36) {
              type = 'XENO_LASER_BEAST';   // 激光巨兽（新）
            } else if (rand < 0.48) {
              type = 'UFO_SCOUT';
            } else if (rand < 0.60) {
              type = 'XENO_ACID_SPITTER';
            } else if (rand < 0.75) {
              type = 'XENO_BEHEMOTH';
            } else if (rand < 0.90) {
              type = 'XENO_TROOPER';
            } else {
              type = 'XENO_SWARMER';
            }
          } else if (canSpawnBasicRanged) {
            if (rand < 0.14) {
              type = 'XENO_SNIPER';        // 星际狙击手（新）
            } else if (rand < 0.28) {
              type = 'XENO_ACID_SPITTER';
            } else if (rand < 0.44) {
              type = 'XENO_LASER_BEAST';   // 激光巨兽（新）
            } else if (rand < 0.60) {
              type = 'XENO_BEHEMOTH';
            } else if (rand < 0.84) {
              type = 'XENO_TROOPER';
            } else {
              type = 'XENO_SWARMER';
            }
          } else {
            // 前中发育期 + 割草群聚期：
            if (flow.swarm) {
              // ⭐ 割草群聚期（180s+）：海量脆皮小怪，一记 AOE 清屏
              if (rand < 0.55) {
                type = 'XENO_SWARMER';   // 55% 脆皮飞蚤
              } else if (rand < 0.85) {
                type = 'XENO_TROOPER';   // 30% 突击兵
              } else {
                type = 'XENO_ACID_SPITTER'; // 15% 远程点缀
              }
            } else if (this.gameTimeSeconds >= 75 || playerLvl >= 5) {
              // ⭐ 前中期压迫期：偏向高血量精英，制造吃力感
              if (rand < 0.28) {
                type = 'XENO_BEHEMOTH';
              } else if (rand < 0.68) {
                type = 'XENO_TROOPER';
              } else {
                type = 'XENO_SWARMER';
              }
            } else if (this.gameTimeSeconds < 60) {
              // ⭐ 前 1 分钟内：80% 脆皮飞蚤，20% 突击兵
              type = rand < 0.80 ? 'XENO_SWARMER' : 'XENO_TROOPER';
            } else {
              type = rand < 0.65 ? 'XENO_SWARMER' : 'XENO_TROOPER';
            }
          }

          const enemy = this.spawnEnemy(type, timeScale);
          // 开局前 60 秒应用柔和移速缩放；并叠加时间轴速度/攻击膨胀曲线 + 心流单体攻击
          if (enemy) {
            if (currentCfg.speedScale) {
              enemy.speed *= currentCfg.speedScale;
            }
            enemy.speed *= statCurve.speed;
            enemy.damage = Math.round(enemy.damage * statCurve.atk * flow.atkMul);
          }
        }
      }

      // ===== 最终 Boss 决战机制（12 分钟节奏 · 第 11 分钟一次性召唤）=====
      // 到达 FINAL_BOSS_TIME(660s) 时，一次性召唤最终 Boss「母巢主脑·泽拉斯」，
      // 血量大幅强化作为通关门槛（技能满级太少/搭配太差就打不过）。
      if (this.gameTimeSeconds >= FINAL_BOSS_TIME && !this.finalBossSpawned) {
        this.finalBossSpawned = true;
        // 决战仪式：清空场上普通怪，只留最终 Boss（避免杂兵干扰决战）
        for (let i = this.enemies.length - 1; i >= 0; i--) {
          const e = this.enemies[i];
          if (!e.typeData.isBoss) {
            e.reset();
            this.pool.push(e);
            this.enemies.splice(i, 1);
          }
        }
        // 召唤强化版最终 Boss（独立血量基准，不套用割草心流曲线，形成明确通关门槛）
        // 血量 ≈ 800 基础 × 18 倍强化 ≈ 14,400 HP，满级技能配合走位在 60 秒内即可稳健击破
        const boss = this.spawnEnemy('BOSS_HIVE_MIND', 18);
        boss.isFinalBoss = true;
        if (this.onFinalBoss) {
          this.onFinalBoss();
        }
      }

      // 决战开始后不再随机刷新普通 Boss（最终 Boss 是唯一 Boss）
      if (currentCfg.isEndless && !this.finalBossSpawned) {
        const hasBoss = this.enemies.some(e => e.typeData.isBoss);
        if (!hasBoss && Math.random() < 0.15) {
          this.spawnEnemy('BOSS_HIVE_MIND', timeScale * 1.6);
        }
      }
    }

    // 1. 更新怪物逻辑与碰撞
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      const result = enemy.update(player);

      // 处理远程怪射击外星飞弹
      if (result && result.shoot) {
        const dx = result.targetX - result.x;
        const dy = result.targetY - result.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        // 不同弹种飞行速度：狙击弹极快贯穿、激光束中速、炸弹慢速抛物线、酸液/灵能常规
        let speed;
        switch (result.projectileType) {
          case 'snipe': speed = 7.5; break;   // 狙击高速贯穿
          case 'beam':  speed = 4.0; break;   // 激光束
          case 'bomb':  speed = 2.2; break;   // 炸弹慢速抛物线
          case 'laser': speed = 4.5; break;
          case 'psychic': speed = 3.6; break;
          default: speed = 3.4; break;
        }
        const projRadius =
          result.projectileType === 'psychic' ? 8 :
          (result.projectileType === 'bomb' ? 9 :
          (result.projectileType === 'beam' ? 5 :
          (result.projectileType === 'snipe' ? 4 : 6)));
        // 对象池复用飞弹，杜绝每次射击的 new 与 GC（需求 2）
        const proj = this.acquireProjectile();
        proj.x = result.x;
        proj.y = result.y;
        proj.vx = (dx / dist) * speed;
        proj.vy = (dy / dist) * speed;
        proj.radius = projRadius;
        proj.type = result.projectileType;
        proj.damage = result.damage;
        proj.life = result.projectileType === 'bomb' ? 70 : 95;
        this.alienProjectiles.push(proj);
      }

      if (result && result.dead) {
        onEnemyDeath(enemy, true);
        const last = this.enemies.pop();
        if (i < this.enemies.length) {
          this.enemies[i] = last;
        }
        this.pool.push(enemy);
        continue;
      }

      if (!enemy.active) {
        const last = this.enemies.pop();
        if (i < this.enemies.length) {
          this.enemies[i] = last;
        }
        this.pool.push(enemy);
        continue;
      }

      // 近战肉搏触碰伤害 (先进行 Bounding-box 快速预筛，滤除 95% 远距离无效乘法计算)
      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const hitDist = enemy.radius + player.width * 0.4;

      if (Math.abs(dx) < hitDist && Math.abs(dy) < hitDist && dx * dx + dy * dy < hitDist * hitDist && enemy.attackCooldown <= 0) {
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        enemy.attackCooldown = 35;
        onPlayerHit(enemy.damage);
        enemy.knockback(-dx / dist, -dy / dist, 5);
      }
    }

    // 2. 更新外星人远程飞弹 (先进行屏幕边界剔除与 Swap-and-Pop 零开销回收)
    for (let i = this.alienProjectiles.length - 1; i >= 0; i--) {
      const p = this.alienProjectiles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life--;

      // 视界外极速剔除 (Culling)：飞离屏幕外直接零成本回收
      if (p.life <= 0 || p.x < -30 || p.x > SCREEN_WIDTH + 30 || p.y < -30 || p.y > SCREEN_HEIGHT + 30) {
        const last = this.alienProjectiles.pop();
        if (i < this.alienProjectiles.length) {
          this.alienProjectiles[i] = last;
        }
        this.projectilePool.push(p); // 回收进对象池
        continue;
      }

      // 击中玩家判定 (Bounding-box 预过滤；范围投弹手炸弹判定半径更大，模拟范围溅射)
      const pdx = p.x - player.x;
      const pdy = p.y - player.y;
      const hitRadius = (p.type === 'bomb' ? p.radius * 2.5 : p.radius) + player.width * 0.38;

      if (Math.abs(pdx) < hitRadius && Math.abs(pdy) < hitRadius && pdx * pdx + pdy * pdy < hitRadius * hitRadius) {
        onPlayerHit(p.damage);
        const last = this.alienProjectiles.pop();
        if (i < this.alienProjectiles.length) {
          this.alienProjectiles[i] = last;
        }
        this.projectilePool.push(p); // 回收进对象池
      }
    }
  }

  render(ctx) {
    // 1. 绘制外星怪兽
    for (let i = 0; i < this.enemies.length; i++) {
      this.enemies[i].render(ctx);
    }

    // 2. 绘制外星远程飞弹 (荧光强酸液球、幽浮高能离子束、主脑灵能光球)
    for (let i = 0; i < this.alienProjectiles.length; i++) {
      const p = this.alienProjectiles[i];
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';

      if (p.type === 'acid') {
        // 毒绿强酸球
        ctx.fillStyle = '#2ed573';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(p.x - p.vx * 0.5, p.y - p.vy * 0.5, p.radius * 0.45, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'laser') {
        // 幽浮青光离子脉冲光线
        ctx.strokeStyle = '#00d2d3';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(p.x - p.vx * 2, p.y - p.vy * 2);
        ctx.lineTo(p.x + p.vx, p.y + p.vy);
        ctx.stroke();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else if (p.type === 'snipe') {
        // 狙击高速贯穿弹（暗红激光狙线）
        ctx.strokeStyle = '#ff4d4d';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(p.x - p.vx * 3, p.y - p.vy * 3);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      } else if (p.type === 'bomb') {
        // 范围投弹（暗金炸弹 + 危险闪烁）
        ctx.fillStyle = '#f1c40f';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#c0392b';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 0.5, 0, Math.PI * 2);
        ctx.fill();
        // 引线火花
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(p.x, p.y - p.radius, 2, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'beam') {
        // 引导激光束（幽蓝粗光束）
        ctx.strokeStyle = '#4dd2ff';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(p.x - p.vx * 2.5, p.y - p.vy * 2.5);
        ctx.lineTo(p.x + p.vx, p.y + p.vy);
        ctx.stroke();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
      } else {
        // 虚空主脑紫曜灵能波
        ctx.fillStyle = '#a55eea';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ff7675';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }
}
