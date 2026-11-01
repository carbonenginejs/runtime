import { exposure as be } from "#be";
import { IRoot } from "../../../../blue/blueexposure/IRoot.js";
// Source: trinity/trinity/Eve/SpaceObject/Utils/EveDistributionMethods/DistributionSpawners/IEveDistributionSpawner.h


/** Distribution spawner contract with Carbon's optional no-op hooks. */
@be.interface("IEveDistributionSpawner")
@be.inherit(IRoot)
export class IEveDistributionSpawner extends IRoot
{

  /**
   * Resets the spawner against regenerated placement data.
   *
   * @adapted
   */

  Reset()
  {
  }

  /**
   * Restarts spawner state without regenerating placement data.
   *
   * @adapted
   */

  Restart()
  {
  }

  /**
   * Runs the optional synchronous spawning update hook.
   *
   * @adapted
   */

  UpdateSyncronous(_updateContext)
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
