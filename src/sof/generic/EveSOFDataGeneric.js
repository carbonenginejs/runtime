import { exposure as be } from "#be";
import { IRoot } from "../../global/blue/IRoot.js";
// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { type, blue } from "#schema";
import { EveSOFDataArea } from "../shared/EveSOFDataArea.js";
import { EveSOFDataGenericShader } from "./EveSOFDataGenericShader.js";
import { ErrSOFAreaShaderNotFound } from "./ErrSOFAreaShaderNotFound.js";
import { ErrSOFDecalShaderNotFound } from "./ErrSOFDecalShaderNotFound.js";
import { ErrSOFMaterialPrefixNotFound } from "./ErrSOFMaterialPrefixNotFound.js";
import { ErrSOFPatternMaterialPrefixNotFound } from "./ErrSOFPatternMaterialPrefixNotFound.js";

/** Provides the top-level generic SOF configuration for shaders, material prefixes, decals, material tables, variants, categories, visibility, swarm, and damage data, with their named lookup helpers. */
@be.define("EveSOFDataGeneric")

@blue.inherit(IRoot)
export class EveSOFDataGeneric extends IRoot
{
  static AreaType = EveSOFDataArea.AreaType;


  /** m_turretAreaType (EveSOFDataArea::AreaType - enum AreaType) [READ, PERSIST, ENUM] */
  @blue.read
  @blue.persist
  @type.int32
  @type.enum("trinity.EveSOFDataArea.AreaType")
  turretAreaType = 0;

  /** m_decalMinScreenSizes[EveSOFDataHullDecalSetItem::USAGE_STANDARD] (float) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  decalMinScreenSizeSTANDARD = 0;

  /** m_decalMinScreenSizes[EveSOFDataHullDecalSetItem::USAGE_KILLCOUNTER] (float) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  decalMinScreenSizeKILLCOUNTER = 0;

  /** m_decalMinScreenSizes[EveSOFDataHullDecalSetItem::USAGE_HOLE] (float) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  decalMinScreenSizeHOLE = 0;

  /** m_decalMinScreenSizes[EveSOFDataHullDecalSetItem::USAGE_CYLINDRICAL] (float) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  decalMinScreenSizeCYLINDRICAL = 0;

  /** m_decalMinScreenSizes[EveSOFDataHullDecalSetItem::USAGE_GLOWCYLINDRICAL] (float) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  decalMinScreenSizeGLOWCYLINDRICAL = 0;

  /** m_decalMinScreenSizes[EveSOFDataHullDecalSetItem::USAGE_GLOWSTANDARD] (float) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  decalMinScreenSizeGLOWSTANDARD = 0;

  /** m_decalMinScreenSizes[EveSOFDataHullDecalSetItem::USAGE_LOGO] (float) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  decalMinScreenSizeLOGO = 0;

  /** m_shaderPrefix (std::string) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.string
  shaderPrefix = "";

  /** m_shaderPrefixAnimated (std::string) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.string
  shaderPrefixAnimated = "";

  /** m_variants (PEveSOFDataGenericVariantVector) [READ, PERSIST] */
  @be.mapAttribute(be.READ | be.PERSIST)

  @type.list("EveSOFDataGenericVariant")
  variants = [];

  /** m_hullCategories (PEveSOFDataGenericStringVector) [READ, PERSIST] */
  @be.mapAttribute(be.READ | be.PERSIST)

  @type.list("EveSOFDataGenericString")
  hullCategories = [];

  /** m_visibilityGroups (PEveSOFDataVisibilityGroupVector) [READ, PERSIST] */
  @be.mapAttribute(be.READ | be.PERSIST)

  @type.list("EveSOFDataVisibilityGroup")
  visibilityGroups = [];

  /** m_bannerShader (PEveSOFDataGenericShader) [READ, PERSIST] */
  @be.mapAttribute(be.READ | be.PERSIST)

  @type.object.embed("EveSOFDataGenericShader")
  bannerShader = new EveSOFDataGenericShader();

  /** m_swarm (EveSOFDataGenericSwarmPtr) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.object.ref("EveSOFDataGenericSwarm")
  swarm = null;

  /** m_damage (EveSOFDataGenericDamagePtr) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.object.ref("EveSOFDataGenericDamage")
  damage = null;

  /** m_hullDamage (EveSOFDataGenericHullDamagePtr) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.object.ref("EveSOFDataGenericHullDamage")
  hullDamage = null;

  /** m_genericWreckMaterial (EveSOFDataAreaMaterialPtr) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.object.ref("EveSOFDataAreaMaterial")
  genericWreckMaterial = null;

  /** m_areaShaders (PEveSOFDataGenericShaderVector) [READ, PERSIST] */
  @be.mapAttribute(be.READ | be.PERSIST)

  @type.list("EveSOFDataGenericShader")
  areaShaders = [];

  /** m_decalShaders (PEveSOFDataGenericDecalShaderVector) [READ, PERSIST] */
  @be.mapAttribute(be.READ | be.PERSIST)

  @type.list("EveSOFDataGenericDecalShader")
  decalShaders = [];

  /** m_materialPrefixes (PEveSOFDataGenericStringVector) [READ, PERSIST] */
  @be.mapAttribute(be.READ | be.PERSIST)

  @type.list("EveSOFDataGenericString")
  materialPrefixes = [];

  /** m_patternMaterialPrefixes (PEveSOFDataGenericStringVector) [READ, PERSIST] */
  @be.mapAttribute(be.READ | be.PERSIST)

  @type.list("EveSOFDataGenericString")
  patternMaterialPrefixes = [];

  /** m_hullCategoryData (PEveSOFDataGenericHullCategoryVector) [READ, PERSIST] */
  @be.mapAttribute(be.READ | be.PERSIST)

  @type.list("EveSOFDataGenericHullCategory")
  hullCategoriesData = [];

  /** m_areaShaderLocation (std::string) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.string
  areaShaderLocation = "";

  /** m_decalShaderLocation (std::string) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.string
  decalShaderLocation = "";

  /** m_resPathDefaultAlliance (std::string) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.string
  resPathDefaultAlliance = "";

  /** m_resPathDefaultCeo (std::string) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.string
  resPathDefaultCeo = "";

  /** m_resPathDefaultCorp (std::string) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.string
  resPathDefaultCorp = "";

  /**
   * Reports whether any decal shader declares NormalMap as a parent texture
   * requiring unpacked data.
   */
  HasUnpackedTextures()
  {
    return this.decalShaders.some(shader =>
      shader?.parentTextures?.some(value => value?.str === "NormalMap")
    );
  }

  /**
   * Tests a usage key against the named decal or area shader, preferring the
   * decal catalog when both contain it.
   */
  HasShaderUsage(shaderName, key)
  {
    if (!key) return false;
    const shader = findShader(this.decalShaders, shaderName)
      || findShader(this.areaShaders, shaderName);
    if (!shader) return false;
    return shader.HasUsage(key);
  }

  /**
   * Selects the animated or static filename prefix from the generic SOF
   * settings.
   */
  GetShaderPrefix(isAnimated = false)
  {
    return isAnimated ? this.shaderPrefixAnimated : this.shaderPrefix;
  }

  /**
   * Inserts the selected SOF prefix before a shader filename while preserving
   * its directory.
   */
  GetShaderPath(shader, isAnimated = false)
  {
    let path = String(shader ?? "");
    if (!path.startsWith("/")) path = "/" + path;
    const index = path.lastIndexOf("/");
    return path.slice(0, index + 1)
      + this.GetShaderPrefix(isAnimated)
      + path.slice(index + 1);
  }

  /**
   * Builds an area-effect resource path from the configured area location and
   * prefixed shader filename.
   */
  GetAreaShaderPath(shader, isAnimated = false)
  {
    return this.areaShaderLocation + this.GetShaderPath(shader, isAnimated);
  }

  /**
   * Builds a decal-effect resource path from the configured decal location and
   * prefixed shader filename.
   */
  GetDecalShaderPath(shader, isAnimated = false)
  {
    return this.decalShaderLocation + this.GetShaderPath(shader, isAnimated);
  }

  /**
   * Reports whether the area-shader catalog contains an entry with the requested
   * name.
   */
  HasAreaShader(name)
  {
    return Boolean(findShader(this.areaShaders, name));
  }

  /** Returns the named area-shader definition or throws ErrSOFAreaShaderNotFound. */
  GetAreaShader(name)
  {
    const shader = findShader(this.areaShaders, name);
    if (!shader) throw new ErrSOFAreaShaderNotFound({ name });
    return shader;
  }

  /**
   * Reports whether the decal-shader catalog contains an entry with the
   * requested name.
   */
  HasDecalShader(name)
  {
    return Boolean(findShader(this.decalShaders, name));
  }

  /**
   * Returns the named decal-shader definition or throws
   * ErrSOFDecalShaderNotFound.
   */
  GetDecalShader(name)
  {
    const shader = findShader(this.decalShaders, name);
    if (!shader) throw new ErrSOFDecalShaderNotFound({ name });
    return shader;
  }

  /**
   * Projects the authored material-prefix records into an ordered array of
   * strings.
   */
  GetMaterialPrefixes()
  {
    return this.materialPrefixes.map(value => value?.str ?? "");
  }

  /**
   * Projects the authored pattern-material-prefix records into their ordered
   * string values.
   */
  GetPatternMaterialPrefixes()
  {
    return this.patternMaterialPrefixes.map(value => value?.str ?? "");
  }

  /**
   * Returns the one-based material prefix, rejecting indices absent from the
   * authored catalog.
   */
  GetMaterialPrefix(index)
  {
    const value = this.materialPrefixes[Number(index) - 1];
    if (!value) throw new ErrSOFMaterialPrefixNotFound({ index });
    return value.str;
  }

  /**
   * Returns the one-based pattern-material prefix, rejecting indices absent from
   * its catalog.
   */
  GetPatternMaterialPrefix(index)
  {
    const value = this.patternMaterialPrefixes[Number(index) - 1];
    if (!value) throw new ErrSOFPatternMaterialPrefixNotFound({ index });
    return value.str;
  }

}

function findShader(values, name)
{
  if (!name || !Array.isArray(values)) return null;
  return values.find(value => value?.shader === name) || null;
}
