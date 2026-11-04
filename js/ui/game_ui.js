/**
 * 魔兽动物肉鸽 - 高清精品游戏UI系统
 * 包含：精致选人界面、奢华角色战斗HUD、命运三选一卡片面板、结算界面
 */

import Emitter from '../libs/tinyemitter';
import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../render';
import { RACES, CLASSES, SKILLS, CATEGORY_MAP, ELEMENT_MAP } from '../skills/skill_data';
import { HeroImages, ClassImages, getUIPreviewImage } from '../runtime/assets';
import { themeManager } from './ThemeManager';
import { ACHIEVEMENTS } from '../runtime/achievementManager';
import { EQUIPMENT_SLOTS, SLOT_KEYS, RARITIES } from '../equipment/equipment_data';

const FONT_FAMILY = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif';

// 颜色 token 映射：把 UI 里的主题色 token 映射到 ThemeManager 的两种主题
// cute 主题下这些 token 指向珊瑚粉/奶白金等糖果色，dark 主题下指向血红/暗金等
const THEME_TOKEN_MAP = {
  primary: '#ff7a7a',      // 珊瑚粉 → 血红
  accent: '#ffd66b',       // 奶白金 → 暗金
  panelBorder: '#ffb84d',  // 暖橙描边 → 血红描边
  softPrimary: '#ffb3a0',  // 浅珊瑚 → 深红
  success: '#6ee06a',      // 薄荷绿 → 邪能绿
  danger: '#ff6b6b',       // 柔和红 → 深红
  info: '#5fd0c8',         // 青 → 深蓝
};

export default class GameUI extends Emitter {
  constructor() {
    super();

    // 默认选定角色
    this.selectedRaceId = 'chicken';
    this.selectedClassId = 'warrior';

    // 选人交互阶段：'RACE' (选种族) | 'CLASS' (选职业)
    this.selectStep = 'RACE';

    // 成就面板状态
    this.showAchievements = false;
    this.achievementBtnArea = null;   // 选人界面「成就」入口按钮
    this.achievementCloseArea = null; // 成就面板关闭按钮
    this.achievementScroll = 0;       // 成就列表滚动偏移

    // 交互热区
    this.raceClickAreas = [];
    this.classClickAreas = [];
    this.confirmRaceBtnArea = null;
    this.backToRaceBtnArea = null;
    this.startBtnArea = null;
    this.upgradeCardAreas = [];
    this.restartBtnArea = null;
    this.retryBtnArea = null; // 右下角重新挑战按钮
    this.levelUpOpenTime = 0; // 防误触时间戳
    this.waveAlert = null;    // 波次预警横幅
    this.currentWave = 0;     // 常驻显示的当前波次

    // 装备面板状态与热区
    this.showEquipmentSheet = false;
    this.equipBtnArea = null;
    this.equipCloseArea = null;
    this.equipSheetBounds = null;
    this.selectedEquipSlot = 'main_hand';
    this.equipSlotAreas = [];
    this.hudAvatarArea = null;
    this.silhouetteArea = null;
    this.hudStatsArea = null;

    // 升级三选一选项
    this.upgradeChoices = [];
    this.animPulse = 0;

    // 选人界面「星球大战」背景图
    this.selectBgImg = null;
    this.selectBgLoaded = false;
    try {
      if (typeof wx !== 'undefined' && wx.createImage) {
        this.selectBgImg = wx.createImage();
        this.selectBgImg.onload = () => { this.selectBgLoaded = true; };
        this.selectBgImg.onerror = () => { this.selectBgLoaded = false; };
        this.selectBgImg.src = 'images/earth_invasion_bg.jpg';
      }
    } catch (e) {
      this.selectBgLoaded = false;
    }

    // 选人界面动态战斗元素（重点在上半部分）：外星母舰扫描光 / 坠落光束 / 爆炸闪烁
    this.selectScanLights = [];
    for (let i = 0; i < 5; i++) {
      this.selectScanLights.push({
        x: (0.15 + Math.random() * 0.7) * SCREEN_WIDTH,
        y: (0.08 + Math.random() * 0.3) * SCREEN_HEIGHT,
        r: 8 + Math.random() * 14,
        phase: Math.random() * Math.PI * 2,
        speed: 0.03 + Math.random() * 0.04,
      });
    }
    this.selectFallingBeams = [];
    for (let i = 0; i < 8; i++) {
      this.selectFallingBeams.push({
        x: Math.random() * SCREEN_WIDTH,
        y: Math.random() * SCREEN_HEIGHT * 0.4,
        len: 16 + Math.random() * 26,
        speedY: 2.2 + Math.random() * 2.0,
        alpha: 0.4 + Math.random() * 0.4,
        warm: Math.random() > 0.4,
      });
    }
    this.selectExplosions = [];
    for (let i = 0; i < 6; i++) {
      this.selectExplosions.push({
        x: (0.1 + Math.random() * 0.8) * SCREEN_WIDTH,
        y: (0.1 + Math.random() * 0.35) * SCREEN_HEIGHT,
        r: 10 + Math.random() * 18,
        phase: Math.random() * Math.PI * 2,
        speed: 0.04 + Math.random() * 0.05,
      });
    }

    // 触控监听
    wx.onTouchStart(this.handleTouch.bind(this));
    if (wx.onTouchMove) wx.onTouchMove(this.handleTouchMove.bind(this));
    if (wx.onTouchEnd) wx.onTouchEnd(this.handleTouchEnd.bind(this));
  }

  /**
   * 获取当前主题下的颜色 token。
   * 优先从 ThemeManager 读取；若 token 未在主题里定义，回退到 THEME_TOKEN_MAP 的可爱色默认值。
   */
  themeColor(token) {
    const t = themeManager.current;
    if (t.colors && t.colors[token]) return t.colors[token];
    return THEME_TOKEN_MAP[token] || '#ffffff';
  }

  showWaveAlert(waveNum, title) {
    this.waveAlert = { wave: waveNum, title: title, timer: 300, maxTimer: 300 };
    this.currentWave = waveNum; // 常驻左上角的当前波次（5秒横幅结束后持续显示）
    try { wx.vibrateShort({ type: 'heavy' }); } catch (e) {}
  }

  generateUpgradeChoices(learnedSkills, player = null) {
    this.levelUpOpenTime = Date.now(); // 启动 500ms 安全防误触锁
    const allKeys = Object.keys(SKILLS);
    const available = [];

    // 统计当前已掌握的主动技能数量
    // 排除 PASSIVE（通用体魄）与 RACIAL（种族本命，开局自动学习、锁定不可替换）两类，
    // 让 6 个主动槽位真正指向玩家「主动选择」的战斗技能（COMBAT/HOLY/FEL/DEATH/ARCANE）。
    let learnedActiveCount = 0;
    if (learnedSkills) {
      for (const k in learnedSkills) {
        if (!learnedSkills[k] || !SKILLS[k]) continue;
        const cat = SKILLS[k].category;
        if (cat !== 'PASSIVE' && cat !== 'RACIAL') {
          learnedActiveCount++;
        }
      }
    }
    const MAX_ACTIVE_SKILLS = 6;
    const activeSlotsFull = learnedActiveCount >= MAX_ACTIVE_SKILLS;

    allKeys.forEach((key) => {
      const skill = SKILLS[key];
      if (!skill) return;

      // 1. 职业修习禁忌判定 (如：圣骑士禁修邪能/死亡，术士禁修神圣) & 种族专属特技判定
      if (player && typeof player.canLearnSkill === 'function') {
        if (!player.canLearnSkill(key)) return;
      }

      const currentLvl = learnedSkills[key] || 0;
      const isActiveSkill = skill.category !== 'PASSIVE' && skill.category !== 'RACIAL';

      // 2. 6 技能槽位上限：若主动技能栏已满 6 个，严禁学习任何尚未掌握的新主动技能！
      // 只能升级已学的主动技能，或者修习/升级通用被动属性技能 (PASSIVE)
      if (activeSlotsFull && isActiveSkill && currentLvl === 0) {
        return;
      }

      // 3. 最大等级判定 (种族共鸣技能上限可突破至 Lv.6 神话极境！)
      const maxLvl = (player && typeof player.getMaxSkillLevel === 'function')
        ? player.getMaxSkillLevel(key)
        : (skill.maxLevel || 5);

      if (currentLvl < maxLvl) {
        available.push(key);
      }
    });

    // 兜底：如果所有可用技能已全部修至极境满级，直接奖励全面回复并跳过升级弹窗
    if (available.length === 0) {
      if (player && typeof player.heal === 'function') {
        player.heal(Math.round(player.maxHp * 0.35));
      }
      this.upgradeChoices = [];
      if (this.emptyUpgradeTimer) clearTimeout(this.emptyUpgradeTimer);
      this.emptyUpgradeTimer = setTimeout(() => {
        this.emptyUpgradeTimer = null;
        if (GameGlobal.databus && GameGlobal.databus.state === 'LEVEL_UP') {
          this.emit('selectUpgrade', null);
        }
      }, 300);
      return;
    }

    // 随机打乱抽取最多 3 个
    for (let i = available.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [available[i], available[j]] = [available[j], available[i]];
    }

    this.upgradeChoices = available.slice(0, 3).map((id) => {
      const skill = SKILLS[id];
      const curLvl = learnedSkills[id] || 0;
      const nextLvl = curLvl + 1;
      const maxLvl = (player && typeof player.getMaxSkillLevel === 'function')
        ? player.getMaxSkillLevel(id)
        : (skill.maxLevel || 5);
      const isAffinity = player && typeof player.isAffinitySkill === 'function' ? player.isAffinitySkill(id) : false;
      const levelInfo = skill.levels[curLvl] || { name: skill.name, desc: '' };

      const isMythic = nextLvl === 6;
      const isUltimate = nextLvl === 5;

      return {
        id,
        skill,
        curLvl,
        nextLvl,
        maxLvl,
        isAffinity,
        category: skill.category,
        element: skill.element,
        name: levelInfo.name,
        desc: levelInfo.desc,
        isUltimate,
        isMythic,
      };
    });
  }

  // ===================== 绘制核心入口 =====================
  render(ctx, gameState, player, gameData, learnedSkills, equipmentManager = null) {
    this.animPulse += 0.05;

    if (gameState === 'SELECT') {
      this.renderSelectScreen(ctx, player);
    } else if (gameState === 'PLAYING') {
      this.renderHUD(ctx, player, gameData, learnedSkills, equipmentManager);
      if (this.showEquipmentSheet && equipmentManager) {
        this.renderEquipmentSheet(ctx, player, equipmentManager);
      }
    } else if (gameState === 'LEVEL_UP') {
      this.renderHUD(ctx, player, gameData, learnedSkills, equipmentManager);
      if (this.showEquipmentSheet && equipmentManager) {
        this.renderEquipmentSheet(ctx, player, equipmentManager);
      }
      this.renderLevelUpModal(ctx, player);
    } else if (gameState === 'GAME_OVER') {
      this.renderGameOver(ctx, player, gameData, learnedSkills);
    }
  }

  // ===================== 1. 两阶段深度选人系统 (选种族 -> 选职业) =====================

  renderSelectScreen(ctx, player) {
    ctx.save();

    // 成就面板优先渲染（全屏覆盖，查看已做/未做的事）
    if (this.showAchievements) {
      this.renderAchievementsPanel(ctx);
      ctx.restore();
      return;
    }

    // 沉浸式星夜渐变背景 (兜底，星球大战图未加载时显示)
    const bgGrad = ctx.createRadialGradient(
      SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, 40,
      SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, SCREEN_HEIGHT * 0.8
    );
    const themeBg = themeManager.current.bgGrad || ['#1c202a', '#0b0c10'];
    bgGrad.addColorStop(0, themeBg[0]);
    bgGrad.addColorStop(0.5, themeBg[1] || themeBg[0]);
    bgGrad.addColorStop(1, themeBg[1] || themeBg[0]);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

    // 「星球大战」背景图：地球被外星舰队围攻 (上半部分重点展示外星母舰群)
    this.drawSelectBg(ctx);

    // 动态战斗元素：外星母舰扫描光 / 坠落光束 / 爆炸闪烁 (重点在上半部分)
    this.drawSelectBattleFx(ctx);

    // 游戏标题横幅：《动物大战外星人》+ 副标题《家禽勇士》 (占据 1/4~1/2 位置)
    this.renderTitleBanner(ctx);

    // 成就入口按钮（左上角）
    this.renderAchievementBtn(ctx);

    // 根据两步选人流程分屏展示 (种族图库 -> 简介 -> 确认 -> 职业图库 -> 简介 -> 战斗)
    if (this.selectStep === 'RACE') {
      this.renderRaceSelectStep(ctx, player);
    } else {
      this.renderClassSelectStep(ctx, player);
    }

    ctx.restore();
  }

  /**
   * 选人界面「星球大战」背景图 (cover 铺满，上半部分重点展示外星母舰围攻)
   */
  drawSelectBg(ctx) {
    if (!this.selectBgLoaded || !this.selectBgImg || this.selectBgImg.width <= 0) return;
    try {
      const imgAspect = this.selectBgImg.width / this.selectBgImg.height;
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
      ctx.drawImage(this.selectBgImg, drawX, drawY, drawW, drawH);
    } catch (e) {}
  }

  /**
   * 选人界面动态战斗元素：外星母舰扫描光 + 坠落光束 + 爆炸闪烁 (全部聚焦上半部分)
   */
  drawSelectBattleFx(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    // 1. 外星母舰红色扫描光 (上半部分)
    for (let i = 0; i < this.selectScanLights.length; i++) {
      const s = this.selectScanLights[i];
      const a = 0.18 + Math.sin(this.animPulse * s.speed * 30 + s.phase) * 0.14;
      if (a <= 0) continue;
      ctx.globalAlpha = Math.max(0, Math.min(1, a));
      const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r);
      g.addColorStop(0, '#ff4a2a');
      g.addColorStop(1, 'rgba(255, 74, 42, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. 坠落光束 / 陨石火雨 (从上方坠下，聚焦上半部分)
    for (let i = 0; i < this.selectFallingBeams.length; i++) {
      const b = this.selectFallingBeams[i];
      b.y += b.speedY;
      if (b.y - b.len > SCREEN_HEIGHT * 0.55) {
        b.y = -Math.random() * 40;
        b.x = Math.random() * SCREEN_WIDTH;
      }
      ctx.globalAlpha = Math.max(0, Math.min(1, b.alpha));
      const grad = ctx.createLinearGradient(b.x, b.y - b.len, b.x, b.y);
      if (b.warm) {
        grad.addColorStop(0, 'rgba(255, 140, 40, 0)');
        grad.addColorStop(1, 'rgba(255, 190, 80, 0.9)');
      } else {
        grad.addColorStop(0, 'rgba(90, 200, 255, 0)');
        grad.addColorStop(1, 'rgba(140, 220, 255, 0.85)');
      }
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(b.x, b.y - b.len);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      ctx.fillStyle = b.warm ? '#ffd27a' : '#bdeaff';
      ctx.beginPath();
      ctx.arc(b.x, b.y, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. 远处爆炸闪烁 (上半部分，模拟母舰空袭)
    for (let i = 0; i < this.selectExplosions.length; i++) {
      const e = this.selectExplosions[i];
      const a = Math.max(0, Math.sin(this.animPulse * e.speed * 30 + e.phase));
      if (a <= 0.05) continue;
      ctx.globalAlpha = a * 0.6;
      const g = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.r);
      g.addColorStop(0, '#ffd66b');
      g.addColorStop(0.5, '#ff6b2a');
      g.addColorStop(1, 'rgba(255, 60, 20, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  /**
   * 选人界面顶部游戏标题横幅：《动物大战外星人》 + 副标题《家禽勇士》
   * 艺术化处理：逐字错落排布 + 多层描边发光 + 双侧獠牙羽翼装饰线
   */
  renderTitleBanner(ctx) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const cx = SCREEN_WIDTH / 2;

    // 标题字号与基础位置 (更大、占据页面 1/4~1/2 处)
    const titleFontSize = 36;
    const mainY = SCREEN_HEIGHT * 0.26;
    const chars = ['动', '物', '大', '战', '外', '星', '人'];
    // 每个字的上下错落偏移 (打破死板横排，制造动感)
    const yOffsets = [-4, 3, -2, 5, -5, 3, -3];
    // 每个字的字宽估算 (30px 粗体约 32px/字)
    const charW = titleFontSize * 1.06;
    const totalW = chars.length * charW;
    const startX = cx - totalW / 2 + charW / 2;

    ctx.font = `900 ${titleFontSize}px ${FONT_FAMILY}`;

    chars.forEach((ch, i) => {
      const x = startX + i * charW;
      const y = mainY + yOffsets[i];

      // 底部深色厚描边 (多层，形成立体投影)
      ctx.lineWidth = 6;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(10, 4, 18, 0.9)';
      ctx.strokeText(ch, x, y + 2);

      // 外发光描边 (血红/暗金，暗黑氛围)
      ctx.lineWidth = 3;
      ctx.strokeStyle = this.themeColor('softPrimary');
      ctx.strokeText(ch, x, y);

      // 主体渐变填充 (金→白→暗金，逐字微调亮度形成层次)
      const g = ctx.createLinearGradient(x - charW / 2, y - titleFontSize / 2, x + charW / 2, y + titleFontSize / 2);
      g.addColorStop(0, '#ffe08a');
      g.addColorStop(0.5, '#ffffff');
      g.addColorStop(1, this.themeColor('accent'));
      ctx.fillStyle = g;
      ctx.fillText(ch, x, y);
    });

    // 双侧獠牙羽翼装饰线 (向中间收拢的利刃线)
    const wingY = mainY + 8;
    ctx.strokeStyle = this.themeColor('accent');
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.moveTo(cx - totalW / 2 - 34, wingY + 2);
    ctx.lineTo(cx - totalW / 2 - 8, wingY - 4);
    ctx.moveTo(cx - totalW / 2 - 34, wingY - 4);
    ctx.lineTo(cx - totalW / 2 - 8, wingY + 2);
    ctx.moveTo(cx + totalW / 2 + 34, wingY + 2);
    ctx.lineTo(cx + totalW / 2 + 8, wingY - 4);
    ctx.moveTo(cx + totalW / 2 + 34, wingY - 4);
    ctx.lineTo(cx + totalW / 2 + 8, wingY + 2);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // 副标题《家禽勇士》 (小字点缀，带双侧羽翼短饰线)
    const subY = mainY + 34;
    ctx.font = `bold 16px ${FONT_FAMILY}`;
    // 阴影
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillText('家 禽 勇 士', cx + 1.5, subY + 1.5);
    // 主体 (暗金)
    ctx.fillStyle = this.themeColor('accent');
    ctx.fillText('家 禽 勇 士', cx, subY);

    // 副标题双侧短装饰线
    const subLineY = subY;
    ctx.strokeStyle = this.themeColor('softPrimary');
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(cx - 62, subLineY);
    ctx.lineTo(cx - 40, subLineY);
    ctx.moveTo(cx + 40, subLineY);
    ctx.lineTo(cx + 62, subLineY);
    ctx.stroke();

    ctx.restore();
  }

  /**
   * 选人界面左上角「成就」入口按钮
   */
  renderAchievementBtn(ctx) {
    const btnW = 74;
    const btnH = 30;
    const btnX = 12;
    const btnY = 14;
    this.achievementBtnArea = { x: btnX, y: btnY, w: btnW, h: btnH };

    ctx.save();
    this.drawRoundedRect(ctx, btnX, btnY, btnW, btnH, 15);
    ctx.fillStyle = 'rgba(20, 18, 30, 0.85)';
    ctx.fill();
    ctx.strokeStyle = this.themeColor('accent');
    ctx.lineWidth = 1.6;
    ctx.stroke();

    ctx.font = `bold 12px ${FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = this.themeColor('accent');
    ctx.fillText('🏆 成就', btnX + btnW / 2, btnY + btnH / 2);
    ctx.restore();
  }

  /**
   * 成就查看面板（全屏覆盖）：展示已解锁/未解锁成就与当前进度
   */
  renderAchievementsPanel(ctx) {
    ctx.save();

    // 半透明遮罩背景
    ctx.fillStyle = 'rgba(8, 6, 16, 0.96)';
    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

    const am = (typeof GameGlobal !== 'undefined' && GameGlobal.achievementManager) || null;
    const list = am ? am.getAchievements() : ACHIEVEMENTS.map((a) => ({ ...a, unlocked: false, current: 0, progress: 0 }));
    const stats = am ? am.getStats() : { total: ACHIEVEMENTS.length, unlockedCount: 0 };

    // 顶部标题栏
    const headerY = 14;
    ctx.fillStyle = this.themeColor('accent');
    ctx.font = `900 22px ${FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🏆 成 就 图 鉴', SCREEN_WIDTH / 2, headerY + 20);

    // 进度概览
    ctx.fillStyle = '#bdc3c7';
    ctx.font = `bold 13px ${FONT_FAMILY}`;
    ctx.fillText(`已解锁 ${stats.unlockedCount} / ${stats.total}`, SCREEN_WIDTH / 2, headerY + 48);

    // 分类标签
    const categories = [
      { key: 'combat', name: '⚔️ 战斗' },
      { key: 'growth', name: '🌱 成长' },
      { key: 'victory', name: '👑 通关' },
      { key: 'build', name: '🔮 搭配' },
      { key: 'mastery', name: '📖 图鉴' },
    ];

    // 列表起始位置
    let listY = headerY + 68;
    const lineH = 40;
    const panelW = SCREEN_WIDTH - 28;
    const panelX = 14;

    // 按分类分组展示
    for (let c = 0; c < categories.length; c++) {
      const cat = categories[c];
      const catItems = list.filter((a) => a.category === cat.key);
      if (catItems.length === 0) continue;

      // 分类标题
      ctx.textAlign = 'left';
      ctx.fillStyle = this.themeColor('panelBorder');
      ctx.font = `bold 14px ${FONT_FAMILY}`;
      ctx.fillText(cat.name, panelX + 4, listY + 12);
      listY += 26;

      for (let i = 0; i < catItems.length; i++) {
        const a = catItems[i];
        if (listY > SCREEN_HEIGHT - 40) break; // 超出屏幕

        this.drawRoundedRect(ctx, panelX, listY, panelW, 34, 6);
        if (a.unlocked) {
          ctx.fillStyle = 'rgba(241, 196, 15, 0.14)';
        } else {
          ctx.fillStyle = 'rgba(30, 30, 40, 0.6)';
        }
        ctx.fill();
        ctx.strokeStyle = a.unlocked ? this.themeColor('accent') : '#444455';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // 状态图标
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.font = `16px ${FONT_FAMILY}`;
        ctx.fillText(a.unlocked ? '✅' : '⬜', panelX + 10, listY + 17);

        // 名称 + 描述
        ctx.font = `bold 13px ${FONT_FAMILY}`;
        ctx.fillStyle = a.unlocked ? '#ffffff' : '#9aa0aa';
        ctx.fillText(a.name, panelX + 38, listY + 11);
        ctx.font = `10.5px ${FONT_FAMILY}`;
        ctx.fillStyle = a.unlocked ? '#c8a44d' : '#6b7280';
        ctx.fillText(a.desc, panelX + 38, listY + 25);

        // 进度条（未解锁时显示进度）
        if (!a.unlocked) {
          const barX = SCREEN_WIDTH - panelX - 90;
          const barW = 66;
          const barH = 6;
          const barY = listY + 14;
          ctx.fillStyle = '#2a2a38';
          this.drawRoundedRect(ctx, barX, barY, barW, barH, 3);
          ctx.fill();
          ctx.fillStyle = this.themeColor('accent');
          const pw = Math.max(2, Math.round(barW * a.progress));
          this.drawRoundedRect(ctx, barX, barY, pw, barH, 3);
          ctx.fill();
          ctx.font = `9px ${FONT_FAMILY}`;
          ctx.fillStyle = '#8a8f99';
          ctx.textAlign = 'right';
          ctx.fillText(`${a.current}/${a.target}`, barX + barW + 28, listY + 17);
        }

        listY += lineH;
      }
      listY += 8;
    }

    ctx.restore(); // 结束成就列表视口裁剪

    // 关闭按钮
    const closeW = SCREEN_WIDTH - 60;
    const closeH = 44;
    const closeX = 30;
    const closeY = SCREEN_HEIGHT - 56;
    this.achievementCloseArea = { x: closeX, y: closeY, w: closeW, h: closeH };

    this.drawRoundedRect(ctx, closeX, closeY, closeW, closeH, 10);
    const g = ctx.createLinearGradient(closeX, closeY, closeX + closeW, closeY);
    g.addColorStop(0, this.themeColor('danger'));
    g.addColorStop(1, this.themeColor('primary'));
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = this.themeColor('softPrimary');
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold 16px ${FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('返 回', closeX + closeW / 2, closeY + closeH / 2);

    ctx.restore();
  }

  // --------------------- 阶段一：罗列种族图片 · 点击查看详细简介 ---------------------
  renderRaceSelectStep(ctx, player) {
    this.raceClickAreas = [];
    this.confirmRaceBtnArea = null;

    const selRace = RACES[this.selectedRaceId] || RACES.chicken;
    const marginX = 14;
    const stageW = SCREEN_WIDTH - marginX * 2;

    // 1. 顶部步骤导航：[ ◈ 01 灵兽通灵 ] ──➔ [ 02 职业卍解 ]
    const topBarY = SCREEN_HEIGHT * 0.36;
    const navH = 34;
    this.drawRoundedRect(ctx, marginX, topBarY, stageW, navH, 8);
    ctx.fillStyle = 'rgba(20, 22, 30, 0.92)';
    ctx.fill();
    ctx.strokeStyle = this.themeColor('primary');
    ctx.lineWidth = 1.8;
    ctx.stroke();

    ctx.font = `bold 13px ${FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = this.themeColor('softPrimary');
    ctx.fillText('◈ 01 灵兽通灵', marginX + stageW * 0.28, topBarY + navH / 2);
    ctx.fillStyle = '#636e72';
    ctx.fillText('──➔', marginX + stageW * 0.5, topBarY + navH / 2);
    ctx.fillText('02 职业卍解', marginX + stageW * 0.72, topBarY + navH / 2);

    // 2. 罗列 5 大种族动漫图片选择器 (横排卡片)
    const raceKeys = Object.keys(RACES);
    const selectorY = topBarY + navH + 10;
    const cardGap = 6;
    const cardW = Math.floor((stageW - (raceKeys.length - 1) * cardGap) / raceKeys.length);
    const cardH = 68;

    raceKeys.forEach((key, index) => {
      const race = RACES[key];
      const isSelected = this.selectedRaceId === key;
      const cx = marginX + index * (cardW + cardGap);
      const cy = isSelected ? selectorY - 3 : selectorY;

      this.raceClickAreas.push({ id: key, x: cx, y: cy, w: cardW, h: cardH });

      this.drawRoundedRect(ctx, cx, cy, cardW, cardH, 8);
      ctx.fillStyle = isSelected ? 'rgba(231, 76, 60, 0.32)' : 'rgba(24, 28, 40, 0.85)';
      ctx.fill();
      ctx.strokeStyle = isSelected ? this.themeColor('softPrimary') : '#4b4b4b';
      ctx.lineWidth = isSelected ? 2.2 : 1;
      ctx.stroke();

      // 头像图片（UI 预览：读取「角色+职业」组合最高阶最终形态，非 1 级）
      const img = getUIPreviewImage(key, this.selectedClassId) || HeroImages[key];
      const iconSize = 34;
      const iconX = cx + (cardW - iconSize) / 2;
      const iconY = cy + 6;
      if (img && (img.complete || img.width > 0)) {
        ctx.drawImage(img, iconX, iconY, iconSize, iconSize);
      } else {
        ctx.font = '20px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(race.icon, cx + cardW / 2, iconY + iconSize / 2);
      }

      ctx.fillStyle = isSelected ? '#ffffff' : '#a4b0be';
      ctx.font = `bold 11px ${FONT_FAMILY}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(race.name, cx + cardW / 2, cy + cardH - 8);
    });

    // 3. 选中种族的详细简介大面板 (点击图片出现简介)
    const descY = selectorY + cardH + 10;
    const btnY = SCREEN_HEIGHT - 56;
    const descH = btnY - descY - 10;

    this.drawRoundedRect(ctx, marginX, descY, stageW, descH, 10);
    ctx.fillStyle = 'rgba(15, 17, 24, 0.96)';
    ctx.fill();
    ctx.strokeStyle = selRace.color || this.themeColor('primary');
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // 3.1 顶部灵兽形象大图与称号（UI 预览：读取最高阶最终形态，非 1 级）
    const avatarSize = 64;
    const avatarX = marginX + 16;
    const avatarY = descY + 16;
    const selImg = getUIPreviewImage(selRace.id, this.selectedClassId) || HeroImages[selRace.id];
    if (selImg && (selImg.complete || selImg.width > 0)) {
      ctx.drawImage(selImg, avatarX, avatarY, avatarSize, avatarSize);
    } else {
      ctx.font = '40px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(selRace.icon, avatarX + avatarSize / 2, avatarY + avatarSize / 2);
    }

    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#ffffff';
    ctx.font = `900 18px ${FONT_FAMILY}`;
    ctx.fillText(`${selRace.icon} ${selRace.name}`, avatarX + avatarSize + 14, avatarY + 24);

    ctx.fillStyle = selRace.color || this.themeColor('softPrimary');
    ctx.font = `bold 12.5px ${FONT_FAMILY}`;
    ctx.fillText(`【 ${selRace.title} 】`, avatarX + avatarSize + 14, avatarY + 46);

    ctx.fillStyle = this.themeColor('info');
    ctx.font = `bold 11px ${FONT_FAMILY}`;
    const affSkills = selRace.affinitySkills ? selRace.affinitySkills.join('、') : '通用';
    ctx.fillText(`天命共鸣战技：${affSkills}`, avatarX + avatarSize + 14, avatarY + 64);

    // 3.2 分割线
    const lineY = avatarY + avatarSize + 12;
    ctx.strokeStyle = 'rgba(231, 76, 60, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(marginX + 14, lineY);
    ctx.lineTo(SCREEN_WIDTH - marginX - 14, lineY);
    ctx.stroke();

    // 3.3 属性修正详细介绍
    let curY = lineY + 18;
    this.drawSectionHeader(ctx, '📊 血脉根基与特性修正', this.themeColor('accent'), marginX + 14, curY);
    curY += 16;

    const mod = selRace.modifiers || {};
    const modTexts = [];
    if (mod.maxHpBonus) modTexts.push(`生命上限 +${mod.maxHpBonus}`);
    if (mod.speedBonus) modTexts.push(`移动速度 +${Math.round(mod.speedBonus * 100)}%`);
    if (mod.critRate) modTexts.push(`暴击率 +${Math.round(mod.critRate * 100)}%`);
    if (mod.dodgeRate) modTexts.push(`闪避率 +${Math.round(mod.dodgeRate * 100)}%`);
    if (mod.magnetBonus) modTexts.push(`灵石拾取 +${Math.round(mod.magnetBonus * 100)}%`);
    if (mod.woolShield) modTexts.push('自带周期护盾');

    ctx.fillStyle = '#dfe6e9';
    ctx.font = `12px ${FONT_FAMILY}`;
    ctx.fillText(modTexts.join('  |  ') || '全能均衡基础属性', marginX + 16, curY);

    // 3.4 血脉专属奥义神技
    curY += 28;
    const racialSkill = SKILLS[selRace.racialSkillId];
    if (racialSkill) {
      this.drawSectionHeader(ctx, `⚡ 专属血脉奥义 · ${racialSkill.name}`, selRace.color || this.themeColor('accent'), marginX + 14, curY);
      curY += 16;
      ctx.fillStyle = '#bdc3c7';
      ctx.font = `11.5px ${FONT_FAMILY}`;
      this.wrapText(ctx, racialSkill.desc || '强力专属战术奥义', marginX + 16, curY, stageW - 32, 16, 3);
    }

    // 4. 底部确定前往选职业按钮
    const btnH = 44;
    this.confirmRaceBtnArea = { x: marginX, y: btnY, w: stageW, h: btnH };

    const btnGrad = ctx.createLinearGradient(marginX, btnY, marginX + stageW, btnY);
    btnGrad.addColorStop(0, this.themeColor('danger'));
    btnGrad.addColorStop(1, this.themeColor('primary'));
    this.drawRoundedRect(ctx, marginX, btnY, stageW, btnH, 8);
    ctx.fillStyle = btnGrad;
    ctx.fill();
    ctx.strokeStyle = this.themeColor('softPrimary');
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = `900 15.5px ${FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`确认【${selRace.name}】· 前往觉醒职业 ➔`, marginX + stageW / 2, btnY + btnH / 2);
  }

  // --------------------- 阶段二：罗列职业图片 · 点击查看详细简介与返回 ---------------------
  renderClassSelectStep(ctx, player) {
    this.classClickAreas = [];
    this.backToRaceBtnArea = null;
    this.startBtnArea = null;

    const selRace = RACES[this.selectedRaceId] || RACES.chicken;
    const selClass = CLASSES[this.selectedClassId] || CLASSES.warrior;
    const marginX = 14;
    const stageW = SCREEN_WIDTH - marginX * 2;

    // 1. 顶部热血胶囊导航 (支持返回重新选种族)
    const topBarY = SCREEN_HEIGHT * 0.36;
    const navH = 34;
    this.drawRoundedRect(ctx, marginX, topBarY, stageW, navH, 8);
    ctx.fillStyle = 'rgba(20, 22, 30, 0.92)';
    ctx.fill();
    ctx.strokeStyle = this.themeColor('accent');
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // 1.1 左侧返回按钮热区
    const backBtnW = stageW * 0.44;
    this.backToRaceBtnArea = { x: marginX, y: topBarY, w: backBtnW, h: navH };

    ctx.font = `bold 12.5px ${FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = this.themeColor('info');
    ctx.fillText(`◂ ${selRace.icon} ${selRace.name} (重选灵兽)`, marginX + backBtnW / 2, topBarY + navH / 2);

    ctx.fillStyle = this.themeColor('accent');
    ctx.fillText('➔  ◈ 02 职业卍解', marginX + stageW * 0.74, topBarY + navH / 2);

    // 2. 罗列 6 大进化职业图片卡片
    const classKeys = Object.keys(CLASSES);
    const selectorY = topBarY + navH + 10;
    const cardGap = 5;
    const cardW = Math.floor((stageW - (classKeys.length - 1) * cardGap) / classKeys.length);
    const cardH = 68;

    classKeys.forEach((key, index) => {
      const cls = CLASSES[key];
      const isSelected = this.selectedClassId === key;
      const cx = marginX + index * (cardW + cardGap);
      const cy = isSelected ? selectorY - 3 : selectorY;

      this.classClickAreas.push({ id: key, x: cx, y: cy, w: cardW, h: cardH });

      this.drawRoundedRect(ctx, cx, cy, cardW, cardH, 8);
      ctx.fillStyle = isSelected ? 'rgba(241, 196, 15, 0.32)' : 'rgba(24, 28, 40, 0.85)';
      ctx.fill();
      ctx.strokeStyle = isSelected ? (cls.color || this.themeColor('accent')) : '#4b4b4b';
      ctx.lineWidth = isSelected ? 2.2 : 1;
      ctx.stroke();

      // 头像图片（UI 预览：读取「当前选中种族×该职业」组合最高阶最终形态）
      const img = getUIPreviewImage(this.selectedRaceId, key) || ClassImages[key];
      const iconSize = 34;
      const iconX = cx + (cardW - iconSize) / 2;
      const iconY = cy + 6;
      if (img && (img.complete || img.width > 0)) {
        ctx.drawImage(img, iconX, iconY, iconSize, iconSize);
      } else {
        ctx.font = '20px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(cls.icon, cx + cardW / 2, iconY + iconSize / 2);
      }

      ctx.fillStyle = isSelected ? '#ffffff' : '#a4b0be';
      ctx.font = `bold 10.5px ${FONT_FAMILY}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(cls.name, cx + cardW / 2, cy + cardH - 8);
    });

    // 3. 选中职业的详细简介大面板 (点击图片出现简介)
    const descY = selectorY + cardH + 10;
    const btnY = SCREEN_HEIGHT - 56;
    const descH = btnY - descY - 10;

    this.drawRoundedRect(ctx, marginX, descY, stageW, descH, 10);
    ctx.fillStyle = 'rgba(15, 17, 24, 0.96)';
    ctx.fill();
    ctx.strokeStyle = selClass.color || this.themeColor('accent');
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // 3.1 职业大图与名号（UI 预览：展示「角色+职业」组合最高阶最终形态）
    const avatarSize = 64;
    const avatarX = marginX + 16;
    const avatarY = descY + 16;
    const selClsImg = getUIPreviewImage(selRace.id, selClass.id) || ClassImages[selClass.id];
    if (selClsImg && (selClsImg.complete || selClsImg.width > 0)) {
      ctx.drawImage(selClsImg, avatarX, avatarY, avatarSize, avatarSize);
    } else {
      ctx.font = '40px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(selClass.icon, avatarX + avatarSize / 2, avatarY + avatarSize / 2);
    }

    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#ffffff';
    ctx.font = `900 18px ${FONT_FAMILY}`;
    ctx.fillText(`${selClass.icon} ${selClass.name}`, avatarX + avatarSize + 14, avatarY + 24);

    ctx.fillStyle = selClass.color || this.themeColor('accent');
    ctx.font = `bold 12.5px ${FONT_FAMILY}`;
    ctx.fillText(`【 ${selClass.title} 】`, avatarX + avatarSize + 14, avatarY + 46);

    ctx.fillStyle = this.themeColor('info');
    ctx.font = `bold 11px ${FONT_FAMILY}`;
    ctx.fillText(`基础生命 ${selClass.baseHp}  |  移速 ${selClass.baseSpeed}`, avatarX + avatarSize + 14, avatarY + 64);

    // 3.2 分割线
    const lineY = avatarY + avatarSize + 12;
    ctx.strokeStyle = 'rgba(241, 196, 15, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(marginX + 14, lineY);
    ctx.lineTo(SCREEN_WIDTH - marginX - 14, lineY);
    ctx.stroke();

    // 3.3 初始奥义神技
    let curY = lineY + 18;
    const initSkillInfo = this.getClassSkillPreview(selClass.id);
    this.drawSectionHeader(ctx, `⚡ 初始战术奥义 · ${initSkillInfo.name}`, selClass.color || this.themeColor('accent'), marginX + 14, curY);
    curY += 16;
    ctx.fillStyle = '#dfe6e9';
    ctx.font = `11.5px ${FONT_FAMILY}`;
    this.wrapText(ctx, initSkillInfo.desc || '专属强力战斗流派', marginX + 16, curY, stageW - 32, 16, 2);

    // 3.4 派系清规与修习禁忌
    curY += 34;
    this.drawSectionHeader(ctx, '⛔ 派系清规与禁忌', this.themeColor('primary'), marginX + 14, curY);
    curY += 16;
    ctx.fillStyle = this.themeColor('softPrimary');
    ctx.font = `11.5px ${FONT_FAMILY}`;
    this.wrapText(ctx, selClass.forbiddenDesc || '无特殊禁忌', marginX + 16, curY, stageW - 32, 16, 2);

    // 3.5 灵兽契合搭配点评
    curY += 34;
    this.drawSectionHeader(ctx, `💡 血脉契合点评 · ${selRace.name} × ${selClass.name}`, this.themeColor('success'), marginX + 14, curY);
    curY += 16;
    ctx.fillStyle = '#8ec9ff';
    ctx.font = `11.5px ${FONT_FAMILY}`;
    const synergy = this.getSynergyComment(selRace.id, selClass.id);
    this.wrapText(ctx, synergy, marginX + 16, curY, stageW - 32, 16, 2);

    // 4. 底部开启战役大按钮
    const btnH = 44;
    this.startBtnArea = { x: marginX, y: btnY, w: stageW, h: btnH };

    const btnGrad = ctx.createLinearGradient(marginX, btnY, marginX + stageW, btnY);
    btnGrad.addColorStop(0, this.themeColor('panelBorder'));
    btnGrad.addColorStop(1, '#ff9a4d');
    this.drawRoundedRect(ctx, marginX, btnY, stageW, btnH, 8);
    ctx.fillStyle = btnGrad;
    ctx.fill();
    ctx.strokeStyle = this.themeColor('accent');
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = `900 16px ${FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`确认部署 · 踏上征途 ⚔️`, marginX + stageW / 2, btnY + btnH / 2);
  }
  // --------------------- 绘制真实活体灵兽头像 ---------------------
  // 【UI 预览解耦】选人界面展示的立绘必须是「角色+职业」最高阶最终形态
  // （神力光效 + 重度武装满级资产），而非 1 级状态。战斗实体初始化走
  // Player.setup() 严格重置 1 级 + Canvas 降级渲染，两者互不影响。
  drawAnimalAvatar(ctx, raceId, x, y, scale = 1.0, player = null, classId = null) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    // 优先读取最高阶预览贴图（UI 展示用，与战斗实体解耦）
    const previewImg = getUIPreviewImage(raceId, classId);
    const img = previewImg || HeroImages[raceId];
    if (img && (img.complete || img.width > 0)) {
      const breath = 1.0 + Math.sin(this.animPulse * 2.0) * 0.04;
      const size = 52;
      ctx.drawImage(img, -size / 2, -size * breath / 2, size, size * breath);
      ctx.restore();
      return;
    }

    if (player && typeof player.drawChicken === 'function') {
      const origBobbing = player.bobbing;
      const origWingFlap = player.wingFlap;
      player.bobbing = this.animPulse * 1.6;
      player.wingFlap = this.animPulse * 2.4;

      try {
        switch (raceId) {
          case 'chicken': player.drawChicken(ctx); break;
          case 'duck': player.drawDuck(ctx); break;
          case 'cow': player.drawCow(ctx); break;
          case 'sheep': player.drawSheep(ctx); break;
          case 'fish': player.drawFish(ctx); break;
          default: player.drawChicken(ctx); break;
        }
      } catch (e) {
        ctx.font = '24px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🐾', 0, 0);
      }

      player.bobbing = origBobbing;
      player.wingFlap = origWingFlap;
    } else {
      const race = RACES[raceId];
      ctx.font = '26px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(race ? race.icon : '🐾', 0, 0);
    }

    ctx.restore();
  }

  // --------------------- 绘制魔兽经典职业专属徽标 ---------------------
  drawClassEmblem(ctx, classId, x, y, scale = 1.0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

    switch (classId) {
      case 'warrior': {
        // 狂暴战神：珊瑚红战环 + 圆润拳头标志 (可爱力量感)
        ctx.strokeStyle = this.themeColor('primary');
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 16, 0, Math.PI * 2);
        ctx.stroke();

        // 圆润小拳头 (呆萌握拳)
        ctx.fillStyle = '#ecf0f1';
        ctx.strokeStyle = this.themeColor('softPrimary');
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, -2, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = this.themeColor('softPrimary');
        ctx.beginPath();
        ctx.arc(-3, -3, 2.5, 0, Math.PI * 2);
        ctx.arc(3, -3, 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = this.themeColor('danger');
        ctx.beginPath();
        ctx.arc(0, 6, 3, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'holy_knight': {
        // 神圣骑士：圣光金羽天使翼 + 金圣盾 + 白十字星
        ctx.strokeStyle = this.themeColor('accent');
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 16, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = 'rgba(255, 234, 167, 0.75)';
        ctx.beginPath();
        ctx.moveTo(-3, -2);
        ctx.quadraticCurveTo(-14, -14, -18, -6);
        ctx.quadraticCurveTo(-14, 6, -3, 4);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(3, -2);
        ctx.quadraticCurveTo(14, -14, 18, -6);
        ctx.quadraticCurveTo(14, 6, 3, 4);
        ctx.fill();

        ctx.fillStyle = this.themeColor('panelBorder');
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(0, -8);
        ctx.lineTo(8, -3);
        ctx.lineTo(6, 6);
        ctx.lineTo(0, 10);
        ctx.lineTo(-6, 6);
        ctx.lineTo(-8, -3);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-1.5, -5, 3, 10);
        ctx.fillRect(-4.5, -2, 9, 2.5);
        break;
      }

      case 'death_knight': {
        // 邪恶骑士：极恶凋零骸骨符文剑 + 幽冷冰霜死光
        ctx.strokeStyle = '#55efc4';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 16, 0, Math.PI * 2);
        ctx.stroke();

        // 圆润冰晶法杖 (可爱，非符文剑骷髅)
        ctx.strokeStyle = '#dfe6e9';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(0, -13);
        ctx.lineTo(0, 8);
        ctx.stroke();

        // 圆润冰晶宝珠
        ctx.fillStyle = this.themeColor('info');
        ctx.beginPath();
        ctx.arc(0, -12, 4.5, 0, Math.PI * 2);
        ctx.fill();

        // 凋零冰晶核心
        ctx.fillStyle = '#a8e8d5';
        ctx.beginPath();
        ctx.arc(0, -12, 2, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'mage': {
        // 奥术法师：达拉然紫罗兰法球 + 星轨环绕符文
        ctx.strokeStyle = '#a29bfe';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 16, 0, Math.PI * 2);
        ctx.stroke();

        // 奥术星轨椭圆
        ctx.strokeStyle = '#6c5ce7';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(0, 0, 14, 5, Math.PI / 4, 0, Math.PI * 2);
        ctx.stroke();

        // 中心聚能奥术宝珠
        ctx.fillStyle = '#a58bff';
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(-1.5, -1.5, 2, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'fel_warlock': {
        // 邪能术士：圆润绿色能量球 + 呆萌小火苗
        ctx.strokeStyle = this.themeColor('success');
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 16, 0, Math.PI * 2);
        ctx.stroke();

        // 圆润绿色能量球
        ctx.fillStyle = this.themeColor('success');
        ctx.beginPath();
        ctx.arc(0, 2, 8, 0, Math.PI * 2);
        ctx.fill();

        // 呆萌小火苗 (圆润水滴形)
        ctx.fillStyle = '#c9f5a8';
        ctx.beginPath();
        ctx.arc(0, -4, 4.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(-1, -4, 1.8, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'shaman': {
        // 元素萨满：风暴之怒交叉闪电 + 激流元素图腾
        ctx.strokeStyle = '#6bb5ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 16, 0, Math.PI * 2);
        ctx.stroke();

        // 狂暴闪电折线
        ctx.fillStyle = this.themeColor('info');
        ctx.strokeStyle = '#ffeaa7';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(-2, -12);
        ctx.lineTo(6, -2);
        ctx.lineTo(0, 0);
        ctx.lineTo(4, 12);
        ctx.lineTo(-5, 2);
        ctx.lineTo(-1, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
      }
    }

    ctx.restore();
  }

  // --------------------- 辅助战术与技能文本 ---------------------
  drawSectionHeader(ctx, text, color, x, y) {
    ctx.textAlign = 'left';
    ctx.fillStyle = color;
    ctx.font = `bold 12px ${FONT_FAMILY}`;
    ctx.fillText(text, x, y);
  }

  getRaceTactics(raceId) {
    const map = {
      chicken: '“走位越快输出越强！利用高移速在身后密布爆炸金蛋，把怪群引诱至雷区踩爆。”',
      duck: '“天生高闪避无惧偷袭！超频音波大范围击退怪潮，安全距离拉扯从容收割。”',
      cow: '“钢铁肉盾横冲直撞！无伤硬吃包围，贴脸重踏震晕全场，反手割草全屏怪物。”',
      sheep: '“厚实羊毛护盾无伤格挡致命伤，吸收散落羊毛球源源不断回血，终极持久续航。”',
      fish: '“天生极高暴击率！生命低于 50% 攻击力暴涨 40%，配合高速咸鱼突刺一条线穿杀。”',
    };
    return map[raceId] || '灵活跑位，拉扯输出！';
  }

  getClassSkillPreview(classId) {
    const map = {
      warrior: {
        name: '【旋风斩】',
        desc: '以身体为轴狂暴挥舞战刃旋转斩击，造成强力击退。满级觉醒【剑刃风暴·破军】，化身移动风暴小能手！',
      },
      holy_knight: {
        name: '【圣光奉献】',
        desc: '在脚下铺设神圣奉献法阵，持续净化灼烧全场恶灵。满级觉醒【大天使神圣风暴】，天堂圣剑全图审判！',
      },
      death_knight: {
        name: '【凋零腐蚀】',
        desc: '在地面铺开一片幽蓝凋零领域，持续减速并吸取能量。满级觉醒【辛达苟萨死霜领域】，冰霜覆盖全场！',
      },
      mage: {
        name: '【寒冰新星】',
        desc: '以自身为核心向四周爆发极寒冰环，冻结减速全场怪物。满级觉醒【绝对零度极寒风暴】，碎冰全屏秒杀！',
      },
      fel_warlock: {
        name: '【邪能火种】',
        desc: '投掷爆裂邪焰，留下持续剧毒绿焰焚烧焦土。满级觉醒【地狱火流星雨】，全屏邪能天降毁灭！',
      },
      shaman: {
        name: '【闪电链】',
        desc: '轰出狂暴闪电在多名敌人间跳跃电击。满级觉醒【风暴降临·雷神狂怒】，电闪雷鸣连锁万丈！',
      },
    };
    return map[classId] || { name: '【初始神技】', desc: '强力专属技能！' };
  }

  getSynergyComment(raceId, classId) {
    const table = {
      chicken: {
        warrior: '母鸡极速机动弥补狂暴战神短腿，走位拉怪顺势旋风斩，如疾风割草机！',
        holy_knight: '母鸡受惊高移速边跑边放神圣奉献，在全图留下金色净化圣路，游击圣骑！',
        death_knight: '神鸡边跑边下金蛋边施放凋零死域，怪物踩中蛋爆又陷入领域，双重打击！',
        mage: '母鸡风筝聚怪后寒冰新星全场瞬冻，接一发奥术齐射瞬间清屏！',
        fel_warlock: '利用超高机动把怪群牢牢引诱在邪能绿焰中炙烤，灼烧效率直接翻倍！',
        shaman: '高速游走疯狂触发闪电链与天命极境，雷光在怪潮中连绵不绝！',
      },
      duck: {
        warrior: '神鸭天生 15% 闪避极大降低近战暴毙风险，在刀尖上旋转狂斩！',
        holy_knight: '高闪避叠加圣光神佑，化身闪避流神圣圣骑，怪潮根本打不中！',
        death_knight: '超频音波大范围击退怪潮，把怪物牢牢困在凋零领域边界！',
        mage: '鸭鸭音波击退与寒冰新星冻结形成完美双控，怪潮寸步难行！',
        fel_warlock: '鸭音推飞怪物并持续减速，把精英怪死死按在邪焰焦土中熔融！',
        shaman: '神鸭天命共鸣极境，音波推怪成堆，一记闪电链串联全图爆发超高AOE！',
      },
      cow: {
        warrior: '蛮荒铁牛天生霸体肉盾与狂暴战神绝配！重踏震晕接旋风斩，近身小怪全被弹飞！',
        holy_knight: '钢铁之躯硬吃全屏围攻，配合圣光奉献自愈护体，坚如磐石无可撼动！',
        death_knight: '蛮牛化身不灭坦克，在凋零领域中贴身吸血，血条越打越厚！',
        mage: '铁牛聚怪近身战争重踏群控，为高伤害奥术法术争取绝佳轰杀时机！',
        fel_warlock: '以结实身躯顶住怪潮，近身引爆地狱火流星，一己之力横扫全场！',
        shaman: '钢铁身躯肉搏拉怪，周围环绕风暴雷霆，化身行走的天谴雷神！',
      },
      sheep: {
        warrior: '羊毛厚盾吸收致命近战伤害，近身肉搏无伤割草，越战越勇！',
        holy_knight: '羊毛神盾+神圣光环持续自愈，双重绝对防御，堪称永生不死圣光使！',
        death_knight: '羊毛盾碎散落恢复球，抵消邪能/死灵反噬，打造自循环永动机！',
        mage: '超大灵魂拾取范围快速吸纳奥术能量，以惊人速度将法术升阶至极境！',
        fel_warlock: '吸收羊毛球极速自愈，抵消暗影邪能反噬，肆无忌惮倾泻极恶魔焰！',
        shaman: '羊毛盾护体无视近身偷袭，从容引导雷霆风暴洗礼整片战场！',
      },
      fish: {
        warrior: '咸鱼天生高暴击完美加持致死打击与旋风斩，残血暴走刀刀暴击融化Boss！',
        holy_knight: '咸鱼暴击大幅增幅神圣光击，残血逆境下神圣奉献爆发金色暴击海！',
        death_knight: '高暴击凋零死域频繁跳出高额暴击数字，咸鱼突刺一条直线贯穿全屏！',
        mage: '寒冰新星冻结脆弱目标，咸鱼高暴击奥术飞弹直接造成碎冰多倍暴伤！',
        fel_warlock: '邪焰焦土与暴击毒火持续跳动，咸鱼残血攻击暴涨40%毁天灭地！',
        shaman: '天生极高暴击与雷系闪电绝配！每道连锁闪电全出暴击电芒，秒杀全图！',
      },
    };
    return (table[raceId] && table[raceId][classId]) || '灵兽血脉与魔兽职业相得益彰，战力倍增！';
  }

  // ===================== 赛博科幻战术终端渲染管线 =====================

  // 柔和星光背景 (可爱卡通暗黑基调，替代赛博战术网格)
  drawStarField(ctx) {
    ctx.save();
    const seed = 1337;
    const colors = ['rgba(255,214,107,', 'rgba(255,179,209,', 'rgba(143,240,196,', 'rgba(183,167,255,'];
    for (let i = 0; i < 40; i++) {
      // 用确定性伪随机，避免每帧闪烁
      const a = (i * 137.5 + seed) % 360;
      const rx = ((i * 73 + 29) % 100) / 100;
      const ry = ((i * 47 + 11) % 100) / 100;
      const x = rx * SCREEN_WIDTH;
      const y = ry * SCREEN_HEIGHT;
      const size = ((i * 13) % 3) * 0.6 + 0.8;
      const twinkle = 0.35 + Math.sin(this.animPulse * 1.5 + i) * 0.25;
      ctx.fillStyle = colors[i % 4] + Math.max(0.15, twinkle).toFixed(2) + ')';
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // 深空战术网格背景
  drawTacticalGrid(ctx) {
    ctx.save();
    const gridSize = 28;
    ctx.strokeStyle = 'rgba(0, 255, 204, 0.05)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= SCREEN_WIDTH; x += gridSize) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, SCREEN_HEIGHT);
    }
    for (let y = 0; y <= SCREEN_HEIGHT; y += gridSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(SCREEN_WIDTH, y);
    }
    ctx.stroke();

    // 交叉点战术微光十字星
    ctx.fillStyle = 'rgba(0, 255, 204, 0.2)';
    for (let x = gridSize * 2; x < SCREEN_WIDTH; x += gridSize * 4) {
      for (let y = gridSize * 2; y < SCREEN_HEIGHT; y += gridSize * 4) {
        ctx.fillRect(x - 1, y - 1, 2, 2);
      }
    }
    ctx.restore();
  }

  // 战术瞄准角标绘制
  drawTacticalCorners(ctx, x, y, w, h, len = 12, color = null) {
    ctx.save();
    if (color) ctx.strokeStyle = color;
    ctx.beginPath();
    // 左上
    ctx.moveTo(x, y + len); ctx.lineTo(x, y); ctx.lineTo(x + len, y);
    // 右上
    ctx.moveTo(w + x - len, y); ctx.lineTo(w + x, y); ctx.lineTo(w + x, y + len);
    // 左下
    ctx.moveTo(x, h + y - len); ctx.lineTo(x, h + y); ctx.lineTo(x + len, h + y);
    // 右下
    ctx.moveTo(w + x - len, h + y); ctx.lineTo(w + x, h + y); ctx.lineTo(w + x, h + y - len);
    ctx.stroke();
    ctx.restore();
  }

  // 底部环形悬浮立体全息投影基座
  drawHoloBase(ctx, cx, cy, radius = 22) {
    ctx.save();
    const pulse = (Math.sin(this.animPulse * 3.5) + 1) * 0.5;

    // 1. 悬浮全息光束梯形流光
    const beamH = radius * 1.35;
    const grad = ctx.createLinearGradient(cx, cy, cx, cy - beamH);
    grad.addColorStop(0, 'rgba(0, 255, 204, 0.28)');
    grad.addColorStop(0.5, 'rgba(0, 210, 255, 0.10)');
    grad.addColorStop(1, 'rgba(0, 255, 204, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(cx - radius * 0.9, cy);
    ctx.lineTo(cx - radius * 0.45, cy - beamH);
    ctx.lineTo(cx + radius * 0.45, cy - beamH);
    ctx.lineTo(cx + radius * 0.9, cy);
    ctx.closePath();
    ctx.fill();

    // 2. 双层全息悬浮立体椭圆环
    ctx.strokeStyle = `rgba(0, 255, 204, ${0.45 + pulse * 0.45})`;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(cx, cy, radius, radius * 0.32, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = `rgba(0, 210, 255, ${0.3 + (1 - pulse) * 0.3})`;
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.ellipse(cx, cy - 2, radius * 0.72, radius * 0.22, 0, 0, Math.PI * 2);
    ctx.stroke();

    // 3. 悬浮投影核
    ctx.fillStyle = '#00ffcc';
    ctx.beginPath();
    ctx.arc(cx, cy, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // 终端风格赛博科幻卡片渲染
  renderCyberpunkCard(ctx, card, isSelected, timeOffset = 0, accentColor = '#00ffcc') {
    const time = timeOffset || Date.now();
    ctx.save();

    // 1. 磨砂毛玻璃半透明底板 (Glassmorphism)
    ctx.fillStyle = isSelected ? 'rgba(18, 28, 44, 0.90)' : 'rgba(14, 18, 28, 0.82)';
    ctx.fillRect(card.x, card.y, card.width, card.height);

    // 2. 科技感切角与轮廓
    const chamfer = 10;
    ctx.beginPath();
    ctx.moveTo(card.x + chamfer, card.y);
    ctx.lineTo(card.x + card.width, card.y);
    ctx.lineTo(card.x + card.width, card.y + card.height - chamfer);
    ctx.lineTo(card.x + card.width - chamfer, card.y + card.height);
    ctx.lineTo(card.x, card.y + card.height);
    ctx.lineTo(card.x, card.y + chamfer);
    ctx.closePath();

    if (isSelected) {
      // 激活状态：呼吸流光霓虹
      const pulse = (Math.sin(time * 0.005) + 1) / 2; // 0.0 ~ 1.0
      ctx.strokeStyle = `rgba(0, 255, 204, ${0.5 + pulse * 0.5})`;
      ctx.lineWidth = 2.4;
      ctx.stroke();

      // 绘制四角科技瞄准标
      ctx.strokeStyle = '#00ffcc';
      ctx.lineWidth = 1.8;
      this.drawTacticalCorners(ctx, card.x, card.y, card.width, card.height, 10);

      // 右上角呼吸状态标
      ctx.fillStyle = '#00ffcc';
      ctx.beginPath();
      ctx.arc(card.x + card.width - 8, card.y + 8, 3.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // 未激活状态：低调网格边
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    ctx.restore();
  }

  // 兼容性外壳
  drawFancyCard(ctx, x, y, w, h, isSelected, accentColor) {
    this.renderCyberpunkCard(ctx, { x, y, width: w, height: h }, isSelected, Date.now(), accentColor);
  }

  // ===================== 2. 奢华底部战斗 HUD 面板 (全内容底置化设计) =====================
  renderHUD(ctx, player, gameData, learnedSkills, equipmentManager = null) {
    ctx.save();

    const marginX = 10;
    const bottomBaseY = SCREEN_HEIGHT - 86; // 底部 HUD 总基线 (距底边留足安全距离)

    // 1. 经验条 (EXP Bar) - 位于底部面板上沿，清晰可见且不遮挡任何战局
    const expY = bottomBaseY;
    const expH = 8;
    const expRatio = Math.max(0, Math.min(1, player.exp / player.maxExp));

    // 0. 左下角 · 明确置于经验条上方 8px：16 部位全装备人形剪影 (彻底杜绝与经验条、角色栏重叠碰撞)
    const silW = 50;
    const silH = 56;
    const silX = marginX;
    const silY = expY - silH - 8;

    // 底部磨砂渐变衬底 (覆盖经验条与底部操作面板)
    const dockGrad = ctx.createLinearGradient(0, expY - 6, 0, SCREEN_HEIGHT);
    dockGrad.addColorStop(0, 'rgba(6, 8, 14, 0)');
    dockGrad.addColorStop(0.25, 'rgba(6, 8, 14, 0.65)');
    dockGrad.addColorStop(1, 'rgba(6, 8, 14, 0.94)');
    ctx.fillStyle = dockGrad;
    ctx.fillRect(0, expY - 6, SCREEN_WIDTH, SCREEN_HEIGHT - (expY - 6));

    // 渲染全装备人形剪影 (点击展开详细词条面板)
    this.renderEquipmentSilhouette(ctx, silX, silY, silW, silH, equipmentManager);

    // 经验条底槽
    ctx.fillStyle = 'rgba(10, 14, 20, 0.88)';
    ctx.fillRect(0, expY, SCREEN_WIDTH, expH);

    // 经验条极光渐变填充
    if (expRatio > 0) {
      const expGrad = ctx.createLinearGradient(0, expY, SCREEN_WIDTH, expY);
      expGrad.addColorStop(0, this.themeColor('info'));
      expGrad.addColorStop(0.5, '#6bb5ff');
      expGrad.addColorStop(1, this.themeColor('accent'));
      ctx.fillStyle = expGrad;
      ctx.fillRect(0, expY, SCREEN_WIDTH * expRatio, expH);
    }

    // 经验条金光顶分界线
    ctx.fillStyle = 'rgba(241, 196, 15, 0.4)';
    ctx.fillRect(0, expY, SCREEN_WIDTH, 1);

    // 经验百分比数值
    ctx.fillStyle = '#dfe6e9';
    ctx.font = `bold 8px monospace`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(`EXP ${Math.round(expRatio * 100)}%`, SCREEN_WIDTH - 8, expY + expH / 2);

    // 2. 战况与技能行 (Upper Row: 技能栏 + 计时 + 击杀)
    const row1Y = expY + expH + 4;

    // 2.1 右侧：击杀与计时双胶囊
    const killW = 58;
    const timeW = 66;
    const badgeGap = 6;
    const killX = SCREEN_WIDTH - marginX - killW;
    const timeX = killX - badgeGap - timeW;

    // ⏱ 存活计时胶囊
    this.drawRoundedRect(ctx, timeX, row1Y, timeW, row1H, 12);
    ctx.fillStyle = 'rgba(18, 22, 32, 0.9)';
    ctx.fill();
    ctx.strokeStyle = this.themeColor('panelBorder');
    ctx.lineWidth = 1.2;
    ctx.stroke();

    const minutes = Math.floor(gameData.time / 60);
    const seconds = Math.floor(gameData.time % 60);
    const timeStr = `${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold 11px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`⏱ ${timeStr}`, timeX + timeW / 2, row1Y + row1H / 2);

    // 👾 击退外星计数胶囊
    this.drawRoundedRect(ctx, killX, row1Y, killW, row1H, 12);
    ctx.fillStyle = 'rgba(42, 37, 64, 0.9)';
    ctx.fill();
    ctx.strokeStyle = this.themeColor('primary');
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.fillStyle = this.themeColor('softPrimary');
    ctx.font = `bold 11px ${FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`👾 ${gameData.kills}`, killX + killW / 2, row1Y + row1H / 2);

    // 2.2 左侧：掌握技能栏 (自左侧边距开始整齐排列)
    let slotX = marginX;
    const slotSize = 22;
    const slotGap = 4;
    const skillKeys = Object.keys(learnedSkills);

    skillKeys.forEach((key) => {
      const lvl = learnedSkills[key];
      const def = SKILLS[key];
      if (!def) return;
      if (slotX + slotSize > timeX - 4) return; // 防止与时间胶囊重叠

      this.drawRoundedRect(ctx, slotX, row1Y, slotSize, slotSize, 5);
      ctx.fillStyle = 'rgba(18, 22, 32, 0.9)';
      ctx.fill();
      ctx.strokeStyle = def.color || this.themeColor('accent');
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.font = `12px ${FONT_FAMILY}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(def.icon, slotX + slotSize / 2, row1Y + slotSize / 2);

      // 角标显示等级数字
      ctx.fillStyle = this.themeColor('accent');
      ctx.font = `bold 8px ${FONT_FAMILY}`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(`${lvl}`, slotX + slotSize - 2, row1Y + slotSize - 2);

      slotX += slotSize + slotGap;
    });

    // 3. 角色状态与属性行 (Lower Row: 角色胶囊框 + 右下角全部属性面板)
    const charW = Math.max(160, Math.min(185, SCREEN_WIDTH * 0.48));
    const charX = marginX;
    const chapX = charX + charW + 6;
    const chapW = SCREEN_WIDTH - chapX - marginX;

    // 3.1 角色胶囊框 (Avatar & Life Gauge) - 点击可直接展开装备面板
    this.hudAvatarArea = { x: charX, y: row2Y, w: charW, h: row2H };
    this.drawRoundedRect(ctx, charX, row2Y, charW, row2H, 19);
    ctx.fillStyle = 'rgba(18, 22, 32, 0.92)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // 圆形动物头像与职业金边外环
    const avX = charX + 19;
    const avY = row2Y + row2H / 2;
    const avR = 15;
    ctx.save();
    ctx.beginPath();
    ctx.arc(avX, avY, avR, 0, Math.PI * 2);
    ctx.fillStyle = '#3a3550';
    ctx.fill();
    ctx.strokeStyle = player.classData.color || this.themeColor('accent');
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = `17px ${FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(player.raceData.icon, avX, avY);
    ctx.restore();

    // 角色名称与当前等级 (双层高速位移黑底，消除 shadowBlur 发热)
    const textStartX = charX + 39;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.font = `bold 11px ${FONT_FAMILY}`;
    ctx.fillStyle = '#000000';
    ctx.fillText(`${player.raceData.name} Lv.${player.level}`, textStartX + 1, row2Y + 14);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${player.raceData.name} Lv.${player.level}`, textStartX, row2Y + 13);

    // 生命血条 (HP Bar)
    const hpX = textStartX;
    const hpY = row2Y + 19;
    const hpW = charW - 47;
    const hpH = 12;

    this.drawRoundedRect(ctx, hpX, hpY, hpW, hpH, 6);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fill();

    const hpRatio = Math.max(0, Math.min(1, player.hp / player.maxHp));
    const hpGrad = ctx.createLinearGradient(hpX, hpY, hpX + hpW, hpY);
    if (hpRatio > 0.35) {
      hpGrad.addColorStop(0, this.themeColor('panelBorder'));
      hpGrad.addColorStop(1, this.themeColor('success'));
    } else {
      hpGrad.addColorStop(0, this.themeColor('danger'));
      hpGrad.addColorStop(1, this.themeColor('primary'));
    }

    if (hpRatio > 0) {
      this.drawRoundedRect(ctx, hpX, hpY, Math.max(8, hpW * hpRatio), hpH, 6);
      ctx.fillStyle = hpGrad;
      ctx.fill();
    }

    // 生命数值
    ctx.font = `bold 8.5px ${FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#000000';
    ctx.fillText(`${Math.round(player.hp)} / ${player.maxHp}`, hpX + hpW / 2 + 1, hpY + hpH / 2 + 1);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${Math.round(player.hp)} / ${player.maxHp}`, hpX + hpW / 2, hpY + hpH / 2);

    // 3.2 右下角：全身装备全部属性总览 (实时动态刷新，一目了然)
    this.hudStatsArea = { x: chapX, y: row2Y, w: chapW, h: row2H };
    this.drawRoundedRect(ctx, chapX, row2Y, chapW, row2H, 8);
    ctx.fillStyle = 'rgba(14, 18, 28, 0.94)';
    ctx.fill();
    ctx.strokeStyle = (equipmentManager && equipmentManager.aggregatedStats && equipmentManager.aggregatedStats.hasLegendary)
      ? '#ffd700'
      : this.themeColor('panelBorder');
    ctx.lineWidth = 1.2;
    ctx.stroke();

    const stats = (equipmentManager && equipmentManager.aggregatedStats) ? equipmentManager.aggregatedStats : {
      atk: 0, crit: 0, crit_dmg: 0, hp: 0, dmg_reduce: 0, lifesteal: 0, cdr: 0, move: 0, elements: new Set()
    };

    // 标题行
    ctx.fillStyle = '#ffd66b';
    ctx.font = `bold 8.5px ${FONT_FAMILY}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚡ 全身战力属性', chapX + 6, row2Y + 8);

    // 右上角五行元素或展开提示
    let elemStr = '';
    if (stats.elements && stats.elements.size > 0) {
      stats.elements.forEach(el => {
        if (el === 'FIRE') elemStr += '🔥';
        else if (el === 'WATER') elemStr += '💧';
        else if (el === 'THUNDER') elemStr += '⚡';
        else if (el === 'WIND') elemStr += '🌪️';
        else if (el === 'WOOD') elemStr += '🌿';
        else if (el === 'METAL') elemStr += '⚔️';
        else if (el === 'EARTH') elemStr += '🪨';
      });
    }
    ctx.textAlign = 'right';
    if (elemStr) {
      ctx.font = `8px ${FONT_FAMILY}`;
      ctx.fillText(elemStr, chapX + chapW - 6, row2Y + 8);
    } else {
      ctx.fillStyle = '#74b9ff';
      ctx.font = `7.5px ${FONT_FAMILY}`;
      ctx.fillText('[点击详情]', chapX + chapW - 6, row2Y + 8);
    }

    // 属性 4 列 2 行网格 (攻/暴/伤/血/防/吸/冷/速)
    const statCols = [
      [
        { l: '攻', v: `+${Math.round(stats.atk * 100)}%`, c: '#ff7675' },
        { l: '防', v: `+${Math.round(stats.dmg_reduce * 100)}%`, c: '#dfe6e9' },
      ],
      [
        { l: '暴', v: `+${Math.round(stats.crit * 100)}%`, c: '#ffeaa7' },
        { l: '吸', v: `+${Math.round(stats.lifesteal * 100)}%`, c: '#e17055' },
      ],
      [
        { l: '伤', v: `+${Math.round(stats.crit_dmg * 100)}%`, c: '#fdcb6e' },
        { l: '冷', v: `-${Math.round(stats.cdr * 100)}%`, c: '#a29bfe' },
      ],
      [
        { l: '血', v: `+${Math.round(stats.hp)}`, c: '#55efc4' },
        { l: '速', v: `+${Math.round(stats.move * 100)}%`, c: '#00cec9' },
      ],
    ];

    const colWidth = (chapW - 10) / 4;
    for (let c = 0; c < 4; c++) {
      const colX = chapX + 5 + c * colWidth;
      // Row 1
      const item1 = statCols[c][0];
      ctx.textAlign = 'left';
      ctx.font = `7px ${FONT_FAMILY}`;
      ctx.fillStyle = '#a4b0be';
      ctx.fillText(item1.l, colX, row2Y + 19);

      ctx.font = `bold 7.5px monospace`;
      ctx.fillStyle = item1.c;
      ctx.fillText(item1.v, colX + 9, row2Y + 19);

      // Row 2
      const item2 = statCols[c][1];
      ctx.font = `7px ${FONT_FAMILY}`;
      ctx.fillStyle = '#a4b0be';
      ctx.fillText(item2.l, colX, row2Y + 29);

      ctx.font = `bold 7.5px monospace`;
      ctx.fillStyle = item2.c;
      ctx.fillText(item2.v, colX + 9, row2Y + 29);
    }

    // 4. 顶部便捷控制按钮组 (避开左下角虚拟摇杆，零误触)
    // 4.1 右上角重新挑战按钮
    const retryBtnW = 74;
    const retryBtnH = 26;
    const retryBtnX = SCREEN_WIDTH - retryBtnW - 12;
    const retryBtnY = 12;
    this.retryBtnArea = { x: retryBtnX, y: retryBtnY, w: retryBtnW, h: retryBtnH };
    if (typeof GameGlobal !== 'undefined') GameGlobal.retryBtnArea = this.retryBtnArea;

    ctx.save();
    this.drawRoundedRect(ctx, retryBtnX, retryBtnY, retryBtnW, retryBtnH, 13);
    ctx.fillStyle = 'rgba(18, 22, 32, 0.88)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.fillStyle = '#dfe6e9';
    ctx.font = `bold 10px ${FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🔄 重试', retryBtnX + retryBtnW / 2, retryBtnY + retryBtnH / 2);
    ctx.restore();

    // 4.2 顶部的装备按钮已移除，改由左下角装备人形剪影直接触控呼出
    this.equipBtnArea = null;

    // 5. 波次来袭警报横幅
    if (this.waveAlert && this.waveAlert.timer > 0) {
      this.waveAlert.timer--;
      const alpha = Math.min(1.0, this.waveAlert.timer / 20, (this.waveAlert.maxTimer - this.waveAlert.timer) / 20);
      const alertW = Math.min(320, SCREEN_WIDTH - 40);
      const alertH = 50;
      const alertX = (SCREEN_WIDTH - alertW) / 2;
      const alertY = 110;

      ctx.save();
      ctx.globalAlpha = alpha;
      this.drawRoundedRect(ctx, alertX, alertY, alertW, alertH, 8);
      ctx.fillStyle = 'rgba(10, 10, 12, 0.95)';
      ctx.fill();
      ctx.strokeStyle = this.themeColor('primary');
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = this.themeColor('softPrimary');
      ctx.font = `900 14px ${FONT_FAMILY}`;
      ctx.textAlign = 'center';
      ctx.fillText(`⚠️ 第 ${this.waveAlert.wave} 波敌军来袭 ⚠️`, SCREEN_WIDTH / 2, alertY + 20);
      ctx.fillStyle = '#dfe6e9';
      ctx.font = `12px ${FONT_FAMILY}`;
      ctx.fillText(this.waveAlert.title, SCREEN_WIDTH / 2, alertY + 38);
      ctx.restore();
    }

    // 5.1 常驻左上角波次提示 (横幅 5 秒结束后持续显示，对齐左边距 12px)
    if (this.currentWave > 0 && (!this.waveAlert || this.waveAlert.timer <= 0)) {
      const waveTagW = 64;
      const waveTagH = 22;
      const waveTagX = 12;
      const waveTagY = 14;

      ctx.save();
      this.drawRoundedRect(ctx, waveTagX, waveTagY, waveTagW, waveTagH, 11);
      ctx.fillStyle = 'rgba(18, 22, 32, 0.82)';
      ctx.fill();
      ctx.strokeStyle = this.themeColor('panelBorder');
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.fillStyle = this.themeColor('accent');
      ctx.font = `bold 9px ${FONT_FAMILY}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`第 ${this.currentWave} 波`, waveTagX + waveTagW / 2, waveTagY + waveTagH / 2);
      ctx.restore();
    }

    ctx.restore();
  }

  // ===================== 2.4 16 部位全装备人形剪影 (左下角 · 血条上方常驻) =====================
  renderEquipmentSilhouette(ctx, x, y, w, h, equipmentManager) {
    ctx.save();

    const hasLegend = equipmentManager && equipmentManager.aggregatedStats && equipmentManager.aggregatedStats.hasLegendary;

    // 1. 底板卡片 (半透明磨砂科技感底座，触控热区向外适度外延以保证轻触灵敏)
    this.silhouetteArea = { x: Math.max(0, x - 4), y: y - 4, w: w + 8, h: h + 8 };
    this.drawRoundedRect(ctx, x, y, w, h, 8);
    ctx.fillStyle = 'rgba(12, 16, 26, 0.9)';
    ctx.fill();

    // 边框 (有传说装备时脉冲金光，平时低调细金边)
    if (hasLegend) {
      const pulse = (Math.sin(this.animPulse * 3) + 1) / 2;
      ctx.strokeStyle = `rgba(255, 180, 0, ${0.45 + pulse * 0.45})`;
      ctx.lineWidth = 1.6;
    } else {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
      ctx.lineWidth = 1.0;
    }
    ctx.stroke();

    // 2. 绘制 16 部位人形剪影 (各部位颜色与当前穿戴装备品质实时挂钩，去除顶部文字后居中排列)
    const eq = (equipmentManager && equipmentManager.equipped) || {};
    const getColor = (slotKey) => {
      const item = eq[slotKey];
      if (!item || !item.rarity) return 'rgba(255, 255, 255, 0.15)';
      return item.rarity.color || '#9d9d9d';
    };

    const cx = x + w / 2;
    const cy = y + 5.5;

    // 2.1 [back] 背部披风 / 羽翼 (置于底层身躯后方)
    ctx.save();
    ctx.fillStyle = getColor('back');
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    ctx.moveTo(cx - 7, cy + 12);
    ctx.lineTo(cx - 15, cy + 34);
    ctx.lineTo(cx - 8, cy + 36);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + 7, cy + 12);
    ctx.lineTo(cx + 15, cy + 34);
    ctx.lineTo(cx + 8, cy + 36);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // 2.2 [head] 头部战盔 / 宝冠
    ctx.fillStyle = getColor('head');
    ctx.beginPath();
    ctx.arc(cx, cy + 6.5, 4.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(cx - 3.5, cy + 1.2, 7, 2.2);

    // 2.3 [neck] 颈部项圈
    ctx.fillStyle = getColor('neck');
    ctx.fillRect(cx - 2.5, cy + 11.5, 5, 2);

    // 2.4 [shoulder] 双肩肩甲
    ctx.fillStyle = getColor('shoulder');
    ctx.beginPath();
    ctx.arc(cx - 8.5, cy + 15, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + 8.5, cy + 15, 3.2, 0, Math.PI * 2);
    ctx.fill();

    // 2.5 [chest] 胸部战甲
    ctx.fillStyle = getColor('chest');
    ctx.beginPath();
    ctx.moveTo(cx - 5.5, cy + 13.5);
    ctx.lineTo(cx + 5.5, cy + 13.5);
    ctx.lineTo(cx + 4.5, cy + 24);
    ctx.lineTo(cx - 4.5, cy + 24);
    ctx.closePath();
    ctx.fill();

    // 2.6 [wrist] 双腕护腕
    ctx.fillStyle = getColor('wrist');
    ctx.fillRect(cx - 12.5, cy + 23, 3, 3.5);
    ctx.fillRect(cx + 9.5, cy + 23, 3, 3.5);

    // 2.7 [hands] 手部利爪 / 拳套
    ctx.fillStyle = getColor('hands');
    ctx.beginPath();
    ctx.arc(cx - 11, cy + 28, 2.6, 0, Math.PI * 2);
    ctx.arc(cx + 11, cy + 28, 2.6, 0, Math.PI * 2);
    ctx.fill();

    // 2.8 [waist] 腰部战带
    ctx.fillStyle = getColor('waist');
    ctx.fillRect(cx - 5, cy + 24.5, 10, 2.5);

    // 2.9 [legs] 腿部护胫 / 腿甲
    ctx.fillStyle = getColor('legs');
    ctx.fillRect(cx - 4.5, cy + 27.5, 3.2, 13);
    ctx.fillRect(cx + 1.3, cy + 27.5, 3.2, 13);

    // 2.10 [feet] 脚部战靴 / 铁蹄
    ctx.fillStyle = getColor('feet');
    ctx.fillRect(cx - 5.5, cy + 41, 4.2, 4);
    ctx.fillRect(cx + 1.3, cy + 41, 4.2, 4);

    // 2.11 [main_hand] 主手武器 (右手持拔起之长剑/利爪)
    ctx.strokeStyle = getColor('main_hand');
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(cx + 11, cy + 28);
    ctx.lineTo(cx + 16, cy + 8);
    ctx.stroke();
    // 剑格
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(cx + 9, cy + 26);
    ctx.lineTo(cx + 14, cy + 24);
    ctx.stroke();

    // 2.12 [off_hand] 副手防具 (左手持鸢形重盾)
    ctx.fillStyle = getColor('off_hand');
    ctx.beginPath();
    ctx.moveTo(cx - 15, cy + 20);
    ctx.lineTo(cx - 10, cy + 20);
    ctx.lineTo(cx - 10, cy + 27);
    ctx.lineTo(cx - 12.5, cy + 31);
    ctx.lineTo(cx - 15, cy + 27);
    ctx.closePath();
    ctx.fill();

    // 2.13 & 2.14 [finger1] & [finger2] 戒指 (左右手上环绕微光宝石)
    ctx.fillStyle = getColor('finger1');
    ctx.beginPath();
    ctx.arc(cx - 13.5, cy + 29, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = getColor('finger2');
    ctx.beginPath();
    ctx.arc(cx + 13.5, cy + 29, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // 2.15 & 2.16 [trinket1] & [trinket2] 饰品 (两侧浮空灵符与宝珠)
    ctx.fillStyle = getColor('trinket1');
    ctx.beginPath();
    ctx.arc(cx - 15, cy + 13, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = getColor('trinket2');
    ctx.beginPath();
    ctx.arc(cx + 15, cy + 13, 2.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // ===================== 2.5 16 部位装备与战力面板 (零贴图 · 人形图部位着色 · 净加成汇总) =====================
  renderEquipmentSheet(ctx, player, equipmentManager) {
    if (!equipmentManager) return;
    ctx.save();

    // 0. 全屏半透明磨砂遮罩
    ctx.fillStyle = 'rgba(6, 8, 14, 0.85)';
    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

    const pad = 12;
    const sheetX = pad;
    const sheetY = 32;
    const sheetW = SCREEN_WIDTH - pad * 2;
    const sheetH = Math.min(540, SCREEN_HEIGHT - 64);
    this.equipSheetBounds = { x: sheetX, y: sheetY, w: sheetW, h: sheetH };

    // 1. 面板容器底板
    this.drawRoundedRect(ctx, sheetX, sheetY, sheetW, sheetH, 16);
    ctx.fillStyle = 'rgba(16, 20, 32, 0.98)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(241, 196, 15, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 2. 标题栏
    ctx.fillStyle = '#ffd700';
    ctx.font = `bold 15px ${FONT_FAMILY}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('🛡️ 英雄全身装备 · 16部位', sheetX + 16, sheetY + 22);

    ctx.fillStyle = '#a4b0be';
    ctx.font = `9px ${FONT_FAMILY}`;
    ctx.fillText('防逆向降级保护生效中 · 传说装备终身锁定', sheetX + 16, sheetY + 38);

    // 关闭按钮 ✕
    const closeW = 26;
    const closeH = 26;
    const closeX = sheetX + sheetW - closeW - 10;
    const closeY = sheetY + 12;
    this.equipCloseArea = { x: closeX, y: closeY, w: closeW, h: closeH };

    this.drawRoundedRect(ctx, closeX, closeY, closeW, closeH, 13);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold 14px ${FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✕', closeX + closeW / 2, closeY + closeH / 2);

    // 分隔线
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.fillRect(sheetX + 12, sheetY + 50, sheetW - 24, 1);

    // 3. 核心内容区
    const contentY = sheetY + 58;
    const dollW = Math.floor((sheetW - 24) * 0.54);
    const statsW = (sheetW - 24) - dollW - 6;

    // 3.1 人形图 16 部位列表（左侧，两列八行）
    this.equipSlotAreas = [];
    const col1Slots = ['head', 'neck', 'shoulder', 'back', 'chest', 'wrist', 'hands', 'waist'];
    const col2Slots = ['legs', 'feet', 'finger1', 'finger2', 'trinket1', 'trinket2', 'main_hand', 'off_hand'];

    const colW = (dollW - 6) / 2;
    const slotH = 22;
    const slotGapY = 3.5;

    const renderSlotList = (slots, startX) => {
      for (let i = 0; i < slots.length; i++) {
        const slotKey = slots[i];
        const slotDef = EQUIPMENT_SLOTS[slotKey];
        const item = equipmentManager.equipped[slotKey];
        const rarity = item ? item.rarity : RARITIES.poor;
        const sy = contentY + i * (slotH + slotGapY);
        const isSelected = slotKey === this.selectedEquipSlot;
        const isLegend = rarity.rank === 5;

        this.equipSlotAreas.push({ x: startX, y: sy, w: colW, h: slotH, slotKey });

        // 槽位底框
        this.drawRoundedRect(ctx, startX, sy, colW, slotH, 4);
        ctx.fillStyle = isSelected ? 'rgba(40, 50, 75, 0.95)' : 'rgba(20, 24, 36, 0.88)';
        ctx.fill();

        // 边框（对应装备品质颜色）
        ctx.strokeStyle = isSelected ? '#ffffff' : (rarity.color || '#9d9d9d');
        ctx.lineWidth = isSelected ? 1.8 : (isLegend ? 1.5 : 1.0);
        ctx.stroke();

        // 部位图标 + 名称
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.font = `9px ${FONT_FAMILY}`;
        ctx.fillStyle = '#dfe6e9';
        ctx.fillText(`${slotDef.icon} ${slotDef.name}`, startX + 4, sy + slotH / 2);

        // 品质简称徽章
        ctx.textAlign = 'right';
        ctx.font = `bold 8px ${FONT_FAMILY}`;
        ctx.fillStyle = rarity.color || '#9d9d9d';
        ctx.fillText(rarity.name.slice(0, 2), startX + colW - 4, sy + slotH / 2);
      }
    };

    renderSlotList(col1Slots, sheetX + 12);
    renderSlotList(col2Slots, sheetX + 12 + colW + 6);

    // 3.2 右侧：属性总加成汇总面板
    const statsX = sheetX + 12 + dollW + 6;
    const statsH = 8 * (slotH + slotGapY) - slotGapY;

    this.drawRoundedRect(ctx, statsX, contentY, statsW, statsH, 6);
    ctx.fillStyle = 'rgba(10, 14, 24, 0.82)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 属性总览标题
    ctx.fillStyle = '#70a1ff';
    ctx.font = `bold 10px ${FONT_FAMILY}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('📊 全身净加成', statsX + 8, contentY + 12);

    // 属性行
    const stats = equipmentManager.aggregatedStats;
    const statRows = [
      { l: '⚔️ 攻击', v: `+${Math.round(stats.atk * 100)}%`, c: '#ff7675' },
      { l: '🎯 暴击', v: `+${Math.round(stats.crit * 100)}%`, c: '#ffeaa7' },
      { l: '💥 暴伤', v: `+${Math.round(stats.crit_dmg * 100)}%`, c: '#fdcb6e' },
      { l: '❤️ 生命', v: `+${Math.round(stats.hp)}`, c: '#55efc4' },
      { l: '🌿 回血', v: `+${Math.round(stats.hp_regen)}/s`, c: '#81ecec' },
      { l: '💨 闪避', v: `+${Math.round(stats.dodge * 100)}%`, c: '#74b9ff' },
      { l: '🩸 吸血', v: `+${Math.round(stats.lifesteal * 100)}%`, c: '#e17055' },
      { l: '⏱️ 冷却', v: `-${Math.round(stats.cdr * 100)}%`, c: '#a29bfe' },
      { l: '👟 移速', v: `+${Math.round(stats.move * 100)}%`, c: '#00cec9' },
      { l: '🛡️ 减伤', v: `+${Math.round(stats.dmg_reduce * 100)}%`, c: '#dfe6e9' },
    ];

    const rowH = (statsH - 24) / statRows.length;
    for (let i = 0; i < statRows.length; i++) {
      const sr = statRows[i];
      const ry = contentY + 22 + i * rowH;

      ctx.font = `8.5px ${FONT_FAMILY}`;
      ctx.textAlign = 'left';
      ctx.fillStyle = '#b2bec3';
      ctx.fillText(sr.l, statsX + 6, ry);

      ctx.textAlign = 'right';
      ctx.font = `bold 8.5px monospace`;
      ctx.fillStyle = sr.c;
      ctx.fillText(sr.v, statsX + statsW - 6, ry);
    }

    // 3.3 底部：当前选中部位装备详细拆解卡
    const detailY = contentY + statsH + 8;
    const detailH = sheetH - (detailY - sheetY) - 10;
    const detailW = sheetW - 24;
    const detailX = sheetX + 12;

    const selKey = this.selectedEquipSlot || 'main_hand';
    const selDef = EQUIPMENT_SLOTS[selKey] || EQUIPMENT_SLOTS.main_hand;
    const selItem = equipmentManager.equipped[selKey];
    const selRarity = selItem ? selItem.rarity : RARITIES.poor;

    this.drawRoundedRect(ctx, detailX, detailY, detailW, detailH, 8);
    ctx.fillStyle = 'rgba(20, 26, 42, 0.95)';
    ctx.fill();
    ctx.strokeStyle = selRarity.color || '#9d9d9d';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    if (selItem) {
      // 装备名称与品质标
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.font = `bold 12px ${FONT_FAMILY}`;
      ctx.fillStyle = selRarity.color || '#ffffff';
      const legendLock = selRarity.rank === 5 ? ' [👑 传说锁定]' : '';
      ctx.fillText(`${selDef.icon} ${selItem.name}${legendLock}`, detailX + 10, detailY + 8);

      ctx.font = `9px ${FONT_FAMILY}`;
      ctx.fillStyle = '#a4b0be';
      ctx.fillText(`部位: ${selDef.name}  |  品质: ${selRarity.name} (Rank ${selRarity.rank})`, detailX + 10, detailY + 25);

      // 词条列表
      let affixText = '词条: ';
      if (selItem.affixes && selItem.affixes.length > 0) {
        affixText += selItem.affixes.map(af => `${af.name} ${af.format === 'pct' ? '+' + Math.round(af.value * 100) + '%' : '+' + Math.round(af.value)}`).join('  |  ');
      } else {
        affixText += '基础粗糙装备，无额外词条';
      }
      ctx.fillStyle = '#dfe6e9';
      ctx.font = `9.5px ${FONT_FAMILY}`;
      this.wrapText(ctx, affixText, detailX + 10, detailY + 40, detailW - 20, 14, 2);

      // 元素与专属词条 (史诗/传说独占)
      let extraY = detailY + 58;
      if (selItem.element) {
        ctx.fillStyle = '#ffd700';
        ctx.font = `bold 9.5px ${FONT_FAMILY}`;
        ctx.fillText(`🔥 五行属性: ${selItem.element.name} (元素伤害 +${Math.round(selItem.element.bonus * 100)}%)`, detailX + 10, extraY);
        extraY += 15;
      }
      if (selItem.unique) {
        ctx.fillStyle = '#ff9f43';
        ctx.font = `bold 9.5px ${FONT_FAMILY}`;
        ctx.fillText(`👑 专属特异: 【${selItem.unique.name}】${selItem.unique.desc}`, detailX + 10, extraY);
      }
    }

    ctx.restore();
  }

  // ===================== 3. 升级三选一面板 (奢华卡牌设计，无模糊无截断) =====================
  renderLevelUpModal(ctx, player = null) {
    ctx.save();

    // 暗黑沉浸式半透明遮罩
    ctx.fillStyle = 'rgba(6, 8, 14, 0.88)';
    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

    // 顶部发光金字横幅
    const breath = Math.sin(this.animPulse * 2.2) * 0.18 + 0.82;
    ctx.save();
    ctx.fillStyle = this.themeColor('accent');
    ctx.shadowBlur = 18 * breath;
    ctx.shadowColor = this.themeColor('panelBorder');
    ctx.font = `bold 22px ${FONT_FAMILY}`;
    ctx.textAlign = 'center';
    const bannerY = Math.max(76, SCREEN_HEIGHT * 0.13);
    ctx.fillText('★ 境界突破 · 命运三选一 ★', SCREEN_WIDTH / 2, bannerY);
    ctx.restore();

    ctx.fillStyle = '#b2bec3';
    ctx.font = `12px ${FONT_FAMILY}`;
    ctx.textAlign = 'center';
    const subText = (player && player.pendingLevelUps > 1)
      ? `领悟一项绝学或强化战技 (连续突破：尚余 ${player.pendingLevelUps} 次选择)`
      : '领悟一项绝学或强化战技，大幅跃升战斗流派境界';
    ctx.fillText(subText, SCREEN_WIDTH / 2, bannerY + 24);

    this.upgradeCardAreas = [];
    const cardW = SCREEN_WIDTH - 28;
    const cardH = 120; // 充足高度，确保3行长文本与按钮毫无遮挡！
    const startY = bannerY + 42;
    const gap = 14;

    this.upgradeChoices.forEach((choice, index) => {
      const cy = startY + index * (cardH + gap);
      const cx = 14;

      this.upgradeCardAreas.push({ index, x: cx, y: cy, w: cardW, h: cardH, choice });
      const isMythic = choice.isMythic;
      const isUltra = choice.isUltimate;
      const isAffinity = choice.isAffinity;
      const schoolColor = choice.skill.color || this.themeColor('accent');

      const cat = CATEGORY_MAP[choice.category] || { name: '通用', color: this.themeColor('accent'), icon: '✨' };
      const ele = ELEMENT_MAP[choice.element] || { name: '无', color: '#bdc3c7', icon: '🌀' };

      // 1. 卡片主体背景 (根据境界区分：神话金、超武赤红、常规深曜石)
      this.drawRoundedRect(ctx, cx, cy, cardW, cardH, 12);
      const cardGrad = ctx.createLinearGradient(cx, cy, cx + cardW, cy + cardH);
      if (isMythic) {
        cardGrad.addColorStop(0, 'rgba(48, 38, 12, 0.98)');
        cardGrad.addColorStop(1, 'rgba(22, 17, 6, 0.98)');
      } else if (isUltra) {
        cardGrad.addColorStop(0, 'rgba(45, 15, 25, 0.98)');
        cardGrad.addColorStop(1, 'rgba(20, 8, 14, 0.98)');
      } else {
        cardGrad.addColorStop(0, 'rgba(22, 28, 42, 0.97)');
        cardGrad.addColorStop(1, 'rgba(12, 16, 26, 0.97)');
      }
      ctx.fillStyle = cardGrad;
      ctx.fill();

      // 2. 卡片边框与外发光
      ctx.save();
      const borderColor = isMythic ? this.themeColor('accent') : (isUltra ? this.themeColor('softPrimary') : schoolColor);
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = isMythic ? 2.6 : (isUltra ? 2.4 : 1.8);
      ctx.shadowBlur = isMythic ? 18 : (isUltra ? 16 : 8);
      ctx.shadowColor = isMythic ? this.themeColor('panelBorder') : (isUltra ? '#ff8a80' : schoolColor);
      ctx.stroke();
      ctx.restore();

      // 3. 左侧技能法球勋章 (Jewel Medallion)
      const medX = cx + 40;
      const medY = cy + cardH / 2 - 6;
      const medR = 26;

      ctx.save();
      // 双层金属边框
      ctx.beginPath();
      ctx.arc(medX, medY, medR + 2, 0, Math.PI * 2);
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 2.2;
      ctx.stroke();

      // 内部流光球体渐变
      const sphereGrad = ctx.createRadialGradient(
        medX - 6, medY - 6, 2,
        medX, medY, medR
      );
      sphereGrad.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
      if (isMythic) {
        sphereGrad.addColorStop(0.3, 'rgba(241, 196, 15, 0.68)');
      } else if (isUltra) {
        sphereGrad.addColorStop(0.3, 'rgba(231, 76, 60, 0.65)');
      } else {
        sphereGrad.addColorStop(0.3, `${schoolColor}99`);
      }
      sphereGrad.addColorStop(1, 'rgba(10, 14, 22, 0.95)');
      ctx.fillStyle = sphereGrad;
      ctx.beginPath();
      ctx.arc(medX, medY, medR, 0, Math.PI * 2);
      ctx.fill();

      // 图标文字
      ctx.font = `26px ${FONT_FAMILY}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(choice.skill.icon, medX, medY + 1);

      // 勋章下方紧凑等级标牌
      const pillW = 52;
      const pillH = 16;
      const pillX = medX - pillW / 2;
      const pillY = medY + medR - 6;
      this.drawRoundedRect(ctx, pillX, pillY, pillW, pillH, 8);
      if (isMythic) {
        ctx.fillStyle = this.themeColor('panelBorder');
      } else if (choice.curLvl === 0) {
        ctx.fillStyle = this.themeColor('success');
      } else if (isUltra) {
        ctx.fillStyle = this.themeColor('primary');
      } else {
        ctx.fillStyle = '#3a3550';
      }
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = `bold 10px ${FONT_FAMILY}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      let badgeText = `Lv.${choice.nextLvl}`;
      if (isMythic) badgeText = 'Lv.6极境';
      else if (choice.curLvl === 0) badgeText = '★ NEW';
      else if (isUltra) badgeText = 'Lv.5超武';
      ctx.fillText(badgeText, pillX + pillW / 2, pillY + pillH / 2);
      ctx.restore();

      // 4. 右侧内容信息排版
      const textX = cx + 78;
      const textW = cardW - 88;

      // 第一行：【派系·属性】微型徽章 + 技能名称 + 天命共鸣标 + 星级进度
      ctx.save();
      const schoolTag = `【${cat.name}·${ele.name}】`;
      ctx.font = `bold 10.5px ${FONT_FAMILY}`;
      const tagW = ctx.measureText(schoolTag).width + 6;
      this.drawRoundedRect(ctx, textX, cy + 13, tagW, 18, 4);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.fill();
      ctx.strokeStyle = cat.color;
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.fillStyle = cat.color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(schoolTag, textX + tagW / 2, cy + 22);

      let currentX = textX + tagW + 6;

      // 若为种族共鸣天命技能，展示专属【⭐天命突破】徽章
      if (isAffinity) {
        const affTag = '⭐天命';
        ctx.font = `bold 9.5px ${FONT_FAMILY}`;
        const affW = ctx.measureText(affTag).width + 6;
        this.drawRoundedRect(ctx, currentX, cy + 14, affW, 16, 4);
        ctx.fillStyle = this.themeColor('panelBorder');
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(affTag, currentX + affW / 2, cy + 22);
        currentX += affW + 6;
      }

      // 技能名称
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      if (isMythic) {
        ctx.fillStyle = this.themeColor('accent');
      } else if (isUltra) {
        ctx.fillStyle = this.themeColor('softPrimary');
      } else {
        ctx.fillStyle = '#ffffff';
      }
      ctx.font = `bold 14px ${FONT_FAMILY}`;
      ctx.fillText(choice.name, currentX, cy + 22);

      // 右侧星级评分（支持最高 Lv.6 极境之星）
      let starStr = '';
      const maxStar = choice.maxLvl || 5;
      for (let s = 1; s <= maxStar; s++) {
        starStr += s <= choice.nextLvl ? '★' : '☆';
      }
      ctx.textAlign = 'right';
      ctx.font = `11.5px ${FONT_FAMILY}`;
      ctx.fillStyle = isMythic ? this.themeColor('accent') : this.themeColor('accent');
      ctx.fillText(starStr, cx + cardW - 12, cy + 22);
      ctx.restore();

      // 第二行：境界突破状态提示
      ctx.save();
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      if (isMythic) {
        ctx.fillStyle = this.themeColor('accent');
        ctx.font = `bold 11px ${FONT_FAMILY}`;
        ctx.fillText('★ [天命极境·神话突破] 突破凡境上限至Lv.6！种族专属终极奥义！', textX, cy + 46);
      } else if (isUltra) {
        ctx.fillStyle = this.themeColor('softPrimary');
        ctx.font = `bold 11px ${FONT_FAMILY}`;
        ctx.fillText('★ [超武觉醒·全图质变] 激活Lv.5终极神奥形态，毁天灭地！', textX, cy + 46);
      } else {
        ctx.fillStyle = '#8ec9ff';
        ctx.font = `11px ${FONT_FAMILY}`;
        const lvlTip = choice.curLvl === 0
          ? '✨ 参悟全新流派绝学'
          : `⚡ 境界进阶：Lv.${choice.curLvl} ➔ Lv.${choice.nextLvl}（威力全面跃升）`;
        ctx.fillText(lvlTip, textX, cy + 46);
      }
      ctx.restore();

      // 第三行至第四行：技能效果详情完整排版
      ctx.save();
      ctx.fillStyle = '#ecf0f1';
      ctx.font = `11.5px ${FONT_FAMILY}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      this.wrapText(ctx, choice.desc, textX, cy + 64, textW - 4, 16, 3);
      ctx.restore();

      // 右下角“领悟升级”灵动按钮
      const btnPillW = 76;
      const btnPillH = 22;
      const btnPillX = cx + cardW - btnPillW - 12;
      const btnPillY = cy + cardH - btnPillH - 8;

      this.drawRoundedRect(ctx, btnPillX, btnPillY, btnPillW, btnPillH, 11);
      const btnGrad = ctx.createLinearGradient(btnPillX, btnPillY, btnPillX + btnPillW, btnPillY);
      if (isMythic) {
        btnGrad.addColorStop(0, '#ff9a4d');
        btnGrad.addColorStop(1, this.themeColor('accent'));
      } else if (isUltra) {
        btnGrad.addColorStop(0, this.themeColor('danger'));
        btnGrad.addColorStop(1, this.themeColor('primary'));
      } else {
        btnGrad.addColorStop(0, this.themeColor('panelBorder'));
        btnGrad.addColorStop(1, this.themeColor('panelBorder'));
      }
      ctx.fillStyle = btnGrad;
      ctx.fill();

      ctx.strokeStyle = isMythic ? this.themeColor('accent') : '#ffeaa7';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = `bold 10.5px ${FONT_FAMILY}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      let btnLabel = '领悟升级';
      if (isMythic) btnLabel = '神化破境';
      else if (isUltra) btnLabel = '超武觉醒';
      ctx.fillText(btnLabel, btnPillX + btnPillW / 2, btnPillY + btnPillH / 2);
    });

    // 底部防误触状态提示
    const isLocked = this.levelUpOpenTime && (Date.now() - this.levelUpOpenTime < 500);
    ctx.fillStyle = isLocked ? this.themeColor('softPrimary') : this.themeColor('info');
    ctx.font = `bold 12px ${FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(isLocked ? '⏳ 正在凝神感悟... (防误触保护中)' : '👆 点击卡牌领悟绝学战技', SCREEN_WIDTH / 2, SCREEN_HEIGHT - 28);

    ctx.restore();
  }

  // ===================== 4. 结算界面 =====================
  renderGameOver(ctx, player, gameData, learnedSkills) {
    ctx.save();

    const victory = GameGlobal.databus ? GameGlobal.databus.victory : false;

    ctx.fillStyle = 'rgba(20, 16, 40, 0.92)';
    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

    ctx.fillStyle = victory ? this.themeColor('accent') : this.themeColor('softPrimary');
    ctx.shadowBlur = 18;
    ctx.shadowColor = victory ? '#f1c40f' : '#ff8a80';
    ctx.font = `bold 30px ${FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.fillText(victory ? '🏆 通 关 胜 利' : '冒 险 结 束', SCREEN_WIDTH / 2, SCREEN_HEIGHT * 0.2);

    ctx.fillStyle = '#bdc3c7';
    ctx.shadowBlur = 0;
    ctx.font = `13px ${FONT_FAMILY}`;
    ctx.fillText(
      victory ? '恭喜！你击败了母巢主脑，地球守住了！' : '小动物们在这场星际冒险中勇敢作战...',
      SCREEN_WIDTH / 2, SCREEN_HEIGHT * 0.2 + 30
    );

    const panelW = SCREEN_WIDTH - 48;
    const panelH = 185;
    const panelX = 24;
    const panelY = SCREEN_HEIGHT * 0.35;

    this.drawRoundedRect(ctx, panelX, panelY, panelW, panelH, 10);
    ctx.fillStyle = 'rgba(42, 37, 64, 0.9)';
    ctx.fill();
    ctx.strokeStyle = this.themeColor('panelBorder');
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = this.themeColor('accent');
    ctx.font = `bold 15px ${FONT_FAMILY}`;
    ctx.textAlign = 'left';
    ctx.fillText('战役丰碑', panelX + 20, panelY + 28);

    const minutes = Math.floor(gameData.time / 60);
    const seconds = Math.floor(gameData.time % 60);
    const timeStr = `${minutes} 分 ${seconds} 秒`;

    ctx.fillStyle = '#ffffff';
    ctx.font = `13px ${FONT_FAMILY}`;
    ctx.fillText(`存活时间：${timeStr}`, panelX + 20, panelY + 62);
    ctx.fillText(`击退外星人：${gameData.kills} 只`, panelX + 20, panelY + 92);
    ctx.fillText(`最终等级：Lv.${player.level}`, panelX + 20, panelY + 122);
    ctx.fillText(`角色身份：${player.raceData.icon} ${player.raceData.name} · ${player.classData.name}`, panelX + 20, panelY + 152);

    const btnW = SCREEN_WIDTH - 60;
    const btnH = 48;
    const btnX = 30;
    const btnY = panelY + panelH + 30;
    this.restartBtnArea = { x: btnX, y: btnY, w: btnW, h: btnH };

    this.drawRoundedRect(ctx, btnX, btnY, btnW, btnH, 10);
    const btnGrad = ctx.createLinearGradient(btnX, btnY, btnX + btnW, btnY);
    btnGrad.addColorStop(0, this.themeColor('danger'));
    btnGrad.addColorStop(1, this.themeColor('primary'));
    ctx.fillStyle = btnGrad;
    ctx.fill();

    ctx.strokeStyle = this.themeColor('softPrimary');
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold 17px ${FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('再次出征 · 重新开始', btnX + btnW / 2, btnY + btnH / 2);


    ctx.restore();
  }

  drawRoundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 4) {
    let line = '';
    let lineCount = 0;
    for (let n = 0; n < text.length; n++) {
      const testLine = line + text[n];
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
        lineCount++;
        if (lineCount >= maxLines) {
          ctx.fillText(line + '...', x, y);
          return;
        }
        ctx.fillText(line, x, y);
        line = text[n];
        y += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, y);
  }

  // ===================== 触控交互处理 =====================
  handleTouch(e) {
    const touch = (e.changedTouches && e.changedTouches[0]) || (e.touches && e.touches[0]);
    if (!touch) return;
    const { clientX: x, clientY: y } = touch;
    this.lastTouchY = y;
    const state = GameGlobal.databus ? GameGlobal.databus.state : 'SELECT';

    // 0. 装备总览面板交互拦截 (最高优先级，模态隔离)
    if (this.showEquipmentSheet) {
      if (this.equipCloseArea && this.isInArea(x, y, this.equipCloseArea)) {
        this.showEquipmentSheet = false;
        try { wx.vibrateShort({ type: 'light' }); } catch (err) {}
        return;
      }
      for (let i = 0; i < this.equipSlotAreas.length; i++) {
        const area = this.equipSlotAreas[i];
        if (this.isInArea(x, y, area)) {
          this.selectedEquipSlot = area.slotKey;
          try { wx.vibrateShort({ type: 'light' }); } catch (err) {}
          return;
        }
      }
      // 点击面板外部区域直接关闭
      if (this.equipSheetBounds && !this.isInArea(x, y, this.equipSheetBounds)) {
        this.showEquipmentSheet = false;
        try { wx.vibrateShort({ type: 'light' }); } catch (err) {}
        return;
      }
      return;
    }

    // 0.1 战斗中打开装备面板入口 (左下角剪影、右下角属性面板、角色卡片、左上角胶囊)
    if (state === 'PLAYING' || state === 'LEVEL_UP') {
      if (this.silhouetteArea && this.isInArea(x, y, this.silhouetteArea)) {
        this.showEquipmentSheet = true;
        try { wx.vibrateShort({ type: 'light' }); } catch (err) {}
        return;
      }
      if (this.hudStatsArea && this.isInArea(x, y, this.hudStatsArea)) {
        this.showEquipmentSheet = true;
        try { wx.vibrateShort({ type: 'light' }); } catch (err) {}
        return;
      }
      if (this.hudAvatarArea && this.isInArea(x, y, this.hudAvatarArea)) {
        this.showEquipmentSheet = true;
        try { wx.vibrateShort({ type: 'light' }); } catch (err) {}
        return;
      }
    }

    // 0.2 重新挑战拦截 (测试与重开便捷按钮 → 从选人界面重新开始)
    if ((state === 'PLAYING' || state === 'LEVEL_UP') && this.retryBtnArea && this.isInArea(x, y, this.retryBtnArea)) {
      if (typeof wx !== 'undefined' && wx.showModal) {
        wx.showModal({
          title: '重开对决',
          content: '是否放弃当前战局，回到选人界面重新开始？',
          success: (res) => {
            if (res.confirm) {
              this.selectStep = 'RACE';
              this.emit('restartGame');
            }
          }
        });
      } else {
        this.selectStep = 'RACE';
        this.showEquipmentSheet = false;
        this.emit('restartGame');
      }
      return;
    }

    // 1. 选人阶段触控 (分步模式：选种族图片看简介 -> 确认选职业图片看简介 -> 可返回重选)
    if (state === 'SELECT') {
      // 成就面板打开时：只响应关闭按钮
      if (this.showAchievements) {
        if (this.achievementCloseArea && this.isInArea(x, y, this.achievementCloseArea)) {
          this.showAchievements = false;
          this.achievementCloseArea = null;
          try { wx.vibrateShort({ type: 'light' }); } catch (err) {}
        }
        return;
      }

      // 成就入口按钮
      if (this.achievementBtnArea && this.isInArea(x, y, this.achievementBtnArea)) {
        this.showAchievements = true;
        try { wx.vibrateShort({ type: 'light' }); } catch (err) {}
        return;
      }

      if (this.selectStep === 'RACE') {
        // 1.1 点击种族图片查看简介
        for (let i = 0; i < this.raceClickAreas.length; i++) {
          const area = this.raceClickAreas[i];
          if (this.isInArea(x, y, area)) {
            this.selectedRaceId = area.id;
            try { wx.vibrateShort({ type: 'light' }); } catch (err) {}
            return;
          }
        }

        // 1.2 点击确认前往选职业
        if (this.confirmRaceBtnArea && this.isInArea(x, y, this.confirmRaceBtnArea)) {
          this.selectStep = 'CLASS';
          this.confirmRaceBtnArea = null;
          this.raceClickAreas = [];
          try { wx.vibrateShort({ type: 'medium' }); } catch (err) {}
          return;
        }
        return;
      }

      if (this.selectStep === 'CLASS') {
        // 1.3 点击返回重新选种族
        if (this.backToRaceBtnArea && this.isInArea(x, y, this.backToRaceBtnArea)) {
          this.selectStep = 'RACE';
          this.backToRaceBtnArea = null;
          this.startBtnArea = null;
          this.classClickAreas = [];
          try { wx.vibrateShort({ type: 'light' }); } catch (err) {}
          return;
        }

        // 1.4 点击职业图片查看简介
        for (let i = 0; i < this.classClickAreas.length; i++) {
          const area = this.classClickAreas[i];
          if (this.isInArea(x, y, area)) {
            this.selectedClassId = area.id;
            try { wx.vibrateShort({ type: 'light' }); } catch (err) {}
            return;
          }
        }

        // 1.5 点击确认开始战斗
        if (this.startBtnArea && this.isInArea(x, y, this.startBtnArea)) {
          this.showEquipmentSheet = false;
          this.emit('startGame', { raceId: this.selectedRaceId, classId: this.selectedClassId });
          this.selectStep = 'RACE'; // 重置备用
          this.startBtnArea = null;
          this.backToRaceBtnArea = null;
          this.classClickAreas = [];
          try { wx.vibrateShort({ type: 'medium' }); } catch (err) {}
          return;
        }
        return;
      }
      return;
    }

    // 2. 升级三选一阶段触控 (500ms 安全锁，彻底杜绝拖拽误触技能)
    if (state === 'LEVEL_UP') {
      if (this.levelUpOpenTime && Date.now() - this.levelUpOpenTime < 500) {
        return; // 锁死前半秒
      }

      for (let i = 0; i < this.upgradeCardAreas.length; i++) {
        const card = this.upgradeCardAreas[i];
        if (this.isInArea(x, y, card)) {
          this.emit('selectUpgrade', card.choice.id);
          this.upgradeCardAreas = [];
          this.levelUpOpenTime = 0;
          try { wx.vibrateShort({ type: 'medium' }); } catch (err) {}
          return;
        }
      }
      return;
    }

    // 3. 游戏结束阶段触控
    if (state === 'GAME_OVER') {
      if (this.restartBtnArea && this.isInArea(x, y, this.restartBtnArea)) {
        this.selectStep = 'RACE';
        this.showEquipmentSheet = false;
        this.emit('restartGame');
        this.restartBtnArea = null;
        try { wx.vibrateShort({ type: 'medium' }); } catch (err) {}
        return;
      }
      return;
    }
  }

  handleTouchMove(e) {
    const touch = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]);
    if (!touch) return;
    if (this.showAchievements && this.lastTouchY !== undefined) {
      const deltaY = touch.clientY - this.lastTouchY;
      this.lastTouchY = touch.clientY;
      const maxScroll = this.maxAchievementScroll || 400;
      this.achievementScroll = Math.max(0, Math.min(maxScroll, (this.achievementScroll || 0) - deltaY));
    }
  }

  handleTouchEnd() {
    this.lastTouchY = undefined;
  }

  isInArea(x, y, area) {
    return x >= area.x && x <= area.x + area.w && y >= area.y && y <= area.y + area.h;
  }
}
