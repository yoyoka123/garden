/**
 * 装饰物管理器
 * 管理装饰物的添加、移动、缩放、删除
 * 支持配置驱动的自定义运动和交互
 */

import * as THREE from 'three';
import { eventBus, Events } from '../EventBus.js';
import { resources } from '../core/Resources.js';
import { Entity } from '../core/Entity.js';
import { TransformComponent } from '../components/TransformComponent.js';
import { InteractableComponent } from '../components/InteractableComponent.js';
import { motionController } from '../motion/MotionController.js';
import { motionRegistry } from '../motion/MotionRegistry.js';
import { behaviorRegistry } from '../interactions/BehaviorRegistry.js';
import { DecorationConfigs, getDecorationConfig } from '../config/entities/decorations.js';

export class DecorationManager {
  constructor(scene) {
    this.scene = scene;
    this.decorations = [];

    /** @type {Map<string, Entity>} 装饰物ID -> Entity */
    this.entities = new Map();

    // 拖拽状态
    this.selectedDecoration = null;
    this.isDragging = false;
  }

  /**
   * 创建装饰物
   * @param {string} imageUrl - 图片 URL
   * @param {THREE.Vector3} position - 位置
   * @param {Object} [options] - 额外选项
   * @param {string} [options.configId] - 配置 ID（如 'butterfly', 'cat'）
   * @param {Object[]} [options.motions] - 自定义运动配置
   * @returns {Promise<Object>} 装饰物数据
   */
  async create(imageUrl, position, options = {}) {
    const texture = await resources.loadTexture(imageUrl);

    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      alphaTest: 0.05
    });

    const sprite = new THREE.Sprite(material);
    sprite.position.copy(position);

    // 设置锚点为底部中心（与花朵一致），改善点击判定
    sprite.center.set(0.5, 0);

    // 获取配置（如果有）
    const config = options.configId ? getDecorationConfig(options.configId) : null;
    const renderConfig = config?.render || {};

    // 计算缩放（默认 0.6，更适合花园比例）
    const baseScale = renderConfig.scale?.base ?? options.scale ?? 0.6;
    const randomScale = renderConfig.scale?.random ?? 0;
    const scale = baseScale + Math.random() * randomScale;

    sprite.scale.set(scale, scale, 1);
    sprite.userData.isDecoration = true;

    // 设置渲染顺序
    if (renderConfig.renderOrder !== undefined) {
      sprite.renderOrder = renderConfig.renderOrder;
    }

    const decorationId = `decoration_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const decorationData = {
      id: decorationId,
      sprite,
      position: position.clone(),
      scale,
      textureUrl: imageUrl,
      configId: options.configId || null,
      ai: config?.ai || null
    };

    this.decorations.push(decorationData);
    this.scene.add(sprite);

    // 创建 Entity 并设置运动
    const entity = this._createEntity(decorationData, config, options);
    if (entity) {
      this.entities.set(decorationId, entity);
      decorationData.entity = entity;

      // 启动配置中定义的运动
      this._setupMotions(entity, config, options);

      // 设置配置中定义的交互
      this._setupInteractions(entity, config, options);
    }

    eventBus.emit(Events.DECORATION_ADDED, { decoration: decorationData });
    eventBus.emit(Events.STATUS_MESSAGE, { message: '装饰物已添加' });

    return decorationData;
  }

  /**
   * 从配置创建装饰物
   * @param {string} configId - 配置 ID（如 'butterfly', 'cat', 'fountain'）
   * @param {THREE.Vector3} position - 位置
   * @returns {Promise<Object>} 装饰物数据
   */
  async createFromConfig(configId, position) {
    const config = getDecorationConfig(configId);
    if (!config) {
      console.warn(`未找到装饰物配置: ${configId}`);
      return null;
    }

    const imageUrl = config.render?.sprite;
    if (!imageUrl) {
      console.warn(`装饰物配置缺少 sprite: ${configId}`);
      return null;
    }

    return this.create(imageUrl, position, { configId });
  }

  /**
   * 创建 Entity
   * @private
   */
  _createEntity(decorationData, config, options) {
    const entity = new Entity(decorationData.id, 'decoration');

    // 添加变换组件
    const transformComp = new TransformComponent({
      position: {
        x: decorationData.position.x,
        y: decorationData.position.y,
        z: decorationData.position.z
      }
    });
    entity.addComponent(transformComp);

    // 存储 sprite 引用
    entity.userData.sprite = decorationData.sprite;
    entity.userData.decorationData = decorationData;

    return entity;
  }

  /**
   * 设置运动
   * @private
   */
  _setupMotions(entity, config, options) {
    // 优先使用 options.motions，如果没有则使用 config.motions
    // 避免重复添加运动
    const motions = options.motions?.length > 0
      ? options.motions
      : (config?.motions || []);

    for (const motionDef of motions) {
      // 只处理 always 触发的运动
      if (motionDef.trigger !== 'always') continue;

      const motion = motionRegistry.createFromConfig({
        type: motionDef.type,
        ...motionDef.config
      });

      if (motion) {
        motion.setTarget(entity.userData.sprite);
        motionController.add(entity, motionDef.id || motionDef.type, motion);
      }
    }
  }

  /**
   * 设置交互
   * @private
   */
  _setupInteractions(entity, config, options) {
    // 合并配置交互和自定义交互
    const interactions = [
      ...(config?.interactions || []),
      ...(options.interactions || [])
    ];

    if (interactions.length === 0) return;

    // 创建交互组件
    const interactable = new InteractableComponent();
    entity.addComponent(interactable);

    for (const interactionDef of interactions) {
      // 使用 BehaviorRegistry 创建行为
      const behavior = behaviorRegistry.createFromConfig({
        type: interactionDef.type,
        ...interactionDef
      });

      if (behavior) {
        interactable.addInteraction({
          type: interactionDef.type,
          condition: interactionDef.condition
            ? (e) => interactionDef.condition(e)
            : () => true,
          handler: async (e, event) => {
            // 触发行为处理
            const result = await behavior.handle({ entity: e, ...event });

            // 如果有动作名称，发出事件
            if (interactionDef.action) {
              eventBus.emit(Events.DECORATION_INTERACTION, {
                decoration: entity.userData.decorationData,
                action: interactionDef.action,
                result
              });
            }

            return result;
          },
          ui: interactionDef.ui
        });
      }
    }
  }

  /**
   * 获取装饰物的交互组件
   * @param {Object} decoration - 装饰物数据
   * @returns {InteractableComponent|null}
   */
  getInteractable(decoration) {
    const entity = this.entities.get(decoration.id);
    return entity?.getComponent('interactable') || null;
  }

  /**
   * 触发装饰物交互
   * @param {Object} decoration - 装饰物数据
   * @param {string} interactionType - 交互类型
   * @param {Object} event - 事件数据
   */
  async triggerInteraction(decoration, interactionType, event = {}) {
    const interactable = this.getInteractable(decoration);
    if (!interactable) return null;

    return await interactable.handleInteraction(interactionType, event);
  }

  /**
   * 为装饰物添加运动
   * @param {Object} decoration - 装饰物数据
   * @param {string} motionType - 运动类型
   * @param {Object} config - 运动配置
   * @returns {boolean} 是否成功
   */
  addMotion(decoration, motionType, config = {}) {
    const entity = this.entities.get(decoration.id);
    if (!entity) {
      console.warn('装饰物没有关联的 Entity');
      return false;
    }

    const motion = motionRegistry.create(motionType, config);
    if (!motion) {
      console.warn(`未知的运动类型: ${motionType}`);
      return false;
    }

    motion.setTarget(entity.userData.sprite);
    const motionId = config.id || `${motionType}_${Date.now()}`;
    motionController.add(entity, motionId, motion);

    return true;
  }

  /**
   * 停止装饰物的所有运动
   * @param {Object} decoration - 装饰物数据
   */
  stopMotions(decoration) {
    const entity = this.entities.get(decoration.id);
    if (entity) {
      motionController.stopAll(entity);
    }
  }

  /**
   * 删除装饰物
   * @param {Object} decoration - 装饰物数据
   */
  remove(decoration) {
    // 停止运动
    const entity = this.entities.get(decoration.id);
    if (entity) {
      motionController.stopAll(entity);
      this.entities.delete(decoration.id);
    }

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

    // 拖拽时暂停运动
    const entity = this.entities.get(decoration.id);
    if (entity) {
      motionController.pauseAll(entity);
    }
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
      // 恢复运动
      const entity = this.entities.get(this.selectedDecoration.id);
      if (entity) {
        motionController.resumeAll(entity);
      }

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

  /**
   * 获取所有可用的装饰物配置
   * @returns {string[]}
   */
  getAvailableConfigs() {
    return Object.keys(DecorationConfigs);
  }
}
