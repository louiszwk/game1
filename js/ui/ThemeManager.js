/**
 * UI 主题配置中心 (Theme Manager)
 *
 * 集中管理配色/风格，支持切换「可爱 / 暗黑」两种主题。
 * 渲染层不再直接写字面颜色，改为 theme.getColor('primary') 等。
 * 切换主题时抛出 'theme:change' 事件触发重绘。
 *
 * 视觉解耦目标：主题与业务逻辑彻底分离，改配色只改这里。
 */
import TinyEmitter from '../libs/tinyemitter';

export const THEMES = {
  cute: {
    id: 'cute',
    name: '可爱卡通',
    // 全局基调
    bg: '#262038',        // 背景主色
    bgGrad: ['#262038', '#1a1630'], // 背景径向渐变
    // 核心色板
    colors: {
      primary: '#ff7a7a',      // 主色（珊瑚粉）
      accent: '#ffd66b',       // 强调色（奶白金）
      success: '#6ee06a',      // 薄荷绿
      danger: '#ff8a80',       // 柔和红
      info: '#5fd0c8',         // 青（可爱辅助色）
      purple: '#a58bff',       // 薰衣草紫
      softPrimary: '#ffb3a0',  // 浅珊瑚（选中态/高亮）
      panelBorder: '#ffb84d',  // 面板描边（暖橙）
      text: '#ffffff',         // 主文字
      textMuted: '#b0b6c8',    // 次要文字
      panel: 'rgba(25, 30, 42, 0.9)', // 面板底
    },
    // 造型语言
    rounded: 18,           // 大圆角（可爱）
    lineWidth: 2,
    // 粒子形状
    particleShape: 'star', // star/bubble/circle
    font: "'PingFang SC', 'Microsoft YaHei', sans-serif",
  },
  dark: {
    id: 'dark',
    name: '暗黑魔兽',
    bg: '#0b0c10',
    bgGrad: ['#1c202a', '#0b0c10'],
    colors: {
      primary: '#c0392b',      // 血红
      accent: '#f1c40f',       // 暗金
      success: '#2ecc71',      // 邪能绿
      danger: '#e74c3c',       // 深红
      info: '#3498db',         // 深蓝
      purple: '#9b59b6',       // 暗紫
      softPrimary: '#e74c3c',  // 深红（选中态/高亮）
      panelBorder: '#c0392b',  // 血红描边
      text: '#dfe6e9',
      textMuted: '#95a5a6',
      panel: 'rgba(10, 12, 18, 0.92)',
    },
    rounded: 6,            // 小圆角（冷峻）
    lineWidth: 2.4,
    particleShape: 'spark',
    font: "'PingFang SC', 'Microsoft YaHei', sans-serif",
  },
};

export default class ThemeManager extends TinyEmitter {
  constructor() {
    super();
    // 默认暗黑魔兽风格 (可爱风格已弃用，仅保留主题配置)
    this.current = THEMES.dark;
  }

  setTheme(id) {
    if (!THEMES[id]) return;
    this.current = THEMES[id];
    this.emit('theme:change', this.current);
  }

  getTheme() {
    return this.current;
  }

  get(key) {
    return this.current[key];
  }

  getColor(key) {
    return this.current.colors[key];
  }

  /**
   * 便捷方法：返回带透明度的主色
   */
  getColorAlpha(key, alpha) {
    const c = this.current.colors[key];
    if (!c) return 'rgba(255,255,255,' + alpha + ')';
    // 支持 '#rrggbb' 转 rgba
    if (c.startsWith('#')) {
      const hex = c.slice(1);
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    return c;
  }
}

// 全局单例
export const themeManager = new ThemeManager();
