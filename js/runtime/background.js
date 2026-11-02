/**
 * 地球保卫战背景渲染器 (Earth Under Siege)
 * 加载「地球被外星舰队围攻」末日战场背景图 (images/earth_invasion_bg.jpg)
 * 叠加动态外星舰队扫描光、陨石火雨坠落与远处炮火闪烁，营造被围攻氛围
 */

import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../render';

const BACKGROUND_IMAGE_SRC = 'images/earth_invasion_bg.jpg';

export default class BackGround {
  constructor() {
    this.imgLoaded = false;
    this.img = null;

    try {
      if (typeof wx !== 'undefined' && wx.createImage) {
        this.img = wx.createImage();
        this.img.onload = () => {
          this.imgLoaded = true;
        };
        this.img.onerror = () => {
          this.imgLoaded = false;
        };
        this.img.src = BACKGROUND_IMAGE_SRC;
      }
    } catch (e) {
      this.imgLoaded = false;
    }

    this.ambientPulse = 0;
    this.vignetteGrad = null;
    this.baseGrad = null;

    // 坠落火雨 / 陨石拖尾 (外星舰队空投，营造围攻感)
    this.fallingDebris = [];
    for (let i = 0; i < 14; i++) {
      this.fallingDebris.push({
        x: Math.random() * SCREEN_WIDTH,
        y: Math.random() * SCREEN_HEIGHT,
        len: Math.random() * 14 + 8,
        speedY: Math.random() * 2.4 + 1.6,
        speedX: (Math.random() - 0.5) * 0.5,
        alpha: Math.random() * 0.5 + 0.3,
        warm: Math.random() > 0.4, // 暖色火球 or 冷色光束
      });
    }

    // 远处外星舰队红色扫描光 / 炮火闪烁
    this.fleetFlashes = [];
    for (let i = 0; i < 8; i++) {
      this.fleetFlashes.push({
        x: Math.random() * SCREEN_WIDTH,
        y: Math.random() * SCREEN_HEIGHT * 0.5,
        r: Math.random() * 6 + 3,
        phase: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.04 + 0.02,
      });
    }
  }

  update() {
    this.ambientPulse += 0.03;

    for (let i = 0; i < this.fallingDebris.length; i++) {
      const d = this.fallingDebris[i];
      d.y += d.speedY;
      d.x += d.speedX;
      d.alpha = 0.3 + Math.sin(this.ambientPulse * 2 + i) * 0.2;

      if (d.y - d.len > SCREEN_HEIGHT) {
        d.y = -Math.random() * 60;
        d.x = Math.random() * SCREEN_WIDTH;
      }
      if (d.x < -10) d.x = SCREEN_WIDTH + 10;
      if (d.x > SCREEN_WIDTH + 10) d.x = -10;
    }
  }

  render(ctx) {
    ctx.save();

    // 1. 绘制地球围攻战争背景图 (cover 铺满)
    let drawn = false;
    if (this.imgLoaded && this.img && this.img.width > 0) {
      try {
        const imgAspect = this.img.width / this.img.height;
        const screenAspect = SCREEN_WIDTH / SCREEN_HEIGHT;
        let drawW, drawH, drawX, drawY;

        if (screenAspect > imgAspect) {
          drawW = SCREEN_WIDTH;
          drawH = SCREEN_WIDTH / imgAspect;
          drawX = 0;
          drawY = (SCREEN_HEIGHT - drawH) / 2;
        } else {
          drawH = SCREEN_HEIGHT;
          drawW = SCREEN_HEIGHT * imgAspect;
          drawX = (SCREEN_WIDTH - drawW) / 2;
          drawY = 0;
        }

        ctx.drawImage(this.img, drawX, drawY, drawW, drawH);
        drawn = true;
      } catch (e) {
        drawn = false;
      }
    }

    if (!drawn) {
      // 兜底：深空暗紫渐变 (末日被围攻氛围)
      if (!this.baseGrad) {
        this.baseGrad = ctx.createRadialGradient(
          SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, 60,
          SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, SCREEN_HEIGHT * 0.7
        );
        this.baseGrad.addColorStop(0, '#2a1a30');
        this.baseGrad.addColorStop(0.6, '#1a0f24');
        this.baseGrad.addColorStop(1, '#0c0714');
      }
      ctx.fillStyle = this.baseGrad;
      ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
    }

    // 2. 远处外星舰队红色扫描光 / 炮火闪烁
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < this.fleetFlashes.length; i++) {
      const f = this.fleetFlashes[i];
      const a = 0.25 + Math.sin(this.ambientPulse * f.speed * 30 + f.phase) * 0.2;
      if (a <= 0) continue;
      ctx.globalAlpha = Math.max(0, Math.min(1, a));
      const grad = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r);
      grad.addColorStop(0, '#ff4a2a');
      grad.addColorStop(1, 'rgba(255, 74, 42, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 3. 坠落火雨 / 陨石拖尾 (空投围攻)
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < this.fallingDebris.length; i++) {
      const d = this.fallingDebris[i];
      if (d.alpha <= 0) continue;
      ctx.globalAlpha = Math.max(0, Math.min(1, d.alpha));

      // 拖尾
      const grad = ctx.createLinearGradient(d.x, d.y - d.len, d.x, d.y);
      if (d.warm) {
        grad.addColorStop(0, 'rgba(255, 140, 40, 0)');
        grad.addColorStop(1, 'rgba(255, 190, 80, 0.9)');
      } else {
        grad.addColorStop(0, 'rgba(90, 200, 255, 0)');
        grad.addColorStop(1, 'rgba(140, 220, 255, 0.85)');
      }
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(d.x, d.y - d.len);
      ctx.lineTo(d.x, d.y);
      ctx.stroke();

      // 火球头部
      ctx.fillStyle = d.warm ? '#ffd27a' : '#bdeaff';
      ctx.beginPath();
      ctx.arc(d.x, d.y, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 4. 电影级暗角 (强化末日压迫感)
    if (!this.vignetteGrad) {
      this.vignetteGrad = ctx.createRadialGradient(
        SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, SCREEN_WIDTH * 0.35,
        SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, SCREEN_HEIGHT * 0.75
      );
      this.vignetteGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      this.vignetteGrad.addColorStop(0.7, 'rgba(10, 4, 20, 0.35)');
      this.vignetteGrad.addColorStop(1, 'rgba(4, 2, 10, 0.78)');
    }
    ctx.fillStyle = this.vignetteGrad;
    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

    ctx.restore();
  }
}
