/**
 * 缩放运动
 * 从起始缩放到目标缩放
 */

import { Motion } from '../Motion.js';

export class ScaleMotion extends Motion {
  static type = 'scale';

  /**
   * @param {Object} config
   * @param {number} [config.from] - 起始缩放
   * @param {number} config.to - 目标缩放
   * @param {boolean} [config.useCurrentAsFrom] - 使用当前值作为起点
   */
  constructor(config = {}) {
    super(config);

    /** @type {number} */
    this.from = config.from ?? 1;

    /** @type {number} */
    this.to = config.to ?? 1;

    /** @type {boolean} */
    this.useCurrentAsFrom = config.useCurrentAsFrom ?? true;
  }

  _onStart() {
    if (this.useCurrentAsFrom && this.entity) {
      const transform = this.entity.getComponent('transform');
      if (transform) {
        this.from = transform.scale;
      }
    }
    super._onStart();
  }

  _apply(progress) {
    if (!this.entity) return;

    const transform = this.entity.getComponent('transform');
    if (!transform) return;

    const scale = this.from + (this.to - this.from) * progress;
    transform.setScale(scale);
  }
}
