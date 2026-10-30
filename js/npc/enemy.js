/**
 * 魔兽怪物潮系统 (Enemy Horde System)
 * 包含亡灵食尸鬼、军团小鬼、骷髅勇士、恶魔守卫、憎恶Boss等
 */

import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../render';
import { EnemyImages } from '../runtime/assets';

export const ENEMY_TYPES = {
  // 1. 异星飞蚤 (Xeno Swarmer) - 疾速跳跃成群蜂拥
  XENO_SWARMER: {
    name: '异星飞蚤',
    hp: 20,
    speed: 2.3,
    radius: 12,
    damage: 8,
    exp: 1,
    color: '#2ed573',
    glowColor: '#10ac84',
    icon: '🦗',
  },
  // 2. 异形突击兵 (Xeno Trooper) - 漆黑生化甲壳与锋利战镰
  XENO_TROOPER: {
    name: '异形突击兵',
    hp: 40,
    speed: 1.7,
    radius: 15,
    damage: 13,
    exp: 2,
    color: '#a55eea',
    glowColor: '#8854d0',
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
    color: '#7bed9f',
    glowColor: '#2ed573',
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
    color: '#00d2d3',
    glowColor: '#01a3a4',
    icon: '🛸',
  },
  // 5. 异星重装泰坦 (Xeno Behemoth) - 精英外星巨兽：坚厚重铠地动山摇
  XENO_BEHEMOTH: {
    name: '装甲巨形泰坦',
    hp: 190,
    speed: 1.4,
    radius: 26,
    damage: 25,
    exp: 10,
    isElite: true,
    color: '#eb4d4b',
    glowColor: '#c0392b',
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
    color: '#9b59b6',
    glowColor: '#341f97',
    icon: '🧠',
  },
};

// 兼容映射历史键值
ENEMY_TYPES.GHOUL = ENEMY_TYPES.XENO_SWARMER;
ENEMY_TYPES.IMP = ENEMY_TYPES.XENO_TROOPER;
ENEMY_TYPES.SKELETON = ENEMY_TYPES.XENO_ACID_SPITTER;
ENEMY_TYPES.FELGUARD = ENEMY_TYPES.XENO_BEHEMOTH;
ENEMY_TYPES.BOSS_ABOMINATION = ENEMY_TYPES.BOSS_HIVE_MIND;

// 全局波次演进配置表 (前 60 秒全程慢节奏、少怪、易割草，后续阶梯爆发)
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

    // 绘制专属外星人入侵者形象 (优先高清Sprite贴图渲染)
    let enemyImg = null;
    switch (this.typeKey) {
      case 'XENO_SWARMER':
      case 'GHOUL':
        enemyImg = EnemyImages.swarmer;
        break;
      case 'XENO_TROOPER':
      case 'IMP':
        enemyImg = EnemyImages.trooper;
        break;
      case 'XENO_ACID_SPITTER':
      case 'SKELETON':
        enemyImg = EnemyImages.acid_spitter;
        break;
      case 'UFO_SCOUT':
        enemyImg = EnemyImages.ufo_scout;
        break;
      case 'XENO_BEHEMOTH':
      case 'FELGUARD':
        enemyImg = EnemyImages.behemoth;
        break;
      case 'BOSS_HIVE_MIND':
      case 'BOSS_ABOMINATION':
        enemyImg = EnemyImages.boss;
        break;
      default:
        enemyImg = EnemyImages.swarmer;
        break;
    }

    if (enemyImg && (enemyImg.complete || enemyImg.width > 0)) {
      ctx.save();
      ctx.translate(this.x, this.y);
      if (this.vx < 0) {
        ctx.scale(-1, 1);
      }
      if (isHit) {
        ctx.globalAlpha = 0.55;
      }
      const breathe = 1.0 + Math.sin(this.pulse * 2.2) * 0.05;
      const size = this.radius * 2.5;
      ctx.drawImage(enemyImg, -size / 2, -size * breathe / 2, size, size * breathe);
      ctx.restore();
    } else {
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
        default:
          this.drawXenoSwarmer(ctx, isHit);
          break;
      }
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

  // 1. 🦗 异星飞蚤 (Xeno Swarmer：火影草薙刃肢、墨黑硬派勾边、翡翠几丁甲壳、血红复眼)
  drawXenoSwarmer(ctx, isHit) {
    const r = this.radius;
    const legWiggle = Math.sin(this.pulse * 2.5) * 3.5;

    ctx.save();
    ctx.translate(this.x, this.y);

    // 六条如忍者苦无般锐利的节肢足 (黑刃带绿芒)
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    // 左三足
    ctx.moveTo(-r * 0.3, -3); ctx.lineTo(-r * 1.2, -7 + legWiggle);
    ctx.moveTo(-r * 0.4, 0); ctx.lineTo(-r * 1.35, -legWiggle);
    ctx.moveTo(-r * 0.3, 3); ctx.lineTo(-r * 1.2, 7 + legWiggle);
    // 右三足
    ctx.moveTo(r * 0.3, -3); ctx.lineTo(r * 1.2, -7 - legWiggle);
    ctx.moveTo(r * 0.4, 0); ctx.lineTo(r * 1.35, legWiggle);
    ctx.moveTo(r * 0.3, 3); ctx.lineTo(r * 1.2, 7 - legWiggle);
    ctx.stroke();

    // 翡翠渐变几丁质甲壳 (硬派高光)
    const shellGrad = ctx.createRadialGradient(-2, -2, 1, 0, 0, r * 0.9);
    shellGrad.addColorStop(0, '#55efc4');
    shellGrad.addColorStop(0.7, '#00b894');
    shellGrad.addColorStop(1, '#006266');
    ctx.fillStyle = isHit ? '#ffffff' : shellGrad;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.88, r * 0.72, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 脊背发光灵核战纹
    ctx.fillStyle = '#f1c40f';
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.32, r * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();

    // 双颗死神虚化感血红复眼
    ctx.fillStyle = '#ff4757';
    ctx.beginPath();
    ctx.arc(r * 0.4, -2.5, 2.8, 0, Math.PI * 2);
    ctx.arc(r * 0.4, 2.5, 2.8, 0, Math.PI * 2);
    ctx.fill();

    // 前端毒牙颚刃
    ctx.strokeStyle = '#dfe6e9';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(r * 0.65, -3); ctx.lineTo(r * 1.0, -1);
    ctx.moveTo(r * 0.65, 3); ctx.lineTo(r * 1.0, 1);
    ctx.stroke();

    ctx.restore();
  }

  // 2. 👾 异形突击兵 (破面/死神风：骨质长颅面具、灵压双刃、虚洞感应眼)
  drawXenoTrooper(ctx, isHit) {
    const r = this.radius;
    const clawSwipe = Math.sin(this.pulse * 2.0) * 4;

    ctx.save();
    ctx.translate(this.x, this.y);

    // 紫曜流线重甲身躯
    ctx.fillStyle = isHit ? '#ffffff' : '#3c40c6';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 2, r * 0.85, r * 0.9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 破面面具 (白色骨质颅骨)
    ctx.fillStyle = isHit ? '#ffffff' : '#ecf0f1';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(r * 0.5, -4);
    ctx.quadraticCurveTo(-r * 1.5, -8, -r * 1.6, -1);
    ctx.quadraticCurveTo(-r * 0.8, 4, r * 0.4, 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 灵压双镰
    ctx.strokeStyle = '#00d2d3';
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.moveTo(r * 0.4, 2);
    ctx.quadraticCurveTo(r * 1.2 + clawSwipe, 4, r * 1.5 + clawSwipe, 14);
    ctx.stroke();

    // 虚洞感应眼
    ctx.fillStyle = '#ff3f34';
    ctx.beginPath();
    ctx.arc(r * 0.2, -1, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // 3. 🦎 强酸喷吐兽 (Xeno Acid Spitter：漫画战纹、半透明荧光酸囊巨腹、强酸喷口、后脊毒棘)
  drawXenoAcidSpitter(ctx, isHit) {
    const r = this.radius;
    const breathe = Math.sin(this.pulse * 1.8) * 2;

    ctx.save();
    ctx.translate(this.x, this.y);

    // 后脊背生物毒棘 (墨黑硬线包边)
    ctx.fillStyle = '#2ed573';
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-r * 0.8, -r * 0.4);
    ctx.lineTo(-r * 1.3, -r * 0.9);
    ctx.lineTo(-r * 0.4, -r * 0.6);
    ctx.moveTo(-r * 0.2, -r * 0.7);
    ctx.lineTo(-r * 0.5, -r * 1.3);
    ctx.lineTo(r * 0.2, -r * 0.7);
    ctx.fill();
    ctx.stroke();

    // 鼓胀荧光强酸巨腹 (硬派墨线与放射状酸液)
    const acidGrad = ctx.createRadialGradient(-3, -3, 2, 0, 0, r * 0.9);
    acidGrad.addColorStop(0, '#7bed9f');
    acidGrad.addColorStop(0.6, '#05c46b');
    acidGrad.addColorStop(1, '#1e272e');
    ctx.fillStyle = isHit ? '#ffffff' : acidGrad;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.85 + breathe, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 酸囊半透明明黄核光
    ctx.fillStyle = 'rgba(241, 196, 15, 0.75)';
    ctx.beginPath();
    ctx.arc(-2, 0, r * 0.45, 0, Math.PI * 2);
    ctx.fill();

    // 漫画风锐利爬虫红瞳
    ctx.fillStyle = '#ff4757';
    ctx.beginPath();
    ctx.ellipse(r * 0.3, -r * 0.3, 3, 4, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000000';
    ctx.fillRect(r * 0.3 - 0.5, -r * 0.3 - 3, 1.2, 6); // 竖瞳

    // 前端大开的酸液喷射巨口
    ctx.fillStyle = '#1e272e';
    ctx.beginPath();
    ctx.arc(r * 0.6, 1, 5, -Math.PI * 0.5, Math.PI * 0.5);
    ctx.fill();

    // 蓄力滴落强酸液滴
    ctx.fillStyle = '#2ecc71';
    ctx.beginPath();
    ctx.arc(r * 0.85, 3 + breathe, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // 4. 🛸 幽浮突击艇 (UFO Scout：远程！金属飞碟圆盘、反重力能量舱、脉冲激光发射管)
  drawUfoScout(ctx, isHit) {
    const r = this.radius;
    const floatY = Math.sin(this.pulse * 2.0) * 3;

    ctx.save();
    ctx.translate(this.x, this.y + floatY);

    // 底部反重力辉光
    ctx.fillStyle = 'rgba(0, 210, 211, 0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 8, r * 0.7, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // 飞碟银钛合金主盘
    ctx.fillStyle = isHit ? '#ffffff' : '#2f3542';
    ctx.strokeStyle = '#00d2d3';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.1, r * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 顶部半球座舱玻璃罩
    ctx.fillStyle = isHit ? '#ffffff' : 'rgba(0, 210, 211, 0.85)';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, -4, r * 0.45, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 舱内绿皮外星驾驶员圆脑袋
    ctx.fillStyle = '#2ecc71';
    ctx.beginPath();
    ctx.arc(0, -6, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(-1, -6, 1, 0, Math.PI * 2);
    ctx.arc(1, -6, 1, 0, Math.PI * 2);
    ctx.fill();

    // 飞碟周圈四颗循环旋转的闪烁舷灯
    for (let i = 0; i < 4; i++) {
      const ang = this.pulse * 2.5 + (Math.PI / 2) * i;
      const lx = Math.cos(ang) * (r * 0.85);
      const ly = Math.sin(ang) * (r * 0.35);
      ctx.fillStyle = i % 2 === 0 ? '#ff4757' : '#f1c40f';
      ctx.beginPath();
      ctx.arc(lx, ly, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  // 5. 🦖 异星重装泰坦 (Xeno Behemoth：精英装甲巨兽、泰坦骨刺巨肩、生化重拳)
  drawXenoBehemoth(ctx, isHit) {
    const r = this.radius;
    const stomp = Math.sin(this.pulse * 1.5) * 2.5;

    ctx.save();
    ctx.translate(this.x, this.y);

    // 巨兽深红厚重生化重铠
    ctx.fillStyle = isHit ? '#ffffff' : '#c0392b';
    ctx.strokeStyle = '#2c3e50';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.arc(0, stomp, r * 0.88, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 脊背排布熔岩能量散热孔
    ctx.fillStyle = '#f39c12';
    for (let i = -2; i <= 2; i++) {
      ctx.fillRect(i * 6 - 2, stomp - r * 0.7, 4, 3);
    }

    // 巨大生化骨刺肩甲 (左右突出)
    ctx.fillStyle = '#1e272e';
    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-r * 0.7, stomp - 4);
    ctx.lineTo(-r * 1.4, stomp - 14);
    ctx.lineTo(-r * 0.4, stomp - 12);
    ctx.closePath();
    ctx.moveTo(r * 0.7, stomp - 4);
    ctx.lineTo(r * 1.4, stomp - 14);
    ctx.lineTo(r * 0.4, stomp - 12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 粗大外星獠牙巨角
    ctx.strokeStyle = '#2d3436';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(-8, stomp - r * 0.6);
    ctx.quadraticCurveTo(-18, stomp - r * 1.4, -6, stomp - r * 1.5);
    ctx.moveTo(8, stomp - r * 0.6);
    ctx.quadraticCurveTo(18, stomp - r * 1.4, 6, stomp - r * 1.5);
    ctx.stroke();

    // 暴虐金色复眼
    ctx.fillStyle = '#f1c40f';
    ctx.beginPath();
    ctx.arc(-6, stomp - 2, 3, 0, Math.PI * 2);
    ctx.arc(6, stomp - 2, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // 6. 🧠 虚空主脑母体·泽拉斯 (Boss：巨型灵能脑髓脉动、中央血眼、飞舞外星触手)
  drawHiveMindBoss(ctx, isHit) {
    const r = this.radius;
    const brainPulse = Math.sin(this.pulse * 2.0) * 3.5;
    const tentWave = Math.sin(this.pulse * 1.5) * 6;

    ctx.save();
    ctx.translate(this.x, this.y);

    // 紫色灵能念力光晕
    ctx.fillStyle = 'rgba(155, 89, 182, 0.25)';
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.35 + brainPulse, 0, Math.PI * 2);
    ctx.fill();

    // 下方蜿蜒外星生化触手
    ctx.strokeStyle = '#575fcf';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-12, r * 0.5);
    ctx.quadraticCurveTo(-22, r * 1.1 + tentWave, -14, r * 1.5 - tentWave);
    ctx.moveTo(0, r * 0.6);
    ctx.quadraticCurveTo(0, r * 1.2 - tentWave, 4, r * 1.6 + tentWave);
    ctx.moveTo(12, r * 0.5);
    ctx.quadraticCurveTo(22, r * 1.1 + tentWave, 14, r * 1.5 - tentWave);
    ctx.stroke();

    // 巨型异星大脑髓质 (紫曜半透明褶皱)
    ctx.fillStyle = isHit ? '#ffffff' : '#6c5ce7';
    ctx.strokeStyle = '#a29bfe';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, -2, r * 0.95 + brainPulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 大脑左右沟回褶皱条纹
    ctx.strokeStyle = '#4834d4';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(-r * 0.5, -r * 0.6);
    ctx.quadraticCurveTo(-r * 0.2, -r * 0.1, -r * 0.6, r * 0.4);
    ctx.moveTo(r * 0.5, -r * 0.6);
    ctx.quadraticCurveTo(r * 0.2, -r * 0.1, r * 0.6, r * 0.4);
    ctx.moveTo(0, -r * 0.8);
    ctx.lineTo(0, r * 0.4);
    ctx.stroke();

    // 核心中央巨大灵能魔眼 (凝视并放射念力)
    ctx.fillStyle = '#1e1b4b';
    ctx.beginPath();
    ctx.ellipse(0, 0, 11, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ff3838';
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(1, -1, 1.8, 0, Math.PI * 2);
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
    this.alienProjectiles = []; // 外星人远程发射的强酸/激光/灵能飞弹
  }

  reset() {
    this.clear();
    this.spawnTimer = 0;
    this.currentWave = 0;
    this.gameTimeSeconds = 0;
    this.alienProjectiles = [];
  }

  clear() {
    while (this.enemies.length > 0) {
      const e = this.enemies.pop();
      e.reset();
      this.pool.push(e);
    }
    this.alienProjectiles = [];
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

    // 1. 检测波次状态并抛出预警通知
    let targetWaveIdx = 0;
    for (let i = WAVE_CONFIG.length - 1; i >= 0; i--) {
      if (this.gameTimeSeconds >= WAVE_CONFIG[i].time) {
        targetWaveIdx = i;
        break;
      }
    }
    const currentCfg = WAVE_CONFIG[targetWaveIdx];

    if (this.currentWave !== currentCfg.wave) {
      this.currentWave = currentCfg.wave;
      if (this.onWaveNotice) {
        this.onWaveNotice(this.currentWave, currentCfg.title);
      }
    }

    const playerLvl = (player && player.level) || 1;
    const levelScale = 1.0 + (playerLvl - 1) * 0.12;

    // 前 60 秒严格按大间隔出怪（88帧 -> 75帧 -> 64帧），1分钟后逐步加速
    const spawnInterval = Math.max(14, Math.floor(currentCfg.interval / levelScale));
    const timeScale = currentCfg.hpScale * levelScale;

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
      const maxAliveLimit = this.gameTimeSeconds < 30 ? 12 : (this.gameTimeSeconds < 60 ? 20 : 85);
      if (this.enemies.length < maxAliveLimit) {

        // 前 1 分钟（60秒）严格单只刷新；60秒后视等级提升批次
        const batchCount = this.gameTimeSeconds < 60 ? 1 : (playerLvl >= 5 ? currentCfg.batch : 1);

        for (let b = 0; b < batchCount; b++) {
          let type = 'XENO_SWARMER';
          const rand = Math.random();

          if (canSpawnHighTierRanged) {
            if (rand < 0.15) {
              type = 'UFO_SCOUT';
            } else if (rand < 0.32) {
              type = 'XENO_ACID_SPITTER';
            } else if (rand < 0.55) {
              type = 'XENO_BEHEMOTH';
            } else if (rand < 0.80) {
              type = 'XENO_TROOPER';
            } else {
              type = 'XENO_SWARMER';
            }
          } else if (canSpawnBasicRanged) {
            if (rand < 0.18) {
              type = 'XENO_ACID_SPITTER';
            } else if (rand < 0.38) {
              type = 'XENO_BEHEMOTH';
            } else if (rand < 0.72) {
              type = 'XENO_TROOPER';
            } else {
              type = 'XENO_SWARMER';
            }
          } else {
            // 前中发育期：
            if (this.gameTimeSeconds >= 75 || playerLvl >= 5) {
              if (rand < 0.20) {
                type = 'XENO_BEHEMOTH';
              } else if (rand < 0.65) {
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
          // 开局前 60 秒应用柔和移速缩放
          if (enemy && currentCfg.speedScale) {
            enemy.speed *= currentCfg.speedScale;
          }
        }
      }

      // Boss生成节奏：每 120 秒或玩家突破特定等级触发【母巢主脑·泽拉斯】
      if (this.gameTimeSeconds > 0 && this.gameTimeSeconds % 120 === 0 && Math.random() < 0.08) {
        const hasBoss = this.enemies.some(e => e.typeData.isBoss);
        if (!hasBoss) {
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
        // 降低外星飞弹飞行速度，给玩家留出依靠身法走位闪避的操作空间
        const speed = result.projectileType === 'laser' ? 4.5 : (result.projectileType === 'psychic' ? 3.6 : 3.4);
        this.alienProjectiles.push({
          x: result.x,
          y: result.y,
          vx: (dx / dist) * speed,
          vy: (dy / dist) * speed,
          radius: result.projectileType === 'psychic' ? 8 : (result.projectileType === 'laser' ? 5 : 6),
          type: result.projectileType,
          damage: result.damage,
          life: 95,
        });
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
        continue;
      }

      // 击中玩家判定 (Bounding-box 预过滤)
      const pdx = p.x - player.x;
      const pdy = p.y - player.y;
      const hitRadius = p.radius + player.width * 0.38;

      if (Math.abs(pdx) < hitRadius && Math.abs(pdy) < hitRadius && pdx * pdx + pdy * pdy < hitRadius * hitRadius) {
        onPlayerHit(p.damage);
        const last = this.alienProjectiles.pop();
        if (i < this.alienProjectiles.length) {
          this.alienProjectiles[i] = last;
        }
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
