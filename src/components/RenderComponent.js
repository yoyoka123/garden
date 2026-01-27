/**
 * 渲染组件
 * 管理实体的渲染
 */

import { Component } from '../core/Component.js';

export class RenderComponent extends Component {
  static type = 'render';

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
