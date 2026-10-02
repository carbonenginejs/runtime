// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { meta } from "#schema";
import { EveSOFDataArea } from "../shared/EveSOFDataArea.js";

/** Carbon-authored hull mesh-area record. */
@meta.define({ className: "EveSOFDataHullArea", family: "eve" })
export class EveSOFDataHullArea
{
  static AreaType = EveSOFDataArea.AreaType;


  /** m_areaType (EveSOFDataArea::AreaType - enum AreaType) [READWRITE, PERSIST, ENUM] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.int32
  @meta.type.enum("trinity.EveSOFDataArea.AreaType")
  areaType = 0;

  /** m_textures (PEveSOFDataTextureVector) [READ, PERSIST] */
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("EveSOFDataTexture")
  textures = [];

  /** m_parameters (PEveSOFDataParameterVector) [READ, PERSIST] */
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("EveSOFDataParameter")
  parameters = [];

  /** m_index (uint32_t) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.uint32
  index = 0;

  /** m_count (uint32_t) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.uint32
  count = 1;

  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  name = "";

  /** m_shader (BlueSharedString) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  shader = "";

  /** m_blockedMaterials (uint32_t) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.uint32
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
