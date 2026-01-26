/**
 * 组件基类
 * 组件是可复用的功能单元，附加到实体上
 */

export class Component {
  /** @type {string} 组件类型标识 */
  static type = 'component';

  constructor() {
    /** @type {import('./Entity.js').Entity|null} */
    this.entity = null;

    /** @type {boolean} */
    this.enabled = true;
  }

  /**
   * 获取组件类型
   * @returns {string}
   */
  getType() {
    return this.constructor.type;
  }

  /**
   * 组件被添加到实体时调用
   * @param {import('./Entity.js').Entity} entity
   */
  onAttach(entity) {
    this.entity = entity;
  }

  /**
   * 组件从实体移除时调用
   */
  onDetach() {
    this.entity = null;
  }

  /**
   * 每帧更新（由 EntityManager 调用）
   * @param {number} deltaTime - 距离上一帧的时间（秒）
   * @param {number} time - 总运行时间（秒）
   */
  update(deltaTime, time) {
    // 子类实现
  }

  /**
   * 序列化组件数据（用于持久化）
   * @returns {Object}
   */
  serialize() {
    return {
      type: this.getType(),
      enabled: this.enabled
    };
  }

  /**
   * 从序列化数据恢复
   * @param {Object} data
   */
  deserialize(data) {
    this.enabled = data.enabled ?? true;
  }

  /**
   * 销毁组件，释放资源
   */
  dispose() {
    // 子类实现资源清理
  }
}
