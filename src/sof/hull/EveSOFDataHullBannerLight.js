// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { edit, type } from "#schema";
import { CjsModel } from "#model";

/** Stores the brightness, radius, noise, saturation, and octave tuning for a banner light. */
@type.define({ className: "EveSOFDataHullBannerLight", family: "eve" })
export class EveSOFDataHullBannerLight extends CjsModel
{

  /** m_brightness (float) [READWRITE, PERSIST] */
  @edit.persist
  @type.float32
  brightness = 1;

  /** m_innerRadiusMultiplier (float) [READWRITE, PERSIST] */
  @edit.persist
  @type.float32
  innerRadiusMultiplier = 0.3;

  /** m_noiseAmplitude (float) [READWRITE, PERSIST] */
  @edit.persist
  @type.float32
  noiseAmplitude = 0;

  /** m_noiseFrequency (float) [READWRITE, PERSIST] */
  @edit.persist
  @type.float32
  noiseFrequency = 1;

  /** m_noiseOctaves (int32_t) [READWRITE, PERSIST] */
  @edit.persist
  @type.int32
  noiceOctaves = 1;

  /** m_saturation (float) [READWRITE, PERSIST] */
  @edit.persist
  @type.float32
  saturation = 1;

  /** m_radiusMultiplier (float) [READWRITE, PERSIST] */
  @edit.persist
  @type.float32
  radiusMultiplier = 1;

}
