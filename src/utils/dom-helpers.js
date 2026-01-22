/**
 * DOM 工具函数
 */

/**
 * 安全获取 DOM 元素
 * @param {string} id - 元素 ID
 * @returns {HTMLElement|null} DOM 元素
 */
export function getElement(id) {
  return document.getElementById(id);
}

/**
 * 创建 DOM 元素
 * @param {string} tag - 标签名
 * @param {Object} attrs - 属性对象
 * @param {string|HTMLElement[]} children - 子元素
 * @returns {HTMLElement} 创建的元素
 */
export function createElement(tag, attrs = {}, children = null) {
  const el = document.createElement(tag);

  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'className') {
      el.className = value;
    } else if (key === 'style' && typeof value === 'object') {
      Object.assign(el.style, value);
    } else if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else {
      el.setAttribute(key, value);
    }
  }

  if (children) {
    if (typeof children === 'string') {
      el.textContent = children;
    } else if (Array.isArray(children)) {
      children.forEach(child => el.appendChild(child));
    } else {
      el.appendChild(children);
    }
  }

  return el;
}

/**
 * 显示/隐藏元素
 * @param {HTMLElement} element - DOM 元素
 * @param {boolean} visible - 是否可见
 */
export function setVisible(element, visible) {
  if (element) {
    element.style.display = visible ? '' : 'none';
  }
}

/**
 * 添加/移除 CSS 类
 * @param {HTMLElement} element - DOM 元素
 * @param {string} className - CSS 类名
 * @param {boolean} add - 是否添加
 */
export function toggleClass(element, className, add) {
  if (element) {
    element.classList.toggle(className, add);
  }
}

/**
 * 创建飘字动画元素
 * @param {number} x - X 坐标
 * @param {number} y - Y 坐标
 * @param {string} text - 文本内容
 * @param {string} className - CSS 类名
 * @param {number} duration - 动画时长 (毫秒)
 */
export function createFloatingText(x, y, text, className = 'floating-text', duration = 1000) {
  const el = createElement('div', {
    className,
    style: {
      position: 'fixed',
      left: x + 'px',
      top: y + 'px',
      pointerEvents: 'none',
      zIndex: '1000'
    }
  }, text);

  document.body.appendChild(el);

  setTimeout(() => el.remove(), duration);

  return el;
}

/**
 * 读取文件为 Data URL
 * @param {File} file - 文件对象
 * @returns {Promise<string>} Data URL
 */
export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * 加载图片
 * @param {string} src - 图片源
 * @returns {Promise<HTMLImageElement>} 图片元素
 */
export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
