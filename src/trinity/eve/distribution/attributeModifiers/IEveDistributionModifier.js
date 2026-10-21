import { exposure as be } from "#be";
import { IRoot } from "../../../../global/blue/IRoot.js";
// Source: trinity/trinity/Eve/SpaceObject/Utils/EveDistributionMethods/DistributionAttributeModifiers/IEveDistributionModifier.h
import { meta, blue } from "#schema";


/** Required distribution attribute-modifier contract. */
@be.interface("IEveDistributionModifier")
@be.inherit(IRoot)
export class IEveDistributionModifier extends IRoot
{

  /** Applies this modifier to one distribution placement. */
  @be.abstract
  ProcessDistributionModifier(_placement, _context) {}

  /** Reports whether this modifier changes placement transforms.
   * Carbon declaration: IEveDistributionModifier::AffectsTransform (trinity/trinity/Eve/SpaceObject/Utils/EveDistributionMethods/DistributionAttributeModifiers/IEveDistributionModifier.h:58).
   */
  @meta.implemented
  AffectsTransform()
  {
    return false;
  }

}
