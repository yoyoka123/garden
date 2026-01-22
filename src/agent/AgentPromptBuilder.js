/**
 * Agent 系统提示构建器
 * 根据上下文和可用工具构建系统提示
 */

import { AgentPrompts } from '../config/prompts/index.js';

export class AgentPromptBuilder {
  /**
   * @param {Object} config - Agent 配置
   * @param {string} config.name - Agent 名称
   * @param {string} config.personality - 人格描述
   */
  constructor(config) {
    this.config = config;
    this.prompts = AgentPrompts;
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
      this.buildGardenStateSection(context),
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
    const { identity } = this.prompts;
    const template = identity.template.replace('{name}', this.config.name);

    return `${identity.title}
${template}

${identity.personalityTitle}
${this.config.personality}`;
  }

  /**
   * 构建上下文部分
   * @param {import('./AgentContext.js').AgentContext} context
   * @returns {string}
   */
  buildContextSection(context) {
    const { context: ctx } = this.prompts;
    const parts = [ctx.title];

    // 花园状态
    parts.push(ctx.gardenState.gold.replace('{count}', context.gardenState.gold || 0));
    if (context.gardenState.flowerCount !== undefined) {
      parts.push(ctx.gardenState.flowerCount.replace('{count}', context.gardenState.flowerCount));
    }

    // 焦点实体
    if (context.focusedEntity) {
      parts.push(`\n${ctx.focusedEntity.title}`);
      parts.push(ctx.focusedEntity.template.name.replace('{name}', context.focusedEntity.name));
      parts.push(ctx.focusedEntity.template.type.replace('{type}', context.focusedEntity.type));
      parts.push(ctx.focusedEntity.template.description.replace('{description}', context.focusedEntity.description));

      // 自定义数据
      const customData = context.focusedEntity.customData;
      if (customData) {
        if (customData.harvestRule) {
          parts.push(`\n${ctx.harvestRule.title}`);
          parts.push(ctx.harvestRule.template.replace('{rule}', customData.harvestRule));
        }
        if (customData.personality) {
          parts.push(`\n${ctx.personality.title}`);
          parts.push(ctx.personality.template.replace('{personality}', customData.personality));
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
    const { tools: toolsPrompt } = this.prompts;

    if (!tools || tools.length === 0) {
      return `${toolsPrompt.title}\n${toolsPrompt.noTools}`;
    }

    const toolList = tools.map(t => `- ${t.name}: ${t.description}`).join('\n');
    return `${toolsPrompt.title}\n${toolList}\n\n${toolsPrompt.reminder}`;
  }

  /**
   * 构建行为准则部分
   * @returns {string}
   */
  buildBehaviorSection() {
    const { behavior } = this.prompts;
    const rules = behavior.rules.map((rule, i) => `${i + 1}. ${rule}`).join('\n');
    return `${behavior.title}\n${rules}`;
  }

  /**
   * 构建花园全局状态部分
   * @param {import('./AgentContext.js').AgentContext} context
   * @returns {string|null}
   */
  buildGardenStateSection(context) {
    if (!context.gardenSnapshot) return null;

    const { gardenState } = this.prompts;
    if (!gardenState) return null;

    const snapshot = context.gardenSnapshot;
    const parts = [gardenState.title];

    // 金币
    parts.push(`${gardenState.goldLabel}: ${snapshot.gold}`);

    // 花朵列表（按格子）
    if (snapshot.cellMap) {
      parts.push(`\n${gardenState.flowersTitle}`);
      for (const [key, flowers] of snapshot.cellMap) {
        const [col, row] = key.split(',');
        const cellLabel = `${gardenState.cellPrefix}(${col},${row})`;

        if (flowers.length === 0) {
          parts.push(`- ${cellLabel}: ${gardenState.emptyCell}`);
        } else {
          const flowerDescs = flowers.map(f => {
            if (f.isHarvestable) {
              return `${f.name}[${f.id}](${gardenState.harvestable})`;
            } else {
              return `${f.name}[${f.id}](${gardenState.growing} ${f.growthPercent}%)`;
            }
          });
          parts.push(`- ${cellLabel}: ${flowerDescs.join(', ')}`);
        }
      }
    }

    // 统计
    if (snapshot.summary) {
      const { total, harvestable, growing } = snapshot.summary;
      parts.push(`\n${gardenState.summaryTemplate
        .replace('{total}', total)
        .replace('{harvestable}', harvestable)
        .replace('{growing}', growing)}`);
    }

    return parts.join('\n');
  }
}
