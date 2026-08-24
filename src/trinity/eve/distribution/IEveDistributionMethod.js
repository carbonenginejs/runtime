// Source: trinity/trinity/Eve/SpaceObject/Utils/EveDistributionMethods/IEveDistributionMethod.h
import { CjsModel } from "#model";
import { carbon, impl, type } from "#schema";


/** Required distribution placement contract. */
@type.define({ className: "IEveDistributionMethod", family: "eve/distribution" })
export class IEveDistributionMethod extends CjsModel
{

  /** Regenerates the distribution's complete placement data. */
  @carbon.method
  @impl.abstract
  RegeneratePlacementData()
  {
    throw new Error("IEveDistributionMethod.RegeneratePlacementData must be implemented by a concrete distribution.");
  }

  /** Returns the number of available placements. */
  @carbon.method
  @impl.abstract
  GetNumberOfPlacements()
  {
    throw new Error("IEveDistributionMethod.GetNumberOfPlacements must be implemented by a concrete distribution.");
  }

  /** Returns placement data for the requested entry. */
  @carbon.method
  @impl.abstract
  GetPlacementData(_index)
  {
    throw new Error("IEveDistributionMethod.GetPlacementData must be implemented by a concrete distribution.");
  }

  /** Writes the center of the requested placement data. */
  @carbon.method
  @impl.abstract
  GetPlacementDataCenter(_index, _out)
  {
    throw new Error("IEveDistributionMethod.GetPlacementDataCenter must be implemented by a concrete distribution.");
  }

  /** Reports whether the distribution produces dynamic movement. */
  @carbon.method
  @impl.abstract
  GetHasDynamicMovement()
  {
    throw new Error("IEveDistributionMethod.GetHasDynamicMovement must be implemented by a concrete distribution.");
  }

  /** Runs the optional synchronous distribution update hook. */
  @carbon.method
  @impl.noop
  UpdateSyncronous(_updateContext)
  {
  }

  /** Runs the optional asynchronous distribution update hook. */
  @carbon.method
  @impl.noop
  UpdateAsyncronous(_updateContext)
  {
  }

  /** Accepts an optional controller variable. */
  @carbon.method
  @impl.noop
  SetControllerVariable(_name, _value)
  {
  }

}
