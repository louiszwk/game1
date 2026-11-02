/**
 * 角色阶段演化模型配置 (Player Model Stage)
 *
 * 严格按「角色枚举(raceId) + 职业枚举(classId)」组合键，切换热血漫画风模型。
 *
 * 【需求 A —— 5 阶段演化细化】
 * 每逢 10 级切换下一阶段，共 5 个阶段：
 *   stage1 (Lv 1~9)   可爱幼体
 *   stage2 (Lv 10~19) 青少年
 *   stage3 (Lv 20~29) 成熟体
 *   stage4 (Lv 30~39) 重度武装
 *   stage5 (Lv 40+)   神力光效
 *
 * 阶段命名语义（STAGE_META 中预留，供 UI / 成就 / 音频等模块读取）：
 *   stage1 → 可爱 / stage2 → 青少年 / stage3 → 成熟 / stage4 → 重度武装 / stage5 → 神力光效
 *
 * 资源映射策略：显式配置「种族:职业」组合键优先；未配置时回退到种族默认阶段图。
 * 组合键 `${raceId}:${classId}` 未显式配置时，回退到 `${raceId}:default`。
 */

// 现有 hero 图资源路径（占位）
const HERO_BASE = 'images/heroes/';

// 阶段语义元数据（预留键值，供各系统统一读取）
export const STAGE_META = {
  stage1: { key: 'stage1', name: '可爱',     minLevel: 1,  maxLevel: 9  },
  stage2: { key: 'stage2', name: '青少年',   minLevel: 10, maxLevel: 19 },
  stage3: { key: 'stage3', name: '成熟',     minLevel: 20, maxLevel: 29 },
  stage4: { key: 'stage4', name: '重度武装', minLevel: 30, maxLevel: 39 },
  stage5: { key: 'stage5', name: '神力光效', minLevel: 40, maxLevel: Infinity },
};

// 每个种族各阶段占位图（复用本体图，避免重复资源占用主包体积）
// 预留 stage1~stage5 五个层级键值；后续为各阶段补充独立资产时仅需替换对应文件名。
const RACE_STAGES = {
  chicken: { stage1: 'chicken.png', stage2: 'chicken.png', stage3: 'chicken.png', stage4: 'chicken.png', stage5: 'chicken.png' },
  duck:    { stage1: 'duck.png',    stage2: 'duck.png',    stage3: 'duck.png',    stage4: 'duck.png',    stage5: 'duck.png' },
  cow:     { stage1: 'cow.png',     stage2: 'cow.png',     stage3: 'cow.png',     stage4: 'cow.png',     stage5: 'cow.png' },
  sheep:   { stage1: 'sheep.png',   stage2: 'sheep.png',   stage3: 'sheep.png',   stage4: 'sheep.png',   stage5: 'sheep.png' },
  fish:    { stage1: 'fish.png',    stage2: 'fish.png',    stage3: 'fish.png',    stage4: 'fish.png',    stage5: 'fish.png' },
};
// 组合键 → 阶段资源（显式配置；未配置的回退到 race 默认）
// 「种族×职业」30 种组合的最终形态立绘（stage5 神力光效 + 重度武装满级资产）
// 每个组合独立映射到 images/heroes/{race}_{class}_final.png
export const MODEL_STAGES = {
  // 鸡族
  'chicken:warrior': { stage5: HERO_BASE + 'chicken_warrior_final.png' },
  'chicken:holy_knight': { stage5: HERO_BASE + 'chicken_holy_knight_final.png' },
  'chicken:death_knight': { stage5: HERO_BASE + 'chicken_death_knight_final.png' },
  'chicken:mage': { stage5: HERO_BASE + 'chicken_mage_final.png' },
  'chicken:fel_warlock': { stage5: HERO_BASE + 'chicken_fel_warlock_final.png' },
  'chicken:shaman': { stage5: HERO_BASE + 'chicken_shaman_final.png' },
  // 鸭族
  'duck:warrior': { stage5: HERO_BASE + 'duck_warrior_final.png' },
  'duck:holy_knight': { stage5: HERO_BASE + 'duck_holy_knight_final.png' },
  'duck:death_knight': { stage5: HERO_BASE + 'duck_death_knight_final.png' },
  'duck:mage': { stage5: HERO_BASE + 'duck_mage_final.png' },
  'duck:fel_warlock': { stage5: HERO_BASE + 'duck_fel_warlock_final.png' },
  'duck:shaman': { stage5: HERO_BASE + 'duck_shaman_final.png' },
  // 牛族
  'cow:warrior': { stage5: HERO_BASE + 'cow_warrior_final.png' },
  'cow:holy_knight': { stage5: HERO_BASE + 'cow_holy_knight_final.png' },
  'cow:death_knight': { stage5: HERO_BASE + 'cow_death_knight_final.png' },
  'cow:mage': { stage5: HERO_BASE + 'cow_mage_final.png' },
  'cow:fel_warlock': { stage5: HERO_BASE + 'cow_fel_warlock_final.png' },
  'cow:shaman': { stage5: HERO_BASE + 'cow_shaman_final.png' },
  // 羊族
  'sheep:warrior': { stage5: HERO_BASE + 'sheep_warrior_final.png' },
  'sheep:holy_knight': { stage5: HERO_BASE + 'sheep_holy_knight_final.png' },
  'sheep:death_knight': { stage5: HERO_BASE + 'sheep_death_knight_final.png' },
  'sheep:mage': { stage5: HERO_BASE + 'sheep_mage_final.png' },
  'sheep:fel_warlock': { stage5: HERO_BASE + 'sheep_fel_warlock_final.png' },
  'sheep:shaman': { stage5: HERO_BASE + 'sheep_shaman_final.png' },
  // 鱼族
  'fish:warrior': { stage5: HERO_BASE + 'fish_warrior_final.png' },
  'fish:holy_knight': { stage5: HERO_BASE + 'fish_holy_knight_final.png' },
  'fish:death_knight': { stage5: HERO_BASE + 'fish_death_knight_final.png' },
  'fish:mage': { stage5: HERO_BASE + 'fish_mage_final.png' },
  'fish:fel_warlock': { stage5: HERO_BASE + 'fish_fel_warlock_final.png' },
  'fish:shaman': { stage5: HERO_BASE + 'fish_shaman_final.png' },
};

/**
 * 根据等级推导阶段编号（1~5）
 * Lv 1~9 → 1, Lv 10~19 → 2, Lv 20~29 → 3, Lv 30~39 → 4, Lv 40+ → 5
 * @param {number} level
 * @returns {number} 阶段编号 1~5
 */
export function getStageByLevel(level) {
  if (level >= 40) return 5;
  if (level >= 30) return 4;
  if (level >= 20) return 3;
  if (level >= 10) return 2;
  return 1;
}

/**
 * 根据角色与等级，解析当前阶段与模型路径
 * @param {string} raceId
 * @param {string} classId
 * @param {number} level
 * @returns {{ stage: number, stageName: string, modelPath: string, modelKey: string }}
 */
export function resolveModelStage(raceId, classId, level) {
  const stage = getStageByLevel(level);
  const modelKey = `${raceId}:${classId}`;
  const stageKey = `stage${stage}`;

  // 1. 优先查显式组合键
  let cfg = MODEL_STAGES[modelKey];
  let path = cfg && cfg[stageKey];

  // 2. 回退到种族默认阶段图
  if (!path) {
    const raceStages = RACE_STAGES[raceId];
    if (raceStages) {
      path = HERO_BASE + (raceStages[stageKey] || raceStages.stage1);
    }
  }

  // 3. 最终兜底
  if (!path) {
    path = HERO_BASE + 'chicken.png';
  }

  const stageName = (STAGE_META[stageKey] && STAGE_META[stageKey].name) || '';

  return { stage, stageName, modelPath: path, modelKey };
}

/**
 * 【UI 预览专用】获取「角色 + 职业」组合的最高阶最终形态展示资源。
 *
 * 选人界面（Character Select UI）展示的立绘不能是 1 级状态，
 * 必须直接读取 MODEL_STAGES 字典中该组合的 stage5（神力光效 +
 * 重度武装满级资产）进行 UI 渲染，与战斗实体的 1 级初始化严格解耦。
 *
 * 注意：本方法仅用于 UI 预览，绝不影响战斗数值——战斗实体初始化
 * 走 Player.setup()（严格重置为 1 级 + Canvas 降级渲染）。
 *
 * @param {string} raceId 种族枚举
 * @param {string} classId 职业枚举
 * @returns {{ stage: number, stageName: string, modelPath: string, modelKey: string, assetKey: string }}
 */
export function getUIPreviewModel(raceId, classId) {
  const stage = 5; // 最高阶最终形态（神力光效 + 重度武装满级）
  const stageKey = 'stage5';
  const modelKey = `${raceId}:${classId}`;

  // 1. 优先查显式「角色:职业」组合键的最高阶资源
  let cfg = MODEL_STAGES[modelKey];
  let path = cfg && cfg[stageKey];

  // 2. 回退到种族默认阶段图的最高阶
  if (!path) {
    const raceStages = RACE_STAGES[raceId];
    if (raceStages) {
      path = HERO_BASE + (raceStages[stageKey] || raceStages.stage1);
    }
  }

  // 3. 最终兜底
  if (!path) {
    path = HERO_BASE + 'chicken.png';
  }

  const stageName = (STAGE_META[stageKey] && STAGE_META[stageKey].name) || '';

  return { stage, stageName, modelPath: path, modelKey, assetKey: stageKey };
}
