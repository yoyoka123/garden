/**
 * 状态管理器
 * 管理花园状态的保存、加载和自动保存
 */

import { LocalStorageAdapter } from './LocalStorageAdapter.js';
import { Serializer } from './Serializer.js';
import { eventBus, Events } from '../EventBus.js';

const SAVE_KEY = 'gardenState';
const AUTO_SAVE_INTERVAL = 30000; // 30秒自动保存

export class StateManager {
  /**
   * @param {Object} managers - 包含所有需要持久化的管理器
   */
  constructor(managers = {}) {
    this.managers = managers;
    this.storage = new LocalStorageAdapter('garden');
    this.autoSaveTimer = null;
    this.isDirty = false;

    // 监听会触发保存的事件
    this._bindSaveEvents();
  }

  /**
   * 设置管理器引用
   * @param {Object} managers
   */
  setManagers(managers) {
    this.managers = managers;
  }

  /**
   * 绑定需要触发保存的事件
   */
  _bindSaveEvents() {
    const markDirty = () => { this.isDirty = true; };

    eventBus.on(Events.FLOWER_PLANTED, markDirty);
    eventBus.on(Events.FLOWER_HARVESTED, markDirty);
    eventBus.on(Events.DECORATION_ADDED, markDirty);
    eventBus.on(Events.DECORATION_REMOVED, markDirty);
    eventBus.on(Events.DECORATION_MOVED, markDirty);
    eventBus.on(Events.GOLD_CHANGED, markDirty);
  }

  /**
   * 保存当前状态
   * @returns {boolean}
   */
  save() {
    if (!this._validateManagers()) {
      console.warn('StateManager: managers not properly set');
      return false;
    }

    try {
      const state = Serializer.serializeAll(this.managers);
      const success = this.storage.save(SAVE_KEY, state);

      if (success) {
        this.isDirty = false;
        console.log('Garden state saved successfully');
      }

      return success;
    } catch (error) {
      console.error('Failed to save garden state:', error);
      return false;
    }
  }

  /**
   * 加载保存的状态
   * @returns {import('./Serializer.js').SerializedGardenState|null}
   */
  load() {
    try {
      let data = this.storage.load(SAVE_KEY);

      if (!data) {
        console.log('No saved garden state found');
        return null;
      }

      // 检查版本兼容性并迁移
      if (!Serializer.isCompatible(data)) {
        data = Serializer.migrate(data);
        if (!data) {
          console.warn('Failed to migrate saved data');
          return null;
        }
      }

      console.log('Garden state loaded successfully');
      return data;
    } catch (error) {
      console.error('Failed to load garden state:', error);
      return null;
    }
  }

  /**
   * 恢复花朵状态
   * @param {import('./Serializer.js').SerializedFlower[]} flowers
   * @param {import('../managers/FlowerManager.js').FlowerManager} flowerManager
   * @param {Object} bouquetCatalog
   */
  async restoreFlowers(flowers, flowerManager, bouquetCatalog) {
    const THREE = await import('three');

    for (const flowerData of flowers) {
      const bouquetData = bouquetCatalog[flowerData.bouquetKey];
      if (!bouquetData) continue;

      const images = Array.isArray(bouquetData) ? bouquetData : bouquetData.images;
      if (!images || images.length === 0) continue;

      // 随机选择一张图片
      const imgUrl = images[Math.floor(Math.random() * images.length)];

      // 创建 THREE.Vector3 位置
      const position = new THREE.Vector3(
        flowerData.position.x,
        flowerData.position.y,
        flowerData.position.z
      );

      const flower = await flowerManager.createFlower(
        position,
        imgUrl,
        flowerData.cellCol,
        flowerData.cellRow,
        flowerData.bouquetKey,
        flowerData.baseRotation
      );

      // 恢复时间相关状态
      if (flower) {
        flower.plantTime = flowerData.plantTime;
        flower.isHarvestable = flowerData.isHarvestable;
        flower.phaseOffset = flowerData.phaseOffset;
      }
    }
  }

  /**
   * 恢复装饰物状态
   * @param {import('./Serializer.js').SerializedDecoration[]} decorations
   * @param {import('../managers/DecorationManager.js').DecorationManager} decorationManager
   */
  async restoreDecorations(decorations, decorationManager) {
    const THREE = await import('three');

    for (const decData of decorations) {
      const position = new THREE.Vector3(
        decData.position.x,
        decData.position.y,
        decData.position.z
      );

      // 传递 configId 和 motions 以恢复运动配置
      const decoration = await decorationManager.create(decData.textureUrl, position, {
        configId: decData.configId,
        motions: decData.motions
      });

      if (decoration) {
        // 恢复缩放
        decoration.scale = decData.scale;
        decoration.sprite.scale.set(decData.scale, decData.scale, 1);
      }
    }
  }

  /**
   * 恢复游戏状态
   * @param {import('./Serializer.js').SerializedGameState} state
   * @param {import('../managers/GameState.js').GameState} gameState
   */
  restoreGameState(state, gameState) {
    if (state.gold !== undefined) {
      gameState.gold = state.gold;
    }
    if (state.selectedBouquet !== undefined) {
      gameState.selectedBouquet = state.selectedBouquet;
    }
    if (state.bouquetCount !== undefined) {
      gameState.bouquetCount = state.bouquetCount;
    }
    if (state.selectedGrass !== undefined) {
      gameState.selectedGrass = state.selectedGrass;
    }
  }

  /**
   * 启动自动保存
   * @param {number} interval - 自动保存间隔（毫秒）
   */
  startAutoSave(interval = AUTO_SAVE_INTERVAL) {
    this.stopAutoSave();

    this.autoSaveTimer = setInterval(() => {
      if (this.isDirty) {
        this.save();
      }
    }, interval);

    // 页面关闭前保存
    window.addEventListener('beforeunload', this._onBeforeUnload);

    console.log(`Auto-save enabled (interval: ${interval}ms)`);
  }

  /**
   * 停止自动保存
   */
  stopAutoSave() {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
    window.removeEventListener('beforeunload', this._onBeforeUnload);
  }

  /**
   * 页面关闭前的处理
   */
  _onBeforeUnload = () => {
    if (this.isDirty) {
      this.save();
    }
  };

  /**
   * 验证管理器是否正确设置
   * @returns {boolean}
   */
  _validateManagers() {
    return !!(
      this.managers.flowerManager &&
      this.managers.decorationManager &&
      this.managers.gameState &&
      this.managers.grid
    );
  }

  /**
   * 清除保存的数据
   * @returns {boolean}
   */
  clearSave() {
    return this.storage.remove(SAVE_KEY);
  }

  /**
   * 检查是否有保存的数据
   * @returns {boolean}
   */
  hasSavedState() {
    return this.storage.has(SAVE_KEY);
  }

  /**
   * 获取保存时间
   * @returns {number|null}
   */
  getSaveTime() {
    const data = this.load();
    return data?.savedAt || null;
  }
}

// 导出单例
export const stateManager = new StateManager();
