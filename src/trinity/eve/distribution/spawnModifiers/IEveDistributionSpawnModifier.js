// Source: trinity/trinity/Eve/SpaceObject/Utils/EveDistributionMethods/DistributionSpawnModifiers/IEveDistributionSpawnModifier.h
import { CjsModel } from "#model";
import { carbon, impl, type } from "#schema";


/** Required distribution spawn-modifier contract. */
@type.define({ className: "IEveDistributionSpawnModifier", family: "eve/distribution" })
export class IEveDistributionSpawnModifier extends CjsModel
{

  /** Applies this modifier to one newly spawned placement. */
  @carbon.method
  @impl.abstract
  ProcessSpawnModifier(_placement, _context)
  {
    throw new Error("IEveDistributionSpawnModifier.ProcessSpawnModifier must be implemented by a concrete modifier.");
  }

}
