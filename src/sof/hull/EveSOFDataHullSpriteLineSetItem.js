// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { edit, type } from "#schema";
import { CjsModel } from "#model";
import { EveSOFDataFactionColorSet } from "../faction/EveSOFDataFactionColorSet.js";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";

/** Defines a faction-aware sprite line with bone-relative transform, spacing, circle mode, blink, scale, falloff, intensity, saturation, and point-light data. */
@type.define({ className: "EveSOFDataHullSpriteLineSetItem", family: "eve" })
export class EveSOFDataHullSpriteLineSetItem extends CjsModel
{
  static ColorType = EveSOFDataFactionColorSet.ColorType;


  /** m_colorType (SOFDataFactionColorChooser::ColorType - enum ColorType) [READWRITE, PERSIST, ENUM] */
  @edit.persist
  @type.int32
  @type.enum("trinity.SOFDataFactionColorChooser.ColorType")
  colorType = 0;

  /** m_boneIndex (int32_t) [READWRITE, PERSIST] */
  @edit.persist
  @type.int32
  boneIndex = 0;

  /** m_position (Vector3) [READWRITE, PERSIST] */
  @edit.persist
  @type.vec3
  position = vec3.create();

  /** m_scaling (Vector3) [READWRITE, PERSIST] */
  @edit.persist
  @type.vec3
  scaling = vec3.fromValues(1, 1, 1);

  /** m_rotation (Quaternion) [READWRITE, PERSIST] */
  @edit.persist
  @type.quat
  rotation = quat.create();

  /** m_spacing (float) [READWRITE, PERSIST] */
  @edit.persist
  @type.float32
  spacing = 1;

  /** m_blinkRate (float) [READWRITE, PERSIST] */
  @edit.persist
  @type.float32
  blinkRate = 0.1;

  /** m_blinkPhase (float) [READWRITE, PERSIST] */
  @edit.persist
  @type.float32
  blinkPhase = 0;

  /** m_blinkPhaseShift (float) [READWRITE, PERSIST] */
  @edit.persist
  @type.float32
  blinkPhaseShift = 0;

  /** m_minScale (float) [READWRITE, PERSIST] */
  @edit.persist
  @type.float32
  minScale = 1;

  /** m_maxScale (float) [READWRITE, PERSIST] */
  @edit.persist
  @type.float32
  maxScale = 10;

  /** m_falloff (float) [READWRITE, PERSIST] */
  @edit.persist
  @type.float32
  falloff = 0;

  /** m_intensity (float) [READWRITE, PERSIST] */
  @edit.persist
  @type.float32
  intensity = 1;

  /** m_isCircle (bool) [READWRITE, PERSIST] */
  @edit.persist
  @type.boolean
  isCircle = false;

  /** m_saturation (float) [READWRITE, PERSIST] */
  @edit.persist
  @type.float32
  saturation = 1;

  /** m_light (EveSOFDataPointLightAttachmentPtr) [READWRITE, PERSIST] */
  @edit.persist
  @type.objectRef("EveSOFDataPointLightAttachment")
  light = null;

}
