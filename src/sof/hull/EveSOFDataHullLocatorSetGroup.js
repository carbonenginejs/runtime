import { exposure as be } from "#be";
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { type, blue } from "#schema";
import { IEveSOFDataHullLocatorSet } from "./IEveSOFDataHullLocatorSet.js";

/** Recursively groups polymorphic locator-set records under one name. */
@be.define("EveSOFDataHullLocatorSetGroup")
@be.mapInterface(IEveSOFDataHullLocatorSet)
export class EveSOFDataHullLocatorSetGroup extends IEveSOFDataHullLocatorSet
{

  /** m_locatorSets (PIEveSOFDataHullLocatorSetVector) [READ, PERSIST] */
  @blue.read
  @blue.persist
  @type.list("IEveSOFDataHullLocatorSet")
  locatorSets = [];

  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.string
  name = "";

}
