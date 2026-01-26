/**
 * 环绕运动
 * 围绕中心点做圆周运动
 * 支持直接操作 THREE.Object3D 或通过 Entity 组件
 */

import { Motion } from '../Motion.js';

export class OrbitMotion extends Motion {
  static type = 'orbit';

  /**
   * @param {Object} config
   * @param {{x: number, y: number, z: number}} config.center - 中心点（相对于起始位置）
   * @param {number} config.radius - 半径
   * @param {'xy' | 'xz' | 'yz'} [config.plane] - 运动平面
   * @param {boolean} [config.clockwise] - 是否顺时针
   * @param {number} [config.startAngle] - 起始角度（弧度）
   * @param {boolean} [config.loop] - 是否循环
   */
  constructor(config = {}) {
    super(config);

    /** @type {{x: number, y: number, z: number}} */
    this.center = config.center || { x: 0, y: 0, z: 0 };

    /** @type {number} */
    this.radius = config.radius ?? 1;

    /** @type {string} */
    this.plane = config.plane || 'xz';

    /** @type {boolean} */
    this.clockwise = config.clockwise ?? false;

    /** @type {number} */
    this.startAngle = config.startAngle ?? 0;

    /** @type {boolean} */
    this.loop = config.loop ?? true;

    /** @type {number} 每个周期的弧度 */
    this.radiansPerCycle = Math.PI * 2;

    /** @type {{x: number, y: number, z: number}} 起始位置 */
    this.startPosition = { x: 0, y: 0, z: 0 };

    if (this.loop) {
      this.duration = Infinity;
    }
  }

  _onStart() {
    // 记录起始位置
    const target = this.getTarget();

    if (target && target.position) {
      this.startPosition = {
        x: target.position.x,
        y: target.position.y,
        z: target.position.z
      };
    } else if (this.entity) {
      const transform = this.entity.getComponent('transform');
      if (transform) {
        this.startPosition = { ...transform.position };
      }
    }

    super._onStart();
  }

  _apply(progress) {
    // 计算当前角度
    let angle = this.startAngle + progress * this.radiansPerCycle;
    if (this.loop) {
      const time = (this.elapsed - this.delay) / this.duration * 1000;
      angle = this.startAngle + time * 0.001 * Math.PI * 2;
    }

    if (this.clockwise) {
      angle = -angle;
    }

    // 计算相对于中心的位置
    const centerX = this.startPosition.x + this.center.x;
    const centerY = this.startPosition.y + this.center.y;
    const centerZ = this.startPosition.z + this.center.z;

    let x = centerX;
    let y = centerY;
    let z = centerZ;

    switch (this.plane) {
      case 'xy':
        x = centerX + Math.cos(angle) * this.radius;
        y = centerY + Math.sin(angle) * this.radius;
        break;
      case 'xz':
        x = centerX + Math.cos(angle) * this.radius;
        z = centerZ + Math.sin(angle) * this.radius;
        break;
      case 'yz':
        y = centerY + Math.cos(angle) * this.radius;
        z = centerZ + Math.sin(angle) * this.radius;
        break;
    }

    // 应用位置（只修改运动平面涉及的轴，保留其他轴不变）
    const target = this.getTarget();

    if (target && target.position) {
      switch (this.plane) {
        case 'xy':
          target.position.x = x;
          target.position.y = y;
          break;
        case 'xz':
          target.position.x = x;
          target.position.z = z;
          break;
        case 'yz':
          target.position.y = y;
          target.position.z = z;
          break;
      }
    } else if (this.entity) {
      const transform = this.entity.getComponent('transform');
      if (transform) {
        transform.setPosition(x, y, z);
      }
    }
  }

  isComplete() {
    if (this.loop) return false;
    return super.isComplete();
  }

  /**
   * 恢复运动时重新获取当前位置作为起始位置
   * 这样拖拽后运动会从新位置继续
   */
  resume() {
    const target = this.getTarget();

    if (target && target.position) {
      this.startPosition = {
        x: target.position.x,
        y: target.position.y,
        z: target.position.z
      };
    } else if (this.entity) {
      const transform = this.entity.getComponent('transform');
      if (transform) {
        this.startPosition = { ...transform.position };
      }
    }

    super.resume();
  }
}
