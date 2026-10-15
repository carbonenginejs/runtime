// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { type, blue } from "#schema";
import { IEveSOFDataHullLocatorSet } from "./IEveSOFDataHullLocatorSet.js";

/** Provides a concrete named list of hull locators. */
@blue.define("EveSOFDataHullLocatorSet")
export class EveSOFDataHullLocatorSet extends IEveSOFDataHullLocatorSet
{

  /** m_locators (PEveSOFDataTransformVector) [READ, PERSIST] */
  @blue.read
  @blue.persist
  @type.list("EveSOFDataTransform")
  locators = [];

  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.string
  name = "";

}
