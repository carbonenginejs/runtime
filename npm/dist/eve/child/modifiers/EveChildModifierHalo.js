import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { carbon, impl, type } from '@carbonenginejs/runtime-utils/schema';

let _initProto, _initClass;

/**
 * Transform modifier that screen-aligns a child and shrinks it by the squared
 * facing of its local Z axis toward the camera, so a halo fades out edge-on.
 */
let _EveChildModifierHalo;
new class extends _identity {
  static [class EveChildModifierHalo extends CjsModel {
    static {
      ({
        e: [_initProto],
        c: [_EveChildModifierHalo, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "EveChildModifierHalo",
        family: "eve/child/modifiers"
      })], [[[carbon, carbon.method, void 0, carbon.contextual(["camera"]), impl, impl.implemented], 18, "ApplyTransform"]], 0, void 0, CjsModel));
    }
    constructor(...args) {
      super(...args);
      _initProto(this);
    }
    /**
     * Screen-aligned halo that fades out as its local Z axis turns away from the
     * camera. Reproduces EveChildModifierHalo::ApplyTransform (Carbon): it inlines
     * Billboard2D's inverse-view row copy (it does NOT call the shared helper),
     * then scales each parent axis by clamp(dot(normalize(camPos - myPos),
     * normalize(transformZ)), 0) SQUARED - the facing falloff. Reads
     * GetViewPosition + GetInverseViewTransform.
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
        d,
        childZ
      } = this.constructor.scratch;
      const camPos = renderContext.GetViewPosition();
      d[0] = camPos[0] - transform[12];
      d[1] = camPos[1] - transform[13];
      d[2] = camPos[2] - transform[14];
      vec3.normalize(d, d);
      vec3.set(childZ, transform[8], transform[9], transform[10]);
      vec3.normalize(childZ, childZ);
      let scale = vec3.dot(d, childZ);
      if (scale < 0) {
        scale = 0;
      }
      const facing = scale * scale;
      const scaleX = vec3.length(transform.subarray(0, 3)) * facing;
      const scaleY = vec3.length(transform.subarray(4, 7)) * facing;
      const scaleZ = vec3.length(transform.subarray(8, 11)) * facing;
      const invView = renderContext.GetInverseViewTransform();
      mat4.copy(out, transform);
      out[0] = invView[0] * scaleX;
      out[1] = invView[1] * scaleX;
      out[2] = invView[2] * scaleX;
      out[4] = invView[4] * scaleY;
      out[5] = invView[5] * scaleY;
      out[6] = invView[6] * scaleY;
      out[8] = invView[8] * scaleZ;
      out[9] = invView[9] * scaleZ;
      out[10] = invView[10] * scaleZ;
      return out;
    }
  }];
  scratch = {
    d: vec3.create(),
    childZ: vec3.create()
  };
  constructor() {
    super(_EveChildModifierHalo), _initClass();
  }
}();

export { _EveChildModifierHalo as EveChildModifierHalo };
//# sourceMappingURL=EveChildModifierHalo.js.map
