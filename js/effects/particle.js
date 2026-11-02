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
      // 可爱四芒星火花：软萌星光而非锐利刀光，零 translate / rotate 矩阵开销！
      const spd = Math.sqrt(this.vx * this.vx + this.vy * this.vy) || 1;
      const nx = (this.vx / spd);
      const ny = (this.vy / spd);
      const halfLen = Math.max(this.size * 1.6, spd * 1.8);
      // 垂直于运动方向
      const px = -ny;
      const py = nx;

      ctx.fillStyle = this.color;
      ctx.beginPath();
      // 沿运动方向 + 垂直方向的四芒星（圆润可爱的小星星）
      ctx.moveTo(this.x + nx * halfLen, this.y + ny * halfLen);
      ctx.quadraticCurveTo(this.x + px * halfLen * 0.35, this.y + py * halfLen * 0.35, this.x - nx * halfLen, this.y - ny * halfLen);
      ctx.quadraticCurveTo(this.x - px * halfLen * 0.35, this.y - py * halfLen * 0.35, this.x + nx * halfLen, this.y + ny * halfLen);
      ctx.fill();

      // 中心圆润白心
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = this.alpha * 0.9;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size * 0.4, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // 柔和光晕泡泡与璀璨圆点
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();

      // 核心高亮白心
      if (this.size > 2.2) {
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha = this.alpha * 0.85;
        ctx.beginPath();
        ctx.arc(this.x - this.size * 0.15, this.y - this.size * 0.15, this.size * 0.45, 0, Math.PI * 2);
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

    // 动态光源池（需求 B：动态光源配置）
    this.dynamicLights = [];
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
   * 播放特效预制体（消费 EffectLibrary 的多维度表现字段）
   *
   * 支持三类强化表现：
   *   1. particleLayers —— 挂载多层粒子系统（逐层叠加不同类型粒子）
   *   2. screenShake    —— 屏幕震动参数
   *   3. dynamicLight   —— 动态光源配置
   *
   * @param {number} x 中心点 x
   * @param {number} y 中心点 y
   * @param {object} prefab 已归一化的特效预制体（EffectLibrary.normalize 输出）
   * @param {object} ctx 2D 上下文（可选，动态光源若需立即绘制）
   */
  playPrefab(x, y, prefab) {
    if (!prefab) return;

    // 1. 多层粒子系统：逐层挂载
    const layers = prefab.particleLayers || [];
    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i];
      const count = layer.count || 8;
      const speed = layer.speed || 4;
      const color = layer.color || prefab.color || '#ffffff';
      const glow = layer.glow !== undefined ? layer.glow : true;
      const shape = layer.type || prefab.particles || 'spark';

      // 按粒子形状分发（spark/star → 星芒，其余 → 圆点/泡泡）
      const isSpark = shape === 'spark' || shape === 'star';
      for (let j = 0; j < count; j++) {
        const angle = (Math.PI * 2 * j) / count + (Math.random() - 0.5) * 0.5;
        const spd = (Math.random() * 0.7 + 0.6) * speed;
        const vx = Math.cos(angle) * spd;
        const vy = Math.sin(angle) * spd;
        const life = Math.floor((layer.life || 16) * (Math.random() * 0.4 + 0.8));
        const size = (layer.size || 3) * (Math.random() * 0.4 + 0.8);
        this.spawn(x, y, vx, vy, size, life, color, {
          shape: isSpark ? 'spark' : 'circle',
          glow,
          drag: layer.drag || 0.91,
          gravity: layer.gravity || 0,
        });
      }
    }

    // 冲击波（预制体基础强度映射）
    if (prefab.intensity && prefab.intensity >= 1) {
      this.addShockwave(x, y, prefab.color || '#ffffff', 40 + prefab.intensity * 18, 4.2, 2.4);
    }

    // 2. 动态光源：挂载一个会衰减的光源
    if (prefab.dynamicLight) {
      this.addDynamicLight(x, y, prefab.dynamicLight);
    }
  }

  /**
   * 挂载动态光源（需求 B）
   * @param {number} x
   * @param {number} y
   * @param {object} light { color, radius, intensity, falloff, flicker }
   */
  addDynamicLight(x, y, light = {}) {
    this.dynamicLights.push({
      x,
      y,
      color: light.color || '#ffffff',
      radius: light.radius || 80,
      intensity: light.intensity || 0.5,
      falloff: light.falloff || 2,
      flicker: light.flicker !== undefined ? light.flicker : true,
      life: 20, // 持续帧数
      maxLife: 20,
    });
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
    this.addShockwave(x, y, '#f39c12', 48, 4.2, 2.2);
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
   * 邪能幽绿爆裂与毒焰 (柔和薄荷绿泡泡)
   */
  felFlames(x, y, count = 8) {
    this.addShockwave(x, y, '#2ecc71', 50, 4.5, 2.5);
    for (let i = 0; i < count; i++) {
      const vx = (Math.random() - 0.5) * 4.5;
      const vy = -Math.random() * 4 - 1.2;
      const color = Math.random() > 0.35 ? '#2ecc71' : '#2ecc71';
      this.spawn(x, y, vx, vy, Math.random() * 3 + 2.2, 20, color, {
        shape: 'circle',
        glow: true,
        drag: 0.92,
        gravity: -0.05,
      });
    }
  }

  /**
   * 暗影虚空星云与引力涡流 (柔和薰衣草紫泡泡)
   */
  shadowMist(x, y, count = 6) {
    this.addShockwave(x, y, '#9b59b6', 42, 3.5, 2);
    for (let i = 0; i < count; i++) {
      const vx = (Math.random() - 0.5) * 3.0;
      const vy = (Math.random() - 0.5) * 3.0;
      const color = Math.random() > 0.4 ? '#8e44ad' : '#6c5ce7';
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
        this.spawn(x + (Math.random() - 0.5) * 10, y, vx, vy, Math.random() * 2.2 + 2, 25, '#3498db', {
          shape: 'circle',
          glow: true,
          drag: 0.95,
          gravity: -0.04,
        });
      }
    }
  }

  /**
   * 刀剑命中打击火星与暴击冲击环 (可爱软萌星芒)
   */
  hitImpact(x, y, color = '#ffffff', isCrit = false) {
    const count = isCrit ? 4 : 2;
    if (isCrit) {
      this.addShockwave(x, y, '#f1c40f', 32, 4.2, 2.2);
    }
    for (let i = 0; i < count; i++) {
      const vx = (Math.random() - 0.5) * (isCrit ? 5 : 3.5);
      const vy = (Math.random() - 0.5) * (isCrit ? 5 : 3.5);
      this.spawn(x, y, vx, vy, isCrit ? 3.0 : 2.0, 10, isCrit ? '#f1c40f' : color, {
        shape: 'spark',
        glow: true,
        drag: 0.88,
      });
    }
  }

  /**
   * 境界突破华丽金辉爆发 (糖果星芒泡泡)
   */
  levelUpBurst(x, y) {
    this.addShockwave(x, y, '#f1c40f', 100, 5.5, 3.5);
    this.addShockwave(x, y, '#ffffff', 65, 4.5, 2.0);

    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = Math.random() * 5 + 2;
      const vx = Math.cos(angle) * spd;
      const vy = Math.sin(angle) * spd - 1.2;
      const starColor = Math.random() > 0.3 ? '#f1c40f' : '#e74c3c';
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

    // 动态光源更新（衰减回收）
    for (let i = this.dynamicLights.length - 1; i >= 0; i--) {
      const dl = this.dynamicLights[i];
      dl.life--;
      if (dl.life <= 0) {
        const last = this.dynamicLights.pop();
        if (i < this.dynamicLights.length) {
          this.dynamicLights[i] = last;
        }
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

    // 3. 动态光源渲染（additive 叠加柔光，模拟技能光源）
    if (this.dynamicLights.length > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < this.dynamicLights.length; i++) {
        const dl = this.dynamicLights[i];
        const lifeRatio = dl.life / dl.maxLife;
        const alpha = dl.intensity * lifeRatio;
        const r = dl.radius * (dl.flicker ? (0.9 + Math.random() * 0.2) : 1);

        // 径向渐变光源（近似动态光斑，零 shadowBlur 开销）
        const grad = ctx.createRadialGradient(dl.x, dl.y, 0, dl.x, dl.y, r);
        grad.addColorStop(0, this._hexToRgba(dl.color, alpha));
        grad.addColorStop(1, this._hexToRgba(dl.color, 0));
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(dl.x, dl.y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  /** '#rrggbb' → 'rgba(r,g,b,a)' */
  _hexToRgba(hex, alpha) {
    if (hex.startsWith('#')) {
      const h = hex.slice(1);
      const r = parseInt(h.slice(0, 2), 16);
      const g = parseInt(h.slice(2, 4), 16);
      const b = parseInt(h.slice(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    return hex;
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
    this.dynamicLights = [];
  }
}

/**
 * 屏幕震颤系统（支持衰减与冲击）
 */
export class ScreenShake {
  constructor() {
    this.intensity = 0;
    this.decay = 0.80; // 快速利落回正，消除眩晕感
    this.offsetX = 0;
    this.offsetY = 0;
    this.lastShakeTime = 0;
  }

  shake(amount = 4) {
    const now = Date.now();
    // 1. 防高频抖动轰炸：两次震屏至少间隔 260ms，避免持续眩晕
    if (now - this.lastShakeTime < 260 && amount < 10) {
      return;
    }
    this.lastShakeTime = now;

    // 2. 避免无脑累加：取最大值而非无限叠加，且幅度克制在舒适的 5.5 像素以内
    const capped = Math.min(5.5, amount * 0.45);
    this.intensity = Math.max(this.intensity, capped);
  }

  update() {
    if (this.intensity > 0.15) {
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

