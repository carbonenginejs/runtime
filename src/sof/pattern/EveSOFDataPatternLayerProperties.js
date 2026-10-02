// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { meta } from "#schema";
import { blue } from "#blue";

/** Stores a pattern layer's projection modes, area types, and material slots. */
@meta.define({ className: "EveSOFDataPatternLayerProperties", family: "eve" })
export class EveSOFDataPatternLayerProperties
{

  static ProjectionType = {
    PROJECTION_REPEAT: 0,
    PROJECTION_CLAMP: 1,
    PROJECTION_BORDER: 2
  };

  static AreaTypes = Object.freeze([
    "Primary",
    "Glass",
    "Sails",
    "Reactor",
    "Darkhull",
    null,
    "Rock",
    "Monument",
    "Ornament",
    "SimplePrimary",
    null
  ]);

  /** m_projectionTypeU (ProjectionType - enum ProjectionType) [READWRITE, PERSIST, ENUM] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.int32
  @meta.type.enum("trinity.EveSOFDataPatternLayerProperties.ProjectionType")
  projectionTypeU = 0;

  /** m_projectionTypeV (ProjectionType - enum ProjectionType) [READWRITE, PERSIST, ENUM] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.int32
  @meta.type.enum("trinity.EveSOFDataPatternLayerProperties.ProjectionType")
  projectionTypeV = 0;

  /** m_applicableAreas[EveSOFDataArea::AreaType::TYPE_PRIMARY] (bool) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  Primary = true;

  /** m_applicableAreas[EveSOFDataArea::AreaType::TYPE_GLASS] (bool) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  Glass = true;

  /** m_applicableAreas[EveSOFDataArea::AreaType::TYPE_SAILS] (bool) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  Sails = true;

  /** m_applicableAreas[EveSOFDataArea::AreaType::TYPE_REACTOR] (bool) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  Reactor = true;

  /** m_applicableAreas[EveSOFDataArea::AreaType::TYPE_DARKHULL] (bool) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  Darkhull = true;

  /** m_applicableAreas[EveSOFDataArea::AreaType::TYPE_ROCK] (bool) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  Rock = true;

  /** m_applicableAreas[EveSOFDataArea::AreaType::TYPE_MONUMENT] (bool) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  Monument = true;

  /** m_applicableAreas[EveSOFDataArea::AreaType::TYPE_ORNAMENT] (bool) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  Ornament = true;

  /** m_applicableAreas[EveSOFDataArea::AreaType::TYPE_SIMPLEPRIMARY] (bool) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  SimplePrimary = true;

  /** m_isTargetMtl1 (bool) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  isTargetMtl1 = true;

  /** m_isTargetMtl2 (bool) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  isTargetMtl2 = true;

  /** m_isTargetMtl3 (bool) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  isTargetMtl3 = true;

  /** m_isTargetMtl4 (bool) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  isTargetMtl4 = true;

  /**
   * Honors an explicitly false named or enum-resolved area flag and treats
   * missing or unmapped slots as applicable.
   */
  IsApplicableToArea(areaType)
  {
    const name = typeof areaType === "number" ? this.constructor.AreaTypes[areaType] : areaType;
    return name ? this[name] !== false : true;
  }

}

// Native chooser labels and selection; the enum object retains all C++ members.
// Carbon reuses this chooser but declares this enum type independently.
blue.enums.Create("trinity.EveSOFDataPatternLayerProperties.ProjectionType", EveSOFDataPatternLayerProperties.ProjectionType, {
  source: "trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h", family: "eve", line: 500,
  chooserSource: "trinity/trinity/Eve/SpaceObjectFactory/EveSOFData_Blue.cpp:1152",
  chooser: [
    { name: "Repeat", value: EveSOFDataPatternLayerProperties.ProjectionType.PROJECTION_REPEAT, description: "Repeat pattern texture projection" },
    { name: "Clamp", value: EveSOFDataPatternLayerProperties.ProjectionType.PROJECTION_CLAMP, description: "Clamp the projection" },
    { name: "Border", value: EveSOFDataPatternLayerProperties.ProjectionType.PROJECTION_BORDER, description: "Border the projection" }
  ]
});
