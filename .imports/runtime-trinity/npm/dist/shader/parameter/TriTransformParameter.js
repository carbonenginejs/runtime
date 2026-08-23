import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { quat } from '@carbonenginejs/runtime-utils/quat';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { CjsParameter } from './CjsParameter.js';
import { TriTransformBase } from '@carbonenginejs/runtime-utils/graphics';

let _initProto, _initClass, _init_transformBase, _init_extra_transformBase, _init_rotationCenter, _init_extra_rotationCenter, _init_name, _init_extra_name, _init_rotation, _init_extra_rotation, _init_scaling, _init_extra_scaling, _init_translation, _init_extra_translation, _init_worldTransform, _init_extra_worldTransform;

/** TriTransformParameter (shader) - generated from schema shapeHash de073c4a.... */
let _TriTransformParamete;
new class extends _identity {
  static [class TriTransformParameter extends CjsParameter {
    static {
      ({
        e: [_init_transformBase, _init_extra_transformBase, _init_rotationCenter, _init_extra_rotationCenter, _init_name, _init_extra_name, _init_rotation, _init_extra_rotation, _init_scaling, _init_extra_scaling, _init_translation, _init_extra_translation, _init_worldTransform, _init_extra_worldTransform, _initProto],
        c: [_TriTransformParamete, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "TriTransformParameter",
        family: "shader"
      })], [[[io, io.persist, type, type.int32, void 0, type.enum("TRITRANSFORMBASE")], 16, "transformBase"], [[io, io.persist, type, type.vec3], 16, "rotationCenter"], [[io, io.persist, type, type.string], 16, "name"], [[io, io.persist, type, type.quat], 16, "rotation"], [[io, io.persist, type, type.vec3], 16, "scaling"], [[io, io.persist, type, type.vec3], 16, "translation"], [[io, io.persist, type, type.mat4], 16, "worldTransform"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetParameterName"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetHashValue"], [[carbon, carbon.method, impl, impl.adapted], 18, "CopyValueToEffect"]], 0, void 0, CjsParameter));
    }
    constructor(...args) {
      super(...args);
      _init_extra_worldTransform(this);
    }
    /** m_transformBase (TRITRANSFORMBASE - enum TRITRANSFORMBASE) [READWRITE, PERSIST, ENUM] */
    transformBase = (_initProto(this), _init_transformBase(this, 0));

    /** m_rotationCenter (Vector3) [READWRITE, PERSIST] */
    rotationCenter = (_init_extra_transformBase(this), _init_rotationCenter(this, vec3.create()));

    /** m_name (BlueSharedString) [READWRITE, PERSIST] */
    name = (_init_extra_rotationCenter(this), _init_name(this, ""));

    /** m_rotation (Quaternion) [READWRITE, PERSIST] */
    rotation = (_init_extra_name(this), _init_rotation(this, quat.create()));

    /** m_scaling (Vector3) [READWRITE, PERSIST] */
    scaling = (_init_extra_rotation(this), _init_scaling(this, vec3.fromValues(1, 1, 1)));

    /** m_translation (Vector3) [READWRITE, PERSIST] */
    translation = (_init_extra_scaling(this), _init_translation(this, vec3.create()));

    /** m_worldTransform (Matrix) [READWRITE, PERSIST] */
    worldTransform = (_init_extra_translation(this), _init_worldTransform(this, mat4.create()));

    /** The shader constant name the composed transform matrix is uploaded to. */
    GetParameterName() {
      return this.name;
    }

    /**
     * Content hash: transform base + translation/scaling/rotation bytes, then
     * name (Carbon hashes the contiguous transform-state struct region).
     */
    GetHashValue(startingHash = CjsParameter.FNV1_INITIAL) {
      startingHash = CjsParameter.hashFnv1Floats([this.transformBase], startingHash);
      startingHash = CjsParameter.hashFnv1Floats(this.translation, startingHash);
      startingHash = CjsParameter.hashFnv1Floats(this.scaling, startingHash);
      startingHash = CjsParameter.hashFnv1Floats(this.rotation, startingHash);
      return CjsParameter.hashFnv1String(this.name, startingHash);
    }

    /** Carbon TriTransformParameter::CopyValueToEffect
     * (TriTransformParameter.cpp:30-66) builds the 6-arg TransformationMatrix
     * (math Matrix.cpp:66-143, scalingCenter NULL): row-vector
     * S * T(-rotationCenter) * R * T(rotationCenter + translation) - the scale
     * is about the TRUE ORIGIN while only the rotation pivots on
     * m_rotationCenter (translation bytes: t + rc - R*rc, rc UNSCALED). NOT
     * gl-matrix's fromRotationTranslationScaleOrigin, which scales about the
     * origin point too (t + o - R*(S*o)) - the two differ whenever
     * scaling != 1 and rotationCenter != 0. gl column order:
     * T(rc + t) * R * T(-rc) * S. NOTE: Carbon's TRITB_OBJECT branch
     * (cpp:48-66) additionally multiplies in the object world matrix - an
     * unported composition (the JS treats every non-FIXED base as the zeroed
     * inverse view only); when ported it must swap per the convention. */
    CopyValueToEffect(_inputType, dest, size = 64, context = null) {
      const transform = mat4.create();
      const rotationCenter = this.rotationCenter;
      // gl column build of T(rc + t) * R * T(-rc) * S, right-to-left:
      mat4.fromQuat(transform, this.rotation);
      mat4.translate(transform, transform, [-rotationCenter[0], -rotationCenter[1], -rotationCenter[2]]);
      mat4.scale(transform, transform, this.scaling);
      transform[12] += rotationCenter[0] + this.translation[0];
      transform[13] += rotationCenter[1] + this.translation[1];
      transform[14] += rotationCenter[2] + this.translation[2];
      const base = context?.inverseViewTransform ?? context?.GetInverseViewTransform?.() ?? null;
      if (base && this.transformBase !== 0) {
        const baseTransform = mat4.clone(base);
        baseTransform[12] = 0;
        baseTransform[13] = 0;
        baseTransform[14] = 0;
        // Carbon (row-vector): texTransform *= original - the base transform
        // applies first, the authored SRT last.
        mat4.multiply(transform, transform, baseTransform);
      }
      const out = mat4.create();
      mat4.transpose(out, transform);
      const count = Math.min(16, Math.floor(Number(size) / 4) || 16, dest?.length ?? 16);
      for (let i = 0; i < count; i++) {
        dest[i] = out[i];
      }
    }
  }];
  TRITRANSFORMBASE = TriTransformBase;
  constructor() {
    super(_TriTransformParamete), _initClass();
  }
}();

export { _TriTransformParamete as TriTransformParameter };
//# sourceMappingURL=TriTransformParameter.js.map
