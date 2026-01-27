/**
 * 运动组件
 * 管理实体的运动
 */

import { Component } from '../core/Component.js';

export class MotionComponent extends Component {
  static type = 'motion';

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
