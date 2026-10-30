/**
 * 虚拟摇杆与触控输入系统
 * 支持动态触控定位与 360° 丝滑走位，并防止与升级/选人 UI 发生触控冲突
 */

export default class Joystick {
  constructor() {
    this.active = false;
    this.startX = 0;
    this.startY = 0;
    this.currentX = 0;
    this.currentY = 0;
    this.radius = 55; // 摇杆基座半径
    this.stickRadius = 24; // 摇杆中心球半径

    this.dirX = 0; // 归一化 X 方向 (-1 ~ 1)
    this.dirY = 0; // 归一化 Y 方向 (-1 ~ 1)
    this.intensity = 0; // 推动幅度 (0 ~ 1)

    this.touchId = null;
    this.bindEvents();
  }

  reset() {
    this.active = false;
    this.touchId = null;
    this.dirX = 0;
    this.dirY = 0;
    this.intensity = 0;
  }

  bindEvents() {
    wx.onTouchStart((e) => {
      // 仅在战斗中响应摇杆
      if (!GameGlobal.databus || GameGlobal.databus.state !== 'PLAYING') {
        this.reset();
        return;
      }

      if (this.touchId !== null) return;
      const touch = e.touches[0];
      if (!touch) return;

      this.touchId = touch.identifier !== undefined ? touch.identifier : 0;
      this.active = true;
      this.startX = touch.clientX;
      this.startY = touch.clientY;
      this.currentX = touch.clientX;
      this.currentY = touch.clientY;
      this.dirX = 0;
      this.dirY = 0;
      this.intensity = 0;
    });

    wx.onTouchMove((e) => {
      if (!GameGlobal.databus || GameGlobal.databus.state !== 'PLAYING') {
        this.reset();
        return;
      }
      if (!this.active) return;

      let touch = null;
      for (let i = 0; i < e.touches.length; i++) {
        if (e.touches[i].identifier === this.touchId || this.touchId === 0) {
          touch = e.touches[i];
          break;
        }
      }
      if (!touch && e.touches[0]) touch = e.touches[0];
      if (!touch) return;

      const dx = touch.clientX - this.startX;
      const dy = touch.clientY - this.startY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist === 0) {
        this.dirX = 0;
        this.dirY = 0;
        this.intensity = 0;
        this.currentX = this.startX;
        this.currentY = this.startY;
      } else {
        this.dirX = dx / dist;
        this.dirY = dy / dist;

        // 1. 动态浮动基座跟随：手指超出半径时，基座沿法线平滑滑动跟随，换向零死区零延迟
        if (dist > this.radius) {
          this.startX = touch.clientX - this.dirX * this.radius;
          this.startY = touch.clientY - this.dirY * this.radius;
          this.currentX = touch.clientX;
          this.currentY = touch.clientY;
          this.intensity = 1.0;
        } else {
          this.currentX = this.startX + dx;
          this.currentY = this.startY + dy;
          // 2. 非线性动力加速曲线：轻推即可获得充沛动力，迅速提速跟手
          this.intensity = Math.min(1.0, (dist / this.radius) * 1.25);
        }
      }
    });

    const resetTouch = () => {
      this.reset();
    };

    if (typeof wx !== 'undefined') {
      if (wx.onTouchEnd) wx.onTouchEnd(resetTouch);
      if (wx.onTouchCancel) wx.onTouchCancel(resetTouch);
    }
  }

  render(ctx) {
    if (!this.active) return;

    ctx.save();
    // 绘制外圈基座
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.45)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(this.startX, this.startY, this.radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = 'rgba(20, 20, 30, 0.35)';
    ctx.fill();

    // 绘制内指示点
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(this.startX, this.startY, this.radius * 0.5, 0, Math.PI * 2);
    ctx.stroke();

    // 绘制连接线
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(this.startX, this.startY);
    ctx.lineTo(this.currentX, this.currentY);
    ctx.stroke();

    // 绘制摇杆头 (纯净矢量层次，彻底移除 shadowBlur 渲染阻塞)
    // 1. 外部光能微环
    ctx.strokeStyle = 'rgba(243, 156, 18, 0.45)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(this.currentX, this.currentY, this.stickRadius + 2, 0, Math.PI * 2);
    ctx.stroke();

    // 2. 摇杆头底球
    ctx.fillStyle = '#d35400';
    ctx.beginPath();
    ctx.arc(this.currentX, this.currentY, this.stickRadius, 0, Math.PI * 2);
    ctx.fill();

    // 3. 顶部金色高光区
    ctx.fillStyle = '#f1c40f';
    ctx.beginPath();
    ctx.arc(this.currentX - 2, this.currentY - 2, this.stickRadius * 0.65, 0, Math.PI * 2);
    ctx.fill();

    // 4. 中心白钻亮点
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(this.currentX - 4, this.currentY - 4, this.stickRadius * 0.25, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
