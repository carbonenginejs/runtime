// Source: trinity/trinity/Eve/SpaceObject/Utils/EveDistributionMethods/IEveDistributionMethod.h
import { meta } from "#schema";


/** Required distribution placement contract. */
@meta.define({ className: "IEveDistributionMethod", family: "eve/distribution" })
export class IEveDistributionMethod
{

  /** Regenerates the distribution's complete placement data. */
  @meta.blue.method
  @meta.abstract
  RegeneratePlacementData()
  {
    throw new Error("IEveDistributionMethod.RegeneratePlacementData must be implemented by a concrete distribution.");
  }

  /** Returns the number of available placements. */
  @meta.blue.method
  @meta.abstract
  GetNumberOfPlacements()
  {
    throw new Error("IEveDistributionMethod.GetNumberOfPlacements must be implemented by a concrete distribution.");
  }

  /** Returns placement data for the requested entry. */
  @meta.blue.method
  @meta.abstract
  GetPlacementData(_index)
  {
    throw new Error("IEveDistributionMethod.GetPlacementData must be implemented by a concrete distribution.");
  }

  /** Writes the center of the requested placement data. */
  @meta.blue.method
  @meta.abstract
  GetPlacementDataCenter(_index, _out)
  {
    throw new Error("IEveDistributionMethod.GetPlacementDataCenter must be implemented by a concrete distribution.");
  }

  /** Reports whether the distribution produces dynamic movement. */
  @meta.blue.method
  @meta.abstract
  GetHasDynamicMovement()
  {
    throw new Error("IEveDistributionMethod.GetHasDynamicMovement must be implemented by a concrete distribution.");
  }

  /** Runs the optional synchronous distribution update hook. */
  @meta.blue.method
  @meta.noop
  UpdateSyncronous(_updateContext)
  {
  }

  /** Runs the optional asynchronous distribution update hook. */
  @meta.blue.method
  @meta.noop
  UpdateAsyncronous(_updateContext)
  {
  }

  /** Accepts an optional controller variable. */
  @meta.blue.method
  @meta.noop
  SetControllerVariable(_name, _value)
  {
  }

}
