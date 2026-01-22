/**
 * 花朵 Agent
 * 管理与花朵的对话和采摘逻辑
 */

import { aiClient } from './AIClient.js';
import { eventBus, Events } from '../EventBus.js';

// 采摘工具定义
const HARVEST_TOOL = {
  type: 'function',
  name: 'harvest',
  description: '当用户满足采摘条件时调用此工具完成采摘',
  parameters: {
    type: 'object',
    properties: {
      reason: {
        type: 'string',
        description: '同意采摘的理由'
      }
    },
    required: ['reason']
  }
};

/**
 * 对话会话类
 */
export class FlowerConversation {
  constructor(flowerData, agentConfig) {
    this.flowerData = flowerData;
    this.agentConfig = agentConfig;
    this.messages = [];
    this.isHarvested = false;
    this.createdAt = Date.now();
  }

  /**
   * 获取问候语
   * @returns {string}
   */
  getGreeting() {
    return this.agentConfig.greeting || '你好呀！';
  }

  /**
   * 添加用户消息
   * @param {string} content - 消息内容
   */
  addUserMessage(content) {
    this.messages.push({ role: 'user', content });
  }

  /**
   * 添加助手消息
   * @param {string} content - 消息内容
   */
  addAssistantMessage(content) {
    this.messages.push({ role: 'assistant', content });
  }

  /**
   * 获取 API 格式的消息
   * @returns {Object[]}
   */
  getMessagesForAPI() {
    return this.messages.map(msg => ({
      role: msg.role,
      content: [{ type: 'input_text', text: msg.content }]
    }));
  }

  /**
   * 标记为已采摘
   */
  markHarvested() {
    this.isHarvested = true;
  }
}

/**
 * 会话管理器
 */
export class ConversationManager {
  constructor() {
    this.conversations = new Map();
  }

  /**
   * 获取花朵唯一 ID
   * @param {Object} flowerData - 花朵数据
   * @returns {string}
   */
  getFlowerId(flowerData) {
    return flowerData.id || `${flowerData.plantTime}_${flowerData.cellCol}_${flowerData.cellRow}`;
  }

  /**
   * 获取或创建会话
   * @param {Object} flowerData - 花朵数据
   * @param {Object} agentConfig - Agent 配置
   * @returns {FlowerConversation}
   */
  getOrCreateConversation(flowerData, agentConfig) {
    const flowerId = this.getFlowerId(flowerData);

    if (!this.conversations.has(flowerId)) {
      this.conversations.set(flowerId, new FlowerConversation(flowerData, agentConfig));
    }

    return this.conversations.get(flowerId);
  }

  /**
   * 结束会话
   * @param {Object} flowerData - 花朵数据
   */
  endConversation(flowerData) {
    const flowerId = this.getFlowerId(flowerData);
    this.conversations.delete(flowerId);
  }

  /**
   * 清空所有会话
   */
  clearAll() {
    this.conversations.clear();
  }
}

/**
 * 生成 Agent 系统提示
 * @param {Object} agentConfig - Agent 配置
 * @returns {string}
 */
function generateAgentSystemPrompt(agentConfig) {
  return `你是一个名叫"${agentConfig.name}"的植物精灵。

## 你的人格
${agentConfig.personality}

## 采摘规则
你正在被一个人类尝试采摘。只有当对方满足以下条件时，你才会同意被采摘：
${agentConfig.harvestRule}

## 你的行为准则
1. 用友好但略带俏皮的方式与人类对话
2. 可以给出提示，但不能直接告诉对方采摘条件
3. 当对方满足采摘条件时，必须调用 harvest 工具
4. 当不满足条件时，继续聊天但不同意采摘
5. 每次回复保持简短（不超过50字），像真正的植物精灵一样说话

## 重要
只有调用 harvest 工具才能真正完成采摘。如果对方满足条件但你没有调用 harvest 工具，采摘不会成功。`;
}

/**
 * 与花朵对话
 * @param {FlowerConversation} conversation - 对话会话
 * @param {string} userInput - 用户输入
 * @returns {Promise<{text: string, harvested: boolean, reason?: string}>}
 */
export async function chatWithFlower(conversation, userInput) {
  conversation.addUserMessage(userInput);

  const systemPrompt = generateAgentSystemPrompt(conversation.agentConfig);

  try {
    const response = await aiClient.chat(
      conversation.getMessagesForAPI(),
      systemPrompt,
      [HARVEST_TOOL]
    );

    const { text, toolCalls } = aiClient.parseResponse(response);

    // 检查是否调用了 harvest 工具
    let harvested = false;
    let harvestReason = '';

    for (const call of toolCalls) {
      if (call.name === 'harvest') {
        harvested = true;
        harvestReason = call.arguments.reason || '满足采摘条件';
        break;
      }
    }

    // 如果没有文本但有工具调用，使用成功语
    let responseText = text;
    if (!responseText && harvested) {
      responseText = conversation.agentConfig.harvestSuccess || '好的，你可以带走我了！';
    }

    if (responseText) {
      conversation.addAssistantMessage(responseText);
    }

    if (harvested) {
      conversation.markHarvested();
      eventBus.emit(Events.CHAT_HARVEST_SUCCESS, {
        conversation,
        reason: harvestReason
      });
    }

    return {
      text: responseText,
      harvested,
      reason: harvestReason
    };

  } catch (error) {
    console.error('花朵对话失败:', error);
    return {
      text: '（花朵似乎走神了...）',
      harvested: false
    };
  }
}

// 导出会话管理器单例
export const conversationManager = new ConversationManager();
