import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../render';

/**
 * 战利品与灵魂碎片系统 (EXP & Drops)
 * 极致性能优化：彻底移除高发热 shadowBlur，增加屏幕视口剔除与多棱面高清宝石渲染
 */

export class Gem {
  constructor() {
    this.reset();
  }

  reset() {
    this.x = 0;
    this.y = 0;
    this.value = 1;
    this.type = 'exp'; // 'exp', 'meat', 'magnet'
    this.color = '#3498db';
    this.lightColor = '#70a1ff';
    this.size = 5;
    this.active = false;
    this.speed = 0;
    this.maxSpeed = 12;
    this.pulse = Math.random() * Math.PI * 2;
  }

  init(x, y, value = 1, type = 'exp') {
    this.x = x;
    this.y = y;
    this.value = value;
    this.type = type;
    this.active = true;
    this.speed = 0;
    this.pulse = Math.random() * Math.PI * 2;

    if (type === 'meat') {
      this.color = '#e74c3c';
      this.lightColor = '#ff7675';
      this.size = 8;
    } else if (type === 'magnet') {
      this.color = '#f1c40f';
      this.lightColor = '#ffeaa7';
      this.size = 8;
    } else {
      if (value >= 15) {
        this.color = '#f1c40f'; // 金色大魂石
        this.lightColor = '#fff275';
        this.size = 6.5;
      } else if (value >= 5) {
        this.color = '#9b59b6'; // 紫色中魂石
        this.lightColor = '#d6a2e8';
        this.size = 5.5;
      } else {
        this.color = '#0984e3'; // 蓝色初级灵魂
        this.lightColor = '#74b9ff';
        this.size = 4.2;
      }
    }
  }

  update(player) {
    if (!this.active) return false;

    this.pulse += 0.08;

    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const distSq = dx * dx + dy * dy;

    // 处于玩家磁吸范围内，加速飞向玩家
    const magnetRange = player.magnetRadius;
    if (distSq < magnetRange * magnetRange) {
      const dist = Math.sqrt(distSq) || 1;
      this.speed = Math.min(this.maxSpeed, this.speed + 0.85);
      this.x += (dx / dist) * this.speed;
      this.y += (dy / dist) * this.speed;

      // 拾取判定
      const pickDist = player.width * 0.45 + this.size;
      if (distSq < pickDist * pickDist) {
        this.active = false;
        return true; // 表示被拾取
      }
    }

    return false;
  }

  render(ctx) {
    if (!this.active) return;

    // 屏幕视口剔除：完全不在屏幕内的掉落物零消耗跳过绘制
    if (this.x < -15 || this.x > SCREEN_WIDTH + 15 || this.y < -15 || this.y > SCREEN_HEIGHT + 15) {
      return;
    }

    ctx.save();
    const currentSize = this.size + Math.sin(this.pulse) * 0.6;

    if (this.type === 'meat') {
      // 🍖 烤肉补给
      ctx.fillStyle = 'rgba(231, 76, 60, 0.28)';
      ctx.beginPath();
      ctx.arc(this.x, this.y, currentSize + 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#e74c3c';
      ctx.beginPath();
      ctx.arc(this.x, this.y, currentSize, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🍖', this.x, this.y);
    } else if (this.type === 'magnet') {
      // 🧲 全图磁石
      ctx.fillStyle = 'rgba(241, 196, 15, 0.28)';
      ctx.beginPath();
      ctx.arc(this.x, this.y, currentSize + 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#f1c40f';
      ctx.beginPath();
      ctx.arc(this.x, this.y, currentSize, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🧲', this.x, this.y);
    } else {
      // 💎 极致晶莹的高清多面灵魂水晶 (完全告别昂贵的 shadowBlur，呈现更剔透锋利的美学)
      // 1. 水晶外层能量柔光圈
      ctx.fillStyle = this.color;
      ctx.globalAlpha = 0.25;
      ctx.beginPath();
      ctx.arc(this.x, this.y, currentSize * 1.5, 0, Math.PI * 2);
      ctx.fill();

      // 2. 水晶主菱形本体
      ctx.globalAlpha = 1.0;
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y - currentSize);
      ctx.lineTo(this.x + currentSize * 0.75, this.y);
      ctx.lineTo(this.x, this.y + currentSize);
      ctx.lineTo(this.x - currentSize * 0.75, this.y);
      ctx.closePath();
      ctx.fill();

      // 3. 晶面高光切面 (左半晶面反光，呈现立体折射感)
      ctx.fillStyle = this.lightColor;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y - currentSize);
      ctx.lineTo(this.x, this.y + currentSize);
      ctx.lineTo(this.x - currentSize * 0.75, this.y);
      ctx.closePath();
      ctx.fill();

      // 4. 水晶棱心闪烁白星
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(this.x, this.y, currentSize * 0.32, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}

export class GemManager {
  constructor() {
    this.gems = [];
    this.pool = [];
    for (let i = 0; i < 120; i++) {
      this.pool.push(new Gem());
    }
  }

  spawn(x, y, value = 1, type = 'exp') {
    let gem = this.pool.pop();
    if (!gem) {
      if (this.gems.length > 150) {
        // 超过上限则循环回收最早掉落物，防止数量过多挤压内存
        gem = this.gems.shift();
      } else {
        gem = new Gem();
      }
    }
    gem.init(x, y, value, type);
    this.gems.push(gem);
  }

  /**
   * 全图吸取（拾取磁铁掉落物时触发）
   */
  magnetAll(player) {
    for (let i = 0; i < this.gems.length; i++) {
      this.gems[i].speed = 10;
    }
  }

  update(player, onCollect) {
    for (let i = this.gems.length - 1; i >= 0; i--) {
      const gem = this.gems[i];
      const collected = gem.update(player);
      if (collected) {
        onCollect(gem);
        // 高性能 Swap-and-Pop 移除，彻底消除 splice 数组内存平移复制与 GC 抖动
        const last = this.gems.pop();
        if (i < this.gems.length) {
          this.gems[i] = last;
        }
        this.pool.push(gem);
      }
    }
  }

  render(ctx) {
    for (let i = 0; i < this.gems.length; i++) {
      this.gems[i].render(ctx);
    }
  }

  clear() {
    while (this.gems.length > 0) {
      const g = this.gems.pop();
      g.reset();
      this.pool.push(g);
    }
  }
}
