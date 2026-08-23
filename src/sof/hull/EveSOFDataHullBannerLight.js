// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { io, type } from "#schema";
import { CjsModel } from "#model";

/** EveSOFDataHullBannerLight (eve) - generated from schema shapeHash a442806d.... */
@type.define({ className: "EveSOFDataHullBannerLight", family: "eve" })
export class EveSOFDataHullBannerLight extends CjsModel
{

  /** m_brightness (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  brightness = 1;

  /** m_innerRadiusMultiplier (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  innerRadiusMultiplier = 0.3;

  /** m_noiseAmplitude (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  noiseAmplitude = 0;

  /** m_noiseFrequency (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  noiseFrequency = 1;

  /** m_noiseOctaves (int32_t) [READWRITE, PERSIST] */
  @io.persist
  @type.int32
  noiceOctaves = 1;

  /** m_saturation (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  saturation = 1;

  /** m_radiusMultiplier (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  radiusMultiplier = 1;

}
