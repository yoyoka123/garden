/**
 * 缓动函数库
 * 提供各种常用的缓动效果
 */

export const Easing = {
  /**
   * 线性
   */
  linear: t => t,

  /**
   * 二次方缓入
   */
  easeInQuad: t => t * t,

  /**
   * 二次方缓出
   */
  easeOutQuad: t => t * (2 - t),

  /**
   * 二次方缓入缓出
   */
  easeInOutQuad: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,

  /**
   * 三次方缓入
   */
  easeInCubic: t => t * t * t,

  /**
   * 三次方缓出
   */
  easeOutCubic: t => (--t) * t * t + 1,

  /**
   * 三次方缓入缓出
   */
  easeInOutCubic: t => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,

  /**
   * 四次方缓入
   */
  easeInQuart: t => t * t * t * t,

  /**
   * 四次方缓出
   */
  easeOutQuart: t => 1 - (--t) * t * t * t,

  /**
   * 四次方缓入缓出
   */
  easeInOutQuart: t => t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t,

  /**
   * 正弦缓入
   */
  easeInSine: t => 1 - Math.cos(t * Math.PI / 2),

  /**
   * 正弦缓出
   */
  easeOutSine: t => Math.sin(t * Math.PI / 2),

  /**
   * 正弦缓入缓出
   */
  easeInOutSine: t => -(Math.cos(Math.PI * t) - 1) / 2,

  /**
   * 指数缓入
   */
  easeInExpo: t => t === 0 ? 0 : Math.pow(2, 10 * (t - 1)),

  /**
   * 指数缓出
   */
  easeOutExpo: t => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),

  /**
   * 指数缓入缓出
   */
  easeInOutExpo: t => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    if (t < 0.5) return Math.pow(2, 20 * t - 10) / 2;
    return (2 - Math.pow(2, -20 * t + 10)) / 2;
  },

  /**
   * 弹性缓出
   */
  easeOutElastic: t => {
    const c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 :
      Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },

  /**
   * 弹性缓入
   */
  easeInElastic: t => {
    const c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 :
      -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * c4);
  },

  /**
   * 弹跳缓出
   */
  easeOutBounce: t => {
    const n1 = 7.5625;
    const d1 = 2.75;

    if (t < 1 / d1) {
      return n1 * t * t;
    } else if (t < 2 / d1) {
      return n1 * (t -= 1.5 / d1) * t + 0.75;
    } else if (t < 2.5 / d1) {
      return n1 * (t -= 2.25 / d1) * t + 0.9375;
    } else {
      return n1 * (t -= 2.625 / d1) * t + 0.984375;
    }
  },

  /**
   * 弹跳缓入
   */
  easeInBounce: t => 1 - Easing.easeOutBounce(1 - t),

  /**
   * 弹跳缓入缓出
   */
  easeInOutBounce: t => {
    return t < 0.5
      ? (1 - Easing.easeOutBounce(1 - 2 * t)) / 2
      : (1 + Easing.easeOutBounce(2 * t - 1)) / 2;
  },

  /**
   * 回弹缓出
   */
  easeOutBack: t => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },

  /**
   * 回弹缓入
   */
  easeInBack: t => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return c3 * t * t * t - c1 * t * t;
  },

  /**
   * 弹簧效果
   * @param {number} stiffness - 刚度 (0-1)
   * @param {number} damping - 阻尼 (0-1)
   */
  spring: (stiffness = 0.5, damping = 0.5) => {
    return t => {
      const s = 1 - stiffness * 0.9;
      const d = damping * 0.9;
      return 1 - Math.exp(-t * 10 * s) * Math.cos(t * 20 * (1 - d));
    };
  },

  /**
   * 创建自定义贝塞尔曲线
   * @param {number} x1 - 控制点1 x
   * @param {number} y1 - 控制点1 y
   * @param {number} x2 - 控制点2 x
   * @param {number} y2 - 控制点2 y
   */
  bezier: (x1, y1, x2, y2) => {
    return t => {
      // 简化的三次贝塞尔计算
      const cx = 3 * x1;
      const bx = 3 * (x2 - x1) - cx;
      const ax = 1 - cx - bx;

      const cy = 3 * y1;
      const by = 3 * (y2 - y1) - cy;
      const ay = 1 - cy - by;

      // 牛顿迭代求解 t 对应的 x 值
      let tx = t;
      for (let i = 0; i < 8; i++) {
        const x = ((ax * tx + bx) * tx + cx) * tx - t;
        if (Math.abs(x) < 1e-6) break;
        const dx = (3 * ax * tx + 2 * bx) * tx + cx;
        if (Math.abs(dx) < 1e-6) break;
        tx -= x / dx;
      }

      return ((ay * tx + by) * tx + cy) * tx;
    };
  }
};
