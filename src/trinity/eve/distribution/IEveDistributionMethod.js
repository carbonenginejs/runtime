import { exposure as be } from "#be";
import { IRoot } from "../../../global/blue/IRoot.js";
// Source: trinity/trinity/Eve/SpaceObject/Utils/EveDistributionMethods/IEveDistributionMethod.h
import { meta, blue } from "#schema";


/** Required distribution placement contract. */
@be.interface("IEveDistributionMethod")
@blue.inherit(IRoot)
export class IEveDistributionMethod
{

  /** Regenerates the distribution's complete placement data. */
  @blue.abstract
  RegeneratePlacementData() {}

  /** Returns the number of available placements. */
  @blue.abstract
  GetNumberOfPlacements() {}

  /** Returns placement data for the requested entry. */
  @blue.abstract
  GetPlacementData(_index) {}

  /** Writes the center of the requested placement data. */
  @blue.abstract
  GetPlacementDataCenter(_index, _out) {}

  /** Reports whether the distribution produces dynamic movement. */
  @blue.abstract
  GetHasDynamicMovement() {}

  /** Runs the optional synchronous distribution update hook. */

  @meta.noop
  UpdateSyncronous(_updateContext)
  {
  }

  /** Runs the optional asynchronous distribution update hook. */

  @meta.noop
  UpdateAsyncronous(_updateContext)
  {
  }

  /** Accepts an optional controller variable. */

  @meta.noop
  SetControllerVariable(_name, _value)
  {
  }

}
