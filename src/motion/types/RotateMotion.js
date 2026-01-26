/**
 * 旋转运动
 * 从起始角度旋转到目标角度
 */

import { Motion } from '../Motion.js';

export class RotateMotion extends Motion {
  static type = 'rotate';

  /**
   * @param {Object} config
   * @param {number} [config.from] - 起始角度（弧度）
   * @param {number} config.to - 目标角度（弧度）
   * @param {boolean} [config.useCurrentAsFrom] - 使用当前值作为起点
   * @param {boolean} [config.loop] - 是否循环
   * @param {number} [config.speed] - 循环时的旋转速度（弧度/秒）
   */
  constructor(config = {}) {
    super(config);

    /** @type {number} */
    this.from = config.from ?? 0;

    /** @type {number} */
    this.to = config.to ?? Math.PI * 2;

    /** @type {boolean} */
    this.useCurrentAsFrom = config.useCurrentAsFrom ?? true;

    /** @type {boolean} */
    this.loop = config.loop ?? false;

    /** @type {number} */
    this.speed = config.speed ?? Math.PI; // 默认每秒半圈

    if (this.loop) {
      this.duration = Infinity;
    }
  }

  _onStart() {
    if (this.useCurrentAsFrom && this.entity) {
      const transform = this.entity.getComponent('transform');
      if (transform) {
        this.from = transform.rotation;
      }
    }
    super._onStart();
  }

  _apply(progress) {
    if (!this.entity) return;

    const transform = this.entity.getComponent('transform');
    const render = this.entity.getComponent('render');
    if (!transform) return;

    let angle;
    if (this.loop) {
      const time = (this.elapsed - this.delay) / 1000;
      angle = this.from + time * this.speed;
    } else {
      angle = this.from + (this.to - this.from) * progress;
    }

    transform.rotation = angle;
    if (render?.sprite) {
      render.sprite.material.rotation = angle;
    }
  }

  isComplete() {
    if (this.loop) return false;
    return super.isComplete();
  }
}
