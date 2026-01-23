/**
 * 事件总线
 * 用于模块间解耦通信
 */

class EventBus {
  constructor() {
    this.events = new Map();
  }

  /**
   * 订阅事件
   * @param {string} event - 事件名称
   * @param {Function} handler - 处理函数
   * @returns {Function} 取消订阅的函数
   */
  on(event, handler) {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event).add(handler);

    // 返回取消订阅函数
    return () => this.off(event, handler);
  }

  /**
   * 订阅一次性事件
   * @param {string} event - 事件名称
   * @param {Function} handler - 处理函数
   */
  once(event, handler) {
    const wrapper = (data) => {
      this.off(event, wrapper);
      handler(data);
    };
    this.on(event, wrapper);
  }

  /**
   * 取消订阅
   * @param {string} event - 事件名称
   * @param {Function} handler - 处理函数
   */
  off(event, handler) {
    const handlers = this.events.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.events.delete(event);
      }
    }
  }

  /**
   * 发布事件
   * @param {string} event - 事件名称
   * @param {any} data - 事件数据
   */
  emit(event, data) {
    const handlers = this.events.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`EventBus: Error in handler for "${event}"`, error);
        }
      });
    }
  }

  /**
   * 清除所有事件订阅
   */
  clear() {
    this.events.clear();
  }
}

// 导出单例
export const eventBus = new EventBus();

// 事件名称常量
export const Events = {
  // 花朵事件
  FLOWER_PLANTED: 'flower:planted',
  FLOWER_HARVESTED: 'flower:harvested',
  FLOWER_GROWTH_COMPLETE: 'flower:growthComplete',
  FLOWER_CLICKED: 'flower:clicked',

  // 格子事件
  CELL_SELECTED: 'cell:selected',
  CELL_CLEARED: 'cell:cleared',

  // 聊天事件
  CHAT_STARTED: 'chat:started',
  CHAT_MESSAGE: 'chat:message',
  CHAT_ENDED: 'chat:ended',
  CHAT_HARVEST_SUCCESS: 'chat:harvestSuccess',

  // 装饰物事件
  DECORATION_ADDED: 'decoration:added',
  DECORATION_REMOVED: 'decoration:removed',
  DECORATION_MOVED: 'decoration:moved',

  // 地皮事件
  GROUND_TEXTURE_CHANGED: 'ground:textureChanged',

  // 游戏状态事件
  GOLD_CHANGED: 'game:goldChanged',
  STATUS_MESSAGE: 'game:statusMessage',
  LOADING_CHANGED: 'game:loadingChanged',
  GARDEN_RESIZED: 'game:gardenResized',

  // Agent 事件
  AGENT_INPUT: 'agent:input',
  AGENT_OUTPUT: 'agent:output',
  AGENT_TOOL_EXECUTED: 'agent:toolExecuted',

  // 实体交互事件
  ENTITY_INTERACTION: 'entity:interaction'
};
