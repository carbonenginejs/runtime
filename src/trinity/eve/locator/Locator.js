// Source: trinity/trinity/Eve/SpaceObject/Utils/EveLocatorSets.h
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";
import { CjsModel } from "#model";
import { edit, type } from "#schema";


/**
 * Attachment point held as decomposed position, orientation, scale and bone
 * index, as stored inside a locator set.
 */
@type.define({
  className: "Locator",
  family: "eve/utils"
})
export class Locator extends CjsModel
{
  @edit.persist
  @type.vec3
  position = vec3.create();

  @edit.persist
  @type.quat
  direction = quat.create();

  @edit.persist
  @type.vec3
  scale = vec3.fromValues(1, 1, 1);

  @edit.persist
  @type.int32
  boneIndex = -1;

  /** Carbon modular-object ownership tag for this locator record. */
  @edit.persist
  @type.uint32
  partTag = 0;
}
