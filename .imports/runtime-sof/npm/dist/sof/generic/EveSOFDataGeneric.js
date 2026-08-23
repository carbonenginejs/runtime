import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { EveSOFDataGenericShader as _EveSOFDataGenericSha } from './EveSOFDataGenericShader.js';

let _initClass, _init_turretAreaType, _init_extra_turretAreaType, _init_decalMinScreenSizeSTANDARD, _init_extra_decalMinScreenSizeSTANDARD, _init_decalMinScreenSizeKILLCOUNTER, _init_extra_decalMinScreenSizeKILLCOUNTER, _init_decalMinScreenSizeHOLE, _init_extra_decalMinScreenSizeHOLE, _init_decalMinScreenSizeCYLINDRICAL, _init_extra_decalMinScreenSizeCYLINDRICAL, _init_decalMinScreenSizeGLOWCYLINDRICAL, _init_extra_decalMinScreenSizeGLOWCYLINDRICAL, _init_decalMinScreenSizeGLOWSTANDARD, _init_extra_decalMinScreenSizeGLOWSTANDARD, _init_decalMinScreenSizeLOGO, _init_extra_decalMinScreenSizeLOGO, _init_shaderPrefix, _init_extra_shaderPrefix, _init_shaderPrefixAnimated, _init_extra_shaderPrefixAnimated, _init_variants, _init_extra_variants, _init_hullCategories, _init_extra_hullCategories, _init_visibilityGroups, _init_extra_visibilityGroups, _init_bannerShader, _init_extra_bannerShader, _init_swarm, _init_extra_swarm, _init_damage, _init_extra_damage, _init_hullDamage, _init_extra_hullDamage, _init_genericWreckMaterial, _init_extra_genericWreckMaterial, _init_areaShaders, _init_extra_areaShaders, _init_decalShaders, _init_extra_decalShaders, _init_materialPrefixes, _init_extra_materialPrefixes, _init_patternMaterialPrefixes, _init_extra_patternMaterialPrefixes, _init_hullCategoriesData, _init_extra_hullCategoriesData, _init_areaShaderLocation, _init_extra_areaShaderLocation, _init_decalShaderLocation, _init_extra_decalShaderLocation, _init_resPathDefaultAlliance, _init_extra_resPathDefaultAlliance, _init_resPathDefaultCeo, _init_extra_resPathDefaultCeo, _init_resPathDefaultCorp, _init_extra_resPathDefaultCorp;

/** EveSOFDataGeneric (eve) - generated from schema shapeHash 5f2c6dc7.... */
let _EveSOFDataGeneric;
class EveSOFDataGeneric extends CjsModel {
  static {
    ({
      e: [_init_turretAreaType, _init_extra_turretAreaType, _init_decalMinScreenSizeSTANDARD, _init_extra_decalMinScreenSizeSTANDARD, _init_decalMinScreenSizeKILLCOUNTER, _init_extra_decalMinScreenSizeKILLCOUNTER, _init_decalMinScreenSizeHOLE, _init_extra_decalMinScreenSizeHOLE, _init_decalMinScreenSizeCYLINDRICAL, _init_extra_decalMinScreenSizeCYLINDRICAL, _init_decalMinScreenSizeGLOWCYLINDRICAL, _init_extra_decalMinScreenSizeGLOWCYLINDRICAL, _init_decalMinScreenSizeGLOWSTANDARD, _init_extra_decalMinScreenSizeGLOWSTANDARD, _init_decalMinScreenSizeLOGO, _init_extra_decalMinScreenSizeLOGO, _init_shaderPrefix, _init_extra_shaderPrefix, _init_shaderPrefixAnimated, _init_extra_shaderPrefixAnimated, _init_variants, _init_extra_variants, _init_hullCategories, _init_extra_hullCategories, _init_visibilityGroups, _init_extra_visibilityGroups, _init_bannerShader, _init_extra_bannerShader, _init_swarm, _init_extra_swarm, _init_damage, _init_extra_damage, _init_hullDamage, _init_extra_hullDamage, _init_genericWreckMaterial, _init_extra_genericWreckMaterial, _init_areaShaders, _init_extra_areaShaders, _init_decalShaders, _init_extra_decalShaders, _init_materialPrefixes, _init_extra_materialPrefixes, _init_patternMaterialPrefixes, _init_extra_patternMaterialPrefixes, _init_hullCategoriesData, _init_extra_hullCategoriesData, _init_areaShaderLocation, _init_extra_areaShaderLocation, _init_decalShaderLocation, _init_extra_decalShaderLocation, _init_resPathDefaultAlliance, _init_extra_resPathDefaultAlliance, _init_resPathDefaultCeo, _init_extra_resPathDefaultCeo, _init_resPathDefaultCorp, _init_extra_resPathDefaultCorp],
      c: [_EveSOFDataGeneric, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveSOFDataGeneric",
      family: "eve"
    })], [[[io, io.persist, type, type.int32, void 0, type.enum("AreaType")], 16, "turretAreaType"], [[io, io.persist, type, type.float32], 16, "decalMinScreenSizeSTANDARD"], [[io, io.persist, type, type.float32], 16, "decalMinScreenSizeKILLCOUNTER"], [[io, io.persist, type, type.float32], 16, "decalMinScreenSizeHOLE"], [[io, io.persist, type, type.float32], 16, "decalMinScreenSizeCYLINDRICAL"], [[io, io.persist, type, type.float32], 16, "decalMinScreenSizeGLOWCYLINDRICAL"], [[io, io.persist, type, type.float32], 16, "decalMinScreenSizeGLOWSTANDARD"], [[io, io.persist, type, type.float32], 16, "decalMinScreenSizeLOGO"], [[io, io.persist, type, type.string], 16, "shaderPrefix"], [[io, io.persist, type, type.string], 16, "shaderPrefixAnimated"], [[io, io.persist, void 0, type.list("EveSOFDataGenericVariant")], 16, "variants"], [[io, io.persist, void 0, type.list("EveSOFDataGenericString")], 16, "hullCategories"], [[io, io.persist, void 0, type.list("EveSOFDataVisibilityGroup")], 16, "visibilityGroups"], [[io, io.persist, void 0, type.struct("EveSOFDataGenericShader")], 16, "bannerShader"], [[io, io.persist, void 0, type.objectRef("EveSOFDataGenericSwarm")], 16, "swarm"], [[io, io.persist, void 0, type.objectRef("EveSOFDataGenericDamage")], 16, "damage"], [[io, io.persist, void 0, type.objectRef("EveSOFDataGenericHullDamage")], 16, "hullDamage"], [[io, io.persist, void 0, type.objectRef("EveSOFDataAreaMaterial")], 16, "genericWreckMaterial"], [[io, io.persist, void 0, type.list("EveSOFDataGenericShader")], 16, "areaShaders"], [[io, io.persist, void 0, type.list("EveSOFDataGenericDecalShader")], 16, "decalShaders"], [[io, io.persist, void 0, type.list("EveSOFDataGenericString")], 16, "materialPrefixes"], [[io, io.persist, void 0, type.list("EveSOFDataGenericString")], 16, "patternMaterialPrefixes"], [[io, io.persist, void 0, type.list("EveSOFDataGenericHullCategory")], 16, "hullCategoriesData"], [[io, io.persist, type, type.string], 16, "areaShaderLocation"], [[io, io.persist, type, type.string], 16, "decalShaderLocation"], [[io, io.persist, type, type.string], 16, "resPathDefaultAlliance"], [[io, io.persist, type, type.string], 16, "resPathDefaultCeo"], [[io, io.persist, type, type.string], 16, "resPathDefaultCorp"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_resPathDefaultCorp(this);
  }
  /** m_turretAreaType (EveSOFDataArea::AreaType - enum AreaType) [READ, PERSIST, ENUM] */
  turretAreaType = _init_turretAreaType(this, 0);

  /** m_decalMinScreenSizes[EveSOFDataHullDecalSetItem::USAGE_STANDARD] (float) [READWRITE, PERSIST] */
  decalMinScreenSizeSTANDARD = (_init_extra_turretAreaType(this), _init_decalMinScreenSizeSTANDARD(this, 0));

  /** m_decalMinScreenSizes[EveSOFDataHullDecalSetItem::USAGE_KILLCOUNTER] (float) [READWRITE, PERSIST] */
  decalMinScreenSizeKILLCOUNTER = (_init_extra_decalMinScreenSizeSTANDARD(this), _init_decalMinScreenSizeKILLCOUNTER(this, 0));

  /** m_decalMinScreenSizes[EveSOFDataHullDecalSetItem::USAGE_HOLE] (float) [READWRITE, PERSIST] */
  decalMinScreenSizeHOLE = (_init_extra_decalMinScreenSizeKILLCOUNTER(this), _init_decalMinScreenSizeHOLE(this, 0));

  /** m_decalMinScreenSizes[EveSOFDataHullDecalSetItem::USAGE_CYLINDRICAL] (float) [READWRITE, PERSIST] */
  decalMinScreenSizeCYLINDRICAL = (_init_extra_decalMinScreenSizeHOLE(this), _init_decalMinScreenSizeCYLINDRICAL(this, 0));

  /** m_decalMinScreenSizes[EveSOFDataHullDecalSetItem::USAGE_GLOWCYLINDRICAL] (float) [READWRITE, PERSIST] */
  decalMinScreenSizeGLOWCYLINDRICAL = (_init_extra_decalMinScreenSizeCYLINDRICAL(this), _init_decalMinScreenSizeGLOWCYLINDRICAL(this, 0));

  /** m_decalMinScreenSizes[EveSOFDataHullDecalSetItem::USAGE_GLOWSTANDARD] (float) [READWRITE, PERSIST] */
  decalMinScreenSizeGLOWSTANDARD = (_init_extra_decalMinScreenSizeGLOWCYLINDRICAL(this), _init_decalMinScreenSizeGLOWSTANDARD(this, 0));

  /** m_decalMinScreenSizes[EveSOFDataHullDecalSetItem::USAGE_LOGO] (float) [READWRITE, PERSIST] */
  decalMinScreenSizeLOGO = (_init_extra_decalMinScreenSizeGLOWSTANDARD(this), _init_decalMinScreenSizeLOGO(this, 0));

  /** m_shaderPrefix (std::string) [READWRITE, PERSIST] */
  shaderPrefix = (_init_extra_decalMinScreenSizeLOGO(this), _init_shaderPrefix(this, ""));

  /** m_shaderPrefixAnimated (std::string) [READWRITE, PERSIST] */
  shaderPrefixAnimated = (_init_extra_shaderPrefix(this), _init_shaderPrefixAnimated(this, ""));

  /** m_variants (PEveSOFDataGenericVariantVector) [READ, PERSIST] */
  variants = (_init_extra_shaderPrefixAnimated(this), _init_variants(this, []));

  /** m_hullCategories (PEveSOFDataGenericStringVector) [READ, PERSIST] */
  hullCategories = (_init_extra_variants(this), _init_hullCategories(this, []));

  /** m_visibilityGroups (PEveSOFDataVisibilityGroupVector) [READ, PERSIST] */
  visibilityGroups = (_init_extra_hullCategories(this), _init_visibilityGroups(this, []));

  /** m_bannerShader (PEveSOFDataGenericShader) [READ, PERSIST] */
  bannerShader = (_init_extra_visibilityGroups(this), _init_bannerShader(this, new _EveSOFDataGenericSha()));

  /** m_swarm (EveSOFDataGenericSwarmPtr) [READWRITE, PERSIST] */
  swarm = (_init_extra_bannerShader(this), _init_swarm(this, null));

  /** m_damage (EveSOFDataGenericDamagePtr) [READWRITE, PERSIST] */
  damage = (_init_extra_swarm(this), _init_damage(this, null));

  /** m_hullDamage (EveSOFDataGenericHullDamagePtr) [READWRITE, PERSIST] */
  hullDamage = (_init_extra_damage(this), _init_hullDamage(this, null));

  /** m_genericWreckMaterial (EveSOFDataAreaMaterialPtr) [READWRITE, PERSIST] */
  genericWreckMaterial = (_init_extra_hullDamage(this), _init_genericWreckMaterial(this, null));

  /** m_areaShaders (PEveSOFDataGenericShaderVector) [READ, PERSIST] */
  areaShaders = (_init_extra_genericWreckMaterial(this), _init_areaShaders(this, []));

  /** m_decalShaders (PEveSOFDataGenericDecalShaderVector) [READ, PERSIST] */
  decalShaders = (_init_extra_areaShaders(this), _init_decalShaders(this, []));

  /** m_materialPrefixes (PEveSOFDataGenericStringVector) [READ, PERSIST] */
  materialPrefixes = (_init_extra_decalShaders(this), _init_materialPrefixes(this, []));

  /** m_patternMaterialPrefixes (PEveSOFDataGenericStringVector) [READ, PERSIST] */
  patternMaterialPrefixes = (_init_extra_materialPrefixes(this), _init_patternMaterialPrefixes(this, []));

  /** m_hullCategoryData (PEveSOFDataGenericHullCategoryVector) [READ, PERSIST] */
  hullCategoriesData = (_init_extra_patternMaterialPrefixes(this), _init_hullCategoriesData(this, []));

  /** m_areaShaderLocation (std::string) [READWRITE, PERSIST] */
  areaShaderLocation = (_init_extra_hullCategoriesData(this), _init_areaShaderLocation(this, ""));

  /** m_decalShaderLocation (std::string) [READWRITE, PERSIST] */
  decalShaderLocation = (_init_extra_areaShaderLocation(this), _init_decalShaderLocation(this, ""));

  /** m_resPathDefaultAlliance (std::string) [READWRITE, PERSIST] */
  resPathDefaultAlliance = (_init_extra_decalShaderLocation(this), _init_resPathDefaultAlliance(this, ""));

  /** m_resPathDefaultCeo (std::string) [READWRITE, PERSIST] */
  resPathDefaultCeo = (_init_extra_resPathDefaultAlliance(this), _init_resPathDefaultCeo(this, ""));

  /** m_resPathDefaultCorp (std::string) [READWRITE, PERSIST] */
  resPathDefaultCorp = (_init_extra_resPathDefaultCeo(this), _init_resPathDefaultCorp(this, ""));
  HasUnpackedTextures() {
    return this.decalShaders.some(shader => shader?.parentTextures?.some(value => value?.str === "NormalMap"));
  }
  HasShaderUsage(shaderName, key) {
    if (!key) return false;
    const shader = findShader(this.decalShaders, shaderName) || findShader(this.areaShaders, shaderName);
    return Boolean(shader?.HasUsage?.(key));
  }
  GetShaderPrefix(isAnimated = false) {
    return isAnimated ? this.shaderPrefixAnimated : this.shaderPrefix;
  }
  GetShaderPath(shader, isAnimated = false) {
    let path = String(shader ?? "");
    if (!path.startsWith("/")) path = "/" + path;
    const index = path.lastIndexOf("/");
    return path.slice(0, index + 1) + this.GetShaderPrefix(isAnimated) + path.slice(index + 1);
  }
  GetAreaShaderPath(shader, isAnimated = false) {
    return this.areaShaderLocation + this.GetShaderPath(shader, isAnimated);
  }
  GetDecalShaderPath(shader, isAnimated = false) {
    return this.decalShaderLocation + this.GetShaderPath(shader, isAnimated);
  }
  HasAreaShader(name) {
    return Boolean(findShader(this.areaShaders, name));
  }
  GetAreaShader(name) {
    const shader = findShader(this.areaShaders, name);
    if (!shader) throw new ErrSOFAreaShaderNotFound({
      name
    });
    return shader;
  }
  HasDecalShader(name) {
    return Boolean(findShader(this.decalShaders, name));
  }
  GetDecalShader(name) {
    const shader = findShader(this.decalShaders, name);
    if (!shader) throw new ErrSOFDecalShaderNotFound({
      name
    });
    return shader;
  }
  GetMaterialPrefixes() {
    return this.materialPrefixes.map(value => value?.str ?? "");
  }
  GetPatternMaterialPrefixes() {
    return this.patternMaterialPrefixes.map(value => value?.str ?? "");
  }
  GetMaterialPrefix(index) {
    const value = this.materialPrefixes[Number(index) - 1];
    if (!value) throw new ErrSOFMaterialPrefixNotFound({
      index
    });
    return value.str;
  }
  GetPatternMaterialPrefix(index) {
    const value = this.patternMaterialPrefixes[Number(index) - 1];
    if (!value) throw new ErrSOFPatternMaterialPrefixNotFound({
      index
    });
    return value.str;
  }
  static {
    _initClass();
  }
}
class ErrSOFAreaShaderNotFound extends Error {
  constructor({
    name = ""
  } = {}) {
    super("SOF area shader not found: " + name);
    this.name = "ErrSOFAreaShaderNotFound";
    this.code = "EVE_SOF_AREA_SHADER_NOT_FOUND";
    this.shader = name;
  }
}
class ErrSOFDecalShaderNotFound extends Error {
  constructor({
    name = ""
  } = {}) {
    super("SOF decal shader not found: " + name);
    this.name = "ErrSOFDecalShaderNotFound";
    this.code = "EVE_SOF_DECAL_SHADER_NOT_FOUND";
    this.shader = name;
  }
}
class ErrSOFMaterialPrefixNotFound extends Error {
  constructor({
    index = -1
  } = {}) {
    super("SOF material prefix not found: " + index);
    this.name = "ErrSOFMaterialPrefixNotFound";
    this.code = "EVE_SOF_MATERIAL_PREFIX_NOT_FOUND";
    this.index = index;
  }
}
class ErrSOFPatternMaterialPrefixNotFound extends Error {
  constructor({
    index = -1
  } = {}) {
    super("SOF pattern material prefix not found: " + index);
    this.name = "ErrSOFPatternMaterialPrefixNotFound";
    this.code = "EVE_SOF_PATTERN_MATERIAL_PREFIX_NOT_FOUND";
    this.index = index;
  }
}
function findShader(values, name) {
  if (!name || !Array.isArray(values)) return null;
  return values.find(value => value?.shader === name) || null;
}

export { ErrSOFAreaShaderNotFound, ErrSOFDecalShaderNotFound, ErrSOFMaterialPrefixNotFound, ErrSOFPatternMaterialPrefixNotFound, _EveSOFDataGeneric as EveSOFDataGeneric };
//# sourceMappingURL=EveSOFDataGeneric.js.map
