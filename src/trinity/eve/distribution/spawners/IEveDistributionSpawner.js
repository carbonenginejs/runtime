import { exposure as be } from "#be";
import { IRoot } from "../../../../global/blue/IRoot.js";
// Source: trinity/trinity/Eve/SpaceObject/Utils/EveDistributionMethods/DistributionSpawners/IEveDistributionSpawner.h
import { meta } from "#schema";


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

  @meta.adapted
  Reset()
  {
  }

  /**
   * Restarts spawner state without regenerating placement data.
   *
   * @adapted
   */

  @meta.adapted
  Restart()
  {
  }

  /**
   * Runs the optional synchronous spawning update hook.
   *
   * @adapted
   */

  @meta.adapted
  UpdateSyncronous(_updateContext)
  {
  }

  /**
   * Accepts an optional controller variable.
   *
   * @adapted
   */

  @meta.adapted
  SetControllerVariable(_name, _value)
  {
  }

}
