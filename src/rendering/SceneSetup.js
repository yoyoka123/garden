/**
 * Three.js 场景初始化
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CONFIG, GROUND_Y } from '../config.js';
import { createGradientSkyTexture, createDashedMaterial } from '../utils/three-helpers.js';
import { resources } from '../core/Resources.js';
import { GrassManager } from './GrassManager.js';

export class SceneSetup {
  constructor(container) {
    this.container = container;

    // 创建场景
    this.scene = new THREE.Scene();

    // 创建渲染器
    this.renderer = this.createRenderer();

    // 创建相机
    this.camera = this.createCamera();

    // 创建控制器
    this.controls = this.createControls();

    // 添加光照
    this.setupLighting();

    // 添加雾效
    this.setupFog();

    // 天空背景
    this.defaultSkyTexture = createGradientSkyTexture();
    this.scene.background = this.defaultSkyTexture;

    // 地面组
    this.groundGroup = new THREE.Group();
    this.scene.add(this.groundGroup);

    // 花园组（花朵放在这里）
    this.gardenGroup = new THREE.Group();
    this.scene.add(this.gardenGroup);

    // 创建地面（用于射线检测，不可见）
    // 使用默认尺寸初始化，后续可以通过 updateGardenSize 更新
    this.groundPlane = this.createGround();
    
    // 创建临时网格对象用于初始化
    const tempGrid = {
      months: CONFIG.grid.months,
      radius: CONFIG.grid.calendarLayout.radius,
      monthGrid: CONFIG.grid.calendarLayout.monthGrid,
      layoutCols: CONFIG.grid.calendarLayout.layoutCols || 3,
      monthGap: CONFIG.grid.calendarLayout.monthGap || 0.5
    };
    this.dashedGrid = this.createDashedGrid(tempGrid);

    // 草地管理器
    this.grassManager = new GrassManager(this.scene);
  }

  /**
   * 创建渲染器
   */
  createRenderer() {
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(renderer.domElement);
    return renderer;
  }

  /**
   * 创建相机
   */
  createCamera() {
    const config = CONFIG.rendering.camera;
    const camera = new THREE.PerspectiveCamera(
      config.fov,
      window.innerWidth / window.innerHeight,
      config.near,
      config.far
    );
    camera.position.set(config.position.x, config.position.y, config.position.z);
    return camera;
  }

  /**
   * 创建控制器
   */
  createControls() {
    const config = CONFIG.rendering.controls;
    const controls = new OrbitControls(this.camera, this.renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minPolarAngle = config.minPolarAngle;
    controls.maxPolarAngle = config.maxPolarAngle;
    controls.minDistance = config.minDistance;
    controls.maxDistance = config.maxDistance;
    // 明确启用滚轮缩放（支持鼠标滚轮和触控板手势）
    controls.enableZoom = true;
    // 调整缩放速度以适应触控板手势
    controls.zoomSpeed = 0.5;
    return controls;
  }

  /**
   * 设置光照
   */
  setupLighting() {
    const { ambient, directional } = CONFIG.rendering.light;

    // 环境光
    const ambientLight = new THREE.AmbientLight(ambient.color, ambient.intensity);
    this.scene.add(ambientLight);

    // 平行光
    const dirLight = new THREE.DirectionalLight(directional.color, directional.intensity);
    dirLight.position.set(
      directional.position.x,
      directional.position.y,
      directional.position.z
    );
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 50;
    dirLight.shadow.camera.left = -20;
    dirLight.shadow.camera.right = 20;
    dirLight.shadow.camera.top = 20;
    dirLight.shadow.camera.bottom = -20;
    dirLight.shadow.bias = -0.0001;
    this.scene.add(dirLight);

    this.directionalLight = dirLight;
  }

  /**
   * 设置雾效
   */
  setupFog() {
    const { color, density } = CONFIG.rendering.fog;
    this.scene.fog = new THREE.FogExp2(color, density);
  }

  /**
   * 创建地面（用于射线检测，不可见）
   */
  createGround() {
    const layout = CONFIG.grid.calendarLayout;
    // 地面半径需要覆盖整个日历环
    const groundRadius = layout.radius + 5;
    
    const geometry = new THREE.CircleGeometry(groundRadius, 64);
    
    // 旋转到水平面
    geometry.rotateX(-Math.PI / 2);

    const material = new THREE.MeshBasicMaterial({
      color: 0xFFF6E2, // 用户指定的淡黄色
      transparent: false,
      side: THREE.DoubleSide
    });

    const plane = new THREE.Mesh(geometry, material);
    plane.position.y = GROUND_Y - 0.02; // 稍低于草地

    this.groundGroup.add(plane);
    return plane;
  }

  /**
   * 创建虚线网格 (日历布局)
   * @param {Object} grid - 网格对象
   */
  createDashedGrid(grid) {
    const gridGroup = new THREE.Group();
    const material = createDashedMaterial();

    const { months, monthGrid } = grid;
    const { cols, rows, cellWidth, cellDepth } = monthGrid;
    
    // 兼容 tempGrid 和真实 Grid 实例
    const layoutCols = grid.layoutCols || CONFIG.grid.calendarLayout.layoutCols || 3;
    const monthGap = grid.monthGap || CONFIG.grid.calendarLayout.monthGap || 0.5;
    
    // 物理尺寸
    const monthWidth = cols * cellWidth;
    const monthDepth = rows * cellDepth;
    
    const layoutRows = Math.ceil(months / layoutCols);
    const totalWidth = layoutCols * monthWidth + (layoutCols - 1) * monthGap;
    const totalDepth = layoutRows * monthDepth + (layoutRows - 1) * monthGap;
    
    // 起始点 (左上角)
    const startX = -totalWidth / 2;
    const startZ = -totalDepth / 2;

    // 遍历每个月份绘制网格
    for (let m = 0; m < months; m++) {
      const col = m % layoutCols;
      const row = Math.floor(m / layoutCols);
      
      // 当前月份块的左上角
      const monthX = startX + col * (monthWidth + monthGap);
      const monthZ = startZ + row * (monthDepth + monthGap);
      
      // 中心点
      const monthCenterX = monthX + monthWidth / 2;
      const monthCenterZ = monthZ + monthDepth / 2;

      // 辅助函数：局部到世界 (无旋转，直接平移)
      const transform = (x, z) => {
        return new THREE.Vector3(
          monthCenterX + x,
          0.01,
          monthCenterZ + z
        );
      };

      // 绘制垂直线 (Cols)
      for (let i = 0; i <= cols; i++) {
        const x = (i - cols / 2) * cellWidth;
        const zStart = -rows * cellDepth / 2;
        const zEnd = rows * cellDepth / 2;
        
        const p1 = transform(x, zStart);
        const p2 = transform(x, zEnd);
        
        const geometry = new THREE.BufferGeometry().setFromPoints([p1, p2]);
        const line = new THREE.Line(geometry, material);
        line.computeLineDistances();
        gridGroup.add(line);
      }

      // 绘制水平线 (Rows)
      for (let i = 0; i <= rows; i++) {
        const z = (i - rows / 2) * cellDepth;
        const xStart = -cols * cellWidth / 2;
        const xEnd = cols * cellWidth / 2;
        
        const p1 = transform(xStart, z);
        const p2 = transform(xEnd, z);
        
        const geometry = new THREE.BufferGeometry().setFromPoints([p1, p2]);
        const line = new THREE.Line(geometry, material);
        line.computeLineDistances();
        gridGroup.add(line);
      }
      
      // 添加月份标签
      this.createMonthLabel(m, monthCenterX, monthCenterZ - monthDepth/2 - 0.2, gridGroup);
    }

    this.scene.add(gridGroup);
    return gridGroup;
  }
  
  /**
   * 创建月份标签
   */
  createMonthLabel(monthIndex, x, z, group) {
    const year = 2026;
    const month = monthIndex + 1;
    const monthNames = ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"];
    const text = `${year}.${month.toString().padStart(2, '0')} ${monthNames[monthIndex]}`;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const fontSize = 48;
    ctx.font = `bold ${fontSize}px "Microsoft YaHei", Arial, sans-serif`;
    
    // Measure text
    const textMetrics = ctx.measureText(text);
    const textWidth = textMetrics.width;
    const textHeight = fontSize * 1.4;
    
    canvas.width = textWidth + 20;
    canvas.height = textHeight + 20;
    
    // Redraw
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = `bold ${fontSize}px "Microsoft YaHei", Arial, sans-serif`;
    ctx.fillStyle = '#555555'; // 深灰色文字
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(material);
    
    // Scale sprite
    const scale = 1.0; 
    sprite.scale.set(scale, scale * (canvas.height / canvas.width), 1);
    
    sprite.position.set(x, 0.5, z);
    
    group.add(sprite);
  }

  /**
   * 更新花园大小（更新地面和网格）
   * @param {Object} grid - 网格对象
   */
  updateGardenSize(grid) {
    // 更新地面
    if (this.groundPlane) {
      this.groundGroup.remove(this.groundPlane);
      this.groundPlane.geometry.dispose();
      this.groundPlane.material.dispose();
    }
    this.groundPlane = this.createGround();

    // 更新网格
    if (this.dashedGrid) {
      this.scene.remove(this.dashedGrid);
      // 清理所有子对象
      this.dashedGrid.children.forEach(child => {
        child.geometry.dispose();
        child.material.dispose();
      });
    }
    this.dashedGrid = this.createDashedGrid(grid);
  }

  /**
   * 加载天空背景
   * @param {string} url - 图片 URL
   */
  async loadSkyBackground(url) {
    const texture = await resources.loadTexture(url);
    this.scene.background = texture;
  }

  /**
   * 重置为默认天空
   */
  resetSkyBackground() {
    this.scene.background = this.defaultSkyTexture;
  }

  /**
   * 重新加载草地
   * @param {Array<{url: string, count: number}>} grassTypes - 草类型数组
   * @param {Object} grid - 网格对象
   */
  async reloadGrass(grassTypes, grid) {
    await this.grassManager.initFromCatalog(grassTypes, grid);
  }

  /**
   * 更新草地动画
   * @param {number} time - 当前时间
   */
  updateGrassAnimation(time) {
    this.grassManager.updateAnimation(time);
  }

  /**
   * 设置地面纹理（已废弃，改用 3D 草地）
   * @param {THREE.Texture|null} texture - 纹理
   */
  setGroundTexture(texture) {
    // 不再使用平铺纹理，保留接口兼容性
    // 地面现在是半透明的土地底色
  }

  /**
   * 处理窗口大小变化
   */
  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  /**
   * 渲染帧
   */
  render() {
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * 设置花园缩放
   * @param {number} scale - 缩放值
   */
  setGardenScale(scale) {
    this.gardenGroup.scale.setScalar(scale);
  }

  /**
   * 设置花园旋转
   * @param {number} deltaY - Y 轴旋转增量
   */
  rotateGarden(deltaY) {
    this.gardenGroup.rotation.y += deltaY;
  }

  /**
   * 设置地面颜色
   * @param {string} color - 十六进制颜色字符串
   */
  setGroundColor(color) {
    if (this.groundPlane && this.groundPlane.material) {
      this.groundPlane.material.color.set(color);
    }
  }

  /**
   * 获取渲染器 DOM 元素
   */
  get domElement() {
    return this.renderer.domElement;
  }
}
