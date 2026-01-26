/**
 * Garden Context
 * 在 Bridge Server 中初始化花园的核心逻辑（无 UI）
 * 提供工具执行能力
 */

import { Grid } from '../src/core/Grid.js';
import { HeadlessFlowerManager } from './HeadlessFlowerManager.js';
import { SkillRegistry } from '../src/skills/SkillRegistry.js';
import { GardenSkill } from '../src/skills/GardenSkill.js';
import { HarvestSkill } from '../src/skills/HarvestSkill.js';

// 花束目录（与 main.js 同步）
const BOUQUET_CATALOG = {
  '粉花': {
    images: ['assets/flowers/flowerpink.png'],
    agent: { name: '小粉', personality: '温柔可爱', harvestRule: '说一句甜蜜的情话' }
  },
  '紫花': {
    images: ['assets/flowers/flowerpurple.png'],
    agent: { name: '小紫', personality: '神秘优雅', harvestRule: '背诵一句古诗词' }
  },
  '红花': {
    images: ['assets/flowers/red.png'],
    agent: { name: '小红', personality: '热情似火', harvestRule: '说出你最近完成的一个挑战' }
  },
  '红花2': {
    images: ['assets/flowers/red1.png'],
    agent: { name: '红红', personality: '活力四射', harvestRule: '说一个你的目标' }
  },
  '红花3': {
    images: ['assets/flowers/red2.png'],
    agent: { name: '阿红', personality: '直爽热情', harvestRule: '夸夸我' }
  },
  '黄花': {
    images: ['assets/flowers/yellow1.png'],
    agent: { name: '小黄', personality: '阳光开朗', harvestRule: '讲一个笑话' }
  },
  '黄花2': {
    images: ['assets/flowers/yellow2.png'],
    agent: { name: '黄黄', personality: '活泼可爱', harvestRule: '说一个有趣的事' }
  },
  '蓝花': {
    images: ['assets/flowers/blue.png'],
    agent: { name: '小蓝', personality: '安静沉稳', harvestRule: '分享一个人生感悟' }
  },
  '秋花': {
    images: ['assets/flowers/autumn1.png'],
    agent: { name: '秋秋', personality: '怀旧温暖', harvestRule: '分享一个童年回忆' }
  },
  '秋花2': {
    images: ['assets/flowers/autumn2.png'],
    agent: { name: '秋叶', personality: '成熟稳重', harvestRule: '说一句励志的话' }
  },
  '紫兰1': {
    images: ['assets/flowers/purple1.png'],
    agent: { name: '紫兰', personality: '高贵典雅', harvestRule: '说一个你欣赏的品质' }
  },
  '紫兰2': {
    images: ['assets/flowers/purple2.png'],
    agent: { name: '紫罗', personality: '浪漫梦幻', harvestRule: '描述一个梦境' }
  },
  '花朵1': {
    images: ['assets/flowers/flower1.png'],
    agent: { name: '花花', personality: '活泼开朗', harvestRule: '说你最喜欢的颜色' }
  },
  '花朵2': {
    images: ['assets/flowers/flower2.png'],
    agent: { name: '朵朵', personality: '甜美可人', harvestRule: '说一个你喜欢的食物' }
  },
  '花朵3': {
    images: ['assets/flowers/flower3.png'],
    agent: { name: '小朵', personality: '天真烂漫', harvestRule: '唱一句歌词' }
  },
  '花朵4': {
    images: ['assets/flowers/flower4.png'],
    agent: { name: '大朵', personality: '大气从容', harvestRule: '说一个你的爱好' }
  },
  '小树': {
    images: ['assets/trees/tree1.png'],
    agent: { name: '树树', personality: '稳重可靠', harvestRule: '说出三种树的名字' }
  },
  '大树': {
    images: ['assets/trees/tree.png'],
    agent: { name: '大树', personality: '沉稳有力', harvestRule: '说一个自然现象' }
  },
  '绿树2': {
    images: ['assets/trees/tree2.png'],
    agent: { name: '青青', personality: '生机勃勃', harvestRule: '说一种植物' }
  },
  '绿树3': {
    images: ['assets/trees/tree3.png'],
    agent: { name: '森森', personality: '神秘深邃', harvestRule: '说一个森林动物' }
  },
  '绿树4': {
    images: ['assets/trees/tree4.png'],
    agent: { name: '林林', personality: '温和友善', harvestRule: '说一句关于环保的话' }
  },
  '绿树5': {
    images: ['assets/trees/tree5.png'],
    agent: { name: '木木', personality: '朴实无华', harvestRule: '说一个你珍惜的东西' }
  },
  '粉树': {
    images: ['assets/trees/pinktree.png'],
    agent: { name: '樱樱', personality: '浪漫温柔', harvestRule: '描述你心中的春天' }
  },
  '紫树': {
    images: ['assets/trees/purpletree.png'],
    agent: { name: '紫藤', personality: '优雅神秘', harvestRule: '说出一位艺术家' }
  }
};

/**
 * 创建花园上下文（无 UI 版本）
 */
export function createGardenContext() {
  // 初始化核心组件（无 3D 渲染）
  const grid = new Grid();

  // 使用 HeadlessFlowerManager（无渲染模式）
  const flowerManager = new HeadlessFlowerManager(grid, BOUQUET_CATALOG);

  // 初始化 Skill 注册表
  const skillRegistry = new SkillRegistry();

  // 注册 Skills
  const gardenSkill = new GardenSkill(flowerManager, grid, BOUQUET_CATALOG);
  const harvestSkill = new HarvestSkill(flowerManager);

  skillRegistry.register(gardenSkill);
  skillRegistry.register(harvestSkill);

  return {
    grid,
    flowerManager,
    skillRegistry,
    bouquetCatalog: BOUQUET_CATALOG
  };
}
