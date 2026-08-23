// Source: trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { io, type } from "#schema";
import { CjsModel } from "#model";
import { EveSOFDataGenericShader } from "./EveSOFDataGenericShader.js";

/** EveSOFDataGeneric (eve) - generated from schema shapeHash 5f2c6dc7.... */
@type.define({ className: "EveSOFDataGeneric", family: "eve" })
export class EveSOFDataGeneric extends CjsModel
{

  /** m_turretAreaType (EveSOFDataArea::AreaType - enum AreaType) [READ, PERSIST, ENUM] */
  @io.persist
  @type.int32
  @type.enum("AreaType")
  turretAreaType = 0;

  /** m_decalMinScreenSizes[EveSOFDataHullDecalSetItem::USAGE_STANDARD] (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  decalMinScreenSizeSTANDARD = 0;

  /** m_decalMinScreenSizes[EveSOFDataHullDecalSetItem::USAGE_KILLCOUNTER] (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  decalMinScreenSizeKILLCOUNTER = 0;

  /** m_decalMinScreenSizes[EveSOFDataHullDecalSetItem::USAGE_HOLE] (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  decalMinScreenSizeHOLE = 0;

  /** m_decalMinScreenSizes[EveSOFDataHullDecalSetItem::USAGE_CYLINDRICAL] (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  decalMinScreenSizeCYLINDRICAL = 0;

  /** m_decalMinScreenSizes[EveSOFDataHullDecalSetItem::USAGE_GLOWCYLINDRICAL] (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  decalMinScreenSizeGLOWCYLINDRICAL = 0;

  /** m_decalMinScreenSizes[EveSOFDataHullDecalSetItem::USAGE_GLOWSTANDARD] (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  decalMinScreenSizeGLOWSTANDARD = 0;

  /** m_decalMinScreenSizes[EveSOFDataHullDecalSetItem::USAGE_LOGO] (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  decalMinScreenSizeLOGO = 0;

  /** m_shaderPrefix (std::string) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  shaderPrefix = "";

  /** m_shaderPrefixAnimated (std::string) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  shaderPrefixAnimated = "";

  /** m_variants (PEveSOFDataGenericVariantVector) [READ, PERSIST] */
  @io.persist
  @type.list("EveSOFDataGenericVariant")
  variants = [];

  /** m_hullCategories (PEveSOFDataGenericStringVector) [READ, PERSIST] */
  @io.persist
  @type.list("EveSOFDataGenericString")
  hullCategories = [];

  /** m_visibilityGroups (PEveSOFDataVisibilityGroupVector) [READ, PERSIST] */
  @io.persist
  @type.list("EveSOFDataVisibilityGroup")
  visibilityGroups = [];

  /** m_bannerShader (PEveSOFDataGenericShader) [READ, PERSIST] */
  @io.persist
  @type.struct("EveSOFDataGenericShader")
  bannerShader = new EveSOFDataGenericShader();

  /** m_swarm (EveSOFDataGenericSwarmPtr) [READWRITE, PERSIST] */
  @io.persist
  @type.objectRef("EveSOFDataGenericSwarm")
  swarm = null;

  /** m_damage (EveSOFDataGenericDamagePtr) [READWRITE, PERSIST] */
  @io.persist
  @type.objectRef("EveSOFDataGenericDamage")
  damage = null;

  /** m_hullDamage (EveSOFDataGenericHullDamagePtr) [READWRITE, PERSIST] */
  @io.persist
  @type.objectRef("EveSOFDataGenericHullDamage")
  hullDamage = null;

  /** m_genericWreckMaterial (EveSOFDataAreaMaterialPtr) [READWRITE, PERSIST] */
  @io.persist
  @type.objectRef("EveSOFDataAreaMaterial")
  genericWreckMaterial = null;

  /** m_areaShaders (PEveSOFDataGenericShaderVector) [READ, PERSIST] */
  @io.persist
  @type.list("EveSOFDataGenericShader")
  areaShaders = [];

  /** m_decalShaders (PEveSOFDataGenericDecalShaderVector) [READ, PERSIST] */
  @io.persist
  @type.list("EveSOFDataGenericDecalShader")
  decalShaders = [];

  /** m_materialPrefixes (PEveSOFDataGenericStringVector) [READ, PERSIST] */
  @io.persist
  @type.list("EveSOFDataGenericString")
  materialPrefixes = [];

  /** m_patternMaterialPrefixes (PEveSOFDataGenericStringVector) [READ, PERSIST] */
  @io.persist
  @type.list("EveSOFDataGenericString")
  patternMaterialPrefixes = [];

  /** m_hullCategoryData (PEveSOFDataGenericHullCategoryVector) [READ, PERSIST] */
  @io.persist
  @type.list("EveSOFDataGenericHullCategory")
  hullCategoriesData = [];

  /** m_areaShaderLocation (std::string) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  areaShaderLocation = "";

  /** m_decalShaderLocation (std::string) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  decalShaderLocation = "";

  /** m_resPathDefaultAlliance (std::string) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  resPathDefaultAlliance = "";

  /** m_resPathDefaultCeo (std::string) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  resPathDefaultCeo = "";

  /** m_resPathDefaultCorp (std::string) [READWRITE, PERSIST] */
  @io.persist
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

/** Reports that a requested area shader is absent from the generic SOF catalog. */
export class ErrSOFAreaShaderNotFound extends Error
{
  /**
   * Creates an area-shader lookup error carrying the requested shader name and
   * stable error code.
   */
  constructor({ name = "" } = {})
  {
    super("SOF area shader not found: " + name);
    this.name = "ErrSOFAreaShaderNotFound";
    this.code = "EVE_SOF_AREA_SHADER_NOT_FOUND";
    this.shader = name;
  }
}

/** Reports that a requested decal shader is absent from the generic SOF catalog. */
export class ErrSOFDecalShaderNotFound extends Error
{
  /**
   * Creates a decal-shader lookup error carrying the requested shader name and
   * stable error code.
   */
  constructor({ name = "" } = {})
  {
    super("SOF decal shader not found: " + name);
    this.name = "ErrSOFDecalShaderNotFound";
    this.code = "EVE_SOF_DECAL_SHADER_NOT_FOUND";
    this.shader = name;
  }
}

/**
 * Reports that a requested material prefix is absent from the generic SOF
 * catalog.
 */
export class ErrSOFMaterialPrefixNotFound extends Error
{
  /**
   * Creates a material-prefix lookup error carrying the requested one-based
   * index and stable error code.
   */
  constructor({ index = -1 } = {})
  {
    super("SOF material prefix not found: " + index);
    this.name = "ErrSOFMaterialPrefixNotFound";
    this.code = "EVE_SOF_MATERIAL_PREFIX_NOT_FOUND";
    this.index = index;
  }
}

/**
 * Reports that a requested pattern-material prefix is absent from the generic
 * SOF catalog.
 */
export class ErrSOFPatternMaterialPrefixNotFound extends Error
{
  /**
   * Creates a pattern-material-prefix lookup error carrying the requested
   * one-based index and stable error code.
   */
  constructor({ index = -1 } = {})
  {
    super("SOF pattern material prefix not found: " + index);
    this.name = "ErrSOFPatternMaterialPrefixNotFound";
    this.code = "EVE_SOF_PATTERN_MATERIAL_PREFIX_NOT_FOUND";
    this.index = index;
  }
}

function findShader(values, name)
{
  if (!name || !Array.isArray(values)) return null;
  return values.find(value => value?.shader === name) || null;
}
