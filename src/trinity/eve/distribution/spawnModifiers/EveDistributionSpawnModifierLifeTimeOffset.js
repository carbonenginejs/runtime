import { IInitialize } from "../../../../global/blue/IInitialize.js";
// Source: trinity/trinity/Eve/SpaceObject/Utils/EveDistributionMethods/DistributionSpawnModifiers/EveDistributionSpawnModifierLifeTimeOffset.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { meta } from "#schema";
import { IEveDistributionSpawnModifier } from "./IEveDistributionSpawnModifier.js";
import { createMinStdRandom, getDistributionSeed } from "../../CjsDistributionRandom.js";

/** Offsets each spawned placement's initial lifetime with random, normalized, or cascading timing. */
@meta.define({ className: "EveDistributionSpawnModifierLifeTimeOffset", family: "eve/distribution/spawnModifiers" })
@meta.blue.inherit(IInitialize)
@meta.blue.mapInterface(IInitialize)
export class EveDistributionSpawnModifierLifeTimeOffset extends IEveDistributionSpawnModifier
{

  _timeSeed = Date.now() >>> 0;

  _currentCascadingOffset = 0;

  /** m_minOffset (float) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  minOffset = 0;

  /** m_maxOffset (float) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  maxOffset = 0;

  /** m_consistentRandom (bool) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  consistentRandom = false;

  /** m_cascadingLifetimeOffset (float) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  cascadingLifetimeOffset = 0;

  /** m_normalizeOffsets (bool) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  normalizeOffsets = false;

  /**
   * Reseeds the random stream from the wall clock, so offsets differ between
   * runs unless consistentRandom pins them to the placement id.
   */
  @meta.blue.method
  @meta.adapted
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
  @meta.blue.method
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

    const seed = getDistributionSeed(placement.uniqueID, this._timeSeed, this.consistentRandom);
    const random = createMinStdRandom(seed);
    const randomOffset = this.minOffset + (this.maxOffset - this.minOffset) * random()
      + this.cascadingLifetimeOffset * placement.initialPlacementID;
    this._currentCascadingOffset += this.cascadingLifetimeOffset;
    placement.lifeTime += randomOffset;
  }

}
