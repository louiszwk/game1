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
};

export const EnemyImages = {
  swarmer: createImg('images/enemies/swarmer.png'),
  trooper: createImg('images/enemies/trooper.png'),
  acid_spitter: createImg('images/enemies/acid_spitter.png'),
  ufo_scout: createImg('images/enemies/ufo_scout.png'),
  behemoth: createImg('images/enemies/behemoth.png'),
  boss: createImg('images/enemies/boss.png'),
};
