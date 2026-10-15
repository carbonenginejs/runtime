// Source: trinity/trinity/Eve/SpaceObject/Utils/EveDistributionMethods/DistributionSpawners/EveDistributionSpawnerControllerTrigger.h
import { IsMatch } from "#blue";
import { INotify } from "../../../../global/blue/INotify.js";
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { meta, type, blue } from "#schema";
import { IEveDistributionSpawner } from "./IEveDistributionSpawner.js";

/** Gates a nested set of distribution spawners from a named controller variable. */
@blue.define("EveDistributionSpawnerControllerTrigger")
@blue.inherit(INotify)
@blue.interface(IEveDistributionSpawner, INotify)
export class EveDistributionSpawnerControllerTrigger extends IEveDistributionSpawner
{

  /** m_variableName (std::string) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.string
  variableName = "";

  /** m_value (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  value = 0;

  /** m_invertReceivedValue (bool) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.boolean
  invertTrigger = false;

  /** m_isActive (bool) [READ] */
  @blue.read
  @type.boolean
  isActive = false;

  /** m_distributionSpawners (PIEveDistributionSpawnerVector) [READ, PERSIST] */
  @blue.read
  @blue.persist
  @type.list("IEveDistributionSpawner")
  spawners = [];

  /** m_restartOnReceivingValue (bool) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.boolean
  restartOnReceivingValue = false;

  /**
   * Restarts the wrapped spawners; the placement pool is not used by this
   * trigger.
   */
  @blue.method
  @meta.implemented
  Reset(_placements)
  {
    this.Restart();
  }

  /** Restarts every wrapped spawner, leaving the active state untouched. */
  @blue.method
  @meta.implemented
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
  @blue.method
  @meta.implemented
  OnModified(name)
  {
    if (IsMatch(name, "value"))
    {
      this._applyValue();
    }
    return true;
  }

  /** Ticks the wrapped spawners only while the trigger is active. */
  @blue.method
  @meta.implemented
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
  @blue.method
  @meta.implemented
  SetControllerVariable(name, value)
  {
    if (this.variableName !== name)
    {
      return;
    }

    this.value = value;
    this._applyValue();
  }

  /**
   * Recomputes the active flag from the current value, inverted when
   * invertTrigger is set, after optionally restarting the wrapped spawners.
   */
  _applyValue()
  {
    if (this.restartOnReceivingValue)
    {
      this.Restart();
    }
    this.isActive = this.invertTrigger ? 1 - this.value > 0 : this.value > 0;
  }

}

// Exact native Blue exposure: only these identities participate in loading.
