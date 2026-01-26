/**
 * LocalStorage 适配器
 * 处理与 localStorage 的交互
 */

const STORAGE_PREFIX = 'garden_';

export class LocalStorageAdapter {
  /**
   * @param {string} namespace - 存储命名空间
   */
  constructor(namespace = 'default') {
    this.namespace = namespace;
    this.prefix = `${STORAGE_PREFIX}${namespace}_`;
  }

  /**
   * 检查 localStorage 是否可用
   * @returns {boolean}
   */
  isAvailable() {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * 获取完整的键名
   * @param {string} key
   * @returns {string}
   */
  _getFullKey(key) {
    return `${this.prefix}${key}`;
  }

  /**
   * 保存数据
   * @param {string} key
   * @param {any} value
   * @returns {boolean} 是否成功
   */
  save(key, value) {
    if (!this.isAvailable()) {
      console.warn('localStorage is not available');
      return false;
    }

    try {
      const serialized = JSON.stringify(value);
      localStorage.setItem(this._getFullKey(key), serialized);
      return true;
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
      return false;
    }
  }

  /**
   * 加载数据
   * @param {string} key
   * @param {any} defaultValue - 默认值
   * @returns {any}
   */
  load(key, defaultValue = null) {
    if (!this.isAvailable()) {
      return defaultValue;
    }

    try {
      const serialized = localStorage.getItem(this._getFullKey(key));
      if (serialized === null) {
        return defaultValue;
      }
      return JSON.parse(serialized);
    } catch (error) {
      console.error('Failed to load from localStorage:', error);
      return defaultValue;
    }
  }

  /**
   * 删除数据
   * @param {string} key
   * @returns {boolean}
   */
  remove(key) {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      localStorage.removeItem(this._getFullKey(key));
      return true;
    } catch (error) {
      console.error('Failed to remove from localStorage:', error);
      return false;
    }
  }

  /**
   * 清除命名空间下的所有数据
   * @returns {boolean}
   */
  clear() {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.prefix)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      return true;
    } catch (error) {
      console.error('Failed to clear localStorage:', error);
      return false;
    }
  }

  /**
   * 获取所有键名
   * @returns {string[]}
   */
  getAllKeys() {
    if (!this.isAvailable()) {
      return [];
    }

    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.prefix)) {
        keys.push(key.slice(this.prefix.length));
      }
    }
    return keys;
  }

  /**
   * 检查键是否存在
   * @param {string} key
   * @returns {boolean}
   */
  has(key) {
    if (!this.isAvailable()) {
      return false;
    }
    return localStorage.getItem(this._getFullKey(key)) !== null;
  }
}
