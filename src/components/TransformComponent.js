/**
 * 变换组件
 * 管理实体的位置、旋转、缩放
 */

import { Component } from '../core/Component.js';

export class TransformComponent extends Component {
  static type = 'transform';

  constructor(config = {}) {
    super();
    
    this.position = config.position || { x: 0, y: 0, z: 0 };
    this.rotation = config.rotation || { x: 0, y: 0, z: 0 };
    this.scale = config.scale || { x: 1, y: 1, z: 1 };
  }

  /**
   * 设置位置
   */
  setPosition(x, y, z) {
    this.position = { x, y, z };
    this.updateObject3D();
  }

  /**
   * 设置旋转
   */
  setRotation(x, y, z) {
    this.rotation = { x, y, z };
    this.updateObject3D();
  }

  /**
   * 设置缩放
   */
  setScale(x, y, z) {
    this.scale = { x, y, z };
    this.updateObject3D();
  }

  /**
   * 更新关联的 Object3D
   */
  updateObject3D() {
    if (this.entity && this.entity.object3D) {
      const obj = this.entity.object3D;
      obj.position.set(this.position.x, this.position.y, this.position.z);
      obj.rotation.set(this.rotation.x, this.rotation.y, this.rotation.z);
      obj.scale.set(this.scale.x, this.scale.y, this.scale.z);
    }
  }

  serialize() {
    return {
      ...super.serialize(),
      position: this.position,
      rotation: this.rotation,
      scale: this.scale
    };
  }

  deserialize(data) {
    super.deserialize(data);
    if (data.position) this.position = data.position;
    if (data.rotation) this.rotation = data.rotation;
    if (data.scale) this.scale = data.scale;
    this.updateObject3D();
  }
}
