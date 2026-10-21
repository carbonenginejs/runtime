import { exposure as be } from "#be";
import { IRoot } from "../../global/blue/IRoot.js";
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData_Blue2.cpp:409-416
import { type, blue } from "#schema";

/**
 * Provides the persisted wrapper used for a generic SOF string value.
 * Native IRoot-only data with a self-only Blue table. Constructor/destructor
 * are empty; no initialization, update or resource lifecycle is required.
 */
@be.define("EveSOFDataGenericString")
@blue.inherit(IRoot)

export class EveSOFDataGenericString extends IRoot
{

  /** m_str (std::string) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.string
  str = "";

}

