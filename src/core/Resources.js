/**
 * 资源管理器
 * 管理纹理加载、缓存和释放
 */

import * as THREE from 'three';
import { eventBus, Events } from '../EventBus.js';
import { createPlaceholderTexture } from '../utils/three-helpers.js';
import { logger } from '../utils/Logger.js';

export class ResourceManager {
  constructor() {
    this.textureCache = new Map();
    this.textureLoader = new THREE.TextureLoader();
    this.placeholderTexture = createPlaceholderTexture();

    // 加载状态
    this.loadingCount = 0;
    this.loadedCount = 0;
  }

  /**
   * 加载纹理
   * @param {string} url - 纹理 URL
   * @returns {Promise<THREE.Texture>}
   */
  async loadTexture(url) {
    // 检查缓存
    if (this.textureCache.has(url)) {
      logger.debug('Resource', `Texture from cache: ${url}`);
      return this.textureCache.get(url);
    }

    this.loadingCount++;
    this.emitLoadingStatus();
    const startTime = Date.now();

    return new Promise((resolve) => {
      this.textureLoader.load(
        url,
        (texture) => {
          const duration = Date.now() - startTime;
          texture.colorSpace = THREE.SRGBColorSpace;
          this.textureCache.set(url, texture);
          this.loadedCount++;
          this.emitLoadingStatus();
          logger.logResourceLoad(url, true, null, duration);
          resolve(texture);
        },
        undefined,
        (error) => {
          const duration = Date.now() - startTime;
          this.loadedCount++;
          this.emitLoadingStatus();
          logger.logResourceLoad(url, false, error, duration);
          resolve(this.placeholderTexture);
        }
      );
    });
  }

  /**
   * 发送加载状态事件
   */
  emitLoadingStatus() {
    eventBus.emit(Events.LOADING_CHANGED, {
      loading: this.loadingCount,
      loaded: this.loadedCount,
      isComplete: this.loadingCount === this.loadedCount
    });
  }

  /**
   * 预加载多个纹理
   * @param {string[]} urls - 纹理 URL 数组
   * @returns {Promise<THREE.Texture[]>}
   */
  async preloadTextures(urls) {
    return Promise.all(urls.map(url => this.loadTexture(url)));
  }

  /**
   * 获取缓存的纹理
   * @param {string} url - 纹理 URL
   * @returns {THREE.Texture|null}
   */
  getCachedTexture(url) {
    return this.textureCache.get(url) || null;
  }

  /**
   * 检查纹理是否已缓存
   * @param {string} url - 纹理 URL
   * @returns {boolean}
   */
  hasTexture(url) {
    return this.textureCache.has(url);
  }

  /**
   * 添加纹理到缓存
   * @param {string} key - 缓存键
   * @param {THREE.Texture} texture - 纹理
   */
  addTexture(key, texture) {
    this.textureCache.set(key, texture);
  }

  /**
   * 移除并释放纹理
   * @param {string} url - 纹理 URL
   */
  disposeTexture(url) {
    const texture = this.textureCache.get(url);
    if (texture && texture !== this.placeholderTexture) {
      texture.dispose();
      this.textureCache.delete(url);
    }
  }

  /**
   * 释放所有资源
   */
  dispose() {
    this.textureCache.forEach((texture, url) => {
      if (texture !== this.placeholderTexture) {
        texture.dispose();
      }
    });
    this.textureCache.clear();
    this.placeholderTexture.dispose();
  }

  /**
   * 获取加载状态
   * @returns {{loading: number, loaded: number, isComplete: boolean}}
   */
  getLoadingStatus() {
    return {
      loading: this.loadingCount,
      loaded: this.loadedCount,
      isComplete: this.loadingCount === this.loadedCount
    };
  }
}

// 导出单例
export const resources = new ResourceManager();
