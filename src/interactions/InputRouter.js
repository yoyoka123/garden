/**
 * 输入路由器
 * 统一处理文本输入和交互输入，转发给 Agent
 */

import { eventBus, Events } from '../EventBus.js';

export class InputRouter {
  /**
   * @param {import('../agent/GardenAgent.js').GardenAgent} agent
   * @param {import('./InteractionManager.js').InteractionManager} interactionManager
   */
  constructor(agent, interactionManager) {
    this.agent = agent;
    this.interactionManager = interactionManager;

    /** @type {Function[]} */
    this.outputListeners = [];
  }

  /**
   * 处理文本输入（来自聊天框）
   * @param {string} text
   * @returns {Promise<import('../agent/GardenAgent.js').AgentOutput>}
   */
  async handleTextInput(text) {
    // 发出输入事件
    eventBus.emit(Events.AGENT_INPUT, {
      type: 'text',
      content: text
    });

    const output = await this.agent.process({
      type: 'text',
      content: text
    });

    // 发出输出事件
    eventBus.emit(Events.AGENT_OUTPUT, output);

    // 通知监听器
    this.notifyListeners(output);

    return output;
  }

  /**
   * 处理交互输入（来自花园）
   * @param {import('./InteractionEvent.js').InteractionType} type
   * @param {Object} target
   * @param {Object} position
   * @returns {Promise<import('../agent/GardenAgent.js').AgentOutput|null>}
   */
  async handleInteraction(type, target, position) {
    const output = await this.interactionManager.handleInteraction(type, target, position);

    if (output) {
      // 发出输出事件
      eventBus.emit(Events.AGENT_OUTPUT, output);

      // 通知监听器
      this.notifyListeners(output);
    }

    return output;
  }

  /**
   * 直接处理交互（不需要解析目标）
   * @param {import('./InteractionEvent.js').InteractionType} type
   * @param {string} entityType
   * @param {Object} entityData
   * @param {Object} position
   * @returns {Promise<{output: import('../agent/GardenAgent.js').AgentOutput, descriptor: Object}|null>}
   */
  async handleDirectInteraction(type, entityType, entityData, position) {
    // 先获取描述器，供 ChatUI 使用
    const descriptor = this.interactionManager.entityRegistry.describe(entityType, entityData);
    if (!descriptor) {
      return null;
    }

    const output = await this.interactionManager.handleDirectInteraction(
      type, entityType, entityData, position
    );

    if (output) {
      eventBus.emit(Events.AGENT_OUTPUT, output);
      this.notifyListeners(output);
    }

    return { output, descriptor };
  }

  /**
   * 添加输出监听器
   * @param {Function} listener - (output: AgentOutput) => void
   * @returns {Function} 取消监听的函数
   */
  onOutput(listener) {
    this.outputListeners.push(listener);
    return () => {
      const index = this.outputListeners.indexOf(listener);
      if (index > -1) {
        this.outputListeners.splice(index, 1);
      }
    };
  }

  /**
   * 通知所有监听器
   * @param {import('../agent/GardenAgent.js').AgentOutput} output
   */
  notifyListeners(output) {
    for (const listener of this.outputListeners) {
      try {
        listener(output);
      } catch (error) {
        console.error('InputRouter: 监听器执行错误', error);
      }
    }
  }

  /**
   * 设置 Agent
   * @param {import('../agent/GardenAgent.js').GardenAgent} agent
   */
  setAgent(agent) {
    this.agent = agent;
    this.interactionManager.setAgent(agent);
  }

  /**
   * 获取 Agent
   * @returns {import('../agent/GardenAgent.js').GardenAgent}
   */
  getAgent() {
    return this.agent;
  }

  /**
   * 获取 Agent 的问候语
   * @returns {string}
   */
  getGreeting() {
    return this.agent.getGreeting();
  }

  /**
   * 重置 Agent 对话
   */
  reset() {
    this.agent.reset();
  }
}
