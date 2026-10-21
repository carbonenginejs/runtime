// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildBoosterSet.h
// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildBoosterSet.cpp
import { mat4 } from "#math/mat4";
import { vec3 } from "#math/vec3";
import { meta, type } from "#schema";

/**
 * Carbon EveChildBoosterSet::SingleBoosterData (h:169-179): one booster as
 * EveChildBoosterSet::Add derives it (cpp:162-176). Carbon keeps these records
 * private and unmapped. They persist here so values carry the boosters
 * (docs: non-carbon-extensions.md).
 */
@meta.carbon("EveChildBoosterSet::SingleBoosterData")
export class EveChildBoosterSetSingleBoosterData
{

  /** transform (Matrix): the booster's local matrix. */
  @meta.persist
  @type.mat4
  transform = mat4.create();

  /** lightPosition (Vector3): (0, 0, -lightOffset) through the transform. */
  @meta.persist
  @type.vec3
  lightPosition = vec3.create();

  /** lightRadius (float): the larger X/Y basis length times the light scale. */
  @meta.persist
  @type.float32
  lightRadius = 0;

  /** lightPhase (float): GenerateBoosterLightPhase, an offset into the flicker noise table. */
  @meta.persist
  @type.float32
  lightPhase = 0;

  /** atlasIndex0 (uint32_t) */
  @meta.persist
  @type.uint32
  atlasIndex0 = 0;

  /** atlasIndex1 (uint32_t) */
  @meta.persist
  @type.uint32
  atlasIndex1 = 0;

  /** wavePhase (float): rand() / RAND_MAX. */
  @meta.persist
  @type.float32
  wavePhase = 0;

}
