/**
 * 振荡运动
 * 围绕基准值做周期性振荡
 * 支持直接操作 THREE.Object3D 或通过 Entity 组件
 */

import { Motion } from '../Motion.js';

export class OscillateMotion extends Motion {
  static type = 'oscillate';

  /**
   * @param {Object} config
   * @param {'x' | 'y' | 'z' | 'rotation' | 'scale'} config.property - 振荡属性
   * @param {number} config.amplitude - 振幅
   * @param {number} config.frequency - 频率（每秒周期数）
   * @param {number} [config.phase] - 初相位
   * @param {boolean} [config.loop] - 是否循环
   */
  constructor(config = {}) {
    super(config);

    /** @type {string} */
    this.property = config.property || 'rotation';

    /** @type {number} */
    this.amplitude = config.amplitude ?? 0.1;

    /** @type {number} */
    this.frequency = config.frequency ?? 1;

    /** @type {number} */
    this.phase = config.phase ?? 0;

    /** @type {boolean} */
    this.loop = config.loop ?? true;

    /** @type {number} 基准值 */
    this.baseValue = 0;

    // 如果是循环，设置无限持续时间
    if (this.loop) {
      this.duration = Infinity;
    }
  }

  _onStart() {
    // 尝试获取直接目标
    const target = this.getTarget();

    if (target) {
      // 直接操作 Three.js 对象
      switch (this.property) {
        case 'x':
          this.baseValue = target.position?.x ?? 0;
          break;
        case 'y':
          this.baseValue = target.position?.y ?? 0;
          break;
        case 'z':
          this.baseValue = target.position?.z ?? 0;
          break;
        case 'rotation':
          this.baseValue = target.material?.rotation ?? 0;
          break;
        case 'scale':
          this.baseValue = target.scale?.x ?? 1;
          break;
      }
    } else if (this.entity) {
      // 通过 Entity 组件
      const transform = this.entity.getComponent('transform');
      if (transform) {
        switch (this.property) {
          case 'x':
            this.baseValue = transform.position.x;
            break;
          case 'y':
            this.baseValue = transform.position.y;
            break;
          case 'z':
            this.baseValue = transform.position.z;
            break;
          case 'rotation':
            this.baseValue = transform.baseRotation;
            break;
          case 'scale':
            this.baseValue = transform.baseScale;
            break;
        }
      }
    }

    super._onStart();
  }

  _apply(progress, rawProgress) {
    // 使用已过时间计算振荡
    const time = (this.elapsed - this.delay) / 1000;
    const oscillation = Math.sin(time * this.frequency * Math.PI * 2 + this.phase) * this.amplitude;
    const value = this.baseValue + oscillation;

    // 尝试直接操作目标
    const target = this.getTarget();

    if (target) {
      this._applyToTarget(target, value);
    } else if (this.entity) {
      this._applyToEntity(value);
    }
  }

  /**
   * 应用到 Three.js 对象
   * @private
   */
  _applyToTarget(target, value) {
    switch (this.property) {
      case 'x':
        if (target.position) target.position.x = value;
        break;
      case 'y':
        if (target.position) target.position.y = value;
        break;
      case 'z':
        if (target.position) target.position.z = value;
        break;
      case 'rotation':
        if (target.material) target.material.rotation = value;
        break;
      case 'scale':
        if (target.scale) target.scale.set(value, value, 1);
        break;
    }
  }

  /**
   * 应用到 Entity 组件
   * @private
   */
  _applyToEntity(value) {
    const transform = this.entity.getComponent('transform');
    const render = this.entity.getComponent('render');
    if (!transform) return;

    switch (this.property) {
      case 'x':
        transform.position.x = value;
        transform._syncToSprite();
        break;
      case 'y':
        transform.position.y = value;
        transform._syncToSprite();
        break;
      case 'z':
        transform.position.z = value;
        transform._syncToSprite();
        break;
      case 'rotation':
        if (render?.sprite) {
          render.sprite.material.rotation = value;
        }
        break;
      case 'scale':
        transform.scale = value;
        transform._syncToSprite();
        break;
    }
  }

  isComplete() {
    if (this.loop) return false;
    return super.isComplete();
  }

  /**
   * 恢复运动时重新获取当前位置作为基准值
   * 这样拖拽后运动会从新位置继续
   */
  resume() {
    // 重新获取当前位置作为新的基准值
    const target = this.getTarget();

    if (target) {
      switch (this.property) {
        case 'x':
          this.baseValue = target.position?.x ?? this.baseValue;
          break;
        case 'y':
          this.baseValue = target.position?.y ?? this.baseValue;
          break;
        case 'z':
          this.baseValue = target.position?.z ?? this.baseValue;
          break;
        case 'rotation':
          this.baseValue = target.material?.rotation ?? this.baseValue;
          break;
        case 'scale':
          this.baseValue = target.scale?.x ?? this.baseValue;
          break;
      }
    }

    super.resume();
  }
}
