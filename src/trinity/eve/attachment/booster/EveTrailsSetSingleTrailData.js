// Source: trinity/trinity/Eve/SpaceObject/Attachments/EveTrailsSet.h
// Source: trinity/trinity/Eve/SpaceObject/Attachments/EveTrailsSet.cpp
import { mat4 } from "#math/mat4";
import { meta, type } from "#schema";

/**
 * Carbon EveTrailsSet::SingleTrailData (h:88-94): one trail as
 * EveTrailsSet::Add stores it (cpp:198-206). Carbon keeps these records
 * private and unmapped. They persist here so values carry which boosters
 * have trails (docs: non-carbon-extensions.md).
 */
@meta.carbon("EveTrailsSet::SingleTrailData")
export class EveTrailsSetSingleTrailData
{

  /** transform (Matrix): where the trail starts. */
  @meta.persist
  @type.mat4
  transform = mat4.create();

  /** size (float) */
  @meta.persist
  @type.float32
  size = 0;

}
