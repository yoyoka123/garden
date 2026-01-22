/**
 * 全局配置管理
 * 集中管理所有可配置参数
 */

export const CONFIG = {
  // 网格配置
  grid: {
    cols: 3,
    rows: 2,
    cellWidth: 2,
    cellDepth: 2
  },

  // 游戏配置
  game: {
    growthTime: 10000,      // 成长时间 (毫秒)
    harvestGold: 10,        // 采摘获得金币
    bouquetSpreadAngle: 0.28 // 花束散开角度 (弧度，约±25°)
  },

  // AI API 配置
  ai: {
    url: 'https://ark.cn-beijing.volces.com/api/v3/responses',
    token: '2bce5331-d480-4141-b0dc-23f3d7e5e185',
    model: 'doubao-seed-1-8-251228'
  },

  // 渲染配置
  rendering: {
    camera: {
      fov: 60,
      near: 0.1,
      far: 1000,
      position: { x: 0, y: 5, z: 8 }
    },
    light: {
      ambient: { color: 0xffffff, intensity: 0.6 },
      directional: { color: 0xffffff, intensity: 1.5, position: { x: 10, y: 20, z: 10 } }
    },
    fog: {
      color: 0xE0F6FF,
      density: 0.02
    },
    controls: {
      minPolarAngle: 0.1,
      maxPolarAngle: Math.PI / 2 - 0.1,
      minDistance: 3,
      maxDistance: 20
    }
  },

  // 动画配置
  animation: {
    windSway: 0.1,
    swaySpeed: 1.5
  },

  // 默认资源
  assets: {
    sky: 'assets/pink_sky.jpg',
    ground: 'assets/glassnew.jpg',
    flower: 'assets/pink_flower.jpg'
  }
};

// 计算派生值
export const GARDEN_WIDTH = CONFIG.grid.cols * CONFIG.grid.cellWidth;
export const GARDEN_DEPTH = CONFIG.grid.rows * CONFIG.grid.cellDepth;
export const GROUND_Y = 0;
