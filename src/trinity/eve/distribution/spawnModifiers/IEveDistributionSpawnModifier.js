import { exposure as be } from "#be";
import { IRoot } from "../../../../global/blue/IRoot.js";
// Source: trinity/trinity/Eve/SpaceObject/Utils/EveDistributionMethods/DistributionSpawnModifiers/IEveDistributionSpawnModifier.h
import { blue } from "#schema";


/** Required distribution spawn-modifier contract. */
@be.interface("IEveDistributionSpawnModifier")
@blue.inherit(IRoot)
export class IEveDistributionSpawnModifier extends IRoot
{

  /** Applies this modifier to one newly spawned placement. */
  @blue.abstract
  ProcessSpawnModifier(_placement, _context) {}

}
