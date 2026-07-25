import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { type } from '@carbonenginejs/runtime-utils/schema';

let _initClass, _init_worldMatrix, _init_extra_worldMatrix, _init_pinPosition, _init_extra_pinPosition, _init_pinRotation, _init_extra_pinRotation, _init_pinColor, _init_extra_pinColor, _init_pinThreshold, _init_extra_pinThreshold, _init_pinRadiusPrecalc, _init_extra_pinRadiusPrecalc, _init_pinUV, _init_extra_pinUV;
let _EveChildSpherePinPer;
class EveChildSpherePinPerObjectData extends CjsModel {
  static {
    ({
      e: [_init_worldMatrix, _init_extra_worldMatrix, _init_pinPosition, _init_extra_pinPosition, _init_pinRotation, _init_extra_pinRotation, _init_pinColor, _init_extra_pinColor, _init_pinThreshold, _init_extra_pinThreshold, _init_pinRadiusPrecalc, _init_extra_pinRadiusPrecalc, _init_pinUV, _init_extra_pinUV],
      c: [_EveChildSpherePinPer, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveChildSpherePinPerObjectData",
      family: "eve/perObjectData"
    })], [[[type, type.mat4], 16, "worldMatrix"], [[type, type.vec4], 16, "pinPosition"], [[type, type.vec4], 16, "pinRotation"], [[type, type.color], 16, "pinColor"], [[type, type.vec4], 16, "pinThreshold"], [[type, type.vec4], 16, "pinRadiusPrecalc"], [[type, type.vec4], 16, "pinUV"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_pinUV(this);
  }
  worldMatrix = _init_worldMatrix(this, mat4.create());
  pinPosition = (_init_extra_worldMatrix(this), _init_pinPosition(this, vec4.create()));
  pinRotation = (_init_extra_pinPosition(this), _init_pinRotation(this, vec4.create()));
  pinColor = (_init_extra_pinRotation(this), _init_pinColor(this, vec4.create()));
  pinThreshold = (_init_extra_pinColor(this), _init_pinThreshold(this, vec4.create()));
  pinRadiusPrecalc = (_init_extra_pinThreshold(this), _init_pinRadiusPrecalc(this, vec4.create()));
  pinUV = (_init_extra_pinRadiusPrecalc(this), _init_pinUV(this, vec4.create()));
  static {
    _initClass();
  }
}

export { _EveChildSpherePinPer as EveChildSpherePinPerObjectData };
//# sourceMappingURL=EveChildSpherePinPerObjectData.js.map
