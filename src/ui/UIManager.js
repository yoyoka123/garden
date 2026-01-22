/**
 * UI 管理器
 * 管理所有 UI 交互和显示
 */

import { eventBus, Events } from '../EventBus.js';
import { getElement, toggleClass, setVisible, createFloatingText } from '../utils/dom-helpers.js';

export class UIManager {
  constructor() {
    this.elements = {};
    this.statusTimeout = null;

    this.cacheElements();
    this.bindEvents();
  }

  /**
   * 缓存 DOM 元素引用
   */
  cacheElements() {
    this.elements = {
      // 面板
      panel: getElement('panel'),
      togglePanel: getElement('toggle-panel'),

      // 状态显示
      loadingStatus: getElement('loading-status'),
      plantedCount: getElement('planted-count'),
      goldValue: getElement('gold-value'),
      goldDisplay: getElement('gold-display'),

      // 花束控制
      plantBouquet: getElement('plant-bouquet'),
      bouquetCount: getElement('bouquet-count'),
      bouquetCountValue: getElement('bouquet-count-value'),
      clusterRadius: getElement('cluster-radius'),
      clusterRadiusValue: getElement('cluster-radius-value'),

      // 花园控制
      gardenScale: getElement('garden-scale'),
      gardenScaleValue: getElement('garden-scale-value'),
      windSway: getElement('wind-sway'),
      windSwayValue: getElement('wind-sway-value'),
      swaySpeed: getElement('sway-speed'),
      swaySpeedValue: getElement('sway-speed-value'),
      randomRotation: getElement('random-rotation'),
      gardenRotate: getElement('garden-rotate'),
      clearGarden: getElement('clear-garden'),

      // 上传区域
      uploadArea: getElement('upload-area'),
      fileInput: getElement('file-input'),
      uploadPreview: getElement('upload-preview'),
      previewImage: getElement('preview-image'),
      bouquetNameInput: getElement('bouquet-name-input'),
      cancelUpload: getElement('cancel-upload'),
      confirmUpload: getElement('confirm-upload'),

      // Agent 配置
      agentNameInput: getElement('agent-name-input'),
      agentPersonalityInput: getElement('agent-personality-input'),
      agentRuleInput: getElement('agent-rule-input'),
      agentGreetingInput: getElement('agent-greeting-input'),
      agentSuccessInput: getElement('agent-success-input'),

      // 花束列表
      bouquetList: getElement('bouquet-list'),

      // 地皮
      groundTextureList: getElement('ground-texture-list'),
      groundCellGrid: getElement('ground-cell-grid'),
      groundCellInfo: getElement('ground-cell-info'),
      groundUploadArea: getElement('ground-upload-area'),
      groundFileInput: getElement('ground-file-input'),
      groundUploadPreview: getElement('ground-upload-preview'),
      groundPreviewImage: getElement('ground-preview-image'),
      groundTextureName: getElement('ground-texture-name'),
      groundConfirmUpload: getElement('ground-confirm-upload'),
      groundCancelUpload: getElement('ground-cancel-upload'),

      // 天空
      skyUploadArea: getElement('sky-upload-area'),
      skyFileInput: getElement('sky-file-input'),
      skyPreview: getElement('sky-preview'),
      skyPreviewImage: getElement('sky-preview-image'),
      resetSky: getElement('reset-sky'),

      // 装饰物
      decorationUploadArea: getElement('decoration-upload-area'),
      decorationFileInput: getElement('decoration-file-input'),
      decorationPreview: getElement('decoration-preview'),
      decorationPreviewImage: getElement('decoration-preview-image'),

      // 气泡
      speechBubble: getElement('speech-bubble'),

      // 种植模式指示
      plantModeIndicator: getElement('plant-mode-indicator'),

      // 聊天界面
      chatSidebar: getElement('chat-sidebar'),
      toggleChat: getElement('toggle-chat'),
      chatHeader: getElement('chat-header'),
      chatName: getElement('chat-name'),
      chatStatus: getElement('chat-status'),
      chatAvatar: getElement('chat-avatar'),
      chatEmpty: getElement('chat-empty'),
      chatContent: getElement('chat-content'),
      chatMessages: getElement('chat-messages'),
      chatInput: getElement('chat-input'),
      chatSend: getElement('chat-send'),
      chatClose: getElement('chat-close')
    };
  }

  /**
   * 绑定事件监听
   */
  bindEvents() {
    // 监听事件总线
    eventBus.on(Events.STATUS_MESSAGE, ({ message }) => this.showStatus(message));
    eventBus.on(Events.LOADING_CHANGED, (status) => this.updateLoadingStatus(status));
    eventBus.on(Events.GOLD_CHANGED, ({ gold }) => this.updateGoldDisplay(gold));
    eventBus.on(Events.FLOWER_PLANTED, () => this.onFlowerChange());
    eventBus.on(Events.FLOWER_HARVESTED, () => this.onFlowerChange());

    // 面板折叠
    if (this.elements.togglePanel) {
      this.elements.togglePanel.addEventListener('click', () => this.togglePanel());
    }
  }

  /**
   * 切换面板显示
   */
  togglePanel() {
    const panel = this.elements.panel;
    const btn = this.elements.togglePanel;
    if (panel && btn) {
      panel.classList.toggle('collapsed');
      btn.textContent = panel.classList.contains('collapsed') ? '▶' : '◀';
    }
  }

  /**
   * 显示状态消息
   * @param {string} message - 消息内容
   * @param {number} duration - 显示时长 (毫秒)
   */
  showStatus(message, duration = 2000) {
    const el = this.elements.loadingStatus;
    if (!el) return;

    el.innerHTML = `<span>${message}</span>`;

    if (this.statusTimeout) {
      clearTimeout(this.statusTimeout);
    }

    this.statusTimeout = setTimeout(() => {
      this.updateLoadingStatus({ isComplete: true });
    }, duration);
  }

  /**
   * 更新加载状态
   * @param {Object} status - 加载状态
   */
  updateLoadingStatus({ loading = 0, loaded = 0, isComplete = false }) {
    const el = this.elements.loadingStatus;
    if (!el) return;

    if (!isComplete && loading > loaded) {
      el.innerHTML = `
        <div class="loading-spinner"></div>
        <span>加载中: ${loaded}/${loading}</span>
      `;
    } else {
      el.innerHTML = '<span>就绪</span>';
    }
  }

  /**
   * 更新已种植数量显示
   * @param {number} count - 数量
   */
  updatePlantedCount(count) {
    const el = this.elements.plantedCount;
    if (el) {
      el.textContent = `已种植: ${count} 朵`;
    }
  }

  /**
   * 更新金币显示
   * @param {number} gold - 金币数量
   */
  updateGoldDisplay(gold) {
    const el = this.elements.goldValue;
    const display = this.elements.goldDisplay;
    if (el) {
      el.textContent = gold;
    }
    if (display) {
      display.classList.remove('animate');
      void display.offsetWidth;
      display.classList.add('animate');
    }
  }

  /**
   * 花朵数量变化时的回调
   */
  onFlowerChange() {
    // 由外部调用更新数量
  }

  /**
   * 显示对话气泡
   * @param {number} screenX - 屏幕 X 坐标
   * @param {number} screenY - 屏幕 Y 坐标
   * @param {string} message - 消息内容
   * @param {number} duration - 显示时长
   */
  showSpeechBubble(screenX, screenY, message, duration = 2000) {
    const bubble = this.elements.speechBubble;
    if (!bubble) return;

    bubble.textContent = message;
    bubble.style.left = screenX + 'px';
    bubble.style.top = (screenY - 60) + 'px';
    bubble.style.transform = 'translateX(-50%)';
    bubble.classList.add('visible');

    setTimeout(() => {
      bubble.classList.remove('visible');
    }, duration);
  }

  /**
   * 显示采摘飘字
   * @param {number} screenX - 屏幕 X 坐标
   * @param {number} screenY - 屏幕 Y 坐标
   * @param {number} amount - 金币数量
   */
  showHarvestPopup(screenX, screenY, amount) {
    createFloatingText(screenX, screenY, `+${amount}`, 'harvest-popup', 1000);
  }

  /**
   * 显示/隐藏种植模式指示
   * @param {boolean} active - 是否激活
   */
  setPlantModeActive(active) {
    toggleClass(this.elements.plantModeIndicator, 'active', active);
  }

  /**
   * 获取滑块设置回调
   * @param {string} sliderId - 滑块 ID
   * @param {string} valueId - 显示值元素 ID
   * @param {Function} callback - 值变化回调
   */
  setupSlider(sliderId, valueId, callback) {
    const slider = getElement(sliderId);
    const valueDisplay = getElement(valueId);

    if (slider && valueDisplay) {
      slider.addEventListener('input', () => {
        const value = parseFloat(slider.value);
        valueDisplay.textContent = value.toFixed(value >= 1 ? 1 : 2);
        callback(value);
      });
    }
  }
}

// 导出单例
export const uiManager = new UIManager();
