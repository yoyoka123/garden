/**
 * 交互队列
 * 管理交互请求的排队和执行，防止并发问题
 */

import { eventBus } from '../EventBus.js';

/**
 * @typedef {Object} QueuedInteraction
 * @property {string} id - 唯一标识
 * @property {string} type - 交互类型
 * @property {Object} data - 交互数据
 * @property {Function} handler - 处理函数
 * @property {Function} resolve - Promise resolve
 * @property {Function} reject - Promise reject
 * @property {number} timestamp - 加入队列时间
 */

export class InteractionQueue {
  /**
   * @param {Object} options
   * @param {number} [options.debounceTime] - 防抖时间（毫秒）
   * @param {number} [options.maxQueueSize] - 最大队列长度
   * @param {number} [options.timeout] - 单个交互超时时间
   */
  constructor(options = {}) {
    /** @type {QueuedInteraction[]} */
    this.queue = [];

    /** @type {boolean} */
    this.isProcessing = false;

    /** @type {number} */
    this.debounceTime = options.debounceTime ?? 200;

    /** @type {number} */
    this.maxQueueSize = options.maxQueueSize ?? 10;

    /** @type {number} */
    this.timeout = options.timeout ?? 30000;

    /** @type {Map<string, number>} 最后一次交互时间（按类型） */
    this.lastInteractionTime = new Map();

    /** @type {string|null} 当前正在处理的交互 ID */
    this.currentInteractionId = null;
  }

  /**
   * 添加交互到队列
   * @param {string} type - 交互类型
   * @param {Object} data - 交互数据
   * @param {Function} handler - 处理函数
   * @returns {Promise<any>}
   */
  async enqueue(type, data, handler) {
    const now = Date.now();

    // 防抖检查
    const lastTime = this.lastInteractionTime.get(type) || 0;
    if (now - lastTime < this.debounceTime) {
      console.log(`Interaction ${type} debounced`);
      return null;
    }

    // 更新最后交互时间
    this.lastInteractionTime.set(type, now);

    // 检查队列大小
    if (this.queue.length >= this.maxQueueSize) {
      console.warn('Interaction queue is full, dropping oldest');
      const dropped = this.queue.shift();
      dropped?.reject(new Error('Dropped from queue'));
    }

    // 创建交互项
    return new Promise((resolve, reject) => {
      const interaction = {
        id: `interaction_${now}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        data,
        handler,
        resolve,
        reject,
        timestamp: now
      };

      this.queue.push(interaction);

      // 如果没有正在处理的，开始处理
      if (!this.isProcessing) {
        this._processQueue();
      }
    });
  }

  /**
   * 处理队列中的交互
   */
  async _processQueue() {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const interaction = this.queue.shift();
      if (!interaction) continue;

      this.currentInteractionId = interaction.id;

      try {
        // 添加超时控制
        const result = await this._executeWithTimeout(interaction);
        interaction.resolve(result);
      } catch (error) {
        console.error(`Interaction ${interaction.type} failed:`, error);
        interaction.reject(error);
      }

      this.currentInteractionId = null;
    }

    this.isProcessing = false;
  }

  /**
   * 执行交互并添加超时控制
   * @param {QueuedInteraction} interaction
   * @returns {Promise<any>}
   */
  async _executeWithTimeout(interaction) {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Interaction ${interaction.type} timed out`));
      }, this.timeout);

      Promise.resolve(interaction.handler(interaction.data))
        .then(result => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * 清空队列
   */
  clear() {
    for (const interaction of this.queue) {
      interaction.reject(new Error('Queue cleared'));
    }
    this.queue = [];
  }

  /**
   * 取消特定类型的交互
   * @param {string} type
   */
  cancelByType(type) {
    const remaining = [];
    for (const interaction of this.queue) {
      if (interaction.type === type) {
        interaction.reject(new Error('Cancelled'));
      } else {
        remaining.push(interaction);
      }
    }
    this.queue = remaining;
  }

  /**
   * 获取队列长度
   * @returns {number}
   */
  get length() {
    return this.queue.length;
  }

  /**
   * 检查是否正在处理
   * @returns {boolean}
   */
  get busy() {
    return this.isProcessing;
  }

  /**
   * 检查队列是否为空
   * @returns {boolean}
   */
  get isEmpty() {
    return this.queue.length === 0 && !this.isProcessing;
  }
}

// 导出默认实例
export const interactionQueue = new InteractionQueue();
