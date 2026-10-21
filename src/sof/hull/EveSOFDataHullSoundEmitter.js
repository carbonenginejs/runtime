import { exposure as be } from "#be";
import { IRoot } from "../../global/blue/IRoot.js";
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { type, blue } from "#schema";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";

/** Defines a named sound-emitter event prefix, position, rotation, and attenuation settings. */
@be.define("EveSOFDataHullSoundEmitter")
@blue.inherit(IRoot)
export class EveSOFDataHullSoundEmitter
{

  /** m_name (std::string) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.string
  name = "";

  /** m_prefix (std::wstring) [READWRITE, PERSIST]; JS stores both string widths as strings. */
  @blue.readwrite
  @blue.persist
  @type.wstring
  prefix = "";

  /** m_position (Vector3) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.vec3
  position = vec3.create();

  /** m_rotation (Quaternion) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.quat
  rotation = quat.create();

  /** m_attenuationScalingFactor (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  attenuationScalingFactor = 1;

}
