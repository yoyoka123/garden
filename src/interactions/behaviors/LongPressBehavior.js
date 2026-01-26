/**
 * 长按交互行为
 */

import { InteractionBehavior } from '../InteractionBehavior.js';

export class LongPressBehavior extends InteractionBehavior {
  static type = 'longpress';

  /**
   * @param {Object} config
   * @param {number} [config.duration] - 长按触发时间（毫秒）
   * @param {Function} [config.condition] - 可长按的条件
   * @param {Function} [config.action] - 长按动作
   * @param {Function} [config.onProgress] - 进度回调
   */
  constructor(config = {}) {
    super(config);

    /** @type {number} */
    this.duration = config.duration ?? 500;

    /** @type {Function} */
    this.condition = config.condition || (() => true);

    /** @type {Function|null} */
    this.action = config.action || null;

    /** @type {Function|null} */
    this.onProgress = config.onProgress || null;

    /** @type {number|null} */
    this.timerId = null;

    /** @type {number} */
    this.startTime = 0;

    /** @type {boolean} */
    this.triggered = false;

    /** @type {number|null} */
    this.progressInterval = null;
  }

  canHandle(context) {
    if (!super.canHandle(context)) return false;
    return this.condition(context.entity);
  }

  onStart(context) {
    this.startTime = Date.now();
    this.triggered = false;

    // 设置长按定时器
    this.timerId = setTimeout(() => {
      this.triggered = true;
      this._triggerAction(context);
    }, this.duration);

    // 设置进度回调
    if (this.onProgress) {
      this.progressInterval = setInterval(() => {
        const elapsed = Date.now() - this.startTime;
        const progress = Math.min(elapsed / this.duration, 1);
        this.onProgress(context.entity, progress, context);
      }, 50);
    }
  }

  onEnd(context) {
    this._clearTimers();

    // 如果还没触发，通知进度回调结束
    if (!this.triggered && this.onProgress) {
      this.onProgress(context.entity, 0, context);
    }
  }

  async _triggerAction(context) {
    this._clearTimers();

    if (this.action) {
      await this.action(context.entity, context);
    }
  }

  _clearTimers() {
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }

  async handle(context) {
    return {
      type: 'longpress',
      entity: context.entity,
      triggered: this.triggered,
      duration: this.duration
    };
  }
}
