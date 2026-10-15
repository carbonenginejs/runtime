// Source: trinity/trinity/Lights/Tr2SpotLight.cpp
// Source: trinity/trinity/Lights/Tr2SpotLight_Blue.cpp
import { IInitialize, INotify } from "#blue";
// Flattened LightData surface (2026-07-23 decision): the m_lightData.* Blue
// attributes are real decorated fields here, verified against
// lights/Tr2SpotLight.json (tools-core schema build).
import { type, blue } from "#schema";
import { color } from "#math/color";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";
import { Tr2Light } from "./Tr2Light.js";


/**
 * Cone light, adding inner and outer cone angles to the flattened point-light
 * attribute set.
 */
@blue.define("Tr2SpotLight")
@blue.interface(Tr2Light, IInitialize, INotify)
export class Tr2SpotLight extends Tr2Light
{
  static LightDataFields = [
    "flags", "position", "rotation", "boneIndex", "radius", "innerRadius",
    "innerAngle", "outerAngle", "color", "brightness", "noiseAmplitude",
    "noiseFrequency", "noiseOctaves", "castsShadows", "isVolumetric"
  ];

  @blue.readwrite
  @blue.persist
  @type.string
  name = "";

  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.wpath("Tr2LightProfileRes")
  lightProfilePath = "";

  @blue.read
  @type.rootRef("Tr2LightProfileRes")
  lightProfile = null;

  /** m_lightData.castsShadows (PerLightShadowSetting) [READWRITE, PERSIST, NOTIFY, ENUM] */
  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.int32
  @type.enum("trinity.PerLightShadowSetting")
  castsShadows = 0;

  /** m_lightData.flags (uint16_t) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.uint16
  flags = 1;

  /** m_lightData.position (Vector3) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.vec3
  position = vec3.create();

  /** m_lightData.rotation (Quaternion) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.quat
  rotation = quat.create();

  /** m_lightData.boneIndex (int32_t) [READWRITE, PERSIST, NOTIFY] */
  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.int32
  boneIndex = -1;

  /** m_lightData.radius (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  radius = 0;

  /** m_lightData.innerRadius (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  innerRadius = 0;

  /** m_lightData.innerAngle (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  innerAngle = 0;

  /** m_lightData.outerAngle (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  outerAngle = 0;

  /** m_lightData.color (Color) [READWRITE, PERSIST, NOTIFY] */
  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.color
  color = color.createLinear();

  /** m_lightData.brightness (float) [READWRITE, PERSIST, NOTIFY] */
  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.float32
  brightness = 1;

  /** m_lightData.noiseAmplitude (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  noiseAmplitude = 0;

  /** m_lightData.noiseFrequency (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  noiseFrequency = 1;

  /** m_lightData.noiseOctaves (uint32_t) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.uint32
  noiseOctaves = 1;

  /** m_lightData.isVolumetric (bool) [READWRITE, NOTIFY, PERSIST] */
  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.boolean
  isVolumetric = false;

  @type.int32
  @type.enum("trinity.Tr2Light.LIGHT_TYPE")
  type = Tr2Light.SPOT_LIGHT;

}

