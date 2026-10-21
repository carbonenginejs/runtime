import { exposure as be } from "#be";
import { IRoot } from "../../../../global/blue/IRoot.js";
// Source: trinity/trinity/Eve/SpaceObject/Utils/EveDistributionMethods/DistributionPlacementGenerators/IEveDistributionPlacementGenerators.h
import { meta, blue } from "#schema";


/** Required distribution placement-generator contract. */
@be.interface("IEveDistributionPlacementGenerators")
@blue.inherit(IRoot)
export class IEveDistributionPlacementGenerators extends IRoot
{

  /** Writes the generator's initial placement records. */
  @blue.abstract
  GetInitialPlacements(_out) {}

  /** Reports whether this generator requests placement regeneration. */
  @blue.abstract
  IsRequestingRegeneration() {}

  /** Runs the optional synchronous placement-generator update hook. */

  @meta.noop
  UpdateSyncronous(_updateContext)
  {
  }

}
