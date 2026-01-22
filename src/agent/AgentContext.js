/**
 * Agent 上下文管理
 * 管理对话历史、焦点实体、花园状态
 */

/**
 * @typedef {Object} EntitySnapshot
 * @property {string} id - 实体 ID
 * @property {string} type - 实体类型
 * @property {string} name - 实体名称
 * @property {string} description - 当前描述
 * @property {Object} state - 当前状态
 * @property {Object} customData - 自定义数据
 */

/**
 * @typedef {Object} Message
 * @property {'user' | 'assistant' | 'system' | 'interaction'} role
 * @property {string} content
 * @property {number} timestamp
 * @property {Object} [metadata] - 附加元数据
 */

export class AgentContext {
  constructor() {
    /** @type {Message[]} */
    this.messages = [];

    /** @type {EntitySnapshot|null} */
    this.focusedEntity = null;

    /** @type {Map<string, EntitySnapshot>} */
    this.mentionedEntities = new Map();

    /** @type {Object} */
    this.gardenState = {
      gold: 0,
      flowerCount: 0
    };
  }

  /**
   * 添加用户消息
   * @param {string} content - 消息内容
   * @param {Object} [metadata] - 附加元数据
   */
  addUserMessage(content, metadata = {}) {
    this.messages.push({
      role: 'user',
      content,
      timestamp: Date.now(),
      metadata
    });
  }

  /**
   * 添加助手消息
   * @param {string} content - 消息内容
   * @param {Object} [metadata] - 附加元数据
   */
  addAssistantMessage(content, metadata = {}) {
    this.messages.push({
      role: 'assistant',
      content,
      timestamp: Date.now(),
      metadata
    });
  }

  /**
   * 添加交互消息
   * @param {string} content - 交互描述
   * @param {Object} [metadata] - 附加元数据
   */
  addInteractionMessage(content, metadata = {}) {
    this.messages.push({
      role: 'interaction',
      content,
      timestamp: Date.now(),
      metadata
    });
  }

  /**
   * 设置焦点实体
   * @param {EntitySnapshot|null} entity
   */
  setFocusedEntity(entity) {
    this.focusedEntity = entity;
    if (entity) {
      this.mentionedEntities.set(entity.id, entity);
    }
  }

  /**
   * 清除焦点实体
   */
  clearFocusedEntity() {
    this.focusedEntity = null;
  }

  /**
   * 更新花园状态
   * @param {Object} state
   */
  updateGardenState(state) {
    this.gardenState = { ...this.gardenState, ...state };
  }

  /**
   * 导出为 API 格式的消息
   * @returns {Object[]}
   */
  toAPIMessages() {
    return this.messages.map(msg => {
      // interaction 消息作为 user 消息发送给 API
      const role = msg.role === 'interaction' ? 'user' : msg.role;
      return {
        role,
        content: [{ type: 'input_text', text: msg.content }]
      };
    });
  }

  /**
   * 获取最近的消息（用于上下文窗口限制）
   * @param {number} limit - 最大消息数
   * @returns {Message[]}
   */
  getRecentMessages(limit = 20) {
    return this.messages.slice(-limit);
  }

  /**
   * 获取上下文摘要（用于系统提示）
   * @returns {string}
   */
  getSummary() {
    const parts = [];

    parts.push(`花园金币: ${this.gardenState.gold || 0}`);

    if (this.focusedEntity) {
      parts.push(`\n当前关注: ${this.focusedEntity.name} (${this.focusedEntity.type})`);
      parts.push(`描述: ${this.focusedEntity.description}`);
    }

    return parts.join('\n');
  }

  /**
   * 重置上下文
   */
  reset() {
    this.messages = [];
    this.focusedEntity = null;
    this.mentionedEntities.clear();
  }

  /**
   * 获取对话轮数
   * @returns {number}
   */
  getTurnCount() {
    return this.messages.filter(m => m.role === 'user' || m.role === 'interaction').length;
  }
}
