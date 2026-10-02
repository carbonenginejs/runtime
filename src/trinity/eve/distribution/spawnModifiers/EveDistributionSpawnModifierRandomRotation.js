import { IInitialize } from "../../../../global/blue/IInitialize.js";
// Source: trinity/trinity/Eve/SpaceObject/Utils/EveDistributionMethods/DistributionSpawnModifiers/EveDistributionSpawnModifierRandomRotation.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { meta } from "#schema";
import { IEveDistributionSpawnModifier } from "./IEveDistributionSpawnModifier.js";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";
import { createMinStdRandom, getDistributionSeed, setYawPitchRoll } from "../../CjsDistributionRandom.js";

/** Applies or replaces each spawned placement's orientation with a seeded random yaw, pitch, and roll. */
@meta.define({ className: "EveDistributionSpawnModifierRandomRotation", family: "eve/distribution/spawnModifiers" })
@meta.blue.inherit(IInitialize)
@meta.blue.mapInterface(IInitialize)
export class EveDistributionSpawnModifierRandomRotation extends IEveDistributionSpawnModifier
{

  _timeSeed = Date.now() >>> 0;

  /** m_minRotation (Vector3) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec3
  minRotation = vec3.create();

  /** m_maxRotation (Vector3) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec3
  maxRotation = vec3.create();

  /** m_consistentRandom (bool) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  consistentRandom = false;

  /** m_overrideRotation (bool) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  overrideRotation = false;

  /**
   * Reseeds the random stream from the wall clock, so rotations differ between
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
   * Builds a rotation from random yaw, pitch and roll between minRotation and
   * maxRotation, then either replaces the placement's initial rotation or
   * combines it with the authored one.
   */
  @meta.blue.method
  @meta.adapted
  ProcessSpawnModifier(placement, _numPlacements)
  {
    const seed = getDistributionSeed(placement.uniqueID, this._timeSeed, this.consistentRandom);
    const random = createMinStdRandom(seed);
    const euler = vec3.create();
    for (let axis = 0; axis < 3; axis++)
    {
      euler[axis] = this.minRotation[axis] + (this.maxRotation[axis] - this.minRotation[axis]) * random();
    }

    const rotation = setYawPitchRoll(quat.create(), euler[0], euler[1], euler[2]);
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
