/**
 * Prompts 配置统一导出
 *
 * 所有 Agent、Skill、Entity 的 prompt 和消息配置
 * 修改这些文件可以自定义 AI 行为和界面文本
 */

export { AgentPrompts } from './agent-prompts.js';
export { SkillDefinitions } from './skill-definitions.js';
export { EntityInteractions } from './entity-interactions.js';
export { UIMessages } from './ui-messages.js';

// 便捷导入
import { AgentPrompts } from './agent-prompts.js';
import { SkillDefinitions } from './skill-definitions.js';
import { EntityInteractions } from './entity-interactions.js';
import { UIMessages } from './ui-messages.js';

export default {
  AgentPrompts,
  SkillDefinitions,
  EntityInteractions,
  UIMessages
};
