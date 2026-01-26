/**
 * 运动组合器
 * 支持串行、并行、循环等运动组合
 */

import { Motion } from './Motion.js';

/**
 * 延迟运动
 */
export class DelayMotion extends Motion {
  static type = 'delay';

  constructor(config = {}) {
    super(config);
  }

  _apply() {
    // 延迟不做任何事
  }
}

/**
 * 串行组合运动
 */
export class SequenceMotion extends Motion {
  static type = 'sequence';

  /**
   * @param {Object} config
   * @param {Motion[]} config.motions - 要串行执行的运动列表
   */
  constructor(config = {}) {
    super(config);

    /** @type {Motion[]} */
    this.motions = config.motions || [];

    /** @type {number} */
    this.currentIndex = 0;

    // 计算总时长
    this.duration = this.motions.reduce((sum, m) => sum + m.duration + m.delay, 0);
  }

  setEntity(entity) {
    super.setEntity(entity);
    for (const motion of this.motions) {
      motion.setEntity(entity);
    }
  }

  _apply(progress) {
    // 不使用进度，直接更新当前运动
  }

  update(deltaTime, time) {
    if (this.completed || this.paused) return;

    const deltaMs = deltaTime * 1000;
    this.elapsed += deltaMs;

    if (this.elapsed < this.delay) return;

    if (!this.started) {
      this.started = true;
      this._onStart();
    }

    // 更新当前运动
    const currentMotion = this.motions[this.currentIndex];
    if (currentMotion) {
      currentMotion.update(deltaTime, time);

      if (currentMotion.isComplete()) {
        this.currentIndex++;

        // 检查是否全部完成
        if (this.currentIndex >= this.motions.length) {
          this.completed = true;
          this._onComplete();
        }
      }
    } else {
      this.completed = true;
      this._onComplete();
    }
  }

  reset() {
    super.reset();
    this.currentIndex = 0;
    for (const motion of this.motions) {
      motion.reset();
    }
  }

  dispose() {
    for (const motion of this.motions) {
      motion.dispose();
    }
    this.motions = [];
    super.dispose();
  }
}

/**
 * 并行组合运动
 */
export class ParallelMotion extends Motion {
  static type = 'parallel';

  /**
   * @param {Object} config
   * @param {Motion[]} config.motions - 要并行执行的运动列表
   */
  constructor(config = {}) {
    super(config);

    /** @type {Motion[]} */
    this.motions = config.motions || [];

    // 持续时间为最长的运动
    this.duration = Math.max(...this.motions.map(m => m.duration + m.delay), 0);
  }

  setEntity(entity) {
    super.setEntity(entity);
    for (const motion of this.motions) {
      motion.setEntity(entity);
    }
  }

  _apply(progress) {
    // 不使用进度
  }

  update(deltaTime, time) {
    if (this.completed || this.paused) return;

    const deltaMs = deltaTime * 1000;
    this.elapsed += deltaMs;

    if (this.elapsed < this.delay) return;

    if (!this.started) {
      this.started = true;
      this._onStart();
    }

    // 更新所有运动
    let allComplete = true;
    for (const motion of this.motions) {
      motion.update(deltaTime, time);
      if (!motion.isComplete()) {
        allComplete = false;
      }
    }

    if (allComplete) {
      this.completed = true;
      this._onComplete();
    }
  }

  reset() {
    super.reset();
    for (const motion of this.motions) {
      motion.reset();
    }
  }

  dispose() {
    for (const motion of this.motions) {
      motion.dispose();
    }
    this.motions = [];
    super.dispose();
  }
}

/**
 * 循环运动
 */
export class LoopMotion extends Motion {
  static type = 'loop';

  /**
   * @param {Object} config
   * @param {Motion} config.motion - 要循环的运动
   * @param {number} [config.times] - 循环次数（-1 为无限）
   */
  constructor(config = {}) {
    super(config);

    /** @type {Motion} */
    this.motion = config.motion;

    /** @type {number} */
    this.times = config.times ?? -1;

    /** @type {number} */
    this.currentLoop = 0;

    if (this.times === -1) {
      this.duration = Infinity;
    } else {
      this.duration = this.motion.duration * this.times;
    }
  }

  setEntity(entity) {
    super.setEntity(entity);
    if (this.motion) {
      this.motion.setEntity(entity);
    }
  }

  _apply(progress) {
    // 不使用进度
  }

  update(deltaTime, time) {
    if (this.completed || this.paused || !this.motion) return;

    const deltaMs = deltaTime * 1000;
    this.elapsed += deltaMs;

    if (this.elapsed < this.delay) return;

    if (!this.started) {
      this.started = true;
      this._onStart();
    }

    this.motion.update(deltaTime, time);

    if (this.motion.isComplete()) {
      this.currentLoop++;

      if (this.times !== -1 && this.currentLoop >= this.times) {
        this.completed = true;
        this._onComplete();
      } else {
        // 重置运动进行下一轮
        this.motion.reset();
      }
    }
  }

  isComplete() {
    if (this.times === -1) return false;
    return super.isComplete();
  }

  reset() {
    super.reset();
    this.currentLoop = 0;
    if (this.motion) {
      this.motion.reset();
    }
  }

  dispose() {
    if (this.motion) {
      this.motion.dispose();
      this.motion = null;
    }
    super.dispose();
  }
}

/**
 * 运动组合工具
 */
export const MotionComposer = {
  /**
   * 创建串行运动
   * @param {...Motion} motions
   * @returns {SequenceMotion}
   */
  sequence(...motions) {
    return new SequenceMotion({ motions });
  },

  /**
   * 创建并行运动
   * @param {...Motion} motions
   * @returns {ParallelMotion}
   */
  parallel(...motions) {
    return new ParallelMotion({ motions });
  },

  /**
   * 创建循环运动
   * @param {Motion} motion
   * @param {number} times - 循环次数，-1 为无限
   * @returns {LoopMotion}
   */
  loop(motion, times = -1) {
    return new LoopMotion({ motion, times });
  },

  /**
   * 创建延迟
   * @param {number} duration - 延迟时间（毫秒）
   * @returns {DelayMotion}
   */
  delay(duration) {
    return new DelayMotion({ duration });
  }
};
