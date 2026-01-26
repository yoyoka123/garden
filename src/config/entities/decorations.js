/**
 * 装饰物配置示例
 */

/**
 * @type {Object.<string, import('../../core/EntityFactory.js').EntityConfig>}
 */
export const DecorationConfigs = {
  // 蝴蝶配置
  butterfly: {
    id: 'butterfly',
    type: 'decoration',

    render: {
      sprite: 'assets/decorations/butterfly1.png',
      scale: { base: 0.5, random: 0.2 },
      renderOrder: 100
    },

    motion: {
      sway: {
        enabled: false
      }
    },

    // 蝴蝶的飞行动画
    motions: [
      {
        id: 'flutter',
        trigger: 'always',
        type: 'oscillate',
        config: {
          property: 'y',
          amplitude: 0.3,
          frequency: 2,
          loop: true
        }
      },
      {
        id: 'wander',
        trigger: 'always',
        type: 'orbit',
        config: {
          radius: 0.5,
          plane: 'xz',
          loop: true,
          duration: 5000
        }
      }
    ],

    interactions: [
      {
        type: 'click',
        action: 'flyAway',
        ui: { prompt: '点击让蝴蝶飞走' }
      },
      {
        type: 'drag',
        lockY: false,
        ui: { prompt: '拖拽移动蝴蝶' }
      }
    ]
  },

  // 小猫配置
  cat: {
    id: 'cat',
    type: 'decoration',

    render: {
      sprite: 'assets/decorations/cat.png',
      scale: { base: 0.8, random: 0.1 },
      renderOrder: 50
    },

    motion: {
      sway: {
        enabled: true,
        amplitude: 0.02,
        frequency: 0.5
      }
    },

    motions: [
      {
        id: 'idle',
        trigger: 'always',
        type: 'oscillate',
        config: {
          property: 'scale',
          amplitude: 0.02,
          frequency: 0.3,
          loop: true
        }
      }
    ],

    interactions: [
      {
        type: 'click',
        action: 'pet',
        ui: { prompt: '点击抚摸小猫' }
      },
      {
        type: 'drag',
        lockY: true,
        ui: { prompt: '拖拽移动小猫' }
      }
    ],

    ai: {
      name: '小花',
      personality: '慵懒可爱，喜欢在花园里晒太阳',
      greeting: '喵～有什么事吗？'
    }
  },

  // 喷泉配置
  fountain: {
    id: 'fountain',
    type: 'decoration',

    render: {
      sprite: 'assets/decorations/fountain.png',
      scale: { base: 1.2, random: 0 },
      renderOrder: 30
    },

    motion: {
      sway: {
        enabled: false
      }
    },

    motions: [
      {
        id: 'water',
        trigger: 'always',
        type: 'oscillate',
        config: {
          property: 'scale',
          amplitude: 0.03,
          frequency: 3,
          loop: true
        }
      }
    ],

    interactions: [
      {
        type: 'click',
        action: 'splash',
        ui: { prompt: '点击喷水' }
      },
      {
        type: 'drag',
        lockY: true
      }
    ]
  },

  // 云朵配置
  cloud: {
    id: 'cloud',
    type: 'decoration',

    render: {
      sprite: 'assets/decorations/cloud.png',
      scale: { base: 0.8, random: 0.2 },
      renderOrder: 200
    },

    motion: {
      sway: {
        enabled: false
      }
    },

    motions: [
      {
        id: 'float',
        trigger: 'always',
        type: 'oscillate',
        config: {
          property: 'y',
          amplitude: 0.1,
          frequency: 0.3,
          loop: true
        }
      },
      {
        id: 'drift',
        trigger: 'always',
        type: 'oscillate',
        config: {
          property: 'x',
          amplitude: 0.2,
          frequency: 0.1,
          loop: true
        }
      }
    ],

    interactions: [
      {
        type: 'click',
        action: 'talk',
        ui: { prompt: '点击与云朵对话' }
      },
      {
        type: 'drag',
        lockY: false,
        ui: { prompt: '拖拽移动云朵' }
      }
    ],

    ai: {
      name: '云朵',
      personality: '飘在空中，悠闲自在，喜欢俯瞰花园',
      greeting: '飘～今天天气真好呀～'
    }
  },

  // 小狗配置
  dog: {
    id: 'dog',
    type: 'decoration',

    render: {
      sprite: 'assets/decorations/dog2.png',
      scale: { base: 0.7, random: 0.1 },
      renderOrder: 50
    },

    motion: {
      sway: {
        enabled: true,
        amplitude: 0.03,
        frequency: 0.8
      }
    },

    motions: [
      {
        id: 'wag',
        trigger: 'always',
        type: 'oscillate',
        config: {
          property: 'rotation',
          amplitude: 0.05,
          frequency: 2,
          loop: true
        }
      }
    ],

    interactions: [
      {
        type: 'click',
        action: 'pet',
        ui: { prompt: '点击撸狗' }
      },
      {
        type: 'drag',
        lockY: true,
        ui: { prompt: '拖拽移动小狗' }
      }
    ],

    ai: {
      name: '旺财',
      personality: '活泼忠诚，喜欢和花园里的蝴蝶玩耍',
      greeting: '汪汪！主人好！'
    }
  }
};

/**
 * 获取装饰物配置
 * @param {string} decorationId
 * @returns {import('../../core/EntityFactory.js').EntityConfig|null}
 */
export function getDecorationConfig(decorationId) {
  return DecorationConfigs[decorationId] || null;
}

/**
 * 获取所有装饰物类型
 * @returns {string[]}
 */
export function getDecorationTypes() {
  return Object.keys(DecorationConfigs);
}
