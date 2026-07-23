import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { type, impl } from '@carbonenginejs/core-types/schema';
import { CjsModel } from '@carbonenginejs/core-types/model';
import { mat4 } from '@carbonenginejs/core-math/mat4';
import { vec4 } from '@carbonenginejs/core-math/vec4';
import { Tr2InteriorPerObjectLightData as _Tr2InteriorPerObject$1 } from './Tr2InteriorPerObjectLightData.js';

let _initProto, _initClass, _init_lightCount, _init_extra_lightCount, _init_padding, _init_extra_padding, _init_pointLights, _init_extra_pointLights, _init_shadowCaster, _init_extra_shadowCaster, _init_shadowCaster2, _init_extra_shadowCaster2, _init_spotLights, _init_extra_spotLights;

/** Tr2InteriorPerObjectPSData (interior) - generated from schema shapeHash 774698be.... */
let _Tr2InteriorPerObject;
class Tr2InteriorPerObjectPSData extends CjsModel {
  static {
    ({
      e: [_init_lightCount, _init_extra_lightCount, _init_padding, _init_extra_padding, _init_pointLights, _init_extra_pointLights, _init_shadowCaster, _init_extra_shadowCaster, _init_shadowCaster2, _init_extra_shadowCaster2, _init_spotLights, _init_extra_spotLights, _initProto],
      c: [_Tr2InteriorPerObject, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2InteriorPerObjectPSData",
      family: "interior"
    })], [[[type, type.int32], 16, "lightCount"], [type.array("int32"), 0, "padding"], [type.array({
      kind: "struct",
      className: "Tr2InteriorPerObjectLightData"
    }), 0, "pointLights"], [[type, type.vec4], 16, "shadowCaster0"], [[type, type.vec4], 16, "shadowCaster1"], [type.array("mat4"), 0, "spotLights"], [[impl, impl.custom, void 0, impl.reason("Preserves Carbon fixed-array cardinalities when importing plain JS values.")], 18, "SetValues"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_spotLights(this);
  }
  /** lightCount (int32_t) */
  lightCount = (_initProto(this), _init_lightCount(this, 0));

  /** padding (int32_t[3]) */
  padding = (_init_extra_lightCount(this), _init_padding(this, [0, 0, 0]));

  /** pointLights (Tr2InteriorPerObjectLightData[10]) */
  pointLights = (_init_extra_padding(this), _init_pointLights(this, Array.from({
    length: 10
  }, () => new _Tr2InteriorPerObject$1())));

  /** shadowCaster0 (Vector4) */
  shadowCaster0 = (_init_extra_pointLights(this), _init_shadowCaster(this, vec4.create()));

  /** shadowCaster1 (Vector4) */
  shadowCaster1 = (_init_extra_shadowCaster(this), _init_shadowCaster2(this, vec4.create()));

  /** spotLights (Matrix[4]) */
  spotLights = (_init_extra_shadowCaster2(this), _init_spotLights(this, Array.from({
    length: 4
  }, () => mat4.create())));
  SetValues(values = {}, options = {}) {
    const normalized = {
      ...values
    };
    if (Object.hasOwn(values, "padding")) {
      normalized.padding = Array.from({
        length: 3
      }, (_, index) => Number(values.padding?.[index] ?? 0) | 0);
    }
    if (Object.hasOwn(values, "pointLights")) {
      normalized.pointLights = Array.from({
        length: 10
      }, (_, index) => values.pointLights?.[index] ?? new _Tr2InteriorPerObject$1());
    }
    if (Object.hasOwn(values, "spotLights")) {
      normalized.spotLights = FixedMat4Array(values.spotLights, 4);
    }
    return super.SetValues(normalized, options);
  }
  static {
    _initClass();
  }
}
function FixedMat4Array(values, count) {
  return Array.from({
    length: count
  }, (_, index) => {
    const value = values?.[index];
    return value?.length === 16 ? mat4.copy(mat4.create(), value) : mat4.create();
  });
}

export { _Tr2InteriorPerObject as Tr2InteriorPerObjectPSData };
//# sourceMappingURL=Tr2InteriorPerObjectPSData.js.map
