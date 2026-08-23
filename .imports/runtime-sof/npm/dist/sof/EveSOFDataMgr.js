import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { carbon, impl, type, CjsSchema } from '@carbonenginejs/runtime-utils/schema';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';

let _initProto, _initClass;
const LOGO_KEYS = Object.freeze(["Primary", "Secondary", "Tertiary", "Marking_01", "Marking_02"]);

/**
 * Owns the CPU-side SOF lookup tables consumed by EveSOFDNA and EveSOF.
 *
 * Carbon declares its many projection records as nested C++ structs. They are
 * plain JavaScript records here; they are not persisted fields on the manager.
 */
let _EveSOFDataMgr;
new class extends _identity {
  static [class EveSOFDataMgr extends CjsModel {
    static {
      ({
        e: [_initProto],
        c: [_EveSOFDataMgr, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "EveSOFDataMgr",
        family: "eve"
      })], [[[carbon, carbon.method, impl, impl.implemented], 18, "LoadData"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetData"], [[carbon, carbon.method, impl, impl.implemented], 18, "HasHullData"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetHullData"], [[carbon, carbon.method, impl, impl.implemented], 18, "HasFactionData"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetFactionData"], [[carbon, carbon.method, impl, impl.implemented], 18, "HasRaceData"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetRaceData"], [[carbon, carbon.method, impl, impl.implemented], 18, "HasMaterialData"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetMaterialData"], [[carbon, carbon.method, impl, impl.implemented], 18, "HasPatternData"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetPatternData"], [[carbon, carbon.method, impl, impl.implemented], 18, "HasLayoutData"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetLayoutData"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetGenericData"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateHull"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateFaction"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateRace"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateMaterial"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdatePattern"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateLayout"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateGeneric"]], 0, void 0, CjsModel));
    }
    #hullData = (_initProto(this), new Map());
    #factionData = new Map();
    #raceData = new Map();
    #materialData = new Map();
    #patternData = new Map();
    #layoutData = new Map();
    #genericData = createGenericData(null);
    #resourceLoader = null;
    #loadOperations = new Map();

    /** Supplies the GPU-free object loader used by LoadData. */
    SetResourceLoader(loader) {
      if (loader !== null && typeof loader !== "function") {
        throw new TypeError("EveSOFDataMgr resource loader must be a function or null");
      }
      this.#resourceLoader = loader;
      return this;
    }

    /** Loads an EveSOFData graph through the configured synchronous loader. */
    LoadData(filePath) {
      if (!this.#resourceLoader) return false;
      const data = this.#resourceLoader(filePath);
      if (data && typeof data.then === "function") {
        throw new TypeError("EveSOFDataMgr.LoadData requires a synchronous loader");
      }
      return this.SetData(data);
    }

    /** Loads and consumes SOF data through a promise-capable object loader. */
    async LoadDataAsync(filePath) {
      const loader = this.#resourceLoader;
      if (!loader) return false;
      const key = normalizeSofResourcePath(filePath);
      const existing = this.#loadOperations.get(key);
      if (existing) return existing;
      const operation = Promise.resolve().then(() => loader(key)).then(data => this.SetData(data));
      this.#loadOperations.set(key, operation);
      const clear = () => {
        if (this.#loadOperations.get(key) === operation) this.#loadOperations.delete(key);
      };
      operation.then(clear, clear);
      return operation;
    }

    /** Rebuilds the manager's lookup tables from a hydrated EveSOFData graph. */
    SetData(data) {
      if (!data) return false;
      this.#clear();
      if (!indexNamed(data.hull, this.#hullData, projectHull)) return false;
      if (!indexNamed(data.faction, this.#factionData, projectFaction)) return false;
      if (!indexNamed(data.race, this.#raceData, projectRace)) return false;
      if (!indexNamed(data.material, this.#materialData, projectMaterial)) return false;
      if (!indexNamed(data.pattern, this.#patternData, projectPattern)) return false;
      if (!indexNamed(data.layout, this.#layoutData, projectLayout)) return false;
      if (!data.generic) return false;
      this.#genericData = createGenericData(data.generic);
      return true;
    }
    HasHullData(name) {
      return this.#hullData.has(String(name));
    }
    GetHullData(name) {
      return this.#hullData.get(String(name)) ?? null;
    }
    HasFactionData(name) {
      return this.#factionData.has(String(name));
    }
    GetFactionData(name) {
      return this.#factionData.get(String(name)) ?? null;
    }
    HasRaceData(name) {
      return this.#raceData.has(String(name));
    }
    GetRaceData(name) {
      return this.#raceData.get(String(name)) ?? null;
    }
    HasMaterialData(name) {
      return this.#materialData.has(String(name));
    }
    GetMaterialData(name) {
      return this.#materialData.get(String(name)) ?? null;
    }
    HasPatternData(name) {
      return this.#patternData.has(String(name));
    }
    GetPatternData(name) {
      return this.#patternData.get(String(name)) ?? null;
    }
    HasLayoutData(name) {
      return this.#layoutData.has(String(name));
    }

    /** Returns one layout, or filters an ordered list of layout names. */
    GetLayoutData(nameOrNames) {
      if (Array.isArray(nameOrNames)) {
        const result = [];
        for (const name of nameOrNames) {
          const layout = this.GetLayoutData(name);
          if (layout) result.push(layout);
        }
        return result;
      }
      return this.#layoutData.get(String(nameOrNames)) ?? null;
    }
    GetGenericData() {
      return this.#genericData;
    }

    /** Lists canonical hull names for read-only catalog consumers. */
    ListHullDataNames() {
      return listCatalogNames(this.#hullData);
    }

    /** Lists canonical faction names for read-only catalog consumers. */
    ListFactionDataNames() {
      return listCatalogNames(this.#factionData);
    }

    /** Lists canonical race names for read-only catalog consumers. */
    ListRaceDataNames() {
      return listCatalogNames(this.#raceData);
    }

    /** Lists canonical material names for read-only catalog consumers. */
    ListMaterialDataNames() {
      return listCatalogNames(this.#materialData);
    }

    /** Lists canonical pattern names for read-only catalog consumers. */
    ListPatternDataNames() {
      return listCatalogNames(this.#patternData);
    }

    /** Lists canonical pattern names with an application for one known hull. */
    ListPatternDataNamesForHull(hullName) {
      if (!getCatalogValue(this.#hullData, hullName)) return null;
      const result = [];
      for (const [name, pattern] of this.#patternData) {
        if (getMapValue(getPatternApplications(pattern), hullName)) {
          result.push(normalizeCatalogName(name));
        }
      }
      return Object.freeze([...new Set(result.filter(Boolean))].sort((left, right) => left.localeCompare(right)));
    }

    /** Lists canonical layout names for read-only catalog consumers. */
    ListLayoutDataNames() {
      return listCatalogNames(this.#layoutData);
    }

    /** Returns one detached JSON-compatible hull projection, case-insensitively. */
    GetHullDataJson(name) {
      return getCatalogJson(this.#hullData, name);
    }

    /** Returns one detached JSON-compatible faction projection, case-insensitively. */
    GetFactionDataJson(name) {
      return getCatalogJson(this.#factionData, name);
    }

    /** Returns one detached JSON-compatible race projection, case-insensitively. */
    GetRaceDataJson(name) {
      return getCatalogJson(this.#raceData, name);
    }

    /** Returns one detached JSON-compatible material projection, case-insensitively. */
    GetMaterialDataJson(name) {
      return getCatalogJson(this.#materialData, name);
    }

    /** Returns one detached JSON-compatible layout projection, case-insensitively. */
    GetLayoutDataJson(name) {
      return getCatalogJson(this.#layoutData, name);
    }

    /** Returns only one pattern's detached application for one hull. */
    GetPatternHullDataJson(patternName, hullName) {
      const pattern = getCatalogValue(this.#patternData, patternName);
      if (!pattern) return null;
      const application = getMapValue(getPatternApplications(pattern), hullName);
      return application ? projectJsonValue(application) : null;
    }
    UpdateHull(name, value) {
      return updateNamed(this.#hullData, name, value, projectHull);
    }
    UpdateFaction(name, value) {
      return updateNamed(this.#factionData, name, value, projectFaction);
    }
    UpdateRace(name, value) {
      return updateNamed(this.#raceData, name, value, projectRace);
    }
    UpdateMaterial(name, value) {
      return updateNamed(this.#materialData, name, value, projectMaterial);
    }
    UpdatePattern(name, value) {
      if (!value) return false;
      return updateNamed(this.#patternData, name, value, projectPattern);
    }
    UpdateLayout(name, value) {
      if (!value) return false;
      return updateNamed(this.#layoutData, name, value, projectLayout);
    }
    UpdateGeneric(value) {
      if (!value) return false;
      this.#genericData = createGenericData(value);
      return true;
    }
    #clear() {
      this.#hullData.clear();
      this.#factionData.clear();
      this.#raceData.clear();
      this.#materialData.clear();
      this.#patternData.clear();
      this.#layoutData.clear();
      this.#genericData = createGenericData(null);
    }
  }];
  DistributionMethod = Object.freeze({
    RANDOM_INCLUCION: 0,
    PARENT_MATCH: 1,
    DEPLETION_COUNTER: 2,
    GRAPHIC_SETTING_MAP: 3
  });
  constructor() {
    super(_EveSOFDataMgr), _initClass();
  }
}();
function normalizeSofResourcePath(value) {
  return String(value ?? "").trim().replace(/\\/g, "/").replace(/\/+/g, "/").toLowerCase();
}
function indexNamed(values, target, projector) {
  for (const value of Array.isArray(values) ? values : []) {
    if (!value || target.has(String(value.name))) return false;
    target.set(String(value.name), projector(value));
  }
  return true;
}
function listCatalogNames(values) {
  return Object.freeze([...new Set([...values.keys()].map(normalizeCatalogName).filter(Boolean))].sort((left, right) => left.localeCompare(right)));
}
function getCatalogValue(values, name) {
  const requested = normalizeCatalogName(name);
  if (!requested) return null;
  for (const [key, value] of values) {
    if (normalizeCatalogName(key) === requested) return value;
  }
  return null;
}
function getCatalogJson(values, name) {
  const value = getCatalogValue(values, name);
  return value ? projectJsonValue(value) : null;
}
function getMapValue(values, name) {
  if (!(values instanceof Map)) return null;
  const requested = normalizeCatalogName(name);
  if (!requested) return null;
  for (const [key, value] of values) {
    if (normalizeCatalogName(key) === requested) return value;
  }
  return null;
}
function getPatternApplications(pattern) {
  return pattern?.sof6 === true ? pattern.applicationData : pattern?.oldApplicationData;
}
function normalizeCatalogName(value) {
  return String(value ?? "").trim().toLowerCase();
}
const OMIT_JSON_VALUE = Symbol("omitJsonValue");
function projectJsonValue(value, stack = new Set()) {
  if (value === undefined || typeof value === "function" || typeof value === "symbol") {
    return OMIT_JSON_VALUE;
  }
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "bigint") {
    return String(value);
  }
  if (value instanceof ArrayBuffer) {
    return Array.from(new Uint8Array(value));
  }
  if (value instanceof DataView) {
    return Array.from(new Uint8Array(value.buffer, value.byteOffset, value.byteLength));
  }
  if (ArrayBuffer.isView(value)) {
    return Array.from(value, item => {
      const projected = projectJsonValue(item, stack);
      return projected === OMIT_JSON_VALUE ? null : projected;
    });
  }
  if (stack.has(value)) {
    throw new TypeError("SOF catalog JSON projection cannot contain circular values");
  }
  stack.add(value);
  try {
    if (value instanceof Map) {
      const result = {};
      const entries = [...value.entries()].map(([key, item]) => [String(key), item]).sort(([left], [right]) => left.localeCompare(right));
      for (const [key, item] of entries) {
        const projected = projectJsonValue(item, stack);
        if (projected !== OMIT_JSON_VALUE) result[key] = projected;
      }
      return result;
    }
    if (value instanceof Set) {
      return [...value].map(item => projectJsonValue(item, stack)).filter(item => item !== OMIT_JSON_VALUE).sort(compareJsonValues);
    }
    if (Array.isArray(value)) {
      return value.map(item => {
        const projected = projectJsonValue(item, stack);
        return projected === OMIT_JSON_VALUE ? null : projected;
      });
    }
    if (typeof value.GetValues === "function") {
      return projectJsonValue(value.GetValues({
        refs: true,
        typeTags: true
      }), stack);
    }
    const result = {};
    for (const key of Object.keys(value).sort((left, right) => left.localeCompare(right))) {
      const projected = projectJsonValue(value[key], stack);
      if (projected !== OMIT_JSON_VALUE) result[key] = projected;
    }
    return result;
  } finally {
    stack.delete(value);
  }
}
function compareJsonValues(left, right) {
  return JSON.stringify(left).localeCompare(JSON.stringify(right));
}
function updateNamed(target, name, value, projector) {
  if (!value) return false;
  target.set(String(name), projector(value));
  return true;
}
function projectHull(value) {
  const opaqueAreas = projectAreas(value.opaqueAreas);
  const meshIndexToOpaqueAreaLookup = new Map();
  opaqueAreas.forEach((area, index) => meshIndexToOpaqueAreaLookup.set(area.index, index));
  const locatorSets = new Map();
  const locatorState = {
    uniqueID: 0
  };
  for (const locatorSet of Array.isArray(value.locatorSets) ? value.locatorSets : []) {
    projectLocatorSet(locatorSet, locatorSets, locatorState);
  }
  return {
    ...value,
    impactEffectType: Number(value.impactEffectType ?? 0),
    geometryResFilePath: String(value.geometryResFilePath ?? ""),
    boundingSphere: copyArray(value.boundingSphere, [0, 0, 0, 0]),
    shapeEllipsoidCenter: copyArray(value.shapeEllipsoidCenter, [0, 0, 0]),
    shapeEllipsoidRadius: copyArray(value.shapeEllipsoidRadius, [-1, -1, -1]),
    shapeEllipsoid: {
      center: copyArray(value.shapeEllipsoidCenter, [0, 0, 0]),
      radius: copyArray(value.shapeEllipsoidRadius, [-1, -1, -1])
    },
    opaqueAreas,
    decalAreas: projectAreas(value.decalAreas),
    transparentAreas: projectAreas(value.transparentAreas),
    additiveAreas: projectAreas(value.additiveAreas),
    distortionAreas: projectAreas(value.distortionAreas),
    hullDecalSets: projectHullDecalSets(value.decalSets),
    hullLightSets: projectHullLightSets(value.lightSets),
    spriteSets: projectHullSpriteSets(value.spriteSets),
    spotlightSets: projectHullSpotlightSets(value.spotlightSets),
    planeSets: projectHullPlaneSets(value.planeSets),
    spriteLineSets: projectHullSpriteLineSets(value.spriteLineSets),
    hazeSets: projectHullHazeSets(value.hazeSets),
    banners: projectHullBanners(value.banners),
    bannerSets: projectHullBannerSets(value.bannerSets),
    children: projectHullChildren(value.children),
    childSets: projectHullChildSets(value.childSets),
    instancedMeshes: projectHullInstancedMeshes(value.instancedMeshes),
    animations: projectHullAnimations(value.animations),
    soundEmitters: projectHullSoundEmitters(value.soundEmitters),
    controllers: projectHullControllers(value.controllers),
    boosters: projectHullBooster(value.booster),
    modelRotationCurvePath: String(value.modelRotationCurvePath ?? ""),
    modelTranslationCurvePath: String(value.modelTranslationCurvePath ?? ""),
    locatorTurrets: (Array.isArray(value.locatorTurrets) ? value.locatorTurrets : []).map(locator => ({
      name: String(locator?.name ?? ""),
      transform: copyArray(locator?.transform, identityMatrix())
    })),
    locatorSets,
    meshIndexToOpaqueAreaLookup,
    audioPosition: copyArray(value.audioPosition, [0, 0, 0]),
    defaultPattern: projectPatternProjection(value.defaultPattern?.transformLayer1)
  };
}
function projectHullChildren(values) {
  return (Array.isArray(values) ? values : []).filter(Boolean).map(value => ({
    redFilePath: String(value.redFilePath ?? ""),
    lowestLodVisible: Number(value.lowestLodVisible ?? 0),
    translation: copyArray(value.translation, [0, 0, 0]),
    rotation: copyArray(value.rotation, [0, 0, 0, 1]),
    scaling: copyArray(value.scaling, [1, 1, 1]),
    id: Number(value.id ?? -1),
    groupIndex: Number(value.groupIndex ?? -1),
    buildFilter: Number(value.buildFilter ?? 0xffffffff) >>> 0
  }));
}
function projectHullChildSets(values) {
  return (Array.isArray(values) ? values : []).filter(Boolean).map(value => ({
    visibilityGroup: fnv1(String(value.visibilityGroup ?? "primary")),
    visibilityGroupName: String(value.visibilityGroup ?? "primary"),
    // Carbon hashes the group and keeps no name; the catalog retains it so
    // callers can report which groups a hull offers (never emitted in a document).
    visibilityGroupName: String(value.visibilityGroup ?? "primary"),
    items: (Array.isArray(value.items) ? value.items : []).filter(Boolean).map(item => ({
      redFilePath: String(item.redFilePath ?? ""),
      lowestLodVisible: Number(item.lowestLodVisible ?? 0),
      translation: copyArray(item.translation, [0, 0, 0]),
      rotation: copyArray(item.rotation, [0, 0, 0, 1]),
      scaling: copyArray(item.scaling, [1, 1, 1]),
      buildFilter: Number(item.buildFilter ?? 0xffffffff) >>> 0
    }))
  }));
}
function projectHullAnimations(values) {
  return (Array.isArray(values) ? values : []).filter(Boolean).map(value => ({
    name: String(value.name ?? ""),
    startRotationValue: copyArray(value.startRotationValue, [0, 0, 0, 1]),
    endRotationValue: copyArray(value.endRotationValue, [0, 0, 0, 1]),
    startRotationTime: Number(value.startRotationTime ?? -1),
    endRotationTime: Number(value.endRotationTime ?? -1),
    startTranslationValue: copyArray(value.startTranslationValue, [0, 0, 0]),
    endTranslationValue: copyArray(value.endTranslationValue, [0, 0, 0]),
    startTranslationTime: Number(value.startTranslationTime ?? -1),
    endTranslationTime: Number(value.endTranslationTime ?? -1),
    id: Number(value.id ?? -1),
    startRate: Number(value.startRate ?? -1),
    endRate: Number(value.endRate ?? -1)
  }));
}
function projectHullSoundEmitters(values) {
  return (Array.isArray(values) ? values : []).filter(Boolean).map(value => ({
    name: String(value.name ?? ""),
    prefix: String(value.prefix ?? ""),
    position: copyArray(value.position, [0, 0, 0]),
    rotation: copyArray(value.rotation, [0, 0, 0, 1]),
    attenuationScalingFactor: Number(value.attenuationScalingFactor ?? 1)
  }));
}
function projectHullControllers(values) {
  return (Array.isArray(values) ? values : []).filter(Boolean).map(value => ({
    path: String(value.path ?? ""),
    buildFilter: Number(value.buildFilter ?? 0xffffffff) >>> 0
  }));
}
function projectHullBooster(value) {
  return {
    alwaysOn: value?.alwaysOn === true,
    hasTrails: value?.hasTrails !== false,
    items: (Array.isArray(value?.items) ? value.items : []).filter(Boolean).map(item => ({
      transform: copyArray(item.transform, identityMatrix()),
      functionality: copyArray(item.functionality, [0, 1, 1, 1]),
      hasTrail: item.hasTrail !== false,
      atlasIndex0: Number(item.atlasIndex0 ?? 0) >>> 0,
      atlasIndex1: Number(item.atlasIndex1 ?? 0) >>> 0,
      lightScale: Number(item.lightScale ?? 1)
    }))
  };
}
function projectHullInstancedMeshes(values) {
  return (Array.isArray(values) ? values : []).filter(Boolean).map(value => {
    const bounds = createEmptyBounds();
    const instances = (Array.isArray(value.instances) ? value.instances : []).filter(Boolean).map(item => {
      const scaling = copyArray(item.scaling, [1, 1, 1]);
      const matrix = mat4.fromRotationTranslationScale(mat4.create(), copyArray(item.rotation, [0, 0, 0, 1]), copyArray(item.translation, [0, 0, 0]), scaling);
      includeTransformedScalingBounds(bounds, matrix, scaling);
      const transform0 = [matrix[0], matrix[4], matrix[8], matrix[12]];
      const transform1 = [matrix[1], matrix[5], matrix[9], matrix[13]];
      const transform2 = [matrix[2], matrix[6], matrix[10], matrix[14]];
      return {
        transform0,
        transform1,
        transform2,
        lastTransform0: transform0.slice(),
        lastTransform1: transform1.slice(),
        lastTransform2: transform2.slice(),
        boneIndex: Number(item.boneIndex ?? 0) | 0
      };
    });
    const textures = new Map();
    for (const texture of Array.isArray(value.textures) ? value.textures : []) {
      if (!texture) continue;
      textures.set(String(texture.name ?? ""), {
        resFilePath: String(texture.resFilePath ?? "")
      });
    }
    return {
      name: String(value.name ?? ""),
      lowestLodVisible: Number(value.lowestLodVisible ?? 0),
      displayModifier: Number(value.displayModifier ?? 5),
      geometryResPath: String(value.geometryResPath ?? ""),
      shader: String(value.shader ?? ""),
      textures: new Map([...textures.entries()].sort(([left], [right]) => left.localeCompare(right))),
      instances,
      bounds: finalizeBounds(bounds)
    };
  });
}
function createEmptyBounds() {
  return {
    min: [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY],
    max: [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY],
    populated: false
  };
}

/** Mirrors Carbon's authored AABB[-scaling,+scaling] transform projection. */
function includeTransformedScalingBounds(bounds, matrix, scaling) {
  const extent = scaling.map(Math.abs);
  for (const x of [-extent[0], extent[0]]) {
    for (const y of [-extent[1], extent[1]]) {
      for (const z of [-extent[2], extent[2]]) {
        const point = vec3.transformMat4(vec3.create(), [x, y, z], matrix);
        for (let axis = 0; axis < 3; axis++) {
          bounds.min[axis] = Math.min(bounds.min[axis], point[axis]);
          bounds.max[axis] = Math.max(bounds.max[axis], point[axis]);
        }
        bounds.populated = true;
      }
    }
  }
}
function finalizeBounds(bounds) {
  return bounds.populated ? {
    min: bounds.min,
    max: bounds.max
  } : {
    min: [0, 0, 0],
    max: [0, 0, 0]
  };
}
function projectHullBanners(values) {
  const groups = new Map();
  let reference = 0;
  for (const value of Array.isArray(values) ? values : []) {
    if (!value) continue;
    const usage = Number(value.usage ?? 3);
    if (!groups.has(usage)) groups.set(usage, {
      usage,
      items: []
    });
    const light = value.lightOverride ?? {};
    groups.get(usage).items.push({
      item: projectBannerItem(value, reference++),
      visibilityGroup: fnv1(String(value.visibilityGroup ?? "primary")),
      visibilityGroupName: String(value.visibilityGroup ?? "primary"),
      bannerLight: {
        radiusMultiplier: Number(light.radiusMultiplier ?? 1),
        brightness: Number(light.brightness ?? 1),
        innerRadiusMultiplier: Number(light.innerRadiusMultiplier ?? 0.3),
        noiseAmplitude: Number(light.noiseAmplitude ?? 0),
        noiseFrequency: Number(light.noiseFrequency ?? 1),
        noiseOctaves: Number(light.noiceOctaves ?? light.noiseOctaves ?? 1),
        saturation: Number(light.saturation ?? 1)
      }
    });
  }
  return [...groups.values()];
}
function projectHullBannerSets(values) {
  const result = [];
  let reference = 0;
  for (const value of Array.isArray(values) ? values : []) {
    if (!value) continue;
    const groups = new Map();
    for (const banner of Array.isArray(value.banners) ? value.banners : []) {
      if (!banner) continue;
      const usage = Number(banner.usage ?? 3);
      if (!groups.has(usage)) groups.set(usage, []);
      groups.get(usage).push({
        item: projectBannerItem(banner, reference++),
        light: projectPointLightAttachment(banner.light)
      });
    }
    result.push({
      visibilityGroup: fnv1(String(value.visibilityGroup ?? "primary")),
      visibilityGroupName: String(value.visibilityGroup ?? "primary"),
      bannerTypes: new Map([...groups.entries()].sort(([left], [right]) => left - right))
    });
  }
  return result;
}
function projectBannerItem(value, reference) {
  return {
    position: copyArray(value.position, [0, 0, 0]),
    scaling: copyArray(value.scaling, [1, 1, 1]),
    rotation: copyArray(value.rotation, [0, 0, 0, 1]),
    angleX: Number(value.angleX ?? 0),
    angleY: Number(value.angleY ?? 0),
    bone: Number(value.boneIndex ?? -1),
    reference
  };
}
function projectHullHazeSets(values) {
  return (Array.isArray(values) ? values : []).filter(Boolean).map(value => ({
    hazeType: Number(value.hazeType ?? 0),
    skinned: value.skinned === true,
    visibilityGroup: fnv1(String(value.visibilityGroup ?? "primary")),
    visibilityGroupName: String(value.visibilityGroup ?? "primary"),
    items: (Array.isArray(value.items) ? value.items : []).filter(Boolean).map(item => ({
      colorType: Number(item.colorType ?? 0),
      boneIndex: Number(item.boneIndex ?? -1),
      position: copyArray(item.position, [0, 0, 0]),
      scaling: copyArray(item.scaling, [1, 1, 1]),
      rotation: copyArray(item.rotation, [0, 0, 0, 1]),
      hazeBrightness: Number(item.hazeBrightness ?? 1),
      hazeFalloff: Number(item.hazeFalloff ?? 6),
      sourceBrightness: Number(item.sourceBrightness ?? 2),
      sourceSize: Number(item.sourceSize ?? 0.2),
      boosterGainInfluence: item.boosterGainInfluence === true,
      saturation: Number(item.saturation ?? 1),
      lights: (Array.isArray(item.lights) ? item.lights : []).filter(Boolean).map(projectPointLightAttachment)
    }))
  }));
}
function projectHullSpriteLineSets(values) {
  return (Array.isArray(values) ? values : []).filter(Boolean).map(value => ({
    skinned: value.skinned === true,
    visibilityGroup: fnv1(String(value.visibilityGroup ?? "primary")),
    visibilityGroupName: String(value.visibilityGroup ?? "primary"),
    items: (Array.isArray(value.items) ? value.items : []).filter(Boolean).map(item => ({
      blinkPhaseShift: Number(item.blinkPhaseShift ?? 0),
      blinkPhase: Number(item.blinkPhase ?? 0),
      blinkRate: Number(item.blinkRate ?? 0.1),
      boneIndex: Number(item.boneIndex ?? 0),
      falloff: Number(item.falloff ?? 0),
      maxScale: Number(item.maxScale ?? 10),
      minScale: Number(item.minScale ?? 1),
      position: copyArray(item.position, [0, 0, 0]),
      scaling: copyArray(item.scaling, [1, 1, 1]),
      rotation: copyArray(item.rotation, [0, 0, 0, 1]),
      spacing: Number(item.spacing ?? 1),
      isCircle: item.isCircle === true,
      intensity: Number(item.intensity ?? 1),
      saturation: Number(item.saturation ?? 1),
      colorType: Number(item.colorType ?? 0),
      light: projectPointLightAttachment(item.light)
    }))
  }));
}
function projectHullPlaneSets(values) {
  return (Array.isArray(values) ? values : []).filter(Boolean).map(value => ({
    layer1MapResPath: String(value.layer1MapResPath ?? ""),
    layer2MapResPath: String(value.layer2MapResPath ?? ""),
    maskMapResPath: String(value.maskMapResPath ?? ""),
    visibilityGroup: fnv1(String(value.visibilityGroup ?? "primary")),
    visibilityGroupName: String(value.visibilityGroup ?? "primary"),
    atlasSize: Number(value.atlasSize ?? 1) >>> 0,
    atlasAspectRatio: copyArray(value.atlasAspectRatio, [1, 1]),
    skinned: value.skinned === true,
    usage: Number(value.usage ?? 0),
    items: (Array.isArray(value.items) ? value.items : []).filter(Boolean).map(item => ({
      boneIndex: Number(item.boneIndex ?? -1),
      layer1Scroll: copyArray(item.layer1Scroll, [0, 0, 0, 0]),
      layer1Transform: copyArray(item.layer1Transform, [0, 0, 0, 0]),
      layer2Scroll: copyArray(item.layer2Scroll, [0, 0, 0, 0]),
      layer2Transform: copyArray(item.layer2Transform, [0, 0, 0, 0]),
      position: copyArray(item.position, [0, 0, 0]),
      rotation: copyArray(item.rotation, [0, 0, 0, 1]),
      scaling: copyArray(item.scaling, [1, 1, 1]),
      color: copyArray(item.color, [1, 1, 1, 1]),
      colorType: Number(item.colorType ?? 0),
      intensity: Number(item.intensity ?? 1),
      groupIndex: Number(item.groupIndex ?? -1),
      maskMapAtlasIndex: Number(item.maskMapAtlasIndex ?? 0),
      rate: Number(item.blinkRate ?? 1),
      phase: Number(item.blinkPhase ?? 0),
      dutyCycle: Number(item.dutyCycle ?? 1),
      blinkMode: Number(item.blinkMode ?? 0),
      saturation: Number(item.saturation ?? 1),
      lights: (Array.isArray(item.lights) ? item.lights : []).filter(Boolean).map(projectPointLightAttachment)
    }))
  }));
}
function projectHullSpotlightSets(values) {
  return (Array.isArray(values) ? values : []).filter(Boolean).map(value => ({
    skinned: value.skinned === true,
    zOffset: Number(value.zOffset ?? 0),
    visibilityGroup: fnv1(String(value.visibilityGroup ?? "primary")),
    visibilityGroupName: String(value.visibilityGroup ?? "primary"),
    coneTextureResPath: String(value.coneTextureResPath ?? ""),
    glowTextureResPath: String(value.glowTextureResPath ?? ""),
    items: (Array.isArray(value.items) ? value.items : []).filter(Boolean).map(item => ({
      boneIndex: Number(item.boneIndex ?? 0),
      boosterGainInfluence: item.boosterGainInfluence === true,
      colorType: Number(item.colorType ?? 12),
      spriteScale: copyArray(item.spriteScale, [1, 1, 1]),
      transform: copyArray(item.transform, identityMatrix()),
      groupIndex: Number(item.groupIndex ?? -1),
      coneIntensity: Number(item.coneIntensity ?? 0),
      flareIntensity: Number(item.flareIntensity ?? 0),
      spriteIntensity: Number(item.spriteIntensity ?? 0),
      saturation: Number(item.saturation ?? 1),
      light: projectSpotLightAttachment(item.light)
    }))
  }));
}
function projectSpotLightAttachment(value) {
  if (!value) return null;
  return {
    translation: copyArray(value.translation, [0, 0, 0]),
    saturation: Number(value.saturation ?? 1),
    intensity: Number(value.intensity ?? 1),
    innerAngleMultiplier: Number(value.innerAngleMultiplier ?? 0.5),
    outerAngleMultiplier: Number(value.outerAngleMultiplier ?? 1),
    innerScaleMultiplier: Number(value.innerScaleMultiplier ?? 1),
    outerScaleMultiplier: Number(value.outerScaleMultiplier ?? 1),
    noiseAmplitude: Number(value.noiseAmplitude ?? 0),
    noiseFrequency: Number(value.noiseFrequency ?? 1),
    noiseOctaves: Number(value.noiseOctaves ?? 1),
    lightProfilePath: String(value.lightProfilePath ?? "")
  };
}
function projectHullSpriteSets(values) {
  return (Array.isArray(values) ? values : []).filter(Boolean).map(value => ({
    skinned: value.skinned === true,
    visibilityGroup: fnv1(String(value.visibilityGroup ?? "primary")),
    visibilityGroupName: String(value.visibilityGroup ?? "primary"),
    items: (Array.isArray(value.items) ? value.items : []).filter(Boolean).map(item => ({
      position: copyArray(item.position, [0, 0, 0]),
      blinkRate: Number(item.blinkRate ?? 0.1),
      blinkPhase: Number(item.blinkPhase ?? 0),
      minScale: Number(item.minScale ?? 1),
      maxScale: Number(item.maxScale ?? 10),
      falloff: Number(item.falloff ?? 0),
      intensity: Number(item.intensity ?? 1),
      saturation: Number(item.saturation ?? 1),
      boneIndex: Number(item.boneIndex ?? 0),
      colorType: Number(item.colorType ?? 0),
      light: projectPointLightAttachment(item.light)
    }))
  }));
}
function projectPointLightAttachment(value) {
  if (!value) return null;
  return {
    translation: copyArray(value.translation, [0, 0, 0]),
    rotation: copyArray(value.rotation, [0, 0, 0, 1]),
    saturation: Number(value.saturation ?? 1),
    intensity: Number(value.intensity ?? 1),
    innerScaleMultiplier: Number(value.innerScaleMultiplier ?? 1),
    outerScaleMultiplier: Number(value.outerScaleMultiplier ?? 2),
    noiseAmplitude: Number(value.noiseAmplitude ?? 0),
    noiseFrequency: Number(value.noiseFrequency ?? 1),
    noiseOctaves: Number(value.noiseOctaves ?? 1),
    lightProfilePath: String(value.lightProfilePath ?? "")
  };
}
function projectHullLightSets(values) {
  return (Array.isArray(values) ? values : []).filter(Boolean).map(value => ({
    visibilityGroup: fnv1(String(value.visibilityGroup ?? "primary")),
    visibilityGroupName: String(value.visibilityGroup ?? "primary"),
    items: (Array.isArray(value.items) ? value.items : []).filter(Boolean).map(projectHullLightSetItem)
  }));
}
function projectHullLightSetItem(value) {
  return {
    type: getHullLightType(value),
    position: copyArray(value.position, [0, 0, 0]),
    rotation: copyArray(value.rotation, [0, 0, 0, 1]),
    radius: Number(value.radius ?? 0),
    innerRadius: Number(value.innerRadius ?? 0),
    brightness: Number(value.brightness ?? 0),
    noiseAmplitude: Number(value.noiseAmplitude ?? 0),
    noiseFrequency: Number(value.noiseFrequency ?? 1),
    noiseOctaves: Number(value.noiseOctaves ?? 1),
    lightColor: Number(value.lightColor ?? 0),
    texturePath: String(value.texturePath ?? ""),
    innerAngle: Number(value.innerAngle ?? 0),
    outerAngle: Number(value.outerAngle ?? 0),
    boneIndex: Number(value.boneIndex ?? -1),
    flags: Number(value.flags ?? 1)
  };
}
function getHullLightType(value) {
  if (Number.isInteger(value?.type)) return Number(value.type);
  const className = getStableClassName(value);
  if (className.endsWith("TexturedPointLight")) return 1;
  if (className.endsWith("SpotLight")) return 2;
  return 0;
}
function getStableClassName(value) {
  return String(CjsSchema.getClassName(value?.constructor) ?? value?._sourceClassName ?? "");
}
function projectLocatorSet(value, target, state) {
  if (!value) return;
  if (Array.isArray(value.locators)) {
    const name = String(value.name ?? "");
    for (const locator of value.locators) {
      if (!target.has(name)) target.set(name, []);
      const locators = target.get(name);
      locators.push({
        position: copyArray(locator?.position, [0, 0, 0]),
        rotation: copyArray(locator?.rotation, [0, 0, 0, 1]),
        scaling: copyArray(locator?.scaling, [1, 1, 1]),
        boneIndex: Number(locator?.boneIndex ?? -1),
        uniqueID: state.uniqueID++
      });
    }
    return;
  }
  for (const child of Array.isArray(value.locatorSets) ? value.locatorSets : []) {
    projectLocatorSet(child, target, state);
  }
}
function projectHullDecalSets(values) {
  return (Array.isArray(values) ? values : []).filter(Boolean).map(value => ({
    visibilityGroup: fnv1(String(value.visibilityGroup ?? "primary")),
    visibilityGroupName: String(value.visibilityGroup ?? "primary"),
    items: (Array.isArray(value.items) ? value.items : []).filter(Boolean).map(projectHullDecalSetItem)
  }));
}
function projectHullDecalSetItem(value) {
  return {
    usage: Number(value.usage ?? 0),
    position: copyArray(value.position, [0, 0, 0]),
    rotation: copyArray(value.rotation, [0, 0, 0, 1]),
    scaling: copyArray(value.scaling, [1, 1, 1]),
    boneIndex: Number(value.boneIndex ?? -1),
    meshIndex: Number(value.meshIndex ?? -1),
    glowColorType: Number(value.glowColorType ?? 0),
    logoType: Number(value.logoType ?? 0),
    textures: projectTextureMap(value.textures),
    parameters: projectParameterMap(value.parameters),
    indexBuffers: projectDecalIndexBuffers(value.indexBuffers),
    multiHullIndexBuffers: (Array.isArray(value.multiHullIndexBuffers) ? value.multiHullIndexBuffers : []).filter(Boolean).map(item => ({
      combinedGeometryResPath: String(item.combinedGeometryResPath ?? ""),
      indexBuffers: projectDecalIndexBuffers(item.indexBuffers)
    }))
  };
}
function projectDecalIndexBuffers(values) {
  return (Array.isArray(values) ? values : []).filter(Boolean).map(value => {
    const source = typeof value.GetIndices === "function" ? value.GetIndices() : value.indexBuffer;
    return Array.from(source ?? [], index => Number(index) >>> 0);
  });
}
function projectFaction(value) {
  const logos = LOGO_KEYS.map(key => ({
    textures: projectTextureMap(selectNamedSlot(value.logoSet, key, "logos")?.textures)
  }));
  const visibilityGroups = (Array.isArray(value.visibilityGroupSet?.visibilityGroups) ? value.visibilityGroupSet.visibilityGroups : []).map(item => String(item?.str ?? ""));
  const visibilityData = new Set(visibilityGroups.map(name => fnv1(name)));
  const spotlightSetsColors = new Map();
  for (const set of Array.isArray(value.spotlightSets) ? value.spotlightSets : []) {
    if (!set) continue;
    spotlightSetsColors.set(Number(set.groupIndex ?? -1), {
      coneColor: copyArray(set.coneColor, [0, 0, 0, 0]),
      flareColor: copyArray(set.flareColor, [0, 0, 0, 0]),
      spriteColor: copyArray(set.spriteColor, [0, 0, 0, 0])
    });
  }
  const planeSetsColors = new Map();
  for (const set of Array.isArray(value.planeSets) ? value.planeSets : []) {
    if (!set) continue;
    planeSetsColors.set(Number(set.groupIndex ?? -1), {
      color: copyArray(set.color, [0, 0, 0, 0])
    });
  }
  const factionChildren = new Map();
  for (const child of Array.isArray(value.children) ? value.children : []) {
    if (!child) continue;
    factionChildren.set(Number(child.groupIndex ?? -1), {
      groupIndex: Number(child.groupIndex ?? -1),
      name: String(child.name ?? ""),
      isVisible: child.isVisible === true
    });
  }
  return {
    ...value,
    colorData: {
      colors: value.colorSet ? FACTION_COLOR_KEYS.map((key, index) => {
        const color = selectNamedSlot(value.colorSet, key, "colors");
        return isVector4(color) ? copyVector(color) : factionColorDefault(index);
      }) : FACTION_COLOR_KEYS.map(() => [0, 0, 0, 0])
    },
    areaMaterials: projectAreaMaterials(value.areaTypes),
    visibilityGroups,
    logoSetData: {
      logos
    },
    visibilityData,
    spotlightSetsColors,
    planeSetsColors,
    factionChildren,
    materialUsageList: [value.materialUsageMtl1 ?? 0, value.materialUsageMtl2 ?? 1, value.materialUsageMtl3 ?? 2, value.materialUsageMtl4 ?? 3],
    defaultPatternInfo: projectPatternLayer(value.defaultPattern, null),
    defaultPatternLayer1MaterialName: String(value.defaultPatternLayer1MaterialName ?? ""),
    defaultPatternLayer2MaterialName: String(value.defaultPatternLayer2MaterialName ?? ""),
    defaultPatternName: String(value.defaultPatternName ?? "")
  };
}
function projectRace(value) {
  const areaMaterials = createAreaMaterialData();
  areaMaterials.glowColor.set("0:GeneralHeatGlowColor", Number(value.hullPrimaryHeatColorType ?? 0));
  areaMaterials.glowColor.set("3:GeneralHeatGlowColor", Number(value.hullReactorHeatColorType ?? 0));
  return {
    ...value,
    areaMaterials,
    boosters: projectRaceBooster(value.booster),
    damage: projectRaceDamage(value.damage)
  };
}
function projectRaceBooster(value) {
  return {
    scale: copyArray(value?.scale, [1, 1, 1, 1]),
    glowScale: Number(value?.glowScale ?? 1),
    glowColor: copyArray(value?.glowColor, [0, 0, 0, 0]),
    warpGlowColor: copyArray(value?.warpGlowColor, [0, 0, 0, 0]),
    symHaloScale: Number(value?.symHaloScale ?? 1),
    haloScaleX: Number(value?.haloScaleX ?? 1),
    haloScaleY: Number(value?.haloScaleY ?? 1),
    haloColor: copyArray(value?.haloColor, [0, 0, 0, 0]),
    warpHaloColor: copyArray(value?.warpHaloColor ?? value?.warpHalpColor, [0, 0, 0, 0]),
    trailColor: copyArray(value?.trailColor, [0, 0, 0, 0]),
    trailSize: copyArray(value?.trailSize, [0, 0, 0, 0]),
    shape0: projectRaceBoosterShape(value?.shape0),
    shape1: projectRaceBoosterShape(value?.shape1),
    warpShape0: projectRaceBoosterShape(value?.warpShape0),
    warpShape1: projectRaceBoosterShape(value?.warpShape1),
    shapeAtlasResPath: String(value?.shapeAtlasResPath ?? ""),
    gradient0ResPath: String(value?.gradient0ResPath ?? ""),
    gradient1ResPath: String(value?.gradient1ResPath ?? ""),
    shapeAtlasHeight: Number(value?.shapeAtlasHeight ?? 0) >>> 0,
    shapeAtlasCount: Number(value?.shapeAtlasCount ?? 0) >>> 0,
    lightOffset: Number(value?.lightOffset ?? 0),
    lightRadius: Number(value?.lightRadius ?? 0),
    lightWarpRadius: Number(value?.lightWarpRadius ?? 0),
    lightFlickerAmplitude: Number(value?.lightFlickerAmplitude ?? 0),
    lightFlickerFrequency: Number(value?.lightFlickerFrequency ?? 0),
    lightColor: copyArray(value?.lightColor, [0, 0, 0, 0]),
    lightWarpColor: copyArray(value?.lightWarpColor, [0, 0, 0, 0])
  };
}
function projectRaceBoosterShape(value) {
  return {
    noiseFunction: Number(value?.noiseFunction ?? 0),
    noiseSpeed: Number(value?.noiseSpeed ?? 0),
    noiseAmplitureStart: copyArray(value?.noiseAmplitureStart, [0, 0, 0, 0]),
    noiseAmplitureEnd: copyArray(value?.noiseAmplitureEnd, [0, 0, 0, 0]),
    noiseFrequency: copyArray(value?.noiseFrequency, [0, 0, 0, 0]),
    color: copyArray(value?.color, [0, 0, 0, 0])
  };
}
function projectRaceDamage(value) {
  return {
    armorDamageParameters: projectParameterMap(value?.armorImpactParameters),
    armorDamageTextures: projectTextureMap(value?.armorImpactTextures),
    shieldDamageParameters: projectParameterMap(value?.shieldImpactParameters),
    shieldDamageTextures: projectTextureMap(value?.shieldImpactTextures)
  };
}
function projectParameterMap(values) {
  const result = new Map();
  for (const value of Array.isArray(values) ? values : []) {
    if (value) result.set(String(value.name ?? ""), copyVector(value.value));
  }
  return new Map([...result].sort(([a], [b]) => a.localeCompare(b)));
}
function projectTextureMap(values) {
  const result = new Map();
  for (const value of Array.isArray(values) ? values : []) {
    if (value) result.set(String(value.name ?? ""), {
      resFilePath: String(value.resFilePath ?? "")
    });
  }
  return new Map([...result].sort(([a], [b]) => a.localeCompare(b)));
}
function projectMaterial(value) {
  const parameters = new Map();
  for (const parameter of Array.isArray(value.parameters) ? value.parameters : []) {
    // Carbon copies the Vector4 by value into the map
    // (EveSOFDataMgr.cpp:1845-1855); do not alias the authored array.
    if (parameter) parameters.set(String(parameter.name), copyArray(parameter.value, [0, 0, 0, 0]));
  }
  return {
    ...value,
    parameters
  };
}
function projectPattern(value) {
  const oldApplicationData = new Map();
  const applicationData = new Map();
  // Carbon copies the layer struct BY VALUE into every application pair
  // (EveSOFDataMgr.cpp:1538-1570 push_back(make_pair(pld, ppd))), so each
  // hull application owns an independent layer record.
  for (const hull of Array.isArray(value.projections) ? value.projections : []) {
    oldApplicationData.set(String(hull?.name ?? ""), {
      layerAndProjection: [{
        layer: projectPatternLayer(value.layer1, null),
        projection: projectPatternProjection(hull?.transformLayer1)
      }, {
        layer: projectPatternLayer(value.layer2, null),
        projection: projectPatternProjection(hull?.transformLayer2)
      }]
    });
  }
  for (const group of Array.isArray(value.applicationGroups) ? value.applicationGroups : []) {
    for (const hull of Array.isArray(group?.projections) ? group.projections : []) {
      const layerAndProjection = [];
      if (value.layer1 && group.layer1Properties && hull?.transformLayer1) {
        layerAndProjection.push({
          layer: projectPatternLayer(value.layer1, group.layer1Properties),
          projection: projectPatternProjection(hull.transformLayer1)
        });
      }
      if (value.layer2 && group.layer2Properties && hull?.transformLayer2) {
        layerAndProjection.push({
          layer: projectPatternLayer(value.layer2, group.layer2Properties),
          projection: projectPatternProjection(hull.transformLayer2)
        });
      }
      applicationData.set(String(hull?.name ?? ""), {
        layerAndProjection
      });
    }
  }
  return {
    ...value,
    oldApplicationData,
    applicationData
  };
}
function projectPatternLayer(layer, properties) {
  const applicableAreas = new Map(Array.from({
    length: 11
  }, (_, index) => [index, true]));
  if (properties) {
    const keys = ["Primary", "Glass", "Sails", "Reactor", "Darkhull", null, "Rock", "Monument", "Ornament", "SimplePrimary", null];
    keys.forEach((key, index) => {
      applicableAreas.set(index, key ? properties[key] !== false : true);
    });
  }
  if (!layer) {
    return {
      textureName: "",
      textureResFilePath: "",
      projectionAddressModeU: 1,
      projectionAddressModeV: 1,
      materialSourceID: 0,
      materialTargets: [0, 0, 0, 0],
      applicableAreas
    };
  }
  const source = properties ?? layer;
  return {
    textureName: String(layer.textureName ?? ""),
    textureResFilePath: String(layer.textureResFilePath ?? ""),
    projectionAddressModeU: projectAddressMode(source.projectionTypeU),
    projectionAddressModeV: projectAddressMode(source.projectionTypeV),
    materialSourceID: Number(layer.materialSource ?? 0),
    materialTargets: [source.isTargetMtl1, source.isTargetMtl2, source.isTargetMtl3, source.isTargetMtl4].map(value => value === false ? 0 : 1),
    applicableAreas
  };
}
function projectPatternProjection(value) {
  return value ? {
    enabled: true,
    position: copyArray(value.position, [0, 0, 0]),
    scaling: copyArray(value.scaling, [1, 1, 1]),
    rotation: copyArray(value.rotation, [0, 0, 0, 1]),
    isMirrored: value.isMirrored === true
  } : {
    enabled: false,
    position: [0, 0, 0],
    scaling: [1, 1, 1],
    rotation: [0, 0, 0, 1],
    isMirrored: false
  };
}
function projectAddressMode(value) {
  if (Number(value) === 1) return 3;
  if (Number(value) === 2) return 4;
  return 1;
}
function projectLayout(value) {
  return {
    name: String(value?.name ?? ""),
    seed: Number(value?.seed ?? 1337) >>> 0,
    scrambleSeed: value?.randomizeSeedOnLoad === true,
    placements: projectExtensionPlacements(value?.placements),
    depletionCounters: projectDepletionCounters(value?.depletionCounters)
  };
}
function projectExtensionPlacements(values) {
  return (Array.isArray(values) ? values : []).filter(Boolean).map(projectExtensionPlacement);
}
function projectExtensionPlacement(value) {
  if (isExtensionPlacementGroup(value)) {
    return {
      name: String(value.name ?? ""),
      enabled: value.enabled !== false,
      isAGroup: true,
      depletionCounters: projectDepletionCounters(value.depletionCounters),
      placements: projectExtensionPlacements(value.placements),
      placementConditions: projectDistributionConditions(value.distributionConditions)
    };
  }
  return {
    name: String(value.name ?? ""),
    enabled: value.enabled !== false,
    offset: copyArray(value.offset, [0, 0, 0]),
    locatorSetName: String(value.locatorSetName ?? ""),
    descriptor: projectDnaDescriptor(value.descriptor),
    isInstanced: value.isInstanced !== false,
    isShared: value.isShared === true,
    extendsBoundingSphere: value.extendsBoundingSphere !== false,
    extendsShieldEllipsoid: value.extendsShieldEllipsoid !== false,
    hasDistribution: value.distribution != null,
    distribution: projectPlacementDistribution(value.distribution),
    placementConditions: projectDistributionConditions(value.distributionConditions),
    isAGroup: false,
    depletionCounters: [],
    placements: []
  };
}
function isExtensionPlacementGroup(value) {
  const className = getStableClassName(value);
  // Carbon's unpacker currently casts Bucket through its concrete Placement
  // lineage, so it does not recurse into Bucket. JavaScript deliberately keeps
  // Bucket group-like because the authored type owns `placements`; retain this
  // compatibility repair until authored data or a native fixture proves the
  // native leaf behavior is required.
  if (className === "EveSOFDataHullExtensionBucket" || value?.IsBucket?.() === true) return true;
  if (className === "EveSOFDataHullExtensionPlacementGroup") return true;
  if (className === "EveSOFDataHullExtensionPlacement") return false;
  return Array.isArray(value?.placements) && !Object.hasOwn(value, "descriptor") && !Object.hasOwn(value, "locatorSetName");
}
function projectDnaDescriptor(value) {
  return {
    hull: String(value?.hull ?? ""),
    faction: String(value?.faction ?? ""),
    race: String(value?.race ?? ""),
    pattern: String(value?.pattern ?? ""),
    material1: String(value?.material1 ?? ""),
    material2: String(value?.material2 ?? ""),
    material3: String(value?.material3 ?? ""),
    material4: String(value?.material4 ?? ""),
    layout: String(value?.layout ?? ""),
    seed: String(value?.seed ?? "")
  };
}
function projectPlacementDistribution(value) {
  return {
    completeness: Number(value?.completeness ?? 1),
    placementBias: copyArray(value?.placementBias, [0, 0, 0]),
    centerBias: Number(value?.centerBias ?? 0),
    cap: Number(value?.cap ?? 0) | 0,
    randomRotationStepSizeYPR: copyArray(value?.randomRotationStepSizeYPR, [0.008802, 0.0086497, 0.0086497, 0.9998864]),
    randomRotationMaxSteps: copyArray(value?.randomRotationMaxSteps, [0, 0, 0]),
    randomScaleMin: copyArray(value?.randomScaleMin, [1, 1, 1]),
    randomScaleMax: copyArray(value?.randomScaleMax, [1, 1, 1]),
    uniformScaling: value?.uniformScale !== false,
    occupyLocators: value?.occupyLocators !== false
  };
}
function projectDistributionConditions(values) {
  return (Array.isArray(values) ? values : []).filter(Boolean).map(projectDistributionCondition);
}
function projectDistributionCondition(value) {
  const className = getStableClassName(value);
  const result = {
    distributionType: _EveSOFDataMgr.DistributionMethod.RANDOM_INCLUCION,
    seed: 0,
    spaceObjectParentDescriptor: projectDnaDescriptor(null),
    depletionCounters: [],
    triggerChance: 0,
    displayModifier: 0
  };
  if (className.endsWith("ParentMatch") || Object.hasOwn(value, "parentDescriptor")) {
    result.distributionType = _EveSOFDataMgr.DistributionMethod.PARENT_MATCH;
    result.spaceObjectParentDescriptor = projectDnaDescriptor(value.parentDescriptor);
  } else if (className.endsWith("DepletionCounter") || Object.hasOwn(value, "depletionCounters")) {
    result.distributionType = _EveSOFDataMgr.DistributionMethod.DEPLETION_COUNTER;
    result.depletionCounters = projectDepletionCounters(value.depletionCounters);
  } else if (className.endsWith("MapGraphicSettings") || Object.hasOwn(value, "displayFilter")) {
    result.distributionType = _EveSOFDataMgr.DistributionMethod.GRAPHIC_SETTING_MAP;
    result.displayModifier = Number(value.displayFilter ?? 5) | 0;
  } else if (className.endsWith("RandomChance") || Object.hasOwn(value, "chanceOfUsage")) {
    result.triggerChance = Number(value.chanceOfUsage ?? 1);
  }
  return result;
}
function projectDepletionCounters(values) {
  return (Array.isArray(values) ? values : []).filter(Boolean).map(value => ({
    counterName: String(value.name ?? value.counterName ?? ""),
    counterValue: Number(value.value ?? value.counterValue ?? 1) | 0
  }));
}
function createGenericData(value) {
  if (!value) {
    return {
      materialPrefixes: [],
      patternMaterialPrefixes: [],
      variants: new Map(),
      areaShaderData: new Map(),
      decalShaderData: new Map(),
      decalMinScreenSize: [0, 0, 0, 0, 0, 0, 0],
      damage: projectGenericDamage(null),
      hullDamage: projectGenericHullDamage(null),
      swarmBehavior: projectSwarmBehavior(null)
    };
  }
  const materialPrefixes = (Array.isArray(value.materialPrefixes) ? value.materialPrefixes : []).map(item => typeof item === "string" ? item : String(item?.str ?? ""));
  const patternMaterialPrefixes = (Array.isArray(value.patternMaterialPrefixes) ? value.patternMaterialPrefixes : []).map(item => typeof item === "string" ? item : String(item?.str ?? ""));
  const areaShaderData = new Map();
  for (const shader of Array.isArray(value.areaShaders) ? value.areaShaders : []) {
    if (shader) areaShaderData.set(String(shader.shader), projectGenericShader(shader));
  }
  const decalShaderData = new Map();
  for (const shader of Array.isArray(value.decalShaders) ? value.decalShaders : []) {
    if (shader) decalShaderData.set(String(shader.shader), {
      parameters: (Array.isArray(shader.parameters) ? shader.parameters : []).map(item => typeof item === "string" ? item : String(item?.str ?? "")),
      defaultTextures: projectTextureMap(shader.defaultTextures),
      parentTextures: (Array.isArray(shader.parentTextures) ? shader.parentTextures : []).map(item => typeof item === "string" ? item : String(item?.str ?? "")),
      additive: shader.additive === true
    });
  }
  const variants = new Map();
  for (const variant of Array.isArray(value.variants) ? value.variants : []) {
    if (!variant?.hullArea) continue;
    variants.set(String(variant.name), {
      ...variant,
      hullAreaData: projectHullArea(variant.hullArea)
    });
  }
  const categoryData = new Map();
  for (const category of Array.isArray(value.hullCategoriesData) ? value.hullCategoriesData : []) {
    if (category?.name) categoryData.set(String(category.name), Number(category.reflectionMode ?? 0));
  }
  return {
    ...value,
    materialPrefixes,
    patternMaterialPrefixes,
    areaShaderData,
    decalShaderData,
    categoryData,
    decalMinScreenSize: [Number(value.decalMinScreenSizeSTANDARD ?? 0), Number(value.decalMinScreenSizeKILLCOUNTER ?? 0), Number(value.decalMinScreenSizeHOLE ?? 0), Number(value.decalMinScreenSizeCYLINDRICAL ?? 0), Number(value.decalMinScreenSizeGLOWCYLINDRICAL ?? 0), Number(value.decalMinScreenSizeGLOWSTANDARD ?? 0), Number(value.decalMinScreenSizeLOGO ?? 0)],
    genericWreckMaterialData: projectSingleAreaMaterial(value.genericWreckMaterial, 5),
    damage: projectGenericDamage(value.damage),
    hullDamage: projectGenericHullDamage(value.hullDamage),
    swarmBehavior: projectSwarmBehavior(value.swarm),
    variants,
    bannerShader: value.bannerShader ? projectGenericShader(value.bannerShader) : null
  };
}
function projectSwarmBehavior(value) {
  return {
    mass: 1,
    speedMultiplier: Number(value?.speedMultiplier ?? 1.1),
    speedMinimum: Number(value?.speedMinimum ?? 10),
    agility: 2,
    maxDistance0: Number(value?.maxDistance0 ?? 500),
    maxDistance1: Number(value?.maxDistance1 ?? 125),
    timeMultiplier: 1,
    maxTime: Number(value?.maxTime ?? 0.2),
    speed0: Number(value?.speed0 ?? 700),
    speed1: Number(value?.speed1 ?? 1000),
    weightCohesion: Number(value?.weightCohesion ?? 0.1),
    weightSeparation: Number(value?.weightSeparation ?? 0.1),
    separationDistance: Number(value?.separationDistance ?? 250),
    weightAlign: Number(value?.weightAlign ?? 50),
    weightWander: Number(value?.weightWander ?? 0.33),
    wanderFluctuation: Number(value?.wanderFluctuation ?? 0.05),
    wanderDistance: Number(value?.wanderDistance ?? 100),
    wanderRadius: Number(value?.wanderRadius ?? 80),
    weightAnchor: Number(value?.weightAnchor ?? 0.5),
    anchorRadius0: Number(value?.anchorRadius0 ?? 75),
    anchorRadius1: Number(value?.anchorRadius1 ?? 250),
    weightDecelerate: Number(value?.weightDeceleration ?? 0.1),
    maxDeceleration: Number(value?.maxDeceleration ?? 200),
    weightFormation: Number(value?.weightFormation ?? 1),
    formationDistance: Number(value?.formationDistance ?? 50)
  };
}
function projectGenericDamage(value) {
  if (!value) {
    value = {};
  }
  return {
    flickerPerlinSpeed: Number(value.flickerPerlinSpeed ?? 0),
    flickerPerlinAlpha: Number(value.flickerPerlinAlpha ?? 0),
    flickerPerlinBeta: Number(value.flickerPerlinBeta ?? 0),
    flickerPerlinN: Number(value.flickerPerlinN ?? 0),
    armorParticleRate: Number(value.armorParticleRate ?? 0),
    armorParticleAngle: Number(value.armorParticleAngle ?? 0),
    armorParticleMinMaxSpeed: copyArray(value.armorParticleMinMaxSpeed, [0, 0]),
    armorParticleMinMaxLifeTime: copyArray(value.armorParticleMinMaxLifeTime, [0, 0]),
    armorParticleSizes: copyArray(value.armorParticleSizes, [0, 0, 0, 0]),
    armorParticleColors: [copyVector(value.armorParticleColor0), copyVector(value.armorParticleColor1), copyVector(value.armorParticleColor2), copyVector(value.armorParticleColor3)],
    armorParticleTextureIndex: Number(value.armorParticleTextureIndex ?? 0),
    armorParticleVelocityStretchRotation: Number(value.armorParticleVelocityStretchRotation ?? 0),
    armorParticleDrag: Number(value.armorParticleDrag ?? 0),
    armorParticleTurbulenceAmplitude: Number(value.armorParticleTurbulenceAmplitude ?? 0),
    armorParticleTurbulenceFrequency: Number(value.armorParticleTurbulenceFrequency ?? 0),
    armorParticleColorMidPoint: Number(value.armorParticleColorMidPoint ?? 0),
    armorShader: String(value.armorShader ?? ""),
    shieldShaderEllipsoid: String(value.shieldShaderEllipsoid ?? ""),
    shieldShaderHull: String(value.shieldShaderHull ?? ""),
    shieldGeometryResFilePath: String(value.shieldGeometryResFilePath ?? "")
  };
}
function projectGenericHullDamage(value) {
  if (!value) {
    value = {};
  }
  return {
    hullParticleRate: Number(value.hullParticleRate ?? 0),
    hullParticleAngle: Number(value.hullParticleAngle ?? 0),
    hullParticleInnerAngle: Number(value.hullParticleInnerAngle ?? 0),
    hullParticleColorMidpoint: Number(value.hullParticleColorMidpoint ?? 0),
    hullParticleMinMaxSpeed: copyArray(value.hullParticleMinMaxSpeed, [0, 0]),
    hullParticleMinMaxLifeTime: copyArray(value.hullParticleMinMaxLifeTime, [0, 0]),
    hullParticleSizes: copyArray(value.hullParticleSizes, [0, 0, 0, 0]),
    hullParticleColors: [copyVector(value.hullParticleColor0), copyVector(value.hullParticleColor1), copyVector(value.hullParticleColor2), copyVector(value.hullParticleColor3)],
    hullParticleTextureIndex: Number(value.hullParticleTextureIndex ?? 0),
    hullParticleVelocityStretchRotation: Number(value.hullParticleVelocityStretchRotation ?? 0),
    hullParticleDrag: Number(value.hullParticleDrag ?? 0),
    hullParticleTurbulenceAmplitude: Number(value.hullParticleTurbulenceAmplitude ?? 0),
    hullParticleTurbulenceFrequency: Number(value.hullParticleTurbulenceFrequency ?? 0)
  };
}
function projectAreas(values) {
  return (Array.isArray(values) ? values : []).map(projectHullArea);
}
function projectHullArea(value) {
  const textures = new Map();
  for (const texture of Array.isArray(value?.textures) ? value.textures : []) {
    if (texture) textures.set(String(texture.name), {
      resFilePath: String(texture.resFilePath ?? "")
    });
  }
  const parameters = new Map();
  for (const parameter of Array.isArray(value?.parameters) ? value.parameters : []) {
    if (parameter) parameters.set(String(parameter.name), copyVector(parameter.value));
  }
  return {
    index: Number(value?.index ?? 0),
    count: Number(value?.count ?? 1),
    blockedMaterials: Number(value?.blockedMaterials ?? 0),
    shader: String(value?.shader ?? ""),
    areaType: Number(value?.areaType ?? 0),
    name: String(value?.name ?? ""),
    textures,
    parameters
  };
}
function projectGenericShader(value) {
  const defaultTextures = new Map();
  for (const texture of Array.isArray(value.defaultTextures) ? value.defaultTextures : []) {
    if (texture) defaultTextures.set(String(texture.name), {
      resFilePath: String(texture.resFilePath ?? "")
    });
  }
  const defaultParameters = new Map();
  for (const parameter of Array.isArray(value.defaultParameters) ? value.defaultParameters : []) {
    if (parameter) defaultParameters.set(String(parameter.name), copyVector(parameter.value));
  }
  const parameters = (Array.isArray(value.parameters) ? value.parameters : []).map(item => typeof item === "string" ? item : String(item?.str ?? ""));
  return {
    shader: String(value.shader ?? ""),
    parameters,
    defaultParameters,
    defaultTextures,
    transparencyTextureName: String(value.transparencyTextureName ?? ""),
    doGenerateDepthArea: value.doGenerateDepthArea !== false
  };
}
const AREA_MATERIAL_KEYS = Object.freeze(["Primary", "Glass", "Sails", "Reactor", "Darkhull", "Wreck", "Rock", "Monument", "Ornament", "SimplePrimary", "Turret"]);
const FACTION_COLOR_KEYS = Object.freeze(["Primary", "Secondary", "Tertiary", "Black", "White", "Yellow", "Orange", "Red", "Blue", "Green", "Cyan", "Fire", "Hull", "Glass", "Reactor", "Darkhull", "Booster", "Killmark", "PrimaryLight", "SecondaryLight", "TertiaryLight", "WhiteLight", "PrimaryHologram", "SecondaryHologram", "TertiaryHologram", "State0", "State1", "State2", "State3", "StateVulnerable", "StateInvulnerable", "PrimaryForcefield", "SecondaryForcefield", "PrimaryBanner", "PrimaryFx", "SecondaryFx", "PrimarySpotlight", "SecondarySpotlight", "TertiarySpotlight", "PrimaryBillboard", "PrimaryWarpFx", "PrimaryAttackFX", "PrimarySiegeFX", "PrimaryDockedFX"]);
function factionColorDefault(index) {
  switch (index) {
    case 39:
      return [2.5, 2.5, 2.5, 2.5];
    case 40:
      return [1, 99 / 255, 51 / 255, 1];
    case 41:
      return [1, 24 / 255, 11 / 255, 1];
    case 42:
      return [1, 94 / 255, 45 / 255, 1];
    case 43:
      return [76 / 255, 130 / 255, 226 / 255, 1];
    default:
      return [0, 0, 0, 1];
  }
}
function createAreaMaterialData() {
  return {
    materialNames: new Map(),
    glowColor: new Map()
  };
}
function projectAreaMaterials(areaTypes) {
  const result = createAreaMaterialData();
  if (!areaTypes) return result;
  AREA_MATERIAL_KEYS.forEach((key, areaType) => mergeAreaMaterial(result, selectAreaMaterial(areaTypes, key), areaType));
  return result;
}
function selectAreaMaterial(areaTypes, key) {
  return selectNamedSlot(areaTypes, key, "materials");
}

/**
 * Carbon's generated records declare one property per slot (EveSOFDataArea's
 * AreaType properties, EveSOFDataFactionColorSet's ColorType properties), but
 * the decoded data.black record carries those slots as a lowercase-keyed child
 * map instead. Both shapes reach these projections, and reading only the
 * declared property names silently produced empty area materials and
 * all-black faction colors.
 */
function selectNamedSlot(container, key, mapName) {
  if (!container) return null;
  if (container[key] !== undefined && container[key] !== null) return container[key];
  const slots = container[mapName];
  if (!slots) return null;
  const lowercase = key.toLowerCase();
  if (slots instanceof Map) return slots.get(lowercase) ?? slots.get(key) ?? null;
  return slots[lowercase] ?? slots[key] ?? null;
}
function projectSingleAreaMaterial(value, areaType) {
  const result = createAreaMaterialData();
  mergeAreaMaterial(result, value, areaType);
  return result;
}
function mergeAreaMaterial(result, value, areaType) {
  if (!value) return;
  [areaMaterialName(value.material1, "material1"), areaMaterialName(value.material2, "material2"), areaMaterialName(value.material3, "material3"), areaMaterialName(value.material4, "material4")].forEach((name, materialIndex) => {
    if (name) result.materialNames.set(`${areaType}:${materialIndex}`, name);
  });
  result.glowColor.set(`${areaType}:GeneralGlowColor`, Number(value.colorType ?? 0));
}

/**
 * Carbon's m_material[N] is a plain string, but the decoded data.black record
 * wraps each slot in its own single-key object ({ material1: "name" }).
 * Stringifying that wrapper produced "[object Object]" material names, so no
 * material record was ever found.
 */
function areaMaterialName(value, key) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return String(value[key] ?? value.name ?? value.str ?? "");
}
function isVector4(value) {
  return value && typeof value !== "string" && typeof value.length === "number" && value.length === 4;
}
function copyVector(value) {
  return value ? Array.from(value) : [0, 0, 0, 0];
}
function copyArray(value, fallback) {
  return value && typeof value.length === "number" ? Array.from(value) : fallback.slice();
}
function identityMatrix() {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}
function fnv1(value) {
  let hash = 2166136261;
  for (const byte of new TextEncoder().encode(value)) {
    hash = Math.imul(hash, 16777619);
    hash ^= byte > 127 ? byte - 256 : byte;
  }
  return hash >>> 0;
}

export { _EveSOFDataMgr as EveSOFDataMgr };
//# sourceMappingURL=EveSOFDataMgr.js.map
