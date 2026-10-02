// Source: trinity/trinity/Eve/SpaceObject/Utils/EveDistributionMethods/DistributionAttributeModifiers/IEveDistributionModifier.h
import { meta } from "#schema";


/** Required distribution attribute-modifier contract. */
@meta.define({ className: "IEveDistributionModifier", family: "eve/distribution" })
export class IEveDistributionModifier
{

  /** Applies this modifier to one distribution placement. */
  @meta.blue.method
  @meta.abstract
  ProcessDistributionModifier(_placement, _context)
  {
    throw new Error("IEveDistributionModifier.ProcessDistributionModifier must be implemented by a concrete modifier.");
  }

  /** Reports whether this modifier changes placement transforms. */
  @meta.blue.method
  @meta.implemented
  AffectsTransform()
  {
    return false;
  }

}
