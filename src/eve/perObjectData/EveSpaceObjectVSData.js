// Source: E:\carbonengine\trinity\trinity\Eve\SpaceObject\EveSpaceObject2.h
import { mat4 } from "@carbonenginejs/runtime-utils/mat4";
import { vec4 } from "@carbonenginejs/runtime-utils/vec4";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { type } from "@carbonenginejs/runtime-utils/schema";


@type.define({ className: "EveSpaceObjectVSData", family: "eve/spaceObject" })
export class EveSpaceObjectVSData extends CjsModel
{
  static CUSTOM_MASK_COUNT = 2;

  static BONE_OFFSET_COUNT = 4;

  @type.mat4
  worldTransform = mat4.create();

  @type.mat4
  worldTransformLast = mat4.create();

  @type.mat4
  invWorldTransform = mat4.create();

  @type.vec4
  shipData = vec4.create();

  @type.vec4
  clipData = vec4.create();

  @type.vec4
  ellpsoidRadii = vec4.create();

  @type.vec4
  ellpsoidCenter = vec4.create();

  @type.array("mat4")
  customMaskMatrix = Array.from({ length: EveSpaceObjectVSData.CUSTOM_MASK_COUNT }, () => mat4.create());

  @type.array("vec4")
  customMaskData = Array.from({ length: EveSpaceObjectVSData.CUSTOM_MASK_COUNT }, () => vec4.create());

  @type.array("uint32")
  boneOffsets = Array(EveSpaceObjectVSData.BONE_OFFSET_COUNT).fill(0);

  @type.uint32
  morphTargetVertexDataOffset = 0;

  @type.uint32
  morphTargetAnimationDataOffset = 0;

  @type.uint32
  activeMorphTargetsCount = 0;

  @type.uint32
  bakedMorphTargetVertexDataOffset = 0;

  @type.vec4
  customData = vec4.create();

  SetValues(values = {}, options = {})
  {
    const normalized = { ...values };
    if (Object.hasOwn(values, "customMaskMatrix")) normalized.customMaskMatrix = EveSpaceObjectVSData.#mat4Array(values.customMaskMatrix, EveSpaceObjectVSData.CUSTOM_MASK_COUNT);
    if (Object.hasOwn(values, "customMaskData")) normalized.customMaskData = EveSpaceObjectVSData.#vec4Array(values.customMaskData, EveSpaceObjectVSData.CUSTOM_MASK_COUNT);
    if (Object.hasOwn(values, "boneOffsets")) normalized.boneOffsets = EveSpaceObjectVSData.#uintArray(values.boneOffsets, EveSpaceObjectVSData.BONE_OFFSET_COUNT);
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
