/**
 * 组件注册表
 * 管理组件类型的注册和实例化
 */

export class ComponentRegistry {
  constructor() {
    /** @type {Map<string, typeof import('./Component.js').Component>} */
    this.componentClasses = new Map();
  }

  /**
   * 注册组件类
   * @param {typeof import('./Component.js').Component} ComponentClass
   */
  register(ComponentClass) {
    const type = ComponentClass.type;
    if (this.componentClasses.has(type)) {
      console.warn(`Component type ${type} is already registered`);
      return;
    }
    this.componentClasses.set(type, ComponentClass);
  }

  /**
   * 获取组件类
   * @param {string} type
   * @returns {typeof import('./Component.js').Component|null}
   */
  get(type) {
    return this.componentClasses.get(type) || null;
  }

  /**
   * 创建组件实例
   * @param {string} type
   * @param {Object} config - 组件配置
   * @returns {import('./Component.js').Component|null}
   */
  create(type, config = {}) {
    const ComponentClass = this.componentClasses.get(type);
    if (!ComponentClass) {
      console.warn(`Unknown component type: ${type}`);
      return null;
    }

    const component = new ComponentClass(config);
    return component;
  }

  /**
   * 从序列化数据恢复组件
   * @param {Object} data - 序列化数据
   * @returns {import('./Component.js').Component|null}
   */
  deserialize(data) {
    const component = this.create(data.type);
    if (component) {
      component.deserialize(data);
    }
    return component;
  }

  /**
   * 获取所有已注册的组件类型
   * @returns {string[]}
   */
  getTypes() {
    return Array.from(this.componentClasses.keys());
  }

  /**
   * 检查组件类型是否已注册
   * @param {string} type
   * @returns {boolean}
   */
  has(type) {
    return this.componentClasses.has(type);
  }
}

// 导出单例
export const componentRegistry = new ComponentRegistry();
