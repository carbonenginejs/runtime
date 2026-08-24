// Source: trinity/trinity/Eve/SpaceObject/Utils/EveDistributionMethods/DistributionSpawners/IEveDistributionSpawner.h
import { CjsModel } from "#model";
import { carbon, impl, type } from "#schema";


/** Distribution spawner contract with Carbon's optional no-op hooks. */
@type.define({ className: "IEveDistributionSpawner", family: "eve/distribution" })
export class IEveDistributionSpawner extends CjsModel
{

  /** Resets the spawner against regenerated placement data. */
  @carbon.method
  @impl.noop
  Reset()
  {
  }

  /** Restarts spawner state without regenerating placement data. */
  @carbon.method
  @impl.noop
  Restart()
  {
  }

  /** Runs the optional synchronous spawning update hook. */
  @carbon.method
  @impl.noop
  UpdateSyncronous(_updateContext)
  {
  }

  /** Accepts an optional controller variable. */
  @carbon.method
  @impl.noop
  SetControllerVariable(_name, _value)
  {
  }

}
