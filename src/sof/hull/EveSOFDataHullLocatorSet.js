// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { meta } from "#schema";
import { IEveSOFDataHullLocatorSet } from "./IEveSOFDataHullLocatorSet.js";

/** Provides a concrete named list of hull locators. */
@meta.define({ className: "EveSOFDataHullLocatorSet", family: "eve" })
export class EveSOFDataHullLocatorSet extends IEveSOFDataHullLocatorSet
{

  /** m_locators (PEveSOFDataTransformVector) [READ, PERSIST] */
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("EveSOFDataTransform")
  locators = [];

  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  name = "";

}
