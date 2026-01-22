import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// ============================================
// BOUQUET_CATALOG: 花束 key -> { images, agent }
// ============================================
const BOUQUET_CATALOG = {
  '默认花朵': {
    images: ['pink_flower.jpg'],
    agent: {
      name: '小周',
      personality: '热情开朗，喜欢音乐，特别是周杰伦的歌',
      harvestRule: '说出一首周杰伦的歌名',
      greeting: '嗨！我是小周，一朵热爱音乐的花～你想带我走吗？',
      harvestSuccess: '太棒了！你真的懂音乐！带我走吧！'
    }
  },
  // 用户上传后会动态添加:
  // '玫瑰': { images: [...], agent: {...} }
};

// ============================================
// 裁判 Agent API 配置
// ============================================
const JUDGE_API = {
  url: 'https://ark.cn-beijing.volces.com/api/v3/responses',
  token: '2bce5331-d480-4141-b0dc-23f3d7e5e185',
  model: 'doubao-seed-1-8-251228'
};

// ============================================
// 网格配置 (3列 × 2行)
// ============================================
const GRID_COLS = 3;
const GRID_ROWS = 2;
const CELL_WIDTH = 2;  // 每个格子宽度
const CELL_DEPTH = 2;  // 每个格子深度

// 记录每个格子是否已种植 (3×2 = 6个格子)
// plantedCells[row][col] = true/false
const plantedCells = Array(GRID_ROWS).fill(null).map(() => Array(GRID_COLS).fill(false));

// ============================================
// 地皮纹理配置
// ============================================
const GROUND_TEXTURE_CATALOG = {
  '默认棕色': null,  // null 表示使用纯色
  '草地': 'glassnew.jpg',  // 默认草地纹理
  // 用户上传后会动态添加:
  // '石板': 'data:image/png;base64,...'
};

// 每个格子的地皮纹理 [row][col] = textureKey
const cellGroundTextures = Array(GRID_ROWS).fill(null).map(() =>
  Array(GRID_COLS).fill('草地')
);

// 每个格子的地面 Mesh 引用 [row][col]
const cellGroundMeshes = Array(GRID_ROWS).fill(null).map(() =>
  Array(GRID_COLS).fill(null)
);

// 当前选中的地皮格子
let selectedGroundCell = null;

// 待上传的地皮纹理数据
let pendingGroundTextureData = null;

// ============================================
// 成长配置
// ============================================
const GROWTH_TIME = 10000;  // 成长时间 10秒 (毫秒)
const HARVEST_GOLD = 10;    // 采摘获得金币数

// ============================================
// 采摘工具定义
// ============================================
const HARVEST_TOOL = {
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
};

/**
 * 生成 Agent 的 System Prompt
 */
function generateAgentSystemPrompt(agentConfig) {
  return `你是一个名叫"${agentConfig.name}"的植物精灵。

## 你的人格
${agentConfig.personality}

## 采摘规则
你正在被一个人类尝试采摘。只有当对方满足以下条件时，你才会同意被采摘：
${agentConfig.harvestRule}

## 你的行为准则
1. 用友好但略带俏皮的方式与人类对话
2. 可以给出提示，但不能直接告诉对方采摘条件
3. 当对方满足采摘条件时，必须调用 harvest 工具
4. 当不满足条件时，继续聊天但不同意采摘
5. 每次回复保持简短（不超过50字），像真正的植物精灵一样说话

## 重要
只有调用 harvest 工具才能真正完成采摘。如果对方满足条件但你没有调用 harvest 工具，采摘不会成功。`;
}

/**
 * 对话会话类 - 管理与单株花朵的多轮对话
 */
class FlowerConversation {
  constructor(flowerData, bouquetKey) {
    this.flowerData = flowerData;
    this.bouquetKey = bouquetKey;
    this.agentConfig = this.getAgentConfig();
    this.messages = [];
    this.isHarvested = false;
    this.createdAt = Date.now();
  }

  getAgentConfig() {
    const bouquetData = BOUQUET_CATALOG[this.bouquetKey];

    if (bouquetData?.agent) {
      return bouquetData.agent;
    }

    // 兼容旧数据
    return {
      name: '小花',
      personality: '友好温和',
      harvestRule: bouquetData?.defaultPrompt || '真诚地对待我',
      greeting: '你好呀！',
      harvestSuccess: '好的，你可以采摘我了！'
    };
  }

  getGreeting() {
    return this.agentConfig.greeting;
  }

  addUserMessage(content) {
    this.messages.push({ role: 'user', content });
  }

  addAssistantMessage(content) {
    this.messages.push({ role: 'assistant', content });
  }

  getMessagesForAPI() {
    return this.messages.map(msg => ({
      role: msg.role,
      content: [{ type: 'input_text', text: msg.content }]
    }));
  }

  markHarvested() {
    this.isHarvested = true;
  }
}

/**
 * 会话管理器 - 管理所有活跃的对话会话
 */
class ConversationManager {
  constructor() {
    this.conversations = new Map();
  }

  getFlowerId(flowerData) {
    return `${flowerData.plantTime}_${flowerData.cellCol}_${flowerData.cellRow}`;
  }

  getOrCreateConversation(flowerData, bouquetKey) {
    const flowerId = this.getFlowerId(flowerData);

    if (!this.conversations.has(flowerId)) {
      this.conversations.set(flowerId, new FlowerConversation(flowerData, bouquetKey));
    }

    return this.conversations.get(flowerId);
  }

  endConversation(flowerData) {
    const flowerId = this.getFlowerId(flowerData);
    this.conversations.delete(flowerId);
  }
}

const conversationManager = new ConversationManager();

/**
 * 与花朵 Agent 对话
 * @param {FlowerConversation} conversation - 对话会话
 * @param {string} userInput - 用户输入
 * @returns {Promise<{text: string, harvested: boolean, reason?: string}>}
 */
async function chatWithFlower(conversation, userInput) {
  conversation.addUserMessage(userInput);

  const systemPrompt = generateAgentSystemPrompt(conversation.agentConfig);

  try {
    const response = await fetch(JUDGE_API.url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${JUDGE_API.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: JUDGE_API.model,
        instructions: systemPrompt,
        input: conversation.getMessagesForAPI(),
        tools: [HARVEST_TOOL]
      })
    });

    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status}`);
    }

    const data = await response.json();
    return parseAgentResponse(data, conversation);

  } catch (error) {
    console.error('花朵对话失败:', error);
    return {
      text: '（花朵似乎走神了...）',
      harvested: false
    };
  }
}

/**
 * 解析 Agent 响应
 */
function parseAgentResponse(data, conversation) {
  let responseText = '';
  let harvested = false;
  let harvestReason = '';

  if (Array.isArray(data.output)) {
    for (const item of data.output) {
      // 处理文本消息
      if (item.type === 'message') {
        const content = item.content;
        if (Array.isArray(content)) {
          for (const c of content) {
            if (c.type === 'output_text' || c.type === 'text') {
              responseText += c.text;
            }
          }
        }
      }

      // 检测工具调用
      if (item.type === 'function_call' || item.type === 'tool_use') {
        const toolName = item.name || item.function?.name;
        if (toolName === 'harvest') {
          harvested = true;
          const args = typeof item.arguments === 'string'
            ? JSON.parse(item.arguments)
            : (item.arguments || item.function?.arguments || {});
          harvestReason = args.reason || '满足采摘条件';
        }
      }
    }
  }

  // 如果没有文本但有工具调用，使用成功语
  if (!responseText && harvested) {
    responseText = conversation.agentConfig.harvestSuccess;
  }

  if (responseText) {
    conversation.addAssistantMessage(responseText);
  }

  return {
    text: responseText,
    harvested: harvested,
    reason: harvestReason
  };
}

// ============================================
// 全局状态
// ============================================
const state = {
  selectedBouquet: '',
  bouquetCount: 5,
  clusterRadius: 0.5,
  gardenScale: 1,
  windSway: 0.1,
  swaySpeed: 1.5,
  randomRotation: false,
  gardenRotate: false,
  plantedCount: 0,
  loadingCount: 0,
  loadedCount: 0,
  gold: 0  // 金币数量
};

// 纹理缓存
const textureCache = new Map();
const textureLoader = new THREE.TextureLoader();

// 所有花朵精灵及其动画参数
// 每个花朵: { sprite, phaseOffset, baseRotation, plantTime, isHarvestable }
const flowers = [];

// 当前聊天的花朵信息
let currentChatFlower = null;

// ============================================
// 装饰物系统
// ============================================
const decorations = [];
let selectedDecoration = null;
let isDraggingDecoration = false;

// ============================================
// 创建渐变天空纹理
// ============================================
function createGradientSkyTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 2;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // 从上到下: 天蓝 → 浅蓝/白
  const gradient = ctx.createLinearGradient(0, 0, 0, 512);
  gradient.addColorStop(0, '#87CEEB');    // 天蓝色 (顶部)
  gradient.addColorStop(0.5, '#B0E0E6');  // 粉蓝色 (中间)
  gradient.addColorStop(1, '#E0F6FF');    // 近白色 (底部/地平线)

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 2, 512);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// ============================================
// Three.js 初始化
// ============================================
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();

// 默认天空背景（使用图片）
let defaultSkyTexture = createGradientSkyTexture(); // 先用渐变作为占位

// 加载粉色天空图片
new THREE.TextureLoader().load('pink_sky.jpg', (texture) => {
  texture.colorSpace = THREE.SRGBColorSpace;
  defaultSkyTexture = texture;
  scene.background = texture;
});
scene.background = defaultSkyTexture;

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 5, 8);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;  // 确保颜色正确显示
renderer.toneMapping = THREE.ACESFilmicToneMapping; // 使用电影级色调映射
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true; // 开启阴影
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // 柔和阴影
container.appendChild(renderer.domElement);

// OrbitControls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minPolarAngle = 0.1;
controls.maxPolarAngle = Math.PI / 2 - 0.1;
controls.minDistance = 3;
controls.maxDistance = 20;

// 光照（提亮场景）
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); // 降低环境光，增加对比度
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5); // 增强主光源
directionalLight.position.set(10, 20, 10);
directionalLight.castShadow = true; // 产生阴影
directionalLight.shadow.mapSize.width = 2048; // 阴影清晰度
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 50;
directionalLight.shadow.camera.left = -20;
directionalLight.shadow.camera.right = 20;
directionalLight.shadow.camera.top = 20;
directionalLight.shadow.camera.bottom = -20;
directionalLight.shadow.bias = -0.0001; // 减少阴影伪影
scene.add(directionalLight);

// 添加雾效，营造深度感 (颜色与天空底部接近)
scene.fog = new THREE.FogExp2(0xE0F6FF, 0.02);

// ============================================
// 花园地面 (3×2 网格)
// ============================================
const GARDEN_WIDTH = GRID_COLS * CELL_WIDTH;  // 6
const GARDEN_DEPTH = GRID_ROWS * CELL_DEPTH;  // 4

// 地面高度（平面）
const GROUND_Y = 0;

// 创建整体地面（一个大平面，纹理平铺）
const groundGeometry = new THREE.PlaneGeometry(GARDEN_WIDTH, GARDEN_DEPTH);
const groundMaterial = new THREE.MeshBasicMaterial({
  color: 0xffffff
});
const groundPlane = new THREE.Mesh(groundGeometry, groundMaterial);
groundPlane.rotation.x = -Math.PI / 2;
groundPlane.position.y = GROUND_Y;
scene.add(groundPlane);

// 用于射线检测的引用
const basePlane = groundPlane;

// 存储地面 mesh 引用（兼容旧代码）
for (let row = 0; row < GRID_ROWS; row++) {
  for (let col = 0; col < GRID_COLS; col++) {
    cellGroundMeshes[row][col] = groundPlane;
  }
}

// 创建淡色虚线网格
function createDashedGrid() {
  const gridGroup = new THREE.Group();

  // 虚线材质（非常淡的灰色）
  const dashMaterial = new THREE.LineDashedMaterial({
    color: 0xcccccc,
    dashSize: 0.1,
    gapSize: 0.1,
    opacity: 0.5,
    transparent: true
  });

  // 垂直线（分隔列）
  for (let i = 1; i < GRID_COLS; i++) {
    const x = -GARDEN_WIDTH / 2 + i * CELL_WIDTH;
    const points = [
      new THREE.Vector3(x, 0.01, -GARDEN_DEPTH / 2),
      new THREE.Vector3(x, 0.01, GARDEN_DEPTH / 2)
    ];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geometry, dashMaterial);
    line.computeLineDistances(); // 虚线需要这个
    gridGroup.add(line);
  }

  // 水平线（分隔行）
  for (let i = 1; i < GRID_ROWS; i++) {
    const z = -GARDEN_DEPTH / 2 + i * CELL_DEPTH;
    const points = [
      new THREE.Vector3(-GARDEN_WIDTH / 2, 0.01, z),
      new THREE.Vector3(GARDEN_WIDTH / 2, 0.01, z)
    ];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geometry, dashMaterial);
    line.computeLineDistances();
    gridGroup.add(line);
  }

  return gridGroup;
}

const dashedGrid = createDashedGrid();
scene.add(dashedGrid);

// 兼容旧代码的变量
const groundCellsGroup = new THREE.Group();
groundCellsGroup.add(groundPlane);
scene.add(groundCellsGroup);

// 花园组 (所有花朵放入此组)
const gardenGroup = new THREE.Group();
scene.add(gardenGroup);

// ============================================
// 占位纹理 (加载失败时使用)
// ============================================
function createPlaceholderTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');

  // 绘制简单的花朵形状
  ctx.fillStyle = '#ff69b4';
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const angle = (i * 72 - 90) * Math.PI / 180;
    const x = 32 + Math.cos(angle) * 20;
    const y = 24 + Math.sin(angle) * 20;
    ctx.arc(x, y, 12, 0, Math.PI * 2);
  }
  ctx.fill();

  // 花心
  ctx.fillStyle = '#ffff00';
  ctx.beginPath();
  ctx.arc(32, 24, 8, 0, Math.PI * 2);
  ctx.fill();

  // 茎
  ctx.strokeStyle = '#228b22';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(32, 36);
  ctx.lineTo(32, 64);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

const placeholderTexture = createPlaceholderTexture();

// ============================================
// 纹理加载 (带缓存)
// ============================================
async function loadTexture(url) {
  if (textureCache.has(url)) {
    return textureCache.get(url);
  }

  state.loadingCount++;
  updateLoadingStatus();

  return new Promise((resolve) => {
    textureLoader.load(
      url,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        textureCache.set(url, texture);
        state.loadedCount++;
        updateLoadingStatus();
        resolve(texture);
      },
      undefined,
      (error) => {
        console.warn('加载纹理失败:', url, error);
        state.loadedCount++;
        updateLoadingStatus();
        resolve(placeholderTexture);
      }
    );
  });
}

// ============================================
// 处理图片透明度 (移除白色/灰色棋盘格背景)
// ============================================

// 核心算法：检测并移除灰色/白色背景
function processImageData(data) {
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // 计算 RGB 通道之间的最大差异
    const maxDiff = Math.max(
      Math.abs(r - g),
      Math.abs(g - b),
      Math.abs(r - b)
    );

    // 灰色/白色背景特征：
    // 1. RGB 三通道值相近（差异 < 20）
    // 2. 值在灰色到白色范围内（155-255）
    const isGrayish = maxDiff < 20;
    const inGrayRange = r >= 155 && r <= 255 &&
                        g >= 155 && g <= 255 &&
                        b >= 155 && b <= 255;

    if (isGrayish && inGrayRange) {
      data[i + 3] = 0; // 设置 alpha 为 0（透明）
    }
  }
}

// 处理 Three.js 纹理
function processTextureForTransparency(texture) {
  const image = texture.image;
  if (!image) return texture;

  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  processImageData(imageData.data);
  ctx.putImageData(imageData, 0, 0);

  const newTexture = new THREE.CanvasTexture(canvas);
  newTexture.colorSpace = THREE.SRGBColorSpace;
  newTexture.needsUpdate = true;
  return newTexture;
}

// 处理 Data URL（用于上传时预处理 JPG）
function removeBackgroundFromDataUrl(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      processImageData(imageData.data);
      ctx.putImageData(imageData, 0, 0);

      // 返回处理后的 PNG Data URL
      resolve(canvas.toDataURL('image/png'));
    };
    img.src = dataUrl;
  });
}

// ============================================
// 地皮纹理管理
// ============================================

// 更新整个地面的纹理（一张图平铺整个地皮）
async function updateGroundTexture(textureKey) {
  const textureUrl = GROUND_TEXTURE_CATALOG[textureKey];

  if (!textureUrl) {
    groundPlane.material.map = null;
    groundPlane.material.color.setHex(0x8B4513);
  } else {
    const texture = await loadTexture(textureUrl);
    // 不重复平铺，一张图覆盖整个地面
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    groundPlane.material.map = texture;
    groundPlane.material.color.setHex(0xffffff);
  }
  groundPlane.material.needsUpdate = true;

  // 更新所有格子的状态
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      cellGroundTextures[row][col] = textureKey;
    }
  }

  updateGroundCellGridUI();
}

// 兼容旧代码：更新单个格子实际上更新整个地面
async function updateCellGroundTexture(col, row, textureKey) {
  await updateGroundTexture(textureKey);
}

// 选择地皮格子
function selectGroundCell(col, row) {
  selectedGroundCell = { col, row };

  // 更新 UI 显示
  const info = document.getElementById('ground-cell-info');
  if (info) {
    info.textContent = `已选择: 格子 (${col + 1}, ${row + 1})`;
  }

  // 更新格子选中状态
  updateGroundCellGridUI();
}

// 更新格子选择 UI
function updateGroundCellGridUI() {
  const grid = document.getElementById('ground-cell-grid');
  if (!grid) return;

  grid.innerHTML = '';

  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      const item = document.createElement('div');
      item.className = 'ground-cell-grid-item';
      item.dataset.row = row;
      item.dataset.col = col;

      // 检查是否选中
      if (selectedGroundCell && selectedGroundCell.col === col && selectedGroundCell.row === row) {
        item.classList.add('selected');
      }

      // 显示纹理缩略图
      const textureKey = cellGroundTextures[row][col];
      const textureUrl = GROUND_TEXTURE_CATALOG[textureKey];
      if (textureUrl) {
        item.style.backgroundImage = `url(${textureUrl})`;
      }

      // 标签
      const label = document.createElement('span');
      label.className = 'cell-label';
      label.textContent = `${col + 1},${row + 1}`;
      item.appendChild(label);

      // 点击事件
      item.addEventListener('click', () => selectGroundCell(col, row));

      grid.appendChild(item);
    }
  }
}

// 更新纹理列表 UI
function updateGroundTextureList() {
  const list = document.getElementById('ground-texture-list');
  if (!list) return;

  const keys = Object.keys(GROUND_TEXTURE_CATALOG);

  if (keys.length === 0) {
    list.innerHTML = '<div class="empty-list">暂无地皮素材，请上传图片添加</div>';
    return;
  }

  list.innerHTML = '';

  keys.forEach(key => {
    const url = GROUND_TEXTURE_CATALOG[key];

    const item = document.createElement('div');
    item.className = 'ground-texture-item';
    item.dataset.key = key;

    // 缩略图
    const thumb = document.createElement('div');
    thumb.className = 'ground-texture-thumb';
    if (url) {
      thumb.style.backgroundImage = `url(${url})`;
    }
    item.appendChild(thumb);

    // 名称
    const name = document.createElement('span');
    name.className = 'ground-texture-name';
    name.textContent = key;
    item.appendChild(name);

    // 点击应用纹理
    item.addEventListener('click', () => {
      // 移除其他选中状态
      list.querySelectorAll('.ground-texture-item').forEach(i => i.classList.remove('selected'));
      item.classList.add('selected');

      if (!selectedGroundCell) {
        showStatus('请先在下方选择一个格子');
        return;
      }
      updateCellGroundTexture(selectedGroundCell.col, selectedGroundCell.row, key);
      showStatus(`格子 (${selectedGroundCell.col + 1}, ${selectedGroundCell.row + 1}) 地皮已更新为 "${key}"`);
    });

    list.appendChild(item);
  });
}

// 处理地皮纹理文件上传
function handleGroundTextureFile(file) {
  if (!file.type.match(/image\/(png|jpe?g)/)) {
    alert('请选择 PNG 或 JPG 图片文件');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      // 检查是否为正方形
      if (Math.abs(img.width - img.height) > 10) {
        const proceed = confirm(
          `图片不是正方形 (${img.width}×${img.height})，可能会变形。是否继续？`
        );
        if (!proceed) return;
      }

      // 显示预览
      pendingGroundTextureData = e.target.result;
      const preview = document.getElementById('ground-upload-preview');
      const previewImg = document.getElementById('ground-preview-image');
      const nameInput = document.getElementById('ground-texture-name');

      if (preview && previewImg) {
        previewImg.src = pendingGroundTextureData;
        preview.style.display = 'block';
        if (nameInput) {
          nameInput.value = '';
          nameInput.focus();
        }
      }
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// 确认添加地皮纹理
function confirmGroundTexture() {
  const nameInput = document.getElementById('ground-texture-name');
  const name = nameInput ? nameInput.value.trim() : '';

  if (!name) {
    alert('请输入纹理名称');
    return;
  }

  if (GROUND_TEXTURE_CATALOG[name]) {
    alert('该名称已存在，请使用其他名称');
    return;
  }

  // 添加到目录
  GROUND_TEXTURE_CATALOG[name] = pendingGroundTextureData;

  // 更新 UI
  updateGroundTextureList();

  // 隐藏预览
  const preview = document.getElementById('ground-upload-preview');
  if (preview) preview.style.display = 'none';
  pendingGroundTextureData = null;

  showStatus(`地皮纹理 "${name}" 添加成功！`);

  // 如果有选中的格子，自动应用
  if (selectedGroundCell) {
    updateCellGroundTexture(selectedGroundCell.col, selectedGroundCell.row, name);
  }
}

// 取消上传地皮纹理
function cancelGroundTextureUpload() {
  const preview = document.getElementById('ground-upload-preview');
  if (preview) preview.style.display = 'none';
  pendingGroundTextureData = null;
}

// ============================================
// 种植花朵
// ============================================
async function plantFlower(position, textureUrl, randomRot = false, cellCol = -1, cellRow = -1, bouquetKey = '默认花朵', fixedRotation = null) {
  let texture = await loadTexture(textureUrl);

  // 处理透明度 (移除白色背景)
  texture = processTextureForTransparency(texture);

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    alphaTest: 0.05,
    color: 0xffffff
  });

  const sprite = new THREE.Sprite(material);

  // 底部为轴点
  sprite.center.set(0.5, 0);

  // 随机大小
  const scale = 0.5 + Math.random() * 0.5;
  sprite.scale.set(scale, scale * 1.5, 1);

  // 位置（放在地面上）
  sprite.position.copy(position);
  sprite.position.y = GROUND_Y;

  // 花朵数据 (包含成长状态和所属格子)
  const flowerData = {
    sprite,
    phaseOffset: Math.random() * Math.PI * 2,
    baseRotation: fixedRotation !== null ? fixedRotation : (randomRot ? (Math.random() - 0.5) * 0.5 : 0),
    plantTime: Date.now(),      // 种植时间
    isHarvestable: false,       // 是否可采摘
    originalScale: scale,       // 原始大小
    cellCol,                    // 所属格子列
    cellRow,                    // 所属格子行
    bouquetKey                  // 花束类型键（用于查找 agent 配置）
  };

  flowers.push(flowerData);
  gardenGroup.add(sprite);

  state.plantedCount++;
  updatePlantedCount();

  return flowerData;
}

// ============================================
// 网格辅助函数
// ============================================

// 根据世界坐标获取格子索引 (col, row)
function getGridCell(worldX, worldZ) {
  // 转换到格子坐标系 (左上角为0,0)
  const localX = worldX + GARDEN_WIDTH / 2;
  const localZ = worldZ + GARDEN_DEPTH / 2;

  const col = Math.floor(localX / CELL_WIDTH);
  const row = Math.floor(localZ / CELL_DEPTH);

  // 检查是否在有效范围内
  if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) {
    return null;
  }

  return { col, row };
}

// 获取格子中心的世界坐标
function getCellCenter(col, row) {
  const x = -GARDEN_WIDTH / 2 + col * CELL_WIDTH + CELL_WIDTH / 2;
  const z = -GARDEN_DEPTH / 2 + row * CELL_DEPTH + CELL_DEPTH / 2;
  return new THREE.Vector3(x, 0, z);
}

// 种植一簇花朵到指定格子
async function plantBouquetInCell(col, row, bouquetKey, count, radius, dense = false) {
  // 检查格子是否已种植
  if (plantedCells[row][col]) {
    showStatus('该格子已种植！');
    return;
  }

  const bouquetData = BOUQUET_CATALOG[bouquetKey];
  if (!bouquetData) return;

  // 兼容新旧数据结构
  const images = Array.isArray(bouquetData) ? bouquetData : bouquetData.images;
  if (!images || images.length === 0) return;

  // 标记格子为已种植
  plantedCells[row][col] = true;

  // 获取格子中心
  const centerPos = getCellCenter(col, row);

  const actualCount = dense ? count * 2 : count;
  const actualRadius = dense ? radius * 0.5 : radius;

  // 限制半径不超过格子大小的一半
  const maxRadius = Math.min(CELL_WIDTH, CELL_DEPTH) / 2 - 0.1;
  const clampedRadius = Math.min(actualRadius, maxRadius);

  // 所有花根部在同一点（格子中心），但朝向不同，像一束花
  for (let i = 0; i < actualCount; i++) {
    // 花朵位置：都在格子中心
    const pos = new THREE.Vector3(centerPos.x, 0, centerPos.z);

    // 随机选择图片
    const imgUrl = images[Math.floor(Math.random() * images.length)];

    // 每朵花有不同的旋转角度（像扇形散开）
    const spreadAngle = (i / actualCount - 0.5) * Math.PI * 0.28; // -25° 到 +25°
    const randomOffset = (Math.random() - 0.5) * 0.1; // 加一点随机偏移
    const rotation = spreadAngle + randomOffset;

    await plantFlower(pos, imgUrl, true, col, row, bouquetKey, rotation);
  }

  showStatus(`在格子 (${col + 1}, ${row + 1}) 种植成功！`);
}

// ============================================
// Raycaster (点击检测)
// ============================================
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// 气泡相关
const speechBubble = document.getElementById('speech-bubble');
let speechBubbleTimeout = null;

// 显示花朵对话气泡
function showSpeechBubble(screenX, screenY, message = '你好') {
  // 清除之前的定时器
  if (speechBubbleTimeout) {
    clearTimeout(speechBubbleTimeout);
  }

  // 设置气泡内容和位置
  speechBubble.textContent = message;
  speechBubble.style.left = screenX + 'px';
  speechBubble.style.top = (screenY - 60) + 'px';
  speechBubble.style.transform = 'translateX(-50%)';

  // 显示气泡
  speechBubble.classList.add('visible');

  // 2秒后隐藏
  speechBubbleTimeout = setTimeout(() => {
    speechBubble.classList.remove('visible');
  }, 2000);
}

// 将3D坐标转换为屏幕坐标
function toScreenPosition(position) {
  const vector = position.clone();
  vector.project(camera);

  const rect = renderer.domElement.getBoundingClientRect();
  return {
    x: (vector.x * 0.5 + 0.5) * rect.width + rect.left,
    y: (-vector.y * 0.5 + 0.5) * rect.height + rect.top
  };
}

// 更新金币显示
function updateGoldDisplay() {
  const goldValue = document.getElementById('gold-value');
  const goldDisplay = document.getElementById('gold-display');
  goldValue.textContent = state.gold;

  // 添加动画效果
  goldDisplay.classList.remove('animate');
  void goldDisplay.offsetWidth; // 触发 reflow
  goldDisplay.classList.add('animate');
}

// 显示采摘飘字
function showHarvestPopup(screenX, screenY, amount) {
  const popup = document.createElement('div');
  popup.className = 'harvest-popup';
  popup.textContent = `+${amount}`;
  popup.style.left = screenX + 'px';
  popup.style.top = screenY + 'px';
  document.body.appendChild(popup);

  // 动画结束后移除
  setTimeout(() => popup.remove(), 1000);
}

// 采摘整个格子的花朵
function harvestCell(cellCol, cellRow, screenPos) {
  // 找到该格子内所有可采摘的花朵
  const cellFlowers = flowers.filter(f =>
    f.cellCol === cellCol && f.cellRow === cellRow && f.isHarvestable
  );

  if (cellFlowers.length === 0) return;

  // 移除所有花朵
  cellFlowers.forEach(flowerData => {
    const { sprite } = flowerData;
    gardenGroup.remove(sprite);
    sprite.material.dispose();

    // 从数组中移除
    const index = flowers.indexOf(flowerData);
    if (index > -1) {
      flowers.splice(index, 1);
    }

    state.plantedCount--;
  });

  // 重置格子状态，允许重新种植
  plantedCells[cellRow][cellCol] = false;

  // 计算总金币 (每朵花 HARVEST_GOLD)
  const totalGold = cellFlowers.length * HARVEST_GOLD;
  state.gold += totalGold;
  updateGoldDisplay();
  updatePlantedCount();

  // 显示采摘飘字
  showHarvestPopup(screenPos.x, screenPos.y, totalGold);
  showStatus(`采摘了 ${cellFlowers.length} 朵花，获得 ${totalGold} 金币！`);
}

// 点击花朵：采摘或对话
function onCanvasClick(event) {
  // 如果按住 Shift，不触发花朵点击（用于种植）
  if (event.shiftKey) return;

  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  const flowerSprites = flowers.map(f => f.sprite);
  const flowerIntersects = raycaster.intersectObjects(flowerSprites);

  if (flowerIntersects.length > 0) {
    const clickedSprite = flowerIntersects[0].object;

    // 找到对应的花朵数据
    const flowerData = flowers.find(f => f.sprite === clickedSprite);

    if (flowerData) {
      const flowerTop = clickedSprite.position.clone();
      flowerTop.y += clickedSprite.scale.y;
      const screenPos = toScreenPosition(flowerTop);

      if (flowerData.isHarvestable) {
        // 可采摘：打开聊天界面
        openFlowerChat(flowerData);
      } else {
        // 成长中：显示对话
        const growthProgress = Math.min((Date.now() - flowerData.plantTime) / GROWTH_TIME, 1);
        const secondsLeft = Math.ceil((1 - growthProgress) * GROWTH_TIME / 1000);
        showSpeechBubble(screenPos.x, screenPos.y, `还需 ${secondsLeft} 秒成长`);
      }
    }
  }
}

// Shift + 点击/拖拽种植
async function tryPlantAtPosition(clientX, clientY) {
  if (!state.selectedBouquet) {
    showStatus('请先选择一个花束');
    return;
  }

  const rect = renderer.domElement.getBoundingClientRect();
  mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(groundCellsGroup.children);

  if (intersects.length > 0) {
    const point = intersects[0].point;
    const cell = getGridCell(point.x, point.z);

    if (cell) {
      // 检查格子是否已种植
      if (plantedCells[cell.row][cell.col]) {
        showStatus('该格子已种植！');
        return;
      }

      // 直接种植（规则已在 BOUQUET_CATALOG 的 agent 配置中定义）
      await plantBouquetInCell(cell.col, cell.row, state.selectedBouquet, state.bouquetCount, state.clusterRadius);
    }
  }
}

// 拖拽种植状态
let isPlanting = false;

renderer.domElement.addEventListener('mousedown', (event) => {
  if (event.shiftKey) {
    isPlanting = true;
    controls.enabled = false;
    tryPlantAtPosition(event.clientX, event.clientY);
  }
});

renderer.domElement.addEventListener('mousemove', (event) => {
  if (isPlanting && event.shiftKey) {
    tryPlantAtPosition(event.clientX, event.clientY);
  }
});

window.addEventListener('mouseup', () => {
  if (isPlanting) {
    isPlanting = false;
    controls.enabled = true;
  }
});

// 按住 Shift 时显示提示
window.addEventListener('keydown', (event) => {
  if (event.key === 'Shift') {
    document.getElementById('plant-mode-indicator').classList.add('active');
  }
});

window.addEventListener('keyup', (event) => {
  if (event.key === 'Shift') {
    document.getElementById('plant-mode-indicator').classList.remove('active');
  }
});

renderer.domElement.addEventListener('click', onCanvasClick);

// ============================================
// 动画循环
// ============================================
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const time = clock.getElapsedTime();
  const now = Date.now();

  // 花朵动画和成长检测
  flowers.forEach((flowerData) => {
    const { sprite, phaseOffset, baseRotation, plantTime, isHarvestable, originalScale } = flowerData;

    // 摇摆动画
    const sway = Math.sin(time * state.swaySpeed + phaseOffset) * state.windSway;
    sprite.material.rotation = baseRotation + sway;

    // 检查是否成长完成
    const growthProgress = Math.min((now - plantTime) / GROWTH_TIME, 1);

    if (growthProgress < 1) {
      // 成长中：逐渐变大
      const currentScale = originalScale * (0.3 + growthProgress * 0.7);
      sprite.scale.set(currentScale, currentScale * 1.5, 1);
      // 成长中颜色偏暗
      sprite.material.color.setRGB(0.6 + growthProgress * 0.4, 0.6 + growthProgress * 0.4, 0.6 + growthProgress * 0.4);
    } else if (!isHarvestable) {
      // 刚成长完成，标记为可采摘
      flowerData.isHarvestable = true;
      sprite.scale.set(originalScale, originalScale * 1.5, 1);
      sprite.material.color.setRGB(1, 1, 1);
    }

    // 可采摘状态：呼吸闪烁效果
    if (flowerData.isHarvestable) {
      const pulse = 0.85 + Math.sin(time * 4) * 0.15;
      sprite.scale.set(originalScale * pulse, originalScale * 1.5 * pulse, 1);
    }
  });

  // 花园整体缩放
  gardenGroup.scale.setScalar(state.gardenScale);

  // 花园缓慢旋转
  if (state.gardenRotate) {
    gardenGroup.rotation.y += 0.002;
  }

  controls.update();
  renderer.render(scene, camera);
}

animate();

// ============================================
// 窗口大小调整
// ============================================
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ============================================
// UI 交互
// ============================================

// 面板折叠
const panel = document.getElementById('panel');
const toggleBtn = document.getElementById('toggle-panel');

toggleBtn.addEventListener('click', () => {
  panel.classList.toggle('collapsed');
  toggleBtn.textContent = panel.classList.contains('collapsed') ? '▶' : '◀';
});

// 滑块更新显示
function setupSlider(id, valueId, callback) {
  const slider = document.getElementById(id);
  const valueDisplay = document.getElementById(valueId);

  slider.addEventListener('input', () => {
    const value = parseFloat(slider.value);
    valueDisplay.textContent = value.toFixed(value >= 1 ? 1 : 2);
    callback(value);
  });
}

setupSlider('bouquet-count', 'bouquet-count-value', (v) => state.bouquetCount = Math.round(v));
setupSlider('cluster-radius', 'cluster-radius-value', (v) => state.clusterRadius = v);
setupSlider('garden-scale', 'garden-scale-value', (v) => state.gardenScale = v);
setupSlider('wind-sway', 'wind-sway-value', (v) => state.windSway = v);
setupSlider('sway-speed', 'sway-speed-value', (v) => state.swaySpeed = v);

// 复选框
document.getElementById('random-rotation').addEventListener('change', (e) => {
  state.randomRotation = e.target.checked;
});

document.getElementById('garden-rotate').addEventListener('change', (e) => {
  state.gardenRotate = e.target.checked;
});

// 花束选择
document.getElementById('plant-bouquet').addEventListener('change', (e) => {
  state.selectedBouquet = e.target.value;
});

// 清空花园
document.getElementById('clear-garden').addEventListener('click', () => {
  // 移除所有花朵
  flowers.forEach(({ sprite }) => {
    gardenGroup.remove(sprite);
    sprite.material.dispose();
  });
  flowers.length = 0;
  state.plantedCount = 0;
  updatePlantedCount();

  // 重置所有格子状态
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      plantedCells[row][col] = false;
    }
  }
  showStatus('花园已清空');
});

// ============================================
// 上传功能
// ============================================
const uploadArea = document.getElementById('upload-area');
const fileInput = document.getElementById('file-input');
const uploadPreview = document.getElementById('upload-preview');
const previewImage = document.getElementById('preview-image');
const bouquetNameInput = document.getElementById('bouquet-name-input');
const cancelUploadBtn = document.getElementById('cancel-upload');
const confirmUploadBtn = document.getElementById('confirm-upload');

let pendingImageData = null;

// 点击上传
uploadArea.addEventListener('click', () => fileInput.click());

// 拖拽上传
uploadArea.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
  uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadArea.classList.remove('dragover');

  const files = e.dataTransfer.files;
  if (files.length > 0) {
    handleFile(files[0]);
  }
});

// 文件选择
fileInput.addEventListener('change', () => {
  if (fileInput.files.length > 0) {
    handleFile(fileInput.files[0]);
  }
});

// 处理文件
function handleFile(file) {
  if (!file.type.match(/image\/(png|jpe?g)/)) {
    alert('请选择 PNG 或 JPG 图片文件');
    return;
  }

  const isJpeg = file.type.match(/image\/jpe?g/);

  const reader = new FileReader();
  reader.onload = async (e) => {
    let imageData = e.target.result;

    // JPG 图片自动去除灰色/白色背景
    if (isJpeg) {
      imageData = await removeBackgroundFromDataUrl(imageData);
    }

    pendingImageData = imageData;
    previewImage.src = pendingImageData;
    uploadPreview.style.display = 'block';
    bouquetNameInput.value = '';
    bouquetNameInput.focus();
  };
  reader.readAsDataURL(file);
}

// 取消上传
cancelUploadBtn.addEventListener('click', () => {
  uploadPreview.style.display = 'none';
  pendingImageData = null;
  fileInput.value = '';

  // 清空 agent 配置输入框
  document.getElementById('agent-name-input').value = '';
  document.getElementById('agent-personality-input').value = '';
  document.getElementById('agent-rule-input').value = '';
  document.getElementById('agent-greeting-input').value = '';
  document.getElementById('agent-success-input').value = '';
});

// 确认上传
confirmUploadBtn.addEventListener('click', () => {
  const name = bouquetNameInput.value.trim();

  // 读取 agent 配置
  const agentName = document.getElementById('agent-name-input').value.trim() || name;
  const personality = document.getElementById('agent-personality-input').value.trim();
  const harvestRule = document.getElementById('agent-rule-input').value.trim();
  const greeting = document.getElementById('agent-greeting-input').value.trim();
  const harvestSuccess = document.getElementById('agent-success-input').value.trim();

  if (!name) {
    alert('请输入花束名称');
    bouquetNameInput.focus();
    return;
  }

  if (!harvestRule) {
    alert('请输入采摘规则');
    document.getElementById('agent-rule-input').focus();
    return;
  }

  if (BOUQUET_CATALOG[name]) {
    // 如果已存在，添加到现有列表
    const bouquetData = BOUQUET_CATALOG[name];
    if (Array.isArray(bouquetData)) {
      bouquetData.push(pendingImageData);
    } else {
      bouquetData.images.push(pendingImageData);
    }
  } else {
    // 创建新花束（包含 agent 配置）
    BOUQUET_CATALOG[name] = {
      images: [pendingImageData],
      agent: {
        name: agentName,
        personality: personality || '友好温和',
        harvestRule: harvestRule,
        greeting: greeting || `你好呀！我是${agentName}～`,
        harvestSuccess: harvestSuccess || '太棒了！你可以带走我了！'
      }
    };
  }

  // 更新UI
  updateBouquetList();
  updateBouquetSelect();

  // 重置上传区域
  uploadPreview.style.display = 'none';
  pendingImageData = null;
  fileInput.value = '';

  // 清空 agent 配置输入框
  document.getElementById('agent-name-input').value = '';
  document.getElementById('agent-personality-input').value = '';
  document.getElementById('agent-rule-input').value = '';
  document.getElementById('agent-greeting-input').value = '';
  document.getElementById('agent-success-input').value = '';

  // 显示成功提示
  showStatus(`花束 "${name}" 添加成功！`);
});

// ============================================
// 更新花束列表UI
// ============================================
function updateBouquetList() {
  const listContainer = document.getElementById('bouquet-list');
  const keys = Object.keys(BOUQUET_CATALOG);

  if (keys.length === 0) {
    listContainer.innerHTML = '<div class="empty-list">暂无花束，请上传图片添加</div>';
    return;
  }

  listContainer.innerHTML = keys.map(key => {
    const bouquetData = BOUQUET_CATALOG[key];
    // 兼容新旧数据结构
    const images = Array.isArray(bouquetData) ? bouquetData : bouquetData.images;
    const firstImage = images[0];
    const count = images.length;
    return `
      <div class="bouquet-item" data-key="${key}">
        <img class="bouquet-thumb" src="${firstImage}" alt="${key}">
        <span class="bouquet-name">${key} (${count}张)</span>
      </div>
    `;
  }).join('');

  // 点击选择
  listContainer.querySelectorAll('.bouquet-item').forEach(item => {
    item.addEventListener('click', () => {
      // 移除其他选中
      listContainer.querySelectorAll('.bouquet-item').forEach(i => i.classList.remove('selected'));
      item.classList.add('selected');

      // 更新选择
      const key = item.dataset.key;
      state.selectedBouquet = key;
      document.getElementById('plant-bouquet').value = key;
    });
  });
}

// 更新花束下拉选择
function updateBouquetSelect() {
  const select = document.getElementById('plant-bouquet');
  const keys = Object.keys(BOUQUET_CATALOG);

  if (keys.length === 0) {
    select.innerHTML = '<option value="">请先添加花束</option>';
    return;
  }

  select.innerHTML = keys.map(key =>
    `<option value="${key}">${key}</option>`
  ).join('');

  // 选择第一个
  if (!state.selectedBouquet && keys.length > 0) {
    state.selectedBouquet = keys[0];
    select.value = keys[0];
  }
}

// ============================================
// 状态栏更新
// ============================================
function updateLoadingStatus() {
  const statusEl = document.getElementById('loading-status');

  if (state.loadingCount > state.loadedCount) {
    statusEl.innerHTML = `
      <div class="loading-spinner"></div>
      <span>加载中: ${state.loadedCount}/${state.loadingCount}</span>
    `;
  } else {
    statusEl.innerHTML = '<span>就绪</span>';
  }
}

function updatePlantedCount() {
  document.getElementById('planted-count').textContent = `已种植: ${state.plantedCount} 朵`;
}

function showStatus(message) {
  const statusEl = document.getElementById('loading-status');
  statusEl.innerHTML = `<span>${message}</span>`;

  setTimeout(() => {
    updateLoadingStatus();
  }, 2000);
}

// ============================================
// 地皮纹理事件监听
// ============================================
const groundUploadArea = document.getElementById('ground-upload-area');
const groundFileInput = document.getElementById('ground-file-input');
const groundConfirmBtn = document.getElementById('ground-confirm-upload');
const groundCancelBtn = document.getElementById('ground-cancel-upload');

if (groundUploadArea) {
  groundUploadArea.addEventListener('click', () => {
    groundFileInput.click();
  });
}

if (groundFileInput) {
  groundFileInput.addEventListener('change', () => {
    if (groundFileInput.files.length > 0) {
      handleGroundTextureFile(groundFileInput.files[0]);
    }
  });
}

if (groundConfirmBtn) {
  groundConfirmBtn.addEventListener('click', () => {
    confirmGroundTexture();
    groundFileInput.value = '';
  });
}

if (groundCancelBtn) {
  groundCancelBtn.addEventListener('click', () => {
    cancelGroundTextureUpload();
    groundFileInput.value = '';
  });
}

// ============================================
// 天空背景上传功能
// ============================================
const skyUploadArea = document.getElementById('sky-upload-area');
const skyFileInput = document.getElementById('sky-file-input');
const skyPreview = document.getElementById('sky-preview');
const skyPreviewImage = document.getElementById('sky-preview-image');

// 点击上传
if (skyUploadArea) {
  skyUploadArea.addEventListener('click', () => skyFileInput.click());

  // 拖拽上传
  skyUploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    skyUploadArea.classList.add('dragover');
  });

  skyUploadArea.addEventListener('dragleave', () => {
    skyUploadArea.classList.remove('dragover');
  });

  skyUploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    skyUploadArea.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) handleSkyFile(file);
  });
}

// 文件选择
if (skyFileInput) {
  skyFileInput.addEventListener('change', (e) => {
    if (e.target.files[0]) handleSkyFile(e.target.files[0]);
  });
}

// 处理天空背景文件
function handleSkyFile(file) {
  if (!file.type.match(/image\/(png|jpe?g)/)) {
    alert('请选择 PNG 或 JPG 图片文件');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const imageData = e.target.result;

    // 显示预览
    if (skyPreviewImage) skyPreviewImage.src = imageData;
    if (skyPreview) skyPreview.style.display = 'block';

    // 加载为 Three.js 纹理并设置为背景
    const loader = new THREE.TextureLoader();
    loader.load(imageData, (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      scene.background = texture;
      showStatus('背景已更新');
    });
  };
  reader.readAsDataURL(file);
}

// 恢复默认天空
const resetSkyBtn = document.getElementById('reset-sky');
if (resetSkyBtn) {
  resetSkyBtn.addEventListener('click', () => {
    scene.background = defaultSkyTexture;
    if (skyPreview) skyPreview.style.display = 'none';
    showStatus('已恢复默认天空');
  });
}

// ============================================
// 初始化
// ============================================
updateBouquetList();
updateBouquetSelect();
updateGroundCellGridUI();
updateGroundTextureList();

// 初始化加载所有格子的默认地皮纹理
async function initGroundTextures() {
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      const textureKey = cellGroundTextures[row][col];
      if (textureKey && textureKey !== '默认棕色') {
        await updateCellGroundTexture(col, row, textureKey);
      }
    }
  }
}
initGroundTextures();

// ============================================
// 模态对话框控制
// ============================================
let pendingPlantInfo = null;   // 待种植信息

// 显示种植设定输入框
function showPlantPromptModal() {
  const modal = document.getElementById('plant-prompt-modal');
  const input = document.getElementById('plant-prompt-input');

  // 获取当前选中花束的默认设定
  const bouquetData = BOUQUET_CATALOG[state.selectedBouquet];
  const defaultPrompt = bouquetData?.defaultPrompt || '';

  input.value = defaultPrompt;
  modal.classList.add('active');
  input.focus();
}

// 隐藏种植设定输入框
function hidePlantPromptModal() {
  document.getElementById('plant-prompt-modal').classList.remove('active');
  pendingPlantInfo = null;
}

// ============================================
// 种植设定对话框事件
// ============================================
document.getElementById('cancel-plant').addEventListener('click', () => {
  hidePlantPromptModal();
});

document.getElementById('confirm-plant').addEventListener('click', async () => {
  const systemPrompt = document.getElementById('plant-prompt-input').value.trim();

  if (!systemPrompt) {
    alert('请输入植物设定');
    return;
  }

  if (!pendingPlantInfo) return;

  const { col, row, bouquetKey, count, radius } = pendingPlantInfo;

  hidePlantPromptModal();

  // 执行种植，传入 systemPrompt
  await plantBouquetInCell(col, row, bouquetKey, count, radius, false, systemPrompt);
});

// Enter 键确认种植（Shift+Enter 换行）
document.getElementById('plant-prompt-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    document.getElementById('confirm-plant').click();
  }
});

// ESC 键关闭对话框
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    hidePlantPromptModal();
    closeFlowerChat();
  }
});

// ============================================
// 花朵聊天界面
// ============================================

// 打开花朵聊天界面
function openFlowerChat(flowerData) {
  const bouquetData = BOUQUET_CATALOG[flowerData.bouquetKey];
  if (!bouquetData || !bouquetData.agent) {
    showStatus('该花朵没有配置对话');
    return;
  }

  const agent = bouquetData.agent;

  // 保存当前聊天花朵信息
  currentChatFlower = {
    flowerData,
    bouquetKey: flowerData.bouquetKey,
    agent,
    // 获取或创建对话会话
    conversation: conversationManager.getOrCreateConversation(flowerData, flowerData.bouquetKey)
  };

  // 展开侧边栏
  const chatSidebar = document.getElementById('chat-sidebar');
  chatSidebar.classList.remove('collapsed');
  document.getElementById('toggle-chat').textContent = '▶';
  document.getElementById('gold-display').classList.add('chat-active');

  // 激活聊天界面
  const chatHeader = document.getElementById('chat-header');
  chatHeader.classList.remove('inactive');
  chatHeader.classList.add('active');

  // 设置聊天界面信息
  document.getElementById('chat-name').textContent = `对话对象：${agent.name}`;
  document.getElementById('chat-status').textContent = '想和你聊聊~';

  // 设置头像（使用花朵图片）
  const images = Array.isArray(bouquetData) ? bouquetData : bouquetData.images;
  if (images && images.length > 0) {
    document.getElementById('chat-avatar').style.backgroundImage = `url(${images[0]})`;
  }

  // 显示聊天内容区域，隐藏空状态
  document.getElementById('chat-empty').classList.add('hidden');
  document.getElementById('chat-content').classList.add('active');

  // 清空并渲染聊天记录
  const messagesContainer = document.getElementById('chat-messages');
  messagesContainer.innerHTML = '';

  // 显示历史消息
  const messages = currentChatFlower.conversation.messages;
  if (messages.length === 0) {
    // 首次对话，添加问候语
    addChatMessage('flower', agent.greeting);
    currentChatFlower.conversation.addAssistantMessage(agent.greeting);
  } else {
    // 恢复历史消息
    messages.forEach(msg => {
      if (msg.role === 'user') {
        addChatMessage('user', msg.content);
      } else if (msg.role === 'assistant') {
        addChatMessage('flower', msg.content);
      }
    });
  }

  // 聚焦输入框
  document.getElementById('chat-input').focus();
}

// 添加聊天消息到界面
function addChatMessage(type, text) {
  const messagesContainer = document.getElementById('chat-messages');

  const messageDiv = document.createElement('div');
  messageDiv.className = `chat-message ${type}`;

  const bubbleDiv = document.createElement('div');
  bubbleDiv.className = 'chat-bubble';
  bubbleDiv.textContent = text;

  messageDiv.appendChild(bubbleDiv);
  messagesContainer.appendChild(messageDiv);

  // 滚动到底部
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// 显示加载动画
function showTypingIndicator() {
  const messagesContainer = document.getElementById('chat-messages');

  const typingDiv = document.createElement('div');
  typingDiv.className = 'chat-message flower';
  typingDiv.id = 'typing-indicator';

  typingDiv.innerHTML = `
    <div class="chat-bubble chat-typing">
      <span></span>
      <span></span>
      <span></span>
    </div>
  `;

  messagesContainer.appendChild(typingDiv);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// 移除加载动画
function hideTypingIndicator() {
  const indicator = document.getElementById('typing-indicator');
  if (indicator) {
    indicator.remove();
  }
}

// 发送聊天消息
async function sendChatMessage() {
  const input = document.getElementById('chat-input');
  const sendBtn = document.getElementById('chat-send');
  const userMessage = input.value.trim();

  if (!userMessage || !currentChatFlower) return;

  // 清空输入框，禁用发送按钮
  input.value = '';
  sendBtn.disabled = true;

  // 添加用户消息到界面
  addChatMessage('user', userMessage);

  // 显示加载动画
  showTypingIndicator();

  try {
    // 调用 Agent API
    const result = await chatWithFlower(currentChatFlower.conversation, userMessage);

    // 移除加载动画
    hideTypingIndicator();

    // 添加花朵回复（消息已在 parseAgentResponse 中添加到对话历史）
    if (result.text) {
      addChatMessage('flower', result.text);
    }

    // 检测是否成功采摘
    if (result.harvested) {
      // 延迟一下再显示成功动画
      setTimeout(() => {
        handleHarvestSuccess(result.reason);
      }, 500);
    }

  } catch (error) {
    hideTypingIndicator();
    addChatMessage('system', `出错了：${error.message}`);
  }

  sendBtn.disabled = false;
  input.focus();
}

// 处理采摘成功
function handleHarvestSuccess(reason) {
  if (!currentChatFlower) return;

  const flowerData = currentChatFlower.flowerData;
  const agent = currentChatFlower.agent;

  // 关闭聊天窗口
  closeFlowerChat();

  // 显示成功动画
  const overlay = document.createElement('div');
  overlay.className = 'harvest-success-overlay';
  overlay.innerHTML = `
    <div class="success-icon">&#127793;</div>
    <div class="success-text">${agent.harvestSuccess || '采摘成功！'}</div>
    <div class="success-reason">${reason}</div>
  `;
  document.body.appendChild(overlay);

  // 执行采摘
  harvestCell(flowerData.cellCol, flowerData.cellRow);

  // 清除对话历史
  conversationManager.endConversation(flowerData);

  // 移除成功动画
  setTimeout(() => {
    overlay.remove();
  }, 2000);
}

// 关闭花朵聊天界面
function closeFlowerChat() {
  // 收起侧边栏
  const chatSidebar = document.getElementById('chat-sidebar');
  chatSidebar.classList.add('collapsed');
  document.getElementById('toggle-chat').textContent = '◀';
  document.getElementById('gold-display').classList.remove('chat-active');

  // 重置聊天界面到未激活状态
  const chatHeader = document.getElementById('chat-header');
  chatHeader.classList.remove('active');
  chatHeader.classList.add('inactive');

  // 恢复默认文字
  document.getElementById('chat-name').textContent = '无对话对象';
  document.getElementById('chat-status').textContent = '点击成熟的花朵开始对话';

  // 隐藏聊天内容，显示空状态
  document.getElementById('chat-content').classList.remove('active');
  document.getElementById('chat-empty').classList.remove('hidden');

  currentChatFlower = null;
}

// 聊天界面事件监听
document.getElementById('chat-close').addEventListener('click', closeFlowerChat);

document.getElementById('chat-send').addEventListener('click', sendChatMessage);

document.getElementById('chat-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    sendChatMessage();
  }
});

// 聊天侧边栏展开/收起按钮
document.getElementById('toggle-chat').addEventListener('click', () => {
  const chatSidebar = document.getElementById('chat-sidebar');
  const toggleBtn = document.getElementById('toggle-chat');
  const goldDisplay = document.getElementById('gold-display');

  if (chatSidebar.classList.contains('collapsed')) {
    chatSidebar.classList.remove('collapsed');
    toggleBtn.textContent = '▶';
    goldDisplay.classList.add('chat-active');
  } else {
    chatSidebar.classList.add('collapsed');
    toggleBtn.textContent = '◀';
    goldDisplay.classList.remove('chat-active');
  }
});

// ============================================
// 装饰物系统功能
// ============================================

/**
 * 创建装饰物精灵
 * @param {string} imageUrl - 图片数据URL
 * @param {THREE.Vector3} position - 放置位置
 */
async function createDecoration(imageUrl, position) {
  const texture = await loadTexture(imageUrl);

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    alphaTest: 0.05
  });

  const sprite = new THREE.Sprite(material);
  sprite.position.copy(position);

  // 默认大小
  const scale = 1;
  sprite.scale.set(scale, scale, 1);

  // 标记为装饰物
  sprite.userData.isDecoration = true;

  const decorationData = {
    sprite,
    position: position.clone(),
    scale,
    textureUrl: imageUrl
  };

  decorations.push(decorationData);
  scene.add(sprite); // 添加到场景而非 gardenGroup，不受花园旋转影响

  showStatus('装饰物已添加');
  return decorationData;
}

/**
 * 删除装饰物
 */
function deleteDecoration(decoration) {
  scene.remove(decoration.sprite);
  decoration.sprite.material.dispose();

  const index = decorations.indexOf(decoration);
  if (index > -1) {
    decorations.splice(index, 1);
  }

  showStatus('装饰物已删除');
}

// ============================================
// 装饰物上传功能
// ============================================
let pendingDecorationImage = null;  // 待放置的装饰物图片

const decorationUploadArea = document.getElementById('decoration-upload-area');
const decorationFileInput = document.getElementById('decoration-file-input');
const decorationPreview = document.getElementById('decoration-preview');
const decorationPreviewImage = document.getElementById('decoration-preview-image');

// 点击上传区域
if (decorationUploadArea && decorationFileInput) {
  console.log('装饰物上传元素已找到，绑定点击事件');
  decorationUploadArea.addEventListener('click', (e) => {
    console.log('装饰物上传区域被点击');
    e.stopPropagation(); // 防止事件冒泡
    decorationFileInput.click();
  });
} else {
  console.warn('装饰物上传元素未找到:', { decorationUploadArea, decorationFileInput });
}

// 文件选择
if (decorationFileInput) {
  decorationFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.match(/image\/(png|jpe?g)/)) {
      alert('请选择 PNG 或 JPG 图片文件');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (evt) => {
      // 装饰物不自动去除背景，保留原图（因为可能是云朵等白色物体）
      pendingDecorationImage = evt.target.result;

      // 显示预览
      if (decorationPreviewImage) {
        decorationPreviewImage.src = pendingDecorationImage;
      }
      if (decorationPreview) {
        decorationPreview.style.display = 'block';
      }
      if (decorationUploadArea) {
        decorationUploadArea.classList.add('active');
      }

      showStatus('点击场景放置装饰物');
    };
    reader.readAsDataURL(file);

    // 清空 input 以便重复选择同一文件
    e.target.value = '';
  });
}

// 取消放置模式
function cancelDecorationPlacement() {
  pendingDecorationImage = null;
  if (decorationPreview) {
    decorationPreview.style.display = 'none';
  }
  if (decorationUploadArea) {
    decorationUploadArea.classList.remove('active');
  }
}

// ESC 键取消放置
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && pendingDecorationImage) {
    cancelDecorationPlacement();
    showStatus('已取消放置装饰物');
  }
});

// ============================================
// 装饰物移动交互
// ============================================

// 检测装饰物点击 / 放置新装饰物
renderer.domElement.addEventListener('mousedown', (e) => {
  // 只处理左键且非 Shift 键
  if (e.button !== 0 || e.shiftKey) return;

  const rect = renderer.domElement.getBoundingClientRect();
  const mouseVec = new THREE.Vector2(
    ((e.clientX - rect.left) / rect.width) * 2 - 1,
    -((e.clientY - rect.top) / rect.height) * 2 + 1
  );

  raycaster.setFromCamera(mouseVec, camera);

  // 如果有待放置的装饰物，优先处理放置
  if (pendingDecorationImage) {
    const intersects = raycaster.intersectObject(basePlane);

    let position;
    if (intersects.length > 0) {
      position = intersects[0].point.clone();
      position.y = 1; // 放置在地面上方
    } else {
      position = new THREE.Vector3(0, 1, 0);
    }

    // 创建装饰物
    createDecoration(pendingDecorationImage, position);

    // 清除待放置状态
    cancelDecorationPlacement();
    return;
  }

  // 检测是否点击了已有装饰物（用于拖拽）
  const decorationSprites = decorations.map(d => d.sprite);
  console.log('装饰物数量:', decorations.length, '精灵数量:', decorationSprites.length);

  const intersects = raycaster.intersectObjects(decorationSprites);
  console.log('点击检测结果:', intersects.length);

  if (intersects.length > 0) {
    selectedDecoration = decorations.find(d => d.sprite === intersects[0].object);
    isDraggingDecoration = true;
    controls.enabled = false; // 禁用 OrbitControls
    console.log('开始拖拽装饰物');
  }
});

// 拖拽装饰物
renderer.domElement.addEventListener('mousemove', (e) => {
  if (!isDraggingDecoration || !selectedDecoration) return;

  const rect = renderer.domElement.getBoundingClientRect();
  const mouseVec = new THREE.Vector2(
    ((e.clientX - rect.left) / rect.width) * 2 - 1,
    -((e.clientY - rect.top) / rect.height) * 2 + 1
  );

  raycaster.setFromCamera(mouseVec, camera);
  const intersects = raycaster.intersectObject(basePlane);

  console.log('拖拽中, basePlane 交点:', intersects.length);

  if (intersects.length > 0) {
    const newPos = intersects[0].point;
    selectedDecoration.sprite.position.x = newPos.x;
    selectedDecoration.sprite.position.z = newPos.z;
    selectedDecoration.position.copy(selectedDecoration.sprite.position);
  }
});

// 结束拖拽装饰物
window.addEventListener('mouseup', () => {
  if (isDraggingDecoration) {
    isDraggingDecoration = false;
    controls.enabled = true;
    selectedDecoration = null;
  }
});

// ============================================
// 装饰物滚轮缩放
// ============================================
renderer.domElement.addEventListener('wheel', (e) => {
  const rect = renderer.domElement.getBoundingClientRect();
  const mouseVec = new THREE.Vector2(
    ((e.clientX - rect.left) / rect.width) * 2 - 1,
    -((e.clientY - rect.top) / rect.height) * 2 + 1
  );

  raycaster.setFromCamera(mouseVec, camera);

  const decorationSprites = decorations.map(d => d.sprite);
  const intersects = raycaster.intersectObjects(decorationSprites);

  if (intersects.length > 0) {
    e.preventDefault();
    e.stopPropagation();

    const decoration = decorations.find(d => d.sprite === intersects[0].object);
    if (!decoration) return;

    // 缩放调整：向下滚动缩小，向上放大
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    decoration.scale = Math.max(0.2, Math.min(5, decoration.scale * delta));
    decoration.sprite.scale.set(decoration.scale, decoration.scale, 1);
  }
}, { passive: false });

// ============================================
// 装饰物右键删除
// ============================================
renderer.domElement.addEventListener('contextmenu', (e) => {
  const rect = renderer.domElement.getBoundingClientRect();
  const mouseVec = new THREE.Vector2(
    ((e.clientX - rect.left) / rect.width) * 2 - 1,
    -((e.clientY - rect.top) / rect.height) * 2 + 1
  );

  raycaster.setFromCamera(mouseVec, camera);

  const decorationSprites = decorations.map(d => d.sprite);
  const intersects = raycaster.intersectObjects(decorationSprites);

  if (intersects.length > 0) {
    e.preventDefault();
    const decoration = decorations.find(d => d.sprite === intersects[0].object);
    if (decoration) {
      deleteDecoration(decoration);
    }
  }
});
