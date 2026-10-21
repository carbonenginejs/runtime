import { exposure as be } from "#be";
import { IRoot } from "../../global/blue/IRoot.js";
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData_Blue2.cpp:546-555
import { type, blue } from "#schema";

/** Names a generic variant and its optional hull-area override and transparency policy.
 * Native IRoot-only data with a self-only Blue table. Field initializers
 * preserve native defaults; no initialization, update or resource lifecycle
 * is required, and the native destructor is empty.
 * The hull area is an authored object reference, not a held resource.
 */
@be.define("EveSOFDataGenericVariant")
@blue.inherit(IRoot)

export class EveSOFDataGenericVariant extends IRoot
{

  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.string
  name = "";

  /** m_isTransparent (bool) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.boolean
  isTransparent = false;

  /** m_hullArea (EveSOFDataHullAreaPtr) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.object.ref("EveSOFDataHullArea")
  hullArea = null;

}

