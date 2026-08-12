import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { TriBatchType, ReflectionMode } from '@carbonenginejs/runtime-utils/graphics';
import { EveSOFDataHull as _EveSOFDataHull } from './hull/EveSOFDataHull.js';
import { EveSOFDataArea as _EveSOFDataArea } from './shared/EveSOFDataArea.js';
import { EveSOFUtilsParameterName } from './shared/EveSOFUtilsParameterName.js';

let _initProto, _initClass, _init_dna, _init_extra_dna, _init_dataMgr, _init_extra_dataMgr, _init_hullDatas, _init_extra_hullDatas, _init_factionData, _init_extra_factionData, _init_raceData, _init_extra_raceData, _init_genericData, _init_extra_genericData, _init_patternData, _init_extra_patternData, _init_layoutData, _init_extra_layoutData, _init_customHullData, _init_extra_customHullData, _init_hullNames, _init_extra_hullNames, _init_factionName, _init_extra_factionName, _init_raceName, _init_extra_raceName, _init_parentBoundingSphere, _init_extra_parentBoundingSphere, _init_parentHullShapeEllipsoid, _init_extra_parentHullShapeEllipsoid, _init_isSkinned, _init_extra_isSkinned;
const COMMAND_NAMES = Object.freeze(["invalid", "material", "mesh", "respathinsert", "variant", "class", "pattern", "layout"]);
const BUILD_CLASSES = Object.freeze(["ship", "mobile", "stationary", "swarm", "extension"]);

/** Resolves a SOF DNA string against an EveSOFDataMgr. */
let _EveSOFDNA;
new class extends _identity {
  static [class EveSOFDNA extends CjsModel {
    static {
      ({
        e: [_init_dna, _init_extra_dna, _init_dataMgr, _init_extra_dataMgr, _init_hullDatas, _init_extra_hullDatas, _init_factionData, _init_extra_factionData, _init_raceData, _init_extra_raceData, _init_genericData, _init_extra_genericData, _init_patternData, _init_extra_patternData, _init_layoutData, _init_extra_layoutData, _init_customHullData, _init_extra_customHullData, _init_hullNames, _init_extra_hullNames, _init_factionName, _init_extra_factionName, _init_raceName, _init_extra_raceName, _init_parentBoundingSphere, _init_extra_parentBoundingSphere, _init_parentHullShapeEllipsoid, _init_extra_parentHullShapeEllipsoid, _init_isSkinned, _init_extra_isSkinned, _initProto],
        c: [_EveSOFDNA, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "EveSOFDNA",
        family: "eve"
      })], [[[type, type.string], 16, "dna"], [type.objectRef("EveSOFDataMgr"), 0, "dataMgr"], [type.list("EveSOFDataMgr::HullData"), 0, "hullDatas"], [type.objectRef("EveSOFDataMgr::FactionData"), 0, "factionData"], [type.objectRef("EveSOFDataMgr::RaceData"), 0, "raceData"], [type.objectRef("EveSOFDataMgr::GenericData"), 0, "genericData"], [type.objectRef("EveSOFDataMgr::PatternData"), 0, "patternData"], [type.list("EveSOFDataMgr::LayoutData"), 0, "layoutData"], [type.list("EveSOFDataMgr::HullData"), 0, "customHullData"], [type.list("std::string"), 0, "hullNames"], [[type, type.string], 16, "factionName"], [[type, type.string], 16, "raceName"], [type.rawStruct("CcpMath::Sphere"), 0, "parentBoundingSphere"], [type.rawStruct("CcpMath::AxisAlignedEllipsoid"), 0, "parentHullShapeEllipsoid"], [[type, type.boolean], 16, "isSkinned"], [[carbon, carbon.method, impl, impl.implemented], 18, "Setup"], [[carbon, carbon.method, impl, impl.implemented], 18, "IsValid"], [[carbon, carbon.method, impl, impl.implemented], 18, "ValidateContent"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetDnaString"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetMultiHullCount"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetHullNames"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetBuildClass"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetHullGeometryResPath"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetHullMeshAreas"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetHullDecalSets"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetHullLightSets"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetHullSpriteSets"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetHullSpotlightSets"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetFactionSpotlightSetData"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetHullPlaneSets"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetFactionPlaneSetData"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetHullSpriteLineSets"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetHullHazeSets"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetHullBanners"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetHullBannerSets"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetHullChildren"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetHullChildSets"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetHullInstancedMeshes"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetHullAnimations"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetHullSoundEmitters"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetHullControllers"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetModelRotationCurvePath"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetModelTranslationCurvePath"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetFactionChildData"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetGenericBannerShaderData"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetDecalMinScreenSize"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetHighestMeshAreaIndex"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetHullTurretLocators"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetHullLocatorSetNames"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetHullLocators"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetPlacementLocators"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetLayoutCount"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetLayoutData"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetLocatorCount"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetHullNextSubsystemOffset"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetHullAudioPosition"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetAreaShaderLocationResPath"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetDecalShaderLocationResPath"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetDecalShader"], [[carbon, carbon.method, impl, impl.implemented], 18, "IsHullUsingDecalSets"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetShaderPrefix"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetCompleteShaderPath"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetGenericAreaShaderData"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetGenericDecalShaderData"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetHullTextureWithMeshIndex"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetGenericDamageData"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetGenericHullDamageData"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetGenericSwarmProperties"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetRaceDamageData"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetRaceBoosterData"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetHullBoosterData"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetHullBoosterCount"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetImpactEffectType"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetImpactShieldShader"], [[carbon, carbon.method, impl, impl.implemented], 18, "ModifyTextureResPath"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetColorSet"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetLogo"], [[carbon, carbon.method, impl, impl.implemented], 18, "HasLogoSet"], [[carbon, carbon.method, impl, impl.implemented], 18, "IsInVisibilityData"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetMeshAreaParameter"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetFactionTurretParameters"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetPatternLayerCount"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetFactionalPatternApplicationData"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetHullPatternApplicationData"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetPatternApplicationData"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetPatternProjectionData"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetPatternLayerData"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetMaterialTargets"], [[carbon, carbon.method, impl, impl.implemented], 18, "IsPatternLayerApplicableToArea"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetReflectionMode"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetHullBoundingSphere"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetHullShapeEllipsoid"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetParentBoundingSphere"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetParentHullShapeEllipsoid"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetParentBoundingSphere"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetParentShapeEllipsoidInfo"], [[carbon, carbon.method, impl, impl.implemented], 18, "IsHullAnimated"], [[carbon, carbon.method, impl, impl.implemented], 18, "DisableAnimation"], [[carbon, carbon.method, impl, impl.implemented], 18, "DynamicBoundingSphereEnabled"], [[carbon, carbon.method, impl, impl.implemented], 18, "CastShadow"], [[carbon, carbon.method, impl, impl.implemented], 18, "HasDnaCommand"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetDnaCommandArgs"], [[carbon, carbon.method, impl, impl.implemented], 18, "UsingSof6"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetFactionName"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetRaceName"]], 0, void 0, CjsModel));
    }
    dna = (_initProto(this), _init_dna(this, ""));
    dataMgr = (_init_extra_dna(this), _init_dataMgr(this, null));
    hullDatas = (_init_extra_dataMgr(this), _init_hullDatas(this, []));
    factionData = (_init_extra_hullDatas(this), _init_factionData(this, null));
    raceData = (_init_extra_factionData(this), _init_raceData(this, null));
    genericData = (_init_extra_raceData(this), _init_genericData(this, null));
    patternData = (_init_extra_genericData(this), _init_patternData(this, null));
    layoutData = (_init_extra_patternData(this), _init_layoutData(this, []));
    customHullData = (_init_extra_layoutData(this), _init_customHullData(this, []));
    hullNames = (_init_extra_customHullData(this), _init_hullNames(this, []));
    factionName = (_init_extra_hullNames(this), _init_factionName(this, ""));
    raceName = (_init_extra_factionName(this), _init_raceName(this, ""));
    parentBoundingSphere = (_init_extra_raceName(this), _init_parentBoundingSphere(this, null));
    parentHullShapeEllipsoid = (_init_extra_parentBoundingSphere(this), _init_parentHullShapeEllipsoid(this, null));
    isSkinned = (_init_extra_parentHullShapeEllipsoid(this), _init_isSkinned(this, false));
    #commands = (_init_extra_isSkinned(this), new Map());
    #parseError = null;

    /**
     * Resolves either a complete DNA string or Carbon's layout descriptor form.
     */
    Setup(dnaOrLayout, dataOrDescriptor, parent = null, dataMgr = null) {
      if (dataOrDescriptor && typeof dataOrDescriptor.GetHullData === "function" && dataMgr === null) {
        this.#setupFromString(String(dnaOrLayout ?? ""), dataOrDescriptor);
        return;
      }
      this.#setupFromDescriptor(String(dnaOrLayout ?? ""), dataOrDescriptor, parent, dataMgr);
    }

    /** Returns whether the three required catalog selections resolved. */
    IsValid() {
      return this.hullDatas.length > 0 && this.factionData !== null && this.raceData !== null;
    }

    /** Returns the stable parse failure used by non-rendering adapters. */
    GetParseError() {
      return this.#parseError;
    }

    /** Performs Carbon's slow command validation with unsafe C++ cases guarded. */
    ValidateContent() {
      if (!this.IsValid() || this.#parseError) return false;
      for (const [name, args] of this.#commands) {
        switch (name) {
          case "material":
            if (args.length !== this.genericData.materialPrefixes.length) return false;
            if (args.some(value => value !== "none" && !this.dataMgr.HasMaterialData(value))) return false;
            break;
          // `mesh` carries one material per material prefix, exactly like
          // `material`, and it is the spelling live EVE skins are authored with.
          // The Carbon snapshot at
          // trinity/trinity/Eve/SpaceObjectFactory/EveSOFDNA.cpp validates
          // CMD_MESH as a single argument alongside CMD_RESPATHINSERT; that is a
          // deliberate deviation, because real authored DNA fails it. See
          // ccpwgl's legacy reader indexing `commands.mesh[materialIndex]`
          // against `generic.materialPrefixes` for independent confirmation.
          case "mesh":
          case "material":
            if (args.length !== this.genericData.materialPrefixes.length) return false;
            if (args.some(value => value !== "none" && !this.dataMgr.HasMaterialData(value))) return false;
            break;
          case "respathinsert":
            if (args.length !== 1) return false;
            break;
          case "variant":
            if (args.length !== 1 || !this.genericData.variants.has(args[0])) return false;
            break;
          case "class":
            if (args.length !== 1 || !BUILD_CLASSES.includes(args[0])) return false;
            break;
          case "pattern":
            if (args.length !== 3 || !this.dataMgr.HasPatternData(args[0])) return false;
            if (args[1] !== "none" && !this.dataMgr.HasMaterialData(args[1])) return false;
            if (args[2] !== "none" && !this.dataMgr.HasMaterialData(args[2])) return false;
            break;
          case "layout":
            if (args.length === 0 || args.some(value => !this.dataMgr.HasLayoutData(value))) return false;
            break;
          default:
            return false;
        }
      }
      return true;
    }
    GetDnaString() {
      return this.dna;
    }
    GetMultiHullCount() {
      return this.hullDatas.length;
    }
    GetHullNames() {
      return this.hullNames;
    }
    GetBuildClass() {
      const args = this.GetDnaCommandArgs(_EveSOFDNA.DnaCommand.CMD_CLASS);
      if (args?.length) {
        const index = BUILD_CLASSES.indexOf(args[0]);
        if (index !== -1) return index;
      }
      return this.hullDatas[0]?.buildClass ?? 0;
    }
    GetHullGeometryResPath() {
      if (this.hullDatas.length === 0) return "";
      if (this.hullDatas.length === 1) return this.hullDatas[0].geometryResFilePath ?? "";
      let result = this.hullDatas[0].geometryResFilePath ?? "";
      const variantNumber = this.hullNames.map(name => name.slice(-1)).join("");
      const nameParts = this.hullNames[0].split("_");
      const variant = nameParts[nameParts.length - 1];
      if (variant) {
        result = result.replace(`${variant}.gr2`, `${variantNumber}.gr2`);
        result = result.replace(`${variant}/`, "all/");
      }
      return result;
    }
    GetHullMeshAreas(batchType, hullIndex = 0) {
      const hull = this.hullDatas[hullIndex];
      if (!hull) return null;
      switch (batchType) {
        case TriBatchType.TRIBATCHTYPE_OPAQUE:
          return hull.opaqueAreas;
        case TriBatchType.TRIBATCHTYPE_DECAL:
          return hull.decalAreas;
        case TriBatchType.TRIBATCHTYPE_TRANSPARENT:
          return hull.transparentAreas;
        case TriBatchType.TRIBATCHTYPE_ADDITIVE:
          return hull.additiveAreas;
        case TriBatchType.TRIBATCHTYPE_DISTORTION:
          return hull.distortionAreas;
        default:
          return null;
      }
    }
    GetHullDecalSets(hullIndex = 0) {
      return this.hullDatas[hullIndex]?.hullDecalSets ?? [];
    }
    GetHullLightSets(hullIndex = 0) {
      return this.hullDatas[hullIndex]?.hullLightSets ?? [];
    }
    GetHullSpriteSets(hullIndex = 0) {
      return this.hullDatas[hullIndex]?.spriteSets ?? [];
    }
    GetHullSpotlightSets(hullIndex = 0) {
      return this.hullDatas[hullIndex]?.spotlightSets ?? [];
    }
    GetFactionSpotlightSetData(groupIndex) {
      if (Number(groupIndex) === -1) return null;
      return this.factionData?.spotlightSetsColors?.get(Number(groupIndex)) ?? null;
    }
    GetHullPlaneSets(hullIndex = 0) {
      return this.hullDatas[hullIndex]?.planeSets ?? [];
    }
    GetFactionPlaneSetData(groupIndex) {
      if (Number(groupIndex) === -1) return null;
      return this.factionData?.planeSetsColors?.get(Number(groupIndex)) ?? null;
    }
    GetHullSpriteLineSets(hullIndex = 0) {
      return this.hullDatas[hullIndex]?.spriteLineSets ?? [];
    }
    GetHullHazeSets(hullIndex = 0) {
      return this.hullDatas[hullIndex]?.hazeSets ?? [];
    }
    GetHullBanners(hullIndex = 0) {
      return this.hullDatas[hullIndex]?.banners ?? [];
    }
    GetHullBannerSets(hullIndex = 0) {
      return this.hullDatas[hullIndex]?.bannerSets ?? [];
    }

    /** Returns legacy hull children from Carbon's first-hull-only path. */
    GetHullChildren() {
      return this.hullDatas[0]?.children ?? [];
    }

    /** Returns SOF6 child sets from Carbon's first-hull-only path. */
    GetHullChildSets() {
      return this.hullDatas[0]?.childSets ?? [];
    }

    /** Returns instanced attachments from Carbon's first-hull-only path. */
    GetHullInstancedMeshes() {
      return this.hullDatas[0]?.instancedMeshes ?? [];
    }

    /** Returns legacy animation declarations from Carbon's first hull. */
    GetHullAnimations() {
      return this.hullDatas[0]?.animations ?? [];
    }
    GetHullSoundEmitters() {
      return this.hullDatas[0]?.soundEmitters ?? [];
    }
    GetHullControllers() {
      return this.hullDatas[0]?.controllers ?? [];
    }
    GetModelRotationCurvePath() {
      return this.hullDatas[0]?.modelRotationCurvePath || null;
    }
    GetModelTranslationCurvePath() {
      return this.hullDatas[0]?.modelTranslationCurvePath || null;
    }

    /** Gets the faction visibility override for one legacy child group. */
    GetFactionChildData(groupIndex) {
      const index = Number(groupIndex);
      if (index === -1) return null;
      return this.factionData?.factionChildren?.get(index) ?? null;
    }
    GetGenericBannerShaderData() {
      return this.genericData?.bannerShader ?? null;
    }

    /** Returns Carbon's decal minimum screen size for one HullDecalSetItem Usage. */
    GetDecalMinScreenSize(usage) {
      return this.genericData?.decalMinScreenSize?.[Number(usage)];
    }
    GetHighestMeshAreaIndex(batchType, hullIndex = 0) {
      if (batchType !== TriBatchType.TRIBATCHTYPE_OPAQUE) return 0;
      let highest = 0;
      for (const area of this.GetHullMeshAreas(batchType, hullIndex) ?? []) {
        highest = Math.max(highest, area.index);
      }
      return highest;
    }
    GetHullTurretLocators(hullIndex = 0) {
      return this.hullDatas[hullIndex]?.locatorTurrets ?? [];
    }
    GetHullLocatorSetNames(hullIndex = 0) {
      const locatorSets = this.hullDatas[hullIndex]?.locatorSets;
      return locatorSets instanceof Map ? [...locatorSets.keys()].sort() : [];
    }
    GetHullLocators(setName, hullIndex = 0) {
      const locatorSets = this.hullDatas[hullIndex]?.locatorSets;
      return locatorSets instanceof Map ? locatorSets.get(String(setName)) ?? null : null;
    }
    GetPlacementLocators(hullIndex, locatorSetName) {
      return this.GetHullLocators(locatorSetName, hullIndex);
    }
    GetLayoutCount() {
      return this.layoutData.length;
    }
    GetLayoutData(index) {
      return this.layoutData[Number(index)] ?? null;
    }
    GetLocatorCount(setName) {
      let count = 0;
      for (let hullIndex = 0; hullIndex < this.hullDatas.length; hullIndex++) {
        count += this.GetHullLocators(setName, hullIndex)?.length ?? 0;
      }
      return count;
    }
    GetHullNextSubsystemOffset(hullIndex = 0) {
      return this.GetHullLocators("next_subsystem", hullIndex)?.[0]?.position ?? null;
    }
    GetHullAudioPosition(hullIndex = 0) {
      if (hullIndex + 1 !== this.hullDatas.length) return null;
      return this.hullDatas[hullIndex]?.audioPosition ?? null;
    }
    GetAreaShaderLocationResPath() {
      return this.genericData?.areaShaderLocation ?? "";
    }
    GetDecalShaderLocationResPath() {
      return this.genericData?.decalShaderLocation ?? "";
    }

    /** Carbon returns constant decal shader 0. */
    GetDecalShader() {
      return 0;
    }
    IsHullUsingDecalSets() {
      return this.hullDatas[0]?.isUsingDecalSets === true;
    }
    GetShaderPrefix(isAnimated) {
      return isAnimated ? this.genericData?.shaderPrefixAnimated ?? "" : this.genericData?.shaderPrefix ?? "";
    }
    GetCompleteShaderPath(path) {
      return `${this.GetAreaShaderLocationResPath()}/${this.GetShaderPrefix(this.IsHullAnimated())}${path}`;
    }
    GetGenericAreaShaderData(shaderName) {
      return this.genericData?.areaShaderData?.get(String(shaderName)) ?? null;
    }
    GetGenericDecalShaderData(shaderName) {
      return this.genericData?.decalShaderData?.get(String(shaderName)) ?? null;
    }

    /** Returns a hull-local texture path for a projected opaque mesh index. */
    GetHullTextureWithMeshIndex(textureName, meshIndex, hullIndex = 0, resourceExists = null, cache = null) {
      const hull = this.hullDatas[hullIndex];
      const areaIndex = hull?.meshIndexToOpaqueAreaLookup?.get(Number(meshIndex));
      if (areaIndex === undefined) return null;
      const texture = hull.opaqueAreas?.[areaIndex]?.textures?.get(String(textureName));
      if (!texture) return null;
      return this.ModifyTextureResPath(texture.resFilePath, resourceExists, cache);
    }
    GetGenericDamageData() {
      return this.genericData?.damage ?? null;
    }
    GetGenericHullDamageData() {
      return this.genericData?.hullDamage ?? null;
    }
    GetGenericSwarmProperties() {
      return this.genericData?.swarmBehavior ?? null;
    }
    GetRaceDamageData() {
      return this.raceData?.damage ?? null;
    }
    GetRaceBoosterData() {
      return this.raceData?.boosters ?? null;
    }
    GetHullBoosterData(hullIndex = 0) {
      return this.hullDatas[hullIndex]?.boosters ?? null;
    }
    GetHullBoosterCount() {
      return this.hullDatas.reduce((count, hull) => count + (Array.isArray(hull?.boosters?.items) ? hull.boosters.items.length : 0), 0);
    }
    GetImpactEffectType() {
      return Number(this.hullDatas[0]?.impactEffectType ?? _EveSOFDataHull.ImpactEffectType.IMPACTEFFECT_NONE);
    }
    GetImpactShieldShader() {
      const damage = this.GetGenericDamageData();
      if (!damage) return null;
      switch (this.GetImpactEffectType()) {
        case _EveSOFDataHull.ImpactEffectType.IMPACTEFFECT_ELLIPSOID:
          return damage.shieldShaderEllipsoid ?? "";
        case _EveSOFDataHull.ImpactEffectType.IMPACTEFFECT_HULL:
          return damage.shieldShaderHull ?? "";
        default:
          return null;
      }
    }

    /** Applies Carbon's optional faction/DNA texture path insertion. */
    ModifyTextureResPath(resourcePath, resourceExists = null, cache = null) {
      let insert = this.factionData?.resPathInsert || null;
      const args = this.GetDnaCommandArgs(_EveSOFDNA.DnaCommand.CMD_RESPATHINSERT);
      if (args?.length === 1) insert = args[0] === "none" ? null : args[0];
      if (!insert || typeof resourceExists !== "function") return resourcePath;
      const slash = resourcePath.lastIndexOf("/");
      if (slash === -1) return resourcePath;
      let candidate = `${resourcePath.slice(0, slash + 1)}${insert}/${resourcePath.slice(slash + 1)}`;
      const underscore = candidate.lastIndexOf("_");
      if (underscore === -1) return resourcePath;
      candidate = `${candidate.slice(0, underscore)}_${insert}${candidate.slice(underscore)}`;
      if (cache?.has(candidate)) return cache.get(candidate) ? candidate : resourcePath;
      const exists = resourceExists(candidate) === true;
      if (cache) cache.set(candidate, exists);
      return exists ? candidate : resourcePath;
    }
    GetColorSet() {
      return this.factionData?.colorData?.colors ?? [];
    }
    GetLogo(index) {
      return this.factionData?.logoSetData?.logos?.[Number(index)] ?? null;
    }
    HasLogoSet(index) {
      return (this.GetLogo(index)?.textures?.size ?? 0) > 0;
    }
    IsInVisibilityData(hash) {
      return this.factionData?.visibilityData?.has(Number(hash) >>> 0) === true;
    }

    /** Resolves one mesh parameter using Carbon's ordered material fallbacks. */
    GetMeshAreaParameter(areaType, parameterName, hullParameters = null, blockedMaterials = 0) {
      let info;
      let value;
      const materialArgs = this.GetDnaCommandArgs(_EveSOFDNA.DnaCommand.CMD_MATERIAL);
      if (materialArgs) {
        info = new EveSOFUtilsParameterName(this.genericData.materialPrefixes, parameterName);
        const materialIndex = info.GetMaterialIdx();
        if (materialIndex !== -1 && materialIndex < materialArgs.length && materialIndex < 32) {
          const blocked = blockedMaterials >>> 0 & 1 << materialIndex;
          if (!blocked) {
            value = findMaterialParameter(this.dataMgr, materialArgs[materialIndex], info.GetShortName());
            if (value) return value;
          }
        }
      }
      const patternArgs = this.GetDnaCommandArgs(_EveSOFDNA.DnaCommand.CMD_PATTERN);
      if (patternArgs) {
        info = new EveSOFUtilsParameterName(this.genericData.patternMaterialPrefixes, parameterName);
        const materialIndex = info.GetMaterialIdx();
        if (materialIndex !== -1 && 1 + materialIndex < patternArgs.length) {
          value = findMaterialParameter(this.dataMgr, patternArgs[1 + materialIndex], info.GetShortName());
          if (value) return value;
        }
      }
      info = new EveSOFUtilsParameterName(this.genericData.patternMaterialPrefixes, parameterName);
      if (info.GetMaterialIdx() === 0) {
        value = findMaterialParameter(this.dataMgr, this.factionData.defaultPatternLayer1MaterialName, info.GetShortName());
        if (value) return value;
      } else if (info.GetMaterialIdx() === 1 && this.UsingSof6()) {
        value = findMaterialParameter(this.dataMgr, this.factionData.defaultPatternLayer2MaterialName, info.GetShortName());
        if (value) return value;
      }
      info = new EveSOFUtilsParameterName(this.genericData.materialPrefixes, parameterName);
      if (areaType === _EveSOFDataArea.AreaType.TYPE_WRECK) {
        value = findAreaMaterialParameter(this.dataMgr, this.GetColorSet(), this.genericData.genericWreckMaterialData, areaType, info);
        if (value) return value;
      }
      if (areaType === _EveSOFDataArea.AreaType.TYPE_PRIMARY || areaType === _EveSOFDataArea.AreaType.TYPE_REACTOR) {
        value = findAreaMaterialParameter(this.dataMgr, this.GetColorSet(), this.raceData.areaMaterials, areaType, info);
        if (value) return value;
      }
      value = findAreaMaterialParameter(this.dataMgr, this.GetColorSet(), this.factionData.areaMaterials, areaType, info);
      if (value) return value;
      return hullParameters?.get(String(parameterName)) ?? null;
    }

    /** Resolves a turret shader parameter after applying the faction's material-usage remap. */
    GetFactionTurretParameters(parameterName) {
      const info = new EveSOFUtilsParameterName(this.genericData?.materialPrefixes ?? [], parameterName);
      if (info.IsMaterialIdxValid()) {
        const materialIndex = info.GetMaterialIdx();
        const usageIndex = Number(this.factionData?.materialUsageList?.[materialIndex] ?? materialIndex);
        info.ChangeMaterialIdx(this.genericData, usageIndex);
      }
      return this.GetMeshAreaParameter(Number(this.genericData?.turretAreaType ?? _EveSOFDataArea.AreaType.TYPE_PRIMARY), info.GetFullName());
    }
    GetPatternLayerCount() {
      if (this.HasDnaCommand(_EveSOFDNA.DnaCommand.CMD_PATTERN) && !this.patternData) return 0;
      if (this.patternData) {
        return this.GetHullPatternApplicationData()?.layerAndProjection.length ?? 0;
      }
      if (this.UsingSof6()) {
        return this.GetFactionalPatternApplicationData()?.layerAndProjection.length ?? 0;
      }
      return this.hullDatas[0]?.defaultPattern?.enabled === true ? 1 : 0;
    }
    GetFactionalPatternApplicationData() {
      const pattern = this.dataMgr?.GetPatternData(this.factionData?.defaultPatternName ?? "");
      return pattern?.applicationData?.get(this.hullNames[0]) ?? null;
    }
    GetHullPatternApplicationData() {
      if (!this.patternData) return null;
      const applications = this.patternData.sof6 ? this.patternData.applicationData : this.patternData.oldApplicationData;
      return applications?.get(this.hullNames[0]) ?? null;
    }
    GetPatternApplicationData() {
      if (!this.HasDnaCommand(_EveSOFDNA.DnaCommand.CMD_PATTERN)) {
        if (this.UsingSof6()) return this.GetFactionalPatternApplicationData();
        const layer = this.factionData?.defaultPatternInfo;
        const projection = this.hullDatas[0]?.defaultPattern;
        return layer && projection ? {
          layerAndProjection: [{
            layer,
            projection
          }]
        } : null;
      }
      return this.GetHullPatternApplicationData();
    }
    GetPatternProjectionData(application, layer) {
      if (!application || !Number.isInteger(layer) || layer < 0) return null;
      if (!this.HasDnaCommand(_EveSOFDNA.DnaCommand.CMD_PATTERN) && !this.UsingSof6() && layer > 0) return null;
      return application.layerAndProjection?.[layer]?.projection ?? null;
    }
    GetPatternLayerData(application, layer) {
      if (!application || !Number.isInteger(layer) || layer < 0) return null;
      if (!this.HasDnaCommand(_EveSOFDNA.DnaCommand.CMD_PATTERN) && !this.UsingSof6() && layer > 0) return null;
      return application.layerAndProjection?.[layer]?.layer ?? null;
    }
    GetMaterialTargets(layerData) {
      return layerData?.materialTargets?.slice() ?? null;
    }
    IsPatternLayerApplicableToArea(layerData, areaType) {
      return layerData?.applicableAreas?.get(Number(areaType)) === true;
    }
    GetReflectionMode() {
      const category = this.hullDatas[0]?.category ?? "";
      const categories = this.genericData?.categoryData;
      if (categories?.size) {
        return categories.get(category) ?? ReflectionMode.REFLECT_NEVER;
      }
      if (category === "hangar" || category === "hangar4k") return ReflectionMode.REFLECT_LOW_MEDIUM_HIGH;
      if (category.includes("station") || category.includes("structure") || category === "jumpgate") {
        return ReflectionMode.REFLECT_MEDIUM_AND_HIGH;
      }
      return ReflectionMode.REFLECT_NEVER;
    }
    GetHullBoundingSphere() {
      let result = null;
      const hullOffset = [0, 0, 0];
      for (let hullIndex = 0; hullIndex < this.hullDatas.length; hullIndex++) {
        const source = this.hullDatas[hullIndex]?.boundingSphere;
        if (source?.length >= 4) {
          result = includeSphere(result, [Number(source[0] ?? 0) + hullOffset[0], Number(source[1] ?? 0) + hullOffset[1], Number(source[2] ?? 0) + hullOffset[2], Number(source[3] ?? -1)]);
        }
        const next = this.GetHullNextSubsystemOffset(hullIndex);
        if (next) {
          hullOffset[0] += Number(next[0] ?? 0);
          hullOffset[1] += Number(next[1] ?? 0);
          hullOffset[2] += Number(next[2] ?? 0);
        }
      }
      return result;
    }
    GetHullShapeEllipsoid() {
      const hull = this.hullDatas[0];
      if (!hull) return null;
      return {
        center: hull.shapeEllipsoidCenter ?? null,
        radius: hull.shapeEllipsoidRadius ?? null
      };
    }
    GetParentBoundingSphere() {
      return _EveSOFDNA.#CopySphere(this.parentBoundingSphere);
    }
    GetParentHullShapeEllipsoid() {
      return this.parentHullShapeEllipsoid;
    }
    SetParentBoundingSphere(boundingSphere) {
      this.parentBoundingSphere = _EveSOFDNA.#CopySphere(boundingSphere);
    }
    SetParentShapeEllipsoidInfo(ellipsoid) {
      this.parentHullShapeEllipsoid = _EveSOFDNA.#CopyEllipsoid(ellipsoid);
    }
    IsHullAnimated() {
      return this.isSkinned;
    }
    DisableAnimation() {
      this.isSkinned = false;
    }
    DynamicBoundingSphereEnabled() {
      return this.hullDatas.length > 1 || this.hullDatas[0]?.enableDynamicBoundingSphere === true;
    }
    CastShadow() {
      return this.hullDatas[0]?.castShadow === true;
    }
    HasDnaCommand(command) {
      const name = commandName(command);
      return name !== null && this.#commands.has(name);
    }
    GetDnaCommandArgs(command) {
      const name = commandName(command);
      if (name === null || !this.#commands.has(name)) return null;
      return this.#commands.get(name).slice();
    }
    UsingSof6() {
      return this.hullDatas.length > 0 && this.hullDatas[0].sof6 === true;
    }
    GetFactionName() {
      return this.factionName;
    }
    GetRaceName() {
      return this.raceName;
    }
    #setupFromString(dnaString, dataMgr) {
      // A DNA string is lowercased before anything reads it. Every catalog name
      // it can contain — hull, faction, race, command, material, pattern, layout
      // — is canonically lowercase, so case carries no meaning and folding it
      // costs nothing.
      //
      // Carbon compares command names exactly
      // (`cit->first.compare( s_dnaCommands[i] )`) and looks catalog names up as
      // given. Authored EVE skins do not respect that: designs in the live feed
      // carry `MATERIAL?...`, and porting the exact comparison faithfully
      // rejected them with "Invalid SOF DNA content". Deliberate deviation.
      const dna = dnaString.toLowerCase();
      this.#reset(dna, dataMgr);
      const parts = splitCarbon(dna, ":");
      if (parts.length < 3) {
        this.#parseError = "not-enough-parts";
        return;
      }
      for (let index = 3; index < parts.length; index++) {
        const command = splitCarbon(parts[index], "?");
        if (command.length !== 2) {
          this.#parseError = "malformed-command";
          return;
        }
        this.#commands.set(command[0], splitCarbon(command[1], ";"));
      }

      // `mesh` and `material` are the same command: one material per material
      // prefix. `mesh` is the spelling live EVE skins are authored with, and
      // ccpwgl's legacy reader indexes `commands.mesh[materialIndex]` against
      // `generic.materialPrefixes` for the same reason.
      //
      // The Carbon snapshot does neither. Its parser splits every payload on
      // `;`, so it sees four arguments; its ValidateContent then rejects any
      // CMD_MESH that is not exactly one; and CMD_MESH is read nowhere in the
      // tree. Faithfully porting that gave us a validator that rejects real
      // authored DNA and a builder that would have dropped the materials even if
      // it had passed. Normalizing here means every downstream reader keeps
      // asking for CMD_MATERIAL and simply works.
      if (this.#commands.has("mesh") && !this.#commands.has("material")) {
        this.#commands.set("material", this.#commands.get("mesh"));
      }
      this.hullNames = splitCarbon(parts[0], ";");
      if (this.hullNames.length === 0) {
        this.#parseError = "missing-hull";
        return;
      }
      this.factionName = parts[1];
      this.raceName = parts[2];
      for (const name of this.hullNames) {
        const hull = dataMgr.GetHullData(name);
        if (!hull) {
          this.#parseError = "unknown-hull";
          return;
        }
        this.hullDatas.push(hull);
      }
      this.factionData = dataMgr.GetFactionData(this.factionName);
      if (!this.factionData) {
        this.#parseError = "unknown-faction";
        return;
      }
      this.raceData = dataMgr.GetRaceData(this.raceName);
      if (!this.raceData) {
        this.#parseError = "unknown-race";
        return;
      }
      const pattern = this.GetDnaCommandArgs(_EveSOFDNA.DnaCommand.CMD_PATTERN);
      if (pattern?.length) this.patternData = dataMgr.GetPatternData(pattern[0]);
      const layouts = this.GetDnaCommandArgs(_EveSOFDNA.DnaCommand.CMD_LAYOUT);
      if (layouts) this.layoutData = dataMgr.GetLayoutData(layouts);
      this.genericData = dataMgr.GetGenericData();
      if (this.HasDnaCommand(_EveSOFDNA.DnaCommand.CMD_VARIANT)) this.#setupCustomData();
      this.parentBoundingSphere = this.GetHullBoundingSphere();
      this.parentHullShapeEllipsoid = _EveSOFDNA.#CopyEllipsoid(this.GetHullShapeEllipsoid());
      this.isSkinned = this.hullDatas[0]?.isSkinned === true;
    }
    #setupFromDescriptor(layoutName, descriptor, parent, dataMgr) {
      this.#reset("", dataMgr);
      if (!descriptor || !parent || !dataMgr) {
        this.#parseError = "invalid-descriptor-context";
        return;
      }
      this.hullNames = splitCarbon(String(descriptor.hull ?? ""), ";");
      for (const name of this.hullNames) {
        const hull = dataMgr.GetHullData(name);
        if (!hull) {
          this.#parseError = "unknown-hull";
          return;
        }
        this.hullDatas.push(hull);
      }
      if (this.hullDatas.length === 0) {
        this.#parseError = "missing-hull";
        return;
      }
      this.factionName = descriptor.faction || parent.factionName;
      this.raceName = descriptor.race || parent.raceName;
      this.factionData = dataMgr.GetFactionData(this.factionName);
      this.raceData = dataMgr.GetRaceData(this.raceName);
      if (!this.factionData || !this.raceData) {
        this.#parseError = "unknown-faction-or-race";
        return;
      }
      const materialArgs = parent.GetDnaCommandArgs(_EveSOFDNA.DnaCommand.CMD_MATERIAL) ?? ["none", "none", "none", "none"];
      for (let index = 0; index < 4; index++) {
        const value = descriptor[`material${index + 1}`];
        if (value) materialArgs[index] = value;
      }
      if (materialArgs.some(value => value !== "none")) this.#commands.set("material", materialArgs);
      this.#inheritCommand(parent, _EveSOFDNA.DnaCommand.CMD_RESPATHINSERT);
      this.#inheritCommand(parent, _EveSOFDNA.DnaCommand.CMD_VARIANT);
      if (descriptor.layout) this.#commands.set("layout", [descriptor.layout]);
      if (descriptor.pattern) {
        const inherited = parent.GetDnaCommandArgs(_EveSOFDNA.DnaCommand.CMD_PATTERN) ?? [descriptor.pattern, "none", "none"];
        inherited[0] = descriptor.pattern;
        while (inherited.length < 3) inherited.push("none");
        this.#commands.set("pattern", inherited.slice(0, 3));
      }
      const pattern = this.GetDnaCommandArgs(_EveSOFDNA.DnaCommand.CMD_PATTERN);
      if (pattern) this.patternData = dataMgr.GetPatternData(pattern[0]);
      const layouts = this.GetDnaCommandArgs(_EveSOFDNA.DnaCommand.CMD_LAYOUT);
      if (layouts) this.layoutData = dataMgr.GetLayoutData(layouts);
      this.genericData = dataMgr.GetGenericData();
      if (this.HasDnaCommand(_EveSOFDNA.DnaCommand.CMD_VARIANT)) this.#setupCustomData();
      this.dna = `${descriptor.hull}:${this.factionName}:${this.raceName}`;
      for (const name of [...this.#commands.keys()].sort()) {
        this.dna += `:${name}?${this.#commands.get(name).join(";")}`;
      }
      this.parentBoundingSphere = parent.GetParentBoundingSphere();
      this.parentHullShapeEllipsoid = _EveSOFDNA.#CopyEllipsoid(parent.GetParentHullShapeEllipsoid());
      this.isSkinned = this.hullDatas[0]?.isSkinned === true;
    }
    #inheritCommand(parent, command) {
      const args = parent.GetDnaCommandArgs(command);
      if (args) this.#commands.set(commandName(command), args);
    }
    #setupCustomData() {
      const args = this.GetDnaCommandArgs(_EveSOFDNA.DnaCommand.CMD_VARIANT);
      if (!args?.length) return;
      const variant = this.genericData?.variants?.get(args[0]) ?? null;
      this.customHullData = this.hullDatas.map(hull => createCustomHullData(hull, variant));
      this.hullDatas = this.customHullData;
    }
    #reset(dna, dataMgr) {
      this.dna = dna;
      this.dataMgr = dataMgr;
      this.hullDatas = [];
      this.factionData = null;
      this.raceData = null;
      this.genericData = null;
      this.patternData = null;
      this.layoutData = [];
      this.customHullData = [];
      this.hullNames = [];
      this.factionName = "";
      this.raceName = "";
      this.parentBoundingSphere = null;
      this.parentHullShapeEllipsoid = null;
      this.isSkinned = false;
      this.#commands.clear();
      this.#parseError = null;
    }
  }];
  DnaCommand = Object.freeze({
    CMD_INVALID: 0,
    CMD_MATERIAL: 1,
    CMD_MESH: 2,
    CMD_RESPATHINSERT: 3,
    CMD_VARIANT: 4,
    CMD_CLASS: 5,
    CMD_PATTERN: 6,
    CMD_LAYOUT: 7,
    CMD_MAX: 8
  });
  #CopySphere(sphere) {
    return sphere ? Array.from(sphere) : null;
  }
  #CopyEllipsoid(ellipsoid) {
    if (!ellipsoid) return null;
    return {
      center: ellipsoid.center ? Array.from(ellipsoid.center) : null,
      radius: ellipsoid.radius ? Array.from(ellipsoid.radius) : null
    };
  }
  constructor() {
    super(_EveSOFDNA), _initClass();
  }
}();
function createCustomHullData(source, variant) {
  const shapeCenter = copyArrayValue(source?.shapeEllipsoid?.center ?? source?.shapeEllipsoidCenter, [0, 0, 0]);
  const shapeRadius = copyArrayValue(source?.shapeEllipsoid?.radius ?? source?.shapeEllipsoidRadius, [-1, -1, -1]);
  const result = {
    buildClass: Number(source?.buildClass ?? 0),
    geometryResFilePath: String(source?.geometryResFilePath ?? ""),
    boundingSphere: copyArrayValue(source?.boundingSphere, [0, 0, 0, 0]),
    shapeEllipsoidCenter: shapeCenter.slice(),
    shapeEllipsoidRadius: shapeRadius.slice(),
    shapeEllipsoid: {
      center: shapeCenter,
      radius: shapeRadius
    },
    isSkinned: source?.isSkinned === true,
    isUsingDecalSets: false,
    enableDynamicBoundingSphere: source?.enableDynamicBoundingSphere === true,
    castShadow: source?.castShadow === true,
    sof6: false,
    audioPosition: copyArrayValue(source?.audioPosition, [0, 0, 0]),
    spriteSets: [],
    spotlightSets: [],
    planeSets: [],
    spriteLineSets: [],
    hazeSets: [],
    banners: [],
    bannerSets: [],
    hullDecalSets: [],
    hullLightSets: [],
    childSets: [],
    defaultPattern: {
      enabled: false,
      position: [0, 0, 0],
      scaling: [0, 0, 0],
      rotation: [0, 0, 0, 1],
      isMirrored: false
    },
    impactEffectType: _EveSOFDataHull.ImpactEffectType.IMPACTEFFECT_NONE,
    opaqueAreas: [],
    decalAreas: [],
    transparentAreas: [],
    additiveAreas: [],
    distortionAreas: [],
    boosters: {
      alwaysOn: false,
      hasTrails: false,
      items: []
    },
    locatorTurrets: [],
    locatorSets: new Map(),
    children: [],
    instancedMeshes: [],
    animations: [],
    soundEmitters: [],
    controllers: [],
    modelRotationCurvePath: "",
    modelTranslationCurvePath: "",
    meshIndexToOpaqueAreaLookup: new Map(),
    category: ""
  };
  if (variant?.hullAreaData) {
    const target = variant.isTransparent ? result.transparentAreas : result.opaqueAreas;
    for (const sourceArea of source?.opaqueAreas ?? []) {
      target.push(cloneVariantHullArea(variant.hullAreaData, sourceArea));
    }
  }
  return result;
}
function cloneVariantHullArea(value, sourceArea) {
  const textures = new Map();
  if (value?.textures instanceof Map) {
    for (const [name, texture] of value.textures) {
      textures.set(name, {
        resFilePath: String(texture?.resFilePath ?? "")
      });
    }
  }
  const parameters = new Map();
  if (value?.parameters instanceof Map) {
    for (const [name, parameter] of value.parameters) {
      parameters.set(name, copyArrayValue(parameter, [0, 0, 0, 0]));
    }
  }
  return {
    index: Number(sourceArea?.index ?? 0),
    count: Number(sourceArea?.count ?? 1),
    blockedMaterials: Number(value?.blockedMaterials ?? 0),
    shader: String(value?.shader ?? ""),
    areaType: Number(value?.areaType ?? 0),
    textures,
    parameters
  };
}
function copyArrayValue(value, fallback) {
  return value && typeof value.length === "number" ? Array.from(value) : fallback.slice();
}
function commandName(command) {
  if (typeof command === "string") return command;
  if (!Number.isInteger(command) || command <= _EveSOFDNA.DnaCommand.CMD_INVALID || command >= _EveSOFDNA.DnaCommand.CMD_MAX) {
    return null;
  }
  return COMMAND_NAMES[command] ?? null;
}
function splitCarbon(value, separator) {
  if (value === "") return [];
  const result = String(value).split(separator);
  if (result[result.length - 1] === "") result.pop();
  return result;
}
function includeSphere(current, next) {
  if (!next || next[3] < 0) return current;
  if (!current || current[3] < 0) return next.slice();
  const dx = next[0] - current[0];
  const dy = next[1] - current[1];
  const dz = next[2] - current[2];
  const distance = Math.hypot(dx, dy, dz);
  if (current[3] >= distance + next[3]) return current;
  if (next[3] >= distance + current[3]) return next.slice();
  const radius = (distance + current[3] + next[3]) * 0.5;
  if (distance === 0) return [current[0], current[1], current[2], radius];
  const factor = (radius - current[3]) / distance;
  return [current[0] + dx * factor, current[1] + dy * factor, current[2] + dz * factor, radius];
}
function findMaterialParameter(dataMgr, materialName, parameterName) {
  return dataMgr.GetMaterialData(materialName)?.parameters?.get(parameterName) ?? null;
}
function findAreaMaterialParameter(dataMgr, colors, areaMaterials, areaType, info) {
  if (!areaMaterials) return null;
  let value = null;
  if (info.IsMaterialIdxValid()) {
    const materialName = areaMaterials.materialNames.get(`${areaType}:${info.GetMaterialIdx()}`);
    if (materialName) value = findMaterialParameter(dataMgr, materialName, info.GetShortName());
  } else {
    const colorType = areaMaterials.glowColor.get(`${areaType}:${info.GetFullName()}`);
    if (colorType !== undefined) value = colors[colorType] ?? null;
  }
  if (value) return value;
  return areaType === _EveSOFDataArea.AreaType.TYPE_PRIMARY ? null : findAreaMaterialParameter(dataMgr, colors, areaMaterials, _EveSOFDataArea.AreaType.TYPE_PRIMARY, info);
}

export { _EveSOFDNA as EveSOFDNA };
//# sourceMappingURL=EveSOFDNA.js.map
