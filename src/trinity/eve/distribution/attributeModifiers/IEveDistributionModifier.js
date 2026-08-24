// Source: trinity/trinity/Eve/SpaceObject/Utils/EveDistributionMethods/DistributionAttributeModifiers/IEveDistributionModifier.h
import { CjsModel } from "#model";
import { carbon, impl, type } from "#schema";


/** Required distribution attribute-modifier contract. */
@type.define({ className: "IEveDistributionModifier", family: "eve/distribution" })
export class IEveDistributionModifier extends CjsModel
{

  /** Applies this modifier to one distribution placement. */
  @carbon.method
  @impl.abstract
  ProcessDistributionModifier(_placement, _context)
  {
    throw new Error("IEveDistributionModifier.ProcessDistributionModifier must be implemented by a concrete modifier.");
  }

  /** Reports whether this modifier changes placement transforms. */
  @carbon.method
  @impl.implemented
  AffectsTransform()
  {
    return false;
  }

}
