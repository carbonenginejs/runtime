import { IInitialize, INotify } from "#blue";
// Source: trinity/trinity/Lights/Tr2PointLight.cpp
// Source: trinity/trinity/Lights/Tr2PointLight_Blue.cpp
// Flattened LightData surface (2026-07-23 decision): the m_lightData.* Blue
// attributes are real decorated fields here, verified against
// lights/Tr2PointLight.json (tools-core schema build).
import { meta } from "#schema";
import { color } from "#math/color";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";
import { Tr2Light } from "./Tr2Light.js";


/**
 * Omnidirectional light whose LightData attributes are flattened into persisted
 * Blue properties.
 */
@meta.define({ className: "Tr2PointLight", family: "eve/lights" })
export class Tr2PointLight extends Tr2Light
{
  static LightDataFields = [
    "flags", "position", "rotation", "boneIndex", "radius", "innerRadius",
    "color", "brightness", "noiseAmplitude", "noiseFrequency",
    "noiseOctaves", "castsShadows", "isVolumetric"
  ];

  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  name = "";

  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.path
  lightProfilePath = "";

  @meta.blue.read
  @meta.type.objectRef("Tr2LightProfileRes")
  lightProfile = null;

  /** m_lightData.castsShadows (PerLightShadowSetting) [READWRITE, PERSIST, NOTIFY, ENUM] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.int32
  @meta.type.enum("trinity.PerLightShadowSetting")
  castsShadows = 0;

  /** m_lightData.flags (uint16_t) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.uint16
  flags = 1;

  /** m_lightData.position (Vector3) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec3
  position = vec3.create();

  /** m_lightData.rotation (Quaternion) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.quat
  rotation = quat.create();

  /** m_lightData.boneIndex (int32_t) [READWRITE, PERSIST, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.int32
  boneIndex = -1;

  /** m_lightData.radius (float) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  radius = 0;

  /** m_lightData.innerRadius (float) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  innerRadius = 0;

  /** m_lightData.color (Color) [READWRITE, PERSIST, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.color
  color = color.createLinear();

  /** m_lightData.brightness (float) [READWRITE, PERSIST, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  brightness = 1;

  /** m_lightData.noiseAmplitude (float) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  noiseAmplitude = 0;

  /** m_lightData.noiseFrequency (float) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.float32
  noiseFrequency = 1;

  /** m_lightData.noiseOctaves (uint32_t) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.uint32
  noiseOctaves = 1;

  /** m_lightData.isVolumetric (bool) [READWRITE, NOTIFY, PERSIST] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  isVolumetric = false;

  @meta.type.int32
  @meta.type.enum("trinity.Tr2Light.LIGHT_TYPE")
  type = Tr2Light.POINT_LIGHT;

}

meta.blue.interfaceTable({ interfaces: [Tr2PointLight, Tr2Light, IInitialize, INotify], chainTo: null })(Tr2PointLight, { kind: "class" });
