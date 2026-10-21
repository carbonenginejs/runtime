import { exposure as be } from "#be";
import { IRoot } from "../../global/blue/IRoot.js";
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { type, blue } from "#schema";

/** Stores the brightness, radius, noise, saturation, and octave tuning for a banner light. */
@be.define("EveSOFDataHullBannerLight")
@blue.inherit(IRoot)
export class EveSOFDataHullBannerLight
{

  /** m_brightness (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  brightness = 1;

  /** m_innerRadiusMultiplier (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  innerRadiusMultiplier = 0.3;

  /** m_noiseAmplitude (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  noiseAmplitude = 0;

  /** m_noiseFrequency (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  noiseFrequency = 1;

  /** m_noiseOctaves (int32_t) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.int32
  noiceOctaves = 1;

  /** m_saturation (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  saturation = 1;

  /** m_radiusMultiplier (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  radiusMultiplier = 1;

}
