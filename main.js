/**
 * 语义农场 - 主入口文件
 * Semantic Farm - Main Entry Point
 */

import * as THREE from 'three';
import { CONFIG } from './src/config.js';
import { eventBus, Events } from './src/EventBus.js';
import { Grid } from './src/core/Grid.js';
import { resources } from './src/core/Resources.js';
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

// ============================================
// 花束目录
// ============================================
const BOUQUET_CATALOG = {
  '默认花朵': {
    images: ['assets/pink_flower.jpg'],
    agent: {
      name: '小周',
      personality: '热情开朗，喜欢音乐，特别是周杰伦的歌',
      harvestRule: '说出一首周杰伦的歌名',
      greeting: '嗨！我是小周，一朵热爱音乐的花～你想带我走吗？',
      harvestSuccess: '太棒了！你真的懂音乐！带我走吧！'
    }
  }
};

// 地皮纹理目录
const GROUND_TEXTURE_CATALOG = {
  '默认棕色': null,
  '草地': 'assets/glassnew.jpg'
};

// ============================================
// 初始化
// ============================================
const container = document.getElementById('canvas-container');
const sceneSetup = new SceneSetup(container);
const grid = new Grid();
const flowerManager = new FlowerManager(grid, sceneSetup.gardenGroup, BOUQUET_CATALOG);
const decorationManager = new DecorationManager(sceneSetup.scene);
const chatUI = new ChatUI(BOUQUET_CATALOG);

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
// 点击交互
// ============================================
function onCanvasClick(event) {
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

      if (flowerData.isHarvestable) {
        chatUI.open(flowerData);
      } else {
        const growthProgress = Math.min((Date.now() - flowerData.plantTime) / CONFIG.game.growthTime, 1);
        const secondsLeft = Math.ceil((1 - growthProgress) * CONFIG.game.growthTime / 1000);
        uiManager.showSpeechBubble(screenPos.x, screenPos.y, `还需 ${secondsLeft} 秒成长`);
      }
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
      await flowerManager.plantBouquetInCell(
        cell.col,
        cell.row,
        gameState.selectedBouquet,
        gameState.bouquetCount
      );
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

sceneSetup.domElement.addEventListener('mousemove', (event) => {
  if (isPlanting && event.shiftKey) {
    tryPlantAtPosition(event.clientX, event.clientY);
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
let pendingDecorationImage = null;

sceneSetup.domElement.addEventListener('mousedown', (e) => {
  if (e.button !== 0 || e.shiftKey) return;

  const mouse = getMouseNDC(e, sceneSetup.domElement);
  raycaster.setFromCamera(mouse, sceneSetup.camera);

  // 放置装饰物
  if (pendingDecorationImage) {
    const intersects = raycaster.intersectObject(sceneSetup.groundPlane);
    const position = intersects.length > 0
      ? new THREE.Vector3(intersects[0].point.x, 1, intersects[0].point.z)
      : new THREE.Vector3(0, 1, 0);

    decorationManager.create(pendingDecorationImage, position);
    pendingDecorationImage = null;

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

sceneSetup.domElement.addEventListener('mousemove', (e) => {
  if (!decorationManager.isDragging) return;

  const mouse = getMouseNDC(e, sceneSetup.domElement);
  raycaster.setFromCamera(mouse, sceneSetup.camera);

  const intersects = raycaster.intersectObject(sceneSetup.groundPlane);
  if (intersects.length > 0) {
    decorationManager.updateDragPosition(intersects[0].point.x, intersects[0].point.z);
  }
});

window.addEventListener('mouseup', () => {
  if (decorationManager.isDragging) {
    decorationManager.endDrag();
    sceneSetup.controls.enabled = true;
  }
});

// 滚轮缩放装饰物
sceneSetup.domElement.addEventListener('wheel', (e) => {
  const mouse = getMouseNDC(e, sceneSetup.domElement);
  raycaster.setFromCamera(mouse, sceneSetup.camera);

  const decorationSprites = decorationManager.getAllSprites();
  const intersects = raycaster.intersectObjects(decorationSprites);

  if (intersects.length > 0) {
    e.preventDefault();
    const decoration = decorationManager.getBySprite(intersects[0].object);
    if (decoration) {
      decorationManager.scale(decoration, e.deltaY);
    }
  }
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

  // 地皮上传
  setupGroundUpload();

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
      if (preview) preview.style.display = 'none';
      pendingImageData = null;
      if (fileInput) fileInput.value = '';

      eventBus.emit(Events.STATUS_MESSAGE, { message: `花束 "${name}" 添加成功！` });
    });
  }
}

// ============================================
// 地皮上传
// ============================================
function setupGroundUpload() {
  const uploadArea = getElement('ground-upload-area');
  const fileInput = getElement('ground-file-input');
  const preview = getElement('ground-upload-preview');
  const previewImage = getElement('ground-preview-image');
  const nameInput = getElement('ground-texture-name');
  const confirmBtn = getElement('ground-confirm-upload');
  const cancelBtn = getElement('ground-cancel-upload');

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
        alert('请输入纹理名称');
        return;
      }

      GROUND_TEXTURE_CATALOG[name] = pendingData;
      updateGroundTextureUI();

      // 应用纹理
      const texture = await resources.loadTexture(pendingData);
      sceneSetup.setGroundTexture(texture);

      if (preview) preview.style.display = 'none';
      pendingData = null;

      eventBus.emit(Events.STATUS_MESSAGE, { message: `地皮纹理 "${name}" 添加成功！` });
    });
  }
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
      pendingDecorationImage = imageData;

      if (previewImage) previewImage.src = imageData;
      if (preview) preview.style.display = 'block';
      if (uploadArea) uploadArea.classList.add('active');

      eventBus.emit(Events.STATUS_MESSAGE, { message: '点击场景放置装饰物' });
      fileInput.value = '';
    });
  }

  // ESC 取消
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && pendingDecorationImage) {
      pendingDecorationImage = null;
      if (preview) preview.style.display = 'none';
      if (uploadArea) uploadArea.classList.remove('active');
      eventBus.emit(Events.STATUS_MESSAGE, { message: '已取消放置装饰物' });
    }
  });
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

function updateGroundTextureUI() {
  const list = getElement('ground-texture-list');
  const keys = Object.keys(GROUND_TEXTURE_CATALOG);

  if (!list) return;

  if (keys.length === 0) {
    list.innerHTML = '<div class="empty-list">暂无地皮素材</div>';
    return;
  }

  list.innerHTML = '';
  keys.forEach(key => {
    const url = GROUND_TEXTURE_CATALOG[key];
    const item = document.createElement('div');
    item.className = 'ground-texture-item';
    item.dataset.key = key;

    const thumb = document.createElement('div');
    thumb.className = 'ground-texture-thumb';
    if (url) thumb.style.backgroundImage = `url(${url})`;
    item.appendChild(thumb);

    const name = document.createElement('span');
    name.className = 'ground-texture-name';
    name.textContent = key;
    item.appendChild(name);

    item.addEventListener('click', async () => {
      list.querySelectorAll('.ground-texture-item').forEach(i => i.classList.remove('selected'));
      item.classList.add('selected');

      if (url) {
        const texture = await resources.loadTexture(url);
        sceneSetup.setGroundTexture(texture);
      } else {
        sceneSetup.setGroundTexture(null);
      }
    });

    list.appendChild(item);
  });
}

// ============================================
// 动画循环
// ============================================
animator.add((time) => {
  // 花朵动画
  flowerManager.updateAnimation(time, gameState.windSway, gameState.swaySpeed);

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

  // 加载默认地皮纹理
  const groundTexture = await resources.loadTexture(CONFIG.assets.ground);
  sceneSetup.setGroundTexture(groundTexture);

  // 初始化 UI
  setupUIControls();
  updateBouquetUI();
  updateGroundTextureUI();

  // 启动动画
  animator.start();

  console.log('🌻 语义农场已启动');
}

init();
