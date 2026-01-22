/**
 * 图片处理工具函数
 */

import * as THREE from 'three';

/**
 * 处理图片数据，移除灰色/白色/黑色背景
 * @param {Uint8ClampedArray} data - ImageData 的 data 数组
 */
export function processImageData(data) {
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

    // 灰色/白色背景特征
    const isGrayish = maxDiff < 20;
    const inGrayRange = r >= 155 && r <= 255 &&
                        g >= 155 && g <= 255 &&
                        b >= 155 && b <= 255;

    // 黑色/深色背景特征
    const inBlackRange = r <= 50 && g <= 50 && b <= 50;

    if ((isGrayish && inGrayRange) || inBlackRange) {
      data[i + 3] = 0; // 设置 alpha 为 0（透明）
    }
  }
}

/**
 * 处理 Three.js 纹理，移除背景
 * @param {THREE.Texture} texture - 原始纹理
 * @returns {THREE.CanvasTexture} 处理后的纹理
 */
export function processTextureForTransparency(texture) {
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

/**
 * 处理 Data URL，移除背景
 * @param {string} dataUrl - 图片 Data URL
 * @returns {Promise<string>} 处理后的 PNG Data URL
 */
export function removeBackgroundFromDataUrl(dataUrl) {
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

      resolve(canvas.toDataURL('image/png'));
    };
    img.src = dataUrl;
  });
}
