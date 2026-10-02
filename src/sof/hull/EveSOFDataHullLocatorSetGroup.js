// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { meta } from "#schema";
import { IEveSOFDataHullLocatorSet } from "./IEveSOFDataHullLocatorSet.js";

/** Recursively groups polymorphic locator-set records under one name. */
@meta.define({ className: "EveSOFDataHullLocatorSetGroup", family: "eve" })
export class EveSOFDataHullLocatorSetGroup extends IEveSOFDataHullLocatorSet
{

  /** m_locatorSets (PIEveSOFDataHullLocatorSetVector) [READ, PERSIST] */
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("IEveSOFDataHullLocatorSet")
  locatorSets = [];

  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  name = "";

}
