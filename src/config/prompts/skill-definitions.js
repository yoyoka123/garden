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
      description: '采摘一朵成熟的花。用户需要满足该花朵的harvestRule才能采摘。',
      parameters: {
        type: 'object',
        properties: {
          reason: {
            type: 'string',
            description: '采摘理由。必须符合该花朵的harvestRule要求（如：讲笑话、说情话、背古诗等）。查看焦点花朵的description获取具体规则。'
          },
          flowerId: {
            type: 'string',
            description: '可选。要采摘的花朵ID，从花园状态的花朵列表中获取（格式如 flower_xxx）。不提供则采摘当前焦点花朵。'
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
  },

  // Garden Skill 配置 - 花园管理操作
  garden: {
    meta: {
      name: 'garden',
      description: '花园管理操作，包括种植、查询等'
    },

    // 多个工具
    tools: [
      {
        type: 'function',
        name: 'plant',
        description: '在花园空位种植花朵。如不知道可用类型，先调用list_bouquets查询。',
        parameters: {
          type: 'object',
          properties: {
            bouquetKey: {
              type: 'string',
              description: '花束类型标识，如"粉花"、"紫花"、"小树"等。使用list_bouquets工具获取完整列表。'
            },
            count: {
              type: 'number',
              description: '种植数量，默认为1。多个花朵会种在同一格子内。'
            }
          },
          required: ['bouquetKey']
        }
      },
      {
        type: 'function',
        name: 'query_garden',
        description: '查询花园状态。返回已种植数量、总格子数、空位数。用于回答"花园有多少花"、"还有空位吗"等问题。',
        parameters: {
          type: 'object',
          properties: {}
        }
      },
      {
        type: 'function',
        name: 'list_bouquets',
        description: '列出所有可用的花束类型。返回每种花的key（用于plant）、name和personality。用于回答"有什么花可以种"。',
        parameters: {
          type: 'object',
          properties: {}
        }
      },
      {
        type: 'function',
        name: 'resize_garden',
        description: '调整花园土地的大小。可以增大或缩小花园的格子数量。用于回答"把土地变大"、"缩小花园"、"改成5x5"等问题。',
        parameters: {
          type: 'object',
          properties: {
            cols: {
              type: 'number',
              description: '新的列数（宽度方向），范围2-10'
            },
            rows: {
              type: 'number',
              description: '新的行数（深度方向），范围2-10'
            }
          },
          required: ['cols', 'rows']
        }
      }
    ],

    messages: {
      errors: {
        gardenFull: '花园已满，没有空位了',
        unknownBouquet: '没有找到"{bouquetKey}"这种花',
        plantFailed: '种植失败',
        invalidSize: '土地大小无效，列数和行数必须在2-10之间'
      },
      success: {
        planted: '在位置 ({col}, {row}) 种植了 {count} 朵 {bouquetKey}'
      }
    }
  }
};

export default SkillDefinitions;
