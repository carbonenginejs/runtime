// Source: trinity/trinity/Eve/SpaceObject/Utils/EveDistributionMethods/DistributionSpawnModifiers/EveDistributionSpawnModifierLifeTimeOffset.h
import { IInitialize } from "../../../../global/blue/IInitialize.js";
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { meta, type, blue } from "#schema";
import { be } from "#blue";
import { IEveDistributionSpawnModifier } from "./IEveDistributionSpawnModifier.js";
import { CjsDistributionRandom } from "../../CjsDistributionRandom.js";

/** Offsets each spawned placement's initial lifetime with random, normalized, or cascading timing. */
@blue.define("EveDistributionSpawnModifierLifeTimeOffset")
@blue.inherit(IInitialize)
@blue.interface(IEveDistributionSpawnModifier, IInitialize)
export class EveDistributionSpawnModifierLifeTimeOffset extends IEveDistributionSpawnModifier
{

  /** `m_timeSeed`: uint32_t( BeOS->GetCurrentFrameTime() ) (EveDistributionSpawnModifierLifeTimeOffset.cpp). */
  _timeSeed = be.os.GetCurrentFrameTime() >>> 0;

  _currentCascadingOffset = 0;

  /** m_minOffset (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  minOffset = 0;

  /** m_maxOffset (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  maxOffset = 0;

  /** m_consistentRandom (bool) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.boolean
  consistentRandom = false;

  /** m_cascadingLifetimeOffset (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  cascadingLifetimeOffset = 0;

  /** m_normalizeOffsets (bool) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.boolean
  normalizeOffsets = false;

  /**
   * Reseeds the random stream from the wall clock, so offsets differ between
   * runs unless consistentRandom pins them to the placement id.
   */
  @blue.method
  @meta.adapted
  Initialize()
  {
    this._timeSeed = be.os.GetCurrentFrameTime() >>> 0;
    return true;
  }

  /**
   * Staggers a spawning placement's starting lifetime: with normalizeOffsets it
   * replaces the lifetime with an evenly cascading step through the min..max
   * range across the pool, otherwise it adds a random offset in that range plus
   * a per-placement cascade.
   */
  @blue.method
  @meta.adapted
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

    const seed = CjsDistributionRandom.getDistributionSeed(placement.uniqueID, this._timeSeed, this.consistentRandom);
    const random = CjsDistributionRandom.createMinStdRandom(seed);
    const randomOffset = this.minOffset + (this.maxOffset - this.minOffset) * random()
      + this.cascadingLifetimeOffset * placement.initialPlacementID;
    this._currentCascadingOffset += this.cascadingLifetimeOffset;
    placement.lifeTime += randomOffset;
  }

}
