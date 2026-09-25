// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { edit, type } from "#schema";
import { CjsModel } from "#model";
import { mat4 } from "#math/mat4";

/** Stores a named hull locator and its transformation matrix. */
@type.define({ className: "EveSOFDataHullLocator", family: "eve" })
export class EveSOFDataHullLocator extends CjsModel
{

  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.string
  name = "";

  /** m_transform (Matrix) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.mat4
  transform = mat4.create();

}
