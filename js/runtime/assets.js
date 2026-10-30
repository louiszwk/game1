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

  // 角色升级形态进化（Lv 1~2: 朴素下忍/浅打死神, Lv 3~4: 觉醒始解/精英, Lv 5+: 卍解神化终极形态）
  chicken_stage1: createImg('images/heroes/chicken_stage1.png'),
  chicken_stage2: createImg('images/heroes/chicken_stage2.png'),
  chicken_stage3: createImg('images/heroes/chicken_stage3.png'),

  duck_stage1: createImg('images/heroes/duck_stage1.png'),
  duck_stage2: createImg('images/heroes/duck_stage2.png'),
  duck_stage3: createImg('images/heroes/duck_stage3.png'),

  cow_stage1: createImg('images/heroes/cow_stage1.png'),
  cow_stage2: createImg('images/heroes/cow_stage2.png'),
  cow_stage3: createImg('images/heroes/cow_stage3.png'),

  sheep_stage1: createImg('images/heroes/sheep_stage1.png'),
  sheep_stage2: createImg('images/heroes/sheep_stage2.png'),
  sheep_stage3: createImg('images/heroes/sheep_stage3.png'),

  fish_stage1: createImg('images/heroes/fish_stage1.png'),
  fish_stage2: createImg('images/heroes/fish_stage2.png'),
  fish_stage3: createImg('images/heroes/fish_stage3.png'),
};

export function getHeroEvolutionImage(raceId, level = 1) {
  let stage = 1;
  if (level >= 5) {
    stage = 3;
  } else if (level >= 3) {
    stage = 2;
  }
  const imgKey = `${raceId}_stage${stage}`;
  const img = HeroImages[imgKey] || HeroImages[raceId];
  return (img && (img.complete || img.width > 0)) ? img : HeroImages[raceId];
}

export const ClassImages = {
  warrior: createImg('images/classes/warrior.png'),
  mage: createImg('images/classes/mage.png'),
  rogue: createImg('images/classes/rogue.png'),
  paladin: createImg('images/classes/paladin.png'),
  warlock: createImg('images/classes/warlock.png'),
  druid: createImg('images/classes/druid.png'),
};

export const EnemyImages = {
  swarmer: createImg('images/enemies/swarmer.png'),
  trooper: createImg('images/enemies/trooper.png'),
  acid_spitter: createImg('images/enemies/acid_spitter.png'),
  ufo_scout: createImg('images/enemies/ufo_scout.png'),
  behemoth: createImg('images/enemies/behemoth.png'),
  boss: createImg('images/enemies/boss.png'),
};
