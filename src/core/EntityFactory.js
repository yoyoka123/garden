/**
 * 实体工厂
 * 从配置创建实体
 */

import { Entity } from './Entity.js';
import { componentRegistry } from './ComponentRegistry.js';
import { behaviorRegistry } from '../interactions/BehaviorRegistry.js';
import { motionRegistry } from '../motion/MotionRegistry.js';
import { TransformComponent } from '../components/TransformComponent.js';
import { RenderComponent } from '../components/RenderComponent.js';
import { LifecycleComponent } from '../components/LifecycleComponent.js';
import { MotionComponent } from '../components/MotionComponent.js';
import { InteractableComponent } from '../components/InteractableComponent.js';
import { Triggers } from '../motion/MotionTrigger.js';

/**
 * @typedef {Object} EntityConfig
 * @property {string} id - 实体 ID
 * @property {string} type - 实体类型
 * @property {Object} [render] - 渲染配置
 * @property {Object} [transform] - 变换配置
 * @property {Object} [lifecycle] - 生命周期配置
 * @property {Object} [motion] - 运动配置
 * @property {Object[]} [interactions] - 交互配置
 * @property {Object[]} [motions] - 运动定义
 * @property {Object} [ai] - AI 人格配置
 * @property {Object} [userData] - 自定义数据
 */

export class EntityFactory {
  /**
   * 从配置创建实体
   * @param {EntityConfig} config
   * @param {THREE.Object3D} parent - 渲染父容器
   * @returns {Promise<Entity>}
   */
  static async create(config, parent = null) {
    const entity = new Entity(config.id, config.type);

    // 添加变换组件
    if (config.transform || config.position) {
      const transformConfig = config.transform || {};
      if (config.position) {
        transformConfig.position = config.position;
      }
      entity.addComponent(new TransformComponent(transformConfig));
    }

    // 添加渲染组件
    if (config.render) {
      const renderComp = new RenderComponent({
        textureUrl: config.render.sprite || config.render.textureUrl,
        renderOrder: config.render.renderOrder
      });

      entity.addComponent(renderComp);

      // 如果有纹理，加载它
      if (config.render.sprite && parent) {
        await renderComp.loadSprite(config.render.sprite, parent);

        // 应用缩放
        if (config.render.scale) {
          const transform = entity.getComponent('transform');
          if (transform) {
            const baseScale = config.render.scale.base ?? 1;
            const randomScale = config.render.scale.random ?? 0;
            transform.scale = baseScale + Math.random() * randomScale;
            transform.baseScale = transform.scale;
          }
        }
      }
    }

    // 添加生命周期组件
    if (config.lifecycle) {
      entity.addComponent(new LifecycleComponent({
        growthTime: config.lifecycle.growthTime,
        stages: config.lifecycle.stages
      }));
    }

    // 添加运动组件
    if (config.motion || config.motions) {
      const motionComp = new MotionComponent({
        swayEnabled: config.motion?.sway?.enabled ?? true,
        swayAmplitude: config.motion?.sway?.amplitude,
        swayFrequency: config.motion?.sway?.frequency
      });
      entity.addComponent(motionComp);

      // 处理运动定义
      if (config.motions) {
        for (const motionDef of config.motions) {
          EntityFactory._setupMotion(entity, motionDef);
        }
      }
    }

    // 添加交互组件
    if (config.interactions) {
      const interactable = new InteractableComponent();

      for (const interactionDef of config.interactions) {
        EntityFactory._setupInteraction(entity, interactable, interactionDef);
      }

      entity.addComponent(interactable);
    }

    // 存储 AI 配置
    if (config.ai) {
      entity.userData.ai = config.ai;
    }

    // 存储其他自定义数据
    if (config.userData) {
      Object.assign(entity.userData, config.userData);
    }

    return entity;
  }

  /**
   * 设置运动
   * @param {Entity} entity
   * @param {Object} motionDef
   */
  static _setupMotion(entity, motionDef) {
    const motionComp = entity.getComponent('motion');
    if (!motionComp) return;

    // 创建运动
    const motion = motionRegistry.createFromConfig({
      type: motionDef.type,
      ...motionDef.config
    });

    if (!motion) return;

    // 设置触发器
    const triggerType = motionDef.trigger || 'always';

    switch (triggerType) {
      case 'always':
        // 立即启动运动
        motion.setEntity(entity);
        motionComp.addMotion(motionDef.id || motionDef.type, motion);
        break;

      case 'onInteraction':
        // 交互触发
        const trigger = Triggers.onInteraction(
          motionDef.interactionType || 'click',
          motion,
          { motionId: motionDef.id }
        );
        trigger.bind(entity);
        entity.userData.triggers = entity.userData.triggers || [];
        entity.userData.triggers.push(trigger);
        break;

      case 'onEvent':
        // 事件触发
        const eventTrigger = Triggers.onEvent(
          motionDef.event,
          motion,
          { motionId: motionDef.id }
        );
        eventTrigger.bind(entity);
        entity.userData.triggers = entity.userData.triggers || [];
        entity.userData.triggers.push(eventTrigger);
        break;
    }
  }

  /**
   * 设置交互
   * @param {Entity} entity
   * @param {InteractableComponent} interactable
   * @param {Object} interactionDef
   */
  static _setupInteraction(entity, interactable, interactionDef) {
    const behavior = behaviorRegistry.createFromConfig({
      type: interactionDef.type,
      ...interactionDef,
      ui: interactionDef.ui
    });

    if (behavior) {
      interactable.addInteraction({
        type: interactionDef.type,
        condition: interactionDef.condition
          ? (e) => interactionDef.condition(e)
          : () => true,
        handler: async (e, event) => {
          return await behavior.handle({ entity: e, ...event });
        },
        ui: interactionDef.ui
      });
    }
  }

  /**
   * 从花束目录配置创建实体配置
   * @param {string} bouquetKey
   * @param {Object} bouquetData - BOUQUET_CATALOG 中的数据
   * @param {Object} options - 额外选项
   * @returns {EntityConfig}
   */
  static fromBouquetCatalog(bouquetKey, bouquetData, options = {}) {
    const images = Array.isArray(bouquetData) ? bouquetData : bouquetData.images;
    const agent = bouquetData.agent || {};

    return {
      id: options.id || `flower_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'flower',

      render: {
        sprite: images[Math.floor(Math.random() * images.length)],
        scale: {
          base: 0.5,
          random: 0.5
        }
      },

      transform: {
        position: options.position,
        rotation: options.rotation ?? (Math.random() - 0.5) * 0.5
      },

      lifecycle: {
        growthTime: options.growthTime ?? 10000,
        stages: ['seed', 'sprout', 'growing', 'mature']
      },

      motion: {
        sway: {
          enabled: true,
          amplitude: 0.1,
          frequency: 1.5
        }
      },

      interactions: [
        {
          type: 'click',
          condition: (entity) => {
            const lifecycle = entity.getComponent('lifecycle');
            return lifecycle?.isHarvestable ?? false;
          },
          action: 'harvest',
          ui: { prompt: '点击采摘' }
        }
      ],

      ai: {
        name: agent.name || bouquetKey,
        personality: agent.personality || '',
        greeting: agent.greeting || `你好，我是${bouquetKey}`,
        harvestRule: agent.harvestRule || '',
        harvestSuccess: agent.harvestSuccess || '采摘成功！'
      },

      userData: {
        bouquetKey,
        cellCol: options.cellCol,
        cellRow: options.cellRow
      }
    };
  }
}
