// Source: trinity/trinity/Eve/SpaceObject/Utils/EveDistributionMethods/DistributionSpawners/IEveDistributionSpawner.h
import { meta, blue } from "#schema";


/** Distribution spawner contract with Carbon's optional no-op hooks. */
@blue.define("IEveDistributionSpawner")
export class IEveDistributionSpawner
{

  /** Resets the spawner against regenerated placement data. */
  @blue.method
  @meta.noop
  Reset()
  {
  }

  /** Restarts spawner state without regenerating placement data. */
  @blue.method
  @meta.noop
  Restart()
  {
  }

  /** Runs the optional synchronous spawning update hook. */
  @blue.method
  @meta.noop
  UpdateSyncronous(_updateContext)
  {
  }

  /** Accepts an optional controller variable. */
  @blue.method
  @meta.noop
  SetControllerVariable(_name, _value)
  {
  }

}
