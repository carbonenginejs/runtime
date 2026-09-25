// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { edit, type } from "#schema";
import { blue, EnumRegistrationType } from "#blue";
import { CjsModel } from "#model";
import { EveSOFDataFactionColorSet } from "../faction/EveSOFDataFactionColorSet.js";
import { EveSOFDataLogoSet } from "../shared/EveSOFDataLogoSet.js";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";

/** Defines a logo or usage decal with faction color, bone and transform placement, mesh and material data, and single- or multi-hull index buffers. */
@type.define({ className: "EveSOFDataHullDecalSetItem", family: "eve" })
export class EveSOFDataHullDecalSetItem extends CjsModel
{
  static ColorType = EveSOFDataFactionColorSet.ColorType;

  static LogoType = EveSOFDataLogoSet.LogoType;


  static Usage = Object.freeze({
    USAGE_STANDARD: 0,
    USAGE_KILLCOUNTER: 1,
    USAGE_HOLE: 2,
    USAGE_CYLINDRICAL: 3,
    USAGE_GLOWCYLINDRICAL: 4,
    USAGE_GLOWSTANDARD: 5,
    USAGE_LOGO: 6,
    USAGE_MAX: 7
  });

  /** m_logoType (EveSOFDataLogoSet::LogoType - enum LogoType) [READWRITE, PERSIST, ENUM] */
  @edit.readwrite
  @edit.persist
  @type.int32
  @type.enum("trinity.EveSOFDataLogoSet.LogoType")
  logoType = 0;

  /** m_usage (Usage - enum Usage) [READWRITE, PERSIST, ENUM] */
  @edit.readwrite
  @edit.persist
  @type.int32
  @type.enum("trinity.EveSOFDataHullDecalSetItem.Usage")
  usage = 0;

  /** m_glowColorType (SOFDataFactionColorChooser::ColorType - enum ColorType) [READWRITE, PERSIST, ENUM] */
  @edit.readwrite
  @edit.persist
  @type.int32
  @type.enum("trinity.SOFDataFactionColorChooser.ColorType")
  glowColorType = 0;

  /** m_boneIndex (int32_t) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.int32
  boneIndex = -1;

  /** m_parameters (PEveSOFDataParameterVector) [READ, PERSIST] */
  @edit.read
  @edit.persist
  @type.list("EveSOFDataParameter")
  parameters = [];

  /** m_textures (PEveSOFDataTextureVector) [READ, PERSIST] */
  @edit.read
  @edit.persist
  @type.list("EveSOFDataTexture")
  textures = [];

  /** m_indexBuffers (PEveSOFDataDecalIndexBufferVector) [READ, PERSIST] */
  @edit.read
  @edit.persist
  @type.list("EveSOFDataDecalIndexBuffer")
  indexBuffers = [];

  /** m_multiHullIndexBuffers (PEveSOFDataMultiHullDecalIndexBuffersVector) [READ, PERSIST] */
  @edit.read
  @edit.persist
  @type.list("EveSOFDataMultiHullDecalIndexBuffers")
  multiHullIndexBuffers = [];

  /** m_name (std::string) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.string
  name = "";

  /** m_position (Vector3) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.vec3
  position = vec3.create();

  /** m_rotation (Quaternion) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.quat
  rotation = quat.create();

  /** m_scaling (Vector3) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.vec3
  scaling = vec3.fromValues(1, 1, 1);

  /** m_meshIndex (int32_t) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.int32
  meshIndex = -1;

}

// Native chooser labels and selection; the enum object retains all C++ members.
blue.enums.RegisterEnum("trinity.EveSOFDataHullDecalSetItem.Usage", EveSOFDataHullDecalSetItem.Usage, {
  source: "trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h", family: "eve", line: 1350,
  exposedName: "DecalUsage", exposure: EnumRegistrationType.ENUM_REG_ENUM_OBJECT_ON_MODULE,
  chooserSource: "trinity/trinity/Eve/SpaceObjectFactory/EveSOFData_Blue.cpp:1027",
  chooser: [
    { name: "Standard", value: EveSOFDataHullDecalSetItem.Usage.USAGE_STANDARD, description: "Standard decal" },
    { name: "KillCounter", value: EveSOFDataHullDecalSetItem.Usage.USAGE_KILLCOUNTER, description: "The killcounter decal" },
    { name: "Hole", value: EveSOFDataHullDecalSetItem.Usage.USAGE_HOLE, description: "Hole decal" },
    { name: "Cylindrical", value: EveSOFDataHullDecalSetItem.Usage.USAGE_CYLINDRICAL, description: "Cylindrical decal" },
    { name: "GlowCylindrical", value: EveSOFDataHullDecalSetItem.Usage.USAGE_GLOWCYLINDRICAL, description: "Glow cylindrical decal" },
    { name: "Glow", value: EveSOFDataHullDecalSetItem.Usage.USAGE_GLOWSTANDARD, description: "Glow decal" },
    { name: "Logo", value: EveSOFDataHullDecalSetItem.Usage.USAGE_LOGO, description: "Logo decal" }
  ]
});
