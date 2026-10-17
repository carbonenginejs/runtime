// Source: trinity/trinity/Lights/Tr2Light.h
// Source: trinity/trinity/Lights/Tr2Light.cpp
import { be } from "#blue";
import { color } from "#math/color";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";
import { meta, type, blue } from "#schema";
import { PerLightShadowSetting } from "../../generated/eve/lights/enums.js";
import { mat4 } from "#math/mat4";
import { noise } from "#math/noise";
import { CcpTime } from "../../../global/blue/CcpTime.js";
import { ShadowQuality } from "../../generated/trinityCore/enums.js";
import { CreateLightRecord, LIGHT_FLAG_CASTS_SHADOWS, LIGHT_FLAG_IS_VOLUMETRIC } from "./lightConversion.js";

// Conversion scratch (lights convert one at a time).
const ROTATION_SCRATCH = mat4.create();
const LIGHT_ROTATION_SCRATCH = mat4.create();
const DIRECTION_SCRATCH = vec3.create();

/** TRI_2PI (TriMath.h:245), a float literal. */
const TRI_2PI = Math.fround(6.283185307);


/**
 * Full authored attribute set of a light - position, colour, brightness and
 * noise, radii, orientation and cone angles, texture path, bone index, flags,
 * shadow setting and volumetric flag - used as the compat view over a light's
 * flattened fields.
 */
@blue.define({
  className: "CjsLightData",
  donors: ["LightData"],
  sourceClass: "LightData",
  aliases: ["LightData"]
})
export class CjsLightData
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
  color = color.createLinear();

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

  @type.wpath("TriTextureRes")
  texturePath = "";

  @type.int32
  boneIndex = -1;

  @type.uint16
  flags = 1;

  @type.float64
  startTime = 0;

  @type.int32
  @type.enum("trinity.PerLightShadowSetting")
  castsShadows = 0;

  @type.boolean
  isVolumetric = false;

  /**
   * Captures the construction frame in Blue ticks.
   * Source: trinity/trinity/Lights/Tr2Light.cpp:24.
   */
  constructor()
  {
    this.startTime = be.os.GetCurrentFrameTime();
  }

  /**
   * Carbon's implicit LightData copy assignment, which JavaScript cannot
   * overload: every member copied, vectors into this record's own storage
   * (Tr2Light.h:27-55).
   * @param {CjsLightData} other
   * @returns {CjsLightData} this
   */
  @meta.renamed("operator=")
  Copy(other)
  {
    vec3.copy(this.position, other.position);
    color.copy(this.color, other.color);
    this.brightness = other.brightness;
    this.noiseAmplitude = other.noiseAmplitude;
    this.noiseFrequency = other.noiseFrequency;
    this.noiseOctaves = other.noiseOctaves;
    this.radius = other.radius;
    this.innerRadius = other.innerRadius;
    quat.copy(this.rotation, other.rotation);
    this.outerAngle = other.outerAngle;
    this.innerAngle = other.innerAngle;
    this.texturePath = other.texturePath;
    this.boneIndex = other.boneIndex;
    this.flags = other.flags;
    this.startTime = other.startTime;
    this.castsShadows = other.castsShadows;
    this.isVolumetric = other.isVolumetric;
    return this;
  }

  /**
   * Carbon LightData::AsPerPointLightData (Tr2Light.cpp:37-69): the light in
   * the light manager's per-light form under a transform.
   *
   * - Brightness is scaled by the parent's, and flickers with Perlin noise over
   *   the time since the light started when noiseAmplitude is set
   *   (cpp:42-47).
   * - The colour is the RGB scaled by that brightness; the radii by the
   *   parent scale.
   * - The position is transformed; the direction is -Z under the light's
   *   rotation then the transform.
   * - A point light has zero cone angles and the 45-degree projection
   *   distance; the shadow and volumetric flags follow castsShadows,
   *   shadowQuality and isVolumetric.
   *
   * Adapted:
   * - Carbon returns the record by value. Every caller converts lights in a
   *   per-frame loop and hands the record straight to the light manager, which
   *   copies it, so the record is written into `out` (ruling 16's
   *   established out-form) rather than allocated per light.
   * - Carbon narrows innerRadius, the direction and the angles to Float_16 and
   *   packs profileIndex << 4 into the flags (cpp:50-52). Here they stay float
   *   and the profile stays on the record, which is what Tr2LightManager reads
   *   today; the packing waits on the light manager's port.
   *
   * @param {mat4} transform
   * @param {LightFeatures} features
   * @param {number} shadowQuality A ShadowQuality value.
   * @param {object} [out] A light record (CreateLightRecord) to write.
   * @returns {object} out
   */
  @meta.adapted
  AsPerPointLightData(transform, features, shadowQuality, out = CreateLightRecord())
  {
    // cpp:42-47.
    let composedBrightness = Math.fround(this.brightness * features.parentBrightness);
    if (this.noiseAmplitude !== 0)
    {
      const elapsed = CcpTime.timeAsDouble(be.os.GetCurrentFrameTime() - this.startTime);
      const flicker = Math.fround(noise.carbonPerlin1D(elapsed * this.noiseFrequency, 2, 2, this.noiseOctaves));
      composedBrightness = Math.fround(composedBrightness * Math.fround(Math.fround((flicker + 1) / 2) * this.noiseAmplitude));
    }

    // cpp:48-52.
    out.color[0] = this.color[0] * composedBrightness;
    out.color[1] = this.color[1] * composedBrightness;
    out.color[2] = this.color[2] * composedBrightness;
    out.radius = Math.fround(this.radius * features.parentScale);
    out.innerRadius = Math.fround(this.innerRadius * features.parentScale);
    out.flags = this.flags;

    // cpp:53 - TransformCoord.
    vec3.transformMat4(out.position, this.position, transform);

    // cpp:55 - Carbon (row-vector): RotationMatrix( rotation ) * transform.
    mat4.fromQuat(ROTATION_SCRATCH, this.rotation);
    mat4.multiply(LIGHT_ROTATION_SCRATCH, transform, ROTATION_SCRATCH);
    // cpp:56 - Transform( (0, 0, -1, 0), lightRotation ): w = 0, so the basis only.
    const m = LIGHT_ROTATION_SCRATCH;
    vec3.set(DIRECTION_SCRATCH, -m[8], -m[9], -m[10]);
    vec3.normalize(out.direction, DIRECTION_SCRATCH);

    // cpp:58-60.
    out.outerAngle = 0;
    out.innerAngle = 0;
    out.projectionPlaneDistance = Math.fround(1 / Math.tan(Math.fround(Math.fround(TRI_2PI * 45) / 360)));

    // cpp:62-66.
    if (this.castsShadows === PerLightShadowSetting.ALWAYS_ENABLED
      || (this.castsShadows === PerLightShadowSetting.ENABLED_ONLY_ON_HIGH_QUALITY && shadowQuality === ShadowQuality.SHADOW_HIGH)
      || (this.castsShadows === PerLightShadowSetting.ENABLED_ONLY_ON_HIGH_QUALITY && shadowQuality === ShadowQuality.SHADOW_RAYTRACED))
    {
      out.flags |= LIGHT_FLAG_CASTS_SHADOWS;
    }
    out.flags |= this.isVolumetric ? LIGHT_FLAG_IS_VOLUMETRIC : 0;

    return out;
  }

  /**
   * Carbon LightData::AsPerSpotLightData (Tr2Light.cpp:71-80): the point
   * conversion, then the cosines of the cone angles and 1/tan of the outer
   * angle - Infinity at outerAngle 0, as Carbon ships it.
   *
   * Adapted: the out-form and float storage of AsPerPointLightData.
   * @param {mat4} transform
   * @param {LightFeatures} features
   * @param {number} shadowQuality A ShadowQuality value.
   * @param {object} [out] A light record (CreateLightRecord) to write.
   * @returns {object} out
   */
  @meta.adapted
  AsPerSpotLightData(transform, features, shadowQuality, out = CreateLightRecord())
  {
    this.AsPerPointLightData(transform, features, shadowQuality, out);

    out.outerAngle = Math.fround(Math.cos(Math.fround(Math.fround(TRI_2PI * this.outerAngle) / 360)));
    out.innerAngle = Math.fround(Math.cos(Math.fround(Math.fround(TRI_2PI * this.innerAngle) / 360)));
    out.projectionPlaneDistance = Math.fround(1 / Math.tan(Math.fround(Math.fround(TRI_2PI * this.outerAngle) / 360)));

    return out;
  }

  static PerLightShadowSetting = PerLightShadowSetting;
}

/**
 * Builds the compat LightData view over an owner's flattened light fields.
 *
 * The 2026-07-23 flatten decision makes the flat decorated fields the real
 * storage on every light parent; this view keeps the Carbon
 * `GetLightData() -> const LightData&` surface (and the SOF layer's
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
        // A plain LightData field assignment: vectors copy into the owner's storage.
        if (ArrayBuffer.isView(owner[fieldName]) && owner[fieldName].length === value.length) owner[fieldName].set(value);
        else owner[fieldName] = value;
      }
    };
  }
  Object.defineProperties(view, descriptors);
  return view;
}

// Carbon registers this in Tr2Light_Blue.cpp:14. It is registered here because
// the attachment lights load this module without Tr2Light, and Tr2Light
// imports this module, so the reverse import would be a cycle.
