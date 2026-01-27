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
   * @param {Array<{url: string, count: number, scale: number}>} grassTypes - 草类型数组
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
        // 传递 scale 参数，默认为 1.0
        textures.push({ 
          texture, 
          count: grass.count,
          scale: grass.scale || 1.0 
        });
      }
    }

    // 遍历所有格子
    grid.forEach((cell, month, day) => {
      const center = grid.getCellCenter(month, day);

      // 放置每种草
      for (const { texture, count, scale } of textures) {
        for (let i = 0; i < count; i++) {
          this.createGrassInCell(texture, center, month, grid, scale);
        }
      }
    });
  }

  /**
   * 在格子范围内创建草
   * @param {THREE.Texture} texture - 纹理
   * @param {Object} center - 格子中心 {x, z}
   * @param {number} month - 月份索引
   * @param {Object} grid - 网格对象
   * @param {number} scaleMultiplier - 大小缩放倍率
   */
  createGrassInCell(texture, center, month, grid, scaleMultiplier = 1.0) {
    // 随机偏移 (局部坐标)
    const cw = grid.monthGrid.cellWidth;
    const cd = grid.monthGrid.cellDepth;
    
    const localX = (Math.random() - 0.5) * cw;
    const localZ = (Math.random() - 0.5) * cd;
    
    // 直接在中心坐标上应用偏移 (新网格是轴对齐的)
    const x = center.x + localX;
    const z = center.z + localZ;

    this.createGrass(texture, x, z, scaleMultiplier);
  }

  /**
   * 创建单个草精灵
   * @param {THREE.Texture} texture - 纹理
   * @param {number} x - X 坐标
   * @param {number} z - Z 坐标
   * @param {number} scaleMultiplier - 大小缩放倍率
   */
  createGrass(texture, x, z, scaleMultiplier = 1.0) {
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

    // 随机大小，并应用缩放倍率
    const baseScale = this.config.minScale + Math.random() * (this.config.maxScale - this.config.minScale);
    const finalScale = baseScale * scaleMultiplier;
    
    sprite.scale.set(finalScale, finalScale * 1.2, 1);

    // 位置（草稍微低于花朵）
    sprite.position.set(x, GROUND_Y - 0.01, z);

    // 随机层级，避免所有草都在同一平面
    sprite.renderOrder = Math.random();

    // 草数据
    const grassData = {
      sprite,
      phaseOffset: Math.random() * Math.PI * 2,
      baseRotation: (Math.random() - 0.5) * 0.3,
      originalScale: finalScale
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
