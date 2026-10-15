// Source: trinity/trinity/Eve/SpaceObject/Utils/EveDistributionMethods/DistributionSpawners/EveDistributionSpawnerInterval.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { meta, type, blue } from "#schema";
import { IEveDistributionSpawner } from "./IEveDistributionSpawner.js";

/** Spawns distribution entities at configurable, optionally randomized intervals for a bounded or unlimited repeat count. */
@blue.define("EveDistributionSpawnerInterval")
@blue.interface(IEveDistributionSpawner)
export class EveDistributionSpawnerInterval extends IEveDistributionSpawner
{

  _localTimer = 0;

  _numTriggered = 0;

  /** m_delayBetweenRepeats (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  delayBetweenRepeats = 1;

  /** m_numberOfTriggers (uint32_t) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.uint32
  numberOfRepeats = 0;

  /** m_useRandomStartOffset (bool) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.boolean
  useRandomStartOffset = true;

  /** m_maxRandomizedIntervalDelta (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  maxRandomizedIntervalDelta = 0;

  /** m_delayBeforeInitialSpawn (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  delayBeforeInitialSpawn = 0;

  /** Restarts the interval timer; the placement pool is not used by this spawner. */
  @blue.method
  @meta.implemented
  Reset(_placements)
  {
    this.Restart();
  }

  /**
   * Rearms the interval and clears the repeat count, optionally starting at a
   * random point inside one interval and backing the timer off by the initial
   * spawn delay.
   */
  @blue.method
  @meta.adapted
  Restart()
  {
    this._localTimer = this.useRandomStartOffset ? Math.random() * this.delayBetweenRepeats : 0;
    this._localTimer -= this.delayBeforeInitialSpawn;
    this._numTriggered = 0;
  }

  /**
   * Spawns one entity each time the timer passes the repeat delay, up to
   * numberOfRepeats (unlimited when it is zero), reseeding the timer with a
   * randomized interval delta.
   */
  @blue.method
  @meta.adapted
  UpdateSyncronous(updateContext, _params, owner)
  {
    if (this.numberOfRepeats !== 0 && this._numTriggered >= this.numberOfRepeats)
    {
      return;
    }

    this._localTimer += updateContext.GetDeltaT();
    if (this._localTimer > this.delayBetweenRepeats)
    {
      owner.AddEntities(1);
      this._numTriggered++;
      this._localTimer = this.maxRandomizedIntervalDelta
        - 2 * Math.random() * this.maxRandomizedIntervalDelta;
    }
  }

  /** Ignores controller variables; the interval is purely time-driven. */
  @blue.method
  @meta.implemented
  SetControllerVariable(_name, _value)
  {
  }

}
