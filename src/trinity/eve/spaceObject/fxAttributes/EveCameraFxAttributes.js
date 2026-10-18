// Source: trinity/trinity/Eve/SpaceObject/Utils/fxAttributes/EveCameraFxAttributes.h
//   trinity/trinity/Eve/SpaceObject/Utils/fxAttributes/EveCameraFxAttributes.cpp
import { meta, type, blue } from "#schema";
import { IEveFxAttribute } from "./IEveFxAttribute.js";
import { mat4 } from "#math/mat4";
import { vec3 } from "#math/vec3";
import { Tr2Renderer } from "../../../core/Tr2Renderer.js";

const OBJECT_POSITION = vec3.create();
const VECTOR_TO_OBJECT = vec3.create();
const VIEW_LOOK_AT = vec3.create();
const CHILD_TRANSFORM = mat4.create();
const IDENTITY_TRANSFORM = mat4.create();

/**
 * A named bag of camera-relative values - distance to camera, look angle to the
 * object, and object, child and camera forward directions - refreshed each child
 * update for effect bindings to read.
 */
@blue.define("EveCameraFxAttributes")
@blue.interface(IEveFxAttribute)
export class EveCameraFxAttributes extends IEveFxAttribute
{

  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.string
  name = "";

  /** m_lookAngleToObject (float) [READ] */
  @blue.read
  @type.float32
  lookAngleToObject = 0;

  /** m_objectRotation (Vector3) [READ] */
  @blue.read
  @type.vec3
  objectRotation = vec3.create();

  /** m_rotationWithChildTransform (Vector3) [READ] */
  @blue.read
  @type.vec3
  rotationWithChildTransform = vec3.create();

  /** m_cameraRotation (Vector3) [READ] */
  @blue.read
  @type.vec3
  cameraRotation = vec3.create();

  /** m_distanceToCamera (float) [READ] */
  @blue.read
  @type.float32
  distanceToCamera = 0;

  /**
   * Collects Carbon's camera-relative attributes for the current child update,
   * from the renderer's current view (EveCameraFxAttributes.cpp:20-49).
   *
   * Adapted: the parents' GetModelCenterWorldPosition and GetLocalToWorldTransform
   * return their result rather than filling a reference, and a missing
   * localToWorldTransform reads as the identity.
   */
  @blue.method
  @meta.adapted
  UpdateAsyncronous(updateContext, params)
  {
    const objectPosition = OBJECT_POSITION;
    vec3.set(objectPosition, 0, 0, 0);

    const spaceObjectParent = params?.spaceObjectParent;
    if (spaceObjectParent)
    {
      const result = spaceObjectParent.GetModelCenterWorldPosition(objectPosition);
      if (result?.length >= 3)
      {
        vec3.copy(objectPosition, result);
      }
    }

    const childParent = params?.childParent;
    if (childParent)
    {
      mat4.identity(CHILD_TRANSFORM);
      const result = childParent.GetLocalToWorldTransform(CHILD_TRANSFORM);
      const transform = result?.length === 16 ? result : CHILD_TRANSFORM;
      vec3.set(this.rotationWithChildTransform, transform[2], transform[6], transform[10]);
      vec3.set(objectPosition, transform[12], transform[13], transform[14]);
    }

    const cameraPosition = Tr2Renderer.GetViewPosition();
    vec3.subtract(VECTOR_TO_OBJECT, objectPosition, cameraPosition);
    const view = Tr2Renderer.GetViewTransform();

    this.distanceToCamera = vec3.length(VECTOR_TO_OBJECT);
    this.lookAngleToObject = -(vec3.dot(Tr2Renderer.GetViewLookAt(VIEW_LOOK_AT), VECTOR_TO_OBJECT) / this.distanceToCamera);

    const objectTransform = params?.localToWorldTransform ?? IDENTITY_TRANSFORM;
    vec3.set(this.objectRotation, objectTransform[2], objectTransform[6], objectTransform[10]);
    vec3.set(this.cameraRotation, view[2], view[6], view[10]);
  }

}
