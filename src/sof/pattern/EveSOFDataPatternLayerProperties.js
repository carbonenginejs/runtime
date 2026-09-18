// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { edit, type } from "#schema";
import { CjsModel } from "#model";

/** EveSOFDataPatternLayerProperties (eve) - generated from schema shapeHash 3f25edf9.... */
@type.define({ className: "EveSOFDataPatternLayerProperties", family: "eve" })
export class EveSOFDataPatternLayerProperties extends CjsModel
{

  static ProjectionType = Object.freeze({
    PROJECTION_REPEAT: 0,
    PROJECTION_CLAMP: 1,
    PROJECTION_BORDER: 2
  });

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
  @edit.persist
  @type.int32
  @type.enum("ProjectionType")
  projectionTypeU = 0;

  /** m_projectionTypeV (ProjectionType - enum ProjectionType) [READWRITE, PERSIST, ENUM] */
  @edit.persist
  @type.int32
  @type.enum("ProjectionType")
  projectionTypeV = 0;

  /** m_applicableAreas[EveSOFDataArea::AreaType::TYPE_PRIMARY] (bool) [READWRITE, PERSIST] */
  @edit.persist
  @type.boolean
  Primary = true;

  /** m_applicableAreas[EveSOFDataArea::AreaType::TYPE_GLASS] (bool) [READWRITE, PERSIST] */
  @edit.persist
  @type.boolean
  Glass = true;

  /** m_applicableAreas[EveSOFDataArea::AreaType::TYPE_SAILS] (bool) [READWRITE, PERSIST] */
  @edit.persist
  @type.boolean
  Sails = true;

  /** m_applicableAreas[EveSOFDataArea::AreaType::TYPE_REACTOR] (bool) [READWRITE, PERSIST] */
  @edit.persist
  @type.boolean
  Reactor = true;

  /** m_applicableAreas[EveSOFDataArea::AreaType::TYPE_DARKHULL] (bool) [READWRITE, PERSIST] */
  @edit.persist
  @type.boolean
  Darkhull = true;

  /** m_applicableAreas[EveSOFDataArea::AreaType::TYPE_ROCK] (bool) [READWRITE, PERSIST] */
  @edit.persist
  @type.boolean
  Rock = true;

  /** m_applicableAreas[EveSOFDataArea::AreaType::TYPE_MONUMENT] (bool) [READWRITE, PERSIST] */
  @edit.persist
  @type.boolean
  Monument = true;

  /** m_applicableAreas[EveSOFDataArea::AreaType::TYPE_ORNAMENT] (bool) [READWRITE, PERSIST] */
  @edit.persist
  @type.boolean
  Ornament = true;

  /** m_applicableAreas[EveSOFDataArea::AreaType::TYPE_SIMPLEPRIMARY] (bool) [READWRITE, PERSIST] */
  @edit.persist
  @type.boolean
  SimplePrimary = true;

  /** m_isTargetMtl1 (bool) [READWRITE, PERSIST] */
  @edit.persist
  @type.boolean
  isTargetMtl1 = true;

  /** m_isTargetMtl2 (bool) [READWRITE, PERSIST] */
  @edit.persist
  @type.boolean
  isTargetMtl2 = true;

  /** m_isTargetMtl3 (bool) [READWRITE, PERSIST] */
  @edit.persist
  @type.boolean
  isTargetMtl3 = true;

  /** m_isTargetMtl4 (bool) [READWRITE, PERSIST] */
  @edit.persist
  @type.boolean
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
