// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import "../../global/blue/registerTrinityEnums.js";
import { edit, type } from "#schema";
import { CjsModel } from "#model";
import { ReflectionMode } from "#consts/graphics";

/** Names a generic hull category and records its reflection mode. */
@type.define({ className: "EveSOFDataGenericHullCategory", family: "eve" })
export class EveSOFDataGenericHullCategory extends CjsModel
{
  static ReflectionMode = ReflectionMode;


  /** m_reflectionMode (EntityComponents::ReflectionMode - enum ReflectionMode) [READWRITE, PERSIST, ENUM] */
  @edit.persist
  @type.int32
  @type.enum("trinity.EntityComponents.ReflectionMode")
  reflectionMode = ReflectionMode.REFLECT_NEVER;

  /** m_categoryName (BlueSharedString) [READWRITE, PERSIST] */
  @edit.persist
  @type.string
  name = "";

}
