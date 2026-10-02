// Source: trinity/trinity/Eve/SpaceObject/Utils/EveDistributionMethods/DistributionSpawners/IEveDistributionSpawner.h
import { meta } from "#schema";


/** Distribution spawner contract with Carbon's optional no-op hooks. */
@meta.define({ className: "IEveDistributionSpawner", family: "eve/distribution" })
export class IEveDistributionSpawner
{

  /** Resets the spawner against regenerated placement data. */
  @meta.blue.method
  @meta.noop
  Reset()
  {
  }

  /** Restarts spawner state without regenerating placement data. */
  @meta.blue.method
  @meta.noop
  Restart()
  {
  }

  /** Runs the optional synchronous spawning update hook. */
  @meta.blue.method
  @meta.noop
  UpdateSyncronous(_updateContext)
  {
  }

  /** Accepts an optional controller variable. */
  @meta.blue.method
  @meta.noop
  SetControllerVariable(_name, _value)
  {
  }

}
