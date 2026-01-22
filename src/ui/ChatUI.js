/**
 * 聊天界面管理
 * 通用 Agent 聊天界面，支持文本对话和交互事件
 */

import { eventBus, Events } from '../EventBus.js';
import { getElement, toggleClass, setVisible } from '../utils/dom-helpers.js';
import { EntityInteractions } from '../config/prompts/index.js';

export class ChatUI {
  /**
   * @param {Object} bouquetCatalog - 花束目录
   * @param {import('../interactions/InputRouter.js').InputRouter} inputRouter - 输入路由器
   */
  constructor(bouquetCatalog, inputRouter) {
    this.bouquetCatalog = bouquetCatalog;
    this.inputRouter = inputRouter;
    this.isActive = false;

    this.cacheElements();
    this.bindEvents();
    this.initChat();
  }

  /**
   * 设置输入路由器
   * @param {import('../interactions/InputRouter.js').InputRouter} inputRouter
   */
  setInputRouter(inputRouter) {
    this.inputRouter = inputRouter;
  }

  /**
   * 缓存 DOM 元素
   */
  cacheElements() {
    this.elements = {
      sidebar: getElement('chat-sidebar'),
      toggleBtn: getElement('toggle-chat'),
      header: getElement('chat-header'),
      name: getElement('chat-name'),
      status: getElement('chat-status'),
      avatar: getElement('chat-avatar'),
      empty: getElement('chat-empty'),
      content: getElement('chat-content'),
      messages: getElement('chat-messages'),
      input: getElement('chat-input'),
      sendBtn: getElement('chat-send'),
      closeBtn: getElement('chat-close'),
      goldDisplay: getElement('gold-display')
    };
  }

  /**
   * 绑定事件
   */
  bindEvents() {
    // 发送按钮
    if (this.elements.sendBtn) {
      this.elements.sendBtn.addEventListener('click', () => this.sendMessage());
    }

    // 输入框回车
    if (this.elements.input) {
      this.elements.input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.sendMessage();
        }
      });
    }

    // 关闭按钮 - 改为最小化
    if (this.elements.closeBtn) {
      this.elements.closeBtn.addEventListener('click', () => this.minimize());
    }

    // 切换按钮
    if (this.elements.toggleBtn) {
      this.elements.toggleBtn.addEventListener('click', () => this.toggle());
    }

    // ESC 最小化
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isActive) {
        this.minimize();
      }
    });
  }

  /**
   * 初始化通用聊天界面
   */
  initChat() {
    // 激活聊天界面
    toggleClass(this.elements.header, 'inactive', false);
    toggleClass(this.elements.header, 'active', true);

    // 设置默认信息
    this.elements.name.textContent = '花园精灵';
    this.elements.status.textContent = '随时可以聊天~';

    // 显示聊天内容区域
    toggleClass(this.elements.empty, 'hidden', true);
    toggleClass(this.elements.content, 'active', true);

    // 显示欢迎消息
    this.addMessage('flower', this.inputRouter?.getGreeting() || '你好！我是花园精灵，有什么可以帮助你的吗？');

    this.isActive = true;
  }

  /**
   * 展开聊天界面
   */
  expand() {
    toggleClass(this.elements.sidebar, 'collapsed', false);
    this.elements.toggleBtn.textContent = '▶';
    toggleClass(this.elements.goldDisplay, 'chat-active', true);
    this.elements.input.focus();
  }

  /**
   * 最小化聊天界面（不清空消息）
   */
  minimize() {
    toggleClass(this.elements.sidebar, 'collapsed', true);
    this.elements.toggleBtn.textContent = '◀';
    toggleClass(this.elements.goldDisplay, 'chat-active', false);

    // 清除 Agent 的焦点实体
    if (this.inputRouter) {
      this.inputRouter.getAgent().clearFocusedEntity();
    }
  }

  /**
   * 切换侧边栏
   */
  toggle() {
    const isCollapsed = this.elements.sidebar.classList.contains('collapsed');
    if (isCollapsed) {
      this.expand();
    } else {
      this.minimize();
    }
  }

  /**
   * 添加交互事件到对话（点击花朵等）
   * @param {string} interactionType - 交互类型 ('click' | 'dblclick' | 'contextmenu')
   * @param {Object} flowerData - 花朵数据
   * @param {Object} descriptor - 实体描述
   * @param {import('../agent/GardenAgent.js').AgentOutput} output - Agent 输出
   */
  appendInteraction(interactionType, flowerData, descriptor, output) {
    // 确保聊天界面展开
    this.expand();

    // 更新头部信息显示当前焦点
    const name = descriptor?.name || flowerData.bouquetKey || '花朵';
    this.elements.name.textContent = `正在关注：${name}`;

    // 设置头像
    const bouquetData = this.bouquetCatalog[flowerData.bouquetKey];
    if (bouquetData) {
      const images = Array.isArray(bouquetData) ? bouquetData : bouquetData.images;
      if (images && images.length > 0) {
        this.elements.avatar.style.backgroundImage = `url(${images[0]})`;
      }
    }

    // 显示用户动作
    const actionLabel = EntityInteractions.interactionLabels[interactionType] || '操作了';
    this.addMessage('action', `${actionLabel} ${name}`);

    // 显示 Agent 回复
    if (output.text) {
      this.addMessage('flower', output.text);
    }

    // 处理工具执行结果
    if (output.toolExecutions) {
      for (const execution of output.toolExecutions) {
        if (execution.toolName === 'harvest' && execution.result.success) {
          setTimeout(() => {
            this.handleHarvestSuccess(execution.arguments.reason);
          }, 500);
        }
      }
    }

    eventBus.emit(Events.CHAT_STARTED, { flowerData, descriptor });
  }

  /**
   * 添加消息到界面
   * @param {string} type - 消息类型 ('user' | 'flower' | 'system' | 'action')
   * @param {string} text - 消息文本
   */
  addMessage(type, text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${type}`;

    const bubbleDiv = document.createElement('div');
    bubbleDiv.className = 'chat-bubble';
    bubbleDiv.textContent = text;

    messageDiv.appendChild(bubbleDiv);
    this.elements.messages.appendChild(messageDiv);
    this.elements.messages.scrollTop = this.elements.messages.scrollHeight;
  }

  /**
   * 显示输入中动画
   */
  showTyping() {
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
    this.elements.messages.appendChild(typingDiv);
    this.elements.messages.scrollTop = this.elements.messages.scrollHeight;
  }

  /**
   * 隐藏输入中动画
   */
  hideTyping() {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) {
      indicator.remove();
    }
  }

  /**
   * 发送消息（通用聊天，不需要先点击花朵）
   */
  async sendMessage() {
    const userMessage = this.elements.input.value.trim();
    if (!userMessage) return;

    // 清空输入框
    this.elements.input.value = '';
    this.elements.sendBtn.disabled = true;

    // 添加用户消息
    this.addMessage('user', userMessage);

    // 显示输入中
    this.showTyping();

    try {
      const output = await this.inputRouter.handleTextInput(userMessage);

      this.hideTyping();

      if (output.text) {
        this.addMessage('flower', output.text);
      }

      // 处理工具执行结果
      if (output.toolExecutions) {
        for (const execution of output.toolExecutions) {
          if (execution.toolName === 'harvest' && execution.result.success) {
            setTimeout(() => {
              this.handleHarvestSuccess(execution.arguments.reason);
            }, 500);
          }
        }
      }
    } catch (error) {
      this.hideTyping();
      this.addMessage('system', `出错了：${error.message}`);
    }

    this.elements.sendBtn.disabled = false;
    this.elements.input.focus();
  }

  /**
   * 处理采摘成功
   * @param {string} reason - 采摘原因
   */
  handleHarvestSuccess(reason) {
    // 显示采摘成功消息
    this.addMessage('system', `采摘成功！`);

    // 重置头部信息
    this.elements.name.textContent = '花园精灵';
    this.elements.status.textContent = '随时可以聊天~';
  }

  /**
   * 更新花束目录引用
   * @param {Object} bouquetCatalog
   */
  updateBouquetCatalog(bouquetCatalog) {
    this.bouquetCatalog = bouquetCatalog;
  }

  // 保留兼容方法
  open(flowerData, descriptor = null) {
    this.expand();
  }

  close() {
    this.minimize();
  }
}
