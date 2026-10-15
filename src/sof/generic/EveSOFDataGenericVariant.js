// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData_Blue2.cpp:546-555
import { type, blue } from "#schema";

/** Names a generic variant and its optional hull-area override and transparency policy.
 * Native IRoot-only data with a self-only Blue table. Field initializers
 * preserve native defaults; no initialization, update or resource lifecycle
 * is required, and the native destructor is empty.
 * The hull area is an authored object reference, not a held resource.
 */
@blue.define("EveSOFDataGenericVariant")
@blue.interface()
export class EveSOFDataGenericVariant
{

  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.string
  name = "";

  /** m_isTransparent (bool) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.boolean
  isTransparent = false;

  /** m_hullArea (EveSOFDataHullAreaPtr) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.rootRef("EveSOFDataHullArea")
  hullArea = null;

}

