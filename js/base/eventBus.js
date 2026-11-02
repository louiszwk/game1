/**
 * 全局事件总线 (Global Event Bus)
 * 单例 TinyEmitter，用于技能升级、阶段切换、主题切换等跨模块事件通信。
 *
 * 事件命名规范（动词:名词）：
 *   - skill:levelup        技能升级  参数: { skillId, level, player }
 *   - skill:learn          学习技能  参数: { skillId, level, player }
 *   - skill:cast           技能施放  参数: { skillId, category, player }
 *   - skill:innatemax      本命技能满级 参数: { skillId, player }
 *   - player:stagechange   角色阶段切换 参数: { raceId, classId, stage, stageName, modelPath, player }
 *   - player:levelup       角色升级  参数: { level, player }
 *   - theme:change         主题切换  参数: theme
 *   - synergy:recompute    元素联动重算 参数: { synergyResult }
 *   - enemy:killed         击杀敌人  参数: { enemy }
 *   - achievement:unlock   成就解锁  参数: { id, name, desc, reward }
 */
import TinyEmitter from '../libs/tinyemitter';

const eventBus = new TinyEmitter();

export default eventBus;
