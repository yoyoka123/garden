/**
 * 网格管理类
 * 统一管理所有格子
 */

import { Cell } from './Cell.js';
import { CONFIG } from '../config.js';

export class Grid {
  constructor(cols = CONFIG.grid.cols, rows = CONFIG.grid.rows) {
    this.cols = cols;
    this.rows = rows;
    this.cellWidth = CONFIG.grid.cellWidth;
    this.cellDepth = CONFIG.grid.cellDepth;

    // 创建格子二维数组
    this.cells = [];
    for (let row = 0; row < rows; row++) {
      this.cells[row] = [];
      for (let col = 0; col < cols; col++) {
        this.cells[row][col] = new Cell(col, row);
      }
    }
  }

  /**
   * 获取花园总宽度
   */
  get width() {
    return this.cols * this.cellWidth;
  }

  /**
   * 获取花园总深度
   */
  get depth() {
    return this.rows * this.cellDepth;
  }

  /**
   * 获取指定格子
   * @param {number} col - 列索引
   * @param {number} row - 行索引
   * @returns {Cell|null}
   */
  getCell(col, row) {
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) {
      return null;
    }
    return this.cells[row][col];
  }

  /**
   * 根据世界坐标获取格子
   * @param {number} worldX - 世界 X 坐标
   * @param {number} worldZ - 世界 Z 坐标
   * @returns {Cell|null}
   */
  getCellAtPosition(worldX, worldZ) {
    const localX = worldX + this.width / 2;
    const localZ = worldZ + this.depth / 2;

    const col = Math.floor(localX / this.cellWidth);
    const row = Math.floor(localZ / this.cellDepth);

    return this.getCell(col, row);
  }

  /**
   * 获取格子中心的世界坐标
   * @param {number} col - 列索引
   * @param {number} row - 行索引
   * @returns {{x: number, y: number, z: number}}
   */
  getCellCenter(col, row) {
    const x = -this.width / 2 + col * this.cellWidth + this.cellWidth / 2;
    const z = -this.depth / 2 + row * this.cellDepth + this.cellDepth / 2;
    return { x, y: 0, z };
  }

  /**
   * 遍历所有格子
   * @param {Function} callback - 回调函数 (cell, col, row) => void
   */
  forEach(callback) {
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        callback(this.cells[row][col], col, row);
      }
    }
  }

  /**
   * 获取所有空格子
   * @returns {Cell[]}
   */
  getEmptyCells() {
    const empty = [];
    this.forEach(cell => {
      if (cell.isEmpty()) {
        empty.push(cell);
      }
    });
    return empty;
  }

  /**
   * 查找第一个空格子
   * @returns {Cell|null}
   */
  findEmptyCell() {
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const cell = this.getCell(col, row);
        if (cell && cell.isEmpty()) {
          return cell;
        }
      }
    }
    return null;
  }

  /**
   * 获取所有已种植的格子
   * @returns {Cell[]}
   */
  getPlantedCells() {
    const planted = [];
    this.forEach(cell => {
      if (!cell.isEmpty()) {
        planted.push(cell);
      }
    });
    return planted;
  }

  /**
   * 获取所有花朵
   * @returns {Object[]}
   */
  getAllFlowers() {
    const flowers = [];
    this.forEach(cell => {
      flowers.push(...cell.flowers);
    });
    return flowers;
  }

  /**
   * 清空所有格子
   */
  clearAll() {
    this.forEach(cell => cell.clearFlowers());
  }

  /**
   * 调整网格大小
   * @param {number} newCols - 新的列数
   * @param {number} newRows - 新的行数
   * @returns {Object} 调整结果，包含保留的花朵信息
   */
  resize(newCols, newRows) {
    // 限制最小和最大尺寸
    const minCols = 2;
    const minRows = 2;
    const maxCols = 10;
    const maxRows = 10;

    newCols = Math.max(minCols, Math.min(maxCols, Math.round(newCols)));
    newRows = Math.max(minRows, Math.min(maxRows, Math.round(newRows)));

    // 保存现有花朵数据（只保留在新尺寸范围内的）
    const preservedFlowers = [];
    this.forEach((cell, col, row) => {
      if (col < newCols && row < newRows && !cell.isEmpty()) {
        preservedFlowers.push({
          col,
          row,
          flowers: [...cell.flowers]
        });
      }
    });

    // 更新尺寸
    this.cols = newCols;
    this.rows = newRows;

    // 重新创建格子数组
    this.cells = [];
    for (let row = 0; row < newRows; row++) {
      this.cells[row] = [];
      for (let col = 0; col < newCols; col++) {
        this.cells[row][col] = new Cell(col, row);
      }
    }

    // 恢复保留的花朵（只恢复在新尺寸范围内的）
    preservedFlowers.forEach(({ col, row, flowers }) => {
      if (col < newCols && row < newRows) {
        const cell = this.getCell(col, row);
        if (cell) {
          cell.flowers = flowers;
        }
      }
    });

    return {
      newCols,
      newRows,
      preservedCount: preservedFlowers.reduce((sum, { flowers }) => sum + flowers.length, 0)
    };
  }
}
