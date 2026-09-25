// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { edit, type } from "#schema";
import { CjsModel } from "#model";

/** Stores the hull, faction, race, pattern, and layout selections encoded by one parsed SOF DNA value. */
@type.define({ className: "EveSOFDNADescriptor", family: "eve" })
export class EveSOFDNADescriptor extends CjsModel
{

  /** m_material1 (std::string) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.string
  material1 = "";

  /** m_material2 (std::string) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.string
  material2 = "";

  /** m_material3 (std::string) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.string
  material3 = "";

  /** m_material4 (std::string) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.string
  material4 = "";

  /** m_faction (std::string) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.string
  faction = "";

  /** m_hull (std::string) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.string
  hull = "";

  /** m_layout (std::string) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.string
  layout = "";

  /** m_pattern (std::string) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.string
  pattern = "";

  /** m_race (std::string) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.string
  race = "";

}
