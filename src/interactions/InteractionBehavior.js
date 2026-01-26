/**
 * 交互行为基类
 * 定义可插拔的交互行为接口
 */

/**
 * @typedef {Object} InteractionContext
 * @property {import('../core/Entity.js').Entity} entity - 被交互的实体
 * @property {MouseEvent|TouchEvent} rawEvent - 原始事件
 * @property {{x: number, y: number}} screenPosition - 屏幕坐标
 * @property {{x: number, y: number, z: number}} worldPosition - 世界坐标
 */

export class InteractionBehavior {
  /** @type {string} 交互类型标识 */
  static type = 'base';

  constructor(config = {}) {
    /** @type {Object} 配置 */
    this.config = config;

    /** @type {boolean} 是否启用 */
    this.enabled = true;

    /** @type {Object} UI 配置 */
    this.ui = config.ui || {};
  }

  /**
   * 获取交互类型
   * @returns {string}
   */
  getType() {
    return this.constructor.type;
  }

  /**
   * 检查是否可以处理此事件
   * @param {InteractionContext} context
   * @returns {boolean}
   */
  canHandle(context) {
    return this.enabled;
  }

  /**
   * 处理交互
   * @param {InteractionContext} context
   * @returns {Promise<any>}
   */
  async handle(context) {
    throw new Error('handle() must be implemented by subclass');
  }

  /**
   * 交互开始时调用（用于拖拽等持续性交互）
   * @param {InteractionContext} context
   */
  onStart(context) {
    // 子类可选实现
  }

  /**
   * 交互进行中调用
   * @param {InteractionContext} context
   */
  onUpdate(context) {
    // 子类可选实现
  }

  /**
   * 交互结束时调用
   * @param {InteractionContext} context
   */
  onEnd(context) {
    // 子类可选实现
  }

  /**
   * 获取 UI 提示
   * @param {import('../core/Entity.js').Entity} entity
   * @returns {Object}
   */
  getUI(entity) {
    return {
      prompt: this.ui.prompt || '',
      icon: this.ui.icon || null,
      tooltip: this.ui.tooltip || null
    };
  }

  /**
   * 设置启用状态
   * @param {boolean} enabled
   */
  setEnabled(enabled) {
    this.enabled = enabled;
  }

  /**
   * 克隆行为配置
   * @returns {InteractionBehavior}
   */
  clone() {
    return new this.constructor({ ...this.config });
  }
}
