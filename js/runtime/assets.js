// 统一游戏素材管理器 (支持微信小游戏与标准浏览器)
function createImg(src) {
  let img = null;
  if (typeof wx !== 'undefined' && typeof wx.createImage === 'function') {
    img = wx.createImage();
  } else if (typeof Image !== 'undefined') {
    img = new Image();
  }
  if (img) {
    img.src = src;
  }
  return img;
}

export const HeroImages = {
  chicken: createImg('images/heroes/chicken.png'),
  duck: createImg('images/heroes/duck.png'),
  cow: createImg('images/heroes/cow.png'),
  sheep: createImg('images/heroes/sheep.png'),
  fish: createImg('images/heroes/fish.png'),

  // 热血漫画风进化模型（鸡示范，每 10 级切换）
  chicken_manga_stage1: createImg('images/heroes/chicken_manga_stage1.png'),
  chicken_manga_stage2: createImg('images/heroes/chicken_manga_stage2.png'),
  chicken_manga_stage3: createImg('images/heroes/chicken_manga_stage3.png'),

  // —— 「种族×职业」组合最终形态立绘（神力光效 + 重度武装满级，供选人界面预览）——
  // 鸡族
  chicken_warrior_final: createImg('images/heroes/chicken_warrior_final.png'),
  chicken_holy_knight_final: createImg('images/heroes/chicken_holy_knight_final.png'),
  chicken_death_knight_final: createImg('images/heroes/chicken_death_knight_final.png'),
  chicken_mage_final: createImg('images/heroes/chicken_mage_final.png'),
  chicken_fel_warlock_final: createImg('images/heroes/chicken_fel_warlock_final.png'),
  chicken_shaman_final: createImg('images/heroes/chicken_shaman_final.png'),
  // 鸭族
  duck_warrior_final: createImg('images/heroes/duck_warrior_final.png'),
  duck_holy_knight_final: createImg('images/heroes/duck_holy_knight_final.png'),
  duck_death_knight_final: createImg('images/heroes/duck_death_knight_final.png'),
  duck_mage_final: createImg('images/heroes/duck_mage_final.png'),
  duck_fel_warlock_final: createImg('images/heroes/duck_fel_warlock_final.png'),
  duck_shaman_final: createImg('images/heroes/duck_shaman_final.png'),
  // 牛族
  cow_warrior_final: createImg('images/heroes/cow_warrior_final.png'),
  cow_holy_knight_final: createImg('images/heroes/cow_holy_knight_final.png'),
  cow_death_knight_final: createImg('images/heroes/cow_death_knight_final.png'),
  cow_mage_final: createImg('images/heroes/cow_mage_final.png'),
  cow_fel_warlock_final: createImg('images/heroes/cow_fel_warlock_final.png'),
  cow_shaman_final: createImg('images/heroes/cow_shaman_final.png'),
  // 羊族
  sheep_warrior_final: createImg('images/heroes/sheep_warrior_final.png'),
  sheep_holy_knight_final: createImg('images/heroes/sheep_holy_knight_final.png'),
  sheep_death_knight_final: createImg('images/heroes/sheep_death_knight_final.png'),
  sheep_mage_final: createImg('images/heroes/sheep_mage_final.png'),
  sheep_fel_warlock_final: createImg('images/heroes/sheep_fel_warlock_final.png'),
  sheep_shaman_final: createImg('images/heroes/sheep_shaman_final.png'),
  // 鱼族
  fish_warrior_final: createImg('images/heroes/fish_warrior_final.png'),
  fish_holy_knight_final: createImg('images/heroes/fish_holy_knight_final.png'),
  fish_death_knight_final: createImg('images/heroes/fish_death_knight_final.png'),
  fish_mage_final: createImg('images/heroes/fish_mage_final.png'),
  fish_fel_warlock_final: createImg('images/heroes/fish_fel_warlock_final.png'),
  fish_shaman_final: createImg('images/heroes/fish_shaman_final.png'),
};

/**
 * 获取角色进化贴图（阶段 1 原生 Canvas 渲染降级）
 *
 * 【需求 1 —— 原生 Canvas 渲染降级】
 * 角色「1 级可爱期」不加载任何外部美术资产，返回 null 由 Player.render
 * 走内置的 Canvas API 矢量绘制接口（drawChicken / drawDuck / drawCow /
 * drawSheep / drawFish）。随等级提升（>= 10 级）再切换到热血漫画风贴图渲染，
 * 从而减少开局贴图解码开销、加速首屏呈现并降低低端机发热。
 *
 * @param {string} raceId 种族
 * @param {number} level 角色等级
 * @returns {object|null} 贴图对象；1 级返回 null 走 Canvas 原生绘制
 */
export function getHeroEvolutionImage(raceId, level = 1) {
  // —— 热血漫画风进化（鸡示范）：10 级起切换漫画风阶段模型 ——
  if (raceId === 'chicken' && level >= 10) {
    let mangaStage = 1;
    if (level >= 40) {
      mangaStage = 3; // 神力光效
    } else if (level >= 20) {
      mangaStage = 2; // 成熟期
    }
    const mangaImg = HeroImages[`chicken_manga_stage${mangaStage}`];
    if (mangaImg && (mangaImg.complete || mangaImg.width > 0)) {
      return mangaImg;
    }
  }

  // —— 1 级可爱期：返回 null，强制走 Canvas 原生矢量绘制（阶段 1 视觉降级） ——
  // 其余等级（2~9 级）复用本体贴图作为过渡；未加载完成时同样回退 Canvas 绘制。
  if (level < 10) {
    const img = HeroImages[raceId];
    if (level === 1) return null; // 1 级不加载外部美术资产
    return (img && (img.complete || img.width > 0)) ? img : null;
  }

  // 10 级及以上非鸡种族：复用本体贴图占位
  const img = HeroImages[raceId];
  return (img && (img.complete || img.width > 0)) ? img : null;
}

/**
 * 【UI 预览专用】获取「角色 + 职业」组合的最高阶最终形态展示贴图。
 *
 * 与战斗实体的 1 级 Canvas 降级渲染解耦：选人界面直接读取最高阶
 * （stage5 神力光效 + 重度武装）满级资产进行立绘展示。
 *
 * @param {string} raceId 种族
 * @param {string} classId 职业
 * @returns {object|null} 最高阶贴图对象；未加载完成时返回 null（UI 层回退 Canvas/图标）
 */
export function getUIPreviewImage(raceId, classId) {
  // 「种族×职业」组合最终形态立绘（神力光效 + 重度武装满级资产）
  // 组合键 `${raceId}_${classId}_final`，缺失时回退到鸡族的对应职业立绘，再回退本体图
  if (classId) {
    const comboImg = HeroImages[`${raceId}_${classId}_final`];
    if (comboImg && (comboImg.complete || comboImg.width > 0)) {
      return comboImg;
    }
    // 新增职业回退到风格最贴合的同族最终形态立绘
    const classFallbackMap = {
      hunter: 'shaman',
      rogue: 'death_knight',
      druid: 'shaman',
      demon_hunter: 'fel_warlock',
      monk: 'warrior',
      evoker: 'mage',
    };
    const fbClass = classFallbackMap[classId];
    if (fbClass) {
      const fbImg = HeroImages[`${raceId}_${fbClass}_final`];
      if (fbImg && (fbImg.complete || fbImg.width > 0)) {
        return fbImg;
      }
    }
  }

  // 回退：鸡族漫画风最高阶（stage3）
  if (raceId === 'chicken') {
    const mangaImg = HeroImages['chicken_manga_stage3'];
    if (mangaImg && (mangaImg.complete || mangaImg.width > 0)) {
      return mangaImg;
    }
  }

  // 最终回退：本体贴图（UI 层会再降级为图标）
  const img = HeroImages[raceId];
  return (img && (img.complete || img.width > 0)) ? img : null;
}

export const ClassImages = {
  warrior: createImg('images/classes/warrior.png'),
  holy_knight: createImg('images/classes/paladin.png'),
  death_knight: createImg('images/classes/warrior.png'),
  mage: createImg('images/classes/mage.png'),
  fel_warlock: createImg('images/classes/warlock.png'),
  shaman: createImg('images/classes/druid.png'),
  paladin: createImg('images/classes/paladin.png'),
  warlock: createImg('images/classes/warlock.png'),
  hunter: createImg('images/classes/rogue.png'),
  rogue: createImg('images/classes/rogue.png'),
  druid: createImg('images/classes/druid.png'),
  demon_hunter: createImg('images/classes/warlock.png'),
  monk: createImg('images/classes/warrior.png'),
  evoker: createImg('images/classes/mage.png'),
};
