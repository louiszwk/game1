/**
 * 装备系统数据配置与常数 (Equipment Data & Configuration)
 * 16 部位体系 · 6 档稀有度 · 双轴词条 · 零贴图魔兽构筑
 */

// 16 经典部位定义
export const EQUIPMENT_SLOTS = {
  head: { key: 'head', name: '头部', icon: '👑', group: 'armor', desc: '羽冠/犄角/鳞盔' },
  neck: { key: 'neck', name: '颈部', icon: '📿', group: 'armor', desc: '项圈/鳞环' },
  shoulder: { key: 'shoulder', name: '肩部', icon: '🛡️', group: 'armor', desc: '护肩/翼甲' },
  back: { key: 'back', name: '背部', icon: '🪶', group: 'armor', desc: '披风/羽翼' },
  chest: { key: 'chest', name: '胸部', icon: '🥋', group: 'armor', desc: '胸甲/铁羽' },
  wrist: { key: 'wrist', name: '腕部', icon: '🧤', group: 'armor', desc: '护腕/利爪套' },
  hands: { key: 'hands', name: '手部', icon: '🐾', group: 'armor', desc: '利爪/蹄套' },
  waist: { key: 'waist', name: '腰部', icon: '🎗️', group: 'armor', desc: '束带/鳞带' },
  legs: { key: 'legs', name: '腿部', icon: '🦵', group: 'armor', desc: '腿甲/鳞腿' },
  feet: { key: 'feet', name: '脚部', icon: '🥾', group: 'armor', desc: '利爪靴/铁蹄' },
  finger1: { key: 'finger1', name: '戒指1', icon: '💍', group: 'jewelry', desc: '灵环' },
  finger2: { key: 'finger2', name: '戒指2', icon: '💍', group: 'jewelry', desc: '魂环' },
  trinket1: { key: 'trinket1', name: '饰品1', icon: '🔮', group: 'jewelry', desc: '灵珠/火核' },
  trinket2: { key: 'trinket2', name: '饰品2', icon: '🧿', group: 'jewelry', desc: '神符/风石' },
  main_hand: { key: 'main_hand', name: '主手', icon: '⚔️', group: 'weapon', desc: '锐喙/重蹄/利爪 (核心攻击)' },
  off_hand: { key: 'off_hand', name: '副手', icon: '🛡️', group: 'weapon', desc: '羽盾/鳞盾 (防御减伤)' },
};

export const SLOT_KEYS = Object.keys(EQUIPMENT_SLOTS);

// 6 档稀有度定义（还原魔兽品质经典色系）
export const RARITIES = {
  poor: {
    key: 'poor',
    rank: 0,
    name: '粗糙',
    color: '#9d9d9d',
    bgColor: 'rgba(157, 157, 157, 0.25)',
    affixCount: 1,
    multiplier: 0.35,
  },
  common: {
    key: 'common',
    rank: 1,
    name: '普通',
    color: '#ffffff',
    bgColor: 'rgba(255, 255, 255, 0.25)',
    affixCount: 1,
    multiplier: 0.6,
  },
  uncommon: {
    key: 'uncommon',
    rank: 2,
    name: '优秀',
    color: '#1eff00',
    bgColor: 'rgba(30, 255, 0, 0.25)',
    affixCount: 2,
    multiplier: 1.0,
  },
  rare: {
    key: 'rare',
    rank: 3,
    name: '精良',
    color: '#0070dd',
    bgColor: 'rgba(0, 112, 221, 0.28)',
    affixCount: 3,
    multiplier: 1.5,
  },
  epic: {
    key: 'epic',
    rank: 4,
    name: '史诗',
    color: '#a335ee',
    bgColor: 'rgba(163, 53, 238, 0.32)',
    affixCount: 3,
    hasElement: true,
    multiplier: 2.2,
  },
  legendary: {
    key: 'legendary',
    rank: 5,
    name: '传说',
    color: '#ff8000',
    bgColor: 'rgba(255, 128, 0, 0.38)',
    affixCount: 4,
    hasElement: true,
    hasUnique: true,
    multiplier: 3.2,
  },
};

// 基础词条库 (按部位偏向加权抽取)
export const AFFIX_DEFINITIONS = {
  atk: { key: 'atk', name: '攻击力', format: 'percent', baseMin: 0.03, baseMax: 0.08, statKey: 'atkMultiplier' },
  crit: { key: 'crit', name: '暴击率', format: 'percent', baseMin: 0.015, baseMax: 0.035, statKey: 'critRate' },
  crit_dmg: { key: 'crit_dmg', name: '暴击伤害', format: 'percent', baseMin: 0.05, baseMax: 0.12, statKey: 'critDmgMultiplier' },
  hp: { key: 'hp', name: '生命上限', format: 'flat', baseMin: 18, baseMax: 45, statKey: 'maxHp' },
  hp_regen: { key: 'hp_regen', name: '每秒回血', format: 'flat', baseMin: 0.5, baseMax: 1.2, statKey: 'hpRegen' },
  dodge: { key: 'dodge', name: '闪避率', format: 'percent', baseMin: 0.015, baseMax: 0.03, statKey: 'dodgeRate' },
  lifesteal: { key: 'lifesteal', name: '吸血', format: 'percent', baseMin: 0.01, baseMax: 0.025, statKey: 'lifeSteal' },
  cdr: { key: 'cdr', name: '冷却缩减', format: 'percent', baseMin: 0.02, baseMax: 0.05, statKey: 'cooldownReduce' },
  move: { key: 'move', name: '移速', format: 'percent', baseMin: 0.02, baseMax: 0.05, statKey: 'speedBonus' },
  magnet: { key: 'magnet', name: '拾取范围', format: 'percent', baseMin: 0.08, baseMax: 0.18, statKey: 'magnetBonus' },
  dmg_reduce: { key: 'dmg_reduce', name: '伤害减免', format: 'percent', baseMin: 0.015, baseMax: 0.035, statKey: 'damageReduce' },
};

// 各部位专属词条倾向池
export const SLOT_AFFIX_POOLS = {
  head: ['crit', 'hp', 'atk', 'dmg_reduce'],
  neck: ['hp', 'hp_regen', 'dmg_reduce', 'cdr'],
  shoulder: ['atk', 'dmg_reduce', 'hp', 'crit'],
  back: ['dodge', 'move', 'cdr', 'magnet'],
  chest: ['hp', 'dmg_reduce', 'hp_regen', 'hp'],
  wrist: ['cdr', 'atk', 'crit', 'move'],
  hands: ['atk', 'crit', 'crit_dmg', 'lifesteal'],
  waist: ['hp', 'magnet', 'hp_regen', 'dmg_reduce'],
  legs: ['hp', 'move', 'dmg_reduce', 'dodge'],
  feet: ['move', 'dodge', 'cdr', 'hp'],
  finger1: ['cdr', 'atk', 'crit', 'lifesteal'],
  finger2: ['crit', 'crit_dmg', 'atk', 'lifesteal'],
  trinket1: ['atk', 'crit_dmg', 'cdr', 'lifesteal'],
  trinket2: ['dmg_reduce', 'hp_regen', 'dodge', 'hp'],
  main_hand: ['atk', 'crit', 'crit_dmg', 'lifesteal', 'atk'], // 主手武器高权攻击
  off_hand: ['dmg_reduce', 'hp', 'dodge', 'hp_regen', 'dmg_reduce'], // 副手高权防御
};

// 史诗/传说级专属五行元素词条（计入五行联动 ElementSynergyManager，补全羁绊之匙）
export const ELEMENT_AFFIXES = {
  ele_fire: { key: 'ele_fire', element: 'FIRE', name: '烈焰强化', desc: '火系技能增伤 +10%', bonus: 0.10 },
  ele_water: { key: 'ele_water', element: 'WATER', name: '潮汐强化', desc: '水系技能增伤 +10%', bonus: 0.10 },
  ele_wood: { key: 'ele_wood', element: 'WOOD', name: '苍翠自然', desc: '木系技能增伤 +10%', bonus: 0.10 },
  ele_metal: { key: 'ele_metal', element: 'METAL', name: '庚金锋芒', desc: '金系技能增伤 +10%', bonus: 0.10 },
  ele_earth: { key: 'ele_earth', element: 'EARTH', name: '厚土磐石', desc: '土系技能增伤 +10%', bonus: 0.10 },
  ele_thunder: { key: 'ele_thunder', element: 'THUNDER', name: '狂雷天罚', desc: '雷系技能增伤 +10%', bonus: 0.10 },
  ele_wind: { key: 'ele_wind', element: 'WIND', name: '疾风骤起', desc: '风系技能增伤 +10%', bonus: 0.10 },
};

// 传说独占改变玩法级专属词条
export const UNIQUE_LEGENDARY_AFFIXES = {
  unique_berserk: {
    key: 'unique_berserk',
    name: '【背水血怒】',
    desc: '生命值低于 35% 时，攻击力额外暴涨 +50%！',
  },
  unique_glass: {
    key: 'unique_glass',
    name: '【玻璃大炮】',
    desc: '攻击力额外提升 +60%，但生命上限减少 25%',
  },
  unique_tank: {
    key: 'unique_tank',
    name: '【叹息之壁】',
    desc: '承受伤害减免 +20%，但移动速度降低 8%',
  },
  unique_elec: {
    key: 'unique_elec',
    name: '【雷霆万钧】',
    desc: '所有技能暴击时，在敌人间引发高能连锁电弧！',
  },
  unique_vamp: {
    key: 'unique_vamp',
    name: '【嗜血渴求】',
    desc: '物理与符文吸血翻倍，击败怪物即刻恢复微量气血',
  },
  unique_avatar: {
    key: 'unique_avatar',
    name: '【神威天降】',
    desc: '全身基础属性额外提升 +18%，并激发神圣金色光环造型！',
  },
};

// 动物主题装备命名前缀生成
export const ITEM_NAME_TEMPLATES = {
  weapon: ['灭世巨喙', '泰坦重蹄', '狂怒龙爪', '裂地战刃', '虚空雷牙'],
  armor: ['天神羽盔', '厚土甲胄', '疾风护翼', '不灭铁胫', '玄龟龙甲'],
  jewelry: ['星穹魂环', '万灵符石', '深渊魔珠', '先祖灵珠', '混沌指环'],
};

