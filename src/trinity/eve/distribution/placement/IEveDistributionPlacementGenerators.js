// Source: trinity/trinity/Eve/SpaceObject/Utils/EveDistributionMethods/DistributionPlacementGenerators/IEveDistributionPlacementGenerators.h
import { CjsModel } from "#model";
import { carbon, impl, type } from "#schema";


/** Required distribution placement-generator contract. */
@type.define({ className: "IEveDistributionPlacementGenerators", family: "eve/distribution" })
export class IEveDistributionPlacementGenerators extends CjsModel
{

  /** Writes the generator's initial placement records. */
  @carbon.method
  @impl.abstract
  GetInitialPlacements(_out)
  {
    throw new Error("IEveDistributionPlacementGenerators.GetInitialPlacements must be implemented by a concrete generator.");
  }

  /** Reports whether this generator requests placement regeneration. */
  @carbon.method
  @impl.abstract
  IsRequestingRegeneration()
  {
    throw new Error("IEveDistributionPlacementGenerators.IsRequestingRegeneration must be implemented by a concrete generator.");
  }

  /** Runs the optional synchronous placement-generator update hook. */
  @carbon.method
  @impl.noop
  UpdateSyncronous(_updateContext)
  {
  }

}
