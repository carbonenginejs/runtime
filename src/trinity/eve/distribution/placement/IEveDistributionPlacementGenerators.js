import { IRoot } from "../../../../global/blue/IRoot.js";
// Source: trinity/trinity/Eve/SpaceObject/Utils/EveDistributionMethods/DistributionPlacementGenerators/IEveDistributionPlacementGenerators.h
import { meta, blue } from "#schema";


/** Required distribution placement-generator contract. */
@blue.define("IEveDistributionPlacementGenerators")
@blue.inherit(IRoot)
export class IEveDistributionPlacementGenerators
{

  /** Writes the generator's initial placement records. */
  @blue.method
  @meta.abstract
  GetInitialPlacements(_out)
  {
    throw new Error("IEveDistributionPlacementGenerators.GetInitialPlacements must be implemented by a concrete generator.");
  }

  /** Reports whether this generator requests placement regeneration. */
  @blue.method
  @meta.abstract
  IsRequestingRegeneration()
  {
    throw new Error("IEveDistributionPlacementGenerators.IsRequestingRegeneration must be implemented by a concrete generator.");
  }

  /** Runs the optional synchronous placement-generator update hook. */
  @blue.method
  @meta.noop
  UpdateSyncronous(_updateContext)
  {
  }

}
