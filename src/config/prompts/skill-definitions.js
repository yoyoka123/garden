/**
 * Skill 定义配置
 * 包含所有 Skill 的工具定义和消息
 */

export const SkillDefinitions = {
  // Harvest Skill 配置
  harvest: {
    // Skill 元信息
    meta: {
      name: 'harvest',
      description: '管理花朵采摘相关操作'
    },

    // 工具定义
    tool: {
      type: 'function',
      name: 'harvest',
      description: '当用户满足采摘条件时调用此工具完成采摘',
      parameters: {
        type: 'object',
        properties: {
          reason: {
            type: 'string',
            description: '同意采摘的理由'
          }
        },
        required: ['reason']
      }
    },

    // 消息
    messages: {
      errors: {
        unknownTool: '未知工具: {toolName}',
        noFlowerSelected: '没有选中花朵',
        flowerNotMature: '花朵还未成熟',
        harvestFailed: '采摘失败'
      },
      success: {
        harvested: '成功采摘，获得 {gold} 金币'
      }
    }
  }

  // 未来可以在这里添加更多 Skill 配置
  // waterPlant: { ... }
  // fertilize: { ... }
};

export default SkillDefinitions;
