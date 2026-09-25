// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { edit, type } from "#schema";
import { CjsModel } from "#model";
import { EveSOFDataFactionColorSet } from "../faction/EveSOFDataFactionColorSet.js";
import { mat4 } from "#math/mat4";
import { vec3 } from "#math/vec3";

/** Defines a faction-aware spotlight placement with group and booster policy, cone, flare, sprite, saturation, scale, and typed spotlight-light data. */
@type.define({ className: "EveSOFDataHullSpotlightSetItem", family: "eve" })
export class EveSOFDataHullSpotlightSetItem extends CjsModel
{
  static ColorType = EveSOFDataFactionColorSet.ColorType;


  /** m_colorType (SOFDataFactionColorChooser::ColorType - enum ColorType) [READWRITE, PERSIST, ENUM] */
  @edit.persist
  @type.int32
  @type.enum("trinity.SOFDataFactionColorChooser.ColorType")
  colorType = 12;

  /** m_boneIndex (int32_t) [READWRITE, PERSIST] */
  @edit.persist
  @type.int32
  boneIndex = 0;

  /** m_transform (Matrix) [READWRITE, PERSIST] */
  @edit.persist
  @type.mat4
  transform = mat4.create();

  /** m_boosterGainInfluence (bool) [READWRITE, PERSIST] */
  @edit.persist
  @type.boolean
  boosterGainInfluence = false;

  /** m_groupIndex (int32_t) [READWRITE, PERSIST] */
  @edit.persist
  @type.int32
  groupIndex = -1;

  /** m_spriteScale (Vector3) [READWRITE, PERSIST] */
  @edit.persist
  @type.vec3
  spriteScale = vec3.fromValues(1, 1, 1);

  /** m_coneIntensity (float) [READWRITE, PERSIST] */
  @edit.persist
  @type.float32
  coneIntensity = 0;

  /** m_flareIntensity (float) [READWRITE, PERSIST] */
  @edit.persist
  @type.float32
  flareIntensity = 0;

  /** m_spriteIntensity (float) [READWRITE, PERSIST] */
  @edit.persist
  @type.float32
  spriteIntensity = 0;

  /** m_saturation (float) [READWRITE, PERSIST] */
  @edit.persist
  @type.float32
  saturation = 1;

  /** m_light (EveSOFDataSpotLightAttachmentPtr) [READWRITE, PERSIST] */
  @edit.persist
  @type.objectRef("EveSOFDataSpotLightAttachment")
  light = null;

}
