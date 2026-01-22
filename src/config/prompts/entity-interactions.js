/**
 * 实体交互描述配置
 * 包含 FlowerDescriptor 使用的所有交互定义文本
 */

export const EntityInteractions = {
  // 交互类型标签（用于在对话框中显示）
  interactionLabels: {
    click: '点击了',
    click_growing: '点击了',
    plant: '种植了',
    dblclick: '双击了',
    contextmenu: '右键点击了',
    drag: '拖拽了'
  },

  // 花朵实体交互
  flower: {
    // 描述模板
    description: {
      template: '这是一朵名为"{name}"的花。状态：{status}。性格：{personality}。',
      status: {
        mature: '已成熟',
        growing: '成长中'
      }
    },

    // 交互定义
    interactions: {
      // 种植交互
      plant: {
        action: '种植',
        description: '刚刚种下这朵花，需要等待成长',
        userPrompt: '种下了新花！'
      },

      // 点击交互 - 成熟时
      clickMature: {
        condition: '成熟时',
        action: '偷花',
        description: {
          withRule: '采摘规则：{rule}',
          default: '可以尝试采摘这朵花'
        },
        userPrompt: {
          withGreeting: '{greeting}',
          default: '点击与花朵对话'
        }
      },

      // 点击交互 - 未成熟时
      clickImmature: {
        condition: '未成熟时',
        action: '查看',
        description: '花朵还在成长中，可以查看状态',
        userPrompt: '花朵还在成长中...'
      },

      // 双击交互
      dblclick: {
        action: '快速查看',
        description: '快速查看花朵详情',
        userPrompt: '查看花朵信息'
      },

      // 右键交互 - 仅成熟时显示
      contextmenu: {
        action: '查看采摘提示',
        description: '查看如何采摘这朵花',
        userPrompt: '查看采摘提示'
      }
    }
  }

  // 未来可以添加更多实体类型
  // tree: { ... }
  // decoration: { ... }
};

export default EntityInteractions;
