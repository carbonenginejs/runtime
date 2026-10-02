// Source: trinity/trinity/Eve/SpaceObject/Utils/EveLocatorSets.h
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";
import { meta, edit, type } from "#schema";


/**
 * Attachment point held as decomposed position, orientation, scale and bone
 * index, as stored inside a locator set.
 * Native 64-bit size 48; offsets and storage types: trinity/trinity/
 * Eve/SpaceObject/Utils/EveLocatorSets.h:10-17; Eve/SpaceObject/Utils/EveLocatorSets.cpp:32-39.
 */
@type.define({
  className: "Locator",
  family: "eve/utils"
})
@meta.struct.define({ size: 48 })
export class Locator
{
  @edit.persist
  @meta.struct.FLOAT32_3(0)
  position = vec3.create();

  @edit.persist
  @meta.struct.FLOAT32_4(12)
  @type.quat
  direction = quat.create();

  @edit.persist
  @meta.struct.FLOAT32_3(28)
  scale = vec3.fromValues(1, 1, 1);

  @edit.persist
  @meta.struct.INT32_1(40)
  boneIndex = -1;

  /** Carbon modular-object ownership tag for this locator record. */
  @edit.persist
  @meta.struct.UINT32_1(44)
  partTag = 0;
}
