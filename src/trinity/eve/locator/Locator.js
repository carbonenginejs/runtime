// Source: trinity/trinity/Eve/SpaceObject/Utils/EveLocatorSets.h
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";
import { CjsModel } from "#model";
import { io, type } from "#schema";


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
  @io.persist
  @type.vec3
  position = vec3.create();

  @io.persist
  @type.quat
  direction = quat.create();

  @io.persist
  @type.vec3
  scale = vec3.fromValues(1, 1, 1);

  @io.persist
  @type.int32
  boneIndex = -1;
}
