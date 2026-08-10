// Source: E:\carbonengine\trinity\trinity\Lights\Tr2Light.h
// Source: E:\carbonengine\trinity\trinity\Lights\Tr2Light.cpp
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { quat } from "@carbonenginejs/runtime-utils/quat";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { vec4 } from "@carbonenginejs/runtime-utils/vec4";
import { type } from "@carbonenginejs/runtime-utils/schema";


/**
 * Full authored attribute set of a light - position, colour, brightness and
 * noise, radii, orientation and cone angles, texture path, bone index, flags,
 * shadow setting and volumetric flag - used as the compat view over a light's
 * flattened fields.
 */
@type.define({
  className: "CjsLightData",
  sourceClass: "LightData",
  aliases: ["LightData"],
  family: "eve/lights"
})
export class CjsLightData extends CjsModel
{
  static Fields = [
    "position", "color", "brightness", "noiseAmplitude", "noiseFrequency",
    "noiseOctaves", "radius", "innerRadius", "rotation", "outerAngle",
    "innerAngle", "texturePath", "boneIndex", "flags", "startTime",
    "castsShadows", "isVolumetric"
  ];

  @type.vec3
  position = vec3.create();

  @type.color
  color = vec4.createLinear();

  @type.float32
  brightness = 1;

  @type.float32
  noiseAmplitude = 0;

  @type.float32
  noiseFrequency = 1;

  @type.uint32
  noiseOctaves = 1;

  @type.float32
  radius = 0;

  @type.float32
  innerRadius = 0;

  @type.quat
  rotation = quat.create();

  @type.float32
  outerAngle = 0;

  @type.float32
  innerAngle = 0;

  @type.string
  texturePath = "";

  @type.int32
  boneIndex = -1;

  @type.uint16
  flags = 1;

  @type.float64
  startTime = 0;

  @type.int32
  @type.enum("PerLightShadowSetting")
  castsShadows = 0;

  @type.boolean
  isVolumetric = false;

  static PerLightShadowSetting = Object.freeze({
    DISABLED: 0,
    ENABLED_ONLY_ON_HIGH_QUALITY: 1,
    ALWAYS_ENABLED: 2
  });
}

/**
 * Builds the compat LightData view over an owner's flattened light fields.
 *
 * The 2026-07-23 flatten decision makes the flat decorated fields the real
 * storage on every light parent; this view keeps the Carbon
 * `GetLightData() -> const LightData&` surface (and the runtime-sof
 * separate-node hydration contract) alive by redirecting the owner's
 * flattened field names into the owner. Fields the owner does not flatten
 * keep their own constructor-default storage on the view.
 */
export function createCjsLightDataView(owner, fieldNames)
{
  const view = new CjsLightData();
  const descriptors = {};
  for (const fieldName of fieldNames)
  {
    delete view[fieldName];
    descriptors[fieldName] = {
      configurable: true,
      enumerable: true,
      get()
      {
        return owner[fieldName];
      },
      set(value)
      {
        owner.SetValues({ [fieldName]: value });
      }
    };
  }
  Object.defineProperties(view, descriptors);
  return view;
}

/**
 * Routes a nested `lightData` value bag (the pre-flatten hydration shape,
 * still emitted by runtime-sof) into the owner's flattened fields, then
 * applies everything through one schema-backed SetValues pass. Explicit flat
 * keys win over the nested bag.
 */
export function setCjsLightDataOwnerValues(owner, values, options, setOwnerValues, fieldNames)
{
  if (!values || typeof values !== "object") return setOwnerValues(values, options);
  if (!Object.prototype.hasOwnProperty.call(values, "lightData")) return setOwnerValues(values, options);

  const merged = {};
  for (const [key, value] of Object.entries(values))
  {
    if (key !== "lightData") merged[key] = value;
  }

  const nested = values.lightData?.GetValues?.() ?? values.lightData;
  if (nested && typeof nested === "object")
  {
    const fieldSet = new Set(fieldNames);
    for (const fieldName of CjsLightData.Fields)
    {
      if (!fieldSet.has(fieldName)) continue;
      if (!Object.prototype.hasOwnProperty.call(nested, fieldName)) continue;
      if (Object.prototype.hasOwnProperty.call(values, fieldName)) continue;
      merged[fieldName] = nested[fieldName];
    }
  }

  return setOwnerValues(merged, options);
}
