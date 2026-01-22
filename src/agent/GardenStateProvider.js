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
 * @typedef {Object} GardenSnapshot
 * @property {number} gold - 当前金币
 * @property {FlowerInfo[]} flowers - 所有花朵信息
 * @property {{total: number, harvestable: number, growing: number}} summary - 统计摘要
 */

export class GardenStateProvider {
  /**
   * @param {import('../managers/FlowerManager.js').FlowerManager} flowerManager
   * @param {import('../managers/GameState.js').GameState} gameState
   * @param {import('../core/Grid.js').Grid} grid
   * @param {Object} bouquetCatalog - 花束目录
   */
  constructor(flowerManager, gameState, grid, bouquetCatalog) {
    this.flowerManager = flowerManager;
    this.gameState = gameState;
    this.grid = grid;
    this.bouquetCatalog = bouquetCatalog;
  }

  /**
   * 获取完整花园快照
   * @returns {GardenSnapshot}
   */
  getSnapshot() {
    const flowers = this.flowerManager.flowers.map(f => this._mapFlower(f));
    const harvestable = flowers.filter(f => f.isHarvestable).length;
    const growing = flowers.filter(f => !f.isHarvestable).length;

    return {
      gold: this.gameState.gold,
      flowers,
      summary: {
        total: flowers.length,
        harvestable,
        growing
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
   * @returns {{cellMap: Map<string, FlowerInfo[]>, summary: Object, gold: number}}
   */
  getFlowersByCell() {
    const snapshot = this.getSnapshot();
    const cellMap = new Map();

    // 初始化所有格子
    for (let row = 0; row < this.grid.rows; row++) {
      for (let col = 0; col < this.grid.cols; col++) {
        cellMap.set(`${col},${row}`, []);
      }
    }

    // 填充花朵到对应格子
    for (const flower of snapshot.flowers) {
      const key = `${flower.cell.col},${flower.cell.row}`;
      const cellFlowers = cellMap.get(key);
      if (cellFlowers) {
        cellFlowers.push(flower);
      }
    }

    return {
      cellMap,
      summary: snapshot.summary,
      gold: snapshot.gold
    };
  }
}
