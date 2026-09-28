// Source: trinity/trinity/Eve/SpaceObject/Utils/EveDistributionMethods/DistributionSpawnModifiers/EveDistributionSpawnModifierLifeTimeOffset.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { carbon, impl, edit, type } from "#schema";
import { IEveDistributionSpawnModifier } from "./IEveDistributionSpawnModifier.js";
import { createMinStdRandom, getDistributionSeed } from "../../CjsDistributionRandom.js";

/** Offsets each spawned placement's initial lifetime with random, normalized, or cascading timing. */
@type.define({ className: "EveDistributionSpawnModifierLifeTimeOffset", family: "eve/distribution/spawnModifiers" })
export class EveDistributionSpawnModifierLifeTimeOffset extends IEveDistributionSpawnModifier
{

  _timeSeed = Date.now() >>> 0;

  _currentCascadingOffset = 0;

  /** m_minOffset (float) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.float32
  minOffset = 0;

  /** m_maxOffset (float) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.float32
  maxOffset = 0;

  /** m_consistentRandom (bool) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.boolean
  consistentRandom = false;

  /** m_cascadingLifetimeOffset (float) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.float32
  cascadingLifetimeOffset = 0;

  /** m_normalizeOffsets (bool) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.boolean
  normalizeOffsets = false;

  /**
   * Reseeds the random stream from the wall clock, so offsets differ between
   * runs unless consistentRandom pins them to the placement id.
   */
  @carbon.method
  @impl.adapted
  Initialize()
  {
    this._timeSeed = Date.now() >>> 0;
    return true;
  }

  /**
   * Staggers a spawning placement's starting lifetime: with normalizeOffsets it
   * replaces the lifetime with an evenly cascading step through the min..max
   * range across the pool, otherwise it adds a random offset in that range plus
   * a per-placement cascade.
   */
  @carbon.method
  @impl.adapted
  ProcessSpawnModifier(placement, numPlacements)
  {
    if (this.normalizeOffsets)
    {
      const range = this.maxOffset - this.minOffset;
      const perInstanceOffset = range / numPlacements;
      this._currentCascadingOffset += perInstanceOffset;
      placement.lifeTime = this.minOffset + this._currentCascadingOffset % range;
      return;
    }

    const seed = getDistributionSeed(placement.uniqueID, this._timeSeed, this.consistentRandom);
    const random = createMinStdRandom(seed);
    const randomOffset = this.minOffset + (this.maxOffset - this.minOffset) * random()
      + this.cascadingLifetimeOffset * placement.initialPlacementID;
    this._currentCascadingOffset += this.cascadingLifetimeOffset;
    placement.lifeTime += randomOffset;
  }

}
