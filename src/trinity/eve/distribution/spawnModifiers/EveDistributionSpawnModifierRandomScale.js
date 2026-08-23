// Source: trinity/trinity/Eve/SpaceObject/Utils/EveDistributionMethods/DistributionSpawnModifiers/EveDistributionSpawnModifierRandomScale.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { carbon, impl, io, type } from "#schema";
import { CjsModel } from "#model";
import { vec3 } from "#math/vec3";
import { createMinStdRandom, getDistributionSeed } from "../../CjsDistributionRandom.js";

/** EveDistributionSpawnModifierRandomScale (eve/distribution/spawnModifiers) - generated from schema shapeHash 721180bc.... */
@type.define({ className: "EveDistributionSpawnModifierRandomScale", family: "eve/distribution/spawnModifiers" })
export class EveDistributionSpawnModifierRandomScale extends CjsModel
{

  #timeSeed = Date.now() >>> 0;

  /** m_minScale (Vector3) [READWRITE, PERSIST] */
  @io.persist
  @type.vec3
  minScale = vec3.fromValues(1, 1, 1);

  /** m_maxScale (Vector3) [READWRITE, PERSIST] */
  @io.persist
  @type.vec3
  maxScale = vec3.fromValues(1, 1, 1);

  /** m_consistentRandom (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  consistentRandom = false;

  /** m_uniformScale (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  uniformScale = false;

  /** m_overrideScale (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  overrideScale = false;

  /**
   * Reseeds the random stream from the wall clock, so scales differ between runs
   * unless consistentRandom pins them to the placement id.
   */
  @carbon.method
  @impl.adapted
  Initialize()
  {
    this.#timeSeed = Date.now() >>> 0;
    return true;
  }

  /**
   * Draws a random scale between minScale and maxScale - per axis, or with one
   * shared factor when uniformScale is set - and either replaces the placement's
   * initial scale or multiplies into it.
   */
  @carbon.method
  @impl.adapted
  ProcessSpawnModifier(placement, _numPlacements)
  {
    const seed = getDistributionSeed(placement.uniqueID, this.#timeSeed, this.consistentRandom);
    const random = createMinStdRandom(seed);
    const scale = vec3.create();

    if (this.uniformScale)
    {
      vec3.lerp(scale, this.minScale, this.maxScale, random());
    }
    else
    {
      for (let axis = 0; axis < 3; axis++)
      {
        scale[axis] = this.minScale[axis] + (this.maxScale[axis] - this.minScale[axis]) * random();
      }
    }

    if (this.overrideScale)
    {
      placement.initialScale.set(scale);
    }
    else
    {
      vec3.multiply(placement.initialScale, placement.initialScale, scale);
    }
  }

}
