import { exposure as be } from "#be";
import { IRoot } from "../../global/blue/IRoot.js";
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { type, blue } from "#schema";

/** Names per-layer pattern properties and provides searchable per-hull projections. */
@be.define("EveSOFDataPatternApplicationGroup")

@blue.inherit(IRoot)
export class EveSOFDataPatternApplicationGroup
{

  /** m_layer1Properties (EveSOFDataPatternLayerPropertiesPtr) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.rootRef("EveSOFDataPatternLayerProperties")
  layer1Properties = null;

  /** m_layer2Properties (EveSOFDataPatternLayerPropertiesPtr) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.rootRef("EveSOFDataPatternLayerProperties")
  layer2Properties = null;

  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.string
  name = "";

  /** m_projections (PEveSOFDataPatternPerHullVector) [READ, PERSIST] */
  @blue.read
  @blue.persist
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
