/**
 * 悬浮交互行为
 */

import { InteractionBehavior } from '../InteractionBehavior.js';

export class HoverBehavior extends InteractionBehavior {
  static type = 'hover';

  /**
   * @param {Object} config
   * @param {Function} [config.onEnter] - 鼠标进入回调
   * @param {Function} [config.onLeave] - 鼠标离开回调
   * @param {boolean} [config.showTooltip] - 是否显示 tooltip
   * @param {string} [config.tooltipContent] - tooltip 内容
   */
  constructor(config = {}) {
    super(config);

    /** @type {Function|null} */
    this.onEnter = config.onEnter || null;

    /** @type {Function|null} */
    this.onLeave = config.onLeave || null;

    /** @type {boolean} */
    this.showTooltip = config.showTooltip ?? false;

    /** @type {string|Function} */
    this.tooltipContent = config.tooltipContent || '';

    /** @type {boolean} */
    this.isHovering = false;
  }

  onStart(context) {
    if (this.isHovering) return;

    this.isHovering = true;

    // 更新实体的交互组件状态
    const interactable = context.entity?.getComponent?.('interactable');
    if (interactable) {
      interactable.setHovered(true);
    }

    if (this.onEnter) {
      this.onEnter(context.entity, context);
    }
  }

  onEnd(context) {
    if (!this.isHovering) return;

    this.isHovering = false;

    const interactable = context.entity?.getComponent?.('interactable');
    if (interactable) {
      interactable.setHovered(false);
    }

    if (this.onLeave) {
      this.onLeave(context.entity, context);
    }
  }

  async handle(context) {
    return {
      type: 'hover',
      entity: context.entity,
      isHovering: this.isHovering
    };
  }

  /**
   * 获取 tooltip 内容
   * @param {import('../../core/Entity.js').Entity} entity
   * @returns {string}
   */
  getTooltipContent(entity) {
    if (typeof this.tooltipContent === 'function') {
      return this.tooltipContent(entity);
    }
    return this.tooltipContent;
  }

  getUI(entity) {
    return {
      ...super.getUI(entity),
      showTooltip: this.showTooltip,
      tooltipContent: this.getTooltipContent(entity)
    };
  }
}
