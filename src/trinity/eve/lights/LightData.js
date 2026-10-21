// Source: trinity/trinity/Lights/Tr2Light.h:27-58
// Source: trinity/trinity/Lights/Tr2Light.cpp:9-80
import { blue } from "#blue";
import { color } from "#math/color";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";
import { meta, type } from "#schema";
import { PerLightShadowSetting } from "../../generated/eve/lights/enums.js";
import { mat4 } from "#math/mat4";
import { noise } from "#math/noise";
import { CcpTime } from "../../../global/blue/CcpTime.js";
import { ShadowQuality } from "../../generated/trinityCore/enums.js";
import { Tr2LightManager } from "../../core/lighting/Tr2LightManager.js";
import { CreateLightRecord } from "./lightConversion.js";

// Conversion scratch (lights convert one at a time).
const ROTATION_SCRATCH = mat4.create();
const LIGHT_ROTATION_SCRATCH = mat4.create();
const DIRECTION_SCRATCH = vec3.create();

/** TRI_2PI (TriMath.h:245), a float literal. */
const TRI_2PI = Math.fround(6.283185307);


/**
 * Carbon LightData (Tr2Light.h:27-58): one light's authored values - position,
 * colour, brightness and noise, radii, orientation and cone angles, texture
 * path, bone index, flags, start time, shadow setting and volumetric flag.
 *
 * Carbon does not expose it to Blue. Its owners embed it by value
 * (Tr2Light::m_lightData, Tr2Light.h:102; EveSmartLightPointLight::
 * m_lightGroupData, EveSmartLightPointLight.h:41; the attachment sets' light
 * structs, e.g. EveBannerSet.h:34) and map their Blue attributes into its
 * members.
 */
@meta.carbon("LightData")
export class LightData
{

  /** position (Vector3) = (0, 0, 0) (Tr2Light.cpp:10). */
  @type.vec3
  position = vec3.create();

  /** color (Color) = (0, 0, 0, 1) (Tr2Light.cpp:11). */
  @type.color
  color = color.fromValues(0, 0, 0, 1);

  /** brightness (float) = 1 (Tr2Light.cpp:12). */
  @type.float32
  brightness = 1;

  /** noiseAmplitude (float) = 0 (Tr2Light.cpp:13). */
  @type.float32
  noiseAmplitude = 0;

  /** noiseFrequency (float) = 1 (Tr2Light.cpp:14). */
  @type.float32
  noiseFrequency = 1;

  /** noiseOctaves (uint32_t) = 1 (Tr2Light.cpp:15). */
  @type.uint32
  noiseOctaves = 1;

  /** radius (float) = 0 (Tr2Light.cpp:16). */
  @type.float32
  radius = 0;

  /** innerRadius (float) = 0 (Tr2Light.cpp:17). */
  @type.float32
  innerRadius = 0;

  /** rotation (Quaternion) = (0, 0, 0, 1) (Tr2Light.cpp:18). */
  @type.quat
  rotation = quat.create();

  /** outerAngle (float) = 0 (Tr2Light.cpp:20). */
  @type.float32
  outerAngle = 0;

  /** innerAngle (float) = 0 (Tr2Light.cpp:19). */
  @type.float32
  innerAngle = 0;

  /** texturePath (std::wstring) = L"" (Tr2Light.cpp:21). */
  @type.wpath("TriTextureRes")
  texturePath = "";

  /** boneIndex (int32_t) = -1 (Tr2Light.cpp:22). */
  @type.int32
  boneIndex = -1;

  /** flags (uint16_t) = Tr2LightManager::FLAG_DEFAULT (Tr2Light.cpp:23). */
  @type.uint16
  flags = Tr2LightManager.FLAG_DEFAULT;

  /** startTime (Be::Time) = BeOS->GetCurrentFrameTime(), set by the constructor (Tr2Light.cpp:24). */
  @type.float64
  startTime = 0;

  /** castsShadows (PerLightShadowSetting) = DISABLED (Tr2Light.cpp:25). */
  @type.int32
  @type.enum("trinity.PerLightShadowSetting")
  castsShadows = PerLightShadowSetting.DISABLED;

  /** isVolumetric (bool) = false (Tr2Light.cpp:26). */
  @type.boolean
  isVolumetric = false;

  /**
   * Captures the construction frame in Blue ticks.
   * Source: trinity/trinity/Lights/Tr2Light.cpp:24.
   */
  constructor()
  {
    this.startTime = blue.os.GetCurrentFrameTime();
  }

  /**
   * Carbon's implicit LightData copy assignment, which JavaScript cannot
   * overload: every member copied, vectors into this record's own storage
   * (Tr2Light.h:27-58).
   * @param {LightData} other
   * @returns {LightData} this
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
      const elapsed = CcpTime.timeAsDouble(blue.os.GetCurrentFrameTime() - this.startTime);
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
      out.flags |= Tr2LightManager.FLAG_CASTS_SHADOWS;
    }
    out.flags |= this.isVolumetric ? Tr2LightManager.FLAG_IS_VOLUMETRIC : 0;

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

}
