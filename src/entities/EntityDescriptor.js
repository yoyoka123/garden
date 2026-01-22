/**
 * 实体描述器基类
 * 定义实体的名称、描述和交互方式
 */

/**
 * @typedef {Object} InteractionDefinition
 * @property {string} [condition] - 触发条件描述
 * @property {string} action - 动作名称
 * @property {string} description - 交互描述（给 Agent 看的）
 * @property {string} [userPrompt] - 用户提示（给用户看的）
 */

/**
 * @typedef {Object} EntityDescriptor
 * @property {string} type - 实体类型
 * @property {string} name - 实体名称
 * @property {string} description - 实体描述
 * @property {Object.<string, InteractionDefinition|null>} interactions - 交互定义
 * @property {Object} [customData] - 自定义数据
 */

export class EntityDescriptorBase {
  /**
   * @param {string} type - 实体类型
   */
  constructor(type) {
    this.type = type;
  }

  /**
   * 为具体实体生成描述
   * @param {Object} entityData - 实体数据
   * @returns {EntityDescriptor}
   */
  describe(entityData) {
    throw new Error('必须实现 describe 方法');
  }

  /**
   * 获取交互定义
   * @param {Object} entityData - 实体数据
   * @param {string} interactionType - 交互类型 (click/dblclick/drag/contextmenu)
   * @returns {InteractionDefinition|null}
   */
  getInteraction(entityData, interactionType) {
    const descriptor = this.describe(entityData);
    return descriptor.interactions[interactionType] || null;
  }
}
