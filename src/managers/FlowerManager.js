/**
 * 花朵管理器
 * 管理花朵的种植、生长、采摘
 */

import * as THREE from 'three';
import { CONFIG, GROUND_Y } from '../config.js';
import { eventBus, Events } from '../EventBus.js';
import { resources } from '../core/Resources.js';
import { processTextureForTransparency } from '../utils/image-process.js';

export class FlowerManager {
  constructor(grid, gardenGroup, bouquetCatalog) {
    this.grid = grid;
    this.gardenGroup = gardenGroup;
    this.bouquetCatalog = bouquetCatalog;

    // 所有花朵数据
    this.flowers = [];

    // 游戏状态
    this.plantedCount = 0;

    // 绑定事件
    this.bindEvents();
  }

  /**
   * 绑定事件监听
   */
  bindEvents() {
    // 可以监听外部事件并响应
  }

  /**
   * 创建单朵花
   * @param {THREE.Vector3} position - 位置
   * @param {string} textureUrl - 纹理 URL
   * @param {number} col - 所属格子列
   * @param {number} row - 所属格子行
   * @param {string} bouquetKey - 花束类型
   * @param {number|null} fixedRotation - 固定旋转角度
   * @returns {Promise<Object>} 花朵数据
   */
  async createFlower(position, textureUrl, col, row, bouquetKey, fixedRotation = null) {
    let texture = await resources.loadTexture(textureUrl);

    // 处理透明度
    texture = processTextureForTransparency(texture);

    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      alphaTest: 0.05,
      color: 0xffffff
    });

    const sprite = new THREE.Sprite(material);

    // 底部为轴点
    sprite.center.set(0.5, 0);

    // 随机大小
    const scale = 0.5 + Math.random() * 0.5;
    sprite.scale.set(scale, scale * 1.5, 1);

    // 位置
    sprite.position.copy(position);
    sprite.position.y = GROUND_Y;

    // 花朵数据
    const flowerData = {
      id: `flower_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sprite,
      phaseOffset: Math.random() * Math.PI * 2,
      baseRotation: fixedRotation !== null ? fixedRotation : (Math.random() - 0.5) * 0.5,
      plantTime: Date.now(),
      isHarvestable: false,
      originalScale: scale,
      cellCol: col,
      cellRow: row,
      bouquetKey
    };

    this.flowers.push(flowerData);
    this.gardenGroup.add(sprite);

    // 添加到格子
    const cell = this.grid.getCell(col, row);
    if (cell) {
      cell.addFlower(flowerData);
    }

    this.plantedCount++;
    eventBus.emit(Events.FLOWER_PLANTED, { flower: flowerData, cell });

    return flowerData;
  }

  /**
   * 在格子中种植一簇花朵
   * @param {number} col - 列索引
   * @param {number} row - 行索引
   * @param {string} bouquetKey - 花束类型
   * @param {number} count - 花朵数量
   * @returns {Promise<Object[]>} 种植的花朵数组
   */
  async plantBouquetInCell(col, row, bouquetKey, count) {
    const cell = this.grid.getCell(col, row);
    if (!cell || !cell.isEmpty()) {
      eventBus.emit(Events.STATUS_MESSAGE, { message: '该格子已种植！' });
      return [];
    }

    const bouquetData = this.bouquetCatalog[bouquetKey];
    if (!bouquetData) return [];

    const images = Array.isArray(bouquetData) ? bouquetData : bouquetData.images;
    if (!images || images.length === 0) return [];

    // 标记格子为已种植
    cell.plant();

    // 获取格子中心
    const center = this.grid.getCellCenter(col, row);
    const centerPos = new THREE.Vector3(center.x, 0, center.z);

    const plantedFlowers = [];
    const spreadAngle = CONFIG.game.bouquetSpreadAngle;

    // 所有花根部在同一点，朝向不同
    for (let i = 0; i < count; i++) {
      const pos = centerPos.clone();
      const imgUrl = images[Math.floor(Math.random() * images.length)];

      // 计算旋转角度
      const angle = (i / count - 0.5) * Math.PI * spreadAngle;
      const randomOffset = (Math.random() - 0.5) * 0.1;
      const rotation = angle + randomOffset;

      const flower = await this.createFlower(pos, imgUrl, col, row, bouquetKey, rotation);
      plantedFlowers.push(flower);
    }

    eventBus.emit(Events.STATUS_MESSAGE, {
      message: `在格子 (${col + 1}, ${row + 1}) 种植成功！`
    });

    return plantedFlowers;
  }

  /**
   * 移除单朵花
   * @param {Object} flowerData - 花朵数据
   */
  removeFlower(flowerData) {
    const { sprite, cellCol, cellRow } = flowerData;

    // 从场景移除
    this.gardenGroup.remove(sprite);
    sprite.material.dispose();

    // 从数组移除
    const index = this.flowers.indexOf(flowerData);
    if (index > -1) {
      this.flowers.splice(index, 1);
    }

    // 从格子移除
    const cell = this.grid.getCell(cellCol, cellRow);
    if (cell) {
      cell.removeFlower(flowerData);
    }

    this.plantedCount--;
  }

  /**
   * 采摘格子中的所有可采摘花朵
   * @param {number} col - 列索引
   * @param {number} row - 行索引
   * @returns {{flowers: Object[], gold: number}} 采摘结果
   */
  harvestCell(col, row) {
    const cell = this.grid.getCell(col, row);
    if (!cell) return { flowers: [], gold: 0 };

    const harvestable = cell.getHarvestableFlowers();
    if (harvestable.length === 0) return { flowers: [], gold: 0 };

    // 移除所有可采摘花朵
    harvestable.forEach(flower => this.removeFlower(flower));

    // 计算金币
    const gold = harvestable.length * CONFIG.game.harvestGold;

    eventBus.emit(Events.FLOWER_HARVESTED, {
      flowers: harvestable,
      cell,
      gold
    });

    return { flowers: harvestable, gold };
  }

  /**
   * 按ID采摘单朵花
   * @param {string} flowerId - 花朵ID
   * @returns {{flower: Object|null, gold: number}}
   */
  harvestFlowerById(flowerId) {
    const flower = this.getFlowerById(flowerId);
    if (!flower || !flower.isHarvestable) {
      return { flower: null, gold: 0 };
    }

    this.removeFlower(flower);
    const gold = CONFIG.game.harvestGold;

    eventBus.emit(Events.FLOWER_HARVESTED, {
      flowers: [flower],
      gold
    });

    return { flower, gold };
  }

  /**
   * 更新花朵动画
   * @param {number} time - 当前时间
   * @param {number} windSway - 摇摆幅度
   * @param {number} swaySpeed - 摇摆速度
   */
  updateAnimation(time, windSway, swaySpeed) {
    const now = Date.now();

    this.flowers.forEach(flowerData => {
      const { sprite, phaseOffset, baseRotation, plantTime, isHarvestable, originalScale } = flowerData;

      // 摇摆动画
      const sway = Math.sin(time * swaySpeed + phaseOffset) * windSway;
      sprite.material.rotation = baseRotation + sway;

      // 成长检测
      const growthProgress = Math.min((now - plantTime) / CONFIG.game.growthTime, 1);

      if (growthProgress < 1) {
        // 成长中
        const currentScale = originalScale * (0.3 + growthProgress * 0.7);
        sprite.scale.set(currentScale, currentScale * 1.5, 1);
        sprite.material.color.setRGB(
          0.6 + growthProgress * 0.4,
          0.6 + growthProgress * 0.4,
          0.6 + growthProgress * 0.4
        );
      } else if (!isHarvestable) {
        // 刚成长完成
        flowerData.isHarvestable = true;
        sprite.scale.set(originalScale, originalScale * 1.5, 1);
        sprite.material.color.setRGB(1, 1, 1);
        eventBus.emit(Events.FLOWER_GROWTH_COMPLETE, { flower: flowerData });
      }

    });
  }

  /**
   * 根据 ID 获取花朵
   * @param {string} id - 花朵 ID
   * @returns {Object|null}
   */
  getFlowerById(id) {
    return this.flowers.find(f => f.id === id) || null;
  }

  /**
   * 根据 sprite 获取花朵数据
   * @param {THREE.Sprite} sprite - 精灵对象
   * @returns {Object|null}
   */
  getFlowerBySprite(sprite) {
    return this.flowers.find(f => f.sprite === sprite) || null;
  }

  /**
   * 获取所有花朵精灵
   * @returns {THREE.Sprite[]}
   */
  getAllSprites() {
    return this.flowers.map(f => f.sprite);
  }

  /**
   * 清空所有花朵
   */
  clearAll() {
    // 复制数组以避免迭代时修改
    [...this.flowers].forEach(flower => this.removeFlower(flower));
    this.grid.clearAll();
    eventBus.emit(Events.STATUS_MESSAGE, { message: '花园已清空' });
  }

  /**
   * 获取已种植数量
   * @returns {number}
   */
  getPlantedCount() {
    return this.plantedCount;
  }
}
