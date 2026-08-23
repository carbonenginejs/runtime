// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { io, type } from "#schema";
import { CjsModel } from "#model";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";

/** EveSOFDataHullSoundEmitter (eve) - generated from schema shapeHash 7a1c55fe.... */
@type.define({ className: "EveSOFDataHullSoundEmitter", family: "eve" })
export class EveSOFDataHullSoundEmitter extends CjsModel
{

  /** m_name (std::string) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  name = "";

  /** m_prefix (std::wstring) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  prefix = "";

  /** m_position (Vector3) [READWRITE, PERSIST] */
  @io.persist
  @type.vec3
  position = vec3.create();

  /** m_rotation (Quaternion) [READWRITE, PERSIST] */
  @io.persist
  @type.quat
  rotation = quat.create();

  /** m_attenuationScalingFactor (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  attenuationScalingFactor = 1;

}
