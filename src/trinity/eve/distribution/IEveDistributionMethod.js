import { exposure as be } from "#be";
import { IRoot } from "../../../global/blue/IRoot.js";
// Source: trinity/trinity/Eve/SpaceObject/Utils/EveDistributionMethods/IEveDistributionMethod.h
import { meta } from "#schema";


/** Required distribution placement contract. */
@be.interface("IEveDistributionMethod")
@be.inherit(IRoot)
export class IEveDistributionMethod extends IRoot
{

  /** Regenerates the distribution's complete placement data. */
  @be.abstract
  RegeneratePlacementData() {}

  /** Returns the number of available placements. */
  @be.abstract
  GetNumberOfPlacements() {}

  /** Returns placement data for the requested entry. */
  @be.abstract
  GetPlacementData(_index) {}

  /** Writes the center of the requested placement data. */
  @be.abstract
  GetPlacementDataCenter(_index, _out) {}

  /** Reports whether the distribution produces dynamic movement. */
  @be.abstract
  GetHasDynamicMovement() {}

  /** Runs the optional synchronous distribution update hook. */

  @meta.adapted
  UpdateSyncronous(_updateContext)
  {
  }

  /** Runs the optional asynchronous distribution update hook. */

  @meta.adapted
  UpdateAsyncronous(_updateContext)
  {
  }

  /** Accepts an optional controller variable. */

  @meta.adapted
  SetControllerVariable(_name, _value)
  {
  }

}
