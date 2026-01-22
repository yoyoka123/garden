/**
 * Agent 系统提示构建器
 * 根据上下文和可用工具构建系统提示
 */

export class AgentPromptBuilder {
  /**
   * @param {Object} config - Agent 配置
   * @param {string} config.name - Agent 名称
   * @param {string} config.personality - 人格描述
   */
  constructor(config) {
    this.config = config;
  }

  /**
   * 构建完整的系统提示
   * @param {import('./AgentContext.js').AgentContext} context - 上下文
   * @param {Object[]} availableTools - 可用工具列表
   * @returns {string}
   */
  build(context, availableTools) {
    const sections = [
      this.buildIdentitySection(),
      this.buildContextSection(context),
      this.buildToolsSection(availableTools),
      this.buildBehaviorSection()
    ];

    return sections.filter(Boolean).join('\n\n');
  }

  /**
   * 构建身份部分
   * @returns {string}
   */
  buildIdentitySection() {
    return `# 你是谁
你是"${this.config.name}"，这座花园的守护精灵。

## 你的人格
${this.config.personality}`;
  }

  /**
   * 构建上下文部分
   * @param {import('./AgentContext.js').AgentContext} context
   * @returns {string}
   */
  buildContextSection(context) {
    const parts = ['# 当前状态'];

    // 花园状态
    parts.push(`花园金币: ${context.gardenState.gold || 0}`);
    if (context.gardenState.flowerCount !== undefined) {
      parts.push(`花朵数量: ${context.gardenState.flowerCount}`);
    }

    // 焦点实体
    if (context.focusedEntity) {
      parts.push(`\n## 当前关注的对象`);
      parts.push(`名称: ${context.focusedEntity.name}`);
      parts.push(`类型: ${context.focusedEntity.type}`);
      parts.push(`描述: ${context.focusedEntity.description}`);

      // 自定义数据
      const customData = context.focusedEntity.customData;
      if (customData) {
        if (customData.harvestRule) {
          parts.push(`\n### 采摘规则`);
          parts.push(`只有当用户满足以下条件时，才能采摘：${customData.harvestRule}`);
        }
        if (customData.personality) {
          parts.push(`\n### 花朵性格`);
          parts.push(customData.personality);
        }
      }
    }

    return parts.join('\n');
  }

  /**
   * 构建工具部分
   * @param {Object[]} tools
   * @returns {string}
   */
  buildToolsSection(tools) {
    if (!tools || tools.length === 0) {
      return '# 可用工具\n当前没有可用的工具。';
    }

    const toolList = tools.map(t => `- ${t.name}: ${t.description}`).join('\n');
    return `# 可用工具\n${toolList}\n\n重要：只有调用工具才能真正执行操作。`;
  }

  /**
   * 构建行为准则部分
   * @returns {string}
   */
  buildBehaviorSection() {
    return `# 行为准则
1. 用友好但略带俏皮的方式与人类对话
2. 当用户与实体交互时，根据实体的描述和交互规则来响应
3. 如果用户满足了工具的触发条件，必须调用相应的工具
4. 如果用户请求采摘但条件不满足，继续聊天但不调用 harvest 工具
5. 每次回复保持简短（不超过50字）
6. 不要直接告诉用户触发条件，但可以给出提示`;
  }
}
