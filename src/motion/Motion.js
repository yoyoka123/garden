/**
 * 运动基类
 * 定义运动的基本接口和行为
 */

import { Easing } from './Easing.js';

/**
 * @typedef {Object} MotionConfig
 * @property {number} [duration] - 持续时间（毫秒）
 * @property {Function|string} [easing] - 缓动函数
 * @property {number} [delay] - 延迟开始时间（毫秒）
 * @property {Function} [onStart] - 开始回调
 * @property {Function} [onUpdate] - 更新回调
 * @property {Function} [onComplete] - 完成回调
 */

export class Motion {
  /** @type {string} 运动类型标识 */
  static type = 'base';

  /**
   * @param {MotionConfig} config
   */
  constructor(config = {}) {
    /** @type {number} 持续时间（毫秒） */
    this.duration = config.duration ?? 1000;

    /** @type {Function} 缓动函数 */
    this.easing = this._resolveEasing(config.easing);

    /** @type {number} 延迟时间（毫秒） */
    this.delay = config.delay ?? 0;

    /** @type {Function|null} */
    this.onStart = config.onStart || null;

    /** @type {Function|null} */
    this.onUpdate = config.onUpdate || null;

    /** @type {Function|null} */
    this.onComplete = config.onComplete || null;

    /** @type {import('../core/Entity.js').Entity|null} */
    this.entity = null;

    /** @type {number} 已经过的时间（毫秒） */
    this.elapsed = 0;

    /** @type {boolean} 是否已开始 */
    this.started = false;

    /** @type {boolean} 是否已完成 */
    this.completed = false;

    /** @type {boolean} 是否暂停 */
    this.paused = false;
  }

  /**
   * 获取运动类型
   * @returns {string}
   */
  getType() {
    return this.constructor.type;
  }

  /**
   * 解析缓动函数
   * @param {Function|string} easing
   * @returns {Function}
   */
  _resolveEasing(easing) {
    if (typeof easing === 'function') {
      return easing;
    }
    if (typeof easing === 'string' && Easing[easing]) {
      return Easing[easing];
    }
    return Easing.linear;
  }

  /**
   * 设置实体
   * @param {import('../core/Entity.js').Entity} entity
   */
  setEntity(entity) {
    this.entity = entity;
  }

  /**
   * 设置直接操作的目标对象（如 THREE.Object3D）
   * 当设置了 target 时，运动将直接操作该对象而非通过 Entity
   * @param {Object} target - 目标对象（通常是 THREE.Object3D）
   */
  setTarget(target) {
    this.target = target;
  }

  /**
   * 获取运动目标
   * 优先返回直接目标，否则返回 Entity 的 sprite
   * @returns {Object|null}
   */
  getTarget() {
    if (this.target) return this.target;
    if (this.entity?.userData?.sprite) return this.entity.userData.sprite;
    return null;
  }

  /**
   * 更新运动
   * @param {number} deltaTime - 增量时间（秒）
   * @param {number} time - 总时间（秒）
   */
  update(deltaTime, time) {
    if (this.completed || this.paused) return;

    const deltaMs = deltaTime * 1000;
    this.elapsed += deltaMs;

    // 检查延迟
    if (this.elapsed < this.delay) {
      return;
    }

    // 首次进入运动
    if (!this.started) {
      this.started = true;
      this._onStart();
    }

    // 计算进度
    const activeTime = this.elapsed - this.delay;
    const rawProgress = Math.min(activeTime / this.duration, 1);
    const easedProgress = this.easing(rawProgress);

    // 应用运动
    this._apply(easedProgress, rawProgress);

    // 回调
    if (this.onUpdate) {
      this.onUpdate(this.entity, easedProgress, rawProgress);
    }

    // 检查完成
    if (rawProgress >= 1) {
      this.completed = true;
      this._onComplete();
    }
  }

  /**
   * 运动开始时调用
   */
  _onStart() {
    if (this.onStart) {
      this.onStart(this.entity);
    }
  }

  /**
   * 应用运动效果（子类实现）
   * @param {number} progress - 缓动后的进度 (0-1)
   * @param {number} rawProgress - 原始进度 (0-1)
   */
  _apply(progress, rawProgress) {
    throw new Error('_apply() must be implemented by subclass');
  }

  /**
   * 运动完成时调用
   */
  _onComplete() {
    if (this.onComplete) {
      this.onComplete(this.entity);
    }
  }

  /**
   * 检查是否完成
   * @returns {boolean}
   */
  isComplete() {
    return this.completed;
  }

  /**
   * 暂停运动
   */
  pause() {
    this.paused = true;
  }

  /**
   * 恢复运动
   */
  resume() {
    this.paused = false;
  }

  /**
   * 重置运动
   */
  reset() {
    this.elapsed = 0;
    this.started = false;
    this.completed = false;
    this.paused = false;
  }

  /**
   * 跳到结束
   */
  complete() {
    if (!this.started) {
      this._onStart();
    }
    this._apply(1, 1);
    this.completed = true;
    this._onComplete();
  }

  /**
   * 销毁运动
   */
  dispose() {
    this.entity = null;
    this.onStart = null;
    this.onUpdate = null;
    this.onComplete = null;
  }

  /**
   * 克隆运动
   * @returns {Motion}
   */
  clone() {
    return new this.constructor({
      duration: this.duration,
      easing: this.easing,
      delay: this.delay,
      onStart: this.onStart,
      onUpdate: this.onUpdate,
      onComplete: this.onComplete
    });
  }
}
