// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { edit, type } from "#schema";
import { CjsModel } from "#model";

/** Names per-layer pattern properties and provides searchable per-hull projections. */
@type.define({ className: "EveSOFDataPatternApplicationGroup", family: "eve" })
export class EveSOFDataPatternApplicationGroup extends CjsModel
{

  /** m_layer1Properties (EveSOFDataPatternLayerPropertiesPtr) [READWRITE, PERSIST] */
  @edit.persist
  @type.objectRef("EveSOFDataPatternLayerProperties")
  layer1Properties = null;

  /** m_layer2Properties (EveSOFDataPatternLayerPropertiesPtr) [READWRITE, PERSIST] */
  @edit.persist
  @type.objectRef("EveSOFDataPatternLayerProperties")
  layer2Properties = null;

  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  @edit.persist
  @type.string
  name = "";

  /** m_projections (PEveSOFDataPatternPerHullVector) [READ, PERSIST] */
  @edit.persist
  @type.list("EveSOFDataPatternPerHull")
  projections = [];

  /**
   * Locates a hull projection by case-insensitive hull name and returns null
   * when absent.
   */
  FindProjection(hullName)
  {
    const name = String(hullName ?? "").toUpperCase();
    return this.projections.find(value => String(value?.name ?? "").toUpperCase() === name) ?? null;
  }

}
