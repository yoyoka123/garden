/**
 * 交互事件类
 * 封装用户与实体的交互
 */

/**
 * @typedef {'click' | 'dblclick' | 'drag' | 'contextmenu'} InteractionType
 */

export class InteractionEvent {
  /**
   * @param {InteractionType} type - 交互类型
   * @param {Object} entity - 实体数据
   * @param {string} entityType - 实体类型
   * @param {import('../entities/EntityDescriptor.js').EntityDescriptor} descriptor - 实体描述
   * @param {Object} position - 交互位置 {x, y, z}
   */
  constructor(type, entity, entityType, descriptor, position = {}) {
    this.type = type;
    this.entity = entity;
    this.entityType = entityType;
    this.descriptor = descriptor;
    this.position = position;
    this.timestamp = Date.now();
  }

  /**
   * 转换为 Agent 输入格式
   * @returns {string}
   */
  toAgentInput() {
    const interaction = this.descriptor.interactions[this.type];
    const typeLabel = this.getTypeLabel();

    if (!interaction) {
      return `用户${typeLabel}了${this.descriptor.name}。`;
    }

    const parts = [
      `用户${typeLabel}了${this.descriptor.name}。`,
      `实体描述：${this.descriptor.description}`
    ];

    if (interaction.action) {
      parts.push(`交互动作：${interaction.action}`);
    }
    if (interaction.condition) {
      parts.push(`触发条件：${interaction.condition}`);
    }
    if (interaction.description) {
      parts.push(`交互说明：${interaction.description}`);
    }

    return parts.join('\n');
  }

  /**
   * 获取交互类型的中文描述
   * @returns {string}
   */
  getTypeLabel() {
    const labels = {
      click: '点击',
      dblclick: '双击',
      drag: '拖拽',
      contextmenu: '右键点击'
    };
    return labels[this.type] || this.type;
  }

  /**
   * 获取用户提示（显示给用户看的）
   * @returns {string}
   */
  getUserPrompt() {
    const interaction = this.descriptor.interactions[this.type];
    return interaction?.userPrompt || `${this.getTypeLabel()}了 ${this.descriptor.name}`;
  }

  /**
   * 检查交互是否有效
   * @returns {boolean}
   */
  isValid() {
    const interaction = this.descriptor.interactions[this.type];
    return interaction !== null && interaction !== undefined;
  }
}
