/**
 * 采摘技能
 * 管理花朵采摘相关操作
 */

import { BaseSkill } from './BaseSkill.js';
import { eventBus, Events } from '../EventBus.js';

export class HarvestSkill extends BaseSkill {
  /**
   * @param {import('../managers/FlowerManager.js').FlowerManager} flowerManager
   */
  constructor(flowerManager) {
    super('harvest', '管理花朵采摘相关操作');
    this.flowerManager = flowerManager;
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
    const tools = [];

    // 只有聚焦在可采摘花朵时才提供 harvest 工具
    if (context.focusedEntity?.type === 'flower' &&
        context.focusedEntity?.state?.isHarvestable) {
      tools.push({
        type: 'function',
        name: 'harvest',
        description: '当用户满足采摘条件时调用此工具完成采摘',
        parameters: {
          type: 'object',
          properties: {
            reason: {
              type: 'string',
              description: '同意采摘的理由'
            }
          },
          required: ['reason']
        }
      });
    }

    return tools;
  }

  /**
   * @override
   * 执行工具
   */
  async execute(toolName, args, context) {
    if (toolName !== 'harvest') {
      return { success: false, message: `未知工具: ${toolName}` };
    }

    const entity = context.focusedEntity;
    if (!entity || entity.type !== 'flower') {
      return { success: false, message: '没有选中花朵' };
    }

    if (!entity.state?.isHarvestable) {
      return { success: false, message: '花朵还未成熟' };
    }

    // 获取花朵位置信息
    const { cellCol, cellRow } = entity.state;

    // 调用 FlowerManager 进行采摘
    let result;
    try {
      result = this.flowerManager.harvestCell(cellCol, cellRow);
    } catch (error) {
      console.error('采摘失败:', error);
      return { success: false, message: '采摘失败' };
    }

    // 发送采摘成功事件
    eventBus.emit(Events.CHAT_HARVEST_SUCCESS, {
      flowerData: entity.state,
      agent: { name: entity.name },
      reason: args.reason
    });

    return {
      success: true,
      message: `成功采摘，获得 ${result.gold} 金币`,
      gold: result.gold,
      flowers: result.flowers?.length || 1
    };
  }
}
