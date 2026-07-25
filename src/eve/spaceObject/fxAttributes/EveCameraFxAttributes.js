// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinity/trinity/Eve/SpaceObject/Utils/fxAttributes/EveCameraFxAttributes.h
//   trinity/trinity/Eve/SpaceObject/Utils/fxAttributes/EveCameraFxAttributes.cpp
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { mat4 } from "@carbonenginejs/runtime-utils/mat4";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";

const OBJECT_POSITION = vec3.create();
const VECTOR_TO_OBJECT = vec3.create();
const CHILD_TRANSFORM = mat4.create();
const IDENTITY_TRANSFORM = mat4.create();

@type.define({ className: "EveCameraFxAttributes", family: "eve/fxAttributes" })
export class EveCameraFxAttributes extends CjsModel
{

  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  name = "";

  /** m_lookAngleToObject (float) [READ] */
  @io.read
  @type.float32
  lookAngleToObject = 0;

  /** m_objectRotation (Vector3) [READ] */
  @io.read
  @type.vec3
  objectRotation = vec3.create();

  /** m_rotationWithChildTransform (Vector3) [READ] */
  @io.read
  @type.vec3
  rotationWithChildTransform = vec3.create();

  /** m_cameraRotation (Vector3) [READ] */
  @io.read
  @type.vec3
  cameraRotation = vec3.create();

  /** m_distanceToCamera (float) [READ] */
  @io.read
  @type.float32
  distanceToCamera = 0;

  /**
   * Collects Carbon's camera-relative attributes for the current child update.
   * Renderer-global camera state is supplied by EveUpdateContext in Trinity.
   */
  @carbon.method
  @carbon.contextual(["camera"])
  @impl.adapted
  @impl.reason("Carbon reads Tr2Renderer camera globals; runtime-trinity supplies the equivalent state through updateContext.renderContext.")
  UpdateAsyncronous(updateContext, params)
  {
    const renderContext = updateContext?.renderContext;
    if (!renderContext)
    {
      return;
    }

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

    const cameraPosition = renderContext.GetViewPosition();
    const view = renderContext.GetViewTransform();

    vec3.subtract(VECTOR_TO_OBJECT, objectPosition, cameraPosition);
    this.distanceToCamera = vec3.length(VECTOR_TO_OBJECT);
    this.lookAngleToObject = -(
      view[2] * VECTOR_TO_OBJECT[0] +
      view[6] * VECTOR_TO_OBJECT[1] +
      view[10] * VECTOR_TO_OBJECT[2]
    ) / this.distanceToCamera;

    const objectTransform = params?.localToWorldTransform ?? IDENTITY_TRANSFORM;
    vec3.set(this.objectRotation, objectTransform[2], objectTransform[6], objectTransform[10]);
    vec3.set(this.cameraRotation, view[2], view[6], view[10]);
  }

}
