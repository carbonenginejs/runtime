// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { edit, type } from "#schema";
import { CjsModel } from "#model";

/** EveSOFDataGenericVariant (eve) - generated from schema shapeHash fdb9ef63.... */
@type.define({ className: "EveSOFDataGenericVariant", family: "eve" })
export class EveSOFDataGenericVariant extends CjsModel
{

  /** m_hullArea (EveSOFDataHullAreaPtr) [READWRITE, PERSIST] */
  @edit.persist
  @type.objectRef("EveSOFDataHullArea")
  hullArea = null;

  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  @edit.persist
  @type.string
  name = "";

  /** m_isTransparent (bool) [READWRITE, PERSIST] */
  @edit.persist
  @type.boolean
  isTransparent = false;

}
