import { IsMatch } from "#blue";
import { INotify } from "../../../../global/blue/INotify.js";
// Source: trinity/trinity/Eve/SpaceObject/Utils/EveDistributionMethods/DistributionSpawners/EveDistributionSpawnerControllerTrigger.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { meta } from "#schema";
import { IEveDistributionSpawner } from "./IEveDistributionSpawner.js";

/** Gates a nested set of distribution spawners from a named controller variable. */
@meta.define({ className: "EveDistributionSpawnerControllerTrigger", family: "eve/distribution/spawners" })
@meta.blue.inherit(INotify)
export class EveDistributionSpawnerControllerTrigger extends IEveDistributionSpawner
{

  /** m_variableName (std::string) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  variableName = "";

  /** m_value (float) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  value = 0;

  /** m_invertReceivedValue (bool) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  invertTrigger = false;

  /** m_isActive (bool) [READ] */
  @meta.blue.read
  @meta.type.boolean
  isActive = false;

  /** m_distributionSpawners (PIEveDistributionSpawnerVector) [READ, PERSIST] */
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("IEveDistributionSpawner")
  spawners = [];

  /** m_restartOnReceivingValue (bool) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  restartOnReceivingValue = false;

  /**
   * Restarts the wrapped spawners; the placement pool is not used by this
   * trigger.
   */
  @meta.blue.method
  @meta.implemented
  Reset(_placements)
  {
    this.Restart();
  }

  /** Restarts every wrapped spawner, leaving the active state untouched. */
  @meta.blue.method
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
  @meta.blue.method
  @meta.adapted
  OnModified(name)
  {
    if (IsMatch(name, "value"))
    {
      this._applyValue();
    }
    return true;
  }

  /** Ticks the wrapped spawners only while the trigger is active. */
  @meta.blue.method
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
  @meta.blue.method
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
meta.blue.interfaceTable({ interfaces: [EveDistributionSpawnerControllerTrigger, IEveDistributionSpawner, INotify], chainTo: null })(EveDistributionSpawnerControllerTrigger, { kind: "class" });
