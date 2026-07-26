import { applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { quat } from '@carbonenginejs/runtime-utils/quat';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';
import { EveSpaceObject2 as _EveSpaceObject } from '../EveSpaceObject2.js';
import { EveShip2 as _EveShip } from '../EveShip2.js';

let _initProto, _initClass, _init_name, _init_extra_name, _init_activationStrength, _init_extra_activationStrength, _init_activeTurretCount, _init_extra_activeTurretCount, _init_childParent, _init_extra_childParent, _init_generatedShapeEllipsoidCenter, _init_extra_generatedShapeEllipsoidCenter, _init_generatedShapeEllipsoidRadius, _init_extra_generatedShapeEllipsoidRadius, _init_killCount, _init_extra_killCount, _init_ship, _init_extra_ship, _init_boundingSphereRadius, _init_extra_boundingSphereRadius, _init_parentWorldRotation, _init_extra_parentWorldRotation, _init_parentWorldTranslation, _init_extra_parentWorldTranslation;
const BOUNDING_SPHERE = vec4.create();
const OBJECT_POSITION = vec3.create();
const PARENT_TRANSFORM = mat4.create();

/**
 * Carbon math/src/Quaternion.cpp RotationQuaternion(Matrix): direct
 * trace/max-diagonal conversion. Deliberately does not strip scale or
 * normalize the result.
 */
function RotationQuaternion(out, matrix) {
  const trace = matrix[0] + matrix[5] + matrix[10] + 1;
  if (trace > 1) {
    const root = Math.sqrt(trace);
    const divisor = 2 * root;
    out[0] = (matrix[6] - matrix[9]) / divisor;
    out[1] = (matrix[8] - matrix[2]) / divisor;
    out[2] = (matrix[1] - matrix[4]) / divisor;
    out[3] = root / 2;
    return out;
  }
  let largest = 0;
  if (matrix[5] > matrix[0]) largest = 1;
  if (matrix[10] > matrix[largest * 5]) largest = 2;
  let scale;
  if (largest === 0) {
    scale = 2 * Math.sqrt(1 + matrix[0] - matrix[5] - matrix[10]);
    out[0] = 0.25 * scale;
    out[1] = (matrix[1] + matrix[4]) / scale;
    out[2] = (matrix[2] + matrix[8]) / scale;
    out[3] = (matrix[6] - matrix[9]) / scale;
  } else if (largest === 1) {
    scale = 2 * Math.sqrt(1 + matrix[5] - matrix[0] - matrix[10]);
    out[0] = (matrix[1] + matrix[4]) / scale;
    out[1] = 0.25 * scale;
    out[2] = (matrix[6] + matrix[9]) / scale;
    out[3] = (matrix[8] - matrix[2]) / scale;
  } else {
    scale = 2 * Math.sqrt(1 + matrix[10] - matrix[0] - matrix[5]);
    out[0] = (matrix[2] + matrix[8]) / scale;
    out[1] = (matrix[6] + matrix[9]) / scale;
    out[2] = 0.25 * scale;
    out[3] = (matrix[1] - matrix[4]) / scale;
  }
  return out;
}
let _EveSpaceObjectFxAttr;
class EveSpaceObjectFxAttributes extends CjsModel {
  static {
    ({
      e: [_init_name, _init_extra_name, _init_activationStrength, _init_extra_activationStrength, _init_activeTurretCount, _init_extra_activeTurretCount, _init_childParent, _init_extra_childParent, _init_generatedShapeEllipsoidCenter, _init_extra_generatedShapeEllipsoidCenter, _init_generatedShapeEllipsoidRadius, _init_extra_generatedShapeEllipsoidRadius, _init_killCount, _init_extra_killCount, _init_ship, _init_extra_ship, _init_boundingSphereRadius, _init_extra_boundingSphereRadius, _init_parentWorldRotation, _init_extra_parentWorldRotation, _init_parentWorldTranslation, _init_extra_parentWorldTranslation, _initProto],
      c: [_EveSpaceObjectFxAttr, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveSpaceObjectFxAttributes",
      family: "eve/fxAttributes"
    })], [[[io, io.persist, type, type.string], 16, "name"], [[io, io.read, type, type.float32], 16, "activationStrength"], [[io, io.read, type, type.float32], 16, "activeTurretCount"], [[io, io.read, type, type.float32], 16, "childParent"], [[io, io.read, type, type.vec3], 16, "generatedShapeEllipsoidCenter"], [[io, io.read, type, type.vec3], 16, "generatedShapeEllipsoidRadius"], [[io, io.read, type, type.float32], 16, "killCount"], [[io, io.read, type, type.float32], 16, "ship"], [[io, io.read, type, type.float32], 16, "boundingSphereRadius"], [[io, io.read, type, type.quat], 16, "parentWorldRotation"], [[io, io.read, type, type.vec3], 16, "parentWorldTranslation"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon BlueCastPtr checks become JavaScript instanceof checks; native out parameters are typed-array copy-outs.")], 18, "UpdateAsyncronous"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_parentWorldTranslation(this);
  }
  #initialized = (_initProto(this), false);

  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  name = _init_name(this, "");

  /** m_activationStrength (float) [READ] */
  activationStrength = (_init_extra_name(this), _init_activationStrength(this, 1));

  /** m_activeTurretCount (float) [READ] */
  activeTurretCount = (_init_extra_activationStrength(this), _init_activeTurretCount(this, 0));

  /** m_distanceToChildParent (float) [READ] */
  childParent = (_init_extra_activeTurretCount(this), _init_childParent(this, 0));

  /** m_generatedShapeEllipsoidCenter (Vector3) [READ] */
  generatedShapeEllipsoidCenter = (_init_extra_childParent(this), _init_generatedShapeEllipsoidCenter(this, vec3.create()));

  /** m_generatedShapeEllipsoidRadius (Vector3) [READ] */
  generatedShapeEllipsoidRadius = (_init_extra_generatedShapeEllipsoidCenter(this), _init_generatedShapeEllipsoidRadius(this, vec3.create()));

  /** m_killCount (float) [READ] */
  killCount = (_init_extra_generatedShapeEllipsoidRadius(this), _init_killCount(this, 0));

  /** m_distanceToShip (float) [READ] */
  ship = (_init_extra_killCount(this), _init_ship(this, 0));

  /** m_boundingSphereRadius (float) [READ] */
  boundingSphereRadius = (_init_extra_ship(this), _init_boundingSphereRadius(this, 0));

  /** m_parentWorldRotation (Quaternion) [READ] */
  parentWorldRotation = (_init_extra_boundingSphereRadius(this), _init_parentWorldRotation(this, quat.fromValues(0, 0, 0, 0)));

  /** m_parentWorldTranslation (Vector3) [READ] */
  parentWorldTranslation = (_init_extra_parentWorldRotation(this), _init_parentWorldTranslation(this, vec3.create()));

  /**
   * Collects the space-object attributes used by effect bindings. Carbon's
   * Blue casts are represented by the corresponding runtime constructors.
   */
  UpdateAsyncronous(_updateContext, params) {
    const parent = params?.spaceObjectParent;
    if (!parent) {
      return;
    }
    if (!this.#initialized) {
      if (parent instanceof _EveSpaceObject) {
        parent.GetShapeEllipsoid(this.generatedShapeEllipsoidCenter, this.generatedShapeEllipsoidRadius);
      }
      this.#initialized = true;
    }
    vec4.set(BOUNDING_SPHERE, 0, 0, 0, 0);
    const sphereResult = parent.GetBoundingSphere(BOUNDING_SPHERE);
    const sphere = sphereResult?.length >= 4 ? sphereResult : BOUNDING_SPHERE;
    vec3.set(OBJECT_POSITION, 0, 0, 0);
    const positionResult = parent.GetModelCenterWorldPosition(OBJECT_POSITION);
    if (positionResult?.length >= 3) {
      vec3.copy(OBJECT_POSITION, positionResult);
    }
    mat4.identity(PARENT_TRANSFORM);
    const transformResult = parent.GetLocalToWorldTransform(PARENT_TRANSFORM);
    const parentTransform = transformResult?.length === 16 ? transformResult : PARENT_TRANSFORM;
    vec3.copy(this.parentWorldTranslation, OBJECT_POSITION);
    RotationQuaternion(this.parentWorldRotation, parentTransform);
    this.activationStrength = Number(params?.activationStrength ?? 1);

    // Carbon computes distance before replacing the cached radius.
    this.ship = vec3.length(OBJECT_POSITION) - this.boundingSphereRadius;
    this.boundingSphereRadius = sphere[3];
    if (parent instanceof _EveShip) {
      this.activeTurretCount = Number(parent.GetActiveTurretCount());
      this.killCount = Number(parent.GetKillCounterValue());
    }
  }
  static {
    _initClass();
  }
}

export { _EveSpaceObjectFxAttr as EveSpaceObjectFxAttributes };
//# sourceMappingURL=EveSpaceObjectFxAttributes.js.map
