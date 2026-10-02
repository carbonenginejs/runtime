// Source: trinity/trinity/Eve/SpaceObject/Utils/EveDistributionMethods/DistributionPlacementGenerators/IEveDistributionPlacementGenerators.h
import { meta } from "#schema";


/** Required distribution placement-generator contract. */
@meta.define({ className: "IEveDistributionPlacementGenerators", family: "eve/distribution" })
export class IEveDistributionPlacementGenerators
{

  /** Writes the generator's initial placement records. */
  @meta.blue.method
  @meta.abstract
  GetInitialPlacements(_out)
  {
    throw new Error("IEveDistributionPlacementGenerators.GetInitialPlacements must be implemented by a concrete generator.");
  }

  /** Reports whether this generator requests placement regeneration. */
  @meta.blue.method
  @meta.abstract
  IsRequestingRegeneration()
  {
    throw new Error("IEveDistributionPlacementGenerators.IsRequestingRegeneration must be implemented by a concrete generator.");
  }

  /** Runs the optional synchronous placement-generator update hook. */
  @meta.blue.method
  @meta.noop
  UpdateSyncronous(_updateContext)
  {
  }

}
