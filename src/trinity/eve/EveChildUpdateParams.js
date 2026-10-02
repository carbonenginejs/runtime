// Source: trinity/trinity/Eve/SpaceObject/Children/IEveSpaceObjectChild.h
import { mat4 } from "#math/mat4";
import { vec3 } from "#math/vec3";
import { meta } from "#schema";


/**
 * The parameter block a parent passes down when updating a space-object child:
 * the parent references, the parent's bone array, the child's world placement,
 * and the owner's motion and activation state. Rebuilt by the parent for each
 * child update, so nothing in it survives the call.
 */
@meta.define({
  className: "EveChildUpdateParams",
  family: "eve/child"
})
export class EveChildUpdateParams
{
  @meta.type.objectRef("IEveSpaceObject2")
  spaceObjectParent = null;

  @meta.type.objectRef("IEveSpaceObjectChild")
  childParent = null;

  @meta.type.uint64
  boneCount = 0;

  @meta.type.objectRef("Float4x3")
  bones = null;

  @meta.type.float32
  ownerMaxSpeed = 0;

  @meta.type.float32
  activationStrength = 1;

  @meta.type.float32
  controllerUpdateFrequency = 0.5;

  @meta.type.boolean
  isVisible = true;

  @meta.type.mat4
  localToWorldTransform = mat4.create();

  @meta.type.vec3
  worldVelocity = vec3.create();
}
