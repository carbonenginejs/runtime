// Source: trinity/trinity/Eve/SpaceObject/Utils/EveDistributionMethods/DistributionSpawnModifiers/EveDistributionSpawnModifierRandomRotation.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { carbon, impl, io, type } from "#schema";
import { CjsModel } from "#model";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";
import { createMinStdRandom, getDistributionSeed, setYawPitchRoll } from "../../CjsDistributionRandom.js";

/** EveDistributionSpawnModifierRandomRotation (eve/distribution/spawnModifiers) - generated from schema shapeHash 18d6f646.... */
@type.define({ className: "EveDistributionSpawnModifierRandomRotation", family: "eve/distribution/spawnModifiers" })
export class EveDistributionSpawnModifierRandomRotation extends CjsModel
{

  #timeSeed = Date.now() >>> 0;

  /** m_minRotation (Vector3) [READWRITE, PERSIST] */
  @io.persist
  @type.vec3
  minRotation = vec3.create();

  /** m_maxRotation (Vector3) [READWRITE, PERSIST] */
  @io.persist
  @type.vec3
  maxRotation = vec3.create();

  /** m_consistentRandom (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  consistentRandom = false;

  /** m_overrideRotation (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  overrideRotation = false;

  /**
   * Reseeds the random stream from the wall clock, so rotations differ between
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
   * Builds a rotation from random yaw, pitch and roll between minRotation and
   * maxRotation, then either replaces the placement's initial rotation or
   * combines it with the authored one.
   */
  @carbon.method
  @impl.adapted
  ProcessSpawnModifier(placement, _numPlacements)
  {
    const seed = getDistributionSeed(placement.uniqueID, this.#timeSeed, this.consistentRandom);
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
