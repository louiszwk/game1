import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../render';
import { EQUIPMENT_SLOTS } from '../equipment/equipment_data';

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
    this.type = 'exp'; // 'exp', 'meat', 'magnet', 'equipment'
    this.equipmentData = null;
    this.color = '#3498db';
    this.lightColor = '#70a1ff';
    this.size = 5;
    this.active = false;
    this.speed = 0;
    this.maxSpeed = 12;
    this.pulse = Math.random() * Math.PI * 2;
    this.forceMagnet = false;
  }

  init(x, y, value = 1, type = 'exp', equipmentData = null) {
    this.x = x;
    this.y = y;
    this.value = value;
    this.type = type;
    this.equipmentData = equipmentData;
    this.active = true;
    this.speed = 0;
    this.pulse = Math.random() * Math.PI * 2;
    this.forceMagnet = false;

    if (type === 'meat') {
      this.color = '#e74c3c';
      this.lightColor = '#e74c3c';
      this.size = 8;
    } else if (type === 'magnet') {
      this.color = '#f1c40f';
      this.lightColor = '#f39c12';
      this.size = 8;
    } else if (type === 'equipment') {
      const rarity = (equipmentData && equipmentData.rarity) ? equipmentData.rarity : null;
      this.color = (rarity && rarity.color) ? rarity.color : '#ffd700';
      this.lightColor = '#ffffff';
      this.size = 11;
    } else {
      this.updateVisuals();
    }
  }

  updateVisuals() {
    if (this.type !== 'exp') return;
    if (this.value >= 15) {
      this.color = '#f1c40f'; // 金色大魂石
      this.lightColor = '#fff2b0';
      this.size = 7.2;
    } else if (this.value >= 5) {
      this.color = '#8e44ad'; // 紫色中魂石
      this.lightColor = '#d6c6ff';
      this.size = 5.8;
    } else {
      this.color = '#a5e8ff'; // 蓝色初级灵魂
      this.lightColor = '#d6f5ff';
      this.size = 4.2;
    }
  }

  update(player) {
    if (!this.active) return false;

    this.pulse += 0.08;

    const dx = player.x - this.x;
    const dy = player.y - this.y;
    const distSq = dx * dx + dy * dy;

    // 处于玩家磁吸范围内，或受到全图聚灵强磁场吸引，加速飞向玩家
    const magnetRange = player.magnetRadius;
    if (this.forceMagnet || distSq < magnetRange * magnetRange) {
      const dist = Math.sqrt(distSq) || 1;
      this.speed = Math.min(this.maxSpeed, this.speed + (this.forceMagnet ? 1.5 : 0.85));
      this.x += (dx / dist) * this.speed;
      this.y += (dy / dist) * this.speed;

      // 拾取判定
      const pickDist = player.width * 0.45 + this.size;
      if (distSq < pickDist * pickDist) {
        this.active = false;
        this.forceMagnet = false;
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
      // 🍖 烤肉补给 (圆润可爱小肉球)
      ctx.fillStyle = 'rgba(255, 138, 128, 0.28)';
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
      ctx.fillStyle = 'rgba(255, 214, 107, 0.28)';
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
    } else if (this.type === 'equipment') {
      // 🛡️ 装备宝箱/图腾掉落物 (纯矢量绘制，零贴图，稀有度发光)
      const isLegend = this.equipmentData && this.equipmentData.rarity && this.equipmentData.rarity.rank === 5;
      const slotDef = (this.equipmentData && EQUIPMENT_SLOTS[this.equipmentData.slotKey]) ? EQUIPMENT_SLOTS[this.equipmentData.slotKey] : null;
      const icon = (slotDef && slotDef.icon) ? slotDef.icon : '🛡️';

      // 1. 外层稀有度呼吸光晕
      ctx.fillStyle = this.color;
      ctx.globalAlpha = 0.32 + Math.sin(this.pulse * 2) * 0.16;
      ctx.beginPath();
      ctx.arc(this.x, this.y, currentSize + (isLegend ? 7 : 4), 0, Math.PI * 2);
      ctx.fill();

      // 传说装备独占外层旋转光芒
      if (isLegend) {
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 1.8;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.arc(this.x, this.y, currentSize + 8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // 2. 宝箱底座
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = '#141822';
      ctx.beginPath();
      ctx.arc(this.x, this.y, currentSize, 0, Math.PI * 2);
      ctx.fill();

      // 3. 稀有度高光描边
      ctx.strokeStyle = this.color;
      ctx.lineWidth = isLegend ? 2.5 : 1.8;
      ctx.beginPath();
      ctx.arc(this.x, this.y, currentSize, 0, Math.PI * 2);
      ctx.stroke();

      // 4. 部位 Emoji 图标
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(icon, this.x, this.y);
    } else {
      // 💎 圆润晶莹的糖果能量珠 (圆润可爱，非锋利菱形水晶)
      // 1. 外层能量柔光圈
      ctx.fillStyle = this.color;
      ctx.globalAlpha = 0.25;
      ctx.beginPath();
      ctx.arc(this.x, this.y, currentSize * 1.5, 0, Math.PI * 2);
      ctx.fill();

      // 2. 圆润能量珠本体
      ctx.globalAlpha = 1.0;
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, currentSize, 0, Math.PI * 2);
      ctx.fill();

      // 3. 晶面高光 (圆润左上高光，呈现立体感)
      ctx.fillStyle = this.lightColor;
      ctx.beginPath();
      ctx.arc(this.x - currentSize * 0.3, this.y - currentSize * 0.3, currentSize * 0.5, 0, Math.PI * 2);
      ctx.fill();

      // 4. 核心白星
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
    // 1. 掉落物视口边缘自动聚拢 (Screen Clamping)：杜绝屏幕外杀怪导致经验球落在视野盲区
    const clampedX = Math.max(22, Math.min(SCREEN_WIDTH - 22, x));
    const clampedY = Math.max(22, Math.min(SCREEN_HEIGHT - 22, y));

    let gem = this.pool.pop();
    if (!gem) {
      if (this.gems.length > 150) {
        // 幸存者级大魂石凝聚机制：绝不粗暴丢弃经验，而是将最老经验球回收，其价值100%合并进另一颗宝石！
        gem = this._recycleAndMergeExp(value);
      } else {
        gem = new Gem();
      }
    }
    gem.init(clampedX, clampedY, value, type);
    this.gems.push(gem);
  }

  /**
   * 生成装备掉落物 (装备绝对防吞保护)
   */
  spawnEquipment(x, y, equipmentData) {
    const clampedX = Math.max(24, Math.min(SCREEN_WIDTH - 24, x));
    const clampedY = Math.max(24, Math.min(SCREEN_HEIGHT - 24, y));

    let gem = this.pool.pop();
    if (!gem) {
      if (this.gems.length > 150) {
        // 装备拥有绝对优先级，通过凝聚合并普通经验球腾出空位，装备绝不会被挤爆丢弃！
        gem = this._recycleAndMergeExp(0);
      } else {
        gem = new Gem();
      }
    }
    gem.init(clampedX, clampedY, 1, 'equipment', equipmentData);
    this.gems.push(gem);
  }

  /**
   * 幸存者级大魂石凝聚回收机制：回收最老的普通经验球，将其价值 100% 注入现存宝石，永不损失一分经验
   */
  _recycleAndMergeExp(incomingValue = 0) {
    let recycleIndex = -1;
    for (let i = 0; i < this.gems.length; i++) {
      // 装备、烤肉、磁铁等特殊掉落物享有绝对豁免权，绝不回收
      if (this.gems[i].type === 'exp') {
        recycleIndex = i;
        break;
      }
    }

    if (recycleIndex === -1) {
      return new Gem();
    }

    const recycledGem = this.gems.splice(recycleIndex, 1)[0];
    const expToMerge = recycledGem.value;

    // 将被回收的经验值 100% 累加进场上现存的另一颗经验球
    if (expToMerge > 0) {
      for (let i = this.gems.length - 1; i >= 0; i--) {
        if (this.gems[i].type === 'exp' && this.gems[i].active) {
          this.gems[i].value += expToMerge;
          this.gems[i].updateVisuals();
          break;
        }
      }
    }

    recycledGem.reset();
    return recycledGem;
  }

  /**
   * 局部战利品雷磁牵引 (萨满雷暴/闪电链弹射时对周围掉落物施加电磁吸力)
   */
  pullGemsNear(x, y, radius = 140) {
    const rSq = radius * radius;
    for (let i = 0; i < this.gems.length; i++) {
      const g = this.gems[i];
      if (!g.active) continue;
      const dx = g.x - x;
      const dy = g.y - y;
      if (dx * dx + dy * dy < rSq) {
        g.forceMagnet = true;
        g.speed = Math.max(g.speed, 6.5);
      }
    }
  }

  /**
   * 全图吸取（拾取磁铁掉落物时触发）
   */
  magnetAll(player) {
    for (let i = 0; i < this.gems.length; i++) {
      if (this.gems[i].active) {
        this.gems[i].forceMagnet = true;
        this.gems[i].speed = Math.max(this.gems[i].speed, 8);
      }
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
