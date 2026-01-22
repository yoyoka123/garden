/**
 * 花园 Agent 核心
 * 统一处理所有对话和交互
 */

import { AgentContext } from './AgentContext.js';
import { AgentPromptBuilder } from './AgentPromptBuilder.js';
import { AgentPrompts } from '../config/prompts/index.js';

/**
 * @typedef {Object} AgentConfig
 * @property {string} name - Agent 名称
 * @property {string} personality - 人格描述
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
   * @param {import('../ai/AIClient.js').AIClient} aiClient - AI 客户端
   */
  constructor(config, skillRegistry, aiClient) {
    this.config = config;
    this.skillRegistry = skillRegistry;
    this.aiClient = aiClient;
    this.context = new AgentContext();
    this.promptBuilder = new AgentPromptBuilder(config);
  }

  /**
   * 处理输入并产生回复
   * @param {AgentInput} input - 输入
   * @returns {Promise<AgentOutput>}
   */
  async process(input) {
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

    // 4. 调用 AI
    try {
      const response = await this.aiClient.chat(
        this.context.toAPIMessages(),
        systemPrompt,
        availableTools
      );

      // 5. 解析响应
      const { text, toolCalls } = this.aiClient.parseResponse(response);

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
      }

      // 7. 生成最终文本
      let responseText = text;

      // 如果有采摘成功，添加成功消息
      const harvestExecution = toolExecutions.find(e => e.toolName === 'harvest');
      if (harvestExecution && harvestExecution.result.success) {
        const customData = this.context.focusedEntity?.customData;
        if (!responseText && customData?.harvestSuccess) {
          responseText = customData.harvestSuccess;
        }
      }

      // 8. 保存助手回复
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
