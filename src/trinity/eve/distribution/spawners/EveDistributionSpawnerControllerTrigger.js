import { exposure as be } from "#be";
// Source: trinity/trinity/Eve/SpaceObject/Utils/EveDistributionMethods/DistributionSpawners/EveDistributionSpawnerControllerTrigger.h
import { IsMatch } from "#blue";
import { INotify } from "../../../../global/blue/INotify.js";
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { meta, type, blue } from "#schema";
import { IEveDistributionSpawner } from "./IEveDistributionSpawner.js";

/** Gates a nested set of distribution spawners from a named controller variable. */
@be.define("EveDistributionSpawnerControllerTrigger")
@blue.inherit(INotify)
@be.mapInterface(IEveDistributionSpawner)
@be.mapInterface(INotify)
export class EveDistributionSpawnerControllerTrigger extends IEveDistributionSpawner
{

  /** m_variableName (std::string) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.string
  variableName = "";

  /** m_value (float) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  value = 0;

  /** m_invertReceivedValue (bool) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.boolean
  invertTrigger = false;

  /** m_isActive (bool) [READ] */
  @be.mapAttribute(be.READ)
  @type.boolean
  isActive = false;

  /** m_distributionSpawners (PIEveDistributionSpawnerVector) [READ, PERSIST] */
  @be.mapAttribute(be.READ | be.PERSIST)

  @type.list("IEveDistributionSpawner")
  spawners = [];

  /** m_restartOnReceivingValue (bool) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.boolean
  restartOnReceivingValue = false;

  /**
   * Restarts the wrapped spawners; the placement pool is not used by this
   * trigger.
   */

  @meta.implemented
  Reset(_placements)
  {
    this.Restart();
  }

  /** Restarts every wrapped spawner, leaving the active state untouched. */

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
