import { IRoot } from "../../global/blue/IRoot.js";
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import "#consts/trinity";
import { type, blue } from "#schema";
import { blue as be, EnumRegistrationType } from "#blue";
import { Tr2Lod } from "#consts/trinity";

/** Defines instanced-mesh geometry, shader, display and LOD policy, textures, and instance transforms. */
@blue.define("EveSOFDataInstancedMesh")
@blue.interface()
@blue.inherit(IRoot)
export class EveSOFDataInstancedMesh extends IRoot
{
  static Tr2Lod = Tr2Lod;


  /** m_displayModifier (DisplayQualityModifier - enum DisplayQualityModifier) [READWRITE, PERSIST, ENUM] */
  @blue.readwrite
  @blue.persist
  @type.int32
  @type.enum("trinity.EveSOFDataInstancedMesh.DisplayQualityModifier")
  displayModifier = 5;

  /** m_instances (PEveSofDataMeshInstanceStructureList) [READ, PERSIST] */
  @blue.read
  @blue.persist
  @type.structList("EveSofDataMeshInstance")
  instances = [];

  /** m_textures (PEveSOFDataTextureVector) [READ, PERSIST] */
  @blue.read
  @blue.persist
  @type.list("EveSOFDataTexture")
  textures = [];

  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.string
  name = "";

  /** m_lowestLodVisible (Tr2Lod - enum Tr2Lod) [READWRITE, PERSIST, ENUM] */
  @blue.readwrite
  @blue.persist
  @type.int32
  @type.enum("trinity.Tr2Lod")
  lowestLodVisible = 0;

  /** m_geometryResPath (std::string) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.path("TriGeometryRes")
  geometryResPath = "";

  /** m_shader (BlueSharedString) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.string
  shader = "";

  static DisplayQualityModifier = {
    SHADER_LOW: 0,
    SHADER_LOWMID: 1,
    SHADER_MED: 2,
    SHADER_HIGHMID: 3,
    SHADER_HIGH: 4,
    SHADER_ALL: 5
  };

}

// Native chooser labels and selection; the enum object retains all C++ members.
be.enums.Create("trinity.EveSOFDataInstancedMesh.DisplayQualityModifier", EveSOFDataInstancedMesh.DisplayQualityModifier, {
  exposedName: "DisplayModifierChooser", exposure: EnumRegistrationType.ENUM_REG_ENUM_OBJECT_ON_MODULE,
  chooser: [
    { name: "None_", value: EveSOFDataInstancedMesh.DisplayQualityModifier.SHADER_ALL, description: "Visible to users with all shader settings" },
    { name: "Medium_and_High", value: EveSOFDataInstancedMesh.DisplayQualityModifier.SHADER_HIGHMID, description: "Visible for users with shader settings on Medium or High" },
    { name: "Low_and_Medium", value: EveSOFDataInstancedMesh.DisplayQualityModifier.SHADER_LOWMID, description: "Visible for users with shader settings on Low or Medium" },
    { name: "High", value: EveSOFDataInstancedMesh.DisplayQualityModifier.SHADER_HIGH, description: "Only visible for users with shader settings on High" },
    { name: "Medium", value: EveSOFDataInstancedMesh.DisplayQualityModifier.SHADER_MED, description: "Only visible for users with shader settings on Medium" },
    { name: "Low", value: EveSOFDataInstancedMesh.DisplayQualityModifier.SHADER_LOW, description: "Only visible for users with shader settings on Low" }
  ]
});
