/**
 * 花园管理 Skill
 * 提供种植、查询花园状态等工具
 */

import { BaseSkill } from './BaseSkill.js';
import { SkillDefinitions } from '../config/prompts/index.js';
import { eventBus, Events } from '../EventBus.js';

export class GardenSkill extends BaseSkill {
  /**
   * @param {import('../managers/FlowerManager.js').FlowerManager} flowerManager
   * @param {import('../core/Grid.js').Grid} grid
   * @param {Object} bouquetCatalog
   */
  constructor(flowerManager, grid, bouquetCatalog) {
    const config = SkillDefinitions.garden;
    super(config.meta.name, config.meta.description);
    this.flowerManager = flowerManager;
    this.grid = grid;
    this.bouquetCatalog = bouquetCatalog;
    this.config = config;
  }

  /**
   * 总是可用
   */
  isAvailable(context) {
    return true;
  }

  /**
   * 返回所有花园工具
   */
  getTools(context) {
    return this.config.tools;
  }

  /**
   * 执行工具
   */
  async execute(toolName, args, context) {
    switch (toolName) {
      case 'plant':
        return this.executePlant(args);
      case 'query_garden':
        return this.executeQuery();
      case 'list_bouquets':
        return this.executeListBouquets();
      case 'resize_garden':
        return this.executeResizeGarden(args);
      default:
        return { success: false, message: `未知工具: ${toolName}` };
    }
  }

  /**
   * 执行种植
   * @param {{bouquetKey: string, count?: number}} args
   */
  async executePlant({ bouquetKey, count = 1 }) {
    // 查找空格子
    const emptyCell = this.grid.findEmptyCell();
    if (!emptyCell) {
      return {
        success: false,
        message: this.config.messages.errors.gardenFull
      };
    }

    // 检查花束类型是否存在
    if (!this.bouquetCatalog[bouquetKey]) {
      return {
        success: false,
        message: this.config.messages.errors.unknownBouquet.replace('{bouquetKey}', bouquetKey)
      };
    }

    try {
      const flowers = await this.flowerManager.plantBouquetInCell(
        emptyCell.col,
        emptyCell.row,
        bouquetKey,
        count
      );

      if (flowers.length === 0) {
        return { success: false, message: this.config.messages.errors.plantFailed };
      }

      return {
        success: true,
        message: `在位置 (${emptyCell.col + 1}, ${emptyCell.row + 1}) 种植了 ${count} 朵 ${bouquetKey}`,
        count: flowers.length,
        position: { col: emptyCell.col, row: emptyCell.row }
      };
    } catch (error) {
      console.error('GardenSkill: 种植失败', error);
      return { success: false, message: this.config.messages.errors.plantFailed };
    }
  }

  /**
   * 查询花园状态
   */
  executeQuery() {
    const plantedCount = this.flowerManager.getPlantedCount();
    const totalCells = this.grid.cols * this.grid.rows;
    const emptyCells = this.grid.getEmptyCells().length;

    return {
      success: true,
      plantedCount,
      totalCells,
      emptyCells,
      message: `花园状态：已种植 ${plantedCount} 朵花，共 ${totalCells} 个格子，还有 ${emptyCells} 个空位`
    };
  }

  /**
   * 列出所有可用花束类型
   */
  executeListBouquets() {
    const bouquets = Object.keys(this.bouquetCatalog).map(key => {
      const data = this.bouquetCatalog[key];
      const agent = data?.agent || {};
      return {
        key,
        name: agent.name || key,
        personality: agent.personality || ''
      };
    });

    return {
      success: true,
      bouquets,
      message: `可用花束类型：${bouquets.map(b => b.key).join('、')}`
    };
  }

  /**
   * 调整花园大小
   * @param {{cols: number, rows: number}} args
   */
  executeResizeGarden({ cols, rows }) {
    // 验证参数
    if (typeof cols !== 'number' || typeof rows !== 'number') {
      return {
        success: false,
        message: this.config.messages.errors.invalidSize
      };
    }

    if (cols < 2 || cols > 10 || rows < 2 || rows > 10) {
      return {
        success: false,
        message: this.config.messages.errors.invalidSize
      };
    }

    try {
      // 调整网格大小
      const result = this.grid.resize(cols, rows);

      // 发出事件，通知需要更新场景
      eventBus.emit(Events.GARDEN_RESIZED, {
        newCols: result.newCols,
        newRows: result.newRows,
        preservedCount: result.preservedCount
      });

      // 更新花朵管理器中的网格引用（如果需要）
      // 注意：FlowerManager 需要重新计算所有花朵的位置

      return {
        success: true,
        newCols: result.newCols,
        newRows: result.newRows,
        preservedCount: result.preservedCount,
        message: `花园大小已调整为 ${result.newCols} x ${result.newRows}，保留了 ${result.preservedCount} 朵花`
      };
    } catch (error) {
      console.error('GardenSkill: 调整花园大小失败', error);
      return {
        success: false,
        message: '调整花园大小失败'
      };
    }
  }
}
