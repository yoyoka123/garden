/**
 * 运动控制器
 * 管理所有活跃的运动
 */

import { eventBus, Events } from '../EventBus.js';

export class MotionController {
  constructor() {
    /** @type {Map<string, Map<string, import('./Motion.js').Motion>>} 实体ID -> (运动ID -> 运动) */
    this.motions = new Map();
  }

  /**
   * 为实体添加运动
   * @param {import('../core/Entity.js').Entity} entity
   * @param {string} motionId - 运动标识
   * @param {import('./Motion.js').Motion} motion
   */
  add(entity, motionId, motion) {
    if (!this.motions.has(entity.id)) {
      this.motions.set(entity.id, new Map());
    }

    const entityMotions = this.motions.get(entity.id);

    // 如果已有同名运动，先移除
    if (entityMotions.has(motionId)) {
      this.remove(entity, motionId);
    }

    motion.setEntity(entity);
    entityMotions.set(motionId, motion);

    eventBus.emit(Events.MOTION_STARTED, {
      entity,
      motionId,
      motion
    });
  }

  /**
   * 移除运动
   * @param {import('../core/Entity.js').Entity} entity
   * @param {string} motionId
   */
  remove(entity, motionId) {
    const entityMotions = this.motions.get(entity.id);
    if (!entityMotions) return;

    const motion = entityMotions.get(motionId);
    if (motion) {
      motion.dispose();
      entityMotions.delete(motionId);

      eventBus.emit(Events.MOTION_CANCELLED, {
        entity,
        motionId
      });
    }

    // 清理空的实体映射
    if (entityMotions.size === 0) {
      this.motions.delete(entity.id);
    }
  }

  /**
   * 获取实体的运动
   * @param {import('../core/Entity.js').Entity} entity
   * @param {string} motionId
   * @returns {import('./Motion.js').Motion|null}
   */
  get(entity, motionId) {
    return this.motions.get(entity.id)?.get(motionId) || null;
  }

  /**
   * 获取实体的所有运动
   * @param {import('../core/Entity.js').Entity} entity
   * @returns {import('./Motion.js').Motion[]}
   */
  getAll(entity) {
    const entityMotions = this.motions.get(entity.id);
    return entityMotions ? Array.from(entityMotions.values()) : [];
  }

  /**
   * 更新所有运动
   * @param {number} deltaTime - 增量时间（秒）
   * @param {number} time - 总时间（秒）
   */
  update(deltaTime, time) {
    const completedMotions = [];

    for (const [entityId, entityMotions] of this.motions) {
      for (const [motionId, motion] of entityMotions) {
        motion.update(deltaTime, time);

        if (motion.isComplete()) {
          completedMotions.push({ entityId, motionId, motion });
        }
      }
    }

    // 清理已完成的运动
    for (const { entityId, motionId, motion } of completedMotions) {
      const entityMotions = this.motions.get(entityId);
      if (entityMotions) {
        entityMotions.delete(motionId);

        eventBus.emit(Events.MOTION_COMPLETED, {
          entityId,
          motionId,
          motion
        });

        motion.dispose();

        if (entityMotions.size === 0) {
          this.motions.delete(entityId);
        }
      }
    }
  }

  /**
   * 停止实体的所有运动
   * @param {import('../core/Entity.js').Entity} entity
   */
  stopAll(entity) {
    const entityMotions = this.motions.get(entity.id);
    if (!entityMotions) return;

    for (const [motionId, motion] of entityMotions) {
      motion.dispose();
      eventBus.emit(Events.MOTION_CANCELLED, {
        entity,
        motionId
      });
    }

    this.motions.delete(entity.id);
  }

  /**
   * 暂停实体的所有运动
   * @param {import('../core/Entity.js').Entity} entity
   */
  pauseAll(entity) {
    const entityMotions = this.motions.get(entity.id);
    if (!entityMotions) return;

    for (const motion of entityMotions.values()) {
      motion.pause();
    }
  }

  /**
   * 恢复实体的所有运动
   * @param {import('../core/Entity.js').Entity} entity
   */
  resumeAll(entity) {
    const entityMotions = this.motions.get(entity.id);
    if (!entityMotions) return;

    for (const motion of entityMotions.values()) {
      motion.resume();
    }
  }

  /**
   * 清除所有运动
   */
  clear() {
    for (const entityMotions of this.motions.values()) {
      for (const motion of entityMotions.values()) {
        motion.dispose();
      }
    }
    this.motions.clear();
  }

  /**
   * 获取活跃运动数量
   * @returns {number}
   */
  get count() {
    let count = 0;
    for (const entityMotions of this.motions.values()) {
      count += entityMotions.size;
    }
    return count;
  }
}

// 导出单例
export const motionController = new MotionController();
