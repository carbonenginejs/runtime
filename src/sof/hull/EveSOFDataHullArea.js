import { exposure as be } from "#be";
import { IRoot } from "../../global/blue/IRoot.js";
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { type, blue } from "#schema";
import { EveSOFDataArea } from "../shared/EveSOFDataArea.js";

/** Carbon-authored hull mesh-area record. */
@be.define("EveSOFDataHullArea")
@blue.inherit(IRoot)
export class EveSOFDataHullArea
{
  static AreaType = EveSOFDataArea.AreaType;


  /** m_areaType (EveSOFDataArea::AreaType - enum AreaType) [READWRITE, PERSIST, ENUM] */
  @blue.readwrite
  @blue.persist
  @type.int32
  @type.enum("trinity.EveSOFDataArea.AreaType")
  areaType = 0;

  /** m_textures (PEveSOFDataTextureVector) [READ, PERSIST] */
  @be.mapAttribute(be.READ | be.PERSIST)

  @type.list("EveSOFDataTexture")
  textures = [];

  /** m_parameters (PEveSOFDataParameterVector) [READ, PERSIST] */
  @be.mapAttribute(be.READ | be.PERSIST)

  @type.list("EveSOFDataParameter")
  parameters = [];

  /** m_index (uint32_t) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.uint32
  index = 0;

  /** m_count (uint32_t) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.uint32
  count = 1;

  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.string
  name = "";

  /** m_shader (BlueSharedString) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.string
  shader = "";

  /** m_blockedMaterials (uint32_t) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.uint32
  blockedMaterials = 0;

  /**
   * Populates a mesh-area configuration with this record's authored texture and
   * parameter values.
   */
  Assign(config = {})
  {
    config.textures = this.AssignTextures(config.textures);
    config.parameters = this.AssignParameters(config.parameters);
    return config;
  }

  /** Writes every authored mesh-area parameter into the supplied map. */
  AssignParameters(out = {})
  {
    for (const parameter of this.parameters) parameter.Assign(out);
    return out;
  }

  /** Writes every authored mesh-area texture path into the supplied map. */
  AssignTextures(out = {})
  {
    for (const texture of this.textures) texture.Assign(out);
    return out;
  }

}
