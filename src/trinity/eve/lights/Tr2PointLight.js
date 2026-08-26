// Source: trinity/trinity/Lights/Tr2PointLight.cpp
// Source: trinity/trinity/Lights/Tr2PointLight_Blue.cpp
// Flattened LightData surface (2026-07-23 decision): the m_lightData.* Blue
// attributes are real decorated fields here, verified against
// lights/Tr2PointLight.json (tools-core schema build).
import { io, type } from "#schema";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { Tr2Light } from "./Tr2Light.js";


/**
 * Omnidirectional light whose LightData attributes are flattened into persisted
 * Blue properties.
 */
@type.define({ className: "Tr2PointLight", family: "eve/lights" })
export class Tr2PointLight extends Tr2Light
{
  static LightDataFields = [
    "flags", "position", "rotation", "boneIndex", "radius", "innerRadius",
    "color", "brightness", "noiseAmplitude", "noiseFrequency",
    "noiseOctaves", "castsShadows", "isVolumetric"
  ];

  @io.persist
  @type.string
  name = "";

  @io.notify
  @io.persist
  @type.string
  lightProfilePath = "";

  @io.read
  @type.objectRef("Tr2LightProfileRes")
  lightProfile = null;

  /** m_lightData.castsShadows (PerLightShadowSetting) [READWRITE, PERSIST, NOTIFY, ENUM] */
  @io.notify
  @io.persist
  @type.int32
  @type.enum("PerLightShadowSetting")
  castsShadows = 0;

  /** m_lightData.flags (uint16_t) [READWRITE, PERSIST] */
  @io.persist
  @type.uint16
  flags = 1;

  /** m_lightData.position (Vector3) [READWRITE, PERSIST] */
  @io.persist
  @type.vec3
  position = vec3.create();

  /** m_lightData.rotation (Quaternion) [READWRITE, PERSIST] */
  @io.persist
  @type.quat
  rotation = quat.create();

  /** m_lightData.boneIndex (int32_t) [READWRITE, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.int32
  boneIndex = -1;

  /** m_lightData.radius (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  radius = 0;

  /** m_lightData.innerRadius (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  innerRadius = 0;

  /** m_lightData.color (Color) [READWRITE, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.color
  color = vec4.createLinear();

  /** m_lightData.brightness (float) [READWRITE, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.float32
  brightness = 1;

  /** m_lightData.noiseAmplitude (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  noiseAmplitude = 0;

  /** m_lightData.noiseFrequency (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  noiseFrequency = 1;

  /** m_lightData.noiseOctaves (uint32_t) [READWRITE, PERSIST] */
  @io.persist
  @type.uint32
  noiseOctaves = 1;

  /** m_lightData.isVolumetric (bool) [READWRITE, NOTIFY, PERSIST] */
  @io.notify
  @io.persist
  @type.boolean
  isVolumetric = false;

  @type.int32
  @type.enum("LIGHT_TYPE")
  type = Tr2Light.POINT_LIGHT;

}
