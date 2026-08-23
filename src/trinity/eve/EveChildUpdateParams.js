// Source: trinity/trinity/Eve/SpaceObject/Children/IEveSpaceObjectChild.h
import { mat4 } from "#math/mat4";
import { vec3 } from "#math/vec3";
import { CjsModel } from "#model";
import { type } from "#schema";


/**
 * The parameter block a parent passes down when updating a space-object child:
 * the parent references, the parent's bone array, the child's world placement,
 * and the owner's motion and activation state. Rebuilt by the parent for each
 * child update, so nothing in it survives the call.
 */
@type.define({
  className: "EveChildUpdateParams",
  family: "eve/child"
})
export class EveChildUpdateParams extends CjsModel
{
  @type.objectRef("IEveSpaceObject2")
  spaceObjectParent = null;

  @type.objectRef("IEveSpaceObjectChild")
  childParent = null;

  @type.uint64
  boneCount = 0;

  @type.objectRef("Float4x3")
  bones = null;

  @type.float32
  ownerMaxSpeed = 0;

  @type.float32
  activationStrength = 1;

  @type.float32
  controllerUpdateFrequency = 0.5;

  @type.boolean
  isVisible = true;

  @type.mat4
  localToWorldTransform = mat4.create();

  @type.vec3
  worldVelocity = vec3.create();
}
