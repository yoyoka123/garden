/**
 * 花朵配置示例
 * 展示如何使用配置驱动的方式定义花朵
 */

/**
 * @type {Object.<string, import('../../core/EntityFactory.js').EntityConfig>}
 */
export const FlowerConfigs = {
  // 向日葵配置示例
  sunflower: {
    id: 'sunflower',
    type: 'flower',

    render: {
      sprite: 'assets/flowers/sunflower.png',
      scale: { base: 0.8, random: 0.2 },
      renderOrder: 10
    },

    lifecycle: {
      growthTime: 15000,
      stages: ['seed', 'sprout', 'growing', 'blooming', 'mature']
    },

    motion: {
      sway: {
        enabled: true,
        amplitude: 0.08,
        frequency: 1.2
      }
    },

    // 自定义运动
    motions: [
      {
        id: 'sunTrack',
        trigger: 'always',
        type: 'oscillate',
        config: {
          property: 'rotation',
          amplitude: 0.15,
          frequency: 0.5,
          loop: true
        }
      }
    ],

    interactions: [
      {
        type: 'click',
        condition: (entity) => entity.getComponent('lifecycle')?.isHarvestable,
        action: 'harvest',
        ui: { prompt: '点击采摘向日葵', icon: 'harvest' }
      },
      {
        type: 'hover',
        showTooltip: true,
        tooltipContent: (entity) => {
          const lifecycle = entity.getComponent('lifecycle');
          if (!lifecycle) return '向日葵';
          const progress = Math.round(lifecycle.getGrowthProgress() * 100);
          return lifecycle.isGrown ? '已成熟' : `成长中 ${progress}%`;
        }
      }
    ],

    ai: {
      name: '小葵',
      personality: '阳光开朗，总是面向太阳',
      greeting: '向阳而生，积极向上！',
      harvestRule: '说一句鼓励自己的话',
      harvestSuccess: '愿你永远向阳而生！'
    }
  },

  // 玫瑰配置示例
  rose: {
    id: 'rose',
    type: 'flower',

    render: {
      sprite: 'assets/flowers/rose.png',
      scale: { base: 0.6, random: 0.3 },
      renderOrder: 10
    },

    lifecycle: {
      growthTime: 20000,
      stages: ['seed', 'sprout', 'budding', 'blooming', 'mature']
    },

    motion: {
      sway: {
        enabled: true,
        amplitude: 0.05,
        frequency: 1.8
      }
    },

    interactions: [
      {
        type: 'click',
        condition: (entity) => entity.getComponent('lifecycle')?.isHarvestable,
        action: 'harvest',
        ui: { prompt: '轻轻采摘玫瑰', icon: 'harvest' }
      },
      {
        type: 'longpress',
        duration: 800,
        condition: (entity) => entity.getComponent('lifecycle')?.isHarvestable,
        action: 'gift',
        ui: { prompt: '长按赠送' }
      }
    ],

    ai: {
      name: '小玫',
      personality: '优雅浪漫，带着淡淡的傲娇',
      greeting: '别看我身上有刺，其实我很温柔的～',
      harvestRule: '说一句浪漫的情话',
      harvestSuccess: '愿这朵玫瑰传递我的心意～'
    }
  }
};

/**
 * 获取花朵配置
 * @param {string} flowerId
 * @returns {import('../../core/EntityFactory.js').EntityConfig|null}
 */
export function getFlowerConfig(flowerId) {
  return FlowerConfigs[flowerId] || null;
}

/**
 * 获取所有花朵类型
 * @returns {string[]}
 */
export function getFlowerTypes() {
  return Object.keys(FlowerConfigs);
}
