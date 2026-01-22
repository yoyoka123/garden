/**
 * 实体注册中心
 * 管理所有实体类型的描述器
 */

export class EntityRegistry {
  constructor() {
    /** @type {Map<string, import('./EntityDescriptor.js').EntityDescriptorBase>} */
    this.descriptors = new Map();
  }

  /**
   * 注册实体描述器
   * @param {import('./EntityDescriptor.js').EntityDescriptorBase} descriptor
   */
  register(descriptor) {
    this.descriptors.set(descriptor.type, descriptor);
  }

  /**
   * 获取描述器
   * @param {string} type - 实体类型
   * @returns {import('./EntityDescriptor.js').EntityDescriptorBase|undefined}
   */
  getDescriptor(type) {
    return this.descriptors.get(type);
  }

  /**
   * 获取实体描述
   * @param {string} type - 实体类型
   * @param {Object} entityData - 实体数据
   * @returns {import('./EntityDescriptor.js').EntityDescriptor|null}
   */
  describe(type, entityData) {
    const descriptor = this.descriptors.get(type);
    if (!descriptor) return null;
    return descriptor.describe(entityData);
  }

  /**
   * 获取交互定义
   * @param {string} type - 实体类型
   * @param {Object} entityData - 实体数据
   * @param {string} interactionType - 交互类型
   * @returns {import('./EntityDescriptor.js').InteractionDefinition|null}
   */
  getInteraction(type, entityData, interactionType) {
    const descriptor = this.descriptors.get(type);
    if (!descriptor) return null;
    return descriptor.getInteraction(entityData, interactionType);
  }

  /**
   * 检查是否有指定类型的描述器
   * @param {string} type
   * @returns {boolean}
   */
  hasDescriptor(type) {
    return this.descriptors.has(type);
  }

  /**
   * 注销描述器
   * @param {string} type
   */
  unregister(type) {
    this.descriptors.delete(type);
  }

  /**
   * 获取所有已注册的类型
   * @returns {string[]}
   */
  getRegisteredTypes() {
    return Array.from(this.descriptors.keys());
  }
}
