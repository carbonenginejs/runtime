// Source: trinity/trinity/Lights/Tr2FactionLight.h
// Hand-maintained from Carbon source, promoted out of generated intake.
// Flattened LightData surface (2026-07-23 decision): the m_lightData.* Blue
// attributes are real decorated fields here, verified against
// lights/Tr2FactionLight.json (tools-core schema build).
import { impl, io, type } from "#schema";
import { withIEveInheritPropertiesOwner } from "../IEveInheritPropertiesOwner.js";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { Tr2Light } from "./Tr2Light.js";
import { hasFactionColor, resolveFactionColor } from "../resolveFactionColor.js";

/** A light whose colour is derived from a faction palette entry blended by a saturation factor, in addition to its own authored light attributes. */
@type.define({ className: "Tr2FactionLight", family: "eve/lights" })
export class Tr2FactionLight extends withIEveInheritPropertiesOwner(Tr2Light)
{

  #parentColorSet = null;

  /** Caller-owned faction-colour result; never aliases the SOF model. */
  #selectedFactionColor = vec4.createLinear();

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

  /** m_lightData.innerAngle (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  innerAngle = 0;

  /** m_lightData.outerAngle (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  outerAngle = 0;

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

  /** m_name (std::string) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  name = "";

  /** m_selectedColor (int) [READWRITE, PERSIST, NOTIFY, ENUM] */
  @io.notify
  @io.persist
  @type.int32
  factionColor = -1;

  /** m_saturation (float) [READWRITE, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.float32
  saturation = 1;

  /** m_isSpotlight (bool) [READWRITE, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.boolean
  isSpotlight = false;

  /** m_lightProfilePath (std::wstring) [READWRITE, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.string
  lightProfilePath = "";

  /** m_lightProfile (Tr2LightProfileResPtr) [READ] */
  @io.read
  @type.objectRef("Tr2LightProfileRes")
  lightProfile = null;

  type = Tr2Light.POINT_LIGHT;

  /**
   * Stores an inherited faction colour palette and recomputes the light's colour from it.
   */
  @impl.implemented
  SetInheritProperties(colorSet)
  {
    if (colorSet)
    {
      this.#parentColorSet = colorSet;
      this.SetLightColorFromFactionColor();
    }
  }

  /**
   * Recolours the light by blending its palette entry's luminance with the full palette colour by the saturation factor, reporting false when no palette entry is available.
   */
  @impl.implemented
  SetLightColorFromFactionColor()
  {
    if (!hasFactionColor(this.#parentColorSet, this.factionColor))
    {
      return false;
    }
    const color = resolveFactionColor(
      this.#selectedFactionColor,
      this.color,
      true,
      this.factionColor,
      this.#parentColorSet
    );
    const intensity = color[0] * 0.299 + color[1] * 0.587 + color[2] * 0.114;
    const saturation = Math.max(0, Number(this.saturation) || 0);
    this.color[0] = intensity + (color[0] - intensity) * saturation;
    this.color[1] = intensity + (color[1] - intensity) * saturation;
    this.color[2] = intensity + (color[2] - intensity) * saturation;
    this.color[3] = color[3] ?? 1;
    return true;
  }

  /**
   * The light's current colour.
   */
  @impl.implemented
  GetSelectedColor()
  {
    return this.color;
  }

  /**
   * Switches the light between spot and point when the spotlight flag is edited, and recomputes the faction-derived colour when the faction colour or saturation changes.
   */
  @impl.adapted
  @impl.reason("Browser property notifications identify the changed field by name rather than Carbon's Be::Var pointer.")
  OnModified(propertyName)
  {
    if (propertyName === "isSpotlight")
    {
      this.type = this.isSpotlight ? Tr2Light.SPOT_LIGHT : Tr2Light.POINT_LIGHT;
    }
    if (propertyName === "factionColor" || propertyName === "saturation")
    {
      this.SetLightColorFromFactionColor();
    }
    return true;
  }

  static LightDataFields = [
    "flags", "position", "rotation", "boneIndex", "radius", "innerRadius",
    "color", "brightness", "innerAngle", "outerAngle", "noiseAmplitude",
    "noiseFrequency", "noiseOctaves", "castsShadows", "isVolumetric"
  ];

}
