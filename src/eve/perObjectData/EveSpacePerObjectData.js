// Source: E:\carbonengine\trinity\trinity\Eve\SpaceObject\EveSpaceObject2.h
import { mat4 } from "@carbonenginejs/runtime-utils/mat4";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { vec4 } from "@carbonenginejs/runtime-utils/vec4";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { type } from "@carbonenginejs/runtime-utils/schema";


@type.define({
  className: "EveSpacePerObjectData",
  family: "eve/perObjectData"
})
export class EveSpacePerObjectData extends CjsModel
{
  static CUSTOM_MASK_COUNT = 2;

  static BONE_OFFSET_COUNT = 4;

  static SH_COEFFICIENT_COUNT = 7;

  @type.mat4
  worldTransform = mat4.create();

  @type.mat4
  worldTransformLast = mat4.create();

  @type.mat4
  invWorldTransform = mat4.create();

  @type.vec4
  shipData = vec4.create();

  @type.vec3
  clipSphereCenter = vec3.create();

  /** Carbon's field name (sic) - "ellpsoid" matches the source struct. */
  @type.vec4
  ellpsoidRadii = vec4.create();

  @type.vec4
  ellpsoidCenter = vec4.create();

  @type.array("uint32")
  boneOffsets = Array(EveSpacePerObjectData.BONE_OFFSET_COUNT).fill(0);

  @type.vec4
  customData = vec4.create();

  @type.array("mat4")
  customMaskMatrix = Array.from({ length: EveSpacePerObjectData.CUSTOM_MASK_COUNT }, () => mat4.create());

  @type.array("vec4")
  customMaskData = Array.from({ length: EveSpacePerObjectData.CUSTOM_MASK_COUNT }, () => vec4.create());

  @type.array("vec4")
  customMaskMaterialIDs = Array.from({ length: EveSpacePerObjectData.CUSTOM_MASK_COUNT }, () => vec4.create());

  @type.array("vec4")
  customMaskTargets = Array.from({ length: EveSpacePerObjectData.CUSTOM_MASK_COUNT }, () => vec4.create());

  @type.vec4
  customMaskClamps = vec4.create();

  @type.array("vec4")
  shLighting = Array.from({ length: EveSpacePerObjectData.SH_COEFFICIENT_COUNT }, () => vec4.create());

  @type.float32
  clipRadiusSq = 0;

  @type.float32
  clipRadius2Sq = 0;

  @type.float32
  impactDataOffset = 0;

  @type.float32
  clipSphereFactor2 = 0;

  @type.float32
  clipSphereFactor = 0;

  SetValues(values = {}, options = {})
  {
    const normalized = { ...values };
    if (Object.hasOwn(values, "boneOffsets")) normalized.boneOffsets = EveSpacePerObjectData.#uintArray(values.boneOffsets, EveSpacePerObjectData.BONE_OFFSET_COUNT);
    if (Object.hasOwn(values, "customMaskMatrix")) normalized.customMaskMatrix = EveSpacePerObjectData.#mat4Array(values.customMaskMatrix, EveSpacePerObjectData.CUSTOM_MASK_COUNT);
    for (const name of ["customMaskData", "customMaskMaterialIDs", "customMaskTargets"])
    {
      if (Object.hasOwn(values, name)) normalized[name] = EveSpacePerObjectData.#vec4Array(values[name], EveSpacePerObjectData.CUSTOM_MASK_COUNT);
    }
    if (Object.hasOwn(values, "shLighting")) normalized.shLighting = EveSpacePerObjectData.#vec4Array(values.shLighting, EveSpacePerObjectData.SH_COEFFICIENT_COUNT);
    return super.SetValues(normalized, options);
  }

  static #mat4Array(values, count)
  {
    return Array.from({ length: count }, (_, index) => values?.[index]?.length === 16 ? mat4.copy(mat4.create(), values[index]) : mat4.create());
  }

  static #vec4Array(values, count)
  {
    return Array.from({ length: count }, (_, index) => {
      const value = values?.[index];
      return vec4.fromValues(Number(value?.[0] ?? 0), Number(value?.[1] ?? 0), Number(value?.[2] ?? 0), Number(value?.[3] ?? 0));
    });
  }

  static #uintArray(values, count)
  {
    return Array.from({ length: count }, (_, index) => Number(values?.[index] || 0) >>> 0);
  }
}
