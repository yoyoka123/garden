/**
 * 运动注册表
 * 管理所有可用的运动类型
 */

import { LinearMotion } from './types/LinearMotion.js';
import { OscillateMotion } from './types/OscillateMotion.js';
import { PathMotion } from './types/PathMotion.js';
import { OrbitMotion } from './types/OrbitMotion.js';
import { SpringMotion } from './types/SpringMotion.js';
import { ScaleMotion } from './types/ScaleMotion.js';
import { RotateMotion } from './types/RotateMotion.js';
import { SequenceMotion, ParallelMotion, LoopMotion, DelayMotion } from './MotionComposer.js';

export class MotionRegistry {
  constructor() {
    /** @type {Map<string, typeof import('./Motion.js').Motion>} */
    this.motionClasses = new Map();

    // 注册内置运动类型
    this._registerBuiltins();
  }

  /**
   * 注册内置运动类型
   */
  _registerBuiltins() {
    this.register(LinearMotion);
    this.register(OscillateMotion);
    this.register(PathMotion);
    this.register(OrbitMotion);
    this.register(SpringMotion);
    this.register(ScaleMotion);
    this.register(RotateMotion);
    this.register(SequenceMotion);
    this.register(ParallelMotion);
    this.register(LoopMotion);
    this.register(DelayMotion);
  }

  /**
   * 注册运动类
   * @param {typeof import('./Motion.js').Motion} MotionClass
   */
  register(MotionClass) {
    const type = MotionClass.type;
    if (this.motionClasses.has(type)) {
      console.warn(`Motion type ${type} is already registered`);
      return;
    }
    this.motionClasses.set(type, MotionClass);
  }

  /**
   * 获取运动类
   * @param {string} type
   * @returns {typeof import('./Motion.js').Motion|null}
   */
  get(type) {
    return this.motionClasses.get(type) || null;
  }

  /**
   * 创建运动实例
   * @param {string} type
   * @param {Object} config
   * @returns {import('./Motion.js').Motion|null}
   */
  create(type, config = {}) {
    const MotionClass = this.motionClasses.get(type);
    if (!MotionClass) {
      console.warn(`Unknown motion type: ${type}`);
      return null;
    }
    return new MotionClass(config);
  }

  /**
   * 从配置对象创建运动
   * @param {Object} config - 包含 type 和其他配置
   * @returns {import('./Motion.js').Motion|null}
   */
  createFromConfig(config) {
    if (!config.type) {
      console.warn('Motion config must have a type');
      return null;
    }
    return this.create(config.type, config);
  }

  /**
   * 获取所有已注册的运动类型
   * @returns {string[]}
   */
  getTypes() {
    return Array.from(this.motionClasses.keys());
  }

  /**
   * 检查运动类型是否已注册
   * @param {string} type
   * @returns {boolean}
   */
  has(type) {
    return this.motionClasses.has(type);
  }
}

// 导出单例
export const motionRegistry = new MotionRegistry();
