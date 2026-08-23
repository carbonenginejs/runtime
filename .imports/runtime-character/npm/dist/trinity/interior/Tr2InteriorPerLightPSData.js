import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { type, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';
import { Tr2InteriorPerObjectLightData as _Tr2InteriorPerObject } from './Tr2InteriorPerObjectLightData.js';

let _initProto, _initClass, _init_lightData, _init_extra_lightData, _init_mirrorToWorldMatrix, _init_extra_mirrorToWorldMatrix, _init_shadowMatrix, _init_extra_shadowMatrix, _init_shadowRect, _init_extra_shadowRect, _init_shadowInfluence, _init_extra_shadowInfluence, _init_boundingBox, _init_extra_boundingBox, _init_additionalParameters, _init_extra_additionalParameters;

/**
 * Per-light interior pixel-stage data holding light, mirror, shadow, bounds,
 * and auxiliary parameters.
 */
let _Tr2InteriorPerLightP;
class Tr2InteriorPerLightPSData extends CjsModel {
  static {
    ({
      e: [_init_lightData, _init_extra_lightData, _init_mirrorToWorldMatrix, _init_extra_mirrorToWorldMatrix, _init_shadowMatrix, _init_extra_shadowMatrix, _init_shadowRect, _init_extra_shadowRect, _init_shadowInfluence, _init_extra_shadowInfluence, _init_boundingBox, _init_extra_boundingBox, _init_additionalParameters, _init_extra_additionalParameters, _initProto],
      c: [_Tr2InteriorPerLightP, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2InteriorPerLightPSData",
      family: "interior"
    })], [[type.struct("Tr2InteriorPerObjectLightData"), 0, "lightData"], [[type, type.mat4], 16, "mirrorToWorldMatrix"], [type.array("mat4"), 0, "shadowMatrix"], [type.array("vec4"), 0, "shadowRect"], [type.array("vec4"), 0, "shadowInfluence"], [[type, type.mat4], 16, "boundingBox"], [[type, type.vec4], 16, "additionalParameters"], [[impl, impl.custom, void 0, impl.reason("Preserves Carbon fixed-array cardinalities when importing plain JS values.")], 18, "SetValues"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_additionalParameters(this);
  }
  /** lightData (Tr2InteriorPerObjectLightData) */
  lightData = (_initProto(this), _init_lightData(this, new _Tr2InteriorPerObject()));

  /** mirrorToWorldMatrix (Matrix) */
  mirrorToWorldMatrix = (_init_extra_lightData(this), _init_mirrorToWorldMatrix(this, mat4.create()));

  /** shadowMatrix (Matrix[6]) */
  shadowMatrix = (_init_extra_mirrorToWorldMatrix(this), _init_shadowMatrix(this, Array.from({
    length: 6
  }, () => mat4.create())));

  /** shadowRect (Vector4[6]) */
  shadowRect = (_init_extra_shadowMatrix(this), _init_shadowRect(this, Array.from({
    length: 6
  }, () => vec4.create())));

  /** shadowInfluence (Vector4[6]) */
  shadowInfluence = (_init_extra_shadowRect(this), _init_shadowInfluence(this, Array.from({
    length: 6
  }, () => vec4.create())));

  /** boundingBox (Matrix) */
  boundingBox = (_init_extra_shadowInfluence(this), _init_boundingBox(this, mat4.create()));

  /** additionalParameters (Vector4) */
  additionalParameters = (_init_extra_boundingBox(this), _init_additionalParameters(this, vec4.create()));

  /**
   * Imports values while normalizing the three six-element shadow arrays to
   * Carbon cardinality.
   */
  SetValues(values = {}, options = {}) {
    const normalized = {
      ...values
    };
    if (Object.hasOwn(values, "shadowMatrix")) {
      normalized.shadowMatrix = FixedMat4Array(values.shadowMatrix, 6);
    }
    if (Object.hasOwn(values, "shadowRect")) {
      normalized.shadowRect = FixedVec4Array(values.shadowRect, 6);
    }
    if (Object.hasOwn(values, "shadowInfluence")) {
      normalized.shadowInfluence = FixedVec4Array(values.shadowInfluence, 6);
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
function FixedVec4Array(values, count) {
  return Array.from({
    length: count
  }, (_, index) => {
    const value = values?.[index];
    return vec4.fromValues(Number(value?.[0] ?? 0), Number(value?.[1] ?? 0), Number(value?.[2] ?? 0), Number(value?.[3] ?? 0));
  });
}

export { _Tr2InteriorPerLightP as Tr2InteriorPerLightPSData };
//# sourceMappingURL=Tr2InteriorPerLightPSData.js.map
