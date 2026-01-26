/**
 * 实体基类
 * 实体是游戏对象的容器，通过组合组件来定义功能
 */

import { eventBus, Events } from '../EventBus.js';

export class Entity {
  /**
   * @param {string} id - 唯一标识
   * @param {string} type - 实体类型（如 'flower', 'decoration'）
   */
  constructor(id, type = 'entity') {
    /** @type {string} */
    this.id = id || `entity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    /** @type {string} */
    this.type = type;

    /** @type {Map<string, import('./Component.js').Component>} */
    this.components = new Map();

    /** @type {boolean} */
    this.active = true;

    /** @type {Object} 自定义数据 */
    this.userData = {};
  }

  /**
   * 添加组件
   * @param {import('./Component.js').Component} component
   * @returns {this}
   */
  addComponent(component) {
    const type = component.getType();

    if (this.components.has(type)) {
      console.warn(`Entity ${this.id} already has component of type ${type}`);
      return this;
    }

    this.components.set(type, component);
    component.onAttach(this);

    return this;
  }

  /**
   * 移除组件
   * @param {string} type - 组件类型
   * @returns {import('./Component.js').Component|null}
   */
  removeComponent(type) {
    const component = this.components.get(type);
    if (component) {
      component.onDetach();
      component.dispose();
      this.components.delete(type);
    }
    return component || null;
  }

  /**
   * 获取组件
   * @template T
   * @param {string} type - 组件类型
   * @returns {T|null}
   */
  getComponent(type) {
    return this.components.get(type) || null;
  }

  /**
   * 检查是否有某类型组件
   * @param {string} type
   * @returns {boolean}
   */
  hasComponent(type) {
    return this.components.has(type);
  }

  /**
   * 获取所有组件
   * @returns {import('./Component.js').Component[]}
   */
  getAllComponents() {
    return Array.from(this.components.values());
  }

  /**
   * 更新所有组件
   * @param {number} deltaTime
   * @param {number} time
   */
  update(deltaTime, time) {
    if (!this.active) return;

    for (const component of this.components.values()) {
      if (component.enabled) {
        component.update(deltaTime, time);
      }
    }
  }

  /**
   * 序列化实体（用于持久化）
   * @returns {Object}
   */
  serialize() {
    const components = {};
    for (const [type, component] of this.components) {
      components[type] = component.serialize();
    }

    return {
      id: this.id,
      type: this.type,
      active: this.active,
      userData: this.userData,
      components
    };
  }

  /**
   * 销毁实体
   */
  dispose() {
    for (const component of this.components.values()) {
      component.onDetach();
      component.dispose();
    }
    this.components.clear();
    this.active = false;
  }
}
