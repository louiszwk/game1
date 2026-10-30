import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../render';

/**
 * 战斗飘字系统（伤害、暴击、治疗、闪避、升级跳字）
 * 极致散热优化：
 * 1. 字体描述符静态缓存（消除每帧字符串拼接与 Canvas 字体解析开销）
 * 2. 高速位移暗影（非暴击普通伤害使用 (x+1, y+1) 双层绘制替代昂贵的 strokeText 矢量字轮廓膨胀）
 * 3. 屏幕剔除与 Swap-and-Pop 零 GC 回收
 */

const FONT_FAMILY = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif';

const FONT_CACHE = {
  14: `bold 14px ${FONT_FAMILY}`,
  15: `bold 15px ${FONT_FAMILY}`,
  16: `bold 16px ${FONT_FAMILY}`,
  20: `900 20px ${FONT_FAMILY}`,
  24: `900 24px ${FONT_FAMILY}`,
};

export class FloatingText {
  constructor() {
    this.reset();
  }

  reset() {
    this.x = 0;
    this.y = 0;
    this.text = '';
    this.color = '#fff';
    this.size = 14;
    this.life = 0;
    this.maxLife = 30;
    this.vy = -1.5;
    this.isCrit = false;
    this.active = false;
    this.scale = 1;
  }

  init(x, y, text, type = 'normal') {
    this.x = x + (Math.random() - 0.5) * 14;
    this.y = y - 10 + (Math.random() - 0.5) * 6;
    this.text = text;
    this.life = 28;
    this.maxLife = 28;
    this.vy = -1.8;
    this.isCrit = false;
    this.scale = 1;
    this.active = true;

    switch (type) {
      case 'crit':
        this.color = '#ffd700';
        this.size = 20;
        this.isCrit = true;
        this.vy = -2.2;
        this.scale = 1.25;
        break;
      case 'holy':
        this.color = '#fff275';
        this.size = 15;
        break;
      case 'fel':
        this.color = '#2ecc71';
        this.size = 15;
        break;
      case 'shadow':
        this.color = '#d6a2e8';
        this.size = 15;
        break;
      case 'heal':
        this.color = '#2ecc71';
        this.size = 15;
        this.text = `+${text}`;
        break;
      case 'dodge':
        this.color = '#dfe6e9';
        this.size = 15;
        this.text = '闪避!';
        break;
      default:
        this.color = '#ffffff';
        this.size = 14;
        break;
    }
  }

  update() {
    if (!this.active) return;

    this.y += this.vy;
    this.vy *= 0.93;
    this.life--;

    if (this.isCrit && this.scale > 1) {
      this.scale -= 0.02;
    }

    if (this.life <= 0) {
      this.active = false;
    }
  }

  render(ctx) {
    if (!this.active) return;
    if (this.x < -30 || this.x > SCREEN_WIDTH + 30 || this.y < -30 || this.y > SCREEN_HEIGHT + 30) return;

    const alpha = Math.min(1, this.life / (this.maxLife * 0.35));
    ctx.save();
    ctx.globalAlpha = Math.max(0, alpha);

    const fontKey = this.isCrit ? (this.scale > 1.1 ? 24 : 20) : this.size;
    ctx.font = FONT_CACHE[fontKey] || `bold ${fontKey}px ${FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (this.isCrit) {
      // 仅大暴击使用金色描边加强威慑
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.strokeText(this.text, this.x, this.y);
      ctx.fillStyle = this.color;
      ctx.fillText(this.text, this.x, this.y);
    } else {
      // 普通伤害使用高速位移阴影 (黑色底字 + 彩色亮字)，零 strokeText 矢量栅格化开销，字迹极为锐利清晰
      ctx.fillStyle = '#000000';
      ctx.fillText(this.text, this.x + 1, this.y + 1);
      ctx.fillStyle = this.color;
      ctx.fillText(this.text, this.x, this.y);
    }

    ctx.restore();
  }
}

export class FloatingTextManager {
  constructor() {
    this.pool = [];
    this.activeTexts = [];
    for (let i = 0; i < 24; i++) {
      this.pool.push(new FloatingText());
    }
  }

  add(x, y, text, type = 'normal') {
    let t = this.pool.pop();
    if (!t) {
      if (this.activeTexts.length > 20) {
        // 限制同屏飘字上限为 20，避免割草时成百上千数字阻塞手机渲染管线
        t = this.activeTexts.shift();
      } else {
        t = new FloatingText();
      }
    }
    t.init(x, y, text, type);
    this.activeTexts.push(t);
  }

  update() {
    for (let i = this.activeTexts.length - 1; i >= 0; i--) {
      const t = this.activeTexts[i];
      t.update();
      if (!t.active) {
        const last = this.activeTexts.pop();
        if (i < this.activeTexts.length) {
          this.activeTexts[i] = last;
        }
        this.pool.push(t);
      }
    }
  }

  render(ctx) {
    for (let i = 0; i < this.activeTexts.length; i++) {
      this.activeTexts[i].render(ctx);
    }
  }

  clear() {
    while (this.activeTexts.length > 0) {
      const t = this.activeTexts.pop();
      t.reset();
      this.pool.push(t);
    }
  }
}
