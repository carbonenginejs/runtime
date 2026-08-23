// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { io, type } from "#schema";
import { CjsModel } from "#model";

/** Carbon-authored hull mesh-area record. */
@type.define({ className: "EveSOFDataHullArea", family: "eve" })
export class EveSOFDataHullArea extends CjsModel
{

  /** m_areaType (EveSOFDataArea::AreaType - enum AreaType) [READWRITE, PERSIST, ENUM] */
  @io.persist
  @type.int32
  @type.enum("AreaType")
  areaType = 0;

  /** m_textures (PEveSOFDataTextureVector) [READ, PERSIST] */
  @io.persist
  @type.list("EveSOFDataTexture")
  textures = [];

  /** m_parameters (PEveSOFDataParameterVector) [READ, PERSIST] */
  @io.persist
  @type.list("EveSOFDataParameter")
  parameters = [];

  /** m_index (uint32_t) [READWRITE, PERSIST] */
  @io.persist
  @type.uint32
  index = 0;

  /** m_count (uint32_t) [READWRITE, PERSIST] */
  @io.persist
  @type.uint32
  count = 1;

  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  name = "";

  /** m_shader (BlueSharedString) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  shader = "";

  /** m_blockedMaterials (uint32_t) [READWRITE, PERSIST] */
  @io.persist
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
