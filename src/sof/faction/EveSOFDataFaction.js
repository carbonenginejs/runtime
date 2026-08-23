// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { io, type } from "#schema";
import { CjsModel } from "#model";

/** EveSOFDataFaction (eve) - generated from schema shapeHash 1e118b8a.... */
@type.define({ className: "EveSOFDataFaction", family: "eve" })
export class EveSOFDataFaction extends CjsModel
{

  /** m_areaTypes (EveSOFDataAreaPtr) [READWRITE, PERSIST] */
  @io.persist
  @type.objectRef("EveSOFDataArea")
  areaTypes = null;

  /** m_colorSet (EveSOFDataFactionColorSetPtr) [READWRITE, PERSIST] */
  @io.persist
  @type.objectRef("EveSOFDataFactionColorSet")
  colorSet = null;

  /** m_logoSet (EveSOFDataLogoSetPtr) [READWRITE, PERSIST] */
  @io.persist
  @type.objectRef("EveSOFDataLogoSet")
  logoSet = null;

  /** m_description (std::string) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  description = "";

  /** m_children (PEveSOFDataFactionChildVector) [READ, PERSIST] */
  @io.persist
  @type.list("EveSOFDataFactionChild")
  children = [];

  /** m_planeSets (PEveSOFDataFactionPlaneSetVector) [READ, PERSIST] */
  @io.persist
  @type.list("EveSOFDataFactionPlaneSet")
  planeSets = [];

  /** m_spotlightSets (PEveSOFDataFactionSpotlightSetVector) [READ, PERSIST] */
  @io.persist
  @type.list("EveSOFDataFactionSpotlightSet")
  spotlightSets = [];

  /** m_visibilityGroupSet (EveSOFDataFactionVisibilityGroupSetPtr) [READWRITE, PERSIST] */
  @io.persist
  @type.objectRef("EveSOFDataFactionVisibilityGroupSet")
  visibilityGroupSet = null;

  /** m_resPathInsert (std::string) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  resPathInsert = "";

  /** m_materialUsageMtl1 (int32_t) [READWRITE, PERSIST] */
  @io.persist
  @type.int32
  materialUsageMtl1 = 0;

  /** m_materialUsageMtl2 (int32_t) [READWRITE, PERSIST] */
  @io.persist
  @type.int32
  materialUsageMtl2 = 1;

  /** m_materialUsageMtl3 (int32_t) [READWRITE, PERSIST] */
  @io.persist
  @type.int32
  materialUsageMtl3 = 2;

  /** m_materialUsageMtl4 (int32_t) [READWRITE, PERSIST] */
  @io.persist
  @type.int32
  materialUsageMtl4 = 3;

  /** m_defaultPattern (EveSOFDataPatternLayerPtr) [READWRITE, PERSIST] */
  @io.persist
  @type.objectRef("EveSOFDataPatternLayer")
  defaultPattern = null;

  /** m_defaultPatternLayer1MaterialName (std::string) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  defaultPatternLayer1MaterialName = "";

  /** m_defaultPatternLayer2MaterialName (std::string) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  defaultPatternLayer2MaterialName = "";

  /** m_defaultPatternName (std::string) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  defaultPatternName = "";

  /** m_name (std::string) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  name = "";

  /**
   * Tests whether the attached color set defines the requested faction color
   * slot.
   */
  HasColorType(type)
  {
    return this.colorSet ? this.colorSet.Has(type) : false;
  }

  /**
   * Copies the requested or fallback faction color into an output vector, using
   * opaque white when neither exists.
   */
  GetColorType(type, out, fallback)
  {
    if (!out) throw new TypeError("GetColorType requires an output vector");
    if (this.HasColorType(type)) return this.colorSet.Get(type, out);
    if (fallback !== undefined && this.HasColorType(fallback))
    {
      return this.colorSet.Get(fallback, out);
    }
    out[0] = 1;
    out[1] = 1;
    out[2] = 1;
    out[3] = 1;
    return out;
  }

  /**
   * Tests whether the attached area table defines the requested faction material
   * slot.
   */
  HasAreaType(type)
  {
    return this.areaTypes ? this.areaTypes.Has(type) : false;
  }

  /**
   * Returns the requested or fallback area definition, or null when neither slot
   * exists.
   */
  GetAreaType(type, fallback)
  {
    if (this.HasAreaType(type)) return this.areaTypes.Get(type);
    if (fallback !== undefined && this.HasAreaType(fallback))
    {
      return this.areaTypes.Get(fallback);
    }
    return null;
  }

  /** Tests whether the attached logo set defines the requested faction logo slot. */
  HasLogoType(type)
  {
    return this.logoSet ? this.logoSet.Has(type) : false;
  }

  /**
   * Returns the requested or fallback logo definition, or null when neither slot
   * exists.
   */
  GetLogoType(type, fallback)
  {
    if (this.HasLogoType(type)) return this.logoSet.Get(type);
    if (fallback !== undefined && this.HasLogoType(fallback))
    {
      return this.logoSet.Get(fallback);
    }
    return null;
  }

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
