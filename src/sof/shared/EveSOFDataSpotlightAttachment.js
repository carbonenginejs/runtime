// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { io, type } from "#schema";
import { CjsModel } from "#model";
import { vec3 } from "#math/vec3";

/** EveSOFDataSpotLightAttachment (eve) - generated from schema shapeHash ace3b68a.... */
@type.define({ className: "EveSOFDataSpotLightAttachment", family: "eve" })
export class EveSOFDataSpotLightAttachment extends CjsModel
{

  /** m_saturation (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  saturation = 1;

  /** m_intensity (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  intensity = 1;

  /** m_translation (Vector3) [READWRITE, PERSIST] */
  @io.persist
  @type.vec3
  translation = vec3.create();

  /** m_innerAngleMultiplier (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  innerAngleMultiplier = 0.5;

  /** m_outerAngleMultiplier (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  outerAngleMultiplier = 1;

  /** m_innerScaleMultiplier (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  innerScaleMultiplier = 1;

  /** m_outerScaleMultiplier (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  outerScaleMultiplier = 1;

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
  noiseOctaves = 1;

  /** m_lightProfilePath (std::wstring) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  lightProfilePath = "";

}
