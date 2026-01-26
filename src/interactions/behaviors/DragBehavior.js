/**
 * 拖拽交互行为
 */

import { InteractionBehavior } from '../InteractionBehavior.js';

export class DragBehavior extends InteractionBehavior {
  static type = 'drag';

  /**
   * @param {Object} config
   * @param {Function} [config.condition] - 可拖拽的条件
   * @param {Function} [config.onDragStart] - 拖拽开始回调
   * @param {Function} [config.onDrag] - 拖拽中回调
   * @param {Function} [config.onDragEnd] - 拖拽结束回调
   * @param {boolean} [config.lockY] - 是否锁定 Y 轴
   */
  constructor(config = {}) {
    super(config);

    /** @type {Function} */
    this.condition = config.condition || (() => true);

    /** @type {Function|null} */
    this.onDragStart = config.onDragStart || null;

    /** @type {Function|null} */
    this.onDrag = config.onDrag || null;

    /** @type {Function|null} */
    this.onDragEnd = config.onDragEnd || null;

    /** @type {boolean} */
    this.lockY = config.lockY ?? true;

    /** @type {boolean} */
    this.isDragging = false;

    /** @type {{x: number, y: number, z: number}|null} */
    this.startPosition = null;
  }

  canHandle(context) {
    if (!super.canHandle(context)) return false;
    return this.condition(context.entity);
  }

  onStart(context) {
    this.isDragging = true;
    this.startPosition = { ...context.worldPosition };

    if (this.onDragStart) {
      this.onDragStart(context.entity, context);
    }
  }

  onUpdate(context) {
    if (!this.isDragging) return;

    const newPosition = { ...context.worldPosition };

    if (this.lockY && this.startPosition) {
      newPosition.y = this.startPosition.y;
    }

    // 更新实体位置
    const transform = context.entity?.getComponent?.('transform');
    if (transform) {
      transform.setPosition(newPosition.x, newPosition.y, newPosition.z);
    }

    if (this.onDrag) {
      this.onDrag(context.entity, newPosition, context);
    }
  }

  onEnd(context) {
    if (!this.isDragging) return;

    this.isDragging = false;

    if (this.onDragEnd) {
      this.onDragEnd(context.entity, context);
    }

    this.startPosition = null;
  }

  async handle(context) {
    // 对于拖拽，handle 通常不使用，而是使用 onStart/onUpdate/onEnd
    return {
      type: 'drag',
      entity: context.entity,
      isDragging: this.isDragging
    };
  }
}
