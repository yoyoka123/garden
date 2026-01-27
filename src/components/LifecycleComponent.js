/**
 * 生命周期组件
 * 管理实体的生命周期事件
 */

import { Component } from '../core/Component.js';

export class LifecycleComponent extends Component {
  static type = 'lifecycle';

  constructor(config = {}) {
    super();
    this.config = config;
  }

  serialize() {
    return {
      ...super.serialize(),
      config: this.config
    };
  }

  deserialize(data) {
    super.deserialize(data);
    if (data.config) this.config = data.config;
  }
}
