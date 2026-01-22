/**
 * Skill 注册中心
 * 管理所有 Skill 的注册、获取和执行
 */

export class SkillRegistry {
  constructor() {
    /** @type {Map<string, import('./BaseSkill.js').BaseSkill>} */
    this.skills = new Map();
  }

  /**
   * 注册 Skill
   * @param {import('./BaseSkill.js').BaseSkill} skill
   */
  register(skill) {
    this.skills.set(skill.name, skill);
  }

  /**
   * 获取 Skill
   * @param {string} name - Skill 名称
   * @returns {import('./BaseSkill.js').BaseSkill|undefined}
   */
  getSkill(name) {
    return this.skills.get(name);
  }

  /**
   * 获取所有已注册的 Skills
   * @returns {import('./BaseSkill.js').BaseSkill[]}
   */
  getAllSkills() {
    return Array.from(this.skills.values());
  }

  /**
   * 获取所有可用工具（根据上下文过滤）
   * @param {import('../agent/AgentContext.js').AgentContext} context
   * @returns {import('./BaseSkill.js').ToolDefinition[]}
   */
  getAvailableTools(context) {
    const tools = [];

    for (const skill of this.skills.values()) {
      if (skill.isAvailable(context)) {
        const skillTools = skill.getTools(context);
        tools.push(...skillTools);
      }
    }

    return tools;
  }

  /**
   * 执行工具调用
   * @param {string} toolName - 工具名称
   * @param {Object} args - 参数
   * @param {import('../agent/AgentContext.js').AgentContext} context - 上下文
   * @returns {Promise<{skillName: string, result: Object}>}
   */
  async executeTool(toolName, args, context) {
    // 查找拥有此工具的 Skill
    for (const skill of this.skills.values()) {
      if (skill.isAvailable(context) && skill.hasToolSync(toolName, context)) {
        const result = await skill.execute(toolName, args, context);
        return {
          skillName: skill.name,
          result
        };
      }
    }

    // 未找到工具
    return {
      skillName: 'unknown',
      result: {
        success: false,
        message: `未找到工具: ${toolName}`
      }
    };
  }

  /**
   * 注销 Skill
   * @param {string} name - Skill 名称
   */
  unregister(name) {
    this.skills.delete(name);
  }

  /**
   * 清空所有 Skills
   */
  clear() {
    this.skills.clear();
  }
}
