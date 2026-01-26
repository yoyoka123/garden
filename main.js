/**
 * 语义农场 - 主入口文件
 * Semantic Farm - Main Entry Point
 */

import * as THREE from 'three';
import { CONFIG } from './src/config.js';
import { eventBus, Events } from './src/EventBus.js';
import { Grid } from './src/core/Grid.js';
import { SceneSetup } from './src/rendering/SceneSetup.js';
import { animator } from './src/rendering/Animator.js';
import { FlowerManager } from './src/managers/FlowerManager.js';
import { DecorationManager } from './src/managers/DecorationManager.js';
import { gameState } from './src/managers/GameState.js';
import { uiManager } from './src/ui/UIManager.js';
import { ChatUI } from './src/ui/ChatUI.js';
import { getMouseNDC, toScreenPosition } from './src/utils/three-helpers.js';
import { removeBackgroundFromDataUrl } from './src/utils/image-process.js';
import { readFileAsDataUrl, getElement } from './src/utils/dom-helpers.js';

// Agent-Skill 架构导入
import { GardenAgent } from './src/agent/GardenAgent.js';
import { GardenStateProvider } from './src/agent/GardenStateProvider.js';
import { SkillRegistry } from './src/skills/SkillRegistry.js';
import { HarvestSkill } from './src/skills/HarvestSkill.js';
import { GardenSkill } from './src/skills/GardenSkill.js';
import { EntityRegistry } from './src/entities/EntityRegistry.js';
import { FlowerDescriptor } from './src/entities/descriptors/FlowerDescriptor.js';
import { InteractionManager } from './src/interactions/InteractionManager.js';
import { InputRouter } from './src/interactions/InputRouter.js';
import { aiClient } from './src/ai/AIClient.js';
import { claudeCodeClient } from './src/ai/ClaudeCodeClient.js';

// 新模块导入
import { stateManager } from './src/persistence/StateManager.js';
import { interactionQueue } from './src/interactions/InteractionQueue.js';
import { motionController } from './src/motion/MotionController.js';
import { throttle } from './src/utils/timing.js';

// ============================================
// 花束目录（花朵 + 树木）
// ============================================
const BOUQUET_CATALOG = {
  // === 花朵 ===
  '粉花': {
    images: ['assets/flowers/flowerpink.png'],
    agent: { name: '小粉', personality: '温柔可爱', harvestRule: '说一句甜蜜的情话', greeting: '嗨～我是小粉～', harvestSuccess: '好甜蜜呀！' }
  },
  '紫花': {
    images: ['assets/flowers/flowerpurple.png'],
    agent: { name: '小紫', personality: '神秘优雅', harvestRule: '背诵一句古诗词', greeting: '你好呀～我是小紫～', harvestSuccess: '好美的诗句！' }
  },
  '红花': {
    images: ['assets/flowers/red.png'],
    agent: { name: '小红', personality: '热情似火', harvestRule: '说出你最近完成的一个挑战', greeting: '嘿！我是小红！', harvestSuccess: '太厉害了！' }
  },
  '红花2': {
    images: ['assets/flowers/red1.png'],
    agent: { name: '红红', personality: '活力四射', harvestRule: '说一个你的目标', greeting: '你好！我是红红！', harvestSuccess: '加油！' }
  },
  '红花3': {
    images: ['assets/flowers/red2.png'],
    agent: { name: '阿红', personality: '直爽热情', harvestRule: '夸夸我', greeting: '嘿！我是阿红！', harvestSuccess: '谢谢夸奖！' }
  },
  '黄花': {
    images: ['assets/flowers/yellow1.png'],
    agent: { name: '小黄', personality: '阳光开朗', harvestRule: '讲一个笑话', greeting: '哈喽！我是小黄！', harvestSuccess: '哈哈哈！' }
  },
  '黄花2': {
    images: ['assets/flowers/yellow2.png'],
    agent: { name: '黄黄', personality: '活泼可爱', harvestRule: '说一个有趣的事', greeting: '你好！我是黄黄！', harvestSuccess: '太有趣了！' }
  },
  '蓝花': {
    images: ['assets/flowers/blue.png'],
    agent: { name: '小蓝', personality: '安静沉稳', harvestRule: '分享一个人生感悟', greeting: '你好，我是小蓝', harvestSuccess: '说得真好～' }
  },
  '秋花': {
    images: ['assets/flowers/autumn1.png'],
    agent: { name: '秋秋', personality: '怀旧温暖', harvestRule: '分享一个童年回忆', greeting: '嗨，我是秋秋～', harvestSuccess: '好温暖！' }
  },
  '秋花2': {
    images: ['assets/flowers/autumn2.png'],
    agent: { name: '秋叶', personality: '成熟稳重', harvestRule: '说一句励志的话', greeting: '你好，我是秋叶', harvestSuccess: '说得好！' }
  },
  '紫兰1': {
    images: ['assets/flowers/purple1.png'],
    agent: { name: '紫兰', personality: '高贵典雅', harvestRule: '说一个你欣赏的品质', greeting: '你好～我是紫兰', harvestSuccess: '很有品味！' }
  },
  '紫兰2': {
    images: ['assets/flowers/purple2.png'],
    agent: { name: '紫罗', personality: '浪漫梦幻', harvestRule: '描述一个梦境', greeting: '嗨～我是紫罗', harvestSuccess: '好梦幻！' }
  },
  '花朵1': {
    images: ['assets/flowers/flower1.png'],
    agent: { name: '花花', personality: '活泼开朗', harvestRule: '说你最喜欢的颜色', greeting: '你好！我是花花！', harvestSuccess: '好选择！' }
  },
  '花朵2': {
    images: ['assets/flowers/flower2.png'],
    agent: { name: '朵朵', personality: '甜美可人', harvestRule: '说一个你喜欢的食物', greeting: '嗨～我是朵朵', harvestSuccess: '听起来好吃！' }
  },
  '花朵3': {
    images: ['assets/flowers/flower3.png'],
    agent: { name: '小朵', personality: '天真烂漫', harvestRule: '唱一句歌词', greeting: '你好呀～我是小朵', harvestSuccess: '唱得真好！' }
  },
  '花朵4': {
    images: ['assets/flowers/flower4.png'],
    agent: { name: '大朵', personality: '大气从容', harvestRule: '说一个你的爱好', greeting: '你好，我是大朵', harvestSuccess: '兴趣广泛！' }
  },
  // === 树木 ===
  '小树': {
    images: ['assets/trees/tree1.png'],
    agent: { name: '树树', personality: '稳重可靠', harvestRule: '说出三种树的名字', greeting: '你好，我是树树', harvestSuccess: '很懂树木！' }
  },
  '大树': {
    images: ['assets/trees/tree.png'],
    agent: { name: '大树', personality: '沉稳有力', harvestRule: '说一个自然现象', greeting: '你好，我是大树', harvestSuccess: '观察入微！' }
  },
  '绿树2': {
    images: ['assets/trees/tree2.png'],
    agent: { name: '青青', personality: '生机勃勃', harvestRule: '说一种植物', greeting: '嗨！我是青青', harvestSuccess: '知识丰富！' }
  },
  '绿树3': {
    images: ['assets/trees/tree3.png'],
    agent: { name: '森森', personality: '神秘深邃', harvestRule: '说一个森林动物', greeting: '你好，我是森森', harvestSuccess: '很了解森林！' }
  },
  '绿树4': {
    images: ['assets/trees/tree4.png'],
    agent: { name: '林林', personality: '温和友善', harvestRule: '说一句关于环保的话', greeting: '你好～我是林林', harvestSuccess: '环保意识强！' }
  },
  '绿树5': {
    images: ['assets/trees/tree5.png'],
    agent: { name: '木木', personality: '朴实无华', harvestRule: '说一个你珍惜的东西', greeting: '嗨，我是木木', harvestSuccess: '懂得珍惜！' }
  },
  '粉树': {
    images: ['assets/trees/pinktree.png'],
    agent: { name: '樱樱', personality: '浪漫温柔', harvestRule: '描述你心中的春天', greeting: '你好～我是樱樱', harvestSuccess: '好美的春天！' }
  },
  '紫树': {
    images: ['assets/trees/purpletree.png'],
    agent: { name: '紫藤', personality: '优雅神秘', harvestRule: '说出一位艺术家', greeting: '你好，我是紫藤', harvestSuccess: '真有品味！' }
  }
};

// 草皮目录（url + 每格子数量）
const GRASS_CATALOG = {
  '草地1': { url: 'assets/grass/grass.png', countPerCell: 1 },
  '草地2': { url: 'assets/grass/grass1.png', countPerCell: 1 },
  '草地3': { url: 'assets/grass/grass2.png', countPerCell: 1 },
  '草地4': { url: 'assets/grass/grass3.png', countPerCell: 1 },
  '草地5': { url: 'assets/grass/grass4.png', countPerCell: 1 }
};

// 装饰物目录（支持自定义运动配置）
// 格式: { url, configId?, motions? }
const DECORATION_CATALOG = {
  // 普通装饰物
  '小猫': { url: 'assets/decorations/cat.png', configId: 'cat' },
  '小猫2': { url: 'assets/decorations/cat2.png' },
  '小狗': { url: 'assets/decorations/dog2.png' },
  '小狗2': { url: 'assets/decorations/dog5.png' },

  // 蝴蝶 - 使用自定义飞舞运动（降低速度和幅度）
  '蝴蝶1': {
    url: 'assets/decorations/butterfly1.png',
    configId: 'butterfly',
    motions: [
      { id: 'flutter', trigger: 'always', type: 'oscillate', config: { property: 'y', amplitude: 0.08, frequency: 0.8 } },
      { id: 'wander', trigger: 'always', type: 'orbit', config: { radius: 0.15, plane: 'xz', duration: 8000 } }
    ]
  },
  '蝴蝶2': {
    url: 'assets/decorations/butterfly2.png',
    motions: [
      { id: 'flutter', trigger: 'always', type: 'oscillate', config: { property: 'y', amplitude: 0.1, frequency: 0.6 } }
    ]
  },
  '蝴蝶画': { url: 'assets/decorations/butterflydraw.png' },
  '粉蝶': {
    url: 'assets/decorations/butterpink.png',
    motions: [
      { id: 'flutter', trigger: 'always', type: 'oscillate', config: { property: 'y', amplitude: 0.06, frequency: 1.0 } },
      { id: 'sway', trigger: 'always', type: 'oscillate', config: { property: 'rotation', amplitude: 0.15, frequency: 0.5 } }
    ]
  },

  // 云朵 - 缓慢飘动
  '云朵': {
    url: 'assets/decorations/cloud.png',
    motions: [
      { id: 'float', trigger: 'always', type: 'oscillate', config: { property: 'x', amplitude: 0.2, frequency: 0.05 } },
      { id: 'bob', trigger: 'always', type: 'oscillate', config: { property: 'y', amplitude: 0.05, frequency: 0.08 } }
    ]
  },
  '云朵2': { url: 'assets/decorations/cloud1.png' },
  '云朵3': { url: 'assets/decorations/cloud2.png' },
  '云彩画': { url: 'assets/decorations/clouddraw.png' }
};

// ============================================
// 初始化
// ============================================
const container = document.getElementById('canvas-container');
const sceneSetup = new SceneSetup(container);
const grid = new Grid();
const flowerManager = new FlowerManager(grid, sceneSetup.gardenGroup, BOUQUET_CATALOG);
const decorationManager = new DecorationManager(sceneSetup.scene);

// 用于装饰物拖拽的无限平面 (y = 0.3，更接近地面)
const decorationDragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.3);

// ============================================
// Agent-Skill 系统初始化
// ============================================
const skillRegistry = new SkillRegistry();
const entityRegistry = new EntityRegistry();

// 注册实体描述器
const flowerDescriptor = new FlowerDescriptor(BOUQUET_CATALOG);
entityRegistry.register(flowerDescriptor);

// 创建花园状态提供者（包含花朵和装饰物感知）
const stateProvider = new GardenStateProvider(
  flowerManager, gameState, grid, BOUQUET_CATALOG, decorationManager
);

// 创建花园 Agent（支持双后端：豆包 / Claude Code）
const gardenAgent = new GardenAgent(
  {
    name: '花园精灵',
    personality: '我是这座花园的守护者，热爱每一朵花。我会帮助你了解花园里的一切，也会在你满足条件时允许你采摘花朵。'
  },
  skillRegistry,
  aiClient,
  stateProvider,
  claudeCodeClient  // Claude Code 桥接客户端
);

// 注册 Skills
const harvestSkill = new HarvestSkill(flowerManager);
skillRegistry.register(harvestSkill);

const gardenSkill = new GardenSkill(flowerManager, grid, BOUQUET_CATALOG);
skillRegistry.register(gardenSkill);

// 创建交互管理器
const interactionManager = new InteractionManager(entityRegistry, gardenAgent);

// 注册花朵实体解析器
interactionManager.registerResolver('flower', (target) => {
  return flowerManager.getFlowerBySprite(target);
});

// 创建输入路由器
const inputRouter = new InputRouter(gardenAgent, interactionManager);

// 创建聊天 UI 并连接到 InputRouter
const chatUI = new ChatUI(BOUQUET_CATALOG, inputRouter);

// 初始化状态管理器
stateManager.setManagers({
  flowerManager,
  decorationManager,
  gameState,
  grid
});

// Raycaster
const raycaster = new THREE.Raycaster();

// ============================================
// 事件处理
// ============================================

// 金币变化 -> 更新花朵采摘
eventBus.on(Events.FLOWER_HARVESTED, ({ gold }) => {
  gameState.addGold(gold);
});

// 采摘成功 -> 执行采摘
eventBus.on(Events.CHAT_HARVEST_SUCCESS, ({ flowerData, reason }) => {
  const { cellCol, cellRow } = flowerData;
  const result = flowerManager.harvestCell(cellCol, cellRow);

  // 显示采摘飘字
  const sprite = flowerData.sprite;
  if (sprite) {
    const flowerTop = sprite.position.clone();
    flowerTop.y += sprite.scale.y;
    const screenPos = toScreenPosition(flowerTop, sceneSetup.camera, sceneSetup.domElement);
    uiManager.showHarvestPopup(screenPos.x, screenPos.y, result.gold);
  }

  // 显示成功动画
  showHarvestSuccessOverlay(flowerData, reason);
});

// 更新已种植数量
eventBus.on(Events.FLOWER_PLANTED, () => {
  uiManager.updatePlantedCount(flowerManager.getPlantedCount());
});

eventBus.on(Events.FLOWER_HARVESTED, () => {
  uiManager.updatePlantedCount(flowerManager.getPlantedCount());
});

// 花园大小调整 -> 更新场景
eventBus.on(Events.GARDEN_RESIZED, async ({ newCols, newRows, preservedCount }) => {
  // 更新场景中的地面和网格
  sceneSetup.updateGardenSize(grid);
  
  // 重新加载草地（使用新的网格尺寸）
  await reloadGrass();
  
  // 更新花朵位置（因为网格大小改变，需要重新计算位置）
  // FlowerManager 内部会处理网格变化，但我们需要确保所有花朵都在新网格范围内
  const allFlowers = flowerManager.getAllFlowers();
  allFlowers.forEach(flowerData => {
    const { cellCol, cellRow } = flowerData;
    // 如果花朵在新网格范围内，更新其位置
    if (cellCol < newCols && cellRow < newRows) {
      const cellCenter = grid.getCellCenter(cellCol, cellRow);
      // 更新花朵精灵位置（如果需要）
      // 注意：FlowerManager 可能需要额外的更新逻辑
    }
  });
  
  // 更新 UI 显示
  uiManager.updatePlantedCount(flowerManager.getPlantedCount());
  
  console.log(`花园大小已调整为 ${newCols} x ${newRows}，保留了 ${preservedCount} 朵花`);
});

// ============================================
// 采摘成功动画
// ============================================
function showHarvestSuccessOverlay(flowerData, reason) {
  const bouquetData = BOUQUET_CATALOG[flowerData.bouquetKey];
  const agent = bouquetData?.agent || {};

  const overlay = document.createElement('div');
  overlay.className = 'harvest-success-overlay';
  overlay.innerHTML = `
    <div class="success-icon">🌱</div>
    <div class="success-text">${agent.harvestSuccess || '采摘成功！'}</div>
    <div class="success-reason">${reason}</div>
  `;
  document.body.appendChild(overlay);

  setTimeout(() => overlay.remove(), 2000);
}

// ============================================
// 点击交互（使用 InteractionQueue 防抖）
// ============================================
async function onCanvasClick(event) {
  if (event.shiftKey) return;

  const mouse = getMouseNDC(event, sceneSetup.domElement);
  raycaster.setFromCamera(mouse, sceneSetup.camera);

  // 检测花朵点击
  const flowerSprites = flowerManager.getAllSprites();
  const intersects = raycaster.intersectObjects(flowerSprites);

  if (intersects.length > 0) {
    const flowerData = flowerManager.getFlowerBySprite(intersects[0].object);
    if (flowerData) {
      const flowerTop = flowerData.sprite.position.clone();
      flowerTop.y += flowerData.sprite.scale.y;
      const screenPos = toScreenPosition(flowerTop, sceneSetup.camera, sceneSetup.domElement);

      const interactionType = flowerData.isHarvestable ? 'click' : 'click_growing';

      // 使用交互队列防抖处理
      interactionQueue.enqueue(interactionType, { flowerData, screenPos }, async (data) => {
        // 立即显示动作消息和 typing 动画
        chatUI.startInteraction(interactionType, data.flowerData);

        // 更新花园状态
        gardenAgent.updateGardenState({
          gold: gameState.gold,
          flowerCount: flowerManager.getPlantedCount()
        });

        try {
          // 通过 InputRouter 处理交互，让 Agent 生成回复
          const result = await inputRouter.handleDirectInteraction(
            interactionType, 'flower', data.flowerData, data.screenPos
          );

          // LLM 返回后显示回复
          if (result && result.output) {
            chatUI.completeInteraction(result.output);
          } else {
            chatUI.failInteraction('无法获取回复');
          }
          return result;
        } catch (error) {
          chatUI.failInteraction(`出错了：${error.message}`);
          throw error;
        }
      });
    }
  }
}

sceneSetup.domElement.addEventListener('click', onCanvasClick);

// ============================================
// 种植交互 (Shift + 点击)
// ============================================
let isPlanting = false;

async function tryPlantAtPosition(clientX, clientY) {
  if (!gameState.selectedBouquet) {
    eventBus.emit(Events.STATUS_MESSAGE, { message: '请先选择一个花束' });
    return;
  }

  const mouse = getMouseNDC({ clientX, clientY }, sceneSetup.domElement);
  raycaster.setFromCamera(mouse, sceneSetup.camera);

  const intersects = raycaster.intersectObject(sceneSetup.groundPlane);
  if (intersects.length > 0) {
    const point = intersects[0].point;
    const cell = grid.getCellAtPosition(point.x, point.z);

    if (cell && cell.isEmpty()) {
      const flowers = await flowerManager.plantBouquetInCell(
        cell.col,
        cell.row,
        gameState.selectedBouquet,
        gameState.bouquetCount
      );

      // 种植成功后通知 Agent
      if (flowers && flowers.length > 0) {
        const firstFlower = flowers[0];
        const flowerTop = firstFlower.sprite.position.clone();
        flowerTop.y += firstFlower.sprite.scale.y;
        const screenPos = toScreenPosition(flowerTop, sceneSetup.camera, sceneSetup.domElement);

        // 立即显示动作消息和 typing 动画
        chatUI.startInteraction('plant', firstFlower);

        try {
          // 通过 InputRouter 处理种植事件
          const result = await inputRouter.handleDirectInteraction(
            'plant', 'flower', firstFlower, screenPos
          );

          // LLM 返回后显示回复
          if (result && result.output) {
            chatUI.completeInteraction(result.output);
          } else {
            chatUI.failInteraction('无法获取回复');
          }
        } catch (error) {
          chatUI.failInteraction(`出错了：${error.message}`);
        }
      }
    }
  }
}

sceneSetup.domElement.addEventListener('mousedown', (event) => {
  if (event.shiftKey) {
    isPlanting = true;
    sceneSetup.controls.enabled = false;
    tryPlantAtPosition(event.clientX, event.clientY);
  }
});

// 使用节流限制种植频率
const throttledPlant = throttle((clientX, clientY) => {
  tryPlantAtPosition(clientX, clientY);
}, 100);

sceneSetup.domElement.addEventListener('mousemove', (event) => {
  if (isPlanting && event.shiftKey) {
    throttledPlant(event.clientX, event.clientY);
  }
});

window.addEventListener('mouseup', () => {
  if (isPlanting) {
    isPlanting = false;
    sceneSetup.controls.enabled = true;
  }
});

// Shift 键提示
window.addEventListener('keydown', (e) => {
  if (e.key === 'Shift') uiManager.setPlantModeActive(true);
});

window.addEventListener('keyup', (e) => {
  if (e.key === 'Shift') uiManager.setPlantModeActive(false);
});

// ============================================
// 装饰物交互
// ============================================
let pendingDecoration = null; // { url, configId?, motions? }

sceneSetup.domElement.addEventListener('mousedown', (e) => {
  if (e.button !== 0 || e.shiftKey) return;

  const mouse = getMouseNDC(e, sceneSetup.domElement);
  raycaster.setFromCamera(mouse, sceneSetup.camera);

  // 放置装饰物
  if (pendingDecoration) {
    // 使用无限平面计算交点，允许放置到任意位置
    const intersectPoint = new THREE.Vector3();
    const position = raycaster.ray.intersectPlane(decorationDragPlane, intersectPoint)
      ? new THREE.Vector3(intersectPoint.x, 0.3, intersectPoint.z)
      : new THREE.Vector3(0, 0.3, 0);

    // 使用配置创建装饰物（支持自定义运动）
    decorationManager.create(pendingDecoration.url, position, {
      configId: pendingDecoration.configId,
      motions: pendingDecoration.motions
    });
    pendingDecoration = null;

    const uploadArea = getElement('decoration-upload-area');
    const preview = getElement('decoration-preview');
    if (uploadArea) uploadArea.classList.remove('active');
    if (preview) preview.style.display = 'none';
    return;
  }

  // 拖拽装饰物
  const decorationSprites = decorationManager.getAllSprites();
  const intersects = raycaster.intersectObjects(decorationSprites);

  if (intersects.length > 0) {
    const decoration = decorationManager.getBySprite(intersects[0].object);
    if (decoration) {
      decorationManager.startDrag(decoration);
      sceneSetup.controls.enabled = false;
    }
  }
});

// 使用节流限制装饰物拖拽更新频率
const throttledDecorationDrag = throttle((e) => {
  const mouse = getMouseNDC(e, sceneSetup.domElement);
  raycaster.setFromCamera(mouse, sceneSetup.camera);

  const intersectPoint = new THREE.Vector3();
  if (raycaster.ray.intersectPlane(decorationDragPlane, intersectPoint)) {
    decorationManager.updateDragPosition(intersectPoint.x, intersectPoint.z);
  }
}, 16); // ~60fps

sceneSetup.domElement.addEventListener('mousemove', (e) => {
  if (!decorationManager.isDragging) return;
  throttledDecorationDrag(e);
});

window.addEventListener('mouseup', () => {
  if (decorationManager.isDragging) {
    decorationManager.endDrag();
    sceneSetup.controls.enabled = true;
  }
});

// 滚轮缩放装饰物（仅在装饰物上时处理，其他情况让 OrbitControls 处理）
// 注意：Mac 触控板双指缩放手势会触发 wheel 事件
sceneSetup.domElement.addEventListener('wheel', (e) => {
  // 检测触控板双指缩放手势：
  // 1. ctrlKey === true（某些浏览器中触控板手势会设置此标志）
  // 2. deltaMode === 0 且 deltaY 绝对值较大（像素模式，触控板常用）
  const isTrackpadGesture = e.ctrlKey || (e.deltaMode === 0 && Math.abs(e.deltaY) > 5);
  
  // 如果是触控板双指缩放手势，让 OrbitControls 处理，不要阻止
  if (isTrackpadGesture) {
    // 触控板双指缩放手势，让 OrbitControls 处理场景缩放
    return;
  }

  // 鼠标滚轮事件：检查是否在装饰物上
  const mouse = getMouseNDC(e, sceneSetup.domElement);
  raycaster.setFromCamera(mouse, sceneSetup.camera);

  const decorationSprites = decorationManager.getAllSprites();
  const intersects = raycaster.intersectObjects(decorationSprites);

  if (intersects.length > 0) {
    // 鼠标在装饰物上，缩放装饰物（仅处理鼠标滚轮）
    e.preventDefault();
    e.stopPropagation();
    const decoration = decorationManager.getBySprite(intersects[0].object);
    if (decoration) {
      // 处理鼠标滚轮：deltaMode === 1 表示行模式（鼠标滚轮常用）
      const delta = e.deltaMode === 1 ? e.deltaY : e.deltaY * 0.1;
      decorationManager.scale(decoration, delta);
    }
  }
  // 如果不在装饰物上且不是触控板手势，让 OrbitControls 处理缩放
}, { passive: false });

// 右键删除装饰物
sceneSetup.domElement.addEventListener('contextmenu', (e) => {
  const mouse = getMouseNDC(e, sceneSetup.domElement);
  raycaster.setFromCamera(mouse, sceneSetup.camera);

  const decorationSprites = decorationManager.getAllSprites();
  const intersects = raycaster.intersectObjects(decorationSprites);

  if (intersects.length > 0) {
    e.preventDefault();
    const decoration = decorationManager.getBySprite(intersects[0].object);
    if (decoration) {
      decorationManager.remove(decoration);
    }
  }
});

// ============================================
// UI 控制器绑定
// ============================================
function setupUIControls() {
  // 滑块
  uiManager.setupSlider('bouquet-count', 'bouquet-count-value', (v) => gameState.setBouquetCount(v));
  uiManager.setupSlider('cluster-radius', 'cluster-radius-value', (v) => gameState.clusterRadius = v);
  uiManager.setupSlider('garden-scale', 'garden-scale-value', (v) => gameState.gardenScale = v);
  uiManager.setupSlider('wind-sway', 'wind-sway-value', (v) => gameState.windSway = v);
  uiManager.setupSlider('sway-speed', 'sway-speed-value', (v) => gameState.swaySpeed = v);

  // 复选框
  const randomRotation = getElement('random-rotation');
  const gardenRotate = getElement('garden-rotate');
  if (randomRotation) randomRotation.addEventListener('change', (e) => gameState.randomRotation = e.target.checked);
  if (gardenRotate) gardenRotate.addEventListener('change', (e) => gameState.gardenRotate = e.target.checked);

  // 花束选择
  const plantBouquet = getElement('plant-bouquet');
  if (plantBouquet) {
    plantBouquet.addEventListener('change', (e) => gameState.setSelectedBouquet(e.target.value));
  }

  // 清空花园
  const clearGarden = getElement('clear-garden');
  if (clearGarden) {
    clearGarden.addEventListener('click', () => flowerManager.clearAll());
  }

  // 花束上传
  setupBouquetUpload();

  // 草皮上传
  setupGrassUpload();

  // 天空上传
  setupSkyUpload();

  // 装饰物上传
  setupDecorationUpload();
}

// ============================================
// 花束上传
// ============================================
function setupBouquetUpload() {
  const uploadArea = getElement('upload-area');
  const fileInput = getElement('file-input');
  const preview = getElement('upload-preview');
  const previewImage = getElement('preview-image');
  const nameInput = getElement('bouquet-name-input');
  const cancelBtn = getElement('cancel-upload');
  const confirmBtn = getElement('confirm-upload');

  let pendingImageData = null;

  if (uploadArea) uploadArea.addEventListener('click', () => fileInput?.click());

  if (fileInput) {
    fileInput.addEventListener('change', async () => {
      const file = fileInput.files[0];
      if (!file) return;

      let imageData = await readFileAsDataUrl(file);

      // JPG 自动去背景
      if (file.type.match(/image\/jpe?g/)) {
        imageData = await removeBackgroundFromDataUrl(imageData);
      }

      pendingImageData = imageData;
      if (previewImage) previewImage.src = imageData;
      if (preview) preview.style.display = 'block';
      if (nameInput) {
        nameInput.value = '';
        nameInput.focus();
      }
    });
  }

  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      if (preview) preview.style.display = 'none';
      pendingImageData = null;
      if (fileInput) fileInput.value = '';
    });
  }

  if (confirmBtn) {
    confirmBtn.addEventListener('click', () => {
      const name = nameInput?.value.trim();
      const harvestRule = getElement('agent-rule-input')?.value.trim();

      if (!name) {
        alert('请输入花束名称');
        return;
      }
      if (!harvestRule) {
        alert('请输入采摘规则');
        return;
      }

      // 添加到目录
      if (BOUQUET_CATALOG[name]) {
        BOUQUET_CATALOG[name].images.push(pendingImageData);
      } else {
        BOUQUET_CATALOG[name] = {
          images: [pendingImageData],
          agent: {
            name: getElement('agent-name-input')?.value.trim() || name,
            personality: getElement('agent-personality-input')?.value.trim() || '友好温和',
            harvestRule,
            greeting: getElement('agent-greeting-input')?.value.trim() || `你好呀！我是${name}～`,
            harvestSuccess: getElement('agent-success-input')?.value.trim() || '太棒了！你可以带走我了！'
          }
        };
      }

      updateBouquetUI();

      // 更新 FlowerDescriptor 和 ChatUI 的目录引用
      flowerDescriptor.updateCatalog(BOUQUET_CATALOG);
      chatUI.updateBouquetCatalog(BOUQUET_CATALOG);

      if (preview) preview.style.display = 'none';
      pendingImageData = null;
      if (fileInput) fileInput.value = '';

      eventBus.emit(Events.STATUS_MESSAGE, { message: `花束 "${name}" 添加成功！` });
    });
  }
}

// ============================================
// 草皮上传
// ============================================
function setupGrassUpload() {
  const uploadArea = getElement('grass-upload-area');
  const fileInput = getElement('grass-file-input');
  const preview = getElement('grass-upload-preview');
  const previewImage = getElement('grass-preview-image');
  const nameInput = getElement('grass-name-input');
  const countInput = getElement('grass-count-input');
  const confirmBtn = getElement('grass-confirm-upload');
  const cancelBtn = getElement('grass-cancel-upload');

  let pendingData = null;

  if (uploadArea) uploadArea.addEventListener('click', () => fileInput?.click());

  if (fileInput) {
    fileInput.addEventListener('change', async () => {
      const file = fileInput.files[0];
      if (!file) return;

      const imageData = await readFileAsDataUrl(file);
      pendingData = imageData;
      if (previewImage) previewImage.src = imageData;
      if (preview) preview.style.display = 'block';
      if (nameInput) {
        nameInput.value = '';
        nameInput.focus();
      }
      if (countInput) countInput.value = '1';
    });
  }

  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      if (preview) preview.style.display = 'none';
      pendingData = null;
    });
  }

  if (confirmBtn) {
    confirmBtn.addEventListener('click', async () => {
      const name = nameInput?.value.trim();
      if (!name) {
        alert('请输入草皮名称');
        return;
      }

      const count = parseInt(countInput?.value) || 1;
      GRASS_CATALOG[name] = { url: pendingData, countPerCell: count };
      updateGrassUI();

      // 重新加载草地
      await reloadGrass();

      if (preview) preview.style.display = 'none';
      pendingData = null;

      eventBus.emit(Events.STATUS_MESSAGE, { message: `草皮 "${name}" 添加成功！` });
    });
  }
}

/**
 * 重新加载草地
 */
async function reloadGrass() {
  // 从 GRASS_CATALOG 构建草纹理数组
  const grassTextures = Object.values(GRASS_CATALOG).map(g => ({
    url: g.url,
    count: g.countPerCell
  }));
  await sceneSetup.reloadGrass(grassTextures, grid);
}

// ============================================
// 天空上传
// ============================================
function setupSkyUpload() {
  const uploadArea = getElement('sky-upload-area');
  const fileInput = getElement('sky-file-input');
  const preview = getElement('sky-preview');
  const previewImage = getElement('sky-preview-image');
  const resetBtn = getElement('reset-sky');

  if (uploadArea) uploadArea.addEventListener('click', () => fileInput?.click());

  if (fileInput) {
    fileInput.addEventListener('change', async () => {
      const file = fileInput.files[0];
      if (!file) return;

      const imageData = await readFileAsDataUrl(file);
      if (previewImage) previewImage.src = imageData;
      if (preview) preview.style.display = 'block';

      await sceneSetup.loadSkyBackground(imageData);
      eventBus.emit(Events.STATUS_MESSAGE, { message: '背景已更新' });
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      sceneSetup.resetSkyBackground();
      if (preview) preview.style.display = 'none';
      eventBus.emit(Events.STATUS_MESSAGE, { message: '已恢复默认天空' });
    });
  }
}

// ============================================
// 装饰物上传
// ============================================
function setupDecorationUpload() {
  const uploadArea = getElement('decoration-upload-area');
  const fileInput = getElement('decoration-file-input');
  const preview = getElement('decoration-preview');
  const previewImage = getElement('decoration-preview-image');

  if (uploadArea) uploadArea.addEventListener('click', () => fileInput?.click());

  if (fileInput) {
    fileInput.addEventListener('change', async () => {
      const file = fileInput.files[0];
      if (!file) return;

      const imageData = await readFileAsDataUrl(file);
      pendingDecoration = { url: imageData };

      if (previewImage) previewImage.src = imageData;
      if (preview) preview.style.display = 'block';
      if (uploadArea) uploadArea.classList.add('active');

      eventBus.emit(Events.STATUS_MESSAGE, { message: '点击场景放置装饰物' });
      fileInput.value = '';
    });
  }

  // ESC 取消
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && pendingDecoration) {
      pendingDecoration = null;
      if (preview) preview.style.display = 'none';
      if (uploadArea) uploadArea.classList.remove('active');
      eventBus.emit(Events.STATUS_MESSAGE, { message: '已取消放置装饰物' });
    }
  });
}

// ============================================
// 装饰物目录 UI
// ============================================
function updateDecorationUI() {
  const list = getElement('decoration-list');
  const keys = Object.keys(DECORATION_CATALOG);

  if (!list) return;

  // 辅助函数：获取装饰物的 URL
  const getDecorationUrl = (data) => {
    if (typeof data === 'string') return data;
    return data.url;
  };

  // 辅助函数：检查是否有运动配置
  const hasMotion = (data) => {
    if (typeof data === 'string') return false;
    return !!(data.motions?.length || data.configId);
  };

  if (keys.length === 0) {
    list.innerHTML = '<div class="empty-list">暂无装饰物</div>';
  } else {
    list.innerHTML = keys.map(key => {
      const data = DECORATION_CATALOG[key];
      const url = getDecorationUrl(data);
      const animated = hasMotion(data);
      return `
        <div class="bouquet-item decoration-item${animated ? ' animated' : ''}" data-key="${key}">
          <img class="bouquet-thumb" src="${url}" alt="${key}">
          <div class="bouquet-info">
            <div class="bouquet-name">${key}${animated ? ' ✨' : ''}</div>
          </div>
        </div>
      `;
    }).join('');

    // 点击选择装饰物
    list.querySelectorAll('.decoration-item').forEach(item => {
      item.addEventListener('click', async () => {
        const key = item.dataset.key;
        const data = DECORATION_CATALOG[key];

        // 转换为统一格式
        if (typeof data === 'string') {
          pendingDecoration = { url: data };
        } else {
          pendingDecoration = { ...data };
        }

        const preview = getElement('decoration-preview');
        const previewImage = getElement('decoration-preview-image');
        if (previewImage) previewImage.src = pendingDecoration.url;
        if (preview) preview.style.display = 'block';

        // 高亮选中
        list.querySelectorAll('.decoration-item').forEach(el => el.classList.remove('active'));
        item.classList.add('active');

        const motionHint = hasMotion(data) ? '（带动画）' : '';
        eventBus.emit(Events.STATUS_MESSAGE, { message: `点击场景放置 ${key}${motionHint}` });
      });
    });
  }
}

// ============================================
// UI 更新函数
// ============================================
function updateBouquetUI() {
  const list = getElement('bouquet-list');
  const select = getElement('plant-bouquet');
  const keys = Object.keys(BOUQUET_CATALOG);

  // 更新列表
  if (list) {
    if (keys.length === 0) {
      list.innerHTML = '<div class="empty-list">暂无花束，请上传图片添加</div>';
    } else {
      list.innerHTML = keys.map(key => {
        const data = BOUQUET_CATALOG[key];
        const images = Array.isArray(data) ? data : data.images;
        return `
          <div class="bouquet-item" data-key="${key}">
            <img class="bouquet-thumb" src="${images[0]}" alt="${key}">
            <span class="bouquet-name">${key} (${images.length}张)</span>
          </div>
        `;
      }).join('');

      list.querySelectorAll('.bouquet-item').forEach(item => {
        item.addEventListener('click', () => {
          list.querySelectorAll('.bouquet-item').forEach(i => i.classList.remove('selected'));
          item.classList.add('selected');
          gameState.setSelectedBouquet(item.dataset.key);
          if (select) select.value = item.dataset.key;
        });
      });
    }
  }

  // 更新下拉框
  if (select) {
    select.innerHTML = keys.length === 0
      ? '<option value="">请先添加花束</option>'
      : keys.map(key => `<option value="${key}">${key}</option>`).join('');

    if (!gameState.selectedBouquet && keys.length > 0) {
      gameState.setSelectedBouquet(keys[0]);
      select.value = keys[0];
    }
  }
}

function updateGrassUI() {
  const list = getElement('grass-list');
  const keys = Object.keys(GRASS_CATALOG);

  if (!list) return;

  if (keys.length === 0) {
    list.innerHTML = '<div class="empty-list">暂无草皮素材</div>';
    return;
  }

  list.innerHTML = '';
  keys.forEach(key => {
    const grass = GRASS_CATALOG[key];
    const item = document.createElement('div');
    item.className = 'ground-texture-item';
    item.dataset.key = key;

    const thumb = document.createElement('div');
    thumb.className = 'ground-texture-thumb';
    if (grass.url) thumb.style.backgroundImage = `url(${grass.url})`;
    item.appendChild(thumb);

    const name = document.createElement('span');
    name.className = 'ground-texture-name';
    name.textContent = key;
    name.style.flex = '1';
    item.appendChild(name);

    // 数量控制
    const countWrapper = document.createElement('div');
    countWrapper.style.cssText = 'display: flex; align-items: center; gap: 4px;';

    const countInput = document.createElement('input');
    countInput.type = 'number';
    countInput.min = '0';
    countInput.max = '10';
    countInput.value = grass.countPerCell;
    countInput.style.cssText = 'width: 40px; padding: 2px 4px; font-size: 12px; border: 1px solid #ddd; border-radius: 4px;';
    countInput.addEventListener('change', async (e) => {
      e.stopPropagation();
      const newCount = parseInt(countInput.value) || 0;
      GRASS_CATALOG[key].countPerCell = newCount;
      await reloadGrass();
    });
    countInput.addEventListener('click', (e) => e.stopPropagation());

    const countLabel = document.createElement('span');
    countLabel.textContent = '/格';
    countLabel.style.cssText = 'font-size: 11px; color: #999;';

    countWrapper.appendChild(countInput);
    countWrapper.appendChild(countLabel);
    item.appendChild(countWrapper);

    list.appendChild(item);
  });
}

// ============================================
// 动画循环
// ============================================
let lastTime = 0;

animator.add((time) => {
  // 计算 deltaTime
  const deltaTime = lastTime > 0 ? time - lastTime : 0.016;
  lastTime = time;

  // 更新运动控制器（新模块）
  motionController.update(deltaTime, time);

  // 花朵动画
  flowerManager.updateAnimation(time, gameState.windSway, gameState.swaySpeed);

  // 草地动画
  sceneSetup.updateGrassAnimation(time);

  // 花园缩放
  sceneSetup.setGardenScale(gameState.gardenScale);

  // 花园旋转
  if (gameState.gardenRotate) {
    sceneSetup.rotateGarden(0.002);
  }

  // 渲染
  sceneSetup.render();
});

// ============================================
// 窗口大小调整
// ============================================
window.addEventListener('resize', () => sceneSetup.onResize());

// ============================================
// 初始化
// ============================================
async function init() {
  // 加载默认天空
  await sceneSetup.loadSkyBackground(CONFIG.assets.sky);

  // 初始化 3D 草地（从 GRASS_CATALOG 加载）
  await reloadGrass();

  // 尝试加载保存的状态
  const savedState = stateManager.load();
  if (savedState) {
    console.log('正在恢复保存的花园状态...');

    // 恢复游戏状态
    stateManager.restoreGameState(savedState.gameState, gameState);

    // 恢复花朵
    if (savedState.flowers && savedState.flowers.length > 0) {
      await stateManager.restoreFlowers(savedState.flowers, flowerManager, BOUQUET_CATALOG);
    }

    // 恢复装饰物（需要从 DECORATION_CATALOG 查找 motions 配置）
    if (savedState.decorations && savedState.decorations.length > 0) {
      // 根据 textureUrl 查找 motions 配置
      const findMotionsByUrl = (url) => {
        for (const data of Object.values(DECORATION_CATALOG)) {
          if (typeof data === 'object' && data.url === url && data.motions) {
            return data.motions;
          }
        }
        return null;
      };

      // 为每个装饰物添加 motions 配置
      const decorationsWithMotions = savedState.decorations.map(dec => ({
        ...dec,
        motions: findMotionsByUrl(dec.textureUrl)
      }));

      await stateManager.restoreDecorations(decorationsWithMotions, decorationManager);
    }

    console.log(`已恢复 ${savedState.flowers?.length || 0} 朵花和 ${savedState.decorations?.length || 0} 个装饰物`);
  }

  // 启动自动保存（每 30 秒）
  stateManager.startAutoSave();

  // 初始化 UI
  setupUIControls();
  updateBouquetUI();
  updateGrassUI();
  updateDecorationUI();

  // 更新已种植数量显示
  uiManager.updatePlantedCount(flowerManager.getPlantedCount());

  // 启动动画
  animator.start();

  // 暴露调试对象到 window（方便控制台调试）
  window.garden = {
    stateManager,
    flowerManager,
    decorationManager,
    gameState,
    stateProvider,
    // 手动保存
    save: () => stateManager.save(),
    // 查看保存的数据
    getSavedData: () => JSON.parse(localStorage.getItem('garden_garden_gardenState')),
    // 查看当前状态
    getSnapshot: () => stateProvider.getSnapshot()
  };

  console.log('🌻 语义农场已启动');
  console.log('💡 调试: 在控制台使用 window.garden 访问调试工具');
}

init();
