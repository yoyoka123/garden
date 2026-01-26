/**
 * 花园状态提供者
 * 为Agent提供花园的实时全局状态
 */

import { CONFIG } from '../config.js';

/**
 * @typedef {Object} FlowerInfo
 * @property {string} id - 花朵ID
 * @property {string} name - 花朵名字（如"小粉"）
 * @property {string} type - 花朵类型（如"粉花"）
 * @property {{col: number, row: number}} cell - 格子位置
 * @property {boolean} isHarvestable - 是否可采摘
 * @property {number} growthPercent - 成长百分比 (0-100)
 */

/**
 * @typedef {Object} DecorationInfo
 * @property {string} id - 装饰物ID
 * @property {string} name - 装饰物名字
 * @property {string} type - 装饰物类型（如"cloud", "butterfly"）
 * @property {{x: number, z: number}} position - 位置
 * @property {number} scale - 缩放
 * @property {boolean} hasMotion - 是否有运动效果
 * @property {string|null} personality - AI性格描述
 */

/**
 * @typedef {Object} GardenSnapshot
 * @property {number} gold - 当前金币
 * @property {FlowerInfo[]} flowers - 所有花朵信息
 * @property {DecorationInfo[]} decorations - 所有装饰物信息
 * @property {{flowers: {total: number, harvestable: number, growing: number}, decorations: {total: number, byType: Object}}} summary - 统计摘要
 */

export class GardenStateProvider {
  /**
   * @param {import('../managers/FlowerManager.js').FlowerManager} flowerManager
   * @param {import('../managers/GameState.js').GameState} gameState
   * @param {import('../core/Grid.js').Grid} grid
   * @param {Object} bouquetCatalog - 花束目录
   * @param {import('../managers/DecorationManager.js').DecorationManager} [decorationManager] - 装饰物管理器
   */
  constructor(flowerManager, gameState, grid, bouquetCatalog, decorationManager = null) {
    this.flowerManager = flowerManager;
    this.gameState = gameState;
    this.grid = grid;
    this.bouquetCatalog = bouquetCatalog;
    this.decorationManager = decorationManager;
  }

  /**
   * 获取完整花园快照
   * @returns {GardenSnapshot}
   */
  getSnapshot() {
    const flowers = this.flowerManager.flowers.map(f => this._mapFlower(f));
    const harvestable = flowers.filter(f => f.isHarvestable).length;
    const growing = flowers.filter(f => !f.isHarvestable).length;

    const decorations = this._getDecorations();
    const decorationsByType = this._groupDecorationsByType(decorations);

    return {
      gold: this.gameState.gold,
      flowers,
      decorations,
      summary: {
        flowers: {
          total: flowers.length,
          harvestable,
          growing
        },
        decorations: {
          total: decorations.length,
          byType: decorationsByType
        }
      }
    };
  }

  /**
   * 映射花朵数据为FlowerInfo
   * @param {Object} flowerData
   * @returns {FlowerInfo}
   */
  _mapFlower(flowerData) {
    const agentConfig = this.bouquetCatalog[flowerData.bouquetKey]?.agent;
    const growthTime = CONFIG.game.growthTime;
    const elapsed = Date.now() - flowerData.plantTime;
    const growthPercent = Math.min(100, Math.floor((elapsed / growthTime) * 100));

    return {
      id: flowerData.id,
      name: agentConfig?.name || flowerData.bouquetKey,
      type: flowerData.bouquetKey,
      cell: { col: flowerData.cellCol, row: flowerData.cellRow },
      isHarvestable: flowerData.isHarvestable,
      growthPercent
    };
  }

  /**
   * 按格子分组的花朵状态
   * @returns {{cellMap: Object<string, FlowerInfo[]>, summary: Object, gold: number}}
   */
  getFlowersByCell() {
    const snapshot = this.getSnapshot();
    const cellMap = {};

    // 初始化所有格子
    for (let row = 0; row < this.grid.rows; row++) {
      for (let col = 0; col < this.grid.cols; col++) {
        cellMap[`${col},${row}`] = [];
      }
    }

    // 填充花朵到对应格子
    for (const flower of snapshot.flowers) {
      const key = `${flower.cell.col},${flower.cell.row}`;
      if (cellMap[key]) {
        cellMap[key].push(flower);
      }
    }

    return {
      cellMap,
      summary: snapshot.summary,
      gold: snapshot.gold
    };
  }

  /**
   * 获取可用的花束类型列表
   * @returns {Array<{key: string, name: string, personality: string}>}
   */
  getAvailableBouquets() {
    return Object.entries(this.bouquetCatalog).map(([key, config]) => ({
      key,
      name: config.agent?.name || key,
      personality: config.agent?.personality || ''
    }));
  }

  /**
   * 获取所有装饰物信息
   * @returns {DecorationInfo[]}
   */
  _getDecorations() {
    if (!this.decorationManager) return [];

    return this.decorationManager.decorations.map(d => ({
      id: d.id,
      name: d.ai?.name || d.configId || '装饰物',
      type: d.configId || 'custom',
      position: {
        x: Math.round(d.position.x * 100) / 100,
        z: Math.round(d.position.z * 100) / 100
      },
      scale: Math.round(d.scale * 100) / 100,
      hasMotion: this.decorationManager.entities.has(d.id),
      personality: d.ai?.personality || null
    }));
  }

  /**
   * 按类型分组装饰物
   * @param {DecorationInfo[]} decorations
   * @returns {Object<string, number>}
   */
  _groupDecorationsByType(decorations) {
    const groups = {};
    for (const d of decorations) {
      groups[d.type] = (groups[d.type] || 0) + 1;
    }
    return groups;
  }

  /**
   * 获取装饰物简述（用于Agent提示词）
   * @returns {string}
   */
  getDecorationsSummary() {
    const decorations = this._getDecorations();
    if (decorations.length === 0) return '暂无装饰物';

    const groups = this._groupDecorationsByType(decorations);
    return Object.entries(groups)
      .map(([type, count]) => `${type} x${count}`)
      .join(', ');
  }
}
