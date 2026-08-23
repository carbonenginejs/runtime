import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { carbon, impl, type } from '@carbonenginejs/runtime-utils/schema';
import { DistanceBase } from './EveChildModifierTransformCommon.js';

let _initProto, _initClass;

/**
 * Transform modifier that scales a child to nothing as its local Z axis turns to
 * face the camera - the inverse of a halo, and despite the name not a subclass
 * of one.
 */
let _EveChildModifierHalo;
new class extends _identity {
  static [class EveChildModifierHaloInverted extends CjsModel {
    static {
      ({
        e: [_initProto],
        c: [_EveChildModifierHalo, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "EveChildModifierHaloInverted",
        family: "eve/child/modifiers"
      })], [[[carbon, carbon.method, void 0, carbon.contextual(["camera"]), impl, impl.implemented], 18, "ApplyTransform"]], 0, void 0, CjsModel));
    }
    constructor(...args) {
      super(...args);
      _initProto(this);
    }
    /**
     * Scales the child down to zero as its local Z axis turns to face the camera -
     * the opposite of a standard halo. Reproduces
     * EveChildModifierHaloInverted::ApplyTransform (Carbon): scale =
     * clamp(dot(normalize(d), -transformZ), 0), then
     * return scalingTransform * alignMat * transform. Despite the class name it is
     * NOT a subclass of Halo - it is its own modifier over DistanceBase.
     * @param {Object} context - frame context; reads context.renderContext
     * @param {Float32Array} transform - source (read only)
     * @param {Number} [boneCount] - Carbon signature parity, unused
     * @param {Float32Array} [bones] - Carbon signature parity, unused
     * @param {Float32Array} out - caller-owned; receives the result
     * @returns {Float32Array} out
     */
    ApplyTransform(context, transform, boneCount, bones, out) {
      const renderContext = context?.renderContext;
      if (!renderContext) {
        return mat4.copy(out, transform);
      }
      const {
        alignMat,
        d,
        forward,
        scaleVec,
        scalingTransform
      } = this.constructor.scratch;

      // distCenter is computed by DistanceBase and left unused here, as in Carbon.
      DistanceBase(context, transform, alignMat, d);
      vec3.set(forward, transform[8], transform[9], transform[10]);
      vec3.normalize(forward, forward);
      vec3.normalize(d, d);

      // Carbon: scale = Dot(Normalize(d), -forward) = -Dot(Normalize(d), forward).
      let scale = -vec3.dot(d, forward);
      if (scale < 0) {
        scale = 0;
      }
      vec3.set(scaleVec, scale, scale, scale);
      mat4.fromScaling(scalingTransform, scaleVec);

      // Carbon (row-vector): scalingTransform * alignMat * transform - scaling
      // applied first, transform last. In gl-matrix that is
      // out = transform . align . scaling.
      mat4.multiply(out, transform, alignMat);
      mat4.multiply(out, out, scalingTransform);
      return out;
    }
  }];
  scratch = {
    alignMat: mat4.create(),
    d: vec3.create(),
    forward: vec3.create(),
    scaleVec: vec3.create(),
    scalingTransform: mat4.create()
  };
  constructor() {
    super(_EveChildModifierHalo), _initClass();
  }
}();

export { _EveChildModifierHalo as EveChildModifierHaloInverted };
//# sourceMappingURL=EveChildModifierHaloInverted.js.map
