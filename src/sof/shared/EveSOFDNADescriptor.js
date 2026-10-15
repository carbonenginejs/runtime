import { IRoot } from "../../global/blue/IRoot.js";
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { type, blue } from "#schema";

/** Stores the hull, faction, race, pattern, and layout selections encoded by one parsed SOF DNA value. */
@blue.define("EveSOFDNADescriptor")
@blue.interface()
@blue.inherit(IRoot)
export class EveSOFDNADescriptor
{

  /** m_material1 (std::string) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.string
  material1 = "";

  /** m_material2 (std::string) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.string
  material2 = "";

  /** m_material3 (std::string) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.string
  material3 = "";

  /** m_material4 (std::string) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.string
  material4 = "";

  /** m_faction (std::string) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.string
  faction = "";

  /** m_hull (std::string) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.string
  hull = "";

  /** m_layout (std::string) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.string
  layout = "";

  /** m_pattern (std::string) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.string
  pattern = "";

  /** m_race (std::string) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.string
  race = "";

}
