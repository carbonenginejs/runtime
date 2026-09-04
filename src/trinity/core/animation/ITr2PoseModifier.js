// Source: trinity/Include/ITr2PoseModifier.h (created by 6b7e9e5c, 2026-09-01)
import { CjsModel } from "#model";
import { carbon, impl, type } from "#schema";


/**
 * Carbon's canonical modify-the-sampled-pose hook: registered non-owning on
 * Tr2GrannyAnimation, called after sampling with the mesh skeleton and the
 * freshly sampled pose. First implementor upstream is EveChildTurret;
 * character look-at/IK fixups implement THIS rather than inventing a
 * parallel hook (see /docs research: carbon-new-classes-port-spec.md).
 */
@type.define({ className: "ITr2PoseModifier", family: "trinityCore/animation" })
export class ITr2PoseModifier extends CjsModel
{

  /**
   * Adjusts the sampled pose in place.
   * @param {Object} _skeleton - the mesh skeleton (cmf.Skeleton shape)
   * @param {Object} _pose - the sampled pose to modify in place
   */
  @carbon.method
  @impl.abstract
  ModifyPose(_skeleton, _pose)
  {
    throw new Error("ITr2PoseModifier.ModifyPose must be implemented by a concrete modifier.");
  }

}
