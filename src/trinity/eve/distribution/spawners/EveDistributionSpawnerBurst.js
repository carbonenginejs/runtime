// Source: trinity/trinity/Eve/SpaceObject/Utils/EveDistributionMethods/DistributionSpawners/EveDistributionSpawnerBurst.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { meta } from "#schema";
import { IEveDistributionSpawner } from "./IEveDistributionSpawner.js";

/** Spawns a configured fraction of the free distribution placements in one delayed burst. */
@meta.define({ className: "EveDistributionSpawnerBurst", family: "eve/distribution/spawners" })
export class EveDistributionSpawnerBurst extends IEveDistributionSpawner
{

  _localTimer = 0;

  /** m_completeness (float) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  completeness = 1;

  /** m_additionalTriggersPerBurst (uint32_t) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.uint32
  additionalTriggersPerBurst = 0;

  /** m_delayBeforeInitialBurst (float) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  delayBeforeInitialBurst = 0;

  /**
   * Restarts the burst timer; the placement pool is not sorted or otherwise used
   * by this spawner.
   */
  @meta.blue.method
  @meta.implemented
  Reset(_placements)
  {
    this.Restart();
  }

  /**
   * Rearms the spawner by clearing the timer, allowing the one-shot burst to
   * fire again.
   */
  @meta.blue.method
  @meta.implemented
  Restart()
  {
    this._localTimer = 0;
  }

  /**
   * Waits out the initial delay, then spawns a `completeness` fraction of the
   * currently free placements plus the extra per-burst triggers in one go, and
   * disarms itself until restarted.
   */
  @meta.blue.method
  @meta.adapted
  UpdateSyncronous(updateContext, _params, owner)
  {
    if (this._localTimer === -1)
    {
      return;
    }

    if (this._localTimer < this.delayBeforeInitialBurst)
    {
      this._localTimer += updateContext.GetDeltaT();
      return;
    }

    const availableTriggers = owner.GetFreePlacementCount();
    let numTriggers = Math.trunc(this.completeness * availableTriggers);
    numTriggers += this.additionalTriggersPerBurst;
    owner.AddEntities(Math.min(numTriggers, availableTriggers));
    this._localTimer = -1;
  }

  /** Ignores controller variables; the burst is purely time-driven. */
  @meta.blue.method
  @meta.implemented
  SetControllerVariable(_name, _value)
  {
  }

}
