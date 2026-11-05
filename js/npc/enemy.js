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
  // 1. 【天灾军团】亡灵食尸鬼 (Scourge Ghoul) - 天灾亡灵大军炮灰
  XENO_SWARMER: {
    name: '亡灵食尸鬼',
    faction: '天灾军团',
    subName: '亡灵大军',
    factionColor: '#67e8f9',
    hp: 20,
    speed: 2.3,
    radius: 12,
    damage: 8,
    exp: 1,
    color: '#2a3a3a',
    glowColor: '#67e8f9',
    icon: '💀',
  },
  // 2. 【燃烧军团】恶魔小鬼 (Fel Imp) - 燃烧军团恶魔仆从
  XENO_TROOPER: {
    name: '恶魔小鬼',
    faction: '燃烧军团',
    subName: '恶魔仆从',
    factionColor: '#2ecc71',
    hp: 40,
    speed: 1.7,
    radius: 15,
    damage: 13,
    exp: 2,
    color: '#1c3822',
    glowColor: '#2ecc71',
    icon: '👿',
  },
  // 3. ⭐ 【燃烧军团】邪能地狱犬 (Fel Hound) - 腐蚀酸液恶魔猎犬
  XENO_ACID_SPITTER: {
    name: '邪能地狱犬',
    faction: '燃烧军团',
    subName: '恶魔猎犬',
    factionColor: '#a3e635',
    hp: 32,
    speed: 1.3,
    radius: 14,
    damage: 12,
    exp: 3,
    isRanged: true,
    shootInterval: 160,
    projectileType: 'acid',
    color: '#2d4a22',
    glowColor: '#a3e635',
    icon: '🐕',
  },
  // 4. ⭐ 【黑铁矮人】黑铁蒸汽机甲 (Dark Iron Mech) - 黑铁符文蒸汽战机
  UFO_SCOUT: {
    name: '黑铁蒸汽机甲',
    faction: '黑铁矮人',
    subName: '蒸汽战机',
    factionColor: '#f39c12',
    hp: 50,
    speed: 1.6,
    radius: 16,
    damage: 14,
    exp: 4,
    isRanged: true,
    shootInterval: 140,
    projectileType: 'laser',
    color: '#4a3828',
    glowColor: '#f39c12',
    icon: '⚙️',
  },
  // 5. 【邪血部落】邪兽人狂暴战士 (Fel Orc Berserker) - 精英邪能兽人
  XENO_BEHEMOTH: {
    name: '邪兽人狂暴战士',
    faction: '邪血部落',
    subName: '狂暴兽人',
    factionColor: '#e74c3c',
    hp: 190,
    speed: 1.4,
    radius: 26,
    damage: 25,
    exp: 10,
    isElite: true,
    color: '#5c1818',
    glowColor: '#e74c3c',
    icon: '👹',
  },
  // 6. 👑 【首领】深渊大恶魔·玛洛诺斯 (Doom Lord Malnoroth) - 燃烧军团大恶魔统领
  BOSS_HIVE_MIND: {
    name: '深渊大恶魔·玛洛诺斯',
    faction: '燃烧军团',
    subName: '军团统领',
    factionColor: '#e74c3c',
    hp: 800,
    speed: 1.0,
    radius: 38,
    damage: 32,
    exp: 40,
    isBoss: true,
    isRanged: true,
    shootInterval: 65,
    projectileType: 'psychic',
    color: '#3a140a',
    glowColor: '#e74c3c',
    icon: '👑',
  },

  // 7. 🔭 【堕落德莱尼】艾瑞达暗影术士 (Eredar Warlock) - 暗影魔导士
  XENO_SNIPER: {
    name: '艾瑞达暗影术士',
    faction: '堕落德莱尼',
    subName: '虚空祭司',
    factionColor: '#c084fc',
    hp: 46,
    speed: 1.2,
    radius: 14,
    damage: 22,
    exp: 5,
    isRanged: true,
    shootInterval: 200,
    projectileType: 'snipe',
    color: '#3b1d54',
    glowColor: '#c084fc',
    icon: '🔮',
  },
  // 8. 💣 【风险投资公司】疯狂地精投弹手 (Venture Co Goblin Bomber) - 爆破工程兵
  XENO_BOMBER: {
    name: '地精投弹手',
    faction: '风险投资公司',
    subName: '爆破技师',
    factionColor: '#f59e0b',
    hp: 58,
    speed: 1.1,
    radius: 17,
    damage: 18,
    exp: 6,
    isRanged: true,
    shootInterval: 240,
    projectileType: 'bomb',
    color: '#4a3b1a',
    glowColor: '#f59e0b',
    icon: '💣',
  },
  // 9. ⚡ 【天灾军团】缝合憎恶巨兽 (Scourge Abomination) - 冰封王座腐肉缝合怪
  XENO_LASER_BEAST: {
    name: '天灾缝合憎恶',
    faction: '天灾军团',
    subName: '缝合巨怪',
    factionColor: '#67e8f9',
    hp: 70,
    speed: 1.0,
    radius: 20,
    damage: 16,
    exp: 7,
    isRanged: true,
    shootInterval: 120,
    projectileType: 'beam',
    color: '#1e293b',
    glowColor: '#67e8f9',
    icon: '🧟',
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

// 全局波次演进配置表 (前 10 分钟平缓发育爽快割草，11~15 分钟迎来三连死亡高潮)
export const WAVE_CONFIG = [
  { wave: 1,  time: 0,   title: '【天灾军团】亡灵食尸鬼 · 腐潮先锋', interval: 88, batch: 1, hpScale: 0.70, speedScale: 0.82 },
  { wave: 2,  time: 30,  title: '【燃烧军团】恶魔小鬼 · 邪能渗透', interval: 75, batch: 1, hpScale: 0.75, speedScale: 0.85 },
  { wave: 3,  time: 70,  title: '【风险投资公司】地精炸弹手 · 爆破突袭', interval: 64, batch: 1, hpScale: 0.85, speedScale: 0.90 },
  { wave: 4,  time: 120, title: '【堕落德莱尼】艾瑞达术士 · 暗影齐射', interval: 50, batch: 2, hpScale: 1.00, speedScale: 0.95 },
  { wave: 5,  time: 180, title: '【邪血部落】邪兽人战士 · 钢铁重装', interval: 42, batch: 2, hpScale: 1.15, speedScale: 1.00 },
  { wave: 6,  time: 270, title: '【燃烧军团】邪能地狱犬 · 剧毒强酸', interval: 36, batch: 2, hpScale: 1.30, speedScale: 1.05 },
  { wave: 7,  time: 380, title: '【黑铁矮人】蒸汽机甲 · 熔火扫射', interval: 30, batch: 3, hpScale: 1.45, speedScale: 1.10 },
  { wave: 8,  time: 480, title: '【天灾军团】缝合憎恶 · 腐肉碾压', interval: 26, batch: 3, hpScale: 1.60, speedScale: 1.12 },
  { wave: 9,  time: 570, title: '【天灾与军团】先锋狂暴 · 满级修罗场', interval: 22, batch: 4, hpScale: 2.20, speedScale: 1.18 },
  // 倒数第 3 波 (11:00，密度翻倍，需要满级清屏技能)
  {
    wave: 10,
    waveId: 10,
    time: 660,
    startTime: 660,
    endTime: 735,
    title: '【军团狂潮】天灾亡灵与军团精锐大混编',
    name: '【军团狂潮】天灾亡灵与军团精锐大混编',
    enemies: ['scourge_ghoul', 'fel_hound', 'legion_bomber'],
    interval: 12,
    spawnInterval: 0.2,
    batch: 5,
    hpScale: 2.80,
    speedScale: 1.25,
    isHard: true,
    features: ['acid_pool', 'carpet_bombing']
  },
  // 倒数第 2 波 (12:15，双雄精英同时降临，需要高减伤/吸血词条)
  {
    wave: 11,
    waveId: 11,
    time: 735,
    startTime: 735,
    endTime: 810,
    title: '【双雄合璧】黑铁蒸汽机甲与邪血兽人',
    name: '【双雄合璧】黑铁蒸汽机甲 + 邪血兽人',
    enemies: ['dark_iron_mech_elite', 'felblood_orc_elite'],
    interval: 20,
    spawnInterval: 0.5,
    batch: 3,
    hpScale: 3.40,
    speedScale: 1.25,
    isEliteWave: true,
    auras: ['massive_slow', 'armor_shred']
  },
  // 最终第 1 波 (13:30 ~ 15:00，35000+ HP 深渊大恶魔首领决战)
  {
    wave: 12,
    waveId: 12,
    time: 810,
    startTime: 810,
    endTime: 900,
    title: '【灭世浩劫】深渊大恶魔 · 玛洛诺斯',
    name: '【灭世浩劫】深渊大恶魔 · 玛洛诺斯',
    enemies: ['mannoroth_boss'],
    interval: 999,
    spawnInterval: 999,
    batch: 1,
    hpScale: 4.00,
    speedScale: 1.25,
    isBoss: true
  },
];

/**
 * 最终首领实体类 (支持独立实例化与 90 秒狂暴灭顶机制)
 */
export class BossEntity {
  constructor(config = {}, difficultyMultiplier = 1.0) {
    this.name = config.name || '深渊大恶魔 · 玛洛诺斯';
    this.maxHp = Math.floor((config.baseHp || 35000) * difficultyMultiplier);
    this.hp = this.maxHp;
    this.skills = config.skills || ['fel_meteor', 'abyssal_stomp', 'demon_portal'];
    this.enrageTimer = config.enrageTimer || 90; // 90秒倒计时
    this.isEnraged = false;
    this.atk = config.atk || 35;
    this.speed = config.speed || 1.0;
  }

  update(dt) {
    this.enrageTimer -= dt;
    if (this.enrageTimer <= 0 && !this.isEnraged) {
      this.triggerEnrageWipe();
    }
  }

  triggerEnrageWipe() {
    this.isEnraged = true;
    this.atk *= 10; // 秒杀全场
    this.speed *= 2;
  }
}

/**
 * 无限波次循环配置（第 12 波之后，按周期循环，持续强化）
 * 每循环一轮：波次号 +12，数值膨胀继续叠加，敌人强度随波次线性增长。
 */
export const ENDLESS_WAVE_CONFIG = {
  baseInterval: 18,       // 基础刷怪间隔（帧），随循环递减
  minInterval: 10,        // 刷怪间隔下限
  cycleLength: 12,        // 一个循环的波次数（与 WAVE_CONFIG 长度对齐）
  hpGrowthPerCycle: 0.25, // 每循环血量膨胀系数
  speedGrowthPerCycle: 0.05, // 每循环速度膨胀系数
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
    title: `燃烧军团入侵 · 无尽第 ${cycle} 轮`,
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

  // 1. 💀 亡灵食尸鬼 (天灾军团亡灵大军：佝偻惨白骨躯、溃烂腐肉、青蓝亡灵幽光、森白利爪)
  drawXenoSwarmer(ctx, isHit) {
    const r = this.radius;
    const shamble = Math.sin(this.pulse * 2.5) * 2;

    ctx.save();
    ctx.translate(this.x, this.y);

    // 佝偻前伸的森白利爪双臂 (亡灵食尸鬼标志性抓挠姿态)
    ctx.strokeStyle = '#5a6a62';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-r * 0.3, -2); ctx.quadraticCurveTo(-r * 0.95, -8, -r * 1.15, -4 + shamble);
    ctx.moveTo(r * 0.3, -2); ctx.quadraticCurveTo(r * 0.95, -8, r * 1.15, -4 - shamble);
    ctx.stroke();
    // 森白尖爪 (三指钩爪)
    ctx.fillStyle = '#c8d6cc';
    ctx.beginPath();
    ctx.moveTo(-r * 1.15, -5 + shamble); ctx.lineTo(-r * 1.3, -8 + shamble); ctx.lineTo(-r * 1.05, -6 + shamble);
    ctx.moveTo(-r * 1.2, -4 + shamble); ctx.lineTo(-r * 1.38, -6 + shamble); ctx.lineTo(-r * 1.1, -3 + shamble);
    ctx.moveTo(r * 1.15, -5 - shamble); ctx.lineTo(r * 1.3, -8 - shamble); ctx.lineTo(r * 1.05, -6 - shamble);
    ctx.moveTo(r * 1.2, -4 - shamble); ctx.lineTo(r * 1.38, -6 - shamble); ctx.lineTo(r * 1.1, -3 - shamble);
    ctx.fill();

    // 佝偻惨白骨躯 (亡灵食尸鬼骨肉嶙峋的身躯)
    const bodyGrad = ctx.createRadialGradient(-2, -3, 1, 0, 0, r * 0.95);
    bodyGrad.addColorStop(0, '#7a8a7e');
    bodyGrad.addColorStop(0.55, '#5a6a5e');
    bodyGrad.addColorStop(1, '#2a3430');
    ctx.fillStyle = isHit ? '#ffffff' : bodyGrad;
    ctx.strokeStyle = '#1a2420';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 2, r * 0.7, r * 0.82, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 溃烂腐肉斑块 (暗红紫尸斑)
    ctx.fillStyle = 'rgba(120, 40, 40, 0.5)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.3, 2, r * 0.18, r * 0.22, 0.5, 0, Math.PI * 2);
    ctx.ellipse(r * 0.35, 4, r * 0.14, r * 0.18, -0.4, 0, Math.PI * 2);
    ctx.fill();
    // 裸露白骨裂缝
    ctx.strokeStyle = 'rgba(200, 214, 204, 0.7)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-r * 0.25, -1); ctx.lineTo(-r * 0.15, 4); ctx.lineTo(-r * 0.3, 8);
    ctx.stroke();

    // 佝偻头颅 (下坠前倾，天灾亡灵无神感)
    const headGrad = ctx.createRadialGradient(-1, -8, 1, 0, -7, r * 0.7);
    headGrad.addColorStop(0, '#8a9a8e');
    headGrad.addColorStop(0.6, '#5a6a5e');
    headGrad.addColorStop(1, '#26302c');
    ctx.fillStyle = isHit ? '#ffffff' : headGrad;
    ctx.strokeStyle = '#1a2420';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.55, r * 0.62, r * 0.58, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 深陷空洞眼窝 (天灾亡灵标志：漆黑深坑 + 青蓝冷焰幽光)
    ctx.fillStyle = '#05080a';
    ctx.beginPath();
    ctx.ellipse(-r * 0.26, -r * 0.58, 3.8, 4.6, -0.15, 0, Math.PI * 2);
    ctx.ellipse(r * 0.26, -r * 0.58, 3.8, 4.6, 0.15, 0, Math.PI * 2);
    ctx.fill();
    // 青蓝亡灵冷焰瞳孔 (天灾幽魂感，非血红)
    ctx.fillStyle = '#67e8f9';
    ctx.beginPath();
    ctx.ellipse(-r * 0.26, -r * 0.58, 1.3, 2.8, 0, 0, Math.PI * 2);
    ctx.ellipse(r * 0.26, -r * 0.58, 1.3, 2.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(103, 232, 249, 0.4)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.26, -r * 0.58, 2.4, 4.2, 0, 0, Math.PI * 2);
    ctx.ellipse(r * 0.26, -r * 0.58, 2.4, 4.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // 溃烂裂开的巨口 + 参差獠牙
    ctx.fillStyle = '#1a1008';
    ctx.beginPath();
    ctx.arc(0, -r * 0.22, r * 0.28, Math.PI * 0.05, Math.PI * 0.95);
    ctx.fill();
    ctx.fillStyle = '#c8d6cc';
    ctx.beginPath();
    ctx.moveTo(-r * 0.3, -r * 0.3); ctx.lineTo(-r * 0.2, -r * 0.5); ctx.lineTo(-r * 0.12, -r * 0.3);
    ctx.moveTo(0, -r * 0.28); ctx.lineTo(0.08, -r * 0.52); ctx.lineTo(0.16, -r * 0.28);
    ctx.moveTo(r * 0.24, -r * 0.3); ctx.lineTo(r * 0.32, -r * 0.48); ctx.lineTo(r * 0.4, -r * 0.3);
    ctx.fill();

    ctx.restore();
  }

  // 2. 👿 恶魔小鬼 (燃烧军团恶魔小鬼：弯角獠牙、邪能暗绿躯干、剧毒绿焰竖瞳)
  drawXenoTrooper(ctx, isHit) {
    const r = this.radius;
    const bob = Math.sin(this.pulse * 2.0) * 1.5;

    ctx.save();
    ctx.translate(this.x, this.y);

    // 燃烧军团双恶魔弯角 (Fel Demon Horns)
    ctx.fillStyle = '#0f2416';
    ctx.strokeStyle = '#2ecc71';
    ctx.lineWidth = 1.2;
    // 左弯角
    ctx.beginPath();
    ctx.moveTo(-r * 0.35, -r * 0.7);
    ctx.quadraticCurveTo(-r * 0.85, -r * 1.25, -r * 0.5, -r * 1.45);
    ctx.quadraticCurveTo(-r * 0.35, -r * 1.1, -r * 0.15, -r * 0.85);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // 右弯角
    ctx.beginPath();
    ctx.moveTo(r * 0.35, -r * 0.7);
    ctx.quadraticCurveTo(r * 0.85, -r * 1.25, r * 0.5, -r * 1.45);
    ctx.quadraticCurveTo(r * 0.35, -r * 1.1, r * 0.15, -r * 0.85);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // 弯角顶端邪能绿焰幽光
    ctx.fillStyle = '#2ecc71';
    ctx.beginPath();
    ctx.arc(-r * 0.5, -r * 1.45, 1.8, 0, Math.PI * 2);
    ctx.arc(r * 0.5, -r * 1.45, 1.8, 0, Math.PI * 2);
    ctx.fill();

    // 恶魔暗绿躯干
    const bodyGrad = ctx.createRadialGradient(-2, -3, 1, 0, 0, r * 1.0);
    bodyGrad.addColorStop(0, '#2ecc71');
    bodyGrad.addColorStop(0.5, '#1e522d');
    bodyGrad.addColorStop(1, '#0e2615');
    ctx.fillStyle = isHit ? '#ffffff' : bodyGrad;
    ctx.strokeStyle = '#0a1a0e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 4, r * 0.7, r * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 细长反曲腿
    ctx.fillStyle = '#0a1a0e';
    ctx.beginPath();
    ctx.ellipse(-r * 0.25, r * 0.85, 3, 2.5, 0, 0, Math.PI * 2);
    ctx.ellipse(r * 0.25, r * 0.85, 3, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // 恶魔头颅
    const headGrad = ctx.createRadialGradient(-3, -6, 2, 0, -6, r * 0.95);
    headGrad.addColorStop(0, '#27ae60');
    headGrad.addColorStop(0.6, '#1e522d');
    headGrad.addColorStop(1, '#0e2615');
    ctx.fillStyle = isHit ? '#ffffff' : headGrad;
    ctx.strokeStyle = '#0a1a0e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -r * 0.35, r * 0.72, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 漆黑眼窝
    ctx.fillStyle = '#050a06';
    ctx.beginPath();
    ctx.ellipse(-r * 0.28, -r * 0.42, 5.8, 7.2, -0.12, 0, Math.PI * 2);
    ctx.ellipse(r * 0.28, -r * 0.42, 5.8, 7.2, 0.12, 0, Math.PI * 2);
    ctx.fill();
    // 邪能绿焰燃烧竖瞳
    ctx.fillStyle = '#2ecc71';
    ctx.beginPath();
    ctx.ellipse(-r * 0.29, -r * 0.42, 1.4, 3.6, 0, 0, Math.PI * 2);
    ctx.ellipse(r * 0.29, -r * 0.42, 1.4, 3.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(46, 204, 113, 0.45)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.29, -r * 0.42, 2.8, 5.4, 0, 0, Math.PI * 2);
    ctx.ellipse(r * 0.29, -r * 0.42, 2.8, 5.4, 0, 0, Math.PI * 2);
    ctx.fill();
    // 眉脊：骨刃状厚重眉脊，向眉心深压
    ctx.strokeStyle = '#0a1a0e';
    ctx.lineWidth = 4.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-r * 0.46, -r * 0.68); ctx.lineTo(-r * 0.1, -r * 0.5);
    ctx.moveTo(r * 0.46, -r * 0.68); ctx.lineTo(r * 0.1, -r * 0.5);
    ctx.stroke();

    // 细长利爪手臂
    ctx.strokeStyle = '#0a1a0e';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-r * 0.6, 0); ctx.quadraticCurveTo(-r * 0.95, 2, -r * 0.8, 6 + bob);
    ctx.moveTo(r * 0.6, 0); ctx.quadraticCurveTo(r * 0.95, 2, r * 0.8, 6 + bob);
    ctx.stroke();
    // 末端尖爪
    ctx.fillStyle = '#a3e635';
    ctx.beginPath();
    ctx.moveTo(-r * 0.82, 5 + bob); ctx.lineTo(-r * 0.9, 8 + bob); ctx.lineTo(-r * 0.74, 6 + bob);
    ctx.moveTo(r * 0.82, 5 + bob); ctx.lineTo(r * 0.9, 8 + bob); ctx.lineTo(r * 0.74, 6 + bob);
    ctx.fill();

    // 獠牙巨口 (满口尖牙)
    ctx.strokeStyle = '#0a1a0e';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, -r * 0.18, 2.5, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
    ctx.fillStyle = '#e8f0ea';
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

    // 脊背毒囊与燃烧军团恶魔骨刺
    ctx.fillStyle = '#223820';
    ctx.strokeStyle = '#102010';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(-r * 0.25, -r * 0.85, 3.5, 0, Math.PI * 2);
    ctx.arc(r * 0.3, -r * 0.85, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 燃烧军团：邪能地狱犬恶魔骨角 (Fel Spikes)
    ctx.fillStyle = '#1e1410';
    ctx.strokeStyle = '#39ff14';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-r * 0.45, -r * 0.6); ctx.lineTo(-r * 0.75, -r * 1.15); ctx.lineTo(-r * 0.3, -r * 0.8);
    ctx.moveTo(r * 0.45, -r * 0.6); ctx.lineTo(r * 0.75, -r * 1.15); ctx.lineTo(r * 0.3, -r * 0.8);
    ctx.fill();
    ctx.stroke();

    // 酸囊荧光 (邪能绿脉动)
    ctx.fillStyle = 'rgba(57, 255, 20, 0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 3, r * 0.42, r * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();

    // 爬虫竖瞳 (冷血狭长发光凝视，无萌系高光)
    ctx.fillStyle = '#0a1a0c';
    ctx.beginPath();
    ctx.ellipse(-r * 0.3, -r * 0.1, 4.6, 5.6, -0.1, 0, Math.PI * 2);
    ctx.ellipse(r * 0.3, -r * 0.1, 4.6, 5.6, 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#39ff14';
    ctx.beginPath();
    ctx.ellipse(-r * 0.3, -r * 0.1, 1.2, 3.4, 0, 0, Math.PI * 2);
    ctx.ellipse(r * 0.3, -r * 0.1, 1.2, 3.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(57, 255, 20, 0.4)';
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
    // 蓄力滴落的邪能酸液
    ctx.fillStyle = '#39ff14';
    ctx.beginPath();
    ctx.arc(r * 0.75, 7 + breathe * 1.5, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // 4. ⚙️ 黑铁蒸汽机甲 (黑铁矮人：铁甲躯干、矮人符文头盔、蒸汽喷口、熔火红眼)
  drawUfoScout(ctx, isHit) {
    const r = this.radius;
    const floatY = Math.sin(this.pulse * 2.0) * 2.5;
    const steam = Math.sin(this.pulse * 1.5) * 2;

    ctx.save();
    ctx.translate(this.x, this.y + floatY);

    // 底部蒸汽喷射口 (矮人蒸汽科技)
    ctx.fillStyle = 'rgba(150, 130, 110, 0.45)';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.7, r * 0.4, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    // 蒸汽烟柱
    ctx.strokeStyle = 'rgba(200, 190, 170, 0.35)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-r * 0.3, r * 0.75); ctx.quadraticCurveTo(-r * 0.45, r * 1.1 + steam, -r * 0.3, r * 1.4);
    ctx.moveTo(r * 0.3, r * 0.75); ctx.quadraticCurveTo(r * 0.45, r * 1.1 - steam, r * 0.3, r * 1.4);
    ctx.stroke();

    // 黑铁重甲躯体 (铁灰金属 + 铆钉)
    const bodyGrad = ctx.createLinearGradient(0, -r * 0.6, 0, r * 0.6);
    bodyGrad.addColorStop(0, '#6a5a4a');
    bodyGrad.addColorStop(0.5, '#4a3a2c');
    bodyGrad.addColorStop(1, '#2a2018');
    ctx.fillStyle = isHit ? '#ffffff' : bodyGrad;
    ctx.strokeStyle = '#1a140e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.85, r * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 铆钉
    ctx.fillStyle = '#8a7a6a';
    ctx.beginPath();
    ctx.arc(-r * 0.7, -r * 0.25, 1.3, 0, Math.PI * 2);
    ctx.arc(r * 0.7, -r * 0.25, 1.3, 0, Math.PI * 2);
    ctx.arc(-r * 0.5, r * 0.45, 1.3, 0, Math.PI * 2);
    ctx.arc(r * 0.5, r * 0.45, 1.3, 0, Math.PI * 2);
    ctx.fill();

    // 熔火符文刻印 (黑铁矮人核心：橙红灼热符文)
    ctx.fillStyle = '#f39c12';
    ctx.strokeStyle = '#ff8a00';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, r * 0.05);
    ctx.lineTo(3, r * 0.25);
    ctx.lineTo(0, r * 0.45);
    ctx.lineTo(-3, r * 0.25);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 矮人符文头盔 (黑色头盔 + 顶部羽饰/尖角)
    const helmGrad = ctx.createRadialGradient(-2, -8, 2, 0, -8, r * 0.55);
    helmGrad.addColorStop(0, '#7a5a3a');
    helmGrad.addColorStop(0.6, '#4a3420');
    helmGrad.addColorStop(1, '#241a10');
    ctx.fillStyle = isHit ? '#ffffff' : helmGrad;
    ctx.strokeStyle = '#1a140e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -r * 0.45, r * 0.5, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // 头盔顶部尖刺
    ctx.fillStyle = '#8a6a3a';
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.95); ctx.lineTo(3, -r * 0.62); ctx.lineTo(-3, -r * 0.62);
    ctx.closePath();
    ctx.fill();

    // 矮人标志性浓密胡须 (金色/铁灰胡须从盔下露出)
    ctx.fillStyle = '#c89a5a';
    ctx.beginPath();
    ctx.ellipse(-r * 0.3, -r * 0.1, r * 0.2, r * 0.28, 0.2, 0, Math.PI * 2);
    ctx.ellipse(r * 0.3, -r * 0.1, r * 0.2, r * 0.28, -0.2, 0, Math.PI * 2);
    ctx.fill();
    // 胡须纹理
    ctx.strokeStyle = '#8a6a3a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-r * 0.35, -r * 0.05); ctx.lineTo(-r * 0.4, r * 0.15);
    ctx.moveTo(r * 0.35, -r * 0.05); ctx.lineTo(r * 0.4, r * 0.15);
    ctx.stroke();

    // 熔火红眼 (矮人怒视，炉火般灼热)
    ctx.fillStyle = '#0a0500';
    ctx.beginPath();
    ctx.ellipse(-r * 0.2, -r * 0.42, 2.4, 2.6, -0.1, 0, Math.PI * 2);
    ctx.ellipse(r * 0.2, -r * 0.42, 2.4, 2.6, 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff8a00';
    ctx.beginPath();
    ctx.ellipse(-r * 0.2, -r * 0.42, 1.2, 2.0, 0, 0, Math.PI * 2);
    ctx.ellipse(r * 0.2, -r * 0.42, 1.2, 2.0, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 138, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.2, -r * 0.42, 2.2, 3.2, 0, 0, Math.PI * 2);
    ctx.ellipse(r * 0.2, -r * 0.42, 2.2, 3.2, 0, 0, Math.PI * 2);
    ctx.fill();
    // 粗眉
    ctx.strokeStyle = '#1a140e';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-r * 0.34, -r * 0.62); ctx.lineTo(-r * 0.06, -r * 0.5);
    ctx.moveTo(r * 0.34, -r * 0.62); ctx.lineTo(r * 0.06, -r * 0.5);
    ctx.stroke();

    // 两侧蒸汽排气管 (矮人工程科技)
    ctx.strokeStyle = '#5a4a3a';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-r * 0.75, -r * 0.1); ctx.lineTo(-r * 1.0, -r * 0.2);
    ctx.moveTo(r * 0.75, -r * 0.1); ctx.lineTo(r * 1.0, -r * 0.2);
    ctx.stroke();
    // 排气管口橙色火光
    ctx.fillStyle = `rgba(255, 138, 0, ${0.5 + steam * 0.1})`;
    ctx.beginPath();
    ctx.arc(-r * 1.05, -r * 0.22, 2, 0, Math.PI * 2);
    ctx.arc(r * 1.05, -r * 0.22, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // 5. 👹 邪兽人狂暴战士 (邪血部落：墨绿兽人皮肤、獠牙、邪能红纹、兽人战甲、狂暴战斧)
  drawXenoBehemoth(ctx, isHit) {
    const r = this.radius;
    const stomp = Math.sin(this.pulse * 1.5) * 2.5;
    const roar = Math.sin(this.pulse * 2.0) * 1.5;

    ctx.save();
    ctx.translate(this.x, this.y);

    // 粗壮双腿 (兽人兽皮裹腿)
    ctx.fillStyle = '#3a4a2a';
    ctx.strokeStyle = '#1a2414';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(-r * 0.35, r * 0.75, 6, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(r * 0.35, r * 0.75, 6, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 墨绿兽人魁梧躯干 (邪能强化的肌肉猛躯)
    const bodyGrad = ctx.createRadialGradient(-3, -4, 2, 0, 0, r * 0.95);
    bodyGrad.addColorStop(0, '#5a7a3a');
    bodyGrad.addColorStop(0.55, '#3a5a2a');
    bodyGrad.addColorStop(1, '#1e3418');
    ctx.fillStyle = isHit ? '#ffffff' : bodyGrad;
    ctx.strokeStyle = '#14200e';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.arc(0, stomp, r * 0.88, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 兽人战甲 (胸前邪血部落铁甲)
    ctx.fillStyle = '#5c1818';
    ctx.strokeStyle = '#2a0a0a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-r * 0.5, stomp - r * 0.1);
    ctx.lineTo(-r * 0.35, stomp + r * 0.5);
    ctx.lineTo(r * 0.35, stomp + r * 0.5);
    ctx.lineTo(r * 0.5, stomp - r * 0.1);
    ctx.quadraticCurveTo(0, stomp - r * 0.5, -r * 0.5, stomp - r * 0.1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // 战甲铆钉
    ctx.fillStyle = '#8a5a3a';
    ctx.beginPath();
    ctx.arc(-r * 0.3, stomp + r * 0.3, 1.8, 0, Math.PI * 2);
    ctx.arc(r * 0.3, stomp + r * 0.3, 1.8, 0, Math.PI * 2);
    ctx.fill();

    // 邪能红纹 (暴怒时全身邪能血脉贲张)
    ctx.strokeStyle = 'rgba(231, 76, 60, 0.7)';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-r * 0.2, stomp - r * 0.6);
    ctx.quadraticCurveTo(-r * 0.05, stomp - r * 0.2, -r * 0.3, stomp + r * 0.2);
    ctx.moveTo(r * 0.25, stomp - r * 0.5);
    ctx.quadraticCurveTo(r * 0.1, stomp - r * 0.1, r * 0.3, stomp + r * 0.3);
    ctx.stroke();

    // 兽人头颅 (粗犷宽脸 + 下坠獠牙)
    const headGrad = ctx.createRadialGradient(-2, -6, 2, 0, -6, r * 0.7);
    headGrad.addColorStop(0, '#6a8a42');
    headGrad.addColorStop(0.6, '#3a5a2a');
    headGrad.addColorStop(1, '#1e3418');
    ctx.fillStyle = isHit ? '#ffffff' : headGrad;
    ctx.strokeStyle = '#14200e';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.ellipse(0, stomp - r * 0.7, r * 0.6, r * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 邪血红怒眼 (兽人暴怒时的血红凶光)
    ctx.fillStyle = '#140200';
    ctx.beginPath();
    ctx.ellipse(-6, stomp - r * 0.78, 5.2, 5.6, -0.12, 0, Math.PI * 2);
    ctx.ellipse(6, stomp - r * 0.78, 5.2, 5.6, 0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff3b1a';
    ctx.beginPath();
    ctx.ellipse(-5.5, stomp - r * 0.76, 2.0, 3.2, 0, 0, Math.PI * 2);
    ctx.ellipse(6.5, stomp - r * 0.76, 2.0, 3.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 59, 26, 0.35)';
    ctx.beginPath();
    ctx.ellipse(-5.5, stomp - r * 0.76, 3.4, 4.6, 0, 0, Math.PI * 2);
    ctx.ellipse(6.5, stomp - r * 0.76, 3.4, 4.6, 0, 0, Math.PI * 2);
    ctx.fill();
    // 兽人标志性粗重眉骨
    ctx.strokeStyle = '#14200e';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-11, stomp - r * 1.05); ctx.lineTo(-2, stomp - r * 0.85);
    ctx.moveTo(11, stomp - r * 1.05); ctx.lineTo(2, stomp - r * 0.85);
    ctx.stroke();

    // 下坠獠牙 (兽人标志性外凸獠牙，从下颚向上)
    ctx.fillStyle = '#e8e0d0';
    ctx.beginPath();
    ctx.moveTo(-3.5, stomp - r * 0.3);
    ctx.quadraticCurveTo(-3.8, stomp - r * 0.12, -2.8, stomp - r * 0.02);
    ctx.lineTo(-2.2, stomp - r * 0.22);
    ctx.closePath();
    ctx.moveTo(3.5, stomp - r * 0.3);
    ctx.quadraticCurveTo(3.8, stomp - r * 0.12, 2.8, stomp - r * 0.02);
    ctx.lineTo(2.2, stomp - r * 0.22);
    ctx.closePath();
    ctx.fill();

    // 狂暴战斧 (兽人标志性武器)
    const axeSwing = roar * 0.8;
    ctx.strokeStyle = '#3a2a1a';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(r * 0.8, stomp + 2);
    ctx.lineTo(r * 1.15, stomp - r * 0.15 + axeSwing);
    ctx.stroke();
    // 斧刃
    ctx.fillStyle = '#8a8a92';
    ctx.strokeStyle = '#4a4a52';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(r * 1.1, stomp - r * 0.35 + axeSwing);
    ctx.quadraticCurveTo(r * 1.45, stomp - r * 0.3 + axeSwing, r * 1.3, stomp + axeSwing);
    ctx.quadraticCurveTo(r * 1.2, stomp - r * 0.05 + axeSwing, r * 1.1, stomp + axeSwing);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  // 6. 👑 深渊大恶魔·玛洛诺斯 (燃烧军团统领：恶魔巨角、血红恶魔头颅、邪能烈焰、深渊巨口、燃烧铠甲)
  drawHiveMindBoss(ctx, isHit) {
    const r = this.radius;
    const brainPulse = Math.sin(this.pulse * 2.0) * 3.5;
    const fireWave = Math.sin(this.pulse * 1.5) * 6;

    ctx.save();
    ctx.translate(this.x, this.y);

    // 邪能烈焰光晕 (燃烧军团大恶魔周身燃烧)
    ctx.fillStyle = 'rgba(231, 76, 60, 0.25)';
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.35 + brainPulse, 0, Math.PI * 2);
    ctx.fill();
    // 第二层邪能绿焰
    ctx.fillStyle = 'rgba(46, 204, 113, 0.15)';
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.15 + brainPulse, 0, Math.PI * 2);
    ctx.fill();

    // 燃烧军团标志性巨大恶魔弯角 (深渊大恶魔的烈焰双角)
    const hornGrad = ctx.createLinearGradient(0, -r * 1.3, 0, -r * 1.7);
    hornGrad.addColorStop(0, '#6a2a1a');
    hornGrad.addColorStop(1, '#1a0a08');
    ctx.fillStyle = hornGrad;
    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = 1.5;
    // 左角 (内弯大角)
    ctx.beginPath();
    ctx.moveTo(-r * 0.35, -r * 0.85);
    ctx.quadraticCurveTo(-r * 1.1, -r * 1.5, -r * 0.7, -r * 1.65);
    ctx.quadraticCurveTo(-r * 0.4, -r * 1.3, -r * 0.1, -r * 0.95);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // 右角 (内弯大角)
    ctx.beginPath();
    ctx.moveTo(r * 0.35, -r * 0.85);
    ctx.quadraticCurveTo(r * 1.1, -r * 1.5, r * 0.7, -r * 1.65);
    ctx.quadraticCurveTo(r * 0.4, -r * 1.3, r * 0.1, -r * 0.95);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // 角尖邪能烈焰
    ctx.fillStyle = '#2ecc71';
    ctx.beginPath();
    ctx.arc(-r * 0.7, -r * 1.65, 3.5, 0, Math.PI * 2);
    ctx.arc(r * 0.7, -r * 1.65, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(46, 204, 113, 0.4)';
    ctx.beginPath();
    ctx.arc(-r * 0.7, -r * 1.65, 5.5, 0, Math.PI * 2);
    ctx.arc(r * 0.7, -r * 1.65, 5.5, 0, Math.PI * 2);
    ctx.fill();

    // 暗红恶魔头颅 (燃烧军团大恶魔主颅)
    const headGrad = ctx.createRadialGradient(-3, -6, 3, 0, -2, r * 1.0);
    headGrad.addColorStop(0, '#8a3a2a');
    headGrad.addColorStop(0.6, '#5a2018');
    headGrad.addColorStop(1, '#2a0e08');
    ctx.fillStyle = isHit ? '#ffffff' : headGrad;
    ctx.strokeStyle = '#1a0804';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, -2, r * 0.95 + brainPulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 恶魔面甲/骨脊纹理
    ctx.strokeStyle = 'rgba(120, 40, 30, 0.6)';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(-r * 0.5, -r * 0.6);
    ctx.quadraticCurveTo(-r * 0.2, -r * 0.1, -r * 0.6, r * 0.4);
    ctx.moveTo(r * 0.5, -r * 0.6);
    ctx.quadraticCurveTo(r * 0.2, -r * 0.1, r * 0.6, r * 0.4);
    ctx.moveTo(0, -r * 0.8);
    ctx.lineTo(0, r * 0.4);
    ctx.stroke();

    // 燃烧军团大恶魔血红魔眼 (多层深红灼目 + 竖缝瞳孔 + 血光外溢)
    ctx.fillStyle = '#0d0100';
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.05, 13, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#a01818';
    ctx.beginPath();
    ctx.arc(0, -r * 0.05, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#e02218';
    ctx.beginPath();
    ctx.arc(0, -r * 0.05, 4.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ff3b1a';
    ctx.beginPath();
    ctx.arc(0, -r * 0.05, 2.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#160208';
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.05, 0.9, 3.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // 魔眼外溢血光
    ctx.fillStyle = 'rgba(224, 34, 24, 0.35)';
    ctx.beginPath();
    ctx.arc(0, -r * 0.05, 10, 0, Math.PI * 2);
    ctx.fill();

    // 恶魔怒眉 (厚重骨脊向眉心深压)
    ctx.strokeStyle = '#1a0804';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-11, -r * 0.35); ctx.lineTo(-4, -r * 0.18);
    ctx.moveTo(11, -r * 0.35); ctx.lineTo(4, -r * 0.18);
    ctx.stroke();

    // 深渊巨口 (裂开的尖牙大嘴，燃烧军团恶魔标志)
    ctx.fillStyle = '#1a0200';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.32, r * 0.55, r * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8e0d0';
    ctx.beginPath();
    ctx.moveTo(-r * 0.5, r * 0.22); ctx.lineTo(-r * 0.4, r * 0.02); ctx.lineTo(-r * 0.28, r * 0.24);
    ctx.moveTo(-r * 0.18, r * 0.2); ctx.lineTo(-r * 0.08, r * 0.0); ctx.lineTo(r * 0.02, r * 0.22);
    ctx.moveTo(r * 0.14, r * 0.24); ctx.lineTo(r * 0.24, r * 0.02); ctx.lineTo(r * 0.34, r * 0.24);
    ctx.moveTo(r * 0.42, r * 0.22); ctx.lineTo(r * 0.52, r * 0.04); ctx.lineTo(r * 0.6, r * 0.26);
    ctx.fill();

    // 环绕首领旋转的邪能烈焰火球 (Fel Fire Orbs，替代虚空水晶)
    for (let c = 0; c < 3; c++) {
      const ang = this.pulse * 2.2 + (Math.PI * 2 / 3) * c;
      const dist = r * 1.35 + brainPulse * 0.5;
      const cx = Math.cos(ang) * dist;
      const cy = Math.sin(ang) * dist * 0.7;
      ctx.fillStyle = c % 2 === 0 ? '#e74c3c' : '#2ecc71';
      ctx.beginPath();
      ctx.arc(cx, cy, 4.5, 0, Math.PI * 2);
      ctx.fill();
      // 火球内焰
      ctx.fillStyle = c % 2 === 0 ? '#ff8a00' : '#a3e635';
      ctx.beginPath();
      ctx.arc(cx, cy, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  // 7. 🔮 艾瑞达暗影术士 (堕落德莱尼暗影魔导士：灵能触须、悬浮奥术符印、长程暗影射线)
  drawXenoSniper(ctx, isHit) {
    const r = this.radius;
    const aimBob = Math.sin(this.pulse * 1.5) * 1.5;

    ctx.save();
    ctx.translate(this.x, this.y);

    // 额头悬浮虚空奥术符印 (Floating Void Rune)
    ctx.fillStyle = '#a855f7';
    ctx.beginPath();
    ctx.moveTo(0, -r * 1.35 + aimBob);
    ctx.lineTo(3.5, -r * 1.15 + aimBob);
    ctx.lineTo(0, -r * 0.95 + aimBob);
    ctx.lineTo(-3.5, -r * 1.15 + aimBob);
    ctx.closePath();
    ctx.fill();

    // 细长暗影虚空身躯
    const bodyGrad = ctx.createRadialGradient(-2, -3, 1, 0, 0, r * 0.9);
    bodyGrad.addColorStop(0, '#7c3aed');
    bodyGrad.addColorStop(0.5, '#4c1d95');
    bodyGrad.addColorStop(1, '#1e0b38');
    ctx.fillStyle = isHit ? '#ffffff' : bodyGrad;
    ctx.strokeStyle = '#1e1430';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.55, r * 0.9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 德莱尼经典下颚灵能触须 (Draenei Facial Tendrils)
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-3, r * 0.4);
    ctx.quadraticCurveTo(-5.5, r * 0.8, -3, r * 1.15);
    ctx.moveTo(3, r * 0.4);
    ctx.quadraticCurveTo(5.5, r * 0.8, 3, r * 1.15);
    ctx.stroke();

    // 虚空魔眼 (幽暗紫光)
    ctx.fillStyle = '#0a0518';
    ctx.beginPath();
    ctx.arc(0, -r * 0.35, 4.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#c084fc';
    ctx.beginPath();
    ctx.arc(0, -r * 0.35, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-1, -r * 0.35 - 1, 0.9, 0, Math.PI * 2);
    ctx.fill();

    // 长程暗影法杖/狙击枪管（蓄力时闪烁）
    const glow = (Math.sin(this.pulse * 3) + 1) * 0.5;
    ctx.strokeStyle = `rgba(192, 132, 252, ${0.7 + glow * 0.3})`;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, r * 0.6);
    ctx.lineTo(0, r * 1.4 + aimBob);
    ctx.stroke();
    // 枪口奥术能量球
    ctx.fillStyle = '#e879f9';
    ctx.beginPath();
    ctx.arc(0, r * 1.45 + aimBob, 2.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // 8. 💣 地精投弹手 (风险投资公司：绿皮地精、尖耳、护目镜、炸药背带、投掷炸弹)
  drawXenoBomber(ctx, isHit) {
    const r = this.radius;
    const armSwing = Math.sin(this.pulse * 1.8) * 3;

    ctx.save();
    ctx.translate(this.x, this.y);

    // 地精标志性尖长耳朵 (从头顶两侧伸出)
    ctx.fillStyle = '#4a8a3a';
    ctx.strokeStyle = '#2a5a20';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-r * 0.35, -r * 0.75);
    ctx.quadraticCurveTo(-r * 0.95, -r * 1.0, -r * 0.7, -r * 1.25);
    ctx.quadraticCurveTo(-r * 0.5, -r * 1.0, -r * 0.2, -r * 0.8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(r * 0.35, -r * 0.75);
    ctx.quadraticCurveTo(r * 0.95, -r * 1.0, r * 0.7, -r * 1.25);
    ctx.quadraticCurveTo(r * 0.5, -r * 1.0, r * 0.2, -r * 0.8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 绿皮地精臃肿躯体
    const bodyGrad = ctx.createRadialGradient(-3, -4, 2, 0, 0, r * 0.95);
    bodyGrad.addColorStop(0, '#6a9a4a');
    bodyGrad.addColorStop(0.6, '#4a7a32');
    bodyGrad.addColorStop(1, '#2a4a1a');
    ctx.fillStyle = isHit ? '#ffffff' : bodyGrad;
    ctx.strokeStyle = '#1a3010';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.88, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 地精护目镜 (机械工程护目镜，标志性装备)
    ctx.fillStyle = '#3a4a3a';
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(-r * 0.35, -r * 0.4, 4.6, 4.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(r * 0.05, -r * 0.4, 4.6, 4.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // 护目镜镜片反光
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.42, -r * 0.5, 1.8, 1.2, 0.5, 0, Math.PI * 2);
    ctx.ellipse(r * 0.0, -r * 0.5, 1.8, 1.2, 0.5, 0, Math.PI * 2);
    ctx.fill();
    // 护目镜内红光独眼
    ctx.fillStyle = '#ff2e1a';
    ctx.beginPath();
    ctx.arc(-r * 0.2, -r * 0.4, 2.0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 46, 26, 0.3)';
    ctx.beginPath();
    ctx.arc(-r * 0.2, -r * 0.4, 3.0, 0, Math.PI * 2);
    ctx.fill();

    // 地精尖鼻 + 奸笑满口金牙
    ctx.fillStyle = '#4a8a3a';
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.15);
    ctx.quadraticCurveTo(r * 0.15, -r * 0.05, r * 0.08, r * 0.12);
    ctx.lineTo(-r * 0.05, r * 0.12);
    ctx.closePath();
    ctx.fill();
    // 金牙
    ctx.fillStyle = '#f1c40f';
    ctx.beginPath();
    ctx.moveTo(-r * 0.3, r * 0.28); ctx.lineTo(-r * 0.2, r * 0.05); ctx.lineTo(-r * 0.08, r * 0.28);
    ctx.moveTo(r * 0.05, r * 0.28); ctx.lineTo(r * 0.16, r * 0.05); ctx.lineTo(r * 0.28, r * 0.28);
    ctx.fill();

    // 炸药背带 (交叉挂着的炸药棒)
    ctx.strokeStyle = '#3a2a1a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-r * 0.4, -r * 0.5); ctx.lineTo(r * 0.4, r * 0.3);
    ctx.stroke();
    ctx.fillStyle = '#c0392b';
    ctx.strokeStyle = '#8a1a0a';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(-r * 0.25, r * 0.1, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // 引信火花
    ctx.fillStyle = '#f1c40f';
    ctx.fillRect(-r * 0.25, r * 0.1 - 7, 2, 3);

    // 投弹臂（挥舞炸药）
    ctx.strokeStyle = '#3a5a2a';
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

  // 9. 🧟 天灾缝合憎恶 (亡灵天灾缝合怪：腐败臃肿、缝合线、暴露腐肉、铁钩臂、青蓝亡灵幽光)
  drawXenoLaserBeast(ctx, isHit) {
    const r = this.radius;
    const chargePulse = (Math.sin(this.pulse * 2.5) + 1) * 0.5;
    const sway = Math.sin(this.pulse * 1.2) * 2;

    ctx.save();
    ctx.translate(this.x, this.y);

    // 铁钩手臂 (缝合憎恶标志性钩子)
    ctx.strokeStyle = '#5a6a62';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-r * 0.6, 2);
    ctx.lineTo(-r * 1.05, -2 + sway);
    ctx.stroke();
    // 铁钩
    ctx.fillStyle = '#8a9a92';
    ctx.beginPath();
    ctx.moveTo(-r * 1.05, -3 + sway);
    ctx.quadraticCurveTo(-r * 1.3, -4 + sway, -r * 1.1, -6 + sway);
    ctx.quadraticCurveTo(-r * 0.95, -4 + sway, -r * 0.9, -2 + sway);
    ctx.closePath();
    ctx.fill();

    // 腐败臃肿躯体 (缝合憎恶的青绿腐肉)
    const bodyGrad = ctx.createRadialGradient(-3, -4, 2, 0, 0, r * 0.95);
    bodyGrad.addColorStop(0, '#6a7a5e');
    bodyGrad.addColorStop(0.55, '#4a5a42');
    bodyGrad.addColorStop(1, '#263026');
    ctx.fillStyle = isHit ? '#ffffff' : bodyGrad;
    ctx.strokeStyle = '#141c14';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 缝合线 (缝合怪标志：粗黑缝线纵横)
    ctx.strokeStyle = '#141c14';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-r * 0.4, -r * 0.5);
    ctx.quadraticCurveTo(0, 0, r * 0.45, -r * 0.5);
    ctx.moveTo(-r * 0.35, r * 0.3);
    ctx.quadraticCurveTo(0, 0, r * 0.35, r * 0.35);
    ctx.moveTo(0, -r * 0.7);
    ctx.lineTo(0, r * 0.7);
    ctx.stroke();
    // 缝合线缝针痕迹 (X形交叉)
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-r * 0.2, -r * 0.25); ctx.lineTo(-r * 0.05, -r * 0.1);
    ctx.moveTo(-r * 0.2, -r * 0.1); ctx.lineTo(-r * 0.05, -r * 0.25);
    ctx.moveTo(r * 0.15, r * 0.15); ctx.lineTo(r * 0.3, r * 0.3);
    ctx.moveTo(r * 0.15, r * 0.3); ctx.lineTo(r * 0.3, r * 0.15);
    ctx.stroke();

    // 暴露腐肉与溃烂内脏 (暗红紫尸块)
    ctx.fillStyle = 'rgba(140, 50, 50, 0.6)';
    ctx.beginPath();
    ctx.ellipse(r * 0.3, -r * 0.15, r * 0.22, r * 0.18, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(100, 40, 80, 0.5)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.3, r * 0.3, r * 0.18, r * 0.16, -0.5, 0, Math.PI * 2);
    ctx.fill();

    // 青蓝亡灵能量核心 (天灾冰霜幽光，蓄能脉冲)
    const coreR = 5 + chargePulse * 2.5;
    const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, coreR + 4);
    coreGrad.addColorStop(0, '#ffffff');
    coreGrad.addColorStop(0.4, '#67e8f9');
    coreGrad.addColorStop(1, 'rgba(80, 160, 180, 0)');
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(0, 0, coreR + 4, 0, Math.PI * 2);
    ctx.fill();

    // 深陷空洞眼窝 (天灾亡灵青蓝冷焰，非血红)
    ctx.fillStyle = '#05080a';
    ctx.beginPath();
    ctx.ellipse(-r * 0.32, -r * 0.3, 4.0, 4.6, -0.1, 0, Math.PI * 2);
    ctx.ellipse(r * 0.32, -r * 0.3, 4.0, 4.6, 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#67e8f9';
    ctx.beginPath();
    ctx.ellipse(-r * 0.32, -r * 0.3, 1.3, 2.8, 0, 0, Math.PI * 2);
    ctx.ellipse(r * 0.32, -r * 0.3, 1.3, 2.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(103, 232, 249, 0.35)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.32, -r * 0.3, 2.4, 4.0, 0, 0, Math.PI * 2);
    ctx.ellipse(r * 0.32, -r * 0.3, 2.4, 4.0, 0, 0, Math.PI * 2);
    ctx.fill();
    // 眉骨
    ctx.strokeStyle = '#141c14';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-r * 0.5, -r * 0.5); ctx.lineTo(-r * 0.18, -r * 0.38);
    ctx.moveTo(r * 0.5, -r * 0.5); ctx.lineTo(r * 0.18, -r * 0.38);
    ctx.stroke();

    // 溃烂巨口 (裂开的大嘴 + 参差腐牙)
    ctx.fillStyle = '#1a0808';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.32, r * 0.4, r * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#c8d6cc';
    ctx.beginPath();
    ctx.moveTo(-r * 0.35, r * 0.3); ctx.lineTo(-r * 0.28, r * 0.1); ctx.lineTo(-r * 0.18, r * 0.32);
    ctx.moveTo(-r * 0.08, r * 0.3); ctx.lineTo(0, r * 0.08); ctx.lineTo(r * 0.08, r * 0.32);
    ctx.moveTo(r * 0.18, r * 0.3); ctx.lineTo(r * 0.28, r * 0.12); ctx.lineTo(r * 0.36, r * 0.32);
    ctx.fill();

    // 两侧暴露的冰霜吐息管 (缝合憎恶喷吐寒冰射线)
    ctx.strokeStyle = '#2a3a3a';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-r * 0.7, 6); ctx.lineTo(-r * 1.0, 8);
    ctx.moveTo(r * 0.7, 6); ctx.lineTo(r * 1.0, 8);
    ctx.stroke();
    ctx.fillStyle = `rgba(103, 232, 249, ${0.4 + chargePulse * 0.6})`;
    ctx.beginPath();
    ctx.arc(-r * 1.05, 8, 3, 0, Math.PI * 2);
    ctx.arc(r * 1.05, 8, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  /**
   * 绘制魔兽世界国服风格敌人血条与单位框架 (WoW Style Enemy Nameplate & Unit Frame)
   * 包含：
   * 1. 首领 Boss：双翼展翅金龙雕花、红宝石骷髅冠冕、?? 💀 骷髅首领等级徽章、<燃烧军团 · 军团统领> 阵营头衔
   * 2. 精英怪：魔兽国服经典金色盘旋飞龙框 (Classic WoW Elite Gold Dragon Border)
   * 3. 普通怪：魔兽黑铁暗金微缩血条、动态斩杀变色、阵营色标
   */
  renderEnemyHealthBar(ctx) {
    const isBoss = this.typeData.isBoss;
    const isElite = this.typeData.isElite;
    const ratio = Math.max(0, Math.min(1, this.hp / this.maxHp));

    ctx.save();

    // ==================== 1. 魔兽世界世界首领 / 团本 Boss 框架 ====================
    if (isBoss) {
      const barW = 120;
      const barH = 9;
      const barX = this.x - barW / 2;
      const barY = this.y - this.radius - 28;

      // 1.1 双翼展翅金龙雕花 (魔兽首领专属皇冠与飞龙金翼)
      ctx.save();
      const wingGrad = ctx.createLinearGradient(barX, barY - 12, barX + barW, barY);
      wingGrad.addColorStop(0, '#f39c12');
      wingGrad.addColorStop(0.3, '#ffd700');
      wingGrad.addColorStop(0.5, '#fff2a8');
      wingGrad.addColorStop(0.7, '#ffd700');
      wingGrad.addColorStop(1, '#f39c12');
      ctx.fillStyle = wingGrad;
      ctx.strokeStyle = '#633900';
      ctx.lineWidth = 1;

      // 左翼龙翅展翅弧线
      ctx.beginPath();
      ctx.moveTo(barX + 24, barY - 2);
      ctx.quadraticCurveTo(barX - 8, barY - 12, barX - 16, barY - 5);
      ctx.quadraticCurveTo(barX - 6, barY + 4, barX + 6, barY + 1);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 右翼龙翅展翅弧线
      ctx.beginPath();
      ctx.moveTo(barX + barW - 24, barY - 2);
      ctx.quadraticCurveTo(barX + barW + 8, barY - 12, barX + barW + 16, barY - 5);
      ctx.quadraticCurveTo(barX + barW + 6, barY + 4, barX + barW - 6, barY + 1);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 顶部正中黄金龙冠与红宝石
      ctx.beginPath();
      ctx.moveTo(this.x - 12, barY - 2);
      ctx.lineTo(this.x - 7, barY - 8);
      ctx.lineTo(this.x, barY - 13);
      ctx.lineTo(this.x + 7, barY - 8);
      ctx.lineTo(this.x + 12, barY - 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 红宝石徽珠
      ctx.fillStyle = '#ff2a2a';
      ctx.beginPath();
      ctx.arc(this.x, barY - 7, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 1.2 魔兽经典骷髅等级徽章 (?? 💀 代表首领级别，无法通过凡人等级探查)
      const badgeR = 8.5;
      const badgeX = barX - 11;
      const badgeY = barY + barH / 2;
      ctx.save();
      // 暗红圆底
      ctx.beginPath();
      ctx.arc(badgeX, badgeY, badgeR, 0, Math.PI * 2);
      ctx.fillStyle = '#7a0000';
      ctx.fill();
      // 金色金属圈
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 1.6;
      ctx.stroke();
      // 骷髅标志
      ctx.font = 'bold 9px -apple-system, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('💀', badgeX, badgeY);
      ctx.restore();

      // 1.3 领主血条黑铁金属底槽
      ctx.fillStyle = 'rgba(14, 16, 24, 0.95)';
      ctx.fillRect(barX - 2, barY - 2, barW + 4, barH + 4);
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 1.2;
      ctx.strokeRect(barX - 2, barY - 2, barW + 4, barH + 4);

      // 1.4 血条主体填充 (魔兽团本鲜红高光渐变)
      if (ratio > 0) {
        const hpGrad = ctx.createLinearGradient(barX, barY, barX, barY + barH);
        hpGrad.addColorStop(0, '#ff6b6b');
        hpGrad.addColorStop(0.4, '#ee5253');
        hpGrad.addColorStop(1, '#9b111e');
        ctx.fillStyle = hpGrad;
        ctx.fillRect(barX, barY, barW * ratio, barH);

        // 顶层玻璃高光线
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.fillRect(barX, barY, barW * ratio, 2);
      }

      // 1.5 血量数值与百分比
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 8.5px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${Math.round(this.hp)} / ${this.maxHp} (${Math.round(ratio * 100)}%)`, barX + barW / 2, barY + barH / 2);

      // 1.6 首领尊号与魔兽阵营行
      // 主尊号
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 11px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`👑 深渊大恶魔 · 玛洛诺斯`, this.x, barY - 14);

      // 魔兽公会/阵营副标题行
      ctx.font = 'bold 8px -apple-system, sans-serif';
      ctx.fillStyle = '#f6e58d';
      ctx.fillText(`<燃烧军团 · 军团统领>`, this.x, barY - 4);
    }
    // ==================== 2. 魔兽世界国服经典金龙精英怪框架 ====================
    else if (isElite) {
      const barW = 68;
      const barH = 6.5;
      const barX = this.x - barW / 2;
      const barY = this.y - this.radius - 17;

      // 2.1 底槽
      ctx.fillStyle = 'rgba(14, 16, 24, 0.95)';
      ctx.fillRect(barX - 1.5, barY - 1.5, barW + 3, barH + 3);
      ctx.strokeStyle = '#c56cf0';
      ctx.lineWidth = 1;
      ctx.strokeRect(barX - 1.5, barY - 1.5, barW + 3, barH + 3);

      // 2.2 血量填充 (魔兽精英琥珀橙金渐变)
      if (ratio > 0) {
        const hpGrad = ctx.createLinearGradient(barX, barY, barX, barY + barH);
        hpGrad.addColorStop(0, '#f9ca24');
        hpGrad.addColorStop(0.5, '#f0932b');
        hpGrad.addColorStop(1, '#eb4d4b');
        ctx.fillStyle = hpGrad;
        ctx.fillRect(barX, barY, barW * ratio, barH);
      }

      // 2.3 魔兽国服经典右侧盘旋金龙 (Classic Gold Dragon)
      ctx.save();
      const dragonX = barX + barW + 1;
      const dragonY = barY + barH / 2;
      const dGrad = ctx.createLinearGradient(dragonX - 4, dragonY - 8, dragonX + 10, dragonY + 8);
      dGrad.addColorStop(0, '#fff2a8');
      dGrad.addColorStop(0.5, '#ffd700');
      dGrad.addColorStop(1, '#b7791f');
      ctx.fillStyle = dGrad;
      ctx.strokeStyle = '#5a3800';
      ctx.lineWidth = 0.8;

      // 金龙龙头与龙角
      ctx.beginPath();
      ctx.moveTo(dragonX - 1, dragonY - 8);
      ctx.quadraticCurveTo(dragonX + 8, dragonY - 11, dragonX + 11, dragonY - 5);
      ctx.lineTo(dragonX + 8, dragonY - 1);
      ctx.lineTo(dragonX + 11, dragonY + 2); // 龙吻
      ctx.quadraticCurveTo(dragonX + 6, dragonY + 7, dragonX - 1, dragonY + 5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // 金色龙须与龙角
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(dragonX + 6, dragonY - 7);
      ctx.lineTo(dragonX + 3, dragonY - 13);
      ctx.moveTo(dragonX + 9, dragonY - 5);
      ctx.lineTo(dragonX + 13, dragonY - 10);
      ctx.stroke();

      // 盘旋龙身围绕血条右侧
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(dragonX + 2, dragonY + 1, 6, -Math.PI * 0.3, Math.PI * 0.6);
      ctx.stroke();

      // 龙眼血红宝石高光
      ctx.fillStyle = '#ff3838';
      ctx.beginPath();
      ctx.arc(dragonX + 6, dragonY - 4, 1.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 2.4 精英怪物阵营名称
      const factionName = this.typeData.faction || '邪血部落';
      const monsterName = this.typeData.name || '狂暴巨兽';
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 8.5px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`【${factionName}】${monsterName} · 精英`, this.x, barY - 3);
    }
    // ==================== 3. 魔兽世界普通怪物黑铁铭牌 ====================
    else {
      const barW = Math.max(30, Math.min(50, this.radius * 2.0));
      const barH = 4.5;
      const barX = this.x - barW / 2;
      const barY = this.y - this.radius - 8;

      // 3.1 黑铁边框底槽
      ctx.fillStyle = 'rgba(10, 12, 18, 0.9)';
      ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 0.8;
      ctx.strokeRect(barX - 1, barY - 1, barW + 2, barH + 2);

      // 3.2 动态血量渐变 (健康绿 -> 警告橙 -> 斩杀红)
      let hpColor1 = '#2ecc71';
      let hpColor2 = '#27ae60';
      if (ratio < 0.25) {
        hpColor1 = '#ff4757';
        hpColor2 = '#c0392b';
      } else if (ratio < 0.55) {
        hpColor1 = '#ffa502';
        hpColor2 = '#e67e22';
      }

      if (ratio > 0) {
        const hpGrad = ctx.createLinearGradient(barX, barY, barX, barY + barH);
        hpGrad.addColorStop(0, hpColor1);
        hpGrad.addColorStop(1, hpColor2);
        ctx.fillStyle = hpGrad;
        ctx.fillRect(barX, barY, barW * ratio, barH);
      }

      // 3.3 左侧阵营微型色标 (天灾/军团/兽人/地精识别)
      const factionCol = this.typeData.factionColor || '#38bdf8';
      ctx.fillStyle = factionCol;
      ctx.fillRect(barX - 3, barY, 2, barH);
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
    // 最终 Boss 决战标记（需求：12 分钟节奏，第 11 分钟一次性召唤深渊大恶魔）
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
        // 寻找最老的非 Boss、非精英普通小怪进行回收；Boss、精英怪与最终 Boss 享有绝对豁免权，绝不回收！
        let recycleIdx = -1;
        for (let i = 0; i < this.enemies.length; i++) {
          const e = this.enemies[i];
          if (!e.typeData.isBoss && !e.typeData.isElite && !e.isFinalBoss) {
            recycleIdx = i;
            break;
          }
        }
        if (recycleIdx !== -1) {
          enemy = this.enemies.splice(recycleIdx, 1)[0];
        } else {
          enemy = new Enemy();
        }
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
      'duck_quack',      // 超频嘎嘎音波
      'barrage',         // 弹幕射击
      'starfall',        // 星辰坠落
      'eye_beam',        // 眼棱扫射
      'eternity_breath'  // 永恒龙息
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

      // ===== 倒数第 2 波 (735s ~ 810s)：【双雄合璧】黑铁蒸汽机甲 + 邪兽人狂暴战士 =====
      if (this.gameTimeSeconds >= 735 && this.gameTimeSeconds < FINAL_BOSS_TIME) {
        const eliteCount = this.enemies.filter(e => e.typeData.isElite || e.typeData.id === 'UFO_SCOUT' || e.typeData.id === 'XENO_BEHEMOTH').length;
        if (eliteCount < 2 && Math.random() < 0.05) {
          const e1 = this.spawnEnemy('UFO_SCOUT', 2.5);
          if (e1) e1.isElite = true;
          const e2 = this.spawnEnemy('XENO_BEHEMOTH', 2.5);
          if (e2) e2.isElite = true;
        }
      }

      // ===== 最终 Boss 决战机制（15 分钟节奏 · 第 13.5 分钟 810s 一次性召唤）=====
      // 到达 FINAL_BOSS_TIME(810s) 时，一次性召唤最终 Boss「深渊大恶魔·玛洛诺斯」，
      // 血量高达 35,000 HP 强化基准，极高血量，需神装秒伤与满级技能支撑。
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
        // 召唤 35,000 HP 强化版最终世界首领：深渊大恶魔 · 玛洛诺斯
        const boss = this.spawnEnemy('BOSS_HIVE_MIND', 1.0);
        if (boss) {
          const hpMul = (timeline.statCurve && timeline.statCurve.hp) || 1.0;
          boss.baseHp = 35000;
          boss.maxHp = Math.floor(35000 * Math.max(1.0, hpMul * 0.7));
          boss.hp = boss.maxHp;
          boss.enrageTimer = 90; // 90 秒狂暴倒计时
          boss.skills = ['fel_meteor_shower', 'abyssal_stomp', 'summon_demons'];
          boss.isFinalBoss = true;
        }
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

      // 首领 90 秒狂暴灭顶倒计时
      if (enemy.enrageTimer !== undefined && enemy.enrageTimer > 0) {
        enemy.enrageTimer -= 1 / 60;
        if (enemy.enrageTimer <= 0 && !enemy.isEnraged) {
          enemy.isEnraged = true;
          enemy.damage = (enemy.damage || 35) * 10; // 秒杀全场
          enemy.speed = (enemy.speed || 1.0) * 2;
        }
      }

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
        // 深渊大恶魔邪能灵能波 (燃烧军团血色邪能)
        ctx.fillStyle = '#e74c3c';
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
