// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { io, type } from "#schema";
import { CjsModel } from "#model";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";

/** EveSOFDataPointLightAttachment (eve) - generated from schema shapeHash e6f58a3b.... */
@type.define({ className: "EveSOFDataPointLightAttachment", family: "eve" })
export class EveSOFDataPointLightAttachment extends CjsModel
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

  /** m_rotation (Quaternion) [READWRITE, PERSIST] */
  @io.persist
  @type.quat
  rotation = quat.create();

  /** m_innerScaleMultiplier (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  innerScaleMultiplier = 1;

  /** m_outerScaleMultiplier (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  outerScaleMultiplier = 2;

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
