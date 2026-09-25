// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { edit, type } from "#schema";
import { IEveSOFDataHullLocatorSet } from "./IEveSOFDataHullLocatorSet.js";

/** Provides a concrete named list of hull locators. */
@type.define({ className: "EveSOFDataHullLocatorSet", family: "eve" })
export class EveSOFDataHullLocatorSet extends IEveSOFDataHullLocatorSet
{

  /** m_locators (PEveSOFDataTransformVector) [READ, PERSIST] */
  @edit.persist
  @type.list("EveSOFDataTransform")
  locators = [];

  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  @edit.persist
  @type.string
  name = "";

}
