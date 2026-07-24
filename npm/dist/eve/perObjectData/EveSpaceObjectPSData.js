import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { type } from '@carbonenginejs/runtime-utils/schema';

let _initClass, _init_worldTransform, _init_extra_worldTransform, _init_worldTransformLast, _init_extra_worldTransformLast, _init_invWorldTransform, _init_extra_invWorldTransform, _init_shipData, _init_extra_shipData, _init_clipSphereCenter, _init_extra_clipSphereCenter, _init_clipRadiusSq, _init_extra_clipRadiusSq, _init_clipRadius2Sq, _init_extra_clipRadius2Sq, _init_impactDataOffset, _init_extra_impactDataOffset, _init_clipSphereFactor, _init_extra_clipSphereFactor, _init_clipSphereFactor2, _init_extra_clipSphereFactor2, _init_shLightingCoefficients, _init_extra_shLightingCoefficients, _init_customMaskMaterialIDs, _init_extra_customMaskMaterialIDs, _init_customMaskTargets, _init_extra_customMaskTargets, _init_customMaskClamps, _init_extra_customMaskClamps, _init_screenSize, _init_extra_screenSize, _init_customData, _init_extra_customData;
let _EveSpaceObjectPSData;
new class extends _identity {
  static [class EveSpaceObjectPSData extends CjsModel {
    static {
      ({
        e: [_init_worldTransform, _init_extra_worldTransform, _init_worldTransformLast, _init_extra_worldTransformLast, _init_invWorldTransform, _init_extra_invWorldTransform, _init_shipData, _init_extra_shipData, _init_clipSphereCenter, _init_extra_clipSphereCenter, _init_clipRadiusSq, _init_extra_clipRadiusSq, _init_clipRadius2Sq, _init_extra_clipRadius2Sq, _init_impactDataOffset, _init_extra_impactDataOffset, _init_clipSphereFactor, _init_extra_clipSphereFactor, _init_clipSphereFactor2, _init_extra_clipSphereFactor2, _init_shLightingCoefficients, _init_extra_shLightingCoefficients, _init_customMaskMaterialIDs, _init_extra_customMaskMaterialIDs, _init_customMaskTargets, _init_extra_customMaskTargets, _init_customMaskClamps, _init_extra_customMaskClamps, _init_screenSize, _init_extra_screenSize, _init_customData, _init_extra_customData],
        c: [_EveSpaceObjectPSData, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "EveSpaceObjectPSData",
        family: "eve/spaceObject"
      })], [[[type, type.mat4], 16, "worldTransform"], [[type, type.mat4], 16, "worldTransformLast"], [[type, type.mat4], 16, "invWorldTransform"], [[type, type.vec4], 16, "shipData"], [[type, type.vec3], 16, "clipSphereCenter"], [[type, type.float32], 16, "clipRadiusSq"], [[type, type.float32], 16, "clipRadius2Sq"], [[type, type.float32], 16, "impactDataOffset"], [[type, type.float32], 16, "clipSphereFactor2"], [[type, type.float32], 16, "clipSphereFactor"], [type.array("vec4"), 0, "shLightingCoefficients"], [type.array("vec4"), 0, "customMaskMaterialIDs"], [type.array("vec4"), 0, "customMaskTargets"], [[type, type.vec4], 16, "customMaskClamps"], [[type, type.vec4], 16, "screenSize"], [[type, type.vec4], 16, "customData"]], 0, void 0, CjsModel));
    }
    constructor(...args) {
      super(...args);
      _init_extra_customData(this);
    }
    worldTransform = _init_worldTransform(this, mat4.create());
    worldTransformLast = (_init_extra_worldTransform(this), _init_worldTransformLast(this, mat4.create()));
    invWorldTransform = (_init_extra_worldTransformLast(this), _init_invWorldTransform(this, mat4.create()));
    shipData = (_init_extra_invWorldTransform(this), _init_shipData(this, vec4.create()));
    clipSphereCenter = (_init_extra_shipData(this), _init_clipSphereCenter(this, vec3.create()));
    clipRadiusSq = (_init_extra_clipSphereCenter(this), _init_clipRadiusSq(this, 0));
    clipRadius2Sq = (_init_extra_clipRadiusSq(this), _init_clipRadius2Sq(this, 0));
    impactDataOffset = (_init_extra_clipRadius2Sq(this), _init_impactDataOffset(this, 0));
    clipSphereFactor2 = (_init_extra_impactDataOffset(this), _init_clipSphereFactor(this, 0));
    clipSphereFactor = (_init_extra_clipSphereFactor(this), _init_clipSphereFactor2(this, 0));
    shLightingCoefficients = (_init_extra_clipSphereFactor2(this), _init_shLightingCoefficients(this, Array.from({
      length: _EveSpaceObjectPSData.SH_COEFFICIENT_COUNT
    }, () => vec4.create())));
    customMaskMaterialIDs = (_init_extra_shLightingCoefficients(this), _init_customMaskMaterialIDs(this, Array.from({
      length: _EveSpaceObjectPSData.CUSTOM_MASK_COUNT
    }, () => vec4.create())));
    customMaskTargets = (_init_extra_customMaskMaterialIDs(this), _init_customMaskTargets(this, Array.from({
      length: _EveSpaceObjectPSData.CUSTOM_MASK_COUNT
    }, () => vec4.create())));
    customMaskClamps = (_init_extra_customMaskTargets(this), _init_customMaskClamps(this, vec4.create()));
    screenSize = (_init_extra_customMaskClamps(this), _init_screenSize(this, vec4.create()));
    customData = (_init_extra_screenSize(this), _init_customData(this, vec4.create()));
    SetValues(values = {}, options = {}) {
      const normalized = {
        ...values
      };
      if (Object.hasOwn(values, "shLightingCoefficients")) normalized.shLightingCoefficients = _EveSpaceObjectPSData.#vec4Array(values.shLightingCoefficients, _EveSpaceObjectPSData.SH_COEFFICIENT_COUNT);
      if (Object.hasOwn(values, "customMaskMaterialIDs")) normalized.customMaskMaterialIDs = _EveSpaceObjectPSData.#vec4Array(values.customMaskMaterialIDs, _EveSpaceObjectPSData.CUSTOM_MASK_COUNT);
      if (Object.hasOwn(values, "customMaskTargets")) normalized.customMaskTargets = _EveSpaceObjectPSData.#vec4Array(values.customMaskTargets, _EveSpaceObjectPSData.CUSTOM_MASK_COUNT);
      return super.SetValues(normalized, options);
    }
  }];
  CUSTOM_MASK_COUNT = 2;
  SH_COEFFICIENT_COUNT = 7;
  #vec4Array(values, count) {
    return Array.from({
      length: count
    }, (_, index) => {
      const value = values?.[index];
      return vec4.fromValues(Number(value?.[0] ?? 0), Number(value?.[1] ?? 0), Number(value?.[2] ?? 0), Number(value?.[3] ?? 0));
    });
  }
  constructor() {
    super(_EveSpaceObjectPSData), _initClass();
  }
}();

export { _EveSpaceObjectPSData as EveSpaceObjectPSData };
//# sourceMappingURL=EveSpaceObjectPSData.js.map
