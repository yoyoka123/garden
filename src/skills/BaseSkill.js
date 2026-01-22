/**
 * Skill 基类
 * 所有 Skill 继承此类
 */

/**
 * @typedef {Object} ToolDefinition
 * @property {string} type - 工具类型 ('function')
 * @property {string} name - 工具名称
 * @property {string} description - 工具描述
 * @property {Object} parameters - JSON Schema 参数定义
 */

export class BaseSkill {
  /**
   * @param {string} name - Skill 名称
   * @param {string} description - Skill 描述
   */
  constructor(name, description) {
    this.name = name;
    this.description = description;
  }

  /**
   * 获取此 Skill 提供的工具列表
   * @param {import('../agent/AgentContext.js').AgentContext} context - 当前上下文
   * @returns {ToolDefinition[]}
   */
  getTools(context) {
    throw new Error('必须实现 getTools 方法');
  }

  /**
   * 检查 Skill 是否在当前上下文可用
   * @param {import('../agent/AgentContext.js').AgentContext} context
   * @returns {boolean}
   */
  isAvailable(context) {
    return true;
  }

  /**
   * 执行工具
   * @param {string} toolName - 工具名称
   * @param {Object} args - 参数
   * @param {import('../agent/AgentContext.js').AgentContext} context - 上下文
   * @returns {Promise<Object>}
   */
  async execute(toolName, args, context) {
    throw new Error('必须实现 execute 方法');
  }

  /**
   * 检查工具是否属于此 Skill
   * @param {string} toolName - 工具名称
   * @param {import('../agent/AgentContext.js').AgentContext} context - 上下文
   * @returns {boolean}
   */
  hasToolSync(toolName, context) {
    const tools = this.getTools(context);
    return tools.some(t => t.name === toolName);
  }
}
