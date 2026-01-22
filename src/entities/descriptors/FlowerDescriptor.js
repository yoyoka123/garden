/**
 * 花朵实体描述器
 * 将花朵数据和 BOUQUET_CATALOG 转换为统一的实体描述
 */

import { EntityDescriptorBase } from '../EntityDescriptor.js';
import { EntityInteractions } from '../../config/prompts/index.js';

export class FlowerDescriptor extends EntityDescriptorBase {
  /**
   * @param {Object} bouquetCatalog - 花束目录 (BOUQUET_CATALOG)
   */
  constructor(bouquetCatalog) {
    super('flower');
    this.bouquetCatalog = bouquetCatalog;
    this.config = EntityInteractions.flower;
  }

  /**
   * 更新花束目录引用
   * @param {Object} bouquetCatalog
   */
  updateCatalog(bouquetCatalog) {
    this.bouquetCatalog = bouquetCatalog;
  }

  /**
   * @override
   * 为具体花朵生成描述
   */
  describe(flowerData) {
    const bouquetData = this.bouquetCatalog[flowerData.bouquetKey] || {};
    const agent = bouquetData.agent || {};
    const isHarvestable = flowerData.isHarvestable;

    // 优先使用 bouquetData.interactions，否则自动生成
    const customInteractions = bouquetData.interactions || {};

    return {
      type: 'flower',
      name: agent.name || flowerData.bouquetKey || '未知花朵',
      description: this.buildDescription(flowerData, agent),
      interactions: this.buildInteractions(flowerData, agent, customInteractions),
      customData: {
        personality: agent.personality,
        harvestRule: agent.harvestRule,
        greeting: agent.greeting,
        harvestSuccess: agent.harvestSuccess,
        bouquetKey: flowerData.bouquetKey
      }
    };
  }

  /**
   * 构建描述文本
   * @param {Object} flowerData
   * @param {Object} agent
   * @returns {string}
   */
  buildDescription(flowerData, agent) {
    const { description: descConfig } = this.config;
    const status = flowerData.isHarvestable
      ? descConfig.status.mature
      : descConfig.status.growing;
    const name = agent.name || flowerData.bouquetKey || '未知花朵';
    const personality = agent.personality || '';

    let desc = descConfig.template
      .replace('{name}', name)
      .replace('{status}', status)
      .replace('{personality}', personality);

    // 如果没有性格，移除性格部分
    if (!personality) {
      desc = desc.replace('性格：。', '');
    }

    return desc;
  }

  /**
   * 构建交互定义
   * @param {Object} flowerData
   * @param {Object} agent
   * @param {Object} customInteractions - 自定义交互覆盖
   * @returns {Object.<string, import('../EntityDescriptor.js').InteractionDefinition|null>}
   */
  buildInteractions(flowerData, agent, customInteractions) {
    const isHarvestable = flowerData.isHarvestable;
    const { interactions: interConfig } = this.config;

    // 默认交互定义
    const defaultInteractions = {
      click: isHarvestable
        ? {
            condition: interConfig.clickMature.condition,
            action: interConfig.clickMature.action,
            description: agent.harvestRule
              ? interConfig.clickMature.description.withRule.replace('{rule}', agent.harvestRule)
              : interConfig.clickMature.description.default,
            userPrompt: agent.greeting
              ? interConfig.clickMature.userPrompt.withGreeting.replace('{greeting}', agent.greeting)
              : interConfig.clickMature.userPrompt.default
          }
        : {
            condition: interConfig.clickImmature.condition,
            action: interConfig.clickImmature.action,
            description: interConfig.clickImmature.description,
            userPrompt: interConfig.clickImmature.userPrompt
          },
      // 生长中点击（复用 clickImmature 配置）
      click_growing: {
        condition: interConfig.clickImmature.condition,
        action: interConfig.clickImmature.action,
        description: interConfig.clickImmature.description,
        userPrompt: interConfig.clickImmature.userPrompt
      },
      // 种植交互
      plant: interConfig.plant
        ? {
            action: interConfig.plant.action,
            description: interConfig.plant.description,
            userPrompt: interConfig.plant.userPrompt
          }
        : {
            action: '种植',
            description: '刚刚种下这朵花',
            userPrompt: '种下了新花！'
          },
      dblclick: {
        action: interConfig.dblclick.action,
        description: interConfig.dblclick.description,
        userPrompt: interConfig.dblclick.userPrompt
      },
      contextmenu: isHarvestable
        ? {
            action: interConfig.contextmenu.action,
            description: interConfig.contextmenu.description,
            userPrompt: interConfig.contextmenu.userPrompt
          }
        : null,
      drag: null
    };

    // 合并自定义交互
    return {
      ...defaultInteractions,
      ...customInteractions
    };
  }

  /**
   * 获取成长剩余时间描述
   * @param {Object} flowerData
   * @param {number} growthTime - 总成长时间（毫秒）
   * @returns {string}
   */
  getGrowthTimeRemaining(flowerData, growthTime = 10000) {
    if (flowerData.isHarvestable) {
      return this.config.description.status.mature;
    }
    const elapsed = Date.now() - flowerData.plantTime;
    const remaining = Math.max(0, growthTime - elapsed);
    const seconds = Math.ceil(remaining / 1000);
    return `还需 ${seconds} 秒`;
  }
}
