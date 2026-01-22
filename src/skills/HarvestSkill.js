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
    const tools = [];

    // 只有聚焦在可采摘花朵时才提供 harvest 工具
    if (context.focusedEntity?.type === 'flower' &&
        context.focusedEntity?.state?.isHarvestable) {
      tools.push(this.config.tool);
    }

    return tools;
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

    const entity = context.focusedEntity;
    if (!entity || entity.type !== 'flower') {
      return { success: false, message: messages.errors.noFlowerSelected };
    }

    if (!entity.state?.isHarvestable) {
      return { success: false, message: messages.errors.flowerNotMature };
    }

    // 获取花朵位置信息
    const { cellCol, cellRow } = entity.state;

    // 调用 FlowerManager 进行采摘
    let result;
    try {
      result = this.flowerManager.harvestCell(cellCol, cellRow);
    } catch (error) {
      console.error('采摘失败:', error);
      return { success: false, message: messages.errors.harvestFailed };
    }

    // 发送采摘成功事件
    eventBus.emit(Events.CHAT_HARVEST_SUCCESS, {
      flowerData: entity.state,
      agent: { name: entity.name },
      reason: args.reason
    });

    return {
      success: true,
      message: messages.success.harvested.replace('{gold}', result.gold),
      gold: result.gold,
      flowers: result.flowers?.length || 1
    };
  }
}
