import { exposure as be } from "#be";
import { IRoot } from "../../global/blue/IRoot.js";
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { type, blue } from "#schema";

/** Stores named faction hull-area parameters and provides case-insensitive lookup. */
@be.define("EveSOFDataFactionHullArea")

@blue.inherit(IRoot)
export class EveSOFDataFactionHullArea extends IRoot
{

  /** m_parameters (PEveSOFDataParameterVector) [READ, PERSIST] */
  @be.mapAttribute(be.READ | be.PERSIST)

  @type.list("EveSOFDataParameter")
  parameters = [];

  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

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
