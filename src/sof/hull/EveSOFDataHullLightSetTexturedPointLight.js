// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { edit, type } from "#schema";
import { EveSOFDataHullLightSetItem } from "./EveSOFDataHullLightSetItem.js";

/** Extends a hull light item with a texture resource while hiding the inherited light-color schema field used by other light types. */
// Carbon derives this from EveSOFDataHullLightSetItem (EveSOFData.h:
// 1410-1417) and re-maps the base surface WITHOUT lightColor, adding
// texturePath (EveSOFData_Blue.cpp:1076-1094): a textured point light takes
// its color from the texture, not the faction color set.
@type.define({ className: "EveSOFDataHullLightSetTexturedPointLight", family: "eve" })
@type.hideInherited(["lightColor"])
export class EveSOFDataHullLightSetTexturedPointLight extends EveSOFDataHullLightSetItem
{

  /** m_data.texturePath (std::wstring) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.string
  texturePath = "";

}
