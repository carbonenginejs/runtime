import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { TriBatchType } from '@carbonenginejs/runtime-utils/graphics';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { quat } from '@carbonenginejs/runtime-utils/quat';
import { carbon, impl, io, type } from '@carbonenginejs/runtime-utils/schema';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { Tr2TransformModifier } from '../generated/trinityCore/enums.js';

let _initProto, _initClass, _init_modifier, _init_extra_modifier, _init_localTransform, _init_extra_localTransform, _init_worldTransform, _init_extra_worldTransform, _init_name, _init_extra_name, _init_scaling, _init_extra_scaling, _init_rotation, _init_extra_rotation, _init_translation, _init_extra_translation, _init_distanceBasedScaleArg, _init_extra_distanceBasedScaleArg, _init_distanceBasedScaleArg2, _init_extra_distanceBasedScaleArg2, _init_mesh, _init_extra_mesh, _init_curveSets, _init_extra_curveSets, _init_useDistanceBasedScale, _init_extra_useDistanceBasedScale, _init_display, _init_extra_display, _init_update, _init_extra_update, _init_sortValueMultiplier, _init_extra_sortValueMultiplier;

// Carbon uses row vectors. A single matrix has the same flat bytes as our
// gl-matrix value, but every Carbon product reverses operands in JavaScript.
// Thus Carbon local * parent is mat4.multiply(world, parent, local), and the
// longer compatibility-modifier products below are reversed in full.

function axisLength(matrix, offset) {
  return Math.hypot(matrix[offset], matrix[offset + 1], matrix[offset + 2]);
}
function axisLengthSquared(matrix, offset) {
  return matrix[offset] * matrix[offset] + matrix[offset + 1] * matrix[offset + 1] + matrix[offset + 2] * matrix[offset + 2];
}
function rotateIntoBasis(out, value, matrix) {
  const x = value[0];
  const y = value[1];
  const z = value[2];
  out[0] = x * matrix[0] + y * matrix[1] + z * matrix[2];
  out[1] = x * matrix[4] + y * matrix[5] + z * matrix[6];
  out[2] = x * matrix[8] + y * matrix[9] + z * matrix[10];
  return out;
}
function changeBase(out, forward, up, right) {
  vec3.cross(right, up, forward);
  mat4.identity(out);
  out[0] = right[0];
  out[1] = right[1];
  out[2] = right[2];
  out[4] = up[0];
  out[5] = up[1];
  out[6] = up[2];
  out[8] = forward[0];
  out[9] = forward[1];
  out[10] = forward[2];
  return out;
}
function setViewBasis(out, inverseView, scale) {
  out[0] = inverseView[0] * scale[0];
  out[1] = inverseView[1] * scale[0];
  out[2] = inverseView[2] * scale[0];
  out[4] = inverseView[4] * scale[1];
  out[5] = inverseView[5] * scale[1];
  out[6] = inverseView[6] * scale[1];
  out[8] = inverseView[8] * scale[2];
  out[9] = inverseView[9] * scale[2];
  out[10] = inverseView[10] * scale[2];
  return out;
}
function normalizeOrZero(out, x, y, z) {
  const length = Math.hypot(x, y, z);
  if (length) {
    const inverseLength = 1 / length;
    out[0] = x * inverseLength;
    out[1] = y * inverseLength;
    out[2] = z * inverseLength;
  } else {
    out[0] = 0;
    out[1] = 0;
    out[2] = 0;
  }
  return out;
}

// Carbon's LookAtMatrix deliberately normalizes degenerate axes to zero.
// gl-matrix returns identity when eye and target coincide, so using mat4.lookAt
// here would change the authored LOOK_AT_CAMERA edge case.
function carbonLookAt(out, eye, target, up, forward, right, realUp) {
  normalizeOrZero(forward, target[0] - eye[0], target[1] - eye[1], target[2] - eye[2]);
  vec3.cross(right, up, forward);
  vec3.cross(realUp, forward, right);
  normalizeOrZero(right, right[0], right[1], right[2]);
  normalizeOrZero(realUp, realUp[0], realUp[1], realUp[2]);
  out[0] = -right[0];
  out[4] = -right[1];
  out[8] = -right[2];
  out[12] = vec3.dot(right, eye);
  out[1] = realUp[0];
  out[5] = realUp[1];
  out[9] = realUp[2];
  out[13] = -vec3.dot(realUp, eye);
  out[2] = -forward[0];
  out[6] = -forward[1];
  out[10] = -forward[2];
  out[14] = vec3.dot(forward, eye);
  out[3] = 0;
  out[7] = 0;
  out[11] = 0;
  out[15] = 1;
  return out;
}

/** Common transform, curve, mesh, sorting, and camera-modifier behavior. */
let _Tr2Transform;
new class extends _identity {
  static [class Tr2Transform extends CjsModel {
    static {
      ({
        e: [_init_modifier, _init_extra_modifier, _init_localTransform, _init_extra_localTransform, _init_worldTransform, _init_extra_worldTransform, _init_name, _init_extra_name, _init_scaling, _init_extra_scaling, _init_rotation, _init_extra_rotation, _init_translation, _init_extra_translation, _init_distanceBasedScaleArg, _init_extra_distanceBasedScaleArg, _init_distanceBasedScaleArg2, _init_extra_distanceBasedScaleArg2, _init_mesh, _init_extra_mesh, _init_curveSets, _init_extra_curveSets, _init_useDistanceBasedScale, _init_extra_useDistanceBasedScale, _init_display, _init_extra_display, _init_update, _init_extra_update, _init_sortValueMultiplier, _init_extra_sortValueMultiplier, _initProto],
        c: [_Tr2Transform, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2Transform",
        family: "trinityCore"
      })], [[[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("The active render context is threaded to context-dependent curve functions instead of read from a process-global renderer.")], 18, "Update"], [[carbon, carbon.method, void 0, carbon.contextual(["camera"]), impl, impl.adapted, void 0, impl.reason("Carbon renderer globals are supplied explicitly as the active render context; matrix products reverse for gl-matrix semantics.")], 18, "UpdateViewDependentData"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetScaling"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetRotation"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetTranslation"], [[carbon, carbon.method, impl, impl.implemented], 18, "IsVisible"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "GetPerObjectData"], [[carbon, carbon.method, impl, impl.implemented], 18, "HasTransparentBatches"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Returns whether JavaScript mesh delegation committed a batch; Carbon's void method exposes no result.")], 18, "GetBatches"], [[carbon, carbon.method, void 0, carbon.contextual(["camera"]), impl, impl.adapted, void 0, impl.reason("The active render context replaces Carbon's Tr2Renderer view-position global.")], 18, "GetSortValue"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetMesh"], [[io, io.persist, type, type.int32, void 0, type.enum("Tr2TransformModifier")], 16, "modifier"], [[io, io.read, type, type.mat4], 16, "localTransform"], [[io, io.read, type, type.mat4], 16, "worldTransform"], [[io, io.persist, type, type.string], 16, "name"], [[io, io.persist, type, type.vec3], 16, "scaling"], [[io, io.persist, type, type.quat], 16, "rotation"], [[io, io.persist, type, type.vec3], 16, "translation"], [[io, io.persist, type, type.float32], 16, "distanceBasedScaleArg1"], [[io, io.persist, type, type.float32], 16, "distanceBasedScaleArg2"], [[io, io.persist, void 0, type.model("Tr2MeshBase")], 16, "mesh"], [[io, io.persist, void 0, type.list("TriCurveSet")], 16, "curveSets"], [[io, io.persist, type, type.boolean], 16, "useDistanceBasedScale"], [[io, io.persist, type, type.boolean], 16, "display"], [[io, io.persist, type, type.boolean], 16, "update"], [[io, io.persist, type, type.float32], 16, "sortValueMultiplier"]], 0, void 0, CjsModel));
    }
    constructor(...args) {
      super(...args);
      _init_extra_sortValueMultiplier(this);
    }
    /** Advances authored curve sets while update is enabled. */
    Update(time, renderContext = null) {
      if (!this.update) {
        return;
      }
      const seconds = Number(time);
      for (const curveSet of this.curveSets) {
        curveSet.Update(seconds, undefined, renderContext);
      }
    }

    /**
     * Rebuilds local/world transforms and applies Carbon's camera modifiers.
     * The render-context argument is the JavaScript replacement for
     * Carbon's Tr2Renderer globals; camera-dependent modes fail when it is absent.
    */
    UpdateViewDependentData(context, parentTransform = _Tr2Transform.#identity) {
      const scratch = _Tr2Transform.#scratch;
      const finalScale = scratch.finalScale;
      vec3.copy(finalScale, this.scaling);
      if (this.useDistanceBasedScale) {
        vec3.transformMat4(scratch.position, this.translation, parentTransform);
        vec3.subtract(scratch.direction, scratch.position, context.GetViewPosition());
        const distance = vec3.length(scratch.direction);
        const fovHeight = Math.sin(context.GetFieldOfView() * 0.5) * distance;
        const scaler = this.distanceBasedScaleArg1 / Math.pow(fovHeight, this.distanceBasedScaleArg2);
        vec3.scale(finalScale, finalScale, scaler * fovHeight);
      }
      mat4.copy(this.lastWorldTransform, this.worldTransform);
      mat4.fromRotationTranslationScale(this.localTransform, this.rotation, this.translation, finalScale);
      mat4.multiply(this.worldTransform, parentTransform, this.localTransform);
      switch (this.modifier) {
        case Tr2TransformModifier.TR2TM_BILLBOARD:
        case Tr2TransformModifier.TR2TM_SIMPLE_HALO:
          this.#ApplyBillboard(finalScale, parentTransform, context);
          break;
        case Tr2TransformModifier.TR2TM_EVE_CAMERA_ROTATION:
          this.#ApplyEveCameraRotation(finalScale, parentTransform, context);
          break;
        case Tr2TransformModifier.TR2TM_EVE_CAMERA_ROTATION_ALIGNED:
        case Tr2TransformModifier.TR2TM_EVE_BOOSTER:
        case Tr2TransformModifier.TR2TM_EVE_SIMPLE_HALO:
          this.#ApplyCompatibilityModifier(finalScale, parentTransform, context);
          break;
        case Tr2TransformModifier.TR2TM_LOOK_AT_CAMERA:
          this.#ApplyLookAt(finalScale, parentTransform, context);
          break;
        case Tr2TransformModifier.TR2TM_TRANSLATE_WITH_CAMERA:
          {
            const viewPosition = context.GetViewPosition();
            this.worldTransform[12] = viewPosition[0];
            this.worldTransform[13] = viewPosition[1];
            this.worldTransform[14] = viewPosition[2];
            break;
          }
        case Tr2TransformModifier.TR2TM_PRE_TRANSLATE_WITH_CAMERA:
          vec3.add(scratch.position, context.GetViewPosition(), this.translation);
          mat4.fromRotationTranslationScale(this.localTransform, this.rotation, scratch.position, finalScale);
          mat4.multiply(this.worldTransform, parentTransform, this.localTransform);
          break;
      }
      return this.worldTransform;
    }

    /** Copies a new authored scale into the stable schema vector. */
    SetScaling(value) {
      vec3.copy(this.scaling, value);
    }

    /** Copies a new authored rotation into the stable schema quaternion. */
    SetRotation(value) {
      quat.copy(this.rotation, value);
    }

    /** Copies a new authored translation into the stable schema vector. */
    SetTranslation(value) {
      vec3.copy(this.translation, value);
    }

    /** Carbon's default ITr2Renderable visibility contract. */
    IsVisible(_updateContext) {
      return true;
    }

    /** Abstract ITr2Renderable per-object-data obligation. */
    GetPerObjectData(..._args) {
      throw new Error("Tr2Transform.GetPerObjectData must be implemented by a scene-specific subclass.");
    }

    /** Returns whether the displayed mesh has transparent areas. */
    HasTransparentBatches() {
      return !!(this.display && this.mesh && this.mesh.GetAreas(TriBatchType.TRIBATCHTYPE_TRANSPARENT).length);
    }

    /** Delegates the requested area vector to the authored mesh. */
    GetBatches(batches, batchType, perObjectData, _reason) {
      if (this.display && this.mesh) {
        return this.mesh.GetBatches(batches, this.mesh.GetAreas(batchType), perObjectData) === true;
      }
      return false;
    }

    /** Returns camera distance times the authored sort multiplier. */
    GetSortValue(context) {
      const viewPosition = context.GetViewPosition();
      const dx = viewPosition[0] - this.worldTransform[12];
      const dy = viewPosition[1] - this.worldTransform[13];
      const dz = viewPosition[2] - this.worldTransform[14];
      return Math.hypot(dx, dy, dz) * this.sortValueMultiplier;
    }

    /** Returns the authored mesh reference. */
    GetMesh() {
      return this.mesh;
    }

    /** Applies Carbon's billboard and squared-facing simple-halo basis. */
    #ApplyBillboard(finalScale, parentTransform, renderContext) {
      const scratch = _Tr2Transform.#scratch;
      vec3.set(scratch.scale, finalScale[0] * axisLength(parentTransform, 0), finalScale[1] * axisLength(parentTransform, 4), finalScale[2] * axisLength(parentTransform, 8));
      if (this.modifier === Tr2TransformModifier.TR2TM_SIMPLE_HALO) {
        const viewPosition = renderContext.GetViewPosition();
        vec3.set(scratch.direction, viewPosition[0] - this.worldTransform[12], viewPosition[1] - this.worldTransform[13], viewPosition[2] - this.worldTransform[14]);
        vec3.normalize(scratch.direction, scratch.direction);
        vec3.set(scratch.forward, this.worldTransform[8], this.worldTransform[9], this.worldTransform[10]);
        vec3.normalize(scratch.forward, scratch.forward);
        const facing = Math.max(0, vec3.dot(scratch.direction, scratch.forward));
        vec3.scale(scratch.scale, scratch.scale, facing * facing);
      }
      setViewBasis(this.worldTransform, renderContext.GetInverseViewTransform(), scratch.scale);
    }

    /** Applies Carbon's EVE camera rotation while retaining world translation. */
    #ApplyEveCameraRotation(finalScale, parentTransform, renderContext) {
      const scratch = _Tr2Transform.#scratch;
      vec3.transformMat4(scratch.position, this.translation, parentTransform);
      mat4.fromRotationTranslationScale(this.localTransform, this.rotation, scratch.position, finalScale);
      vec3.set(scratch.translation, this.localTransform[12], this.localTransform[13], this.localTransform[14]);
      // Carbon local * inverseView -> gl-matrix inverseView * local.
      mat4.multiply(this.worldTransform, renderContext.GetInverseViewTransform(), this.localTransform);
      this.worldTransform[12] = scratch.translation[0];
      this.worldTransform[13] = scratch.translation[1];
      this.worldTransform[14] = scratch.translation[2];
    }

    /** Applies the aligned, booster, and EVE simple-halo compatibility modes. */
    #ApplyCompatibilityModifier(finalScale, parentTransform, renderContext) {
      const scratch = _Tr2Transform.#scratch;
      mat4.fromTranslation(scratch.translationMatrix, this.translation);
      mat4.multiply(this.worldTransform, parentTransform, scratch.translationMatrix);
      const viewPosition = renderContext.GetViewPosition();
      vec3.set(scratch.direction, viewPosition[0] - this.worldTransform[12], viewPosition[1] - this.worldTransform[13], viewPosition[2] - this.worldTransform[14]);
      rotateIntoBasis(scratch.forward, scratch.direction, parentTransform);
      scratch.forward[0] /= axisLengthSquared(parentTransform, 0);
      scratch.forward[1] /= axisLengthSquared(parentTransform, 4);
      scratch.forward[2] /= axisLengthSquared(parentTransform, 8);
      const distanceCenter = vec3.length(scratch.forward);
      vec3.normalize(scratch.forward, scratch.forward);
      const view = renderContext.GetViewTransform();
      vec3.set(scratch.right, view[0], view[4], view[8]);
      rotateIntoBasis(scratch.right, scratch.right, parentTransform);
      vec3.cross(scratch.up, scratch.forward, scratch.right);
      vec3.normalize(scratch.up, scratch.up);
      changeBase(scratch.align, scratch.forward, scratch.up, scratch.baseRight);

      // Carbon Rotation(rotation) * align -> gl-matrix align * rotation.
      mat4.fromQuat(scratch.rotationMatrix, this.rotation);
      mat4.multiply(scratch.align, scratch.align, scratch.rotationMatrix);
      if (this.modifier === Tr2TransformModifier.TR2TM_EVE_SIMPLE_HALO) {
        vec3.set(scratch.axis, this.worldTransform[8], this.worldTransform[9], this.worldTransform[10]);
        vec3.normalize(scratch.axis, scratch.axis);
        vec3.negate(scratch.axis, scratch.axis);
        vec3.normalize(scratch.normalizedDirection, scratch.direction);
        const facing = Math.max(0, vec3.dot(scratch.normalizedDirection, scratch.axis));
        vec3.scale(scratch.scale, this.scaling, facing);
        mat4.fromScaling(scratch.scaleMatrix, scratch.scale);
        // Carbon scale * align * world -> gl-matrix world * align * scale.
        mat4.multiply(this.worldTransform, this.worldTransform, scratch.align);
        mat4.multiply(this.worldTransform, this.worldTransform, scratch.scaleMatrix);
      } else if (this.modifier === Tr2TransformModifier.TR2TM_EVE_BOOSTER) {
        const radius = 0.5;
        const b = Math.sqrt(distanceCenter * distanceCenter - radius * radius);
        let scale = b / distanceCenter;
        const translation = -radius * radius / (distanceCenter * scale);
        scale *= this.scaling[0];
        vec3.set(scratch.scale, scale, scale, scale);
        mat4.fromScaling(scratch.scaleMatrix, scratch.scale);
        vec3.set(scratch.position, 0, 0, translation);
        mat4.fromTranslation(scratch.translationMatrix, scratch.position);
        // Carbon translation * align * scale * world -> world * scale * align * translation.
        mat4.multiply(this.worldTransform, this.worldTransform, scratch.scaleMatrix);
        mat4.multiply(this.worldTransform, this.worldTransform, scratch.align);
        mat4.multiply(this.worldTransform, this.worldTransform, scratch.translationMatrix);
      } else {
        mat4.fromScaling(scratch.scaleMatrix, finalScale);
        // Carbon align * world then scale * world -> world * align * scale.
        mat4.multiply(this.worldTransform, this.worldTransform, scratch.align);
        mat4.multiply(this.worldTransform, this.worldTransform, scratch.scaleMatrix);
      }
    }

    /** Applies Carbon's look-at-camera basis, including its degenerate zero axes. */
    #ApplyLookAt(finalScale, parentTransform, renderContext) {
      const scratch = _Tr2Transform.#scratch;
      vec3.set(scratch.position, this.worldTransform[12], this.worldTransform[13], this.worldTransform[14]);
      carbonLookAt(scratch.lookAt, renderContext.GetViewPosition(), scratch.position, _Tr2Transform.#worldUp, scratch.lookForward, scratch.lookRight, scratch.lookUp);
      mat4.transpose(scratch.lookAt, scratch.lookAt);
      vec3.set(scratch.scale, finalScale[0] * axisLength(parentTransform, 0), finalScale[1] * axisLength(parentTransform, 4), finalScale[2] * axisLength(parentTransform, 8));
      setViewBasis(this.worldTransform, scratch.lookAt, scratch.scale);
    }

    /** m_modifier (Tr2TransformModifier - enum Tr2TransformModifier) [READWRITE, PERSIST, ENUM] */
    modifier = (_initProto(this), _init_modifier(this, Tr2TransformModifier.TR2TM_NONE));

    /** m_localTransform (Matrix) [READ] */
    localTransform = (_init_extra_modifier(this), _init_localTransform(this, mat4.create()));

    /** m_worldTransform (Matrix) [READ] */
    worldTransform = (_init_extra_localTransform(this), _init_worldTransform(this, mat4.create()));

    /** Protected Carbon motion-history state; not part of the Blue schema. */
    lastWorldTransform = (_init_extra_worldTransform(this), mat4.create());

    /** m_name (std::string) [READWRITE, PERSIST] */
    name = _init_name(this, "");

    /** m_scaling (Vector3) [READWRITE, PERSIST] */
    scaling = (_init_extra_name(this), _init_scaling(this, vec3.fromValues(1, 1, 1)));

    /** m_rotation (Quaternion) [READWRITE, PERSIST] */
    rotation = (_init_extra_scaling(this), _init_rotation(this, quat.create()));

    /** m_translation (Vector3) [READWRITE, PERSIST] */
    translation = (_init_extra_rotation(this), _init_translation(this, vec3.create()));

    /** m_distanceBasedScaleArg1 (float) [READWRITE, PERSIST] */
    distanceBasedScaleArg1 = (_init_extra_translation(this), _init_distanceBasedScaleArg(this, 0.2));

    /** m_distanceBasedScaleArg2 (float) [READWRITE, PERSIST] */
    distanceBasedScaleArg2 = (_init_extra_distanceBasedScaleArg(this), _init_distanceBasedScaleArg2(this, 0.63));

    /** m_mesh (Tr2MeshBasePtr) [READWRITE, PERSIST] */
    mesh = (_init_extra_distanceBasedScaleArg2(this), _init_mesh(this, null));

    /** m_curveSets (PTriCurveSetVector) [READ, PERSIST] */
    curveSets = (_init_extra_mesh(this), _init_curveSets(this, []));

    /** m_useDistanceBasedScale (bool) [READWRITE, PERSIST] */
    useDistanceBasedScale = (_init_extra_curveSets(this), _init_useDistanceBasedScale(this, false));

    /** m_display (bool) [READWRITE, PERSIST] */
    display = (_init_extra_useDistanceBasedScale(this), _init_display(this, true));

    /** m_update (bool) [READWRITE, PERSIST] */
    update = (_init_extra_display(this), _init_update(this, true));

    /** m_sortValueMultiplier (float) [READWRITE, PERSIST] */
    sortValueMultiplier = (_init_extra_update(this), _init_sortValueMultiplier(this, 1));
  }];
  Tr2TransformModifier = Tr2TransformModifier;
  #identity = mat4.create();
  #worldUp = Object.freeze([0, 1, 0]);
  #scratch = {
    align: mat4.create(),
    lookAt: mat4.create(),
    rotationMatrix: mat4.create(),
    scaleMatrix: mat4.create(),
    translationMatrix: mat4.create(),
    axis: vec3.create(),
    baseRight: vec3.create(),
    direction: vec3.create(),
    finalScale: vec3.create(),
    forward: vec3.create(),
    lookForward: vec3.create(),
    lookRight: vec3.create(),
    lookUp: vec3.create(),
    normalizedDirection: vec3.create(),
    position: vec3.create(),
    right: vec3.create(),
    scale: vec3.create(),
    translation: vec3.create(),
    up: vec3.create()
  };
  constructor() {
    super(_Tr2Transform), _initClass();
  }
}();

export { _Tr2Transform as Tr2Transform };
//# sourceMappingURL=Tr2Transform.js.map
