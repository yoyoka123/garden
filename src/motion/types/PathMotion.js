/**
 * 路径运动
 * 沿指定路径点移动
 */

import { Motion } from '../Motion.js';

export class PathMotion extends Motion {
  static type = 'path';

  /**
   * @param {Object} config
   * @param {{x: number, y: number, z: number}[]} config.points - 路径点
   * @param {boolean} [config.closed] - 是否闭合路径
   * @param {boolean} [config.loop] - 是否循环
   */
  constructor(config = {}) {
    super(config);

    /** @type {{x: number, y: number, z: number}[]} */
    this.points = config.points || [];

    /** @type {boolean} */
    this.closed = config.closed ?? false;

    /** @type {boolean} */
    this.loop = config.loop ?? false;

    /** @type {number[]} 每段的累积长度比例 */
    this.segmentLengths = [];

    /** @type {number} */
    this.totalLength = 0;

    if (this.loop) {
      this.duration = Infinity;
    }

    this._calculateLengths();
  }

  /**
   * 计算路径段长度
   */
  _calculateLengths() {
    if (this.points.length < 2) return;

    const points = this.closed
      ? [...this.points, this.points[0]]
      : this.points;

    let accumulated = 0;
    this.segmentLengths = [0];

    for (let i = 1; i < points.length; i++) {
      const dx = points[i].x - points[i - 1].x;
      const dy = points[i].y - points[i - 1].y;
      const dz = points[i].z - points[i - 1].z;
      accumulated += Math.sqrt(dx * dx + dy * dy + dz * dz);
      this.segmentLengths.push(accumulated);
    }

    this.totalLength = accumulated;

    // 归一化
    if (this.totalLength > 0) {
      this.segmentLengths = this.segmentLengths.map(l => l / this.totalLength);
    }
  }

  _apply(progress, rawProgress) {
    if (!this.entity || this.points.length < 2) return;

    const transform = this.entity.getComponent('transform');
    if (!transform) return;

    // 处理循环
    let t = progress;
    if (this.loop && progress >= 1) {
      t = (this.elapsed / this.duration) % 1;
    }

    // 找到当前段
    const points = this.closed
      ? [...this.points, this.points[0]]
      : this.points;

    let segmentIndex = 0;
    for (let i = 1; i < this.segmentLengths.length; i++) {
      if (t <= this.segmentLengths[i]) {
        segmentIndex = i - 1;
        break;
      }
      segmentIndex = i - 1;
    }

    // 计算段内进度
    const segmentStart = this.segmentLengths[segmentIndex];
    const segmentEnd = this.segmentLengths[segmentIndex + 1] || 1;
    const segmentProgress = segmentEnd > segmentStart
      ? (t - segmentStart) / (segmentEnd - segmentStart)
      : 0;

    // 插值
    const p1 = points[segmentIndex];
    const p2 = points[segmentIndex + 1] || points[segmentIndex];

    const x = p1.x + (p2.x - p1.x) * segmentProgress;
    const y = p1.y + (p2.y - p1.y) * segmentProgress;
    const z = p1.z + (p2.z - p1.z) * segmentProgress;

    transform.setPosition(x, y, z);
  }

  isComplete() {
    if (this.loop) return false;
    return super.isComplete();
  }
}
