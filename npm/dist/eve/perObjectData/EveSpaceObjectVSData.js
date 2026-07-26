import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { type } from '@carbonenginejs/runtime-utils/schema';

let _initClass, _init_worldTransform, _init_extra_worldTransform, _init_worldTransformLast, _init_extra_worldTransformLast, _init_invWorldTransform, _init_extra_invWorldTransform, _init_shipData, _init_extra_shipData, _init_clipData, _init_extra_clipData, _init_ellpsoidRadii, _init_extra_ellpsoidRadii, _init_ellpsoidCenter, _init_extra_ellpsoidCenter, _init_customMaskMatrix, _init_extra_customMaskMatrix, _init_customMaskData, _init_extra_customMaskData, _init_boneOffsets, _init_extra_boneOffsets, _init_morphTargetVertexDataOffset, _init_extra_morphTargetVertexDataOffset, _init_morphTargetAnimationDataOffset, _init_extra_morphTargetAnimationDataOffset, _init_activeMorphTargetsCount, _init_extra_activeMorphTargetsCount, _init_bakedMorphTargetVertexDataOffset, _init_extra_bakedMorphTargetVertexDataOffset, _init_customData, _init_extra_customData;

/**
 * Vertex-stage per-object values for a space object - world/inverse-world
 * transforms, clip and ellipsoid data, custom-mask matrices, bone and
 * morph-target offsets - held as plain values a renderer packs into a constant
 * buffer, never as GPU resources.
 */
let _EveSpaceObjectVSData;
new class extends _identity {
  static [class EveSpaceObjectVSData extends CjsModel {
    static {
      ({
        e: [_init_worldTransform, _init_extra_worldTransform, _init_worldTransformLast, _init_extra_worldTransformLast, _init_invWorldTransform, _init_extra_invWorldTransform, _init_shipData, _init_extra_shipData, _init_clipData, _init_extra_clipData, _init_ellpsoidRadii, _init_extra_ellpsoidRadii, _init_ellpsoidCenter, _init_extra_ellpsoidCenter, _init_customMaskMatrix, _init_extra_customMaskMatrix, _init_customMaskData, _init_extra_customMaskData, _init_boneOffsets, _init_extra_boneOffsets, _init_morphTargetVertexDataOffset, _init_extra_morphTargetVertexDataOffset, _init_morphTargetAnimationDataOffset, _init_extra_morphTargetAnimationDataOffset, _init_activeMorphTargetsCount, _init_extra_activeMorphTargetsCount, _init_bakedMorphTargetVertexDataOffset, _init_extra_bakedMorphTargetVertexDataOffset, _init_customData, _init_extra_customData],
        c: [_EveSpaceObjectVSData, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "EveSpaceObjectVSData",
        family: "eve/spaceObject"
      })], [[[type, type.mat4], 16, "worldTransform"], [[type, type.mat4], 16, "worldTransformLast"], [[type, type.mat4], 16, "invWorldTransform"], [[type, type.vec4], 16, "shipData"], [[type, type.vec4], 16, "clipData"], [[type, type.vec4], 16, "ellpsoidRadii"], [[type, type.vec4], 16, "ellpsoidCenter"], [type.array("mat4"), 0, "customMaskMatrix"], [type.array("vec4"), 0, "customMaskData"], [type.array("uint32"), 0, "boneOffsets"], [[type, type.uint32], 16, "morphTargetVertexDataOffset"], [[type, type.uint32], 16, "morphTargetAnimationDataOffset"], [[type, type.uint32], 16, "activeMorphTargetsCount"], [[type, type.uint32], 16, "bakedMorphTargetVertexDataOffset"], [[type, type.vec4], 16, "customData"]], 0, void 0, CjsModel));
    }
    constructor(...args) {
      super(...args);
      _init_extra_customData(this);
    }
    worldTransform = _init_worldTransform(this, mat4.create());
    worldTransformLast = (_init_extra_worldTransform(this), _init_worldTransformLast(this, mat4.create()));
    invWorldTransform = (_init_extra_worldTransformLast(this), _init_invWorldTransform(this, mat4.create()));
    shipData = (_init_extra_invWorldTransform(this), _init_shipData(this, vec4.create()));
    clipData = (_init_extra_shipData(this), _init_clipData(this, vec4.create()));
    ellpsoidRadii = (_init_extra_clipData(this), _init_ellpsoidRadii(this, vec4.create()));
    ellpsoidCenter = (_init_extra_ellpsoidRadii(this), _init_ellpsoidCenter(this, vec4.create()));
    customMaskMatrix = (_init_extra_ellpsoidCenter(this), _init_customMaskMatrix(this, Array.from({
      length: _EveSpaceObjectVSData.CUSTOM_MASK_COUNT
    }, () => mat4.create())));
    customMaskData = (_init_extra_customMaskMatrix(this), _init_customMaskData(this, Array.from({
      length: _EveSpaceObjectVSData.CUSTOM_MASK_COUNT
    }, () => vec4.create())));
    boneOffsets = (_init_extra_customMaskData(this), _init_boneOffsets(this, Array(_EveSpaceObjectVSData.BONE_OFFSET_COUNT).fill(0)));
    morphTargetVertexDataOffset = (_init_extra_boneOffsets(this), _init_morphTargetVertexDataOffset(this, 0));
    morphTargetAnimationDataOffset = (_init_extra_morphTargetVertexDataOffset(this), _init_morphTargetAnimationDataOffset(this, 0));
    activeMorphTargetsCount = (_init_extra_morphTargetAnimationDataOffset(this), _init_activeMorphTargetsCount(this, 0));
    bakedMorphTargetVertexDataOffset = (_init_extra_activeMorphTargetsCount(this), _init_bakedMorphTargetVertexDataOffset(this, 0));
    customData = (_init_extra_bakedMorphTargetVertexDataOffset(this), _init_customData(this, vec4.create()));

    /**
     * Applies a value bag, first padding or truncating the fixed-length
     * customMaskMatrix, customMaskData and boneOffsets arrays to their declared
     * counts so the record always matches the constant-buffer layout.
     */
    SetValues(values = {}, options = {}) {
      const normalized = {
        ...values
      };
      if (Object.hasOwn(values, "customMaskMatrix")) normalized.customMaskMatrix = _EveSpaceObjectVSData.#mat4Array(values.customMaskMatrix, _EveSpaceObjectVSData.CUSTOM_MASK_COUNT);
      if (Object.hasOwn(values, "customMaskData")) normalized.customMaskData = _EveSpaceObjectVSData.#vec4Array(values.customMaskData, _EveSpaceObjectVSData.CUSTOM_MASK_COUNT);
      if (Object.hasOwn(values, "boneOffsets")) normalized.boneOffsets = _EveSpaceObjectVSData.#uintArray(values.boneOffsets, _EveSpaceObjectVSData.BONE_OFFSET_COUNT);
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
    super(_EveSpaceObjectVSData), _initClass();
  }
}();

export { _EveSpaceObjectVSData as EveSpaceObjectVSData };
//# sourceMappingURL=EveSpaceObjectVSData.js.map
