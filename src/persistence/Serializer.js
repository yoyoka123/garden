/**
 * 序列化器
 * 处理花园状态的序列化和反序列化
 */

/**
 * @typedef {Object} SerializedFlower
 * @property {string} id
 * @property {string} bouquetKey
 * @property {number} cellCol
 * @property {number} cellRow
 * @property {number} plantTime
 * @property {boolean} isHarvestable
 * @property {number} originalScale
 * @property {number} baseRotation
 * @property {number} phaseOffset
 * @property {{x: number, y: number, z: number}} position
 */

/**
 * @typedef {Object} SerializedDecoration
 * @property {string} id
 * @property {string} textureUrl
 * @property {{x: number, y: number, z: number}} position
 * @property {number} scale
 */

/**
 * @typedef {Object} SerializedGameState
 * @property {number} gold
 * @property {string} selectedBouquet
 * @property {number} bouquetCount
 * @property {string} selectedGrass
 * @property {number} plantedCount
 */

/**
 * @typedef {Object} SerializedGardenState
 * @property {number} version
 * @property {number} savedAt
 * @property {SerializedGameState} gameState
 * @property {SerializedFlower[]} flowers
 * @property {SerializedDecoration[]} decorations
 * @property {Object} gridState
 */

export class Serializer {
  static VERSION = 1;

  /**
   * 序列化花朵
   * @param {Object} flower - FlowerManager 中的花朵数据
   * @returns {SerializedFlower}
   */
  static serializeFlower(flower) {
    return {
      id: flower.id,
      bouquetKey: flower.bouquetKey,
      cellCol: flower.cellCol,
      cellRow: flower.cellRow,
      plantTime: flower.plantTime,
      isHarvestable: flower.isHarvestable,
      originalScale: flower.originalScale,
      baseRotation: flower.baseRotation,
      phaseOffset: flower.phaseOffset,
      position: {
        x: flower.sprite.position.x,
        y: flower.sprite.position.y,
        z: flower.sprite.position.z
      }
    };
  }

  /**
   * 序列化装饰物
   * @param {Object} decoration - DecorationManager 中的装饰物数据
   * @returns {SerializedDecoration}
   */
  static serializeDecoration(decoration) {
    return {
      id: decoration.id,
      textureUrl: decoration.textureUrl,
      configId: decoration.configId || null,
      position: {
        x: decoration.position.x,
        y: decoration.position.y,
        z: decoration.position.z
      },
      scale: decoration.scale
    };
  }

  /**
   * 序列化游戏状态
   * @param {import('../managers/GameState.js').GameState} gameState
   * @returns {SerializedGameState}
   */
  static serializeGameState(gameState) {
    return {
      gold: gameState.gold,
      selectedBouquet: gameState.selectedBouquet,
      bouquetCount: gameState.bouquetCount,
      selectedGrass: gameState.selectedGrass,
      plantedCount: gameState.plantedCount
    };
  }

  /**
   * 序列化网格状态
   * @param {import('../core/Grid.js').Grid} grid
   * @returns {Object}
   */
  static serializeGrid(grid) {
    const cells = {};
    for (let row = 0; row < grid.rows; row++) {
      for (let col = 0; col < grid.cols; col++) {
        const cell = grid.getCell(col, row);
        if (cell && !cell.isEmpty()) {
          cells[`${col}_${row}`] = {
            isPlanted: !cell.isEmpty(),
            flowerIds: cell.flowers.map(f => f.id)
          };
        }
      }
    }
    return cells;
  }

  /**
   * 序列化完整的花园状态
   * @param {Object} managers - 包含 flowerManager, decorationManager, gameState, grid
   * @returns {SerializedGardenState}
   */
  static serializeAll(managers) {
    const { flowerManager, decorationManager, gameState, grid } = managers;

    return {
      version: Serializer.VERSION,
      savedAt: Date.now(),
      gameState: Serializer.serializeGameState(gameState),
      flowers: flowerManager.flowers.map(f => Serializer.serializeFlower(f)),
      decorations: decorationManager.decorations.map(d => Serializer.serializeDecoration(d)),
      gridState: Serializer.serializeGrid(grid)
    };
  }

  /**
   * 检查序列化数据的版本兼容性
   * @param {SerializedGardenState} data
   * @returns {boolean}
   */
  static isCompatible(data) {
    return data && data.version === Serializer.VERSION;
  }

  /**
   * 迁移旧版本数据
   * @param {Object} data
   * @returns {SerializedGardenState|null}
   */
  static migrate(data) {
    if (!data) return null;

    // 目前只有 v1，无需迁移
    // 未来版本升级时在这里添加迁移逻辑
    if (!data.version) {
      // 添加版本号
      data.version = 1;
      data.savedAt = data.savedAt || Date.now();
    }

    return data;
  }
}
