/**
 * 游戏状态管理
 * 集中管理游戏的全局状态
 */

import { eventBus, Events } from '../EventBus.js';
import { CONFIG } from '../config.js';

export class GameState {
  constructor() {
    // 花束选择
    this.selectedBouquet = '';
    this.bouquetCount = 5;
    this.clusterRadius = 0.5;

    // 花园设置
    this.gardenScale = 1;
    this.windSway = CONFIG.animation.windSway;
    this.swaySpeed = CONFIG.animation.swaySpeed;
    this.randomRotation = false;
    this.gardenRotate = false;

    // 统计
    this.plantedCount = 0;
    this.gold = 0;

    // 加载状态
    this.loadingCount = 0;
    this.loadedCount = 0;
  }

  /**
   * 设置选中的花束
   * @param {string} bouquetKey - 花束键名
   */
  setSelectedBouquet(bouquetKey) {
    this.selectedBouquet = bouquetKey;
  }

  /**
   * 设置花束数量
   * @param {number} count - 数量
   */
  setBouquetCount(count) {
    this.bouquetCount = Math.round(count);
  }

  /**
   * 增加金币
   * @param {number} amount - 数量
   */
  addGold(amount) {
    this.gold += amount;
    eventBus.emit(Events.GOLD_CHANGED, { gold: this.gold, change: amount });
  }

  /**
   * 更新已种植数量
   * @param {number} count - 数量
   */
  setPlantedCount(count) {
    this.plantedCount = count;
  }

  /**
   * 设置动画参数
   * @param {string} key - 参数名
   * @param {any} value - 参数值
   */
  setAnimationParam(key, value) {
    if (key in this) {
      this[key] = value;
    }
  }

  /**
   * 获取所有状态
   * @returns {Object}
   */
  getAll() {
    return {
      selectedBouquet: this.selectedBouquet,
      bouquetCount: this.bouquetCount,
      clusterRadius: this.clusterRadius,
      gardenScale: this.gardenScale,
      windSway: this.windSway,
      swaySpeed: this.swaySpeed,
      randomRotation: this.randomRotation,
      gardenRotate: this.gardenRotate,
      plantedCount: this.plantedCount,
      gold: this.gold
    };
  }
}

// 导出单例
export const gameState = new GameState();
