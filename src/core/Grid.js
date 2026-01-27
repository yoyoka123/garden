/**
 * 网格管理类
 * 统一管理所有格子
 */

import { Cell } from './Cell.js';
import { CONFIG } from '../config.js';

export class Grid {
  constructor() {
    // 日历布局配置
    this.months = CONFIG.grid.months || 12;
    this.layout = CONFIG.grid.calendarLayout;
    
    // 子网格（月份）配置
    this.monthGrid = this.layout.monthGrid;
    this.cellsPerMonth = this.monthGrid.cols * this.monthGrid.rows;
    
    // 布局参数
    this.radius = this.layout.radius;
    this.layoutCols = this.layout.layoutCols || 3;
    this.layoutRows = Math.ceil(this.months / this.layoutCols);
    this.monthGap = this.layout.monthGap || 0.5;

    // 计算单个月份网格的物理尺寸
    this.monthWidth = this.monthGrid.cols * this.monthGrid.cellWidth;
    this.monthDepth = this.monthGrid.rows * this.monthGrid.cellDepth;

    // 计算整个日历区域的总尺寸
    this.totalWidth = this.layoutCols * this.monthWidth + (this.layoutCols - 1) * this.monthGap;
    this.totalDepth = this.layoutRows * this.monthDepth + (this.layoutRows - 1) * this.monthGap;

    // 创建格子二维数组: cells[month][day]
    this.cells = [];
    for (let m = 0; m < this.months; m++) {
      this.cells[m] = [];
      for (let d = 0; d < this.cellsPerMonth; d++) {
        // dayIndex 0-34
        this.cells[m][d] = new Cell(m, d);
      }
    }
  }

  /**
   * 获取花园总宽度
   */
  get width() {
    return this.radius * 2 + 5; 
  }

  /**
   * 获取花园总深度
   */
  get depth() {
    return this.radius * 2 + 5;
  }

  /**
   * 获取指定格子
   * @param {number} month - 月份索引 (0-11)
   * @param {number} day - 日期索引 (0-34)
   * @returns {Cell|null}
   */
  getCell(month, day) {
    if (month < 0 || month >= this.months || day < 0 || day >= this.cellsPerMonth) {
      return null;
    }
    return this.cells[month][day];
  }

  /**
   * 获取月份的中心坐标
   * @param {number} monthIndex 
   */
  getMonthCenter(monthIndex) {
    const col = monthIndex % this.layoutCols;
    const row = Math.floor(monthIndex / this.layoutCols);

    // 计算左上角起始点 (使得整体居中)
    const startX = -this.totalWidth / 2;
    const startZ = -this.totalDepth / 2;

    // 计算当前月份块的左上角
    const monthX = startX + col * (this.monthWidth + this.monthGap);
    const monthZ = startZ + row * (this.monthDepth + this.monthGap);

    // 返回中心点
    return {
      x: monthX + this.monthWidth / 2,
      z: monthZ + this.monthDepth / 2
    };
  }

  /**
   * 根据世界坐标获取格子
   * @param {number} worldX - 世界 X 坐标
   * @param {number} worldZ - 世界 Z 坐标
   * @returns {Cell|null}
   */
  getCellAtPosition(worldX, worldZ) {
    // 1. 转换到相对于左上角的坐标
    const startX = -this.totalWidth / 2;
    const startZ = -this.totalDepth / 2;
    
    const relativeX = worldX - startX;
    const relativeZ = worldZ - startZ;

    // 检查是否在整个日历范围内
    if (relativeX < 0 || relativeX > this.totalWidth || relativeZ < 0 || relativeZ > this.totalDepth) {
      return null;
    }

    // 2. 确定在哪个月份块 (包括间隙)
    // 每一块的占用空间是 monthWidth + gap (除了最后一块)
    // 这里简化处理：直接除以步长，然后检查是否落在 gap 里
    const stepX = this.monthWidth + this.monthGap;
    const stepZ = this.monthDepth + this.monthGap;

    const colIndex = Math.floor(relativeX / stepX);
    const rowIndex = Math.floor(relativeZ / stepZ);

    // 检查是否超出行列范围
    if (colIndex >= this.layoutCols || rowIndex >= this.layoutRows) {
      // 可能是正好在边缘，或者在最后的 gap 里
      // 由于我们是在 totalWidth 范围内，应该只有最后一列/行右边没有 gap
      // 但上面的逻辑可能把最后一个月的右边缘算作溢出如果刚好等于 totalWidth?
      // Math.floor 应该没问题，除非正好等于 totalWidth。
      // 实际上，我们需要检查该点是否在具体的月份矩形内（排除 gap）
      return null;
    }

    // 检查是否落在 gap 中
    const localInBlockX = relativeX - colIndex * stepX;
    const localInBlockZ = relativeZ - rowIndex * stepZ;

    if (localInBlockX > this.monthWidth || localInBlockZ > this.monthDepth) {
      return null; // 在间隙里
    }

    // 3. 确定月份索引
    const month = rowIndex * this.layoutCols + colIndex;
    if (month >= this.months) return null;

    // 4. 确定在月份内的哪个格子
    const cw = this.monthGrid.cellWidth;
    const cd = this.monthGrid.cellDepth;
    
    const cellCol = Math.floor(localInBlockX / cw);
    const cellRow = Math.floor(localInBlockZ / cd);

    if (cellCol >= 0 && cellCol < this.monthGrid.cols && cellRow >= 0 && cellRow < this.monthGrid.rows) {
      const day = cellRow * this.monthGrid.cols + cellCol;
      return this.getCell(month, day);
    }
    
    return null;
  }

  /**
   * 获取格子中心的世界坐标
   * @param {number} month - 月份索引
   * @param {number} day - 日期索引
   * @returns {{x: number, y: number, z: number}}
   */
  getCellCenter(month, day) {
    // 1. 获取月份中心
    const monthCenter = this.getMonthCenter(month);
    
    // 2. 计算子网格内的局部坐标
    const cols = this.monthGrid.cols;
    
    const colIndex = day % cols;
    const rowIndex = Math.floor(day / cols);
    
    const cw = this.monthGrid.cellWidth;
    const cd = this.monthGrid.cellDepth;
    
    // 以月份中心为原点
    // 0,0 是左上角 -> -width/2 + cw/2
    const localX = (colIndex - (cols - 1) / 2) * cw;
    const localZ = (rowIndex - (this.monthGrid.rows - 1) / 2) * cd;
    
    return {
      x: monthCenter.x + localX,
      y: 0,
      z: monthCenter.z + localZ
    };
  }

  /**
   * 遍历所有格子
   * @param {Function} callback - (cell, month, day) => void
   */
  forEach(callback) {
    for (let m = 0; m < this.months; m++) {
      for (let d = 0; d < this.cellsPerMonth; d++) {
        callback(this.cells[m][d], m, d);
      }
    }
  }

  /**
   * 获取所有空格子
   */
  getEmptyCells() {
    const empty = [];
    this.forEach(cell => {
      if (cell.isEmpty()) empty.push(cell);
    });
    return empty;
  }

  /**
   * 查找第一个空格子
   */
  findEmptyCell() {
    for (let m = 0; m < this.months; m++) {
      for (let d = 0; d < this.cellsPerMonth; d++) {
        const cell = this.getCell(m, d);
        if (cell && cell.isEmpty()) return cell;
      }
    }
    return null;
  }

  getPlantedCells() {
    const planted = [];
    this.forEach(cell => {
      if (!cell.isEmpty()) planted.push(cell);
    });
    return planted;
  }

  getAllFlowers() {
    const flowers = [];
    this.forEach(cell => {
      flowers.push(...cell.flowers);
    });
    return flowers;
  }

  clearAll() {
    this.forEach(cell => cell.clearFlowers());
  }

  /**
   * 调整网格大小 (暂不支持复杂重构，仅保留接口)
   */
  resize() {
    console.warn('Resize not supported in calendar layout');
    return {
      newCols: this.months,
      newRows: this.cellsPerMonth,
      preservedCount: this.getAllFlowers().length
    };
  }
}
