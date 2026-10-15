// Source: trinity/trinity/Eve/SpaceObject/Utils/EveDistributionMethods/DistributionSpawnModifiers/EveDistributionSpawnModifierRandomRotation.h
import { IInitialize } from "../../../../global/blue/IInitialize.js";
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { meta, type, blue } from "#schema";
import { be } from "#blue";
import { IEveDistributionSpawnModifier } from "./IEveDistributionSpawnModifier.js";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";
import { CjsDistributionRandom } from "../../CjsDistributionRandom.js";

/** Applies or replaces each spawned placement's orientation with a seeded random yaw, pitch, and roll. */
@blue.define("EveDistributionSpawnModifierRandomRotation")
@blue.inherit(IInitialize)
@blue.interface(IInitialize)
@blue.chainTo(IEveDistributionSpawnModifier)
export class EveDistributionSpawnModifierRandomRotation extends IEveDistributionSpawnModifier
{

  /** `m_timeSeed`: uint32_t( BeOS->GetCurrentFrameTime() ) (EveDistributionSpawnModifierRandomRotation.cpp). */
  _timeSeed = be.os.GetCurrentFrameTime() >>> 0;

  /** m_minRotation (Vector3) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.vec3
  minRotation = vec3.create();

  /** m_maxRotation (Vector3) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.vec3
  maxRotation = vec3.create();

  /** m_consistentRandom (bool) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.boolean
  consistentRandom = false;

  /** m_overrideRotation (bool) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.boolean
  overrideRotation = false;

  /**
   * Reseeds the random stream from the wall clock, so rotations differ between
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
   * Builds a rotation from random yaw, pitch and roll between minRotation and
   * maxRotation, then either replaces the placement's initial rotation or
   * combines it with the authored one.
   */
  @blue.method
  @meta.adapted
  ProcessSpawnModifier(placement, _numPlacements)
  {
    const seed = CjsDistributionRandom.getDistributionSeed(placement.uniqueID, this._timeSeed, this.consistentRandom);
    const random = CjsDistributionRandom.createMinStdRandom(seed);
    const euler = vec3.create();
    for (let axis = 0; axis < 3; axis++)
    {
      euler[axis] = this.minRotation[axis] + (this.maxRotation[axis] - this.minRotation[axis]) * random();
    }

    const rotation = CjsDistributionRandom.setYawPitchRoll(quat.create(), euler[0], euler[1], euler[2]);
    if (this.overrideRotation)
    {
      placement.initialRotation.set(rotation);
    }
    else
    {
      // Carbon (row-vector): rotation * initialRotation - the random rotation
      // applies first.
      quat.multiply(placement.initialRotation, placement.initialRotation, rotation);
    }
  }

}
