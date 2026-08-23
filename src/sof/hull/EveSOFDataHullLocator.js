// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { io, type } from "#schema";
import { CjsModel } from "#model";
import { mat4 } from "#math/mat4";

/** EveSOFDataHullLocator (eve) - generated from schema shapeHash afb2ce68.... */
@type.define({ className: "EveSOFDataHullLocator", family: "eve" })
export class EveSOFDataHullLocator extends CjsModel
{

  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  name = "";

  /** m_transform (Matrix) [READWRITE, PERSIST] */
  @io.persist
  @type.mat4
  transform = mat4.create();

}
