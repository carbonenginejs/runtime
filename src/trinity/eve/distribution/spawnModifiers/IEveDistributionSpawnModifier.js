// Source: trinity/trinity/Eve/SpaceObject/Utils/EveDistributionMethods/DistributionSpawnModifiers/IEveDistributionSpawnModifier.h
import { meta } from "#schema";


/** Required distribution spawn-modifier contract. */
@meta.define({ className: "IEveDistributionSpawnModifier", family: "eve/distribution" })
export class IEveDistributionSpawnModifier
{

  /** Applies this modifier to one newly spawned placement. */
  @meta.blue.method
  @meta.abstract
  ProcessSpawnModifier(_placement, _context)
  {
    throw new Error("IEveDistributionSpawnModifier.ProcessSpawnModifier must be implemented by a concrete modifier.");
  }

}
