// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { io, type } from "#schema";
import { CjsModel } from "#model";

/** EveSOFDataInstancedMesh (eve) - generated from schema shapeHash 24b147a0.... */
@type.define({ className: "EveSOFDataInstancedMesh", family: "eve" })
export class EveSOFDataInstancedMesh extends CjsModel
{

  /** m_displayModifier (DisplayQualityModifier - enum DisplayQualityModifier) [READWRITE, PERSIST, ENUM] */
  @io.persist
  @type.int32
  @type.enum("DisplayQualityModifier")
  displayModifier = 5;

  /** m_instances (PEveSofDataMeshInstanceStructureList) [READ, PERSIST] */
  @io.persist
  @type.list("EveSofDataMeshInstance")
  instances = [];

  /** m_textures (PEveSOFDataTextureVector) [READ, PERSIST] */
  @io.persist
  @type.list("EveSOFDataTexture")
  textures = [];

  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  name = "";

  /** m_lowestLodVisible (Tr2Lod - enum Tr2Lod) [READWRITE, PERSIST, ENUM] */
  @io.persist
  @type.int32
  @type.enum("Tr2Lod")
  lowestLodVisible = 0;

  /** m_geometryResPath (std::string) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  geometryResPath = "";

  /** m_shader (BlueSharedString) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  shader = "";

  static DisplayQualityModifier = Object.freeze({
    SHADER_LOW: 0,
    SHADER_LOWMID: 1,
    SHADER_MED: 2,
    SHADER_HIGHMID: 3,
    SHADER_HIGH: 4,
    SHADER_ALL: 5
  });

}
