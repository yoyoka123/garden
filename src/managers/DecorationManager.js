/**
 * 装饰物管理器
 * 管理装饰物的添加、移动、缩放、删除
 */

import * as THREE from 'three';
import { eventBus, Events } from '../EventBus.js';
import { resources } from '../core/Resources.js';

export class DecorationManager {
  constructor(scene) {
    this.scene = scene;
    this.decorations = [];

    // 拖拽状态
    this.selectedDecoration = null;
    this.isDragging = false;
  }

  /**
   * 创建装饰物
   * @param {string} imageUrl - 图片 URL
   * @param {THREE.Vector3} position - 位置
   * @returns {Promise<Object>} 装饰物数据
   */
  async create(imageUrl, position) {
    const texture = await resources.loadTexture(imageUrl);

    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      alphaTest: 0.05
    });

    const sprite = new THREE.Sprite(material);
    sprite.position.copy(position);

    const scale = 1;
    sprite.scale.set(scale, scale, 1);
    sprite.userData.isDecoration = true;

    const decorationData = {
      id: `decoration_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sprite,
      position: position.clone(),
      scale,
      textureUrl: imageUrl
    };

    this.decorations.push(decorationData);
    this.scene.add(sprite);

    eventBus.emit(Events.DECORATION_ADDED, { decoration: decorationData });
    eventBus.emit(Events.STATUS_MESSAGE, { message: '装饰物已添加' });

    return decorationData;
  }

  /**
   * 删除装饰物
   * @param {Object} decoration - 装饰物数据
   */
  remove(decoration) {
    this.scene.remove(decoration.sprite);
    decoration.sprite.material.dispose();

    const index = this.decorations.indexOf(decoration);
    if (index > -1) {
      this.decorations.splice(index, 1);
    }

    eventBus.emit(Events.DECORATION_REMOVED, { decoration });
    eventBus.emit(Events.STATUS_MESSAGE, { message: '装饰物已删除' });
  }

  /**
   * 根据精灵获取装饰物
   * @param {THREE.Sprite} sprite - 精灵对象
   * @returns {Object|null}
   */
  getBySprite(sprite) {
    return this.decorations.find(d => d.sprite === sprite) || null;
  }

  /**
   * 获取所有装饰物精灵
   * @returns {THREE.Sprite[]}
   */
  getAllSprites() {
    return this.decorations.map(d => d.sprite);
  }

  /**
   * 开始拖拽
   * @param {Object} decoration - 装饰物数据
   */
  startDrag(decoration) {
    this.selectedDecoration = decoration;
    this.isDragging = true;
  }

  /**
   * 更新拖拽位置
   * @param {number} x - 新 X 坐标
   * @param {number} z - 新 Z 坐标
   */
  updateDragPosition(x, z) {
    if (!this.isDragging || !this.selectedDecoration) return;

    this.selectedDecoration.sprite.position.x = x;
    this.selectedDecoration.sprite.position.z = z;
    this.selectedDecoration.position.copy(this.selectedDecoration.sprite.position);
  }

  /**
   * 结束拖拽
   */
  endDrag() {
    if (this.isDragging && this.selectedDecoration) {
      eventBus.emit(Events.DECORATION_MOVED, {
        decoration: this.selectedDecoration
      });
    }
    this.isDragging = false;
    this.selectedDecoration = null;
  }

  /**
   * 缩放装饰物
   * @param {Object} decoration - 装饰物数据
   * @param {number} delta - 缩放增量 (正数放大，负数缩小)
   */
  scale(decoration, delta) {
    const factor = delta > 0 ? 0.9 : 1.1;
    decoration.scale = Math.max(0.2, Math.min(5, decoration.scale * factor));
    decoration.sprite.scale.set(decoration.scale, decoration.scale, 1);
  }

  /**
   * 清空所有装饰物
   */
  clearAll() {
    [...this.decorations].forEach(d => this.remove(d));
  }

  /**
   * 获取装饰物数量
   * @returns {number}
   */
  getCount() {
    return this.decorations.length;
  }
}
