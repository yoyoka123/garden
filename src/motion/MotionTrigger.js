/**
 * 运动触发器
 * 在特定条件满足时触发运动
 */

import { eventBus, Events } from '../EventBus.js';
import { motionController } from './MotionController.js';

/**
 * @typedef {'always' | 'onInteraction' | 'onProximity' | 'onEvent' | 'onTime' | 'onCondition'} TriggerType
 */

/**
 * @typedef {Object} TriggerConfig
 * @property {TriggerType} type - 触发类型
 * @property {import('./Motion.js').Motion|Function} motion - 运动或运动工厂
 * @property {string} [event] - 事件名（onEvent 类型）
 * @property {number} [interval] - 时间间隔（onTime 类型）
 * @property {Function} [condition] - 条件函数（onCondition 类型）
 * @property {number} [distance] - 距离阈值（onProximity 类型）
 * @property {string} [interactionType] - 交互类型（onInteraction 类型）
 * @property {boolean} [once] - 是否只触发一次
 */

export class MotionTrigger {
  /**
   * @param {TriggerConfig} config
   */
  constructor(config) {
    /** @type {TriggerType} */
    this.type = config.type || 'always';

    /** @type {import('./Motion.js').Motion|Function} */
    this.motion = config.motion;

    /** @type {boolean} */
    this.once = config.once ?? false;

    /** @type {boolean} */
    this.triggered = false;

    /** @type {boolean} */
    this.enabled = true;

    /** @type {import('../core/Entity.js').Entity|null} */
    this.entity = null;

    /** @type {string|null} */
    this.motionId = config.motionId || null;

    // 类型特定配置
    this.eventName = config.event;
    this.interval = config.interval;
    this.condition = config.condition;
    this.distance = config.distance ?? 2;
    this.interactionType = config.interactionType || 'click';

    // 内部状态
    this._lastTriggerTime = 0;
    this._unsubscribe = null;
    this._intervalId = null;
  }

  /**
   * 绑定到实体
   * @param {import('../core/Entity.js').Entity} entity
   */
  bind(entity) {
    this.entity = entity;
    this._setup();
  }

  /**
   * 设置触发器
   */
  _setup() {
    switch (this.type) {
      case 'always':
        this._trigger();
        break;

      case 'onEvent':
        if (this.eventName) {
          this._unsubscribe = eventBus.on(this.eventName, (data) => {
            if (this._shouldTrigger()) {
              this._trigger(data);
            }
          });
        }
        break;

      case 'onTime':
        if (this.interval) {
          this._intervalId = setInterval(() => {
            if (this._shouldTrigger()) {
              this._trigger();
            }
          }, this.interval);
        }
        break;

      case 'onInteraction':
        this._unsubscribe = eventBus.on(Events.ENTITY_INTERACTION, (data) => {
          if (data.entity?.id === this.entity?.id &&
              data.type === this.interactionType &&
              this._shouldTrigger()) {
            this._trigger(data);
          }
        });
        break;

      case 'onCondition':
        // 条件触发需要在 update 中检查
        break;
    }
  }

  /**
   * 检查是否应该触发
   * @returns {boolean}
   */
  _shouldTrigger() {
    if (!this.enabled) return false;
    if (this.once && this.triggered) return false;
    return true;
  }

  /**
   * 触发运动
   * @param {any} data - 触发数据
   */
  _trigger(data = null) {
    if (!this.entity) return;

    this.triggered = true;
    this._lastTriggerTime = Date.now();

    // 创建或克隆运动
    let motion;
    if (typeof this.motion === 'function') {
      motion = this.motion(this.entity, data);
    } else {
      motion = this.motion.clone();
    }

    // 生成运动 ID
    const motionId = this.motionId || `trigger_${this.type}_${Date.now()}`;

    // 添加到运动控制器
    motionController.add(this.entity, motionId, motion);
  }

  /**
   * 更新触发器（用于条件触发）
   * @param {number} deltaTime
   * @param {number} time
   */
  update(deltaTime, time) {
    if (this.type === 'onCondition' && this.condition) {
      if (this._shouldTrigger() && this.condition(this.entity, time)) {
        this._trigger();
      }
    }
  }

  /**
   * 手动触发
   */
  fire() {
    if (this._shouldTrigger()) {
      this._trigger();
    }
  }

  /**
   * 重置触发状态
   */
  reset() {
    this.triggered = false;
  }

  /**
   * 销毁触发器
   */
  dispose() {
    if (this._unsubscribe) {
      this._unsubscribe();
      this._unsubscribe = null;
    }

    if (this._intervalId) {
      clearInterval(this._intervalId);
      this._intervalId = null;
    }

    this.entity = null;
    this.motion = null;
  }
}

/**
 * 触发器工厂
 */
export const Triggers = {
  /**
   * 始终触发（立即开始）
   */
  always(motion, config = {}) {
    return new MotionTrigger({ ...config, type: 'always', motion });
  },

  /**
   * 交互时触发
   */
  onInteraction(interactionType, motion, config = {}) {
    return new MotionTrigger({ ...config, type: 'onInteraction', interactionType, motion });
  },

  /**
   * 事件触发
   */
  onEvent(eventName, motion, config = {}) {
    return new MotionTrigger({ ...config, type: 'onEvent', event: eventName, motion });
  },

  /**
   * 定时触发
   */
  onTime(interval, motion, config = {}) {
    return new MotionTrigger({ ...config, type: 'onTime', interval, motion });
  },

  /**
   * 条件触发
   */
  onCondition(condition, motion, config = {}) {
    return new MotionTrigger({ ...config, type: 'onCondition', condition, motion });
  }
};
