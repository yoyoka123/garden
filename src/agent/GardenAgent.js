/**
 * 花园 Agent 核心
 * 统一处理所有对话和交互
 * 支持双后端：豆包 API 和 Claude Code
 */

import { AgentContext } from './AgentContext.js';
import { AgentPromptBuilder } from './AgentPromptBuilder.js';
import { AgentPrompts } from '../config/prompts/index.js';
import { CONFIG } from '../config.js';

/**
 * @typedef {Object} AgentConfig
 * @property {string} name - Agent 名称
 * @property {string} personality - 人格描述
 * @property {'doubao' | 'claude-code'} [backend] - AI 后端类型
 */

/**
 * @typedef {Object} AgentInput
 * @property {'text' | 'interaction'} type - 输入类型
 * @property {string} [content] - 文本内容 (type='text' 时)
 * @property {import('../interactions/InteractionEvent.js').InteractionEvent} [event] - 交互事件 (type='interaction' 时)
 */

/**
 * @typedef {Object} ToolExecution
 * @property {string} skillName - Skill 名称
 * @property {string} toolName - 工具名称
 * @property {Object} arguments - 工具参数
 * @property {Object} result - 执行结果
 */

/**
 * @typedef {Object} AgentOutput
 * @property {string} text - 回复文本
 * @property {ToolExecution[]} toolExecutions - 工具执行结果
 * @property {boolean} shouldContinue - 是否需要继续对话
 */

export class GardenAgent {
  /**
   * @param {AgentConfig} config - Agent 配置
   * @param {import('../skills/SkillRegistry.js').SkillRegistry} skillRegistry - Skill 注册中心
   * @param {import('../ai/AIClient.js').AIClient} aiClient - AI 客户端（豆包）
   * @param {import('./GardenStateProvider.js').GardenStateProvider} [stateProvider] - 状态提供者
   * @param {import('../ai/ClaudeCodeClient.js').ClaudeCodeClient} [claudeCodeClient] - Claude Code 客户端
   */
  constructor(config, skillRegistry, aiClient, stateProvider = null, claudeCodeClient = null) {
    this.config = config;
    this.skillRegistry = skillRegistry;
    this.aiClient = aiClient;
    this.claudeCodeClient = claudeCodeClient;
    this.stateProvider = stateProvider;
    this.context = new AgentContext();
    this.promptBuilder = new AgentPromptBuilder(config);

    // 后端选择：优先使用配置，默认使用豆包
    this.backend = config.backend || CONFIG.ai?.backend || 'doubao';
  }

  /**
   * 获取当前使用的 AI 客户端
   * @returns {import('../ai/AIClient.js').AIClient | import('../ai/ClaudeCodeClient.js').ClaudeCodeClient}
   */
  getActiveClient() {
    if (this.backend === 'claude-code' && this.claudeCodeClient) {
      return this.claudeCodeClient;
    }
    return this.aiClient;
  }

  /**
   * 切换后端
   * @param {'doubao' | 'claude-code'} backend
   */
  setBackend(backend) {
    this.backend = backend;
    console.log(`[GardenAgent] Switched to ${backend} backend`);
  }

  /**
   * 处理输入并产生回复
   * @param {AgentInput} input - 输入
   * @returns {Promise<AgentOutput>}
   */
  async process(input) {
    // 0. 每次对话前更新花园全局状态
    if (this.stateProvider) {
      const flowerSnapshot = this.stateProvider.getFlowersByCell();
      const fullSnapshot = this.stateProvider.getSnapshot();
      this.context.updateGardenSnapshot(flowerSnapshot);

      // 如果使用 Claude Code，同步完整状态（包括装饰物）到 Bridge Server
      if (this.backend === 'claude-code' && this.claudeCodeClient) {
        await this.claudeCodeClient.updateState({
          gold: this.context.gardenState.gold,
          gardenSnapshot: flowerSnapshot,
          decorations: fullSnapshot.decorations,
          decorationsSummary: fullSnapshot.summary.decorations,
          focusedEntity: this.context.focusedEntity,
          availableBouquets: this.stateProvider.getAvailableBouquets?.() || []
        });
      }
    }

    // 1. 更新上下文
    if (input.type === 'text') {
      this.context.addUserMessage(input.content);
    } else if (input.type === 'interaction') {
      const event = input.event;
      // 设置焦点实体
      this.context.setFocusedEntity({
        id: event.entity.id,
        type: event.entityType,
        name: event.descriptor.name,
        description: event.descriptor.description,
        state: event.entity,
        customData: event.descriptor.customData
      });
      // 添加交互消息
      this.context.addInteractionMessage(event.toAgentInput(), {
        interactionType: event.type,
        entityId: event.entity.id
      });
    }

    // 2. 获取可用工具
    const availableTools = this.skillRegistry.getAvailableTools(this.context);

    // 3. 构建系统提示
    const systemPrompt = this.promptBuilder.build(this.context, availableTools);

    // 4. 调用 AI（支持工具调用循环）
    const client = this.getActiveClient();

    try {
      // Claude Code 需要额外的上下文
      const extraContext = this.backend === 'claude-code' ? {
        focusedEntity: this.context.focusedEntity,
        gardenSnapshot: this.context.gardenSnapshot
      } : undefined;

      const response = await client.chat(
        this.context.toAPIMessages(),
        systemPrompt,
        availableTools,
        extraContext
      );

      // 5. 解析响应
      const { text, toolCalls } = client.parseResponse(response);

      // 6. 执行工具调用
      const toolExecutions = [];
      for (const call of toolCalls) {
        const result = await this.skillRegistry.executeTool(
          call.name,
          call.arguments,
          this.context
        );
        toolExecutions.push({
          skillName: result.skillName,
          toolName: call.name,
          arguments: call.arguments,
          result: result.result
        });

        // 将工具结果添加到上下文，供后续对话使用
        this.context.addToolResultMessage(call.name, result.result);
      }

      // 7. 生成最终文本
      let responseText = text;

      // 如果有工具调用但没有文本回复，再次调用 AI 生成回复
      if (toolExecutions.length > 0 && !responseText) {
        // 重新获取可用工具（工具执行后状态可能变化）
        const updatedTools = this.skillRegistry.getAvailableTools(this.context);
        const updatedPrompt = this.promptBuilder.build(this.context, updatedTools);

        // 再次调用 AI，让它根据工具结果生成回复
        const followUpResponse = await client.chat(
          this.context.toAPIMessages(),
          updatedPrompt,
          [] // 不提供工具，只需要文本回复
        );

        const { text: followUpText } = client.parseResponse(followUpResponse);
        responseText = followUpText;
      }

      // 8. 如果还是没有回复，使用工具结果的 message 作为回复
      if (!responseText && toolExecutions.length > 0) {
        const successExecution = toolExecutions.find(e => e.result?.success && e.result?.message);
        if (successExecution) {
          responseText = successExecution.result.message;
        }
      }

      // 9. 保存助手回复
      if (responseText) {
        this.context.addAssistantMessage(responseText);
      }

      return {
        text: responseText || '',
        toolExecutions,
        shouldContinue: toolExecutions.length === 0
      };

    } catch (error) {
      console.error('GardenAgent 处理失败:', error);
      const errorText = AgentPrompts.errors.agentConfused;
      this.context.addAssistantMessage(errorText);
      return {
        text: errorText,
        toolExecutions: [],
        shouldContinue: true
      };
    }
  }

  /**
   * 获取当前上下文
   * @returns {AgentContext}
   */
  getContext() {
    return this.context;
  }

  /**
   * 设置焦点实体
   * @param {import('./AgentContext.js').EntitySnapshot} entity
   */
  setFocusedEntity(entity) {
    this.context.setFocusedEntity(entity);
  }

  /**
   * 清除焦点实体
   */
  clearFocusedEntity() {
    this.context.clearFocusedEntity();
  }

  /**
   * 更新花园状态
   * @param {Object} state
   */
  updateGardenState(state) {
    this.context.updateGardenState(state);
  }

  /**
   * 重置对话
   */
  reset() {
    this.context.reset();
  }

  /**
   * 获取问候语
   * @returns {string}
   */
  getGreeting() {
    // 如果有焦点实体且有 greeting，使用它
    const customData = this.context.focusedEntity?.customData;
    if (customData?.greeting) {
      return customData.greeting;
    }
    return AgentPrompts.defaultGreeting.replace('{name}', this.config.name);
  }
}
