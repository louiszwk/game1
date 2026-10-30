// 获取微信窗口信息
const windowInfo = (typeof wx !== 'undefined' && wx.getWindowInfo)
  ? wx.getWindowInfo()
  : ((typeof wx !== 'undefined' && wx.getSystemInfoSync)
    ? wx.getSystemInfoSync()
    : { windowWidth: 375, windowHeight: 667, screenWidth: 375, screenHeight: 667, pixelRatio: 2 });

// 锁定 60 FPS 刷新率，杜绝 120Hz/90Hz 高刷屏下的过载发热与暴走跑电
if (typeof wx !== 'undefined' && wx.setPreferredFramesPerSecond) {
  try {
    wx.setPreferredFramesPerSecond(60);
  } catch (e) {}
}

// 黄金能效画质比：移动端 1.6 DPR 已达 300+ PPI 视网膜清晰度，相比 2.0 DPR 大幅降低 36% 的显存带宽与像素填充发热
export const DPR = Math.min(windowInfo.pixelRatio || 1.5, 1.6);
export const SCREEN_WIDTH = windowInfo.windowWidth || windowInfo.screenWidth || 375;
export const SCREEN_HEIGHT = windowInfo.windowHeight || windowInfo.screenHeight || 667;

// 确保全局 GameGlobal.canvas 实例化（这是微信小游戏必备的全局主屏Canvas）
if (typeof GameGlobal !== 'undefined') {
  if (!GameGlobal.canvas && typeof wx !== 'undefined' && wx.createCanvas) {
    GameGlobal.canvas = wx.createCanvas();
  }
}

// 导出主屏幕 canvas 引用
export const canvas = (typeof GameGlobal !== 'undefined' && GameGlobal.canvas)
  ? GameGlobal.canvas
  : ((typeof window !== 'undefined' && window.canvas)
    ? window.canvas
    : (typeof wx !== 'undefined' && wx.createCanvas ? wx.createCanvas() : null));

// 设置物理像素分辨率 (以最佳 2.0 高清视网膜分辨率渲染)
if (canvas) {
  canvas.width = Math.round(SCREEN_WIDTH * DPR);
  canvas.height = Math.round(SCREEN_HEIGHT * DPR);
}