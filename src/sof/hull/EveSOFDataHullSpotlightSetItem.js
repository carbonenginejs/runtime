import { exposure as be } from "#be";
import { IRoot } from "../../global/blue/IRoot.js";
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { type, blue } from "#schema";
import { EveSOFDataFactionColorSet } from "../faction/EveSOFDataFactionColorSet.js";
import { mat4 } from "#math/mat4";
import { vec3 } from "#math/vec3";

/** Defines a faction-aware spotlight placement with group and booster policy, cone, flare, sprite, saturation, scale, and typed spotlight-light data. */
@be.define("EveSOFDataHullSpotlightSetItem")
@be.inherit(IRoot)
export class EveSOFDataHullSpotlightSetItem extends IRoot
{
  static ColorType = EveSOFDataFactionColorSet.ColorType;


  /**
   * m_colorType (SOFDataFactionColorChooser::ColorType - enum ColorType) [READWRITE, PERSIST, ENUM]
   * Carbon: MAP_ATTRIBUTE_WITH_CHOOSER (trinity/trinity/Eve/SpaceObjectFactory/EveSOFData_Blue.cpp:314); chooser EveSOFDataFactionColorSetTypeChooser (trinity/trinity/Eve/SpaceObjectFactory/EveSOFData_Blue.cpp:10).
   */
  @be.mapAttributeWithChooser(be.READWRITE | be.PERSIST | be.ENUM, "trinity.SOFDataFactionColorChooser.ColorType")
  @type.int32
  @type.enum("trinity.SOFDataFactionColorChooser.ColorType")
  colorType = 12;

  /** m_boneIndex (int32_t) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.int32
  boneIndex = 0;

  /** m_transform (Matrix) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.mat4
  transform = mat4.create();

  /** m_boosterGainInfluence (bool) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.boolean
  boosterGainInfluence = false;

  /** m_groupIndex (int32_t) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.int32
  groupIndex = -1;

  /** m_spriteScale (Vector3) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.vec3
  spriteScale = vec3.fromValues(1, 1, 1);

  /** m_coneIntensity (float) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  coneIntensity = 0;

  /** m_flareIntensity (float) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  flareIntensity = 0;

  /** m_spriteIntensity (float) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  spriteIntensity = 0;

  /** m_saturation (float) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  saturation = 1;

  /** m_light (EveSOFDataSpotLightAttachmentPtr) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.object.ref("EveSOFDataSpotLightAttachment")
  light = null;

}
