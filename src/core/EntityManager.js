/**
 * 实体管理器
 * 管理所有实体的生命周期、更新和查询
 */

import { eventBus, Events } from '../EventBus.js';

export class EntityManager {
  constructor() {
    /** @type {Map<string, import('./Entity.js').Entity>} */
    this.entities = new Map();

    /** @type {Map<string, Set<string>>} 按类型索引的实体ID */
    this.entitiesByType = new Map();
  }

  /**
   * 添加实体
   * @param {import('./Entity.js').Entity} entity
   * @returns {import('./Entity.js').Entity}
   */
  add(entity) {
    if (this.entities.has(entity.id)) {
      console.warn(`Entity with id ${entity.id} already exists`);
      return entity;
    }

    this.entities.set(entity.id, entity);

    // 按类型索引
    if (!this.entitiesByType.has(entity.type)) {
      this.entitiesByType.set(entity.type, new Set());
    }
    this.entitiesByType.get(entity.type).add(entity.id);

    eventBus.emit(Events.ENTITY_ADDED, { entity });

    return entity;
  }

  /**
   * 移除实体
   * @param {string} id
   * @returns {import('./Entity.js').Entity|null}
   */
  remove(id) {
    const entity = this.entities.get(id);
    if (!entity) return null;

    // 从类型索引移除
    const typeSet = this.entitiesByType.get(entity.type);
    if (typeSet) {
      typeSet.delete(id);
    }

    // 销毁实体
    entity.dispose();
    this.entities.delete(id);

    eventBus.emit(Events.ENTITY_REMOVED, { entity });

    return entity;
  }

  /**
   * 获取实体
   * @param {string} id
   * @returns {import('./Entity.js').Entity|null}
   */
  get(id) {
    return this.entities.get(id) || null;
  }

  /**
   * 获取所有实体
   * @returns {import('./Entity.js').Entity[]}
   */
  getAll() {
    return Array.from(this.entities.values());
  }

  /**
   * 按类型获取实体
   * @param {string} type
   * @returns {import('./Entity.js').Entity[]}
   */
  getByType(type) {
    const ids = this.entitiesByType.get(type);
    if (!ids) return [];

    return Array.from(ids)
      .map(id => this.entities.get(id))
      .filter(Boolean);
  }

  /**
   * 查询具有特定组件的实体
   * @param {...string} componentTypes - 组件类型列表
   * @returns {import('./Entity.js').Entity[]}
   */
  getWithComponents(...componentTypes) {
    return this.getAll().filter(entity =>
      componentTypes.every(type => entity.hasComponent(type))
    );
  }

  /**
   * 更新所有实体
   * @param {number} deltaTime
   * @param {number} time
   */
  update(deltaTime, time) {
    for (const entity of this.entities.values()) {
      entity.update(deltaTime, time);
    }
  }

  /**
   * 序列化所有实体
   * @returns {Object[]}
   */
  serialize() {
    return this.getAll().map(entity => entity.serialize());
  }

  /**
   * 获取实体数量
   * @returns {number}
   */
  count() {
    return this.entities.size;
  }

  /**
   * 清空所有实体
   */
  clear() {
    for (const entity of this.entities.values()) {
      entity.dispose();
    }
    this.entities.clear();
    this.entitiesByType.clear();
  }
}
