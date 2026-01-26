/**
 * Claude Code Bridge Client
 * 通过本地 Bridge Server 调用 Claude Code
 */

import { CONFIG } from '../config.js';

export class ClaudeCodeClient {
  constructor(config = {}) {
    this.baseUrl = config.baseUrl || CONFIG.claudeCode?.bridgeUrl || 'http://localhost:8002';
  }

  /**
   * 发送聊天请求到 Bridge Server
   * @param {Object[]} messages - 消息历史
   * @param {string} systemPrompt - 系统提示（Bridge Server 会使用 SKILL.md）
   * @param {Object[]} tools - 可用工具（供参考，实际工具由 SKILL.md 定义）
   * @param {Object} context - 花园上下文
   * @returns {Promise<Object>} 响应
   */
  async chat(messages, systemPrompt, tools = [], context = {}) {
    // 提取最新用户消息
    const lastUserMessage = this._extractLastUserMessage(messages);

    // 检测是否是交互事件
    const interaction = this._detectInteraction(messages);

    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: lastUserMessage,
          context: context,
          interaction: interaction,
          history: messages.slice(-10)
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Bridge server error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      // 转换为与 AIClient 兼容的格式
      return {
        output: this._convertToOutputFormat(data)
      };

    } catch (error) {
      console.error('[ClaudeCodeClient] Chat error:', error);

      // 连接失败时返回错误消息
      if (error.message.includes('fetch')) {
        return {
          output: [{
            type: 'message',
            content: [{ type: 'text', text: '（无法连接到 Claude Code Bridge Server，请确保已启动 bridge-server）' }]
          }]
        };
      }

      throw error;
    }
  }

  /**
   * 更新花园状态到 Bridge Server
   * @param {Object} state - 花园状态
   */
  async updateState(state) {
    try {
      await fetch(`${this.baseUrl}/api/state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state)
      });
    } catch (error) {
      console.warn('[ClaudeCodeClient] Failed to update state:', error.message);
    }
  }

  /**
   * 重置对话历史
   */
  async reset() {
    try {
      await fetch(`${this.baseUrl}/api/reset`, {
        method: 'POST'
      });
    } catch (error) {
      console.warn('[ClaudeCodeClient] Failed to reset:', error.message);
    }
  }

  /**
   * 检查 Bridge Server 是否可用
   */
  async isAvailable() {
    try {
      const response = await fetch(`${this.baseUrl}/api/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000)
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * 解析响应（与 AIClient 兼容）
   */
  parseResponse(data) {
    let responseText = '';
    const toolCalls = [];

    if (Array.isArray(data.output)) {
      for (const item of data.output) {
        if (item.type === 'message') {
          const content = item.content;
          if (Array.isArray(content)) {
            for (const c of content) {
              if (c.type === 'text' || c.type === 'output_text') {
                responseText += c.text;
              }
            }
          }
        }

        if (item.type === 'tool_use' || item.type === 'function_call') {
          toolCalls.push({
            id: item.id,
            name: item.name,
            arguments: item.arguments || item.input || {}
          });
        }
      }
    }

    // 从文本中提取 ```action``` 块（备用，主要由 bridge server 处理）
    const { cleanText, actionCalls } = this._extractActionBlocks(responseText);
    responseText = cleanText;
    toolCalls.push(...actionCalls);

    return { text: responseText, toolCalls };
  }

  /**
   * 从文本中提取 ```action``` 代码块
   */
  _extractActionBlocks(text) {
    const actionCalls = [];
    const pattern = /```action\s*([\s\S]*?)```/g;

    const cleanText = text.replace(pattern, (match, jsonStr) => {
      try {
        const action = JSON.parse(jsonStr.trim());
        if (action.action) {
          const toolName = action.action;
          const args = { ...action };
          delete args.action;
          actionCalls.push({
            id: `action_${Date.now()}`,
            name: toolName,
            arguments: args
          });
        }
      } catch (e) {
        console.warn('[ClaudeCodeClient] 解析 action 块失败:', e.message);
      }
      return '';
    }).trim();

    return { cleanText, actionCalls };
  }

  /**
   * 提取最新用户消息
   */
  _extractLastUserMessage(messages) {
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.role === 'user') {
        const content = msg.content;
        if (typeof content === 'string') {
          return content;
        }
        if (Array.isArray(content)) {
          const textPart = content.find(c => c.type === 'text' || c.type === 'input_text');
          if (textPart) {
            return textPart.text;
          }
        }
      }
    }
    return '';
  }

  /**
   * 检测交互事件
   */
  _detectInteraction(messages) {
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.role === 'interaction' || msg.type === 'interaction') {
        return {
          type: msg.interactionType || 'click',
          entityName: msg.entityName || msg.entity?.name,
          descriptor: msg.descriptor
        };
      }
    }
    return null;
  }

  /**
   * 转换为 AIClient 输出格式
   */
  _convertToOutputFormat(data) {
    const output = [];

    // 添加文本消息
    if (data.text) {
      output.push({
        type: 'message',
        content: [{ type: 'text', text: data.text }]
      });
    }

    // 添加工具调用
    if (data.toolCalls && data.toolCalls.length > 0) {
      for (const call of data.toolCalls) {
        output.push({
          type: 'tool_use',
          id: call.id || `tool_${Date.now()}`,
          name: call.name,
          arguments: call.arguments
        });
      }
    }

    return output;
  }
}

// 导出单例
export const claudeCodeClient = new ClaudeCodeClient();
