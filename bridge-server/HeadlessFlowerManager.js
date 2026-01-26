/**
 * Headless FlowerManager
 * 无渲染的花朵管理器，仅存储数据和业务逻辑
 */

export class HeadlessFlowerManager {
  constructor(grid, bouquetCatalog) {
    this.grid = grid;
    this.bouquetCatalog = bouquetCatalog;
    this.flowers = [];
    this.plantedCount = 0;
  }

  /**
   * 在指定格子种植花束
   */
  async plantBouquetInCell(col, row, bouquetKey, count = 1) {
    const cell = this.grid.getCell(col, row);
    if (!cell || !cell.isEmpty()) {
      return [];
    }

    const bouquetData = this.bouquetCatalog[bouquetKey];
    if (!bouquetData) {
      console.error(`Unknown bouquet: ${bouquetKey}`);
      return [];
    }

    const flowers = [];
    for (let i = 0; i < count; i++) {
      const flowerData = {
        id: `flower_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        plantTime: Date.now(),
        isHarvestable: false,
        cellCol: col,
        cellRow: row,
        bouquetKey
      };

      this.flowers.push(flowerData);
      cell.addFlower(flowerData);
      flowers.push(flowerData);
      this.plantedCount++;

      // 3秒后成熟
      setTimeout(() => {
        flowerData.isHarvestable = true;
      }, 3000);
    }

    return flowers;
  }

  /**
   * 采摘指定格子的花朵
   */
  harvestCell(col, row) {
    const cell = this.grid.getCell(col, row);
    if (!cell) {
      return { success: false, message: '格子不存在' };
    }

    const flowers = cell.getFlowers();
    if (flowers.length === 0) {
      return { success: false, message: '这个格子没有花' };
    }

    const harvestableCount = flowers.filter(f => f.isHarvestable).length;
    if (harvestableCount === 0) {
      return { success: false, message: '花还在生长中' };
    }

    // 移除所有花朵
    this.flowers = this.flowers.filter(f => f.cellCol !== col || f.cellRow !== row);
    cell.clearFlowers();
    this.plantedCount -= flowers.length;

    const gold = flowers.length * 10;
    return { success: true, gold, count: flowers.length };
  }

  /**
   * 通过 ID 查找花朵
   */
  getFlowerById(flowerId) {
    return this.flowers.find(f => f.id === flowerId);
  }

  /**
   * 获取已种植数量
   */
  getPlantedCount() {
    return this.plantedCount;
  }

  /**
   * 清空所有花朵
   */
  clearAll() {
    this.flowers = [];
    this.plantedCount = 0;
    this.grid.getAllCells().forEach(cell => cell.clearFlowers());
  }
}
