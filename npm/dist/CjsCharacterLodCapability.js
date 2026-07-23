import { applyDecs2311 as _applyDecs2311 } from './_virtual/_rollupPluginBabelHelpers.js';
import { type, io } from '@carbonenginejs/core-types/schema';
import { CjsCharacterCapabilityCoverage as _CjsCharacterCapabili$1 } from './CjsCharacterCapabilityCoverage.js';
import { CjsCharacterCapabilityRequirement as _CjsCharacterCapabili } from './CjsCharacterCapabilityRequirement.js';
import { CjsCharacterLodBundle as _CjsCharacterLodBundl } from './CjsCharacterLodBundle.js';
import { CjsCharacterMeshCapability as _CjsCharacterMeshCapa } from './CjsCharacterMeshCapability.js';
import { CjsCharacterNode as _CjsCharacterNode } from './CjsCharacterNode.js';

let _initClass, _init_requestedLod, _init_extra_requestedLod, _init_resolvedLod, _init_extra_resolvedLod, _init_configurationPath, _init_extra_configurationPath, _init_geometryPath, _init_extra_geometryPath, _init_fallbackReason, _init_extra_fallbackReason, _init_requirementID, _init_extra_requirementID, _init_skeletonCoverage, _init_extra_skeletonCoverage, _init_declaredMeshPaletteCoverage, _init_extra_declaredMeshPaletteCoverage, _init_activeMeshPaletteCoverage, _init_extra_activeMeshPaletteCoverage, _init_morphCoverage, _init_extra_morphCoverage, _init_meshes, _init_extra_meshes;
let _CjsCharacterLodCapab;
class CjsCharacterLodCapability extends _CjsCharacterNode {
  static {
    ({
      e: [_init_requestedLod, _init_extra_requestedLod, _init_resolvedLod, _init_extra_resolvedLod, _init_configurationPath, _init_extra_configurationPath, _init_geometryPath, _init_extra_geometryPath, _init_fallbackReason, _init_extra_fallbackReason, _init_requirementID, _init_extra_requirementID, _init_skeletonCoverage, _init_extra_skeletonCoverage, _init_declaredMeshPaletteCoverage, _init_extra_declaredMeshPaletteCoverage, _init_activeMeshPaletteCoverage, _init_extra_activeMeshPaletteCoverage, _init_morphCoverage, _init_extra_morphCoverage, _init_meshes, _init_extra_meshes],
      c: [_CjsCharacterLodCapab, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "CjsCharacterLodCapability",
      family: "character"
    })], [[[type, type.int32, io, io.persist], 16, "requestedLod"], [[type, type.int32, io, io.persist], 16, "resolvedLod"], [[type, type.path, io, io.persist], 16, "configurationPath"], [[type, type.path, io, io.persist], 16, "geometryPath"], [[type, type.string, io, io.persist], 16, "fallbackReason"], [[type, type.string, io, io.persist], 16, "requirementID"], [[void 0, type.objectRef("CjsCharacterCapabilityCoverage"), io, io.persist], 16, "skeletonCoverage"], [[void 0, type.objectRef("CjsCharacterCapabilityCoverage"), io, io.persist], 16, "declaredMeshPaletteCoverage"], [[void 0, type.objectRef("CjsCharacterCapabilityCoverage"), io, io.persist], 16, "activeMeshPaletteCoverage"], [[void 0, type.objectRef("CjsCharacterCapabilityCoverage"), io, io.persist], 16, "morphCoverage"], [[void 0, type.list("CjsCharacterMeshCapability"), io, io.persist], 16, "meshes"]], 0, void 0, _CjsCharacterNode));
  }
  constructor(...args) {
    super(...args);
    _init_extra_meshes(this);
  }
  requestedLod = _init_requestedLod(this, null);
  resolvedLod = (_init_extra_requestedLod(this), _init_resolvedLod(this, null));
  configurationPath = (_init_extra_resolvedLod(this), _init_configurationPath(this, null));
  geometryPath = (_init_extra_configurationPath(this), _init_geometryPath(this, null));
  fallbackReason = (_init_extra_geometryPath(this), _init_fallbackReason(this, null));
  requirementID = (_init_extra_fallbackReason(this), _init_requirementID(this, ""));
  skeletonCoverage = (_init_extra_requirementID(this), _init_skeletonCoverage(this, null));
  declaredMeshPaletteCoverage = (_init_extra_skeletonCoverage(this), _init_declaredMeshPaletteCoverage(this, null));
  activeMeshPaletteCoverage = (_init_extra_declaredMeshPaletteCoverage(this), _init_activeMeshPaletteCoverage(this, null));
  morphCoverage = (_init_extra_activeMeshPaletteCoverage(this), _init_morphCoverage(this, null));
  meshes = (_init_extra_morphCoverage(this), _init_meshes(this, []));

  /** Builds a four-state report without collapsing independent evidence axes. */
  static inspect({
    lodBundle = null,
    requirement,
    skeletonBoneNames = null,
    meshes = null
  } = {}) {
    const required = _CjsCharacterCapabili.prepare(requirement);
    const target = _CjsCharacterLodCapab.getTargetIdentity(lodBundle);
    const meshReports = _CjsCharacterLodCapab.inspectMeshes(meshes, required);
    const declared = _CjsCharacterLodCapab.collectMeshCoverage(meshReports, "declaredPaletteCoverage", required.boneNames, meshes !== null);
    const active = _CjsCharacterLodCapab.collectMeshCoverage(meshReports, "activePaletteCoverage", required.boneNames, meshes !== null);
    const morphs = _CjsCharacterLodCapab.collectMeshCoverage(meshReports, "morphCoverage", required.morphNames, meshes !== null);
    return _CjsCharacterLodCapab.from({
      ...target,
      requirementID: required.id,
      skeletonCoverage: _CjsCharacterCapabili$1.inspect(required.boneNames, skeletonBoneNames, {
        sourceComplete: skeletonBoneNames !== null && skeletonBoneNames !== undefined
      }).GetValues(),
      declaredMeshPaletteCoverage: declared.GetValues(),
      activeMeshPaletteCoverage: active.GetValues(),
      morphCoverage: morphs.GetValues(),
      meshes: meshReports.map(value => value.GetValues())
    });
  }

  /** Extracts selected target identity without claiming that its resources loaded. */
  static getTargetIdentity(value) {
    if (!value || typeof value !== "object" && typeof value !== "function") {
      throw new TypeError("Character LOD capability requires an atomic LOD bundle");
    }
    const bundle = value instanceof _CjsCharacterLodBundl ? value.GetValues() : value;
    const configurationPath = String(bundle.configurationPath ?? "");
    const geometryPath = String(bundle.geometryPath ?? "");
    if (!configurationPath || !geometryPath) {
      throw new Error("Character LOD capability requires complete configuration and geometry paths");
    }
    const requestedLod = _CjsCharacterLodCapab.normalizeLod(bundle.requestedLod);
    const resolvedLod = _CjsCharacterLodCapab.normalizeLod(bundle.resolvedLod ?? bundle.lod);
    return {
      requestedLod,
      resolvedLod,
      configurationPath,
      geometryPath,
      fallbackReason: bundle.fallbackReason ?? null
    };
  }

  /** Inspects caller-supplied mesh evidence in its stable source order. */
  static inspectMeshes(values, requirement) {
    if (values === null || values === undefined) {
      return [];
    }
    if (!Array.isArray(values)) {
      throw new TypeError("Character LOD capability meshes must be an array or null");
    }
    const ids = new Set();
    return values.map(value => {
      const result = _CjsCharacterMeshCapa.inspect(value, requirement);
      if (ids.has(result.id)) {
        throw new Error(`Character LOD capability contains duplicate mesh "${result.id}"`);
      }
      ids.add(result.id);
      return result;
    });
  }

  /** Combines per-mesh exact-name evidence while retaining unknown source coverage. */
  static collectMeshCoverage(meshes, field, requiredNames, sourcePresent = true) {
    const available = [];
    const names = new Set();
    let sourceComplete = Boolean(sourcePresent);
    for (const mesh of meshes) {
      const coverage = mesh[field];
      sourceComplete = sourceComplete && Boolean(coverage?.sourceComplete);
      for (const name of coverage?.availableNames || []) {
        if (!names.has(name)) {
          names.add(name);
          available.push(name);
        }
      }
    }
    return _CjsCharacterCapabili$1.inspect(requiredNames, available, {
      sourceComplete
    });
  }

  /** Preserves absent LOD identity as null without inventing a tier. */
  static normalizeLod(value) {
    if (value === null || value === undefined) {
      return null;
    }
    const result = Number(value);
    if (!Number.isSafeInteger(result) || result < 0 || result > 2147483647) {
      throw new TypeError("Character LOD identity must be a non-negative signed 32-bit integer or null");
    }
    return result;
  }
  static {
    _initClass();
  }
}

export { _CjsCharacterLodCapab as CjsCharacterLodCapability };
//# sourceMappingURL=CjsCharacterLodCapability.js.map
