/**
 * 动画管理器
 */

import * as THREE from 'three';

export class Animator {
  constructor() {
    this.clock = new THREE.Clock();
    this.callbacks = [];
    this.isRunning = false;
    this.animationId = null;
  }

  /**
   * 添加动画回调
   * @param {Function} callback - 回调函数 (time, deltaTime) => void
   * @returns {Function} 移除回调的函数
   */
  add(callback) {
    this.callbacks.push(callback);
    return () => this.remove(callback);
  }

  /**
   * 移除动画回调
   * @param {Function} callback - 要移除的回调
   */
  remove(callback) {
    const index = this.callbacks.indexOf(callback);
    if (index > -1) {
      this.callbacks.splice(index, 1);
    }
  }

  /**
   * 开始动画循环
   */
  start() {
    if (this.isRunning) return;

    this.isRunning = true;
    this.animate();
  }

  /**
   * 停止动画循环
   */
  stop() {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  /**
   * 动画循环
   */
  animate = () => {
    if (!this.isRunning) return;

    this.animationId = requestAnimationFrame(this.animate);

    const time = this.clock.getElapsedTime();
    const deltaTime = this.clock.getDelta();

    // 执行所有回调
    for (const callback of this.callbacks) {
      try {
        callback(time, deltaTime);
      } catch (error) {
        console.error('Animation callback error:', error);
      }
    }
  };

  /**
   * 获取当前时间
   * @returns {number}
   */
  getTime() {
    return this.clock.getElapsedTime();
  }

  /**
   * 重置时钟
   */
  reset() {
    this.clock = new THREE.Clock();
  }
}

// 导出单例
export const animator = new Animator();
