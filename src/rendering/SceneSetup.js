/**
 * Three.js 场景初始化
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CONFIG, GARDEN_WIDTH, GARDEN_DEPTH, GROUND_Y } from '../config.js';
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
    this.groundPlane = this.createGround();
    this.dashedGrid = this.createDashedGrid();

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
    const geometry = new THREE.PlaneGeometry(GARDEN_WIDTH, GARDEN_DEPTH);
    const material = new THREE.MeshBasicMaterial({
      color: 0x8B6914,
      transparent: true,
      opacity: 0.3  // 半透明土地底色
    });

    const plane = new THREE.Mesh(geometry, material);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = GROUND_Y - 0.02;  // 稍低于草地

    this.groundGroup.add(plane);
    return plane;
  }

  /**
   * 创建虚线网格
   */
  createDashedGrid() {
    const gridGroup = new THREE.Group();
    const material = createDashedMaterial();

    const { cols, rows, cellWidth, cellDepth } = CONFIG.grid;

    // 垂直线
    for (let i = 1; i < cols; i++) {
      const x = -GARDEN_WIDTH / 2 + i * cellWidth;
      const points = [
        new THREE.Vector3(x, 0.01, -GARDEN_DEPTH / 2),
        new THREE.Vector3(x, 0.01, GARDEN_DEPTH / 2)
      ];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, material);
      line.computeLineDistances();
      gridGroup.add(line);
    }

    // 水平线
    for (let i = 1; i < rows; i++) {
      const z = -GARDEN_DEPTH / 2 + i * cellDepth;
      const points = [
        new THREE.Vector3(-GARDEN_WIDTH / 2, 0.01, z),
        new THREE.Vector3(GARDEN_WIDTH / 2, 0.01, z)
      ];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geometry, material);
      line.computeLineDistances();
      gridGroup.add(line);
    }

    this.scene.add(gridGroup);
    return gridGroup;
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
   * 获取渲染器 DOM 元素
   */
  get domElement() {
    return this.renderer.domElement;
  }
}
