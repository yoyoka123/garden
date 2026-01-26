/**
 * 运动模块导出
 */

export { Motion } from './Motion.js';
export { Easing } from './Easing.js';
export { MotionController, motionController } from './MotionController.js';
export { MotionComposer, SequenceMotion, ParallelMotion, LoopMotion, DelayMotion } from './MotionComposer.js';
export { MotionTrigger, Triggers } from './MotionTrigger.js';
export { MotionRegistry, motionRegistry } from './MotionRegistry.js';

// 运动类型
export * from './types/index.js';
