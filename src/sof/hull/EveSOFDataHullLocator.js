import { IRoot } from "../../global/blue/IRoot.js";
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { type, blue } from "#schema";
import { mat4 } from "#math/mat4";

/** Stores a named hull locator and its transformation matrix. */
@blue.define("EveSOFDataHullLocator")
@blue.inherit(IRoot)
export class EveSOFDataHullLocator
{

  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.string
  name = "";

  /** m_transform (Matrix) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.mat4
  transform = mat4.create();

}
