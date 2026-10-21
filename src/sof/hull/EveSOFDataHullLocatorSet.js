import { exposure as be } from "#be";
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { type, blue } from "#schema";
import { IEveSOFDataHullLocatorSet } from "./IEveSOFDataHullLocatorSet.js";

/** Provides a concrete named list of hull locators. */
@be.define("EveSOFDataHullLocatorSet")
@be.mapInterface(IEveSOFDataHullLocatorSet)
export class EveSOFDataHullLocatorSet extends IEveSOFDataHullLocatorSet
{

  /** m_locators (PEveSOFDataTransformVector) [READ, PERSIST] */
  @be.mapAttribute(be.READ | be.PERSIST)

  @type.list("EveSOFDataTransform")
  locators = [];

  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.string
  name = "";

}
