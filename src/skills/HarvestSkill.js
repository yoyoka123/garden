/**
 * 采摘技能
 * 管理花朵采摘相关操作
 */

import { BaseSkill } from './BaseSkill.js';
import { eventBus, Events } from '../EventBus.js';
import { SkillDefinitions } from '../config/prompts/index.js';

export class HarvestSkill extends BaseSkill {
  /**
   * @param {import('../managers/FlowerManager.js').FlowerManager} flowerManager
   */
  constructor(flowerManager) {
    const config = SkillDefinitions.harvest;
    super(config.meta.name, config.meta.description);
    this.flowerManager = flowerManager;
    this.config = config;
  }

  /**
   * @override
   * 检查 Skill 是否可用
   */
  isAvailable(context) {
    // 只有当焦点实体是花朵时才可用
    return context.focusedEntity?.type === 'flower';
  }

  /**
   * @override
   * 获取可用工具
   */
  getTools(context) {
    // 只要花园有可采摘的花就提供 harvest 工具
    if (context.gardenSnapshot?.summary?.harvestable > 0) {
      return [this.config.tool];
    }
    // 或者焦点花朵可采摘
    if (context.focusedEntity?.type === 'flower' &&
        context.focusedEntity?.state?.isHarvestable) {
      return [this.config.tool];
    }
    return [];
  }

  /**
   * @override
   * 执行工具
   */
  async execute(toolName, args, context) {
    const { messages } = this.config;

    if (toolName !== 'harvest') {
      return {
        success: false,
        message: messages.errors.unknownTool.replace('{toolName}', toolName)
      };
    }

    let targetFlower;
    const flowerId = args.flowerId;

    if (flowerId) {
      // 通过ID指定采摘
      targetFlower = this.flowerManager.getFlowerById(flowerId);
      if (!targetFlower) {
        return { success: false, message: '找不到指定的花朵' };
      }
    } else {
      // 采摘当前焦点花朵
      const entity = context.focusedEntity;
      if (!entity || entity.type !== 'flower') {
        return { success: false, message: messages.errors.noFlowerSelected };
      }
      targetFlower = entity.state;
    }

    if (!targetFlower?.isHarvestable) {
      return { success: false, message: messages.errors.flowerNotMature };
    }

    // 采摘单朵花
    let result;
    try {
      result = this.flowerManager.harvestFlowerById(targetFlower.id);
    } catch (error) {
      console.error('采摘失败:', error);
      return { success: false, message: messages.errors.harvestFailed };
    }

    if (!result.flower) {
      return { success: false, message: messages.errors.harvestFailed };
    }

    // 发送采摘成功事件
    eventBus.emit(Events.CHAT_HARVEST_SUCCESS, {
      flowerData: result.flower,
      reason: args.reason
    });

    return {
      success: true,
      message: messages.success.harvested.replace('{gold}', result.gold),
      gold: result.gold,
      flowers: 1
    };
  }
}
