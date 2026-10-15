// Source: trinity/trinity/Eve/SpaceObject/Utils/EveDistributionMethods/DistributionSpawnModifiers/EveDistributionSpawnModifierRandomOffset.h
import { IInitialize } from "../../../../global/blue/IInitialize.js";
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { meta, type, blue } from "#schema";
import { be } from "#blue";
import { IEveDistributionSpawnModifier } from "./IEveDistributionSpawnModifier.js";
import { vec3 } from "#math/vec3";
import { CjsDistributionRandom } from "../../CjsDistributionRandom.js";

/** Adds a seeded random local translation offset to each spawned placement. */
@blue.define("EveDistributionSpawnModifierRandomOffset")
@blue.inherit(IInitialize)
@blue.interface(IInitialize)
@blue.chainTo(IEveDistributionSpawnModifier)
export class EveDistributionSpawnModifierRandomOffset extends IEveDistributionSpawnModifier
{

  /** `m_timeSeed`: uint32_t( BeOS->GetCurrentFrameTime() ) (EveDistributionSpawnModifierRandomOffset.cpp). */
  _timeSeed = be.os.GetCurrentFrameTime() >>> 0;

  /** m_minOffset (Vector3) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.vec3
  minOffset = vec3.create();

  /** m_maxOffset (Vector3) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.vec3
  maxOffset = vec3.create();

  /** m_consistentRandom (bool) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.boolean
  consistentRandom = false;

  /** m_uniformOffset (bool) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.boolean
  uniformOffset = false;

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
   * Adds a random offset between minOffset and maxOffset - drawn per axis, or
   * with one shared factor when uniformOffset is set - to the placement's
   * initial translation, rotated into the placement's initial orientation first.
   */
  @blue.method
  @meta.adapted
  ProcessSpawnModifier(placement, _numPlacements)
  {
    const seed = CjsDistributionRandom.getDistributionSeed(placement.uniqueID, this._timeSeed, this.consistentRandom);
    const random = CjsDistributionRandom.createMinStdRandom(seed);
    const offset = vec3.create();

    if (this.uniformOffset)
    {
      vec3.lerp(offset, this.minOffset, this.maxOffset, random());
    }
    else
    {
      for (let axis = 0; axis < 3; axis++)
      {
        offset[axis] = this.minOffset[axis] + (this.maxOffset[axis] - this.minOffset[axis]) * random();
      }
    }

    vec3.transformQuat(offset, offset, placement.initialRotation);
    vec3.add(placement.initialTranslation, placement.initialTranslation, offset);
  }

}
