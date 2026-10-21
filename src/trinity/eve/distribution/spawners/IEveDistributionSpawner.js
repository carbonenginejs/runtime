import { exposure as be } from "#be";
import { IRoot } from "../../../../global/blue/IRoot.js";
// Source: trinity/trinity/Eve/SpaceObject/Utils/EveDistributionMethods/DistributionSpawners/IEveDistributionSpawner.h
import { meta, blue } from "#schema";


/** Distribution spawner contract with Carbon's optional no-op hooks. */
@be.interface("IEveDistributionSpawner")
@blue.inherit(IRoot)
export class IEveDistributionSpawner extends IRoot
{

  /** Resets the spawner against regenerated placement data. */

  @meta.noop
  Reset()
  {
  }

  /** Restarts spawner state without regenerating placement data. */

  @meta.noop
  Restart()
  {
  }

  /** Runs the optional synchronous spawning update hook. */

  @meta.noop
  UpdateSyncronous(_updateContext)
  {
  }

  /** Accepts an optional controller variable. */

  @meta.noop
  SetControllerVariable(_name, _value)
  {
  }

}
