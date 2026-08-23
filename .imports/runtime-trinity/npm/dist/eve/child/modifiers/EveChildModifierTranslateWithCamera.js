import { applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';

let _initProto, _initClass, _init_attachedToCamera, _init_extra_attachedToCamera;

/**
 * Transform modifier that moves a child with the camera, either pinning its
 * translation to the view position or offsetting it by the view position.
 */
let _EveChildModifierTran;
class EveChildModifierTranslateWithCamera extends CjsModel {
  static {
    ({
      e: [_init_attachedToCamera, _init_extra_attachedToCamera, _initProto],
      c: [_EveChildModifierTran, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveChildModifierTranslateWithCamera",
      family: "eve/child/modifiers"
    })], [[[io, io.persist, type, type.boolean], 16, "attachedToCamera"], [[carbon, carbon.method, void 0, carbon.contextual(["camera"]), impl, impl.implemented], 18, "ApplyTransform"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_attachedToCamera(this);
  }
  attachedToCamera = (_initProto(this), _init_attachedToCamera(this, false));

  /**
   * Moves the child with the camera: attached mode replaces the translation
   * with the view position, otherwise the view position is added (Carbon
   * EveChildModifierTranslateWithCamera.cpp).
   *
   * @param {Object} context - frame context; reads context.renderContext
   * @param {Float32Array} transform - source (read only)
   * @param {Number} [_boneCount] - Carbon signature parity, unused
   * @param {Float32Array} [_bones] - Carbon signature parity, unused
   * @param {Float32Array} out - caller-owned; receives the result
   * @returns {Float32Array} out
   */
  ApplyTransform(context, transform, _boneCount = 0, _bones = null, out) {
    mat4.copy(out, transform);
    const renderContext = context?.renderContext;
    if (!renderContext) {
      return out;
    }
    const camPos = renderContext.GetViewPosition();
    if (this.attachedToCamera) {
      out[12] = camPos[0];
      out[13] = camPos[1];
      out[14] = camPos[2];
    } else {
      out[12] += camPos[0];
      out[13] += camPos[1];
      out[14] += camPos[2];
    }
    return out;
  }
  static {
    _initClass();
  }
}

export { _EveChildModifierTran as EveChildModifierTranslateWithCamera };
//# sourceMappingURL=EveChildModifierTranslateWithCamera.js.map
