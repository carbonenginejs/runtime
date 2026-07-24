// Source: E:\carbonengine\trinity\trinity\Eve\SpaceObject\EveSpaceObject2.h
import { mat4 } from "@carbonenginejs/runtime-utils/mat4";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { vec4 } from "@carbonenginejs/runtime-utils/vec4";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { type } from "@carbonenginejs/runtime-utils/schema";


@type.define({
  className: "EveSpaceObjectPSData",
  family: "eve/spaceObject"
})
export class EveSpaceObjectPSData extends CjsModel
{
  static CUSTOM_MASK_COUNT = 2;

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

  @type.array("vec4")
  shLightingCoefficients = Array.from({ length: EveSpaceObjectPSData.SH_COEFFICIENT_COUNT }, () => vec4.create());

  @type.array("vec4")
  customMaskMaterialIDs = Array.from({ length: EveSpaceObjectPSData.CUSTOM_MASK_COUNT }, () => vec4.create());

  @type.array("vec4")
  customMaskTargets = Array.from({ length: EveSpaceObjectPSData.CUSTOM_MASK_COUNT }, () => vec4.create());

  @type.vec4
  customMaskClamps = vec4.create();

  @type.vec4
  screenSize = vec4.create();

  @type.vec4
  customData = vec4.create();

  SetValues(values = {}, options = {})
  {
    const normalized = { ...values };
    if (Object.hasOwn(values, "shLightingCoefficients")) normalized.shLightingCoefficients = EveSpaceObjectPSData.#vec4Array(values.shLightingCoefficients, EveSpaceObjectPSData.SH_COEFFICIENT_COUNT);
    if (Object.hasOwn(values, "customMaskMaterialIDs")) normalized.customMaskMaterialIDs = EveSpaceObjectPSData.#vec4Array(values.customMaskMaterialIDs, EveSpaceObjectPSData.CUSTOM_MASK_COUNT);
    if (Object.hasOwn(values, "customMaskTargets")) normalized.customMaskTargets = EveSpaceObjectPSData.#vec4Array(values.customMaskTargets, EveSpaceObjectPSData.CUSTOM_MASK_COUNT);
    return super.SetValues(normalized, options);
  }

  static #vec4Array(values, count)
  {
    return Array.from({ length: count }, (_, index) => {
      const value = values?.[index];
      return vec4.fromValues(Number(value?.[0] ?? 0), Number(value?.[1] ?? 0), Number(value?.[2] ?? 0), Number(value?.[3] ?? 0));
    });
  }
}
