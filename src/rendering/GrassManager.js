/**
 * 3D 草地管理器
 * 使用精灵图创建立体草丛效果
 */

import * as THREE from 'three';
import { CONFIG, GARDEN_WIDTH, GARDEN_DEPTH, GROUND_Y } from '../config.js';
import { resources } from '../core/Resources.js';
import { processTextureForTransparency } from '../utils/image-process.js';

export class GrassManager {
  constructor(scene) {
    this.scene = scene;

    // 草地组
    this.grassGroup = new THREE.Group();
    this.scene.add(this.grassGroup);

    // 所有草精灵数据
    this.grasses = [];

    // 从全局配置读取
    this.config = { ...CONFIG.grass };
  }

  /**
   * 从草皮目录初始化草地
   * @param {Array<{url: string, count: number}>} grassTypes - 草类型数组
   * @param {Object} grid - 网格对象
   */
  async initFromCatalog(grassTypes, grid) {
    // 清除旧草地
    this.clear();

    // 加载所有纹理
    const textures = [];
    for (const grass of grassTypes) {
      if (grass.count > 0) {
        let texture = await resources.loadTexture(grass.url);
        texture = processTextureForTransparency(texture);
        textures.push({ texture, count: grass.count });
      }
    }

    const { cols, rows, cellWidth, cellDepth } = CONFIG.grid;

    // 遍历每个格子
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const center = grid.getCellCenter(col, row);

        // 放置每种草
        for (const { texture, count } of textures) {
          for (let i = 0; i < count; i++) {
            this.createGrassInCell(texture, center, cellWidth, cellDepth);
          }
        }
      }
    }
  }

  /**
   * 在格子范围内创建草
   * @param {THREE.Texture} texture - 纹理
   * @param {Object} center - 格子中心 {x, z}
   * @param {number} cellWidth - 格子宽度
   * @param {number} cellDepth - 格子深度
   */
  createGrassInCell(texture, center, cellWidth, cellDepth) {
    // 在格子范围内随机偏移
    const offsetX = (Math.random() - 0.5) * cellWidth * 0.8;
    const offsetZ = (Math.random() - 0.5) * cellDepth * 0.8;
    const x = center.x + offsetX;
    const z = center.z + offsetZ;

    this.createGrass(texture, x, z);
  }

  /**
   * 创建单个草精灵
   * @param {THREE.Texture} texture - 纹理
   * @param {number} x - X 坐标
   * @param {number} z - Z 坐标
   */
  createGrass(texture, x, z) {
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      alphaTest: 0.1,
      color: 0xffffff,
      depthWrite: false  // 防止草之间互相遮挡出问题
    });

    const sprite = new THREE.Sprite(material);

    // 底部为轴点
    sprite.center.set(0.5, 0);

    // 随机大小
    const scale = this.config.minScale + Math.random() * (this.config.maxScale - this.config.minScale);
    sprite.scale.set(scale, scale * 1.2, 1);

    // 位置（草稍微低于花朵）
    sprite.position.set(x, GROUND_Y - 0.01, z);

    // 随机层级，避免所有草都在同一平面
    sprite.renderOrder = Math.random();

    // 草数据
    const grassData = {
      sprite,
      phaseOffset: Math.random() * Math.PI * 2,
      baseRotation: (Math.random() - 0.5) * 0.3,
      originalScale: scale
    };

    this.grasses.push(grassData);
    this.grassGroup.add(sprite);
  }

  /**
   * 更新草的动画
   * @param {number} time - 当前时间
   */
  updateAnimation(time) {
    this.grasses.forEach(grassData => {
      const { sprite, phaseOffset, baseRotation } = grassData;

      // 摇摆动画
      const sway = Math.sin(time * this.config.swaySpeed + phaseOffset) * this.config.windSway;
      sprite.material.rotation = baseRotation + sway;
    });
  }

  /**
   * 清除所有草
   */
  clear() {
    this.grasses.forEach(grassData => {
      this.grassGroup.remove(grassData.sprite);
      grassData.sprite.material.dispose();
    });
    this.grasses = [];
  }

  /**
   * 设置草地密度并重新生成
   * @param {number} density - 新密度
   * @param {string} textureUrl - 纹理 URL
   */
  async setDensity(density, textureUrl) {
    this.config.density = density;
    await this.init(textureUrl);
  }

  /**
   * 显示/隐藏草地
   * @param {boolean} visible - 是否可见
   */
  setVisible(visible) {
    this.grassGroup.visible = visible;
  }
}
