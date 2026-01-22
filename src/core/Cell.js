/**
 * 单元格数据类
 * 统一管理每个格子的所有状态
 */

export class Cell {
  constructor(col, row) {
    this.col = col;
    this.row = row;

    // 种植状态
    this.planted = false;
    this.flowers = [];

    // 地面纹理
    this.groundTextureKey = '草地';
    this.groundMesh = null;

    // 元数据
    this.metadata = {};
  }

  /**
   * 标记为已种植
   */
  plant() {
    this.planted = true;
  }

  /**
   * 添加花朵
   * @param {Object} flowerData - 花朵数据
   */
  addFlower(flowerData) {
    this.flowers.push(flowerData);
    if (!this.planted) {
      this.planted = true;
    }
  }

  /**
   * 移除花朵
   * @param {Object} flowerData - 花朵数据
   */
  removeFlower(flowerData) {
    const index = this.flowers.indexOf(flowerData);
    if (index > -1) {
      this.flowers.splice(index, 1);
    }
    if (this.flowers.length === 0) {
      this.planted = false;
    }
  }

  /**
   * 清空所有花朵
   * @returns {Object[]} 被移除的花朵数组
   */
  clearFlowers() {
    const removed = [...this.flowers];
    this.flowers = [];
    this.planted = false;
    return removed;
  }

  /**
   * 获取可采摘的花朵
   * @returns {Object[]} 可采摘的花朵数组
   */
  getHarvestableFlowers() {
    return this.flowers.filter(f => f.isHarvestable);
  }

  /**
   * 设置地面纹理
   * @param {string} textureKey - 纹理键名
   */
  setGroundTexture(textureKey) {
    this.groundTextureKey = textureKey;
  }

  /**
   * 是否为空（可种植）
   * @returns {boolean}
   */
  isEmpty() {
    return !this.planted;
  }

  /**
   * 序列化为 JSON
   * @returns {Object}
   */
  toJSON() {
    return {
      col: this.col,
      row: this.row,
      planted: this.planted,
      groundTextureKey: this.groundTextureKey,
      flowerCount: this.flowers.length
    };
  }
}
