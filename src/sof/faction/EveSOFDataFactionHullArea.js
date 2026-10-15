// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { type, blue } from "#schema";

/** Stores named faction hull-area parameters and provides case-insensitive lookup. */
@blue.define("EveSOFDataFactionHullArea")
export class EveSOFDataFactionHullArea
{

  /** m_parameters (PEveSOFDataParameterVector) [READ, PERSIST] */
  @blue.read
  @blue.persist
  @type.list("EveSOFDataParameter")
  parameters = [];

  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.string
  name = "";

  /**
   * Performs a case-insensitive search for a nonempty parameter name and returns
   * the matching record or null.
   */
  FindParameter(name)
  {
    const normalized = String(name ?? "").toUpperCase();
    if (!normalized) return null;
    return this.parameters.find(value =>
      String(value?.name ?? "").toUpperCase() === normalized
    ) ?? null;
  }

}
