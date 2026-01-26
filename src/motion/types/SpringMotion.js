/**
 * 弹簧运动
 * 模拟弹簧物理效果
 */

import { Motion } from '../Motion.js';

export class SpringMotion extends Motion {
  static type = 'spring';

  /**
   * @param {Object} config
   * @param {'x' | 'y' | 'z' | 'scale'} config.property - 弹簧属性
   * @param {number} config.target - 目标值
   * @param {number} [config.stiffness] - 刚度 (0-1)
   * @param {number} [config.damping] - 阻尼 (0-1)
   * @param {number} [config.mass] - 质量
   * @param {number} [config.threshold] - 停止阈值
   */
  constructor(config = {}) {
    super(config);

    /** @type {string} */
    this.property = config.property || 'y';

    /** @type {number} */
    this.target = config.target ?? 0;

    /** @type {number} */
    this.stiffness = config.stiffness ?? 0.5;

    /** @type {number} */
    this.damping = config.damping ?? 0.5;

    /** @type {number} */
    this.mass = config.mass ?? 1;

    /** @type {number} */
    this.threshold = config.threshold ?? 0.001;

    /** @type {number} 当前值 */
    this.current = 0;

    /** @type {number} 当前速度 */
    this.velocity = 0;

    // 弹簧运动持续到稳定
    this.duration = Infinity;
  }

  _onStart() {
    // 获取初始值
    if (this.entity) {
      const transform = this.entity.getComponent('transform');
      if (transform) {
        switch (this.property) {
          case 'x':
            this.current = transform.position.x;
            break;
          case 'y':
            this.current = transform.position.y;
            break;
          case 'z':
            this.current = transform.position.z;
            break;
          case 'scale':
            this.current = transform.scale;
            break;
        }
      }
    }
    super._onStart();
  }

  _apply() {
    if (!this.entity) return;

    const transform = this.entity.getComponent('transform');
    if (!transform) return;

    // 弹簧物理计算
    const k = this.stiffness * 100; // 弹簧常数
    const c = this.damping * 10;     // 阻尼系数
    const m = this.mass;

    // F = -kx - cv
    const displacement = this.current - this.target;
    const springForce = -k * displacement;
    const dampingForce = -c * this.velocity;
    const acceleration = (springForce + dampingForce) / m;

    // 更新速度和位置
    const dt = 0.016; // 约 60fps
    this.velocity += acceleration * dt;
    this.current += this.velocity * dt;

    // 应用值
    switch (this.property) {
      case 'x':
        transform.position.x = this.current;
        transform._syncToSprite();
        break;
      case 'y':
        transform.position.y = this.current;
        transform._syncToSprite();
        break;
      case 'z':
        transform.position.z = this.current;
        transform._syncToSprite();
        break;
      case 'scale':
        transform.scale = this.current;
        transform._syncToSprite();
        break;
    }

    // 检查是否稳定
    if (Math.abs(displacement) < this.threshold && Math.abs(this.velocity) < this.threshold) {
      this.current = this.target;
      this.completed = true;
    }
  }
}
