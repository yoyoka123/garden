/**
 * 点击交互行为
 */

import { InteractionBehavior } from '../InteractionBehavior.js';

export class ClickBehavior extends InteractionBehavior {
  static type = 'click';

  /**
   * @param {Object} config
   * @param {Function} [config.condition] - 可点击的条件
   * @param {Function} [config.action] - 点击动作
   * @param {string} [config.actionType] - 预设动作类型
   */
  constructor(config = {}) {
    super(config);

    /** @type {Function} */
    this.condition = config.condition || (() => true);

    /** @type {Function} */
    this.action = config.action || null;

    /** @type {string} */
    this.actionType = config.actionType || 'default';
  }

  canHandle(context) {
    if (!super.canHandle(context)) return false;
    return this.condition(context.entity);
  }

  async handle(context) {
    if (this.action) {
      return await this.action(context.entity, context);
    }

    // 返回交互信息供上层处理
    return {
      type: 'click',
      actionType: this.actionType,
      entity: context.entity,
      position: context.worldPosition
    };
  }
}
