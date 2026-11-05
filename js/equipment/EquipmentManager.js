/**
 * 装备管理器 (Equipment Manager)
 * 16 部位全状态托管 · 防降级覆盖保护 · 数值聚合 · 五行联动整合 · 传说保底机制
 */
import {
  EQUIPMENT_SLOTS,
  SLOT_KEYS,
  RARITIES,
  AFFIX_DEFINITIONS,
  SLOT_AFFIX_POOLS,
  ELEMENT_AFFIXES,
  UNIQUE_LEGENDARY_AFFIXES,
  ITEM_NAME_TEMPLATES,
} from './equipment_data.js';
import eventBus from '../base/eventBus.js';

const STORAGE_KEY_PITY = 'animal_vs_alien_equipment_pity_v1';

export default class EquipmentManager {
  constructor() {
    this.equipped = {}; // { [slotKey]: EquipmentItem }
    this.legendaryDroppedInRun = false; // 单局上限 1 件传说
    this.pityRuns = 0; // 跨局未掉传说累计场次
    this.aggregatedStats = this._createEmptyStats();

    this._loadPity();
  }

  _createEmptyStats() {
    return {
      atk: 0,
      crit: 0,
      crit_dmg: 0,
      hp: 0,
      hp_regen: 0,
      dodge: 0,
      lifesteal: 0,
      cdr: 0,
      move: 0,
      magnet: 0,
      dmg_reduce: 0,
      elements: new Set(),
      elementDmgBonuses: {},
      uniqueAffixes: [],
      hasLegendary: false,
    };
  }

  _loadPity() {
    try {
      let v = null;
      if (typeof wx !== 'undefined' && wx.getStorageSync) {
        v = wx.getStorageSync(STORAGE_KEY_PITY);
      } else if (typeof localStorage !== 'undefined') {
        const str = localStorage.getItem(STORAGE_KEY_PITY);
        v = str ? JSON.parse(str) : null;
      }
      if (typeof v === 'number') this.pityRuns = v;
    } catch (e) {}
  }

  _savePity() {
    try {
      if (typeof wx !== 'undefined' && wx.setStorageSync) {
        wx.setStorageSync(STORAGE_KEY_PITY, this.pityRuns);
      } else if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_PITY, JSON.stringify(this.pityRuns));
      }
    } catch (e) {}
  }

  /**
   * 开局初始化：重置单局状态，并为角色佩戴全套 16 件基础粗糙白板装
   * （保证开局人形图完整点亮，后续掉落逐一部位替换为绿/蓝/紫/橙）
   */
  initBattle(player) {
    this.equipped = {};
    this.legendaryDroppedInRun = false;

    // 为 16 个部位生成初始粗糙 (Poor) 装备
    for (let i = 0; i < SLOT_KEYS.length; i++) {
      const slotKey = SLOT_KEYS[i];
      const slotDef = EQUIPMENT_SLOTS[slotKey];
      const poorRarity = RARITIES.poor;
      const affixes = this._rollAffixes(slotKey, poorRarity);
      const name = `新兵的${slotDef.name}`;

      this.equipped[slotKey] = {
        slotKey,
        slotName: slotDef.name,
        name,
        rarity: poorRarity,
        affixes,
        element: null,
        unique: null,
      };
    }

    this.applyStats(player);
  }

  /**
   * 战局结算时调用：更新保底计数器
   */
  finishBattle(victory = false) {
    if (this.legendaryDroppedInRun) {
      this.pityRuns = 0; // 掉落了传说，重置保底
    } else {
      this.pityRuns++; // 持续未掉落，累加保底
    }
    this._savePity();
  }

  /**
   * 掷骰生成一件掉落装备
   * @param {Object} enemy 阵亡敌人实体
   * @param {number} gameTimeSeconds 战局秒数 (0~720)
   * @returns {Object|null} 装备对象，未触发掉落返回 null
   */
  rollDrop(enemy, gameTimeSeconds = 0) {
    if (!enemy || !enemy.typeData) return null;

    // 1. 基础掉落概率判定
    let dropChance = 0.025; // 普通怪 2.5%
    if (enemy.typeData.isBoss) {
      dropChance = 1.0; // Boss 100% 必爆一件
    } else if (enemy.typeData.isElite) {
      dropChance = 0.16; // 精英怪 16%
    }

    if (Math.random() >= dropChance) return null;

    // 2. 部位随机抽取（Boss 偏向高权出主手武器与首饰）
    const slotKey = this._rollSlot(enemy.typeData.isBoss);

    // 3. 稀有度抽取（结合时间轴进展与传说保底）
    const rarity = this._rollRarity(gameTimeSeconds, enemy.typeData.isBoss);

    // 4. 构建装备属性
    return this.generateEquipment(slotKey, rarity);
  }

  _rollSlot(isBoss = false) {
    if (isBoss) {
      const r = Math.random();
      if (r < 0.40) return 'main_hand';
      if (r < 0.60) return 'off_hand';
      if (r < 0.85) return Math.random() < 0.5 ? 'finger1' : 'finger2';
      return Math.random() < 0.5 ? 'trinket1' : 'trinket2';
    }

    const r = Math.random();
    if (r < 0.12) return Math.random() < 0.7 ? 'main_hand' : 'off_hand'; // 12% 武器组
    if (r < 0.28) { // 16% 首饰组
      const jewelrySlots = ['finger1', 'finger2', 'trinket1', 'trinket2'];
      return jewelrySlots[Math.floor(Math.random() * jewelrySlots.length)];
    }
    // 72% 护甲组
    const armorSlots = ['head', 'neck', 'shoulder', 'back', 'chest', 'wrist', 'hands', 'waist', 'legs', 'feet'];
    return armorSlots[Math.floor(Math.random() * armorSlots.length)];
  }

  _rollRarity(gameTimeSeconds, isBoss = false) {
    const progress = Math.min(1.0, gameTimeSeconds / 900);

    // 传说判定：单局上限 1 件
    if (!this.legendaryDroppedInRun) {
      // 连续 3 局以上未掉落传说，启动天命保底（提升至 2.5%）
      const legendChance = this.pityRuns >= 3 ? 0.025 : 0.001;
      if (Math.random() < legendChance) {
        this.legendaryDroppedInRun = true;
        return RARITIES.legendary;
      }
    }

    // 其余稀有度随时间轴平滑演进
    const rand = Math.random();
    const epicChance = 0.035 + progress * 0.035 + (isBoss ? 0.12 : 0);
    const rareChance = 0.08 + progress * 0.05 + (isBoss ? 0.25 : 0);
    const uncommonChance = 0.22;

    if (rand < epicChance) return RARITIES.epic;
    if (rand < epicChance + rareChance) return RARITIES.rare;
    if (rand < epicChance + rareChance + uncommonChance) return RARITIES.uncommon;
    if (rand < 0.75) return RARITIES.common;
    return RARITIES.poor;
  }

  /**
   * 生成指定部位与稀有度的装备实例
   */
  generateEquipment(slotKey, rarity) {
    const slotDef = EQUIPMENT_SLOTS[slotKey] || EQUIPMENT_SLOTS.chest;
    const affixes = this._rollAffixes(slotKey, rarity);

    // 史诗与传说额外激活五行自然元素词条
    let element = null;
    if (rarity.hasElement) {
      const eleKeys = Object.keys(ELEMENT_AFFIXES);
      const chosenKey = eleKeys[Math.floor(Math.random() * eleKeys.length)];
      element = ELEMENT_AFFIXES[chosenKey];
    }

    // 传说独占改变玩法级专属词条
    let unique = null;
    if (rarity.hasUnique) {
      const uKeys = Object.keys(UNIQUE_LEGENDARY_AFFIXES);
      const chosenKey = uKeys[Math.floor(Math.random() * uKeys.length)];
      unique = UNIQUE_LEGENDARY_AFFIXES[chosenKey];
    }

    // 随机品质前缀 + 部位名
    const templates = ITEM_NAME_TEMPLATES[slotDef.group] || ITEM_NAME_TEMPLATES.armor;
    const flavorName = templates[Math.floor(Math.random() * templates.length)];
    const fullName = `${rarity.name}之${flavorName}`;

    return {
      slotKey,
      slotName: slotDef.name,
      name: fullName,
      rarity,
      affixes,
      element,
      unique,
      createTime: Date.now(),
    };
  }

  _rollAffixes(slotKey, rarity) {
    const pool = SLOT_AFFIX_POOLS[slotKey] || SLOT_AFFIX_POOLS.chest;
    const count = rarity.affixCount || 1;
    const affixes = [];
    const used = new Set();

    for (let i = 0; i < count; i++) {
      let key = pool[Math.floor(Math.random() * pool.length)];
      if (used.has(key)) {
        // 尝试备选其他词条
        const allKeys = Object.keys(AFFIX_DEFINITIONS);
        key = allKeys[Math.floor(Math.random() * allKeys.length)];
      }
      used.add(key);

      const def = AFFIX_DEFINITIONS[key] || AFFIX_DEFINITIONS.hp;
      const baseVal = def.baseMin + Math.random() * (def.baseMax - def.baseMin);
      const finalVal = baseVal * (rarity.multiplier || 1.0);

      affixes.push({
        key,
        name: def.name,
        format: def.format,
        statKey: def.statKey,
        value: def.format === 'flat' ? Math.round(finalVal) : Math.round(finalVal * 1000) / 1000,
      });
    }

    return affixes;
  }

  /**
   * 穿戴一件装备（关键：严格执行【品质不降级保护】规则）
   * @param {Object} item 新掉落的装备
   * @param {Object} player 玩家实体
   * @returns {{ success: boolean, reason: string, oldItem?: Object, isLegendary?: boolean }}
   */
  equip(item, player) {
    if (!item || !item.slotKey) return { success: false, reason: 'invalid_item' };

    const slotKey = item.slotKey;
    const current = this.equipped[slotKey];

    // 1. 传说装备不可侵犯原则：一旦部位穿上橙装，该部位永久锁定，任何掉落无法替换
    if (current && current.rarity.rank === 5) {
      return { success: false, reason: 'legendary_locked' };
    }

    // 2. 防逆向降级原则：低品质装备严禁覆盖高品质装备
    if (current && current.rarity.rank > item.rarity.rank) {
      return { success: false, reason: 'lower_rank' };
    }

    // 3. 正常穿戴或同级/更优覆盖
    const oldItem = current;
    this.equipped[slotKey] = item;
    this.applyStats(player);

    const isLegendary = item.rarity.rank === 5;

    // 抛出装备拾取与全身史诗数检测事件
    try {
      eventBus.emit('equipment:pickup', { item });
      let epicCount = 0;
      for (const k in this.equipped) {
        const it = this.equipped[k];
        if (it && it.rarity && it.rarity.rank >= 4) {
          epicCount++;
        }
      }
      eventBus.emit('equipment:max_epic_slots', { count: epicCount });
    } catch (e) {}

    return {
      success: true,
      reason: 'equipped',
      item,
      oldItem,
      isLegendary,
    };
  }

  /**
   * 汇总全身 16 部位装备属性并写入 player 挂载点
   */
  applyStats(player) {
    const stats = this._createEmptyStats();

    for (const k in this.equipped) {
      const eq = this.equipped[k];
      if (!eq) continue;

      if (eq.rarity && eq.rarity.rank === 5) {
        stats.hasLegendary = true;
      }

      // 累加基础词条
      if (eq.affixes) {
        for (let i = 0; i < eq.affixes.length; i++) {
          const af = eq.affixes[i];
          if (stats[af.key] !== undefined) {
            stats[af.key] += af.value;
          }
        }
      }

      // 提取五行元素词条（供 ElementSynergyManager 与伤害公式）
      if (eq.element) {
        stats.elements.add(eq.element.element);
        stats.elementDmgBonuses[eq.element.element] = (stats.elementDmgBonuses[eq.element.element] || 0) + eq.element.bonus;
      }

      // 提取传说专属特异词条
      if (eq.unique) {
        stats.uniqueAffixes.push(eq.unique);
      }
    }

    // 专属传说效果数值干预
    for (let i = 0; i < stats.uniqueAffixes.length; i++) {
      const u = stats.uniqueAffixes[i];
      if (u.key === 'unique_avatar') {
        // 神威天降：全属性 +18%
        stats.atk += 0.18;
        stats.hp += 60;
        stats.crit += 0.08;
        stats.dmg_reduce += 0.06;
      } else if (u.key === 'unique_glass') {
        // 玻璃大炮：攻击+60%, 生命-25%
        stats.atk += 0.60;
        stats.hp = Math.max(-50, stats.hp - 80);
      } else if (u.key === 'unique_tank') {
        // 叹息之壁：减伤+20%, 移速-8%
        stats.dmg_reduce += 0.20;
        stats.move = Math.max(-0.15, stats.move - 0.08);
      } else if (u.key === 'unique_vamp') {
        // 嗜血渴求：吸血翻倍
        stats.lifesteal = (stats.lifesteal + 0.04) * 2;
      }
    }

    this.aggregatedStats = stats;

    // 写入 Player 实体，与现有属性乘法/加法无缝融合
    if (player) {
      player.equipmentAtkBonus = stats.atk;
      player.equipmentCritBonus = stats.crit;
      player.equipmentCritDmgBonus = stats.crit_dmg;
      player.equipmentHpBonus = stats.hp;
      player.equipmentHpRegenBonus = stats.hp_regen;
      player.equipmentDodgeBonus = stats.dodge;
      player.equipmentLifestealBonus = stats.lifesteal;
      player.equipmentCdrBonus = stats.cdr;
      player.equipmentMoveBonus = stats.move;
      player.equipmentMagnetBonus = stats.magnet;
      player.equipmentDmgReduce = stats.dmg_reduce;
      player.hasLegendaryEquipped = stats.hasLegendary;

      // 触发角色动态数值刷新
      if (typeof player.refreshEquipmentStats === 'function') {
        player.refreshEquipmentStats();
      }
    }

    return stats;
  }

  /**
   * 导出当前装备系统贡献的五行元素集合（深度接入 ElementSynergyManager）
   */
  collectOwnedElements() {
    return this.aggregatedStats.elements;
  }
}
