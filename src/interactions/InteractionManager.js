/**
 * 交互管理器
 * 负责捕获所有花园内的交互并转发给 Agent
 */

import { InteractionEvent } from './InteractionEvent.js';
import { eventBus, Events } from '../EventBus.js';

export class InteractionManager {
  /**
   * @param {import('../entities/EntityRegistry.js').EntityRegistry} entityRegistry
   * @param {import('../agent/GardenAgent.js').GardenAgent} agent
   */
  constructor(entityRegistry, agent) {
    this.entityRegistry = entityRegistry;
    this.agent = agent;

    /** @type {Map<string, Function>} */
    this.entityResolvers = new Map();
  }

  /**
   * 注册实体解析器
   * 解析器用于从交互目标（如 THREE.Object3D）解析出实体数据
   * @param {string} entityType - 实体类型
   * @param {Function} resolver - 解析函数 (target) => entityData | null
   */
  registerResolver(entityType, resolver) {
    this.entityResolvers.set(entityType, resolver);
  }

  /**
   * 处理交互
   * @param {import('./InteractionEvent.js').InteractionType} type - 交互类型
   * @param {Object} target - 交互目标（如 THREE.Object3D）
   * @param {Object} position - 交互位置
   * @returns {Promise<import('../agent/GardenAgent.js').AgentOutput|null>}
   */
  async handleInteraction(type, target, position = {}) {
    // 尝试解析实体
    let entityData = null;
    let entityType = null;

    for (const [type, resolver] of this.entityResolvers) {
      const result = resolver(target);
      if (result) {
        entityData = result;
        entityType = type;
        break;
      }
    }

    if (!entityData) {
      return null; // 未点击到任何实体
    }

    // 获取实体描述
    const descriptor = this.entityRegistry.describe(entityType, entityData);
    if (!descriptor) {
      return null;
    }

    // 创建交互事件
    const event = new InteractionEvent(type, entityData, entityType, descriptor, position);

    // 检查交互是否有效
    if (!event.isValid()) {
      return null;
    }

    // 发出交互事件
    eventBus.emit(Events.ENTITY_INTERACTION, {
      type,
      entityType,
      entityData,
      descriptor,
      event
    });

    // 发送到 Agent
    return await this.agent.process({
      type: 'interaction',
      event
    });
  }

  /**
   * 直接从实体数据创建交互（不需要解析目标）
   * @param {import('./InteractionEvent.js').InteractionType} type - 交互类型
   * @param {string} entityType - 实体类型
   * @param {Object} entityData - 实体数据
   * @param {Object} position - 交互位置
   * @returns {Promise<import('../agent/GardenAgent.js').AgentOutput|null>}
   */
  async handleDirectInteraction(type, entityType, entityData, position = {}) {
    // 获取实体描述
    const descriptor = this.entityRegistry.describe(entityType, entityData);
    if (!descriptor) {
      return null;
    }

    // 创建交互事件
    const event = new InteractionEvent(type, entityData, entityType, descriptor, position);

    // 检查交互是否有效
    if (!event.isValid()) {
      return null;
    }

    // 发出交互事件
    eventBus.emit(Events.ENTITY_INTERACTION, {
      type,
      entityType,
      entityData,
      descriptor,
      event
    });

    // 发送到 Agent
    return await this.agent.process({
      type: 'interaction',
      event
    });
  }

  /**
   * 设置 Agent
   * @param {import('../agent/GardenAgent.js').GardenAgent} agent
   */
  setAgent(agent) {
    this.agent = agent;
  }

  /**
   * 获取当前 Agent
   * @returns {import('../agent/GardenAgent.js').GardenAgent}
   */
  getAgent() {
    return this.agent;
  }

  /**
   * 清除所有解析器
   */
  clearResolvers() {
    this.entityResolvers.clear();
  }
}
