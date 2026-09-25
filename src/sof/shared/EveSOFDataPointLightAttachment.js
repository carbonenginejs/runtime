// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { edit, type } from "#schema";
import { CjsModel } from "#model";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";

/** Defines point-light placement, rotation, intensity, saturation, scale, noise, and profile data for an attachment. */
@type.define({ className: "EveSOFDataPointLightAttachment", family: "eve" })
export class EveSOFDataPointLightAttachment extends CjsModel
{

  /** m_saturation (float) [READWRITE, PERSIST] */
  @edit.persist
  @type.float32
  saturation = 1;

  /** m_intensity (float) [READWRITE, PERSIST] */
  @edit.persist
  @type.float32
  intensity = 1;

  /** m_translation (Vector3) [READWRITE, PERSIST] */
  @edit.persist
  @type.vec3
  translation = vec3.create();

  /** m_rotation (Quaternion) [READWRITE, PERSIST] */
  @edit.persist
  @type.quat
  rotation = quat.create();

  /** m_innerScaleMultiplier (float) [READWRITE, PERSIST] */
  @edit.persist
  @type.float32
  innerScaleMultiplier = 1;

  /** m_outerScaleMultiplier (float) [READWRITE, PERSIST] */
  @edit.persist
  @type.float32
  outerScaleMultiplier = 2;

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
  noiseOctaves = 1;

  /** m_lightProfilePath (std::wstring) [READWRITE, PERSIST] */
  @edit.persist
  @type.string
  lightProfilePath = "";

}
