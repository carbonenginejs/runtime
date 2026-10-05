// Source: trinity/trinity/Include/ITr2AnimationUpdater.h:7-15
import { CjsSchema, meta } from "#schema";

/** Carbon animation pose-provider interface; IRoot has no JavaScript base. */
export class ITr2AnimationUpdater
{
  /**
   * Updates the pose before physics at the supplied time and model transform.
   * @param {number} _time Animation time.
   * @param {ArrayLike<number>} _modelTransform Model-to-world transform.
   * @returns {void}
   */
  @meta.abstract
  PrePhysicsAnimation(_time, _modelTransform)
  {
    throw new Error("ITr2AnimationUpdater.PrePhysicsAnimation must be implemented by a pose provider.");
  }

  /**
   * Updates the pose after physics at the supplied time and model transform.
   * @param {number} _time Animation time.
   * @param {ArrayLike<number>} _modelTransform Model-to-world transform.
   * @returns {void}
   */
  @meta.abstract
  PostPhysicsAnimation(_time, _modelTransform)
  {
    throw new Error("ITr2AnimationUpdater.PostPhysicsAnimation must be implemented by a pose provider.");
  }

  /**
   * Returns the animation's bone transforms.
   * Adapted: JavaScript providers return an array instead of Carbon's matrix pointer.
   * @returns {Array<ArrayLike<number>>} Bone transforms supplied by the provider.
   */
  @meta.abstract
  GetAnimationTransforms()
  {
    throw new Error("ITr2AnimationUpdater.GetAnimationTransforms must be implemented by a pose provider.");
  }

  /**
   * Returns the names corresponding to the animation's bone transforms.
   * Adapted: the returned array carries its count instead of Carbon's output reference.
   * @returns {Array<string>} Bone names supplied by the provider.
   */
  @meta.abstract
  GetAnimationBoneList()
  {
    throw new Error("ITr2AnimationUpdater.GetAnimationBoneList must be implemented by a pose provider.");
  }
}

CjsSchema.define(ITr2AnimationUpdater, {
  className: "ITr2AnimationUpdater", carbon: "ITr2AnimationUpdater", family: "trinityCore", fields: {}
});
