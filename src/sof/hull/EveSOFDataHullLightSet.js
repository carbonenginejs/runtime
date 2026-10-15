// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { type, blue } from "#schema";

/** Groups named hull light items and their visibility policy. */
@blue.define("EveSOFDataHullLightSet")
export class EveSOFDataHullLightSet
{

  /** m_name (std::string) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.string
  name = "";

  /** m_visibilityGroup (BlueSharedString) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.string
  visibilityGroup = "primary";

  /** m_items (PEveSOFDataHullLightSetItemVector) [READ, PERSIST] */
  @blue.read
  @blue.persist
  @type.list("EveSOFDataHullLightSetItem")
  items = [];

}
