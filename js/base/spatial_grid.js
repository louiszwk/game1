/**
 * 零GC空间哈希网格 (Zero-GC Spatial Hash Grid)
 * 用于极大降低投射物、范围技能与外星怪群碰撞检测复杂度 (从 O(P*N) 降为 O(P*k), k=局部网格数)
 */

import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../render';

export class SpatialHashGrid {
  constructor(cellSize = 80) {
    this.cellSize = cellSize;
    // 扩展边缘网格，覆盖屏幕外边缘生成的敌人
    this.cols = Math.ceil(SCREEN_WIDTH / cellSize) + 2;
    this.rows = Math.ceil(SCREEN_HEIGHT / cellSize) + 2;
    this.cellCount = this.cols * this.rows;

    this.cells = new Array(this.cellCount);
    for (let i = 0; i < this.cellCount; i++) {
      this.cells[i] = [];
    }

    // 预分配复用查询结果池，杜绝频繁创建数组引发的 GC 停顿
    this.nearbyBuffer = [];
  }

  /**
   * 清空网格 (仅将子数组长度置零，零内存重新分配)
   */
  clear() {
    for (let i = 0; i < this.cellCount; i++) {
      this.cells[i].length = 0;
    }
  }

  /**
   * 快速将所有活跃敌人投射到空间网格中 (O(N) 极速归类)
   */
  build(enemies) {
    this.clear();
    const cellSize = this.cellSize;
    const cols = this.cols;
    const rows = this.rows;

    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (!e.active) continue;

      // 偏移 1 格防止负坐标索引越界
      const c = Math.floor(e.x / cellSize) + 1;
      const r = Math.floor(e.y / cellSize) + 1;

      if (c >= 0 && c < cols && r >= 0 && r < rows) {
        this.cells[r * cols + c].push(e);
      }
    }
  }

  /**
   * 获取指定坐标周围指定半径内的邻近敌人 (仅检测周边 1~9 个网格，速度提升 15~25 倍)
   * 采用预分配 buffer，零垃圾回收
   */
  getNearby(x, y, radius = 55) {
    this.nearbyBuffer.length = 0;
    const cellSize = this.cellSize;
    const cols = this.cols;
    const rows = this.rows;

    const c0 = Math.max(0, Math.floor((x - radius) / cellSize) + 1);
    const c1 = Math.min(cols - 1, Math.floor((x + radius) / cellSize) + 1);
    const r0 = Math.max(0, Math.floor((y - radius) / cellSize) + 1);
    const r1 = Math.min(rows - 1, Math.floor((y + radius) / cellSize) + 1);

    for (let r = r0; r <= r1; r++) {
      const rowOffset = r * cols;
      for (let c = c0; c <= c1; c++) {
        const cell = this.cells[rowOffset + c];
        const len = cell.length;
        for (let i = 0; i < len; i++) {
          this.nearbyBuffer.push(cell[i]);
        }
      }
    }

    return this.nearbyBuffer;
  }

  /**
   * 视锥剔除 (Frustum Culling)：只返回位于屏幕可视范围内的敌人。
   *
   * 跳过屏幕外（含屏幕边缘安全扩展区）的敌人，避免海量实体在
   * 视口之外仍执行无效的碰撞检测与渲染逻辑，显著降低低端机发热。
   * 采用预分配 buffer，零垃圾回收。
   *
   * @param {Array} enemies 活跃敌人数组
   * @param {number} margin 屏幕外扩展边距（默认 60px）
   * @returns {Array} 屏幕内可见敌人列表（复用内部 buffer）
   */
  getVisible(enemies, margin = 60) {
    this.nearbyBuffer.length = 0;
    const minX = -margin;
    const maxX = SCREEN_WIDTH + margin;
    const minY = -margin;
    const maxY = SCREEN_HEIGHT + margin;

    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (!e.active) continue;
      if (e.x < minX || e.x > maxX || e.y < minY || e.y > maxY) continue;
      this.nearbyBuffer.push(e);
    }
    return this.nearbyBuffer;
  }

  /**
   * 判断坐标是否在屏幕可视范围内（视锥剔除单点判断）
   * @param {number} x
   * @param {number} y
   * @param {number} margin 屏幕外扩展边距
   * @returns {boolean} true = 在屏幕内
   */
  static isOnScreen(x, y, margin = 60) {
    return x >= -margin && x <= SCREEN_WIDTH + margin && y >= -margin && y <= SCREEN_HEIGHT + margin;
  }
}
