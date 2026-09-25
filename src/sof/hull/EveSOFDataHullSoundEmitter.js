// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { edit, type } from "#schema";
import { CjsModel } from "#model";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";

/** Defines a named sound-emitter event prefix, position, rotation, and attenuation settings. */
@type.define({ className: "EveSOFDataHullSoundEmitter", family: "eve" })
export class EveSOFDataHullSoundEmitter extends CjsModel
{

  /** m_name (std::string) [READWRITE, PERSIST] */
  @edit.persist
  @type.string
  name = "";

  /** m_prefix (std::wstring) [READWRITE, PERSIST] */
  @edit.persist
  @type.string
  prefix = "";

  /** m_position (Vector3) [READWRITE, PERSIST] */
  @edit.persist
  @type.vec3
  position = vec3.create();

  /** m_rotation (Quaternion) [READWRITE, PERSIST] */
  @edit.persist
  @type.quat
  rotation = quat.create();

  /** m_attenuationScalingFactor (float) [READWRITE, PERSIST] */
  @edit.persist
  @type.float32
  attenuationScalingFactor = 1;

}
