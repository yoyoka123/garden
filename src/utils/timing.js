/**
 * 时间控制工具函数
 * 包含防抖、节流等功能
 */

/**
 * 防抖函数
 * 在指定时间内多次调用只执行最后一次
 * @param {Function} fn - 要执行的函数
 * @param {number} delay - 延迟时间（毫秒）
 * @returns {Function}
 */
export function debounce(fn, delay) {
  let timeoutId = null;

  const debounced = function (...args) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      fn.apply(this, args);
      timeoutId = null;
    }, delay);
  };

  debounced.cancel = function () {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return debounced;
}

/**
 * 节流函数
 * 在指定时间内只执行一次
 * @param {Function} fn - 要执行的函数
 * @param {number} limit - 时间限制（毫秒）
 * @returns {Function}
 */
export function throttle(fn, limit) {
  let lastCall = 0;
  let timeoutId = null;

  const throttled = function (...args) {
    const now = Date.now();

    if (now - lastCall >= limit) {
      lastCall = now;
      fn.apply(this, args);
    } else {
      // 确保最后一次调用能执行
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        lastCall = Date.now();
        fn.apply(this, args);
        timeoutId = null;
      }, limit - (now - lastCall));
    }
  };

  throttled.cancel = function () {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return throttled;
}

/**
 * 创建一个一次性锁
 * 在异步操作完成前阻止重复调用
 * @param {Function} fn - 要执行的异步函数
 * @returns {Function}
 */
export function createLock(fn) {
  let isLocked = false;

  return async function (...args) {
    if (isLocked) {
      console.log('Operation in progress, skipping...');
      return null;
    }

    isLocked = true;
    try {
      return await fn.apply(this, args);
    } finally {
      isLocked = false;
    }
  };
}

/**
 * 带超时的 Promise
 * @param {Promise} promise
 * @param {number} timeout - 超时时间（毫秒）
 * @param {string} message - 超时错误消息
 * @returns {Promise}
 */
export function withTimeout(promise, timeout, message = 'Operation timed out') {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(message)), timeout)
    )
  ]);
}
