import { IRoot } from "../../../global/blue/IRoot.js";
// Source: trinity/trinity/Eve/SpaceObject/Utils/EveDistributionMethods/IEveDistributionMethod.h
import { meta, blue } from "#schema";


/** Required distribution placement contract. */
@blue.define("IEveDistributionMethod")
@blue.inherit(IRoot)
export class IEveDistributionMethod
{

  /** Regenerates the distribution's complete placement data. */
  @blue.method
  @meta.abstract
  RegeneratePlacementData()
  {
    throw new Error("IEveDistributionMethod.RegeneratePlacementData must be implemented by a concrete distribution.");
  }

  /** Returns the number of available placements. */
  @blue.method
  @meta.abstract
  GetNumberOfPlacements()
  {
    throw new Error("IEveDistributionMethod.GetNumberOfPlacements must be implemented by a concrete distribution.");
  }

  /** Returns placement data for the requested entry. */
  @blue.method
  @meta.abstract
  GetPlacementData(_index)
  {
    throw new Error("IEveDistributionMethod.GetPlacementData must be implemented by a concrete distribution.");
  }

  /** Writes the center of the requested placement data. */
  @blue.method
  @meta.abstract
  GetPlacementDataCenter(_index, _out)
  {
    throw new Error("IEveDistributionMethod.GetPlacementDataCenter must be implemented by a concrete distribution.");
  }

  /** Reports whether the distribution produces dynamic movement. */
  @blue.method
  @meta.abstract
  GetHasDynamicMovement()
  {
    throw new Error("IEveDistributionMethod.GetHasDynamicMovement must be implemented by a concrete distribution.");
  }

  /** Runs the optional synchronous distribution update hook. */
  @blue.method
  @meta.noop
  UpdateSyncronous(_updateContext)
  {
  }

  /** Runs the optional asynchronous distribution update hook. */
  @blue.method
  @meta.noop
  UpdateAsyncronous(_updateContext)
  {
  }

  /** Accepts an optional controller variable. */
  @blue.method
  @meta.noop
  SetControllerVariable(_name, _value)
  {
  }

}
