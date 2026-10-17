import { IRoot } from "../../../../global/blue/IRoot.js";
// Source: trinity/trinity/Eve/SpaceObject/Utils/EveDistributionMethods/DistributionAttributeModifiers/IEveDistributionModifier.h
import { meta, blue } from "#schema";


/** Required distribution attribute-modifier contract. */
@blue.define("IEveDistributionModifier")
@blue.inherit(IRoot)
export class IEveDistributionModifier
{

  /** Applies this modifier to one distribution placement. */
  @blue.abstract
  ProcessDistributionModifier(_placement, _context) {}

  /** Reports whether this modifier changes placement transforms. */
  @blue.method
  @meta.implemented
  AffectsTransform()
  {
    return false;
  }

}
