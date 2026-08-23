// Source: trinity/trinity/Eve/SpaceObject/Utils/EveDistributionMethods/DistributionSpawnModifiers/EveDistributionSpawnModifierLifeTimeOffset.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { carbon, impl, io, type } from "#schema";
import { CjsModel } from "#model";
import { createMinStdRandom, getDistributionSeed } from "../../CjsDistributionRandom.js";

/** Offsets each spawned placement's initial lifetime with random, normalized, or cascading timing. */
@type.define({ className: "EveDistributionSpawnModifierLifeTimeOffset", family: "eve/distribution/spawnModifiers" })
export class EveDistributionSpawnModifierLifeTimeOffset extends CjsModel
{

  #timeSeed = Date.now() >>> 0;

  #currentCascadingOffset = 0;

  /** m_minOffset (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  minOffset = 0;

  /** m_maxOffset (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  maxOffset = 0;

  /** m_consistentRandom (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  consistentRandom = false;

  /** m_cascadingLifetimeOffset (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  cascadingLifetimeOffset = 0;

  /** m_normalizeOffsets (bool) [READWRITE, PERSIST] */
  @io.persist
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
    this.#timeSeed = Date.now() >>> 0;
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
      this.#currentCascadingOffset += perInstanceOffset;
      placement.lifeTime = this.minOffset + this.#currentCascadingOffset % range;
      return;
    }

    const seed = getDistributionSeed(placement.uniqueID, this.#timeSeed, this.consistentRandom);
    const random = createMinStdRandom(seed);
    const randomOffset = this.minOffset + (this.maxOffset - this.minOffset) * random()
      + this.cascadingLifetimeOffset * placement.initialPlacementID;
    this.#currentCascadingOffset += this.cascadingLifetimeOffset;
    placement.lifeTime += randomOffset;
  }

}
