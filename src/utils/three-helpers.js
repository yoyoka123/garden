/**
 * Three.js 工具函数
 */

import * as THREE from 'three';

/**
 * 获取鼠标在 NDC 坐标系中的位置
 * @param {MouseEvent} event - 鼠标事件
 * @param {HTMLElement} domElement - 渲染器 DOM 元素
 * @returns {THREE.Vector2} NDC 坐标
 */
export function getMouseNDC(event, domElement) {
  const rect = domElement.getBoundingClientRect();
  return new THREE.Vector2(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1
  );
}

/**
 * 将 3D 坐标转换为屏幕坐标
 * @param {THREE.Vector3} position - 3D 位置
 * @param {THREE.Camera} camera - 相机
 * @param {HTMLElement} domElement - 渲染器 DOM 元素
 * @returns {{x: number, y: number}} 屏幕坐标
 */
export function toScreenPosition(position, camera, domElement) {
  const vector = position.clone();
  vector.project(camera);

  const rect = domElement.getBoundingClientRect();
  return {
    x: (vector.x * 0.5 + 0.5) * rect.width + rect.left,
    y: (-vector.y * 0.5 + 0.5) * rect.height + rect.top
  };
}

/**
 * 射线检测辅助函数
 * @param {MouseEvent} event - 鼠标事件
 * @param {THREE.Camera} camera - 相机
 * @param {HTMLElement} domElement - 渲染器 DOM 元素
 * @param {THREE.Object3D[]} objects - 要检测的对象数组
 * @returns {THREE.Intersection[]} 交点数组
 */
export function raycastFromMouse(event, camera, domElement, objects) {
  const raycaster = new THREE.Raycaster();
  const mouse = getMouseNDC(event, domElement);
  raycaster.setFromCamera(mouse, camera);
  return raycaster.intersectObjects(objects);
}

/**
 * 创建渐变天空纹理
 * @returns {THREE.CanvasTexture} 天空纹理
 */
export function createGradientSkyTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 2;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createLinearGradient(0, 0, 0, 512);
  gradient.addColorStop(0, '#87CEEB');
  gradient.addColorStop(0.5, '#B0E0E6');
  gradient.addColorStop(1, '#E0F6FF');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 2, 512);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * 创建占位纹理
 * @returns {THREE.CanvasTexture} 占位纹理
 */
export function createPlaceholderTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');

  // 花瓣
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

/**
 * 创建虚线材质
 * @param {Object} options - 配置选项
 * @returns {THREE.LineDashedMaterial} 虚线材质
 */
export function createDashedMaterial(options = {}) {
  return new THREE.LineDashedMaterial({
    color: options.color || 0xcccccc,
    dashSize: options.dashSize || 0.1,
    gapSize: options.gapSize || 0.1,
    opacity: options.opacity || 0.5,
    transparent: true
  });
}
