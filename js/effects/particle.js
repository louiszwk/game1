import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../render';

/**
 * 粒子特效与冲击波系统 (Canvas 2D 原生超高性能批量粒子引擎)
 * 极致散热优化：
 * 1. 批量合批渲染（整个系统仅 1 次 save/restore 与 1 次 lighter 混合模式切换）
 * 2. 矢量线性火花算法（完全移除每颗粒子 translate/rotate 矩阵压栈开销）
 * 3. 屏幕视口剔除与 Swap-and-Pop 零 GC 回收
 */

export class Shockwave {
  constructor() {
    this.reset();
  }

  reset() {
    this.x = 0;
    this.y = 0;
    this.radius = 1;
    this.maxRadius = 60;
    this.speed = 4;
    this.color = '#fff';
    this.width = 3;
    this.alpha = 1;
    this.active = false;
  }

  init(x, y, color, maxRadius = 60, speed = 4, width = 3) {
    this.x = x;
    this.y = y;
    this.radius = 2;
    this.maxRadius = maxRadius;
    this.speed = speed;
    this.color = color;
    this.width = width;
    this.alpha = 1;
    this.active = true;
  }

  update() {
    if (!this.active) return;
    this.radius += this.speed;
    this.alpha = Math.max(0, 1 - this.radius / this.maxRadius);
    if (this.radius >= this.maxRadius || this.alpha <= 0) {
      this.active = false;
    }
  }
}

export class Particle {
  constructor() {
    this.reset();
  }

  reset() {
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.size = 3;
    this.life = 0;
    this.maxLife = 30;
    this.color = '#fff';
    this.alpha = 1;
    this.shape = 'circle';
    this.glow = true;
    this.active = false;
    this.drag = 0.95;
    this.gravity = 0;
  }

  init(x, y, vx, vy, size, maxLife, color, options = {}) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.size = size;
    this.life = maxLife;
    this.maxLife = maxLife;
    this.color = color;
    this.alpha = 1;
    this.shape = options.shape || 'circle';
    this.glow = options.glow !== undefined ? options.glow : true;
    this.drag = options.drag || 0.95;
    this.gravity = options.gravity || 0;
    this.active = true;
  }

  update() {
    if (!this.active) return;

    this.x += this.vx;
    this.y += this.vy;
    this.vx *= this.drag;
    this.vy = this.vy * this.drag + this.gravity;

    this.life--;
    this.alpha = Math.max(0, this.life / this.maxLife);

    if (this.life <= 0) {
      this.active = false;
    }
  }

  renderDirect(ctx) {
    if (!this.active || this.alpha <= 0) return;

    ctx.globalAlpha = this.alpha;

    if (this.shape === 'spark') {
      // 极速定向火花：利用直线段直接绘制，零 translate / rotate 矩阵开销！
      const spd = Math.sqrt(this.vx * this.vx + this.vy * this.vy) || 1;
      const nx = (this.vx / spd);
      const ny = (this.vy / spd);
      const halfLen = Math.max(this.size * 1.5, spd * 1.8);

      ctx.strokeStyle = this.color;
      ctx.lineWidth = this.size;
      ctx.beginPath();
      ctx.moveTo(this.x - nx * halfLen, this.y - ny * halfLen);
      ctx.lineTo(this.x + nx * halfLen, this.y + ny * halfLen);
      ctx.stroke();

      // 中心耀白线
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(1, this.size * 0.4);
      ctx.stroke();
    } else {
      // 柔和光晕球与璀璨星点
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();

      // 核心高亮白心
      if (this.size > 2.2) {
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = this.alpha * 0.85;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * 0.45, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

export class ParticleManager {
  constructor() {
    this.pool = [];
    this.activeParticles = [];
    this.maxParticles = 140; // 移动端黄金平衡，保留震撼视觉同时降低负载
    for (let i = 0; i < this.maxParticles; i++) {
      this.pool.push(new Particle());
    }

    // 冲击波池
    this.shockwaves = [];
    this.shockwavePool = [];
    for (let i = 0; i < 15; i++) {
      this.shockwavePool.push(new Shockwave());
    }
  }

  spawn(x, y, vx, vy, size, maxLife, color, options = {}) {
    let p = this.pool.pop();
    if (!p) {
      if (this.activeParticles.length > 0) {
        p = this.activeParticles.shift();
      } else {
        p = new Particle();
      }
    }
    p.init(x, y, vx, vy, size, maxLife, color, options);
    this.activeParticles.push(p);
    return p;
  }

  /**
   * 触发地面或空中能量冲击波光圈
   */
  addShockwave(x, y, color = '#f1c40f', maxRadius = 60, speed = 4.5, width = 2.5) {
    let sw = this.shockwavePool.pop();
    if (!sw) {
      if (this.shockwaves.length > 0) {
        sw = this.shockwaves.shift();
      } else {
        sw = new Shockwave();
      }
    }
    sw.init(x, y, color, maxRadius, speed, width);
    this.shockwaves.push(sw);
    return sw;
  }

  /**
   * 放射状爆发粒子
   */
  burst(x, y, color, count = 8, speed = 4.2, size = 3.0, options = {}) {
    this.addShockwave(x, y, color, size * 10, speed * 1.1, 2.2);

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
      const spd = (Math.random() * 0.7 + 0.6) * speed;
      const vx = Math.cos(angle) * spd;
      const vy = Math.sin(angle) * spd;
      const life = Math.floor(Math.random() * 14 + 10);
      const isSpark = Math.random() > 0.45;
      this.spawn(x, y, vx, vy, size * (Math.random() * 0.4 + 0.8), life, color, {
        shape: isSpark ? 'spark' : 'circle',
        glow: true,
        drag: 0.91,
        ...options,
      });
    }
  }

  /**
   * 圣光璀璨星芒与金羽
   */
  holySparks(x, y, count = 7) {
    this.addShockwave(x, y, '#ffeaa7', 48, 4.2, 2.2);
    for (let i = 0; i < count; i++) {
      const vx = (Math.random() - 0.5) * 5;
      const vy = (Math.random() - 0.5) * 5 - 1.2;
      this.spawn(x, y, vx, vy, Math.random() * 2.5 + 2.0, 18, '#f1c40f', {
        shape: 'spark',
        glow: true,
        drag: 0.90,
      });
    }
  }

  /**
   * 邪能幽绿爆裂与毒焰
   */
  felFlames(x, y, count = 8) {
    this.addShockwave(x, y, '#2ecc71', 50, 4.5, 2.5);
    for (let i = 0; i < count; i++) {
      const vx = (Math.random() - 0.5) * 4.5;
      const vy = -Math.random() * 4 - 1.2;
      const color = Math.random() > 0.35 ? '#2ecc71' : '#a8ff78';
      this.spawn(x, y, vx, vy, Math.random() * 3 + 2.2, 20, color, {
        shape: 'spark',
        glow: true,
        drag: 0.92,
        gravity: -0.05,
      });
    }
  }

  /**
   * 暗影虚空星云与引力涡流
   */
  shadowMist(x, y, count = 6) {
    this.addShockwave(x, y, '#9b59b6', 42, 3.5, 2);
    for (let i = 0; i < count; i++) {
      const vx = (Math.random() - 0.5) * 3.0;
      const vy = (Math.random() - 0.5) * 3.0;
      const color = Math.random() > 0.4 ? '#8e44ad' : '#341f97';
      this.spawn(x, y, vx, vy, Math.random() * 3.5 + 2.5, 22, color, {
        shape: 'circle',
        glow: true,
        drag: 0.90,
      });
    }
  }

  /**
   * 怪物阵亡高爆视觉
   */
  monsterDeath(x, y, enemyTypeData) {
    const isBoss = enemyTypeData && enemyTypeData.isBoss;
    const isElite = enemyTypeData && enemyTypeData.isElite;
    const mainColor = enemyTypeData ? (enemyTypeData.color || '#e74c3c') : '#e74c3c';
    const shockRadius = isBoss ? 100 : (isElite ? 65 : 40);
    const particleCount = isBoss ? 20 : (isElite ? 12 : 6);

    this.addShockwave(x, y, mainColor, shockRadius, isBoss ? 6 : 4.5, isBoss ? 3.5 : 2.2);

    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.4;
      const spd = (Math.random() * 0.7 + 0.6) * (isBoss ? 6 : 4.2);
      const vx = Math.cos(angle) * spd;
      const vy = Math.sin(angle) * spd;
      const life = Math.floor(Math.random() * 15 + 10);
      this.spawn(x, y, vx, vy, Math.random() * 2.5 + 2.2, life, mainColor, {
        shape: Math.random() > 0.4 ? 'spark' : 'circle',
        glow: true,
        drag: 0.91,
      });
    }

    if (isBoss || isElite) {
      const wispCount = isBoss ? 6 : 3;
      for (let i = 0; i < wispCount; i++) {
        const vx = (Math.random() - 0.5) * 1.5;
        const vy = -Math.random() * 2.2 - 1.0;
        this.spawn(x + (Math.random() - 0.5) * 10, y, vx, vy, Math.random() * 2.2 + 2, 25, '#74b9ff', {
          shape: 'circle',
          glow: true,
          drag: 0.95,
          gravity: -0.04,
        });
      }
    }
  }

  /**
   * 刀剑命中打击火星与暴击冲击环
   */
  hitImpact(x, y, color = '#ffffff', isCrit = false) {
    const count = isCrit ? 4 : 2;
    if (isCrit) {
      this.addShockwave(x, y, '#ffd700', 32, 4.2, 2.2);
    }
    for (let i = 0; i < count; i++) {
      const vx = (Math.random() - 0.5) * (isCrit ? 5 : 3.5);
      const vy = (Math.random() - 0.5) * (isCrit ? 5 : 3.5);
      this.spawn(x, y, vx, vy, isCrit ? 3.0 : 2.0, 10, isCrit ? '#ffd700' : color, {
        shape: 'spark',
        glow: true,
        drag: 0.88,
      });
    }
  }

  /**
   * 境界突破华丽金辉爆发
   */
  levelUpBurst(x, y) {
    this.addShockwave(x, y, '#ffd700', 100, 5.5, 3.5);
    this.addShockwave(x, y, '#ffffff', 65, 4.5, 2.0);

    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = Math.random() * 5 + 2;
      const vx = Math.cos(angle) * spd;
      const vy = Math.sin(angle) * spd - 1.2;
      const starColor = Math.random() > 0.3 ? '#f1c40f' : '#ffeaa7';
      this.spawn(x, y, vx, vy, Math.random() * 3.0 + 2.0, 24, starColor, {
        shape: 'spark',
        glow: true,
        drag: 0.92,
        gravity: 0.04,
      });
    }
  }

  update() {
    // 粒子更新：Swap-and-Pop 零 GC 高速回收
    for (let i = this.activeParticles.length - 1; i >= 0; i--) {
      const p = this.activeParticles[i];
      p.update();
      if (!p.active) {
        const last = this.activeParticles.pop();
        if (i < this.activeParticles.length) {
          this.activeParticles[i] = last;
        }
        this.pool.push(p);
      }
    }

    // 冲击波更新
    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.update();
      if (!sw.active) {
        const last = this.shockwaves.pop();
        if (i < this.shockwaves.length) {
          this.shockwaves[i] = last;
        }
        this.shockwavePool.push(sw);
      }
    }
  }

  render(ctx) {
    if (this.shockwaves.length === 0 && this.activeParticles.length === 0) return;

    // 批量合批：仅开启 1 次 save / restore 与 1 次 lighter 混合模式
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // 1. 批量冲击波
    for (let i = 0; i < this.shockwaves.length; i++) {
      const sw = this.shockwaves[i];
      if (!sw.active || sw.alpha <= 0) continue;
      if (sw.x < -sw.radius || sw.x > SCREEN_WIDTH + sw.radius || sw.y < -sw.radius || sw.y > SCREEN_HEIGHT + sw.radius) continue;

      ctx.globalAlpha = sw.alpha;
      ctx.strokeStyle = sw.color;
      ctx.lineWidth = Math.max(1, sw.width * sw.alpha);
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.globalAlpha = sw.alpha * 0.6;
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, Math.max(1, sw.radius - 2), 0, Math.PI * 2);
      ctx.stroke();
    }

    // 2. 批量渲染粒子（直接绘制，零额外 save/restore 与矩阵压栈）
    for (let i = 0; i < this.activeParticles.length; i++) {
      const p = this.activeParticles[i];
      if (!p.active || p.alpha <= 0) continue;
      if (p.x < -15 || p.x > SCREEN_WIDTH + 15 || p.y < -15 || p.y > SCREEN_HEIGHT + 15) continue;

      p.renderDirect(ctx);
    }

    ctx.restore();
  }

  clear() {
    while (this.activeParticles.length > 0) {
      const p = this.activeParticles.pop();
      p.reset();
      this.pool.push(p);
    }
    while (this.shockwaves.length > 0) {
      const sw = this.shockwaves.pop();
      sw.reset();
      this.shockwavePool.push(sw);
    }
  }
}

/**
 * 屏幕震颤系统（支持衰减与冲击）
 */
export class ScreenShake {
  constructor() {
    this.intensity = 0;
    this.decay = 0.88;
    this.offsetX = 0;
    this.offsetY = 0;
  }

  shake(amount = 8) {
    this.intensity = Math.min(20, this.intensity + amount);
  }

  update() {
    if (this.intensity > 0.25) {
      this.offsetX = (Math.random() * 2 - 1) * this.intensity;
      this.offsetY = (Math.random() * 2 - 1) * this.intensity;
      this.intensity *= this.decay;
    } else {
      this.intensity = 0;
      this.offsetX = 0;
      this.offsetY = 0;
    }
  }

  apply(ctx) {
    if (this.intensity > 0) {
      ctx.translate(this.offsetX, this.offsetY);
    }
  }
}

