// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { type, blue } from "#schema";

/** Aggregates a faction's area, color, logo, pattern, material-slot, visibility, plane, spotlight, child, and resource-path configuration. */
@blue.define("EveSOFDataFaction")
export class EveSOFDataFaction
{

  /** m_areaTypes (EveSOFDataAreaPtr) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.rootRef("EveSOFDataArea")
  areaTypes = null;

  /** m_colorSet (EveSOFDataFactionColorSetPtr) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.rootRef("EveSOFDataFactionColorSet")
  colorSet = null;

  /** m_logoSet (EveSOFDataLogoSetPtr) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.rootRef("EveSOFDataLogoSet")
  logoSet = null;

  /** m_description (std::string) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.string
  description = "";

  /** m_children (PEveSOFDataFactionChildVector) [READ, PERSIST] */
  @blue.read
  @blue.persist
  @type.list("EveSOFDataFactionChild")
  children = [];

  /** m_planeSets (PEveSOFDataFactionPlaneSetVector) [READ, PERSIST] */
  @blue.read
  @blue.persist
  @type.list("EveSOFDataFactionPlaneSet")
  planeSets = [];

  /** m_spotlightSets (PEveSOFDataFactionSpotlightSetVector) [READ, PERSIST] */
  @blue.read
  @blue.persist
  @type.list("EveSOFDataFactionSpotlightSet")
  spotlightSets = [];

  /** m_visibilityGroupSet (EveSOFDataFactionVisibilityGroupSetPtr) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.rootRef("EveSOFDataFactionVisibilityGroupSet")
  visibilityGroupSet = null;

  /** m_resPathInsert (std::string) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.string
  resPathInsert = "";

  /** m_materialUsageMtl1 (int32_t) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.int32
  materialUsageMtl1 = 0;

  /** m_materialUsageMtl2 (int32_t) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.int32
  materialUsageMtl2 = 1;

  /** m_materialUsageMtl3 (int32_t) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.int32
  materialUsageMtl3 = 2;

  /** m_materialUsageMtl4 (int32_t) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.int32
  materialUsageMtl4 = 3;

  /** m_defaultPattern (EveSOFDataPatternLayerPtr) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.rootRef("EveSOFDataPatternLayer")
  defaultPattern = null;

  /** m_defaultPatternLayer1MaterialName (std::string) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.string
  defaultPatternLayer1MaterialName = "";

  /** m_defaultPatternLayer2MaterialName (std::string) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.string
  defaultPatternLayer2MaterialName = "";

  /** m_defaultPatternName (std::string) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.string
  defaultPatternName = "";

  /** m_name (std::string) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.string
  name = "";

  /**
   * Tests whether the faction visibility table contains the requested group
   * name.
   */
  HasVisibilityGroup(name)
  {
    return this.visibilityGroupSet ? this.visibilityGroupSet.Has(name) : false;
  }

  /**
   * Applies the faction visibility table to an object's visibility-group
   * membership.
   */
  IsObjectVisible(value)
  {
    return this.visibilityGroupSet ? this.visibilityGroupSet.IsObjectVisible(value) : false;
  }

  /**
   * Selects the first authored plane-set override with the requested group
   * index, or null.
   */
  FindPlaneSetByGroupIndex(groupIndex)
  {
    return this.planeSets?.find(value => value?.groupIndex === groupIndex) ?? null;
  }

  /**
   * Selects the first authored spotlight-set override with the requested group
   * index, or null.
   */
  FindSpotlightSetByGroupIndex(groupIndex)
  {
    return this.spotlightSets?.find(value => value?.groupIndex === groupIndex) ?? null;
  }

}
