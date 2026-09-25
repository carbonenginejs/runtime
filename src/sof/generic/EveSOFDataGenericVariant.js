// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { edit, type } from "#schema";
import { CjsModel } from "#model";

/** Names a generic variant and its optional hull-area override and transparency policy. */
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
