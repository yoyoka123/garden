/**
 * AI 客户端抽象层
 * 封装与 AI API 的通信
 */

import { CONFIG } from '../config.js';

export class AIClient {
  constructor(config = CONFIG.ai) {
    this.url = config.url;
    this.token = config.token;
    this.model = config.model;
  }

  /**
   * 发送聊天请求
   * @param {Object[]} messages - 消息历史
   * @param {string} systemPrompt - 系统提示
   * @param {Object[]} tools - 可用工具
   * @returns {Promise<Object>} API 响应
   */
  async chat(messages, systemPrompt, tools = []) {
    try {
      const response = await fetch(this.url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.model,
          instructions: systemPrompt,
          input: messages,
          tools: tools
        })
      });

      if (!response.ok) {
        throw new Error(`API请求失败: ${response.status}`);
      }

      return await response.json();

    } catch (error) {
      console.error('AI API 调用失败:', error);
      throw error;
    }
  }

  /**
   * 解析 API 响应
   * @param {Object} data - API 响应数据
   * @returns {{text: string, toolCalls: Object[]}}
   */
  parseResponse(data) {
    let responseText = '';
    const toolCalls = [];

    if (Array.isArray(data.output)) {
      for (const item of data.output) {
        // 处理文本消息
        if (item.type === 'message') {
          const content = item.content;
          if (Array.isArray(content)) {
            for (const c of content) {
              if (c.type === 'output_text' || c.type === 'text') {
                responseText += c.text;
              }
            }
          }
        }

        // 检测工具调用
        if (item.type === 'function_call' || item.type === 'tool_use') {
          const toolName = item.name || item.function?.name;
          const args = typeof item.arguments === 'string'
            ? JSON.parse(item.arguments)
            : (item.arguments || item.function?.arguments || {});

          toolCalls.push({
            name: toolName,
            arguments: args
          });
        }
      }
    }

    return { text: responseText, toolCalls };
  }
}

// 导出单例
export const aiClient = new AIClient();
