// Source: trinity/trinity/ITr2WorldTransformUpdater.h:7-11
import { exposure as be } from "#be";
import { IRoot } from "#exposure/IRoot";


/**
 * An object that updates a skinned object's world transform for rendering
 * (Tr2SkinnedObject's `worldTransformUpdater`, Tr2SkinnedObject_Blue.cpp:39).
 *
 * Carbon: ITr2WorldTransformUpdater (trinity/trinity/ITr2WorldTransformUpdater.h:7-11)
 */
@be.interface("ITr2WorldTransformUpdater")
@be.inherit(IRoot)
export class ITr2WorldTransformUpdater extends IRoot
{

  /**
   * Updates the transform for a time.
   *
   * @abstract
   */
  @be.abstract
  UpdateTransform(_time, _transform)
  {
  }

}
