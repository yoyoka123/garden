/**
 * 聊天界面管理
 * 适配 Agent-Skill 架构
 */

import { eventBus, Events } from '../EventBus.js';
import { getElement, toggleClass, setVisible } from '../utils/dom-helpers.js';

export class ChatUI {
  /**
   * @param {Object} bouquetCatalog - 花束目录
   * @param {import('../interactions/InputRouter.js').InputRouter} [inputRouter] - 输入路由器
   */
  constructor(bouquetCatalog, inputRouter = null) {
    this.bouquetCatalog = bouquetCatalog;
    this.inputRouter = inputRouter;
    this.currentChatFlower = null;

    this.cacheElements();
    this.bindEvents();
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

    // 关闭按钮
    if (this.elements.closeBtn) {
      this.elements.closeBtn.addEventListener('click', () => this.close());
    }

    // 切换按钮
    if (this.elements.toggleBtn) {
      this.elements.toggleBtn.addEventListener('click', () => this.toggle());
    }

    // ESC 关闭
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.close();
      }
    });
  }

  /**
   * 打开聊天界面（通过交互事件）
   * @param {Object} flowerData - 花朵数据
   * @param {import('../entities/EntityDescriptor.js').EntityDescriptor} [descriptor] - 实体描述
   */
  open(flowerData, descriptor = null) {
    const bouquetData = this.bouquetCatalog[flowerData.bouquetKey];
    if (!bouquetData || !bouquetData.agent) {
      eventBus.emit(Events.STATUS_MESSAGE, { message: '该花朵没有配置对话' });
      return;
    }

    const agent = bouquetData.agent;

    this.currentChatFlower = {
      flowerData,
      bouquetKey: flowerData.bouquetKey,
      agent,
      descriptor
    };

    // 展开侧边栏
    toggleClass(this.elements.sidebar, 'collapsed', false);
    this.elements.toggleBtn.textContent = '▶';
    toggleClass(this.elements.goldDisplay, 'chat-active', true);

    // 激活聊天界面
    toggleClass(this.elements.header, 'inactive', false);
    toggleClass(this.elements.header, 'active', true);

    // 设置信息
    const name = descriptor?.name || agent.name;
    this.elements.name.textContent = `对话对象：${name}`;
    this.elements.status.textContent = '想和你聊聊~';

    // 设置头像
    const images = Array.isArray(bouquetData) ? bouquetData : bouquetData.images;
    if (images && images.length > 0) {
      this.elements.avatar.style.backgroundImage = `url(${images[0]})`;
    }

    // 显示聊天内容
    toggleClass(this.elements.empty, 'hidden', true);
    toggleClass(this.elements.content, 'active', true);

    // 清空之前的消息
    this.elements.messages.innerHTML = '';

    // 显示问候语
    const greeting = descriptor?.customData?.greeting || agent.greeting;
    if (greeting) {
      this.addMessage('flower', greeting);
    }

    // 聚焦输入框
    this.elements.input.focus();

    eventBus.emit(Events.CHAT_STARTED, { flowerData, agent, descriptor });
  }

  /**
   * 通过 Agent 输出打开/更新聊天
   * @param {import('../agent/GardenAgent.js').AgentOutput} output
   * @param {Object} flowerData
   */
  openWithAgentOutput(output, flowerData) {
    if (!this.currentChatFlower || this.currentChatFlower.flowerData.id !== flowerData.id) {
      this.open(flowerData);
    }

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
  }

  /**
   * 关闭聊天界面
   */
  close() {
    toggleClass(this.elements.sidebar, 'collapsed', true);
    this.elements.toggleBtn.textContent = '◀';
    toggleClass(this.elements.goldDisplay, 'chat-active', false);

    toggleClass(this.elements.header, 'active', false);
    toggleClass(this.elements.header, 'inactive', true);

    this.elements.name.textContent = '无对话对象';
    this.elements.status.textContent = '点击成熟的花朵开始对话';

    toggleClass(this.elements.content, 'active', false);
    toggleClass(this.elements.empty, 'hidden', false);

    if (this.currentChatFlower) {
      eventBus.emit(Events.CHAT_ENDED, {
        flowerData: this.currentChatFlower.flowerData
      });
    }

    this.currentChatFlower = null;

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

    toggleClass(this.elements.sidebar, 'collapsed', !isCollapsed);
    this.elements.toggleBtn.textContent = isCollapsed ? '▶' : '◀';
    toggleClass(this.elements.goldDisplay, 'chat-active', isCollapsed);
  }

  /**
   * 添加消息到界面
   * @param {string} type - 消息类型 ('user' | 'flower' | 'system')
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
   * 发送消息
   */
  async sendMessage() {
    const userMessage = this.elements.input.value.trim();
    if (!userMessage || !this.currentChatFlower) return;

    // 清空输入框
    this.elements.input.value = '';
    this.elements.sendBtn.disabled = true;

    // 添加用户消息
    this.addMessage('user', userMessage);

    // 显示输入中
    this.showTyping();

    try {
      if (this.inputRouter) {
        // 使用新的 Agent 系统
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
      } else {
        // 兼容模式：使用旧的 FlowerAgent
        const { chatWithFlower, conversationManager } = await import('../ai/FlowerAgent.js');
        const conversation = conversationManager.getOrCreateConversation(
          this.currentChatFlower.flowerData,
          this.currentChatFlower.agent
        );

        const result = await chatWithFlower(conversation, userMessage);

        this.hideTyping();

        if (result.text) {
          this.addMessage('flower', result.text);
        }

        if (result.harvested) {
          setTimeout(() => {
            this.handleHarvestSuccess(result.reason);
          }, 500);
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
    if (!this.currentChatFlower) return;

    const flowerData = this.currentChatFlower.flowerData;
    const agent = this.currentChatFlower.agent;

    this.close();

    // 发送采摘成功事件（如果不是通过 HarvestSkill 发送的）
    // HarvestSkill 已经发送了事件，这里不需要重复发送
  }

  /**
   * 获取当前聊天的花朵
   * @returns {Object|null}
   */
  getCurrentFlower() {
    return this.currentChatFlower?.flowerData || null;
  }

  /**
   * 更新花束目录引用
   * @param {Object} bouquetCatalog
   */
  updateBouquetCatalog(bouquetCatalog) {
    this.bouquetCatalog = bouquetCatalog;
  }
}
