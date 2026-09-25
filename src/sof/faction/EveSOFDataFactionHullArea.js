// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { edit, type } from "#schema";
import { CjsModel } from "#model";

/** Stores named faction hull-area parameters and provides case-insensitive lookup. */
@type.define({ className: "EveSOFDataFactionHullArea", family: "eve" })
export class EveSOFDataFactionHullArea extends CjsModel
{

  /** m_parameters (PEveSOFDataParameterVector) [READ, PERSIST] */
  @edit.persist
  @type.list("EveSOFDataParameter")
  parameters = [];

  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  @edit.persist
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
