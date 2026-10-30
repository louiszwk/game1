/**
 * 魔兽暗黑奇幻战场背景渲染器
 * 加载高精度暗黑奇幻竞技场石砖地表 (images/arena_bg.jpg)
 * 融合动态光影、暗角暗晕、地底微光裂纹与魔法余烬
 */

import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../render';

const BACKGROUND_IMAGE_SRC = 'images/arena_bg.jpg';

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

    // 环境浮游魔法余烬（16 颗轻量金色圣尘与邪能微光）
    this.embers = [];
    const colors = ['#f1c40f', '#e67e22', '#2ecc71', '#9b59b6', '#3498db'];
    for (let i = 0; i < 16; i++) {
      this.embers.push({
        x: Math.random() * SCREEN_WIDTH,
        y: Math.random() * SCREEN_HEIGHT,
        size: Math.random() * 2.2 + 1.2,
        speedY: Math.random() * 0.6 + 0.3,
        speedX: (Math.random() - 0.5) * 0.4,
        alpha: Math.random() * 0.6 + 0.3,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
  }

  update() {
    this.ambientPulse += 0.03;

    for (let i = 0; i < this.embers.length; i++) {
      const e = this.embers[i];
      e.y -= e.speedY;
      e.x += e.speedX;
      e.alpha = 0.2 + Math.sin(this.ambientPulse * 1.5 + i) * 0.22;

      if (e.y < -10) {
        e.y = SCREEN_HEIGHT + 10;
        e.x = Math.random() * SCREEN_WIDTH;
      }
      if (e.x < -10) e.x = SCREEN_WIDTH + 10;
      if (e.x > SCREEN_WIDTH + 10) e.x = -10;
    }
  }

  render(ctx) {
    ctx.save();

    // 1. 绘制高精度暗黑奇幻石砖地表纹理
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
      // 预缓存暗夜底色渐变，彻底消除每帧动态创建
      if (!this.baseGrad) {
        this.baseGrad = ctx.createRadialGradient(
          SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, 60,
          SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, SCREEN_HEIGHT * 0.7
        );
        this.baseGrad.addColorStop(0, '#1c202a');
        this.baseGrad.addColorStop(1, '#0b0c10');
      }
      ctx.fillStyle = this.baseGrad;
      ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
    }

    // 2. 预缓存电影级暗角 Vignette，零开销快速铺屏
    if (!this.vignetteGrad) {
      this.vignetteGrad = ctx.createRadialGradient(
        SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, SCREEN_WIDTH * 0.35,
        SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, SCREEN_HEIGHT * 0.75
      );
      this.vignetteGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      this.vignetteGrad.addColorStop(0.7, 'rgba(5, 7, 12, 0.45)');
      this.vignetteGrad.addColorStop(1, 'rgba(2, 3, 6, 0.88)');
    }
    ctx.fillStyle = this.vignetteGrad;
    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

    // 3. 悬浮魔法余烬（一次性合批绘制，移除冗余的双重绘制）
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < this.embers.length; i++) {
      const e = this.embers[i];
      if (e.alpha <= 0) continue;

      ctx.globalAlpha = Math.max(0, Math.min(1, e.alpha));
      ctx.fillStyle = e.color;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    ctx.restore();
  }
}

