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

// 现有 hero 图资源路径（基础图形）
const HERO_BASE = 'images/heroes/';

// 阶段语义元数据（预留键值，供各系统统一读取，扩充至 7 个阶段）
export const STAGE_META = {
  1: { key: 'stage1', minLevel: 1,  name: '初心幼体', desc: '基础轻装无饰品' },
  2: { key: 'stage2', minLevel: 10, name: '见习勇士', desc: '初级头盔/披风，武器微光' },
  3: { key: 'stage3', minLevel: 20, name: '精锐武者', desc: '肩部轻铠，种族属性微芒' },
  4: { key: 'stage4', minLevel: 30, name: '重装大师', desc: '重型护甲，图腾徽记' },
  5: { key: 'stage5', minLevel: 40, name: '史诗宗师', desc: '专属神兵，元素光翼' },
  6: { key: 'stage6', minLevel: 50, name: '神话领主', desc: '流光战铠，神力光环' },
  7: { key: 'stage7', minLevel: 60, name: '至尊天神', desc: '粒子风暴，天神之翼，首领光环' },
  // 兼顾字符串键 stageN
  stage1: { key: 'stage1', minLevel: 1,  name: '初心幼体', desc: '基础轻装无饰品' },
  stage2: { key: 'stage2', minLevel: 10, name: '见习勇士', desc: '初级头盔/披风，武器微光' },
  stage3: { key: 'stage3', minLevel: 20, name: '精锐武者', desc: '肩部轻铠，种族属性微芒' },
  stage4: { key: 'stage4', minLevel: 30, name: '重装大师', desc: '重型护甲，图腾徽记' },
  stage5: { key: 'stage5', minLevel: 40, name: '史诗宗师', desc: '专属神兵，元素光翼' },
  stage6: { key: 'stage6', minLevel: 50, name: '神话领主', desc: '流光战铠，神力光环' },
  stage7: { key: 'stage7', minLevel: 60, name: '至尊天神', desc: '粒子风暴，天神之翼，首领光环' },
};

// 每个种族各阶段外观图（复用本体图，优化主包体积）
// 预留 stage1~stage7 七个层级键值；后续为各阶段补充独立资产时仅需替换对应文件名。
const RACE_STAGES = {
  chicken: { stage1: 'chicken.png', stage2: 'chicken.png', stage3: 'chicken.png', stage4: 'chicken.png', stage5: 'chicken.png', stage6: 'chicken.png', stage7: 'chicken.png' },
  duck:    { stage1: 'duck.png',    stage2: 'duck.png',    stage3: 'duck.png',    stage4: 'duck.png',    stage5: 'duck.png',    stage6: 'duck.png',    stage7: 'duck.png' },
  cow:     { stage1: 'cow.png',     stage2: 'cow.png',     stage3: 'cow.png',     stage4: 'cow.png',     stage5: 'cow.png',     stage6: 'cow.png',     stage7: 'cow.png' },
  sheep:   { stage1: 'sheep.png',   stage2: 'sheep.png',   stage3: 'sheep.png',   stage4: 'sheep.png',   stage5: 'sheep.png',   stage6: 'sheep.png',   stage7: 'sheep.png' },
  fish:    { stage1: 'fish.png',    stage2: 'fish.png',    stage3: 'fish.png',    stage4: 'fish.png',    stage5: 'fish.png',    stage6: 'fish.png',    stage7: 'fish.png' },
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
 * 根据等级推导阶段编号（1~7 阶段，每 10 级一次造型进阶，满级 60 级为至尊天神形态）
 * Lv 1~9 → 1, Lv 10~19 → 2, Lv 20~29 → 3, Lv 30~39 → 4, Lv 40~49 → 5, Lv 50~59 → 6, Lv 60 → 7
 * @param {number} level
 * @returns {number} 阶段编号 1~7
 */
export function getStageByLevel(level) {
  if (level >= 60) return 7;
  if (level >= 50) return 6;
  if (level >= 40) return 5;
  if (level >= 30) return 4;
  if (level >= 20) return 3;
  if (level >= 10) return 2;
  return 1;
}

/**
 * Canvas 矢量降级与造型进阶渲染管线
 * 保证在各个阶段即使无美术贴图帧也能呈现层层递进的炫酷外观
 */
export function renderStageTierEffects(ctx, stage, raceId, classId, x, y, width = 46, height = 46) {
  ctx.save();
  ctx.translate(x, y);

  // Layer 1: 背部层 (光翼/披风) - Stage 4+
  if (stage >= 4) {
    ctx.globalAlpha = stage >= 6 ? 0.8 : 0.4;
    ctx.fillStyle = (classId === 'holy_knight' || classId === 'monk') ? '#ffcc00' :
                    (classId === 'death_knight' || classId === 'fel_warlock') ? '#00ff33' : '#00ccff';
    ctx.beginPath();
    ctx.ellipse(-width * 0.6, 0, width * 0.4, height * 0.8, -Math.PI / 6, 0, Math.PI * 2);
    ctx.ellipse(width * 0.6, 0, width * 0.4, height * 0.8, Math.PI / 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;
  }

  // Layer 3: 护甲肩铠层 - Stage 2+
  if (stage >= 2) {
    ctx.strokeStyle = stage >= 5 ? '#ffd700' : '#cccccc';
    ctx.lineWidth = stage >= 4 ? 4 : 2;
    ctx.strokeRect(-width * 0.4, -height * 0.6, width * 0.8, height * 0.2); // 简易头盔/冠冕轮廓
    if (stage >= 3) {
      ctx.fillStyle = '#666666'; // 肩铠
      ctx.fillRect(-width * 0.6, -height * 0.3, width * 0.3, height * 0.2);
      if (stage >= 4) ctx.fillRect(width * 0.3, -height * 0.3, width * 0.3, height * 0.2);
    }
  }

  // Layer 4: 神兵武器层 - Stage 3+
  if (stage >= 3) {
    ctx.shadowBlur = stage >= 5 ? 15 : 5;
    ctx.shadowColor = (classId && (classId.includes('fel') || classId === 'demon_hunter')) ? '#00ff00' : '#ff00ff';
    ctx.fillStyle = '#eeeeee';
    // 简易武器握持绘制 (基于职业区分)
    if (classId === 'warrior' || classId === 'death_knight') {
      ctx.fillRect(width * 0.5, -height * 0.2, 8, height * 0.8); // 巨剑
    } else if (classId === 'hunter' || classId === 'rogue') {
      ctx.beginPath();
      ctx.arc(width * 0.6, 0, height * 0.4, -Math.PI / 2, Math.PI / 2);
      ctx.stroke(); // 弓箭/双匕首简影
    } else {
      ctx.fillRect(width * 0.5, -height * 0.4, 4, height); // 法杖/权杖
      ctx.beginPath();
      ctx.arc(width * 0.5 + 2, -height * 0.4, 8, 0, Math.PI * 2);
      ctx.fill(); // 杖头
    }
    ctx.shadowBlur = 0;
  }

  // Layer 5: 极境特效层 (法阵与粒子) - Stage 6+
  if (stage >= 6) {
    const timeSec = Date.now() / 1000;
    ctx.shadowColor = stage === 7 ? '#ffaa00' : '#aa00ff';
    ctx.shadowBlur = stage === 7 ? 25 : 15;

    ctx.save();
    ctx.translate(0, height * 0.4);
    ctx.scale(1, 0.4);
    ctx.rotate(timeSec); // 法阵旋转

    ctx.strokeStyle = stage === 7 ? '#ffd700' : '#a200ff';
    ctx.lineWidth = stage === 7 ? 5 : 2;
    ctx.beginPath();
    ctx.arc(0, 0, width * 1.2, 0, Math.PI * 2);
    ctx.stroke();

    // 内置神印六芒星/符文
    if (stage === 7) {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3;
        const px = width * 1.2 * Math.cos(angle);
        const py = width * 1.2 * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    }
    ctx.restore();
  }

  ctx.restore();
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
  const stage = 7; // 最高阶最终形态（至尊天神满级极境）
  const stageKey = 'stage7';
  const modelKey = `${raceId}:${classId}`;

  // 1. 优先查显式「角色:职业」组合键的最高阶资源 (优先 stage7，向后回退 stage5)
  let cfg = MODEL_STAGES[modelKey];
  let path = cfg && (cfg[stageKey] || cfg.stage5);

  // 1.1 新增 6 职业智能回退到贴合的同族最终形态
  if (!path && classId) {
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
      const fbCfg = MODEL_STAGES[`${raceId}:${fbClass}`];
      path = fbCfg && (fbCfg[stageKey] || fbCfg.stage5);
    }
  }

  // 2. 回退到种族默认阶段图的最高阶
  if (!path) {
    const raceStages = RACE_STAGES[raceId];
    if (raceStages) {
      path = HERO_BASE + (raceStages[stageKey] || raceStages.stage5 || raceStages.stage1);
    }
  }

  // 3. 最终兜底
  if (!path) {
    path = HERO_BASE + 'chicken.png';
  }

  const stageName = (STAGE_META[stageKey] && STAGE_META[stageKey].name) || '至尊天神';

  return { stage, stageName, modelPath: path, modelKey, assetKey: stageKey };
}
