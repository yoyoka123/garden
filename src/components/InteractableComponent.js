/**
 * 可交互组件
 * 管理实体的交互行为
 */

import { Component } from '../core/Component.js';

export class InteractableComponent extends Component {
  static type = 'interactable';

  constructor(config = {}) {
    super();
    
    this.behaviors = config.behaviors || [];
    this.enabled = config.enabled !== false;
  }

  /**
   * 添加交互行为
   */
  addBehavior(behavior) {
    this.behaviors.push(behavior);
  }

  /**
   * 移除交互行为
   */
  removeBehavior(behavior) {
    const index = this.behaviors.indexOf(behavior);
    if (index > -1) {
      this.behaviors.splice(index, 1);
    }
  }

  serialize() {
    return {
      ...super.serialize(),
      behaviors: this.behaviors.map(b => b.serialize ? b.serialize() : b),
      enabled: this.enabled
    };
  }

  deserialize(data) {
    super.deserialize(data);
    if (data.behaviors) this.behaviors = data.behaviors;
    if (data.enabled !== undefined) this.enabled = data.enabled;
  }
}
