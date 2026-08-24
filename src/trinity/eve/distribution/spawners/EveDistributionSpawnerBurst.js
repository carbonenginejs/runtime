// Source: trinity/trinity/Eve/SpaceObject/Utils/EveDistributionMethods/DistributionSpawners/EveDistributionSpawnerBurst.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { carbon, impl, io, type } from "#schema";
import { IEveDistributionSpawner } from "./IEveDistributionSpawner.js";

/** Spawns a configured fraction of the free distribution placements in one delayed burst. */
@type.define({ className: "EveDistributionSpawnerBurst", family: "eve/distribution/spawners" })
export class EveDistributionSpawnerBurst extends IEveDistributionSpawner
{

  #localTimer = 0;

  /** m_completeness (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  completeness = 1;

  /** m_additionalTriggersPerBurst (uint32_t) [READWRITE, PERSIST] */
  @io.persist
  @type.uint32
  additionalTriggersPerBurst = 0;

  /** m_delayBeforeInitialBurst (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  delayBeforeInitialBurst = 0;

  /**
   * Restarts the burst timer; the placement pool is not sorted or otherwise used
   * by this spawner.
   */
  @carbon.method
  @impl.implemented
  Reset(_placements)
  {
    this.Restart();
  }

  /**
   * Rearms the spawner by clearing the timer, allowing the one-shot burst to
   * fire again.
   */
  @carbon.method
  @impl.implemented
  Restart()
  {
    this.#localTimer = 0;
  }

  /**
   * Waits out the initial delay, then spawns a `completeness` fraction of the
   * currently free placements plus the extra per-burst triggers in one go, and
   * disarms itself until restarted.
   */
  @carbon.method
  @impl.adapted
  UpdateSyncronous(updateContext, _params, owner)
  {
    if (this.#localTimer === -1)
    {
      return;
    }

    if (this.#localTimer < this.delayBeforeInitialBurst)
    {
      this.#localTimer += updateContext.GetDeltaT();
      return;
    }

    const availableTriggers = owner.GetFreePlacementCount();
    let numTriggers = Math.trunc(this.completeness * availableTriggers);
    numTriggers += this.additionalTriggersPerBurst;
    owner.AddEntities(Math.min(numTriggers, availableTriggers));
    this.#localTimer = -1;
  }

  /** Ignores controller variables; the burst is purely time-driven. */
  @carbon.method
  @impl.implemented
  SetControllerVariable(_name, _value)
  {
  }

}
