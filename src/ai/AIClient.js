/**
 * AI 客户端抽象层
 * 封装与 AI API 的通信 (OpenAI 兼容格式)
 */

import { CONFIG } from '../config.js';

export class AIClient {
  constructor(config = CONFIG.ai) {
    this.url = config.url;
    this.token = config.token;
    this.model = config.model;
  }

  /**
   * 发送聊天请求 (兼容 main.js 调用)
   * @param {Array<{role: string, content: string}>} messages - 完整消息历史
   * @returns {Promise<{output: string}>}
   */
  async sendMessage(messages) {
    const response = await this.chat(messages);
    const parsed = this.parseResponse(response);
    return { output: parsed.text };
  }

  /**
   * 发送聊天请求 (底层实现)
   * @param {Object[]} messages - 消息历史
   * @param {string} [systemPrompt] - 可选的系统提示 (如果 messages 中未包含)
   * @param {Object[]} [tools] - 可用工具
   * @returns {Promise<Object>} API 响应
   */
  async chat(messages, systemPrompt = null, tools = []) {
    // 构造请求消息列表
    let requestMessages = [...messages];
    
    // 如果提供了 systemPrompt 且 messages 中没有 system 消息，则添加
    if (systemPrompt && !requestMessages.some(m => m.role === 'system')) {
      requestMessages.unshift({ role: 'system', content: systemPrompt });
    }

    try {
      const body = {
        model: this.model,
        messages: requestMessages,
        stream: false
      };

      // 只有当有工具时才添加 tools 字段
      if (tools && tools.length > 0) {
        body.tools = tools;
      }

      const response = await fetch(this.url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API请求失败 (${response.status}): ${errorText}`);
      }

      return await response.json();

    } catch (error) {
      console.error('AI API 调用失败:', error);
      throw error;
    }
  }

  /**
   * 解析 API 响应 (OpenAI 格式)
   * @param {Object} data - API 响应数据
   * @returns {{text: string, toolCalls: Object[]}}
   */
  parseResponse(data) {
    let responseText = '';
    const toolCalls = [];

    const choice = data.choices?.[0];
    if (choice && choice.message) {
      const message = choice.message;
      
      // 提取文本内容
      if (message.content) {
        responseText = message.content;
      }

      // 提取工具调用
      if (message.tool_calls) {
        message.tool_calls.forEach(call => {
          if (call.function) {
            try {
              toolCalls.push({
                name: call.function.name,
                arguments: JSON.parse(call.function.arguments),
                id: call.id
              });
            } catch (e) {
              console.warn('工具参数解析失败:', e);
            }
          }
        });
      }
    }

    return { text: responseText, toolCalls };
  }
}

// 导出单例
export const aiClient = new AIClient();
