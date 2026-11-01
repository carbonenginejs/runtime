import { exposure as be } from "#be";
import { IRoot } from "../../../blue/blueexposure/IRoot.js";
// Source: trinity/trinity/Eve/SpaceObject/Utils/EveDistributionMethods/IEveDistributionMethod.h


/** Required distribution placement contract. */
@be.interface("IEveDistributionMethod")
@be.inherit(IRoot)
export class IEveDistributionMethod extends IRoot
{

  /**
   * Regenerates the distribution's complete placement data.
   *
   * @abstract
   */
  @be.abstract
  RegeneratePlacementData() {}

  /**
   * Returns the number of available placements.
   *
   * @abstract
   */
  @be.abstract
  GetNumberOfPlacements() {}

  /**
   * Returns placement data for the requested entry.
   *
   * @abstract
   */
  @be.abstract
  GetPlacementData(_index) {}

  /**
   * Writes the center of the requested placement data.
   *
   * @abstract
   */
  @be.abstract
  GetPlacementDataCenter(_index, _out) {}

  /**
   * Reports whether the distribution produces dynamic movement.
   *
   * @abstract
   */
  @be.abstract
  GetHasDynamicMovement() {}

  /**
   * Runs the optional synchronous distribution update hook.
   *
   * @adapted
   */

  UpdateSyncronous(_updateContext)
  {
  }

  /**
   * Runs the optional asynchronous distribution update hook.
   *
   * @adapted
   */

  UpdateAsyncronous(_updateContext)
  {
  }

  /**
   * Accepts an optional controller variable.
   *
   * @adapted
   */

  SetControllerVariable(_name, _value)
  {
  }

}
