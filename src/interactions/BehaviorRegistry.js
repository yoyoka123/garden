/**
 * 交互行为注册表
 * 管理所有可用的交互行为类型
 */

import { ClickBehavior } from './behaviors/ClickBehavior.js';
import { DragBehavior } from './behaviors/DragBehavior.js';
import { HoverBehavior } from './behaviors/HoverBehavior.js';
import { LongPressBehavior } from './behaviors/LongPressBehavior.js';

export class BehaviorRegistry {
  constructor() {
    /** @type {Map<string, typeof import('./InteractionBehavior.js').InteractionBehavior>} */
    this.behaviorClasses = new Map();

    // 注册内置行为
    this._registerBuiltins();
  }

  /**
   * 注册内置行为
   */
  _registerBuiltins() {
    this.register(ClickBehavior);
    this.register(DragBehavior);
    this.register(HoverBehavior);
    this.register(LongPressBehavior);
  }

  /**
   * 注册行为类
   * @param {typeof import('./InteractionBehavior.js').InteractionBehavior} BehaviorClass
   */
  register(BehaviorClass) {
    const type = BehaviorClass.type;
    if (this.behaviorClasses.has(type)) {
      console.warn(`Behavior type ${type} is already registered`);
      return;
    }
    this.behaviorClasses.set(type, BehaviorClass);
  }

  /**
   * 获取行为类
   * @param {string} type
   * @returns {typeof import('./InteractionBehavior.js').InteractionBehavior|null}
   */
  get(type) {
    return this.behaviorClasses.get(type) || null;
  }

  /**
   * 创建行为实例
   * @param {string} type
   * @param {Object} config
   * @returns {import('./InteractionBehavior.js').InteractionBehavior|null}
   */
  create(type, config = {}) {
    const BehaviorClass = this.behaviorClasses.get(type);
    if (!BehaviorClass) {
      console.warn(`Unknown behavior type: ${type}`);
      return null;
    }
    return new BehaviorClass(config);
  }

  /**
   * 从配置对象创建行为
   * @param {Object} config - 包含 type 和其他配置
   * @returns {import('./InteractionBehavior.js').InteractionBehavior|null}
   */
  createFromConfig(config) {
    if (!config.type) {
      console.warn('Behavior config must have a type');
      return null;
    }
    return this.create(config.type, config);
  }

  /**
   * 获取所有已注册的行为类型
   * @returns {string[]}
   */
  getTypes() {
    return Array.from(this.behaviorClasses.keys());
  }

  /**
   * 检查行为类型是否已注册
   * @param {string} type
   * @returns {boolean}
   */
  has(type) {
    return this.behaviorClasses.has(type);
  }
}

// 导出单例
export const behaviorRegistry = new BehaviorRegistry();
