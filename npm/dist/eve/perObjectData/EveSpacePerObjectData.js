import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { type } from '@carbonenginejs/runtime-utils/schema';

let _initClass, _init_worldTransform, _init_extra_worldTransform, _init_worldTransformLast, _init_extra_worldTransformLast, _init_invWorldTransform, _init_extra_invWorldTransform, _init_shipData, _init_extra_shipData, _init_clipSphereCenter, _init_extra_clipSphereCenter, _init_ellpsoidRadii, _init_extra_ellpsoidRadii, _init_ellpsoidCenter, _init_extra_ellpsoidCenter, _init_boneOffsets, _init_extra_boneOffsets, _init_customData, _init_extra_customData, _init_customMaskMatrix, _init_extra_customMaskMatrix, _init_customMaskData, _init_extra_customMaskData, _init_customMaskMaterialIDs, _init_extra_customMaskMaterialIDs, _init_customMaskTargets, _init_extra_customMaskTargets, _init_customMaskClamps, _init_extra_customMaskClamps, _init_shLighting, _init_extra_shLighting, _init_clipRadiusSq, _init_extra_clipRadiusSq, _init_clipRadius2Sq, _init_extra_clipRadius2Sq, _init_impactDataOffset, _init_extra_impactDataOffset, _init_clipSphereFactor, _init_extra_clipSphereFactor, _init_clipSphereFactor2, _init_extra_clipSphereFactor2;

/**
 * Combined per-object record for a space object covering both stages -
 * transforms, clip sphere, ellipsoid, custom masks, bone offsets and
 * spherical-harmonic lighting coefficients - as values a renderer packs into a
 * constant buffer, never as GPU resources.
 */
let _EveSpacePerObjectDat;
new class extends _identity {
  static [class EveSpacePerObjectData extends CjsModel {
    static {
      ({
        e: [_init_worldTransform, _init_extra_worldTransform, _init_worldTransformLast, _init_extra_worldTransformLast, _init_invWorldTransform, _init_extra_invWorldTransform, _init_shipData, _init_extra_shipData, _init_clipSphereCenter, _init_extra_clipSphereCenter, _init_ellpsoidRadii, _init_extra_ellpsoidRadii, _init_ellpsoidCenter, _init_extra_ellpsoidCenter, _init_boneOffsets, _init_extra_boneOffsets, _init_customData, _init_extra_customData, _init_customMaskMatrix, _init_extra_customMaskMatrix, _init_customMaskData, _init_extra_customMaskData, _init_customMaskMaterialIDs, _init_extra_customMaskMaterialIDs, _init_customMaskTargets, _init_extra_customMaskTargets, _init_customMaskClamps, _init_extra_customMaskClamps, _init_shLighting, _init_extra_shLighting, _init_clipRadiusSq, _init_extra_clipRadiusSq, _init_clipRadius2Sq, _init_extra_clipRadius2Sq, _init_impactDataOffset, _init_extra_impactDataOffset, _init_clipSphereFactor, _init_extra_clipSphereFactor, _init_clipSphereFactor2, _init_extra_clipSphereFactor2],
        c: [_EveSpacePerObjectDat, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "EveSpacePerObjectData",
        family: "eve/perObjectData"
      })], [[[type, type.mat4], 16, "worldTransform"], [[type, type.mat4], 16, "worldTransformLast"], [[type, type.mat4], 16, "invWorldTransform"], [[type, type.vec4], 16, "shipData"], [[type, type.vec3], 16, "clipSphereCenter"], [[type, type.vec4], 16, "ellpsoidRadii"], [[type, type.vec4], 16, "ellpsoidCenter"], [type.array("uint32"), 0, "boneOffsets"], [[type, type.vec4], 16, "customData"], [type.array("mat4"), 0, "customMaskMatrix"], [type.array("vec4"), 0, "customMaskData"], [type.array("vec4"), 0, "customMaskMaterialIDs"], [type.array("vec4"), 0, "customMaskTargets"], [[type, type.vec4], 16, "customMaskClamps"], [type.array("vec4"), 0, "shLighting"], [[type, type.float32], 16, "clipRadiusSq"], [[type, type.float32], 16, "clipRadius2Sq"], [[type, type.float32], 16, "impactDataOffset"], [[type, type.float32], 16, "clipSphereFactor2"], [[type, type.float32], 16, "clipSphereFactor"]], 0, void 0, CjsModel));
    }
    constructor(...args) {
      super(...args);
      _init_extra_clipSphereFactor2(this);
    }
    worldTransform = _init_worldTransform(this, mat4.create());
    worldTransformLast = (_init_extra_worldTransform(this), _init_worldTransformLast(this, mat4.create()));
    invWorldTransform = (_init_extra_worldTransformLast(this), _init_invWorldTransform(this, mat4.create()));
    shipData = (_init_extra_invWorldTransform(this), _init_shipData(this, vec4.create()));
    clipSphereCenter = (_init_extra_shipData(this), _init_clipSphereCenter(this, vec3.create()));

    /** Carbon's field name (sic) - "ellpsoid" matches the source struct. */
    ellpsoidRadii = (_init_extra_clipSphereCenter(this), _init_ellpsoidRadii(this, vec4.create()));
    ellpsoidCenter = (_init_extra_ellpsoidRadii(this), _init_ellpsoidCenter(this, vec4.create()));
    boneOffsets = (_init_extra_ellpsoidCenter(this), _init_boneOffsets(this, Array(_EveSpacePerObjectDat.BONE_OFFSET_COUNT).fill(0)));
    customData = (_init_extra_boneOffsets(this), _init_customData(this, vec4.create()));
    customMaskMatrix = (_init_extra_customData(this), _init_customMaskMatrix(this, Array.from({
      length: _EveSpacePerObjectDat.CUSTOM_MASK_COUNT
    }, () => mat4.create())));
    customMaskData = (_init_extra_customMaskMatrix(this), _init_customMaskData(this, Array.from({
      length: _EveSpacePerObjectDat.CUSTOM_MASK_COUNT
    }, () => vec4.create())));
    customMaskMaterialIDs = (_init_extra_customMaskData(this), _init_customMaskMaterialIDs(this, Array.from({
      length: _EveSpacePerObjectDat.CUSTOM_MASK_COUNT
    }, () => vec4.create())));
    customMaskTargets = (_init_extra_customMaskMaterialIDs(this), _init_customMaskTargets(this, Array.from({
      length: _EveSpacePerObjectDat.CUSTOM_MASK_COUNT
    }, () => vec4.create())));
    customMaskClamps = (_init_extra_customMaskTargets(this), _init_customMaskClamps(this, vec4.create()));
    shLighting = (_init_extra_customMaskClamps(this), _init_shLighting(this, Array.from({
      length: _EveSpacePerObjectDat.SH_COEFFICIENT_COUNT
    }, () => vec4.create())));
    clipRadiusSq = (_init_extra_shLighting(this), _init_clipRadiusSq(this, 0));
    clipRadius2Sq = (_init_extra_clipRadiusSq(this), _init_clipRadius2Sq(this, 0));
    impactDataOffset = (_init_extra_clipRadius2Sq(this), _init_impactDataOffset(this, 0));
    clipSphereFactor2 = (_init_extra_impactDataOffset(this), _init_clipSphereFactor(this, 0));
    clipSphereFactor = (_init_extra_clipSphereFactor(this), _init_clipSphereFactor2(this, 0));

    /**
     * Applies a value bag, first padding or truncating boneOffsets, the
     * custom-mask arrays and shLighting to their declared counts so the record
     * always matches the constant-buffer layout.
     */
    SetValues(values = {}, options = {}) {
      const normalized = {
        ...values
      };
      if (Object.hasOwn(values, "boneOffsets")) normalized.boneOffsets = _EveSpacePerObjectDat.#uintArray(values.boneOffsets, _EveSpacePerObjectDat.BONE_OFFSET_COUNT);
      if (Object.hasOwn(values, "customMaskMatrix")) normalized.customMaskMatrix = _EveSpacePerObjectDat.#mat4Array(values.customMaskMatrix, _EveSpacePerObjectDat.CUSTOM_MASK_COUNT);
      for (const name of ["customMaskData", "customMaskMaterialIDs", "customMaskTargets"]) {
        if (Object.hasOwn(values, name)) normalized[name] = _EveSpacePerObjectDat.#vec4Array(values[name], _EveSpacePerObjectDat.CUSTOM_MASK_COUNT);
      }
      if (Object.hasOwn(values, "shLighting")) normalized.shLighting = _EveSpacePerObjectDat.#vec4Array(values.shLighting, _EveSpacePerObjectDat.SH_COEFFICIENT_COUNT);
      return super.SetValues(normalized, options);
    }

    /**
     * Builds a fixed-length array of owned mat4 copies, substituting identity for
     * any entry that is not a 16-element matrix.
     */

    /**
     * Builds a fixed-length array of owned vec4 copies, coercing each component to
     * a number and defaulting missing ones to zero.
     */

    /**
     * Builds a fixed-length array of unsigned 32-bit integers, coercing missing or
     * non-numeric entries to zero.
     */
  }];
  CUSTOM_MASK_COUNT = 2;
  BONE_OFFSET_COUNT = 4;
  SH_COEFFICIENT_COUNT = 7;
  #mat4Array(values, count) {
    return Array.from({
      length: count
    }, (_, index) => values?.[index]?.length === 16 ? mat4.copy(mat4.create(), values[index]) : mat4.create());
  }
  #vec4Array(values, count) {
    return Array.from({
      length: count
    }, (_, index) => {
      const value = values?.[index];
      return vec4.fromValues(Number(value?.[0] ?? 0), Number(value?.[1] ?? 0), Number(value?.[2] ?? 0), Number(value?.[3] ?? 0));
    });
  }
  #uintArray(values, count) {
    return Array.from({
      length: count
    }, (_, index) => Number(values?.[index] || 0) >>> 0);
  }
  constructor() {
    super(_EveSpacePerObjectDat), _initClass();
  }
}();

export { _EveSpacePerObjectDat as EveSpacePerObjectData };
//# sourceMappingURL=EveSpacePerObjectData.js.map
