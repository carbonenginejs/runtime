// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { edit, type } from "#schema";
import { IEveSOFDataHullLocatorSet } from "./IEveSOFDataHullLocatorSet.js";

/** Recursively groups polymorphic locator-set records under one name. */
@type.define({ className: "EveSOFDataHullLocatorSetGroup", family: "eve" })
export class EveSOFDataHullLocatorSetGroup extends IEveSOFDataHullLocatorSet
{

  /** m_locatorSets (PIEveSOFDataHullLocatorSetVector) [READ, PERSIST] */
  @edit.read
  @edit.persist
  @type.list("IEveSOFDataHullLocatorSet")
  locatorSets = [];

  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.string
  name = "";

}
