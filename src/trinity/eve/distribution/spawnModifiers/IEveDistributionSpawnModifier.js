import { IRoot } from "../../../../global/blue/IRoot.js";
// Source: trinity/trinity/Eve/SpaceObject/Utils/EveDistributionMethods/DistributionSpawnModifiers/IEveDistributionSpawnModifier.h
import { meta, blue } from "#schema";


/** Required distribution spawn-modifier contract. */
@blue.define("IEveDistributionSpawnModifier")
@blue.inherit(IRoot)
export class IEveDistributionSpawnModifier
{

  /** Applies this modifier to one newly spawned placement. */
  @blue.method
  @meta.abstract
  ProcessSpawnModifier(_placement, _context)
  {
    throw new Error("IEveDistributionSpawnModifier.ProcessSpawnModifier must be implemented by a concrete modifier.");
  }

}
