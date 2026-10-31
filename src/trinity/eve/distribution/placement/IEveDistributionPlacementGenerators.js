import { exposure as be } from "#be";
import { IRoot } from "../../../../global/blue/IRoot.js";
// Source: trinity/trinity/Eve/SpaceObject/Utils/EveDistributionMethods/DistributionPlacementGenerators/IEveDistributionPlacementGenerators.h
import { meta } from "#schema";


/** Required distribution placement-generator contract. */
@be.interface("IEveDistributionPlacementGenerators")
@be.inherit(IRoot)
export class IEveDistributionPlacementGenerators extends IRoot
{

  /**
   * Writes the generator's initial placement records.
   *
   * @abstract
   */
  @be.abstract
  GetInitialPlacements(_out) {}

  /**
   * Reports whether this generator requests placement regeneration.
   *
   * @abstract
   */
  @be.abstract
  IsRequestingRegeneration() {}

  /**
   * Runs the optional synchronous placement-generator update hook.
   *
   * @adapted
   */

  @meta.adapted
  UpdateSyncronous(_updateContext)
  {
  }

}
