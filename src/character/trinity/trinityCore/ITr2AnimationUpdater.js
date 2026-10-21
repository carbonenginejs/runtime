import { IRoot } from "#blue/IRoot";
// Source: trinity/trinity/Include/ITr2AnimationUpdater.h:7-15
import { CjsSchema, blue } from "#schema";

/** Carbon animation pose-provider interface; IRoot has no JavaScript base. */
export class ITr2AnimationUpdater
{
  /**
   * Updates the pose before physics at the supplied time and model transform.
   * @param {number} _time Animation time.
   * @param {ArrayLike<number>} _modelTransform Model-to-world transform.
   * @returns {void}
   */
  @blue.abstract
  PrePhysicsAnimation(_time, _modelTransform) {}

  /**
   * Updates the pose after physics at the supplied time and model transform.
   * @param {number} _time Animation time.
   * @param {ArrayLike<number>} _modelTransform Model-to-world transform.
   * @returns {void}
   */
  @blue.abstract
  PostPhysicsAnimation(_time, _modelTransform) {}

  /**
   * Returns the animation's bone transforms.
   * Adapted: JavaScript providers return an array instead of Carbon's matrix pointer.
   * @returns {Array<ArrayLike<number>>} Bone transforms supplied by the provider.
   */
  @blue.abstract
  GetAnimationTransforms() {}

  /**
   * Returns the names corresponding to the animation's bone transforms.
   * Adapted: the returned array carries its count instead of Carbon's output reference.
   * @returns {Array<string>} Bone names supplied by the provider.
   */
  @blue.abstract
  GetAnimationBoneList() {}
}

CjsSchema.exposure.interface("ITr2AnimationUpdater")(ITr2AnimationUpdater);

blue.inherit(IRoot)(ITr2AnimationUpdater);
