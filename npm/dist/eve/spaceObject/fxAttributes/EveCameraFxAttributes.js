import { applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';

let _initProto, _initClass, _init_name, _init_extra_name, _init_lookAngleToObject, _init_extra_lookAngleToObject, _init_objectRotation, _init_extra_objectRotation, _init_rotationWithChildTransform, _init_extra_rotationWithChildTransform, _init_cameraRotation, _init_extra_cameraRotation, _init_distanceToCamera, _init_extra_distanceToCamera;
const OBJECT_POSITION = vec3.create();
const VECTOR_TO_OBJECT = vec3.create();
const CHILD_TRANSFORM = mat4.create();
const IDENTITY_TRANSFORM = mat4.create();

/**
 * A named bag of camera-relative values - distance to camera, look angle to the
 * object, and object, child and camera forward directions - refreshed each child
 * update for effect bindings to read.
 */
let _EveCameraFxAttribute;
class EveCameraFxAttributes extends CjsModel {
  static {
    ({
      e: [_init_name, _init_extra_name, _init_lookAngleToObject, _init_extra_lookAngleToObject, _init_objectRotation, _init_extra_objectRotation, _init_rotationWithChildTransform, _init_extra_rotationWithChildTransform, _init_cameraRotation, _init_extra_cameraRotation, _init_distanceToCamera, _init_extra_distanceToCamera, _initProto],
      c: [_EveCameraFxAttribute, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveCameraFxAttributes",
      family: "eve/fxAttributes"
    })], [[[io, io.persist, type, type.string], 16, "name"], [[io, io.read, type, type.float32], 16, "lookAngleToObject"], [[io, io.read, type, type.vec3], 16, "objectRotation"], [[io, io.read, type, type.vec3], 16, "rotationWithChildTransform"], [[io, io.read, type, type.vec3], 16, "cameraRotation"], [[io, io.read, type, type.float32], 16, "distanceToCamera"], [[carbon, carbon.method, void 0, carbon.contextual(["camera"]), impl, impl.adapted, void 0, impl.reason("Carbon reads Tr2Renderer camera globals; runtime-trinity supplies the equivalent state through updateContext.renderContext.")], 18, "UpdateAsyncronous"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_distanceToCamera(this);
  }
  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  name = (_initProto(this), _init_name(this, ""));

  /** m_lookAngleToObject (float) [READ] */
  lookAngleToObject = (_init_extra_name(this), _init_lookAngleToObject(this, 0));

  /** m_objectRotation (Vector3) [READ] */
  objectRotation = (_init_extra_lookAngleToObject(this), _init_objectRotation(this, vec3.create()));

  /** m_rotationWithChildTransform (Vector3) [READ] */
  rotationWithChildTransform = (_init_extra_objectRotation(this), _init_rotationWithChildTransform(this, vec3.create()));

  /** m_cameraRotation (Vector3) [READ] */
  cameraRotation = (_init_extra_rotationWithChildTransform(this), _init_cameraRotation(this, vec3.create()));

  /** m_distanceToCamera (float) [READ] */
  distanceToCamera = (_init_extra_cameraRotation(this), _init_distanceToCamera(this, 0));

  /**
   * Collects Carbon's camera-relative attributes for the current child update.
   * Renderer-global camera state is supplied by EveUpdateContext in Trinity.
   */
  UpdateAsyncronous(updateContext, params) {
    const renderContext = updateContext?.renderContext;
    if (!renderContext) {
      return;
    }
    const objectPosition = OBJECT_POSITION;
    vec3.set(objectPosition, 0, 0, 0);
    const spaceObjectParent = params?.spaceObjectParent;
    if (spaceObjectParent) {
      const result = spaceObjectParent.GetModelCenterWorldPosition(objectPosition);
      if (result?.length >= 3) {
        vec3.copy(objectPosition, result);
      }
    }
    const childParent = params?.childParent;
    if (childParent) {
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
    this.lookAngleToObject = -(view[2] * VECTOR_TO_OBJECT[0] + view[6] * VECTOR_TO_OBJECT[1] + view[10] * VECTOR_TO_OBJECT[2]) / this.distanceToCamera;
    const objectTransform = params?.localToWorldTransform ?? IDENTITY_TRANSFORM;
    vec3.set(this.objectRotation, objectTransform[2], objectTransform[6], objectTransform[10]);
    vec3.set(this.cameraRotation, view[2], view[6], view[10]);
  }
  static {
    _initClass();
  }
}

export { _EveCameraFxAttribute as EveCameraFxAttributes };
//# sourceMappingURL=EveCameraFxAttributes.js.map
