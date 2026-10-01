// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { meta, types } from "#schema";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";

/** Defines a named sound-emitter event prefix, position, rotation, and attenuation settings. */
@meta.define({ className: "EveSOFDataHullSoundEmitter", family: "eve" })
export class EveSOFDataHullSoundEmitter
{

  /** m_name (std::string) [READWRITE, PERSIST] */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.string
  name = "";

  /** m_prefix (std::wstring) [READWRITE, PERSIST]; JS stores both string widths as strings. */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.wstring
  prefix = "";

  /** m_position (Vector3) [READWRITE, PERSIST] */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.vec3
  position = vec3.create();

  /** m_rotation (Quaternion) [READWRITE, PERSIST] */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.quat
  rotation = quat.create();

  /** m_attenuationScalingFactor (float) [READWRITE, PERSIST] */
  @meta.edit.readwrite
  @meta.edit.persist
  @types.float32
  attenuationScalingFactor = 1;

}
