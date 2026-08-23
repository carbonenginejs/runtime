import { applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { carbon, impl, type } from '@carbonenginejs/runtime-utils/schema';
import { Billboard2D } from './EveChildModifierTransformCommon.js';

let _initProto, _initClass;

/**
 * Transform modifier that aligns a child to the screen plane, leaving it facing
 * the viewer whatever the camera does.
 */
let _EveChildModifierBill;
class EveChildModifierBillboard2D extends CjsModel {
  static {
    ({
      e: [_initProto],
      c: [_EveChildModifierBill, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveChildModifierBillboard2D",
      family: "eve/child/modifiers"
    })], [[[carbon, carbon.method, void 0, carbon.contextual(["camera"]), impl, impl.implemented], 18, "ApplyTransform"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _initProto(this);
  }
  /**
   * Screen-aligned billboard. Reproduces
   * EveChildModifierBillboard2D::ApplyTransform (Carbon), which forwards to the
   * shared Billboard2D helper.
   * @param {Object} context - frame context; reads context.renderContext
   * @param {Float32Array} transform - source (read only)
   * @param {Number} [boneCount] - Carbon signature parity, unused
   * @param {Float32Array} [bones] - Carbon signature parity, unused
   * @param {Float32Array} out - caller-owned; receives the result
   * @returns {Float32Array} out
   */
  ApplyTransform(context, transform, boneCount, bones, out) {
    if (!context?.renderContext) {
      return mat4.copy(out, transform);
    }
    return Billboard2D(context, transform, out);
  }
  static {
    _initClass();
  }
}

export { _EveChildModifierBill as EveChildModifierBillboard2D };
//# sourceMappingURL=EveChildModifierBillboard2D.js.map
