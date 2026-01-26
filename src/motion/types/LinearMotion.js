/**
 * 线性移动运动
 * 从起点到终点的直线移动
 */

import { Motion } from '../Motion.js';

export class LinearMotion extends Motion {
  static type = 'linear';

  /**
   * @param {Object} config
   * @param {{x: number, y: number, z: number}} config.from - 起点
   * @param {{x: number, y: number, z: number}} config.to - 终点
   */
  constructor(config = {}) {
    super(config);

    /** @type {{x: number, y: number, z: number}} */
    this.from = config.from || { x: 0, y: 0, z: 0 };

    /** @type {{x: number, y: number, z: number}} */
    this.to = config.to || { x: 0, y: 0, z: 0 };

    /** @type {boolean} 是否使用实体当前位置作为起点 */
    this.useCurrentAsFrom = config.useCurrentAsFrom ?? true;
  }

  _onStart() {
    // 如果使用当前位置作为起点
    if (this.useCurrentAsFrom && this.entity) {
      const transform = this.entity.getComponent('transform');
      if (transform) {
        this.from = {
          x: transform.position.x,
          y: transform.position.y,
          z: transform.position.z
        };
      }
    }
    super._onStart();
  }

  _apply(progress) {
    if (!this.entity) return;

    const transform = this.entity.getComponent('transform');
    if (!transform) return;

    const x = this.from.x + (this.to.x - this.from.x) * progress;
    const y = this.from.y + (this.to.y - this.from.y) * progress;
    const z = this.from.z + (this.to.z - this.from.z) * progress;

    transform.setPosition(x, y, z);
  }
}
