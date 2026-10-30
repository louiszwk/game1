/**
 * 魔兽动物肉鸽 - 高清精品游戏UI系统
 * 包含：精致选人界面、奢华角色战斗HUD、命运三选一卡片面板、结算界面
 */

import Emitter from '../libs/tinyemitter';
import { SCREEN_WIDTH, SCREEN_HEIGHT } from '../render';
import { RACES, CLASSES, SKILLS, CATEGORY_MAP, ELEMENT_MAP } from '../skills/skill_data';

const FONT_FAMILY = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif';

export default class GameUI extends Emitter {
  constructor() {
    super();

    // 默认选定角色
    this.selectedRaceId = 'chicken';
    this.selectedClassId = 'warrior';

    // 选人交互阶段：'RACE' (选种族) | 'CLASS' (选职业)
    this.selectStep = 'RACE';

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

    // 升级三选一选项
    this.upgradeChoices = [];
    this.animPulse = 0;

    // 触控监听
    wx.onTouchStart(this.handleTouch.bind(this));
  }

  showWaveAlert(waveNum, title) {
    this.waveAlert = { wave: waveNum, title: title, timer: 150, maxTimer: 150 };
    try { wx.vibrateShort({ type: 'heavy' }); } catch (e) {}
  }

  generateUpgradeChoices(learnedSkills, player = null) {
    this.levelUpOpenTime = Date.now(); // 启动 500ms 安全防误触锁
    const allKeys = Object.keys(SKILLS);
    const available = [];

    allKeys.forEach((key) => {
      // 1. 职业修习禁忌判定 (如：圣骑士禁修邪能/死亡，术士禁修神圣) & 种族专属特技判定
      if (player && typeof player.canLearnSkill === 'function') {
        if (!player.canLearnSkill(key)) return;
      }

      // 2. 最大等级判定 (种族共鸣技能上限可突破至 Lv.6 神话极境！)
      const currentLvl = learnedSkills[key] || 0;
      const maxLvl = (player && typeof player.getMaxSkillLevel === 'function')
        ? player.getMaxSkillLevel(key)
        : (SKILLS[key].maxLevel || 5);

      if (currentLvl < maxLvl) {
        available.push(key);
      }
    });

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
  render(ctx, gameState, player, gameData, learnedSkills) {
    this.animPulse += 0.05;

    if (gameState === 'SELECT') {
      this.renderSelectScreen(ctx, player);
    } else if (gameState === 'PLAYING') {
      this.renderHUD(ctx, player, gameData, learnedSkills);
    } else if (gameState === 'LEVEL_UP') {
      this.renderHUD(ctx, player, gameData, learnedSkills);
      this.renderLevelUpModal(ctx);
    } else if (gameState === 'GAME_OVER') {
      this.renderGameOver(ctx, player, gameData, learnedSkills);
    }
  }

  // ===================== 1. 两阶段深度选人系统 (选种族 -> 选职业) =====================

  renderSelectScreen(ctx, player) {
    ctx.save();

    // 暗黑魔幻沉浸式星夜渐变背景
    const bgGrad = ctx.createRadialGradient(
      SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, 40,
      SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, SCREEN_HEIGHT * 0.8
    );
    bgGrad.addColorStop(0, '#151922');
    bgGrad.addColorStop(0.5, '#0e1219');
    bgGrad.addColorStop(1, '#06080b');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

    // 赛博深空战术网格
    this.drawTacticalGrid(ctx);

    // 根据选人阶段分屏展示
    if (this.selectStep === 'RACE') {
      this.renderRaceSelectStep(ctx, player);
    } else {
      this.renderClassSelectStep(ctx, player);
    }

    ctx.restore();
  }

  // --------------------- 阶段一：选择动物灵兽通灵 (热血漫画展台布局) ---------------------
  renderRaceSelectStep(ctx, player) {
    this.raceClickAreas = [];
    this.confirmRaceBtnArea = null;

    const selRace = RACES[this.selectedRaceId] || RACES.chicken;
    const marginX = 16;

    // 1. 顶部热血胶囊导航：[ ◈ 01 灵兽通灵 ] ──➔ [ 02 职业卍解 ]
    const topBarY = 18;
    const navW = SCREEN_WIDTH - marginX * 2;
    const navH = 38;
    this.drawRoundedRect(ctx, marginX, topBarY, navW, navH, 8);
    ctx.fillStyle = 'rgba(20, 20, 20, 0.9)';
    ctx.fill();
    ctx.strokeStyle = '#e74c3c'; // 热血红边
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = `bold 14px ${FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ff7675';
    ctx.fillText('◈ 01 灵兽通灵', marginX + navW * 0.28, topBarY + navH / 2);
    ctx.fillStyle = '#636e72';
    ctx.fillText('──➔', marginX + navW * 0.5, topBarY + navH / 2);
    ctx.fillText('02 职业卍解', marginX + navW * 0.72, topBarY + navH / 2);

    // 2. 核心展台：全息阵法通灵台
    const stageY = topBarY + navH + 15;
    const stageH = Math.max(270, SCREEN_HEIGHT * 0.43);
    const stageW = SCREEN_WIDTH - marginX * 2;

    this.drawRoundedRect(ctx, marginX, stageY, stageW, stageH, 12);
    ctx.fillStyle = 'rgba(15, 15, 18, 0.95)';
    ctx.fill();
    ctx.strokeStyle = selRace.color || '#e74c3c';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const centerX = SCREEN_WIDTH / 2;
    const heroY = stageY + stageH * 0.45;

    // 全息通灵阵法底座
    this.drawHoloBase(ctx, centerX, heroY + 35, 48);

    // 1.9x 放大版动态英雄模型
    this.drawAnimalAvatar(ctx, selRace.id, centerX, heroY, 1.9, player);

    // 霸气称号与名字
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = `900 24px ${FONT_FAMILY}`;
    ctx.fillText(`${selRace.icon} ${selRace.name}`, centerX, stageY + stageH * 0.73);

    ctx.fillStyle = selRace.color || '#e74c3c';
    ctx.font = `bold 13px ${FONT_FAMILY}`;
    ctx.fillText(`【 ${selRace.title} 】`, centerX, stageY + stageH * 0.82);

    // 3. 战术标签胶囊 (斜切卷轴风)
    const tags = selRace.tags || [selRace.icon, '血脉觉醒', '专属特技'];
    const tagCount = tags.length;
    const tagW = 74;
    const tagH = 22;
    const tagGap = 10;
    let tagStartX = centerX - ((tagCount * tagW + (tagCount - 1) * tagGap) / 2);
    const tagY = stageY + stageH * 0.88;

    tags.forEach((tagText) => {
      ctx.beginPath();
      ctx.moveTo(tagStartX + 6, tagY);
      ctx.lineTo(tagStartX + tagW, tagY);
      ctx.lineTo(tagStartX + tagW - 6, tagY + tagH);
      ctx.lineTo(tagStartX, tagY + tagH);
      ctx.closePath();

      ctx.fillStyle = 'rgba(231, 76, 60, 0.15)';
      ctx.fill();
      ctx.strokeStyle = selRace.color || '#ff7675';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = `bold 11px ${FONT_FAMILY}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(tagText, tagStartX + tagW / 2, tagY + tagH / 2);
      tagStartX += tagW + tagGap;
    });

    // 4. 血脉神技概览卡片 (硬朗线条)
    const skillCardY = stageY + stageH + 12;
    const skillCardH = 48;
    this.drawRoundedRect(ctx, marginX, skillCardY, stageW, skillCardH, 8);
    ctx.fillStyle = 'rgba(25, 25, 30, 0.9)';
    ctx.fill();
    ctx.strokeStyle = '#f1c40f'; // 金色神技边框
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const racialSkill = SKILLS[selRace.racialSkillId];
    if (racialSkill) {
      ctx.font = `20px ${FONT_FAMILY}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(racialSkill.icon || '⚡', marginX + 26, skillCardY + skillCardH / 2);

      ctx.textAlign = 'left';
      ctx.fillStyle = '#f1c40f';
      ctx.font = `900 13px ${FONT_FAMILY}`;
      ctx.fillText(`血脉奥义 · ${racialSkill.name}`, marginX + 48, skillCardY + 17);

      ctx.fillStyle = '#b2bec3';
      ctx.font = `11px ${FONT_FAMILY}`;
      ctx.fillText(racialSkill.desc ? racialSkill.desc.slice(0, 24) + '...' : '专属被动/主动流派加成', marginX + 48, skillCardY + 34);
    }

    // 5. 底部横排微光轮播选择器 (等宽卷轴卡)
    const raceKeys = Object.keys(RACES);
    const selectorY = skillCardY + skillCardH + 12;
    const cardGap = 8;
    const cardW = Math.floor((stageW - (raceKeys.length - 1) * cardGap) / raceKeys.length);
    const cardH = 62;

    raceKeys.forEach((key, index) => {
      const race = RACES[key];
      const isSelected = this.selectedRaceId === key;
      const cx = marginX + index * (cardW + cardGap);
      const cy = isSelected ? selectorY - 4 : selectorY;

      this.raceClickAreas.push({ id: key, x: cx, y: cy, w: cardW, h: cardH });

      this.drawRoundedRect(ctx, cx, cy, cardW, cardH, 6);
      ctx.fillStyle = isSelected ? 'rgba(231, 76, 60, 0.25)' : 'rgba(30, 30, 35, 0.8)';
      ctx.fill();
      ctx.strokeStyle = isSelected ? '#ff7675' : '#4b4b4b';
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.stroke();

      const iconY = cy + 22;
      this.drawAnimalAvatar(ctx, key, cx + cardW / 2, iconY, 0.7, player);

      ctx.fillStyle = isSelected ? '#ffffff' : '#a4b0be';
      ctx.font = `900 11px ${FONT_FAMILY}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(race.name, cx + cardW / 2, cy + cardH - 10);
    });

    // 6. 底部热血结印确认大按钮
    const btnY = SCREEN_HEIGHT - 60;
    const btnH = 46;
    this.confirmRaceBtnArea = { x: marginX, y: btnY, w: stageW, h: btnH };

    const btnGrad = ctx.createLinearGradient(marginX, btnY, marginX + stageW, btnY);
    btnGrad.addColorStop(0, '#c0392b');
    btnGrad.addColorStop(1, '#e74c3c');
    this.drawRoundedRect(ctx, marginX, btnY, stageW, btnH, 8);
    ctx.fillStyle = btnGrad;
    ctx.fill();
    ctx.strokeStyle = '#ff7675';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = `900 16px ${FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`确认【${selRace.name}】· 觉醒职业 ➔`, marginX + stageW / 2, btnY + btnH / 2);
  }

  // --------------------- 阶段二：选择职业卍解 (热血漫画展台布局) ---------------------
  renderClassSelectStep(ctx, player) {
    this.classClickAreas = [];
    this.backToRaceBtnArea = null;
    this.startBtnArea = null;

    const selRace = RACES[this.selectedRaceId] || RACES.chicken;
    const selClass = CLASSES[this.selectedClassId] || CLASSES.warrior;
    const marginX = 16;

    // 1. 顶部热血胶囊导航
    const topBarY = 18;
    const navW = SCREEN_WIDTH - marginX * 2;
    const navH = 38;
    this.drawRoundedRect(ctx, marginX, topBarY, navW, navH, 8);
    ctx.fillStyle = 'rgba(20, 20, 20, 0.9)';
    ctx.fill();
    ctx.strokeStyle = '#f1c40f'; // 卍解金边
    ctx.lineWidth = 2;
    ctx.stroke();

    this.backToRaceBtnArea = { x: marginX, y: topBarY, w: navW * 0.45, h: navH };

    ctx.font = `bold 13px ${FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#a4b0be';
    ctx.fillText(`◂ ${selRace.icon} ${selRace.name} (重选)`, marginX + navW * 0.25, topBarY + navH / 2);
    ctx.fillStyle = '#f1c40f';
    ctx.fillText('➔  ◈ 02 职业卍解', marginX + navW * 0.72, topBarY + navH / 2);

    // 2. 核心职业展台
    const stageY = topBarY + navH + 15;
    const stageH = Math.max(270, SCREEN_HEIGHT * 0.43);
    const stageW = SCREEN_WIDTH - marginX * 2;

    this.drawRoundedRect(ctx, marginX, stageY, stageW, stageH, 12);
    ctx.fillStyle = 'rgba(15, 15, 18, 0.95)';
    ctx.fill();
    ctx.strokeStyle = selClass.color || '#f1c40f';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const centerX = SCREEN_WIDTH / 2;
    const emblemY = stageY + stageH * 0.45;

    this.drawHoloBase(ctx, centerX, emblemY + 35, 48);
    this.drawClassEmblem(ctx, selClass.id, centerX, emblemY, 1.85);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = `900 24px ${FONT_FAMILY}`;
    ctx.fillText(`${selClass.icon} ${selClass.name}`, centerX, stageY + stageH * 0.73);

    ctx.fillStyle = selClass.color || '#f1c40f';
    ctx.font = `bold 13px ${FONT_FAMILY}`;
    ctx.fillText(`【 ${selClass.title} 】`, centerX, stageY + stageH * 0.82);

    // 战术卷轴标签
    const tags = [selClass.schoolAffinity ? `${selClass.schoolAffinity.toUpperCase()}系` : '全能', `基础生命 ${selClass.baseHp}`, '专精爆发'];
    const tagCount = tags.length;
    const tagW = 74;
    const tagH = 22;
    const tagGap = 10;
    let tagStartX = centerX - ((tagCount * tagW + (tagCount - 1) * tagGap) / 2);
    const tagY = stageY + stageH * 0.88;

    tags.forEach((tagText) => {
      ctx.beginPath();
      ctx.moveTo(tagStartX + 6, tagY);
      ctx.lineTo(tagStartX + tagW, tagY);
      ctx.lineTo(tagStartX + tagW - 6, tagY + tagH);
      ctx.lineTo(tagStartX, tagY + tagH);
      ctx.closePath();
      
      ctx.fillStyle = 'rgba(241, 196, 15, 0.15)';
      ctx.fill();
      ctx.strokeStyle = selClass.color || '#f1c40f';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = `bold 11px ${FONT_FAMILY}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(tagText, tagStartX + tagW / 2, tagY + tagH / 2);
      tagStartX += tagW + tagGap;
    });

    // 3. 初始奥义卡片
    const skillCardY = stageY + stageH + 12;
    const skillCardH = 48;
    this.drawRoundedRect(ctx, marginX, skillCardY, stageW, skillCardH, 8);
    ctx.fillStyle = 'rgba(25, 25, 30, 0.9)';
    ctx.fill();
    ctx.strokeStyle = selClass.color || '#3498db';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const initSkillInfo = this.getClassSkillPreview(selClass.id);
    ctx.font = `20px ${FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚔️', marginX + 26, skillCardY + skillCardH / 2);

    ctx.textAlign = 'left';
    ctx.fillStyle = selClass.color || '#3498db';
    ctx.font = `900 13px ${FONT_FAMILY}`;
    ctx.fillText(`初始奥义 · ${initSkillInfo.name}`, marginX + 48, skillCardY + 17);

    ctx.fillStyle = '#b2bec3';
    ctx.font = `11px ${FONT_FAMILY}`;
    ctx.fillText(initSkillInfo.desc ? initSkillInfo.desc.slice(0, 24) + '...' : '专属强力战斗流派', marginX + 48, skillCardY + 34);

    // 4. 底部横排 6 大职业切换
    const classKeys = Object.keys(CLASSES);
    const selectorY = skillCardY + skillCardH + 12;
    const cardGap = 6;
    const cardW = Math.floor((stageW - (classKeys.length - 1) * cardGap) / classKeys.length);
    const cardH = 62;

    classKeys.forEach((key, index) => {
      const cls = CLASSES[key];
      const isSelected = this.selectedClassId === key;
      const cx = marginX + index * (cardW + cardGap);
      const cy = isSelected ? selectorY - 4 : selectorY;

      this.classClickAreas.push({ id: key, x: cx, y: cy, w: cardW, h: cardH });

      this.drawRoundedRect(ctx, cx, cy, cardW, cardH, 6);
      ctx.fillStyle = isSelected ? 'rgba(241, 196, 15, 0.25)' : 'rgba(30, 30, 35, 0.8)';
      ctx.fill();
      ctx.strokeStyle = isSelected ? (cls.color || '#f1c40f') : '#4b4b4b';
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.stroke();

      const emblemY = cy + 22;
      this.drawClassEmblem(ctx, key, cx + cardW / 2, emblemY, 0.7);

      ctx.fillStyle = isSelected ? '#ffffff' : '#a4b0be';
      ctx.font = `900 10.5px ${FONT_FAMILY}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(cls.name, cx + cardW / 2, cy + cardH - 10);
    });

    // 5. 出征大按钮
    const btnY = SCREEN_HEIGHT - 60;
    const btnH = 46;
    this.startBtnArea = { x: marginX, y: btnY, w: stageW, h: btnH };

    const btnGrad = ctx.createLinearGradient(marginX, btnY, marginX + stageW, btnY);
    btnGrad.addColorStop(0, '#f39c12');
    btnGrad.addColorStop(1, '#d35400');
    this.drawRoundedRect(ctx, marginX, btnY, stageW, btnH, 8);
    ctx.fillStyle = btnGrad;
    ctx.fill();
    ctx.strokeStyle = '#f1c40f';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = `900 16px ${FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`卍解完毕 · 开启战役 ➔`, marginX + stageW / 2, btnY + btnH / 2);
  }

  // --------------------- 绘制真实活体灵兽头像 ---------------------
  drawAnimalAvatar(ctx, raceId, x, y, scale = 1.0, player = null) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);

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
        // 狂暴战神：赤红血战战环 + 双交叉狂怒利刃 + 锋锐血槽
        ctx.strokeStyle = '#e74c3c';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 16, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = '#ecf0f1';
        ctx.lineWidth = 2.8;
        ctx.beginPath();
        ctx.moveTo(-11, -11);
        ctx.lineTo(11, 11);
        ctx.moveTo(11, -11);
        ctx.lineTo(-11, 11);
        ctx.stroke();

        ctx.strokeStyle = '#f1c40f';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(-5, -2);
        ctx.lineTo(-2, -5);
        ctx.moveTo(5, -2);
        ctx.lineTo(2, -5);
        ctx.stroke();

        ctx.fillStyle = '#c0392b';
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'holy_knight': {
        // 神圣骑士：圣光金羽天使翼 + 金圣盾 + 白十字星
        ctx.strokeStyle = '#f1c40f';
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

        ctx.fillStyle = '#f39c12';
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

        // 符文剑身
        ctx.strokeStyle = '#dfe6e9';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, -13);
        ctx.lineTo(0, 8);
        ctx.stroke();

        // 剑格骷髅角
        ctx.strokeStyle = '#00cec9';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-9, -2);
        ctx.lineTo(9, -2);
        ctx.stroke();

        // 凋零死光核心
        ctx.fillStyle = '#10ac84';
        ctx.beginPath();
        ctx.arc(0, -2, 4.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#55efc4';
        ctx.beginPath();
        ctx.arc(0, -2, 2, 0, Math.PI * 2);
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
        ctx.fillStyle = '#9b59b6';
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
        // 邪能术士：黑曜石恶魔弯角 + 翡翠幽绿邪焰
        ctx.strokeStyle = '#2ecc71';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 16, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#2d3436';
        ctx.beginPath();
        ctx.moveTo(-4, -3);
        ctx.quadraticCurveTo(-12, -18, -16, -14);
        ctx.quadraticCurveTo(-11, -6, -2, -1);
        ctx.moveTo(4, -3);
        ctx.quadraticCurveTo(12, -18, 16, -14);
        ctx.quadraticCurveTo(11, -6, 2, -1);
        ctx.fill();

        ctx.fillStyle = '#2ecc71';
        ctx.beginPath();
        ctx.arc(0, 2, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#a8ff78';
        ctx.beginPath();
        ctx.arc(0, 1, 4.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 1, 1.8, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'shaman': {
        // 元素萨满：风暴之怒交叉闪电 + 激流元素图腾
        ctx.strokeStyle = '#0984e3';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 16, 0, Math.PI * 2);
        ctx.stroke();

        // 狂暴闪电折线
        ctx.fillStyle = '#00cec9';
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
        desc: '以身体为轴狂暴挥舞战刃旋转斩击，造成强力击退。满级觉醒【剑刃风暴·破军】，化身移动风暴绞肉机！',
      },
      holy_knight: {
        name: '【圣光奉献】',
        desc: '在脚下铺设神圣奉献法阵，持续净化灼烧全场恶灵。满级觉醒【大天使神圣风暴】，天堂圣剑全图审判！',
      },
      death_knight: {
        name: '【凋零腐蚀】',
        desc: '在地面召唤血肉腐蚀死域，百分比汲取生命与剧毒侵蚀。满级觉醒【辛达苟萨死霜领域】，极寒极恶寸草不生！',
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
        death_knight: '神鸡边跑边下金蛋边施放凋零死域，怪物踩中蛋爆又陷死域，双重折磨！',
        mage: '母鸡风筝聚怪后寒冰新星全场瞬冻，接一发奥术齐射瞬间清屏！',
        fel_warlock: '利用超高机动把怪群牢牢引诱在邪能绿焰中炙烤，灼烧效率直接翻倍！',
        shaman: '高速游走疯狂触发闪电链与天命极境，雷光在怪潮中连绵不绝！',
      },
      duck: {
        warrior: '神鸭天生 15% 闪避极大降低近战暴毙风险，在刀尖上旋转狂斩！',
        holy_knight: '高闪避叠加圣光神佑，化身闪避流神圣圣骑，怪潮根本打不中！',
        death_knight: '超频音波大范围击退怪潮，把怪物死死卡在凋零死域边界反复腐蚀！',
        mage: '鸭鸭音波击退与寒冰新星冻结形成完美双控，怪潮寸步难行！',
        fel_warlock: '鸭音推飞怪物并持续减速，把精英怪死死按在邪焰焦土中熔融！',
        shaman: '神鸭天命共鸣极境，音波推怪成堆，一记闪电链串联全图爆发超高AOE！',
      },
      cow: {
        warrior: '蛮荒铁牛天生霸体肉盾与狂暴战神绝配！重踏震晕接旋风斩，近身怪皆化齑粉！',
        holy_knight: '钢铁之躯硬吃全屏围攻，配合圣光奉献自愈护体，坚如磐石无可撼动！',
        death_knight: '万血魔牛化身不灭死亡骑士，在凋零死域中肉搏吸血，血条越打越厚！',
        mage: '铁牛聚怪近身战争重踏群控，为高伤害奥术法术争取绝佳轰杀时机！',
        fel_warlock: '以血肉重躯硬顶怪潮，近身引爆地狱火流星，一人即是一支恶魔军团！',
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
        death_knight: '高暴击凋零死域频繁跳出高额暴击数字，咸鱼突刺在尸骨中直线穿杀！',
        mage: '寒冰新星冻结脆弱目标，咸鱼高暴击奥术飞弹直接造成碎冰多倍暴伤！',
        fel_warlock: '邪焰焦土与暴击毒火持续跳动，咸鱼残血攻击暴涨40%毁天灭地！',
        shaman: '天生极高暴击与雷系闪电绝配！每道连锁闪电全出暴击电芒，秒杀全图！',
      },
    };
    return (table[raceId] && table[raceId][classId]) || '灵兽血脉与魔兽职业相得益彰，战力倍增！';
  }

  // ===================== 赛博科幻战术终端渲染管线 =====================

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
  renderHUD(ctx, player, gameData, learnedSkills) {
    ctx.save();

    const marginX = 10;
    const bottomBaseY = SCREEN_HEIGHT - 86; // 底部 HUD 总基线 (距底边留足安全距离)

    // 0. 底部磨砂渐变衬底 (保证战场杂兵或经验宝石穿过底部时，HUD 依然极度清晰)
    const dockH = SCREEN_HEIGHT - bottomBaseY + 6;
    const dockGrad = ctx.createLinearGradient(0, bottomBaseY - 6, 0, SCREEN_HEIGHT);
    dockGrad.addColorStop(0, 'rgba(6, 8, 14, 0)');
    dockGrad.addColorStop(0.25, 'rgba(6, 8, 14, 0.6)');
    dockGrad.addColorStop(1, 'rgba(6, 8, 14, 0.92)');
    ctx.fillStyle = dockGrad;
    ctx.fillRect(0, bottomBaseY - 6, SCREEN_WIDTH, dockH);

    // 1. 经验条 (EXP Bar) - 位于底部面板上沿，清晰可见且不遮挡任何战局
    const expY = bottomBaseY;
    const expH = 8;
    const expRatio = Math.max(0, Math.min(1, player.exp / player.maxExp));

    // 经验条底槽
    ctx.fillStyle = 'rgba(10, 14, 20, 0.88)';
    ctx.fillRect(0, expY, SCREEN_WIDTH, expH);

    // 经验条极光渐变填充
    if (expRatio > 0) {
      const expGrad = ctx.createLinearGradient(0, expY, SCREEN_WIDTH, expY);
      expGrad.addColorStop(0, '#00cec9');
      expGrad.addColorStop(0.5, '#0984e3');
      expGrad.addColorStop(1, '#f1c40f');
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
    const row1H = 24;

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
    ctx.strokeStyle = '#f39c12';
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

    // 💀 斩魔计数胶囊
    this.drawRoundedRect(ctx, killX, row1Y, killW, row1H, 12);
    ctx.fillStyle = 'rgba(18, 22, 32, 0.9)';
    ctx.fill();
    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.fillStyle = '#ff7675';
    ctx.font = `bold 11px ${FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`💀 ${gameData.kills}`, killX + killW / 2, row1Y + row1H / 2);

    // 2.2 左侧：掌握技能栏 (横排精致小勋章)
    let slotX = marginX;
    const slotSize = 24;
    const slotGap = 5;
    const skillKeys = Object.keys(learnedSkills);

    skillKeys.forEach((key) => {
      const lvl = learnedSkills[key];
      const def = SKILLS[key];
      if (!def) return;
      if (slotX + slotSize > timeX - 4) return; // 防止极端小屏与时间胶囊重叠

      this.drawRoundedRect(ctx, slotX, row1Y, slotSize, slotSize, 5);
      ctx.fillStyle = 'rgba(18, 22, 32, 0.9)';
      ctx.fill();
      ctx.strokeStyle = def.color || '#f1c40f';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.font = `13px ${FONT_FAMILY}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(def.icon, slotX + slotSize / 2, row1Y + slotSize / 2);

      // 角标显示等级数字
      ctx.fillStyle = '#ffd700';
      ctx.font = `bold 8.5px ${FONT_FAMILY}`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(`${lvl}`, slotX + slotSize - 2, row1Y + slotSize - 2);

      slotX += slotSize + slotGap;
    });

    // 3. 角色状态与关卡行 (Lower Row: 角色胶囊框 + 章节牌匾)
    const row2Y = row1Y + row1H + 4;
    const row2H = 38;

    const charW = Math.max(170, Math.min(210, SCREEN_WIDTH - 120));
    const charX = marginX;
    const chapX = charX + charW + 6;
    const chapW = SCREEN_WIDTH - chapX - marginX;

    // 3.1 角色胶囊框 (Avatar & Life Gauge)
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
    ctx.fillStyle = '#222f3e';
    ctx.fill();
    ctx.strokeStyle = player.classData.color || '#f1c40f';
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
      hpGrad.addColorStop(0, '#e67e22');
      hpGrad.addColorStop(1, '#2ecc71');
    } else {
      hpGrad.addColorStop(0, '#c0392b');
      hpGrad.addColorStop(1, '#e74c3c');
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

    // 3.2 章节铭牌 (Chapter Badge)
    this.drawRoundedRect(ctx, chapX, row2Y, chapW, row2H, 8);
    ctx.fillStyle = 'rgba(18, 22, 32, 0.9)';
    ctx.fill();
    ctx.strokeStyle = '#f39c12';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.fillStyle = '#f1c40f';
    ctx.font = `bold 10px ${FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('动物大战外星人', chapX + chapW / 2, row2Y + 15);

    ctx.fillStyle = '#bdc3c7';
    ctx.font = `bold 9px ${FONT_FAMILY}`;
    ctx.fillText('第一章 · 异星入侵', chapX + chapW / 2, row2Y + 29);

    // 4. 右下角便捷重新挑战按钮 (方便测试与重开)
    const retryBtnW = 96;
    const retryBtnH = 34;
    const retryBtnX = SCREEN_WIDTH - retryBtnW - 16;
    const retryBtnY = SCREEN_HEIGHT - retryBtnH - 24;
    this.retryBtnArea = { x: retryBtnX, y: retryBtnY, w: retryBtnW, h: retryBtnH };
    if (typeof GameGlobal !== 'undefined') GameGlobal.retryBtnArea = this.retryBtnArea;

    ctx.save();
    this.drawRoundedRect(ctx, retryBtnX, retryBtnY, retryBtnW, retryBtnH, 8);
    ctx.fillStyle = 'rgba(20, 20, 25, 0.9)';
    ctx.fill();
    ctx.strokeStyle = '#00cec9';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#00cec9';
    ctx.font = `bold 12px ${FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🔄 重新挑战', retryBtnX + retryBtnW / 2, retryBtnY + retryBtnH / 2);
    ctx.restore();

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
      ctx.strokeStyle = '#e74c3c';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#ff7675';
      ctx.font = `900 14px ${FONT_FAMILY}`;
      ctx.textAlign = 'center';
      ctx.fillText(`⚠️ 第 ${this.waveAlert.wave} 波敌军来袭 ⚠️`, SCREEN_WIDTH / 2, alertY + 20);
      ctx.fillStyle = '#dfe6e9';
      ctx.font = `12px ${FONT_FAMILY}`;
      ctx.fillText(this.waveAlert.title, SCREEN_WIDTH / 2, alertY + 38);
      ctx.restore();
    }

    ctx.restore();
  }


  // ===================== 3. 升级三选一面板 (奢华卡牌设计，无模糊无截断) =====================
  renderLevelUpModal(ctx) {
    ctx.save();

    // 暗黑沉浸式半透明遮罩
    ctx.fillStyle = 'rgba(6, 8, 14, 0.88)';
    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

    // 顶部发光金字横幅
    const breath = Math.sin(this.animPulse * 2.2) * 0.18 + 0.82;
    ctx.save();
    ctx.fillStyle = '#f1c40f';
    ctx.shadowBlur = 18 * breath;
    ctx.shadowColor = '#f39c12';
    ctx.font = `bold 22px ${FONT_FAMILY}`;
    ctx.textAlign = 'center';
    const bannerY = Math.max(76, SCREEN_HEIGHT * 0.13);
    ctx.fillText('★ 境界突破 · 命运三选一 ★', SCREEN_WIDTH / 2, bannerY);
    ctx.restore();

    ctx.fillStyle = '#b2bec3';
    ctx.font = `12px ${FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.fillText('领悟一项绝学或强化战技，大幅跃升战斗流派境界', SCREEN_WIDTH / 2, bannerY + 24);

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
      const schoolColor = choice.skill.color || '#f1c40f';

      const cat = CATEGORY_MAP[choice.category] || { name: '通用', color: '#f1c40f', icon: '✨' };
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
      const borderColor = isMythic ? '#ffd700' : (isUltra ? '#ff7675' : schoolColor);
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = isMythic ? 2.6 : (isUltra ? 2.4 : 1.8);
      ctx.shadowBlur = isMythic ? 18 : (isUltra ? 16 : 8);
      ctx.shadowColor = isMythic ? '#f39c12' : (isUltra ? '#ff4757' : schoolColor);
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
        ctx.fillStyle = '#f39c12';
      } else if (choice.curLvl === 0) {
        ctx.fillStyle = '#2ecc71';
      } else if (isUltra) {
        ctx.fillStyle = '#e74c3c';
      } else {
        ctx.fillStyle = '#2c3e50';
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
        ctx.fillStyle = '#f39c12';
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
        ctx.fillStyle = '#ffd700';
      } else if (isUltra) {
        ctx.fillStyle = '#ff7675';
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
      ctx.fillStyle = isMythic ? '#ffd700' : '#f1c40f';
      ctx.fillText(starStr, cx + cardW - 12, cy + 22);
      ctx.restore();

      // 第二行：境界突破状态提示
      ctx.save();
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      if (isMythic) {
        ctx.fillStyle = '#ffd700';
        ctx.font = `bold 11px ${FONT_FAMILY}`;
        ctx.fillText('★ [天命极境·神话突破] 突破凡境上限至Lv.6！种族专属终极奥义！', textX, cy + 46);
      } else if (isUltra) {
        ctx.fillStyle = '#ff7675';
        ctx.font = `bold 11px ${FONT_FAMILY}`;
        ctx.fillText('★ [超武觉醒·全图质变] 激活Lv.5终极神奥形态，毁天灭地！', textX, cy + 46);
      } else {
        ctx.fillStyle = '#74b9ff';
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
        btnGrad.addColorStop(0, '#d35400');
        btnGrad.addColorStop(1, '#f1c40f');
      } else if (isUltra) {
        btnGrad.addColorStop(0, '#c0392b');
        btnGrad.addColorStop(1, '#e74c3c');
      } else {
        btnGrad.addColorStop(0, '#e67e22');
        btnGrad.addColorStop(1, '#f39c12');
      }
      ctx.fillStyle = btnGrad;
      ctx.fill();

      ctx.strokeStyle = isMythic ? '#ffd700' : '#ffeaa7';
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
    ctx.fillStyle = isLocked ? '#ff7675' : '#00cec9';
    ctx.font = `bold 12px ${FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(isLocked ? '⏳ 正在凝神感悟... (防误触保护中)' : '👆 点击卡牌领悟绝学战技', SCREEN_WIDTH / 2, SCREEN_HEIGHT - 28);

    ctx.restore();
  }

  // ===================== 4. 结算界面 =====================
  renderGameOver(ctx, player, gameData, learnedSkills) {
    ctx.save();

    ctx.fillStyle = 'rgba(10, 12, 18, 0.92)';
    ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

    ctx.fillStyle = '#e74c3c';
    ctx.shadowBlur = 18;
    ctx.shadowColor = '#c0392b';
    ctx.font = `bold 28px ${FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.fillText('英 雄 陨 落', SCREEN_WIDTH / 2, SCREEN_HEIGHT * 0.22);

    ctx.fillStyle = '#bdc3c7';
    ctx.shadowBlur = 0;
    ctx.font = `13px ${FONT_FAMILY}`;
    ctx.fillText('你在这场魔幻大暴走中英勇战至最后一刻...', SCREEN_WIDTH / 2, SCREEN_HEIGHT * 0.22 + 30);

    const panelW = SCREEN_WIDTH - 48;
    const panelH = 185;
    const panelX = 24;
    const panelY = SCREEN_HEIGHT * 0.35;

    this.drawRoundedRect(ctx, panelX, panelY, panelW, panelH, 10);
    ctx.fillStyle = 'rgba(25, 30, 42, 0.9)';
    ctx.fill();
    ctx.strokeStyle = '#f39c12';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#f1c40f';
    ctx.font = `bold 15px ${FONT_FAMILY}`;
    ctx.textAlign = 'left';
    ctx.fillText('战役丰碑', panelX + 20, panelY + 28);

    const minutes = Math.floor(gameData.time / 60);
    const seconds = Math.floor(gameData.time % 60);
    const timeStr = `${minutes} 分 ${seconds} 秒`;

    ctx.fillStyle = '#ffffff';
    ctx.font = `13px ${FONT_FAMILY}`;
    ctx.fillText(`存活时间：${timeStr}`, panelX + 20, panelY + 62);
    ctx.fillText(`斩灭恶魔：${gameData.kills} 只`, panelX + 20, panelY + 92);
    ctx.fillText(`最终境界：Lv.${player.level}`, panelX + 20, panelY + 122);
    ctx.fillText(`角色身份：${player.raceData.icon} ${player.raceData.name} · ${player.classData.name}`, panelX + 20, panelY + 152);

    const btnW = SCREEN_WIDTH - 60;
    const btnH = 48;
    const btnX = 30;
    const btnY = panelY + panelH + 30;
    this.restartBtnArea = { x: btnX, y: btnY, w: btnW, h: btnH };

    this.drawRoundedRect(ctx, btnX, btnY, btnW, btnH, 10);
    const btnGrad = ctx.createLinearGradient(btnX, btnY, btnX + btnW, btnY);
    btnGrad.addColorStop(0, '#c0392b');
    btnGrad.addColorStop(1, '#e74c3c');
    ctx.fillStyle = btnGrad;
    ctx.fill();

    ctx.strokeStyle = '#ff7675';
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
    const state = GameGlobal.databus ? GameGlobal.databus.state : 'SELECT';

    // 0. 重新挑战拦截 (测试与重开便捷按钮)
    if ((state === 'PLAYING' || state === 'LEVEL_UP') && this.retryBtnArea && this.isInArea(x, y, this.retryBtnArea)) {
      if (typeof wx !== 'undefined' && wx.showModal) {
        wx.showModal({
          title: '重开对决',
          content: '是否保留当前阵容重新开始？',
          success: (res) => {
            if (res.confirm) {
              this.emit('restartCurrentFight');
            }
          }
        });
      } else {
        this.emit('restartCurrentFight');
      }
      return;
    }

    // 1. 选人阶段触控 (两步流程：第一步选种族，第二步选职业)
    if (state === 'SELECT') {
      if (this.selectStep === 'RACE') {
        // 1.1 检查是否点击“确定种族 · 进化职业”按钮
        if (this.confirmRaceBtnArea && this.isInArea(x, y, this.confirmRaceBtnArea)) {
          this.selectStep = 'CLASS';
          this.confirmRaceBtnArea = null;
          this.raceClickAreas = [];
          try { wx.vibrateShort({ type: 'medium' }); } catch (err) {}
          return;
        }

        // 1.2 检查是否点击选择某个动物种族
        for (let i = 0; i < this.raceClickAreas.length; i++) {
          const area = this.raceClickAreas[i];
          if (this.isInArea(x, y, area)) {
            this.selectedRaceId = area.id;
            try { wx.vibrateShort({ type: 'light' }); } catch (err) {}
            return;
          }
        }
        return;
      }

      if (this.selectStep === 'CLASS') {
        // 1.3 检查是否点击“返回重选种族”按钮
        if (this.backToRaceBtnArea && this.isInArea(x, y, this.backToRaceBtnArea)) {
          this.selectStep = 'RACE';
          this.backToRaceBtnArea = null;
          this.startBtnArea = null;
          this.classClickAreas = [];
          try { wx.vibrateShort({ type: 'light' }); } catch (err) {}
          return;
        }

        // 1.4 检查是否点击“确定出征 · 开启战役”按钮
        if (this.startBtnArea && this.isInArea(x, y, this.startBtnArea)) {
          this.emit('startGame', { raceId: this.selectedRaceId, classId: this.selectedClassId });
          this.selectStep = 'RACE'; // 重置为初始步骤以备下一局
          this.startBtnArea = null;
          this.backToRaceBtnArea = null;
          this.raceClickAreas = [];
          this.classClickAreas = [];
          try { wx.vibrateShort({ type: 'medium' }); } catch (err) {}
          return;
        }

        // 1.5 检查是否点击选择某个进化职业
        for (let i = 0; i < this.classClickAreas.length; i++) {
          const area = this.classClickAreas[i];
          if (this.isInArea(x, y, area)) {
            this.selectedClassId = area.id;
            try { wx.vibrateShort({ type: 'light' }); } catch (err) {}
            return;
          }
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
        this.emit('restartGame');
        this.restartBtnArea = null;
        try { wx.vibrateShort({ type: 'medium' }); } catch (err) {}
        return;
      }
      return;
    }
  }

  isInArea(x, y, area) {
    return x >= area.x && x <= area.x + area.w && y >= area.y && y <= area.y + area.h;
  }
}
