// Source: trinity/trinity/Include/ITr2AnimationUpdater.h

/**
 * Carbon's animation pose-provider contract.
 *
 * This is a type-only `BLUE_INTERFACE`, not a constructible Blue model.
 * CarbonEngineJS adapters expose bone names and transforms as arrays rather
 * than a pointer plus an output-count reference.
 *
 * @typedef {object} ITr2AnimationUpdater
 * @property {(time: number, modelTransform: ArrayLike<number>) => void} PrePhysicsAnimation
 * @property {(time: number, modelTransform: ArrayLike<number>) => void} PostPhysicsAnimation
 * @property {() => Array<ArrayLike<number>>} GetAnimationTransforms
 * @property {() => Array<string>} GetAnimationBoneList
 */

export {};
