/**
 * 花朵实体描述器
 * 将花朵数据和 BOUQUET_CATALOG 转换为统一的实体描述
 */

import { EntityDescriptorBase } from '../EntityDescriptor.js';

export class FlowerDescriptor extends EntityDescriptorBase {
  /**
   * @param {Object} bouquetCatalog - 花束目录 (BOUQUET_CATALOG)
   */
  constructor(bouquetCatalog) {
    super('flower');
    this.bouquetCatalog = bouquetCatalog;
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
    const status = flowerData.isHarvestable ? '已成熟' : '成长中';
    const name = agent.name || flowerData.bouquetKey || '未知花朵';
    const personality = agent.personality || '';

    let desc = `这是一朵名为"${name}"的花。状态：${status}。`;
    if (personality) {
      desc += `性格：${personality}。`;
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

    // 默认交互定义
    const defaultInteractions = {
      click: isHarvestable
        ? {
            condition: '成熟时',
            action: '偷花',
            description: agent.harvestRule
              ? `采摘规则：${agent.harvestRule}`
              : '可以尝试采摘这朵花',
            userPrompt: agent.greeting || '点击与花朵对话'
          }
        : {
            condition: '未成熟时',
            action: '查看',
            description: '花朵还在成长中，可以查看状态',
            userPrompt: '花朵还在成长中...'
          },
      dblclick: {
        action: '快速查看',
        description: '快速查看花朵详情',
        userPrompt: '查看花朵信息'
      },
      contextmenu: isHarvestable
        ? {
            action: '查看采摘提示',
            description: '查看如何采摘这朵花',
            userPrompt: '查看采摘提示'
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
      return '已成熟';
    }
    const elapsed = Date.now() - flowerData.plantTime;
    const remaining = Math.max(0, growthTime - elapsed);
    const seconds = Math.ceil(remaining / 1000);
    return `还需 ${seconds} 秒`;
  }
}
