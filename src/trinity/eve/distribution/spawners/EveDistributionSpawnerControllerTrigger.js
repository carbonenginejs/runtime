// Source: trinity/trinity/Eve/SpaceObject/Utils/EveDistributionMethods/DistributionSpawners/EveDistributionSpawnerControllerTrigger.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { carbon, impl, io, type } from "#schema";
import { CjsModel } from "#model";

/** EveDistributionSpawnerControllerTrigger (eve/distribution/spawners) - generated from schema shapeHash 67110969.... */
@type.define({ className: "EveDistributionSpawnerControllerTrigger", family: "eve/distribution/spawners" })
export class EveDistributionSpawnerControllerTrigger extends CjsModel
{

  /** m_variableName (std::string) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  variableName = "";

  /** m_value (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  value = 0;

  /** m_invertReceivedValue (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  invertTrigger = false;

  /** m_isActive (bool) [READ] */
  @io.read
  @type.boolean
  isActive = false;

  /** m_distributionSpawners (PIEveDistributionSpawnerVector) [READ, PERSIST] */
  @io.persist
  @type.list("IEveDistributionSpawner")
  spawners = [];

  /** m_restartOnReceivingValue (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  restartOnReceivingValue = false;

  /**
   * Restarts the wrapped spawners; the placement pool is not used by this
   * trigger.
   */
  @carbon.method
  @impl.implemented
  Reset(_placements)
  {
    this.Restart();
  }

  /** Restarts every wrapped spawner, leaving the active state untouched. */
  @carbon.method
  @impl.implemented
  Restart()
  {
    for (const spawner of this.spawners)
    {
      spawner.Restart();
    }
  }

  /**
   * Re-evaluates the active state when the `value` property is written directly
   * rather than through a controller.
   */
  @carbon.method
  @impl.adapted
  OnModified(name)
  {
    if (name === "value")
    {
      this.#applyValue();
    }
    return true;
  }

  /** Ticks the wrapped spawners only while the trigger is active. */
  @carbon.method
  @impl.implemented
  UpdateSyncronous(updateContext, params, owner)
  {
    if (!this.isActive)
    {
      return;
    }

    for (const spawner of this.spawners)
    {
      spawner.UpdateSyncronous(updateContext, params, owner);
    }
  }

  /**
   * Adopts the value when the name matches this trigger's variable and
   * re-evaluates the active state; other names are ignored.
   */
  @carbon.method
  @impl.implemented
  SetControllerVariable(name, value)
  {
    if (this.variableName !== name)
    {
      return;
    }

    this.value = value;
    this.#applyValue();
  }

  /**
   * Recomputes the active flag from the current value, inverted when
   * invertTrigger is set, after optionally restarting the wrapped spawners.
   */
  #applyValue()
  {
    if (this.restartOnReceivingValue)
    {
      this.Restart();
    }
    this.isActive = this.invertTrigger ? 1 - this.value > 0 : this.value > 0;
  }

}
