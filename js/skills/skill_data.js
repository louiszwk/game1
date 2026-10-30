/**
 * 魔兽暗黑动物肉鸽 - 核心数值与体系数据
 * 深度联动系统：
 * 1. 种族血脉突破：每个种族与特定技能产生天命共鸣，可突破等级上限至【Lv.6 神话极境】！
 * 2. 职业修习禁忌：各大职业拥有严格派系清规，严禁学习敌对/冲突派系技能！
 * 3. 技能双重分类：
 *    - 派系分类：战斗类 (COMBAT)、神圣类 (HOLY)、邪能类 (FEL)、死亡类 (DEATH)、奥术类 (ARCANE)
 *    - 五行自然属性：金 (METAL)、木 (WOOD)、水 (WATER)、火 (FIRE)、土 (EARTH)、雷 (THUNDER)、风 (WIND)
 */

// 派系定义
export const CATEGORY_MAP = {
  COMBAT: { id: 'COMBAT', name: '战斗类', color: '#e67e22', icon: '⚔️', desc: '物理近战重击、狂暴挥砍与风暴回旋' },
  HOLY: { id: 'HOLY', name: '神圣类', color: '#f1c40f', icon: '✨', desc: '至纯圣光、裁决惩戒、救赎奉献与神圣护体' },
  FEL: { id: 'FEL', name: '邪能类', color: '#2ecc71', icon: '🔥', desc: '混乱恶魔火、腐蚀剧毒与地狱流星雨' },
  DEATH: { id: 'DEATH', name: '死亡类', color: '#9b59b6', icon: '💀', desc: '幽冥凋零、暗影诅咒与天灾死灵引力' },
  ARCANE: { id: 'ARCANE', name: '奥术类', color: '#3498db', icon: '🌌', desc: '时空秘法飞弹、绝对零度与极寒冰暴' },
  PASSIVE: { id: 'PASSIVE', name: '被动体魄', color: '#95a5a6', icon: '💎', desc: '肉身强化、极速身法与万有引力' },
  RACIAL: { id: 'RACIAL', name: '种族神技', color: '#e17055', icon: '👑', desc: '天生灵兽动物专属血脉本命大招' },
};

// 五行自然属性定义
export const ELEMENT_MAP = {
  METAL: { id: 'METAL', name: '金', color: '#f39c12', icon: '🪙', desc: '锋锐肃杀、利刃无坚不摧' },
  WOOD: { id: 'WOOD', name: '木', color: '#27ae60', icon: '🌿', desc: '自然滋养、生机循环与藤蔓' },
  WATER: { id: 'WATER', name: '水', color: '#0984e3', icon: '💧', desc: '潮汐洗礼、极寒冰冻与凝水' },
  FIRE: { id: 'FIRE', name: '火', color: '#e74c3c', icon: '🔥', desc: '烈焰燎原、狂暴焚灭与流星' },
  EARTH: { id: 'EARTH', name: '土', color: '#d35400', icon: '⛰️', desc: '厚土磐石、撼地重震与玄甲' },
  THUNDER: { id: 'THUNDER', name: '雷', color: '#f1c40f', icon: '⚡', desc: '九天狂雷、疾速麻痹与电弧' },
  WIND: { id: 'WIND', name: '风', color: '#00cec9', icon: '🌪️', desc: '疾风真空、狂飙撕裂与神行' },
};

// ===================== 1. 五大灵兽种族 (含 Lv.6 专属突破联动) =====================
export const RACES = {
  chicken: {
    id: 'chicken',
    name: '狂暴母鸡',
    title: '疾风雷霆羽皇',
    color: '#f39c12',
    icon: '🐔',
    desc: '【受惊狂奔】受击瞬间爆发 +50% 移速；基础攻速 +25%',
    racialSkillId: 'chicken_egg',
    racialSkillName: '【母鸡下蛋】',
    racialSkillDesc: '跑动中在身后下一枚爆炸金蛋，敌人触碰引发大范围爆破与碎裂！',
    affinitySkills: ['chicken_egg', 'chain_lightning', 'whirlwind', 'bloodlust'],
    affinityDesc: '【风雷共鸣】母鸡下蛋、狂雷风暴链、战神旋风斩、嗜血战歌上限突破至【Lv.6 神话极境】！',
    modifiers: {
      atkSpeedBonus: 0.25,
      fleeSpeed: true,
    }
  },
  duck: {
    id: 'duck',
    name: '嘎嘎神鸭',
    title: '水华灵泉仙尊',
    color: '#16a085',
    icon: '🦆',
    desc: '【水上漂】自带 15% 闪避率，基础移动速度 +20%',
    racialSkillId: 'duck_quack',
    racialSkillName: '【超频嘎嘎】',
    racialSkillDesc: '向前喷射高频音波气浪，狠狠推飞面前怪群并减速 40%！',
    affinitySkills: ['duck_quack', 'consecration', 'frost_nova', 'blizzard'],
    affinityDesc: '【沧海共鸣】超频嘎嘎、圣光奉献、极寒冰环、极冰暴风雪上限突破至【Lv.6 神话极境】！',
    modifiers: {
      dodgeRate: 0.15,
      speedBonus: 0.20,
    }
  },
  cow: {
    id: 'cow',
    name: '蛮荒铁牛',
    title: '崩山撼地神君',
    color: '#d35400',
    icon: '🐂',
    desc: '【皮糙肉厚】基础生命值 +70，受到所有伤害减免 15%',
    racialSkillId: 'cow_stomp',
    racialSkillName: '【战争践踏】',
    racialSkillDesc: '重蹄踏地产生环形地震波，震飞贴身一圈怪物并击晕 1 秒！',
    affinitySkills: ['cow_stomp', 'whirlwind', 'mortal_strike', 'thunder_clap'],
    affinityDesc: '【重土共鸣】战争践踏、战神旋风斩、裂铠重击、雷霆震击上限突破至【Lv.6 神话极境】！',
    modifiers: {
      maxHpBonus: 70,
      damageReduce: 0.15,
    }
  },
  sheep: {
    id: 'sheep',
    name: '圣光毛毛羊',
    title: '云端奥术萨满',
    color: '#8e44ad',
    icon: '🐑',
    desc: '【厚实羊毛】每 10 秒凝聚一层蓬松羊毛盾抵御一次伤害；灵魂拾取 +35%',
    racialSkillId: 'sheep_wool',
    racialSkillName: '【羊毛滋养】',
    racialSkillDesc: '护盾破碎或定时散落 3 个羊毛球，吸收立即回复 20 点生命！',
    affinitySkills: ['sheep_wool', 'arcane_missiles', 'shadow_curse', 'holy_shock'],
    affinityDesc: '【星穹共鸣】羊毛滋养、奥术天穹飞弹、痛苦血咒、神圣震击上限突破至【Lv.6 神话极境】！',
    modifiers: {
      woolShield: true,
      magnetBonus: 0.35,
    }
  },
  fish: {
    id: 'fish',
    name: '无敌咸鱼王',
    title: '深海逆鳞魔龙',
    color: '#2980b9',
    icon: '🐟',
    desc: '【咸鱼翻生】暴击率 +20%；生命低于 50% 时攻击力额外暴涨 40%！',
    racialSkillId: 'fish_dash',
    racialSkillName: '【咸鱼突刺】',
    racialSkillDesc: '猛甩尾巴向前超高速贯穿冲刺，沿途刺穿一条直线上的所有怪物！',
    affinitySkills: ['fish_dash', 'fel_fire', 'death_decay', 'chaos_bolt', 'bone_storm'],
    affinityDesc: '【真龙共鸣】咸鱼突刺、邪能火种、幽冥枯萎、混乱之箭、白骨风暴上限突破至【Lv.6 神话极境】！',
    modifiers: {
      critRate: 0.20,
      berserkLowHp: true,
    }
  }
};

// ===================== 2. 魔兽历史经典六大职业 (含严苛修习禁忌) =====================
export const CLASSES = {
  warrior: {
    id: 'warrior',
    name: '狂暴战神',
    title: '武器大师 · 旋风狂怒',
    color: '#e67e22',
    icon: '⚔️',
    desc: '百战精通的凡人肉身战神。初始掌握【战神旋风斩】，高生命护甲与暴击物理吸血',
    baseHp: 135,
    baseSpeed: 4.0,
    initSkill: 'whirlwind',
    primaryCategory: 'COMBAT',
    allowedCategories: ['COMBAT', 'ARCANE', 'PASSIVE', 'RACIAL'],
    forbiddenCategories: ['FEL', 'HOLY'],
    forbiddenDesc: '【凡躯战意】专注于物理肉搏战技，严禁修习【邪能类】与【神圣类】法术！',
  },
  holy_knight: {
    id: 'holy_knight',
    name: '神圣骑士',
    title: '光明使者 · 圣光领主',
    color: '#f1c40f',
    icon: '✨',
    desc: '虔诚修习圣光之道。初始掌握【圣光惩击】，卓越的范围自愈回血与群体神圣护盾',
    baseHp: 115,
    baseSpeed: 3.8,
    initSkill: 'holy_smite',
    primaryCategory: 'HOLY',
    allowedCategories: ['HOLY', 'COMBAT', 'PASSIVE', 'RACIAL'],
    forbiddenCategories: ['FEL', 'DEATH'],
    forbiddenDesc: '【圣光圣约】坚守光明圣道，严禁修习【邪能类】与【死亡类】暗黑禁术！',
  },
  death_knight: {
    id: 'death_knight',
    name: '邪恶骑士',
    title: '黯刃领主 · 天灾死骑',
    color: '#74b9ff',
    icon: '💀',
    desc: '拥抱死亡与冰霜符文。初始掌握【幽冥枯萎】，自带死灵吸血与减速腐蚀大阵',
    baseHp: 120,
    baseSpeed: 3.9,
    initSkill: 'death_decay',
    primaryCategory: 'DEATH',
    allowedCategories: ['DEATH', 'COMBAT', 'FEL', 'PASSIVE', 'RACIAL'],
    forbiddenCategories: ['HOLY'],
    forbiddenDesc: '【亡灵诅咒】死灵之躯被圣光排斥灼伤，严禁修习【神圣类】救赎神术！',
  },
  mage: {
    id: 'mage',
    name: '奥术法师',
    title: '肯瑞托 · 星穹魔导师',
    color: '#a29bfe',
    icon: '🌌',
    desc: '掌控时空与极寒。初始掌握【奥术天穹飞弹】，冷却极短，自动全图巡航锁敌',
    baseHp: 90,
    baseSpeed: 4.1,
    initSkill: 'arcane_missiles',
    primaryCategory: 'ARCANE',
    allowedCategories: ['ARCANE', 'COMBAT', 'PASSIVE', 'RACIAL'],
    forbiddenCategories: ['DEATH', 'FEL'],
    forbiddenDesc: '【达拉然清规】正统法师视通灵邪火为堕落，严禁修习【死亡类】与【邪能类】！',
  },
  fel_warlock: {
    id: 'fel_warlock',
    name: '邪能术士',
    title: '恶魔契约 · 毁灭术皇',
    color: '#2ecc71',
    icon: '🔥',
    desc: '驾驭燃烧军团幽绿烈火。初始掌握【邪能火种】，擅长大范围持续剧毒灼烧与陨星',
    baseHp: 95,
    baseSpeed: 4.0,
    initSkill: 'fel_fire',
    primaryCategory: 'FEL',
    allowedCategories: ['FEL', 'DEATH', 'ARCANE', 'PASSIVE', 'RACIAL'],
    forbiddenCategories: ['HOLY'],
    forbiddenDesc: '【恶魔之契】将灵魂献祭与恶魔为伍，被【神圣类】圣光永久驱逐绝罚！',
  },
  shaman: {
    id: 'shaman',
    name: '元素萨满',
    title: '风暴先知 · 先祖祭司',
    color: '#0984e3',
    icon: '⚡',
    desc: '沟通大自然狂暴元素。初始掌握【狂雷风暴链】，闪电多重连锁跃迁与大地共鸣',
    baseHp: 105,
    baseSpeed: 3.9,
    initSkill: 'chain_lightning',
    primaryCategory: 'COMBAT',
    allowedCategories: ['COMBAT', 'HOLY', 'ARCANE', 'PASSIVE', 'RACIAL'],
    forbiddenCategories: ['FEL', 'DEATH'],
    forbiddenDesc: '【自然之怒】狂暴元素憎恶腐蚀邪火与枯萎死灵，严禁修习【邪能类】与【死亡类】！',
  }
};

// ===================== 3. 魔兽世界经典技能库 (含派系/五行/超限Lv.6) =====================
export const SKILLS = {
  // ---------------- 1. 动物专属特技 ----------------
  chicken_egg: {
    id: 'chicken_egg',
    name: '母鸡下蛋',
    category: 'RACIAL',
    element: 'FIRE',
    color: '#f39c12',
    icon: '🥚',
    maxLevel: 5,
    levels: [
      { name: '母鸡下蛋 I', desc: '跑动中每 5 秒在身后下一枚小炸弹蛋，触碰引爆' },
      { name: '母鸡下蛋 II', desc: '下蛋频率提升 25%，爆炸范围扩大 30%' },
      { name: '双黄连爆蛋 III', desc: '每次连续生出 2 枚炸弹蛋，爆炸产生碎金弹片' },
      { name: '金蛋盛宴 IV', desc: '炸弹蛋升级为金蛋，爆炸必定吸附掉落经验碎片' },
      { name: '【超武·核爆巨蛋】', desc: '生出泰坦金蛋！引力聚怪后引发全图核聚变巨爆！' },
      { name: '【神化·九天玄雷蛋】', desc: '★狂暴母鸡极境突破★ 连下3枚神雷巨蛋！引爆九天落雷轰炸全屏，移速翻倍！' },
    ]
  },
  duck_quack: {
    id: 'duck_quack',
    name: '超频嘎嘎',
    category: 'RACIAL',
    element: 'WIND',
    color: '#16a085',
    icon: '📢',
    maxLevel: 5,
    levels: [
      { name: '超频嘎嘎 I', desc: '每隔 4.5 秒向前喷出一道扇形音波，推飞面前怪物' },
      { name: '高频嘎嘎 II', desc: '音波扩散角度更广，击退冲击力提高 40%' },
      { name: '余音绕梁 III', desc: '音波击中怪物附带 50% 移动减速，持续 2.5 秒' },
      { name: '双向声浪 IV', desc: '前后同时释放双向高频超声波冲击' },
      { name: '【超武·天籁嘎音】', desc: '释放震天动地的全屏次声波咆哮，小怪粉碎，精英怪瘫痪 3 秒！' },
      { name: '【神化·天籁神曲】', desc: '★嘎嘎神鸭极境突破★ 释放环形360°神圣音障，弹飞全屏万魔并令自身无敌 2 秒！' },
    ]
  },
  cow_stomp: {
    id: 'cow_stomp',
    name: '战争践踏',
    category: 'RACIAL',
    element: 'EARTH',
    color: '#d35400',
    icon: '💥',
    maxLevel: 5,
    levels: [
      { name: '战争践踏 I', desc: '每隔 5 秒重踏地面，对周围一圈敌人造成震波击退与伤害' },
      { name: '撼地猛踏 II', desc: '践踏半径扩大 40%，击退距离加倍' },
      { name: '地裂熔岩 III', desc: '践踏撕裂地面，留下一圈灼热地裂岩浆' },
      { name: '大地狂怒 IV', desc: '连续两段重踏，第二段必定使怪物眩晕' },
      { name: '【超武·天崩地裂】', desc: '大地如林尖刺拔地而起！贯穿全屏怪物，伴随剧烈震屏！' },
      { name: '【神化·泰坦撼岳】', desc: '★蛮荒铁牛极境突破★ 震碎整个竞技场！全图地核喷发，反伤光环翻倍暴涨！' },
    ]
  },
  sheep_wool: {
    id: 'sheep_wool',
    name: '羊毛滋养',
    category: 'RACIAL',
    element: 'WOOD',
    color: '#8e44ad',
    icon: '🧶',
    maxLevel: 5,
    levels: [
      { name: '羊毛滋养 I', desc: '每隔 7 秒向周围弹射 2 个羊毛球，拾取回复 15 点生命' },
      { name: '蓬松毛球 II', desc: '羊毛球数量增加至 3 个，拾取额外获得 2 秒移速提升' },
      { name: '羊毛尖刺 III', desc: '羊毛球飞出时带有尖刺，穿透沿途怪物' },
      { name: '温暖守护 IV', desc: '羊毛球生成时在自身周围生成一圈抵伤护体羊毛' },
      { name: '【超武·圣母绵羊】', desc: '天界飞羊降临！漫天圣光羊毛雨，怪群重创，自身瞬间满血！' },
      { name: '【神化·创生羊潮】', desc: '★圣光毛毛羊极境突破★ 召唤金色幻灵羊群全图奔腾踩踏，全屏自动吸聚无限回血！' },
    ]
  },
  fish_dash: {
    id: 'fish_dash',
    name: '咸鱼突刺',
    category: 'RACIAL',
    element: 'WATER',
    color: '#2980b9',
    icon: '⚡',
    maxLevel: 5,
    levels: [
      { name: '咸鱼突刺 I', desc: '每隔 4 秒向前直线贯穿突刺，穿透一条直线怪物' },
      { name: '极速突刺 II', desc: '冲刺距离提升 40%，附带 100% 致命暴击' },
      { name: '连环折返 III', desc: '突刺后迅速反向折返再刺一次' },
      { name: '狂浪飞刃 IV', desc: '突刺带有浪涌水刃向两侧激荡飞出' },
      { name: '【超武·化龙飞升】', desc: '咸鱼金光化龙！巨型金色巨龙虚影向前穿全图，吞噬沿途一切敌人！' },
      { name: '【神化·真龙降世】', desc: '★咸鱼王极境突破★ 巨龙盘旋全图龙啸撕碎一切，永久获得 35% 吸血！' },
    ]
  },

  // ---------------- 2. 战斗类技能 (魔兽武器狂暴系) ----------------
  whirlwind: {
    id: 'whirlwind',
    name: '战神旋风斩',
    category: 'COMBAT',
    element: 'METAL',
    color: '#e67e22',
    icon: '⚔️',
    maxLevel: 5,
    levels: [
      { name: '旋风斩 I', desc: '周身挥出钢铁刀光，击退并伤害贴身敌人' },
      { name: '旋风斩 II', desc: '斩击范围扩大 30%，伤害提高 25%' },
      { name: '双刃回旋 III', desc: '双重旋风斩击，暴击率增加 20%' },
      { name: '真空气刃 IV', desc: '挥砍附带锋锐气浪向外扩散' },
      { name: '【超武·剑刃风暴】', desc: '化为狂暴剑刃龙卷风！超大范围吸扯绞碎一切靠近的怪物！' },
      { name: '【神化·灭世怒风】', desc: '★战牛/母鸡极境超限★ 剑刃风暴撕开空间裂痕，伤害与斩杀线提高 80%！' },
    ]
  },
  mortal_strike: {
    id: 'mortal_strike',
    name: '裂铠重击',
    category: 'COMBAT',
    element: 'WIND',
    color: '#c0392b',
    icon: '🪓',
    maxLevel: 5,
    levels: [
      { name: '裂铠重击 I', desc: '每 3 秒挥动巨斧向正前方发出沉重劈砍，击飞前方敌人' },
      { name: '撕裂创伤 II', desc: '劈砍附带流血伤口，持续流血掉血 3 秒' },
      { name: '裂地巨斩 III', desc: '劈砍发出狂风冲击裂地波，直达屏幕边缘' },
      { name: '致命斩杀 IV', desc: '对生命低于 30% 的敌人伤害翻倍' },
      { name: '【超武·崩山断水斩】', desc: '双持狂怒天斩！金色巨斧劈开大地，沿途所有敌人受到 300% 暴击斩杀！' },
      { name: '【神化·崩山碎岳击】', desc: '★蛮荒铁牛极境超限★ 巨斧轰击全屏引发连锁山崩，全图所有怪物防御力归零！' },
    ]
  },
  chain_lightning: {
    id: 'chain_lightning',
    name: '狂雷风暴链',
    category: 'COMBAT',
    element: 'THUNDER',
    color: '#0984e3',
    icon: '⚡',
    maxLevel: 5,
    levels: [
      { name: '狂雷闪电 I', desc: '释放一道折线闪电，在 3 只敌人之间连环跳跃弹射' },
      { name: '雷霆狂涌 II', desc: '跳跃目标增加至 5 只，麻痹目标移速减半' },
      { name: '电浆暴击 III', desc: '每次跳跃伤害递增 15%，终点引发雷鸣轰爆' },
      { name: '双重雷链 IV', desc: '同时射出 2 道独立闪电链，覆盖整个怪群' },
      { name: '【超武·天谴雷暴】', desc: '天空化为雷池！无数道巨型雷霆疯狂连环跳跃，全屏电闪雷鸣万物化灰！' },
      { name: '【神化·九天玄雷劫】', desc: '★狂暴母鸡极境超限★ 闪电链弹跳次数无上限，击中敌人必定触发二次天罚！' },
    ]
  },

  // ---------------- 3. 神圣类技能 (魔兽圣光系) ----------------
  holy_smite: {
    id: 'holy_smite',
    name: '圣光惩击',
    category: 'HOLY',
    element: 'THUNDER',
    color: '#f1c40f',
    icon: '✨',
    maxLevel: 5,
    levels: [
      { name: '圣光惩击 I', desc: '射出金色圣光飞弹，自动轰击最近敌人' },
      { name: '圣光震击 II', desc: '光弹数量增至 2 发，伤害提高 30%' },
      { name: '神圣裁决 III', desc: '命中爆开金色圣十字溅射，驱散邪祟' },
      { name: '神圣洗礼 IV', desc: '光弹数量增至 4 发，附带 25% 圣光神圣暴击' },
      { name: '【超武·复仇之怒】', desc: '背后展开天使金羽！全屏漫天金色圣剑天罚轰鸣，毁灭怪群并瞬间自愈！' },
      { name: '【神化·永恒裁决】', desc: '★神圣极境超限★ 天使光羽持续全场，圣剑雨永不间断，神圣伤害提升 100%！' },
    ]
  },
  consecration: {
    id: 'consecration',
    name: '圣光奉献',
    category: 'HOLY',
    element: 'FIRE',
    color: '#ffeaa7',
    icon: '☀️',
    maxLevel: 5,
    levels: [
      { name: '圣光奉献 I', desc: '脚下周期性铺开金色圣光法阵，灼烧踩入的敌人' },
      { name: '炽热圣地 II', desc: '法阵半径扩大 30%，持续时间延长' },
      { name: '圣水迟滞 III', desc: '法阵内敌人移动速度减少 35%，受圣光伤害+40%' },
      { name: '多重圣坛 IV', desc: '场上可同时存在多片奉献法阵，自身在阵内回血' },
      { name: '【超武·神圣救赎圣地】', desc: '全屏绽放巨型神圣黄金大阵！光焰喷涌，一切邪物在圣阵内被彻底净化汽化！' },
      { name: '【神化·永恒救赎泉】', desc: '★水华仙鸭极境超限★ 圣阵融入潮汐之水，全屏不仅秒杀恶魔，更每秒全图回血 20 点！' },
    ]
  },
  holy_storm: {
    id: 'holy_storm',
    name: '神圣风暴',
    category: 'HOLY',
    element: 'METAL',
    color: '#f39c12',
    icon: '🗡️',
    maxLevel: 5,
    levels: [
      { name: '神圣圣剑 I', desc: '周身环绕 1 把旋转的金光圣剑，切割贴脸怪物' },
      { name: '双剑护体 II', desc: '旋转圣剑增至 2 把，回转速度提高 25%' },
      { name: '三位一体 III', desc: '旋转圣剑增至 3 把，剑刃扩大，伤害+35%' },
      { name: '圣光雷弧 IV', desc: '圣剑挥舞带金色电弧，触碰敌人引发连锁金光' },
      { name: '【超武·大领主风暴】', desc: '6 把巨型神圣烈焰圣剑环绕狂舞，掀起金圣火龙卷，粉碎一切靠近之敌！' },
      { name: '【神化·圣殿万刃】', desc: '★神圣极境超限★ 圣剑分裂为 12 把巨型审判金刃，旋转半径覆盖大半个屏幕！' },
    ]
  },

  // ---------------- 4. 邪能类技能 (魔兽术士恶魔系) ----------------
  fel_fire: {
    id: 'fel_fire',
    name: '邪能火种',
    category: 'FEL',
    element: 'FIRE',
    color: '#2ecc71',
    icon: '🔥',
    maxLevel: 5,
    levels: [
      { name: '邪能火苗 I', desc: '射出幽绿邪火球，命中附带持续恶魔毒灼烧' },
      { name: '邪能烈焰 II', desc: '绿火体积扩大，附带持续腐蚀剧毒伤害+35%' },
      { name: '混乱之箭 III', desc: '进化为恶魔龙首混乱箭，穿透敌人并在身后炸裂' },
      { name: '双龙狂啸 IV', desc: '射出 2 枚恶魔混乱箭，爆炸产生邪火火花' },
      { name: '【超武·地狱火雨】', desc: '撕裂扭曲虚空！全屏狂降巨大幽绿地狱流星，炸出全图漫天邪火火海！' },
      { name: '【神化·焚天魔火】', desc: '★咸鱼王极境超限★ 地狱火流星连续坠落不停，全场所有怪物陷入永久恐惧逃窜！' },
    ]
  },
  fel_immolation: {
    id: 'fel_immolation',
    name: '献祭光环',
    category: 'FEL',
    element: 'WOOD',
    color: '#27ae60',
    icon: '🟢',
    maxLevel: 5,
    levels: [
      { name: '献祭光环 I', desc: '周身燃烧一圈薄薄幽绿邪火，贴身敌人受持续燃烧' },
      { name: '恶魔烈环 II', desc: '邪火范围扩大 30%，燃烧伤害频率提高' },
      { name: '毒焰喷溅 III', desc: '燃烧时向外喷溅恶魔绿焰火舌，伤害+40%' },
      { name: '尸爆之火 IV', desc: '击杀被献祭灼烧的敌人时产生剧烈邪能小爆炸' },
      { name: '【超武·恶魔变身】', desc: '长出恶魔双角！周身爆发数十英尺熊熊邪火风暴，向外释放脉冲火环！' },
      { name: '【神化·伊利达雷之怒】', desc: '★邪能极境超限★ 化身完整恶魔形态，移速与灼烧伤害翻倍，吸收伤害转化为生命！' },
    ]
  },

  // ---------------- 5. 死亡类技能 (魔兽死骑暗影系) ----------------
  death_decay: {
    id: 'death_decay',
    name: '幽冥枯萎',
    category: 'DEATH',
    element: 'WATER',
    color: '#74b9ff',
    icon: '💀',
    maxLevel: 5,
    levels: [
      { name: '幽冥枯萎 I', desc: '在地面展开一片深邃死气凋零死地，吸血并减速敌人' },
      { name: '天灾死境 II', desc: '死地范围扩大 40%，敌人被减速 40%' },
      { name: '白骨抽魂 III', desc: '死地内每消灭一只敌人，自身立即回复 3 点生命' },
      { name: '灵魂凋零 IV', desc: '死地内的敌人受到的所有伤害提升 45%' },
      { name: '【超武·九幽死境】', desc: '天灾降临！全屏化为幽蓝死亡深渊，无数怨灵白骨疯狂抓扯怪物撕裂殆尽！' },
      { name: '【神化·巫妖王之怒】', desc: '★咸鱼王/死骑极境超限★ 死亡深渊瞬间冰封全场怪物，生命吸取提高至 100%！' },
    ]
  },
  shadow_bolt: {
    id: 'shadow_bolt',
    name: '灭世暗影箭',
    category: 'DEATH',
    element: 'EARTH',
    color: '#9b59b6',
    icon: '🔮',
    maxLevel: 5,
    levels: [
      { name: '暗影箭 I', desc: '发射一枚深紫色暗影飞弹冲击最近敌人' },
      { name: '双生暗影 II', desc: '暗影箭数量增加至 2 枚，附加虚空易伤' },
      { name: '虚空触手 III', desc: '命中时在地面催生暗影触手，狂乱抽打击飞怪群' },
      { name: '深渊触手 IV', desc: '触手增至 4 条，且触手抽打附带生命偷取' },
      { name: '【超武·虚空大坍缩】', desc: '战场中央撕开黑洞！超强引力把全屏敌人强行吸聚碾碎，随后引发黑洞大核爆！' },
      { name: '【神化·虚空大湮灭】', desc: '★死亡极境超限★ 黑洞裂变出双子黑洞，全屏重力粉碎一切精英与Boss护甲！' },
    ]
  },
  shadow_curse: {
    id: 'shadow_curse',
    name: '痛苦血咒',
    category: 'DEATH',
    element: 'WOOD',
    color: '#8e44ad',
    icon: '👁️',
    maxLevel: 5,
    levels: [
      { name: '痛苦诅咒 I', desc: '自动给最近 3 名敌人施加血咒印记，持续跳血' },
      { name: '血咒扩散 II', desc: '诅咒目标增加至 6 名，掉血速度加快 30%' },
      { name: '宿主尸爆 III', desc: '诅咒目标死亡时爆炸，将印记传染给周围所有敌人' },
      { name: '绝望折磨 IV', desc: '受到诅咒的敌人移速减少 40%，受暗影伤害+50%' },
      { name: '【超武·末日降临】', desc: '全屏所有敌人被血咒锁定，受到剧烈虚空绞杀，阵亡时引发连锁全屏大爆炸！' },
      { name: '【神化·深渊心控】', desc: '★毛毛羊极境超限★ 被诅咒致死的小怪化为己方幽灵仆从，替玩家阻挡伤害！' },
    ]
  },

  // ---------------- 6. 奥术类技能 (魔兽法师肯瑞托系) ----------------
  arcane_missiles: {
    id: 'arcane_missiles',
    name: '奥术天穹飞弹',
    category: 'ARCANE',
    element: 'METAL',
    color: '#a29bfe',
    icon: '🌌',
    maxLevel: 5,
    levels: [
      { name: '奥术飞弹 I', desc: '周期性发射 3 枚淡紫晶石光弹，自动跟踪锁定怪物' },
      { name: '连珠奥弹 II', desc: '飞弹增至 5 枚，飞行速度提高 40%' },
      { name: '奥能涌动 III', desc: '飞弹命中引发奥术小魔爆，附带击退' },
      { name: '星穹齐射 IV', desc: '飞弹增至 8 枚，穿透第一只目标' },
      { name: '【超武·星界奥能风暴】', desc: '奥术天穹展开！漫天璀璨奥术流星暴雨如狂风骤雨般自动全图轰炸！' },
      { name: '【神化·星穹湮灭炮】', desc: '★毛毛羊极境超限★ 召唤星界轨道巨炮，每秒一道万丈光束直接贯穿全图！' },
    ]
  },
  frost_nova: {
    id: 'frost_nova',
    name: '极寒冰环',
    category: 'ARCANE',
    element: 'WATER',
    color: '#00cec9',
    icon: '❄️',
    maxLevel: 5,
    levels: [
      { name: '极寒冰环 I', desc: '周身周期性爆开一圈寒冰碎屑，冰冻周围怪物 1.5 秒' },
      { name: '寒霜刺骨 II', desc: '冰环扩散半径扩大 35%，冻结时间延长至 2.5 秒' },
      { name: '碎冰爆裂 III', desc: '被冻结的怪物受到攻击时产生碎冰，溅射周围敌人' },
      { name: '暴风雪环 IV', desc: '释放双环暴风雪，伤害提高 50%' },
      { name: '【超武·绝对零度】', desc: '极寒领域瞬发！全屏万物瞬间被冻结成冰雕，脆化后齐声粉碎！' },
      { name: '【神化·永恒冰封】', desc: '★嘎嘎神鸭极境超限★ 全图小怪永久冻结为冰柱，精英与Boss移速被削减 75%！' },
    ]
  },
  blizzard: {
    id: 'blizzard',
    name: '极冰暴风雪',
    category: 'ARCANE',
    element: 'WATER',
    color: '#74b9ff',
    icon: '🌨️',
    maxLevel: 5,
    levels: [
      { name: '小型冰雨 I', desc: '在前方目标区域降下小型暴风雪，持续落下冰锥减速外星人' },
      { name: '冰雹狂袭 II', desc: '暴风雪半径扩大 30%，冰锥落下频率与伤害提升 35%' },
      { name: '极寒涡流 III', desc: '暴风雪中心形成冰霜吸力旋涡，将边缘外星人强行牵扯至暴雪中心' },
      { name: '绝对冰封 IV', desc: '暴风雪内敌人受到冻结与碎冰多重爆裂伤害' },
      { name: '【超武·极冰碎星大暴风雪】', desc: '全屏漫天暴雪降临！超大冰龙卷撕扯全场外星人，碎冰狂暴秒杀！' },
      { name: '【神化·创世霜天绝对零度】', desc: '★神鸭极境★ 暴风雪神圣升华，全屏外星人瞬间被零度绝对封冻！' },
    ]
  },
  chaos_bolt: {
    id: 'chaos_bolt',
    name: '混乱之箭',
    category: 'FEL',
    element: 'FIRE',
    color: '#2ecc71',
    icon: '☄️',
    maxLevel: 5,
    levels: [
      { name: '混乱飞弹 I', desc: '发射一枚盘旋的绿火恶魔龙弹，贯穿单名敌人并引发微型邪焰爆裂' },
      { name: '双螺旋箭 II', desc: '双螺旋交织邪火，弹道速度提升 35%，穿透 2 名外星怪' },
      { name: '恶魔龙首 III', desc: '飞弹化为巨大恶魔龙首，在沿途留下焚烧焦土持续剧毒' },
      { name: '浩劫狂澜 IV', desc: '恶魔龙首贯穿 4 名敌人，命中终点引爆巨大邪能冲击波' },
      { name: '【超武·虚空混乱龙皇】', desc: '召唤灭世黑绿恶魔巨龙呼啸横穿全屏，撕碎所有阻挡之敌！' },
      { name: '【神化·极恶深渊湮灭龙息】', desc: '★咸鱼王极境★ 龙息喷涌伴随虚空引力黑洞，毁灭一切外星入侵者！' },
    ]
  },
  holy_shock: {
    id: 'holy_shock',
    name: '神圣震击',
    category: 'HOLY',
    element: 'METAL',
    color: '#f1c40f',
    icon: '⚡',
    maxLevel: 5,
    levels: [
      { name: '神圣震击 I', desc: '从天而降 1 道圣光闪电精准轰击最近外星人，附带溅射' },
      { name: '圣罚连击 II', desc: '圣光闪电增至 2 道，并微量回复主角生命值' },
      { name: '金芒神罚 III', desc: '增至 3 道天降金雷，附带神圣十字致盲瘫痪外星怪群' },
      { name: '炽天使雷霆 IV', desc: '增至 5 道金色圣雷连环狂轰，留下神圣祝福金圈' },
      { name: '【超武·审判天平】', desc: '7 道炽天使天界圣柱瞬间轰击全屏，瞬间治愈主角 25% 最大生命！' },
      { name: '【神化·诸神黎明裁决】', desc: '★毛毛羊极境★ 天堂圣光照亮整座战场，所有外星怪物被光明永久蒸发！' },
    ]
  },
  bone_storm: {
    id: 'bone_storm',
    name: '白骨风暴',
    category: 'DEATH',
    element: 'EARTH',
    color: '#bdc3c7',
    icon: '🦴',
    maxLevel: 5,
    levels: [
      { name: '旋转骨矛 I', desc: '2 根锋利白骨飞矛围绕主角高速旋转，切割贴身敌人' },
      { name: '三重骨刺 II', desc: '骨矛增至 3 根，旋转半径与切割频率提升 30%' },
      { name: '白骨回旋 III', desc: '骨矛增至 4 根，击中敌人产生碎骨飞溅造成二次伤害' },
      { name: '血骨绞肉 IV', desc: '骨矛增至 6 根，双层内外环同时旋转，并汲取生命值' },
      { name: '【超武·冰封天灾骨暴】', desc: '8 根幽蓝符文巨型骨刃形成全屏骸骨绞肉暴风，摧枯拉朽！' },
      { name: '【神化·冥渊通灵神环】', desc: '★咸鱼王极境★ 万骨化龙！金色神骨符文大阵，外星群怪触之即化为齑粉！' },
    ]
  },
  thunder_clap: {
    id: 'thunder_clap',
    name: '雷霆震击',
    category: 'COMBAT',
    element: 'THUNDER',
    color: '#0984e3',
    icon: '⚡',
    maxLevel: 5,
    levels: [
      { name: '雷霆震击 I', desc: '重踏地面激荡出十字电芒，震退周围敌人并造成感电' },
      { name: '电弧扩散 II', desc: '激化为四向闪电地裂波，扩散范围提升 40%' },
      { name: '八荒雷动 III', desc: '八向狂雷裂地喷涌，受到雷击的敌人陷入麻痹僵直' },
      { name: '泰坦狂雷 IV', desc: '十六向狂暴雷电交织成电网，造成强力连环触电' },
      { name: '【超武·泰坦灭世雷霆】', desc: '泰坦巨神震怒！全屏地面崩裂为耀眼雷浆，怪物全部升空受击！' },
      { name: '【神化·太古雷帝万钧破岳】', desc: '★蛮荒铁牛极境★ 太古雷神附体！全图降下亿万道金色神雷，瞬间清空全图！' },
    ]
  },
  bloodlust: {
    id: 'bloodlust',
    name: '嗜血战歌',
    category: 'COMBAT',
    element: 'FIRE',
    color: '#d63031',
    icon: '🩸',
    maxLevel: 5,
    levels: [
      { name: '嗜血战歌 I', desc: '周期性战吼爆发赤红刀风，击退敌人并提高主角移速 15%' },
      { name: '狂热战意 II', desc: '刀风范围扩大 35%，移动速度提升 25%，暴击率提高 10%' },
      { name: '烈焰旋刀 III', desc: '吼出环形烈焰风暴，击中敌人附带持续烈火灼烧' },
      { name: '战神之怒 IV', desc: '战意化为赤焰血翼，攻击速度暴涨 40%' },
      { name: '【超武·远古兽王战旗】', desc: '插下金色烈焰战旗！主角攻速移速翻倍，刀光纵横全屏！' },
      { name: '【神化·不朽神战通天血芒】', desc: '★狂暴母鸡极境★ 远古神战血光通天彻地！全属性永久大幅暴涨！' },
    ]
  },

  // ---------------- 7. 通用被动属性 (全职业通用修习) ----------------
  stat_might: {
    id: 'stat_might',
    name: '猛兽泰坦之力',
    category: 'PASSIVE',
    element: 'METAL',
    color: '#e74c3c',
    icon: '💪',
    maxLevel: 5,
    levels: [
      { name: '猛兽之力 I', desc: '全技能伤害提高 20%' },
      { name: '猛兽之力 II', desc: '全技能伤害提高 40%' },
      { name: '猛兽之力 III', desc: '全技能伤害提高 60%' },
      { name: '猛兽之力 IV', desc: '全技能伤害提高 80%' },
      { name: '【极境·泰坦神力】', desc: '全技能伤害提高 100%，暴击伤害额外提高 50%！' },
    ]
  },
  stat_haste: {
    id: 'stat_haste',
    name: '狂躁嗜血极速',
    category: 'PASSIVE',
    element: 'THUNDER',
    color: '#e67e22',
    icon: '⚡',
    maxLevel: 5,
    levels: [
      { name: '狂躁极速 I', desc: '技能冷却缩减 12%' },
      { name: '狂躁极速 II', desc: '技能冷却缩减 24%' },
      { name: '狂躁极速 III', desc: '技能冷却缩减 36%' },
      { name: '狂躁极速 IV', desc: '技能冷却缩减 48%' },
      { name: '【极境·狂怒嗜血】', desc: '技能冷却缩减 65%，飞弹弹道速度翻倍！' },
    ]
  },
  stat_speed: {
    id: 'stat_speed',
    name: '神行疾风魅影',
    category: 'PASSIVE',
    element: 'WIND',
    color: '#16a085',
    icon: '🐾',
    maxLevel: 5,
    levels: [
      { name: '神行飞毛腿 I', desc: '移动速度提高 15%' },
      { name: '神行飞毛腿 II', desc: '移动速度提高 30%' },
      { name: '神行飞毛腿 III', desc: '移动速度提高 45%' },
      { name: '神行飞毛腿 IV', desc: '移动速度提高 60%' },
      { name: '【极境·疾风魅影】', desc: '移动速度提高 80%，奔跑时留下残影并提高 20% 闪避率！' },
    ]
  },
  stat_magnet: {
    id: 'stat_magnet',
    name: '万有引力魔晶',
    category: 'PASSIVE',
    element: 'EARTH',
    color: '#3498db',
    icon: '🧲',
    maxLevel: 5,
    levels: [
      { name: '万有引力 I', desc: '灵魂碎片吸收范围提高 50%' },
      { name: '万有引力 II', desc: '灵魂碎片吸收范围提高 100%' },
      { name: '万有引力 III', desc: '灵魂碎片吸收范围提高 150%' },
      { name: '万有引力 IV', desc: '灵魂碎片吸收范围提高 200%' },
      { name: '【极境·黑洞引力】', desc: '全图吸星！拾取范围提高 300%，拾取碎片时微量回血！' },
    ]
  },
  stat_vitality: {
    id: 'stat_vitality',
    name: '不灭神躯生机',
    category: 'PASSIVE',
    element: 'WOOD',
    color: '#27ae60',
    icon: '💖',
    maxLevel: 5,
    levels: [
      { name: '蛮荒再生 I', desc: '最大生命值 +30，每秒回复 1 点生命' },
      { name: '蛮荒再生 II', desc: '最大生命值 +60，每秒回复 2 点生命' },
      { name: '蛮荒再生 III', desc: '最大生命值 +90，每秒回复 3 点生命' },
      { name: '蛮荒再生 IV', desc: '最大生命值 +120，每秒回复 5 点生命' },
      { name: '【极境·不灭神躯】', desc: '最大生命值 +180，每秒回复 8 点生命！' },
    ]
  }
};
