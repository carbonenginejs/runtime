import { applyDecs2311 as _applyDecs2311 } from './_virtual/_rollupPluginBabelHelpers.js';
import { type, io } from '@carbonenginejs/core-types/schema';
import { CjsCharacterNode as _CjsCharacterNode } from './CjsCharacterNode.js';

let _initClass, _init_requestedLod, _init_extra_requestedLod, _init_resolvedLod, _init_extra_resolvedLod, _init_configurationPath, _init_extra_configurationPath, _init_geometryPath, _init_extra_geometryPath, _init_modelFamily, _init_extra_modelFamily, _init_fallbackReason, _init_extra_fallbackReason;
let _CjsCharacterLodBundl;
class CjsCharacterLodBundle extends _CjsCharacterNode {
  static {
    ({
      e: [_init_requestedLod, _init_extra_requestedLod, _init_resolvedLod, _init_extra_resolvedLod, _init_configurationPath, _init_extra_configurationPath, _init_geometryPath, _init_extra_geometryPath, _init_modelFamily, _init_extra_modelFamily, _init_fallbackReason, _init_extra_fallbackReason],
      c: [_CjsCharacterLodBundl, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "CjsCharacterLodBundle",
      family: "character"
    })], [[[type, type.int32, io, io.persist], 16, "requestedLod"], [[type, type.int32, io, io.persist], 16, "resolvedLod"], [[type, type.path, io, io.persist], 16, "configurationPath"], [[type, type.path, io, io.persist], 16, "geometryPath"], [[type, type.string, io, io.persist], 16, "modelFamily"], [[type, type.string, io, io.persist], 16, "fallbackReason"]], 0, void 0, _CjsCharacterNode));
  }
  constructor(...args) {
    super(...args);
    _init_extra_fallbackReason(this);
  }
  requestedLod = _init_requestedLod(this, null);
  resolvedLod = (_init_extra_requestedLod(this), _init_resolvedLod(this, null));
  configurationPath = (_init_extra_resolvedLod(this), _init_configurationPath(this, ""));
  geometryPath = (_init_extra_configurationPath(this), _init_geometryPath(this, ""));
  modelFamily = (_init_extra_geometryPath(this), _init_modelFamily(this, ""));
  fallbackReason = (_init_extra_modelFamily(this), _init_fallbackReason(this, ""));

  /** Builds deterministic available bundles from flat resource paths. */
  static fromResources(configPaths = [], geometryPaths = []) {
    return BuildAvailableBundles(configPaths, geometryPaths).map(value => this.from(value));
  }

  /** Resolves one requested LOD without separating its configuration and geometry. */
  static resolve(values, requestedLod) {
    const lod = NormalizeRequestedLod(requestedLod);
    const bundles = (values || []).map(value => value instanceof this ? value : this.from(value)).filter(value => value.configurationPath && value.geometryPath).sort(CompareBundles);
    if (!bundles.length) {
      return null;
    }
    const exact = lod === null ? null : bundles.find(value => value.resolvedLod === lod);
    const base = bundles.find(value => value.resolvedLod === null);
    const selected = exact || base || SelectNearestBundle(bundles, lod);
    const fallbackReason = exact || lod === null && selected === base ? "" : selected === base ? "base" : "nearest";
    return this.from({
      ...selected.GetValues(),
      requestedLod: lod,
      fallbackReason
    });
  }
  static {
    _initClass();
  }
}
function BuildAvailableBundles(configPaths, geometryPaths) {
  const geometries = NormalizePathList(geometryPaths).map(ParseModelPath);
  const bundles = [];
  for (const configurationPath of NormalizePathList(configPaths)) {
    const configuration = ParseModelPath(configurationPath);
    const candidates = geometries.filter(value => value.modelFamily === configuration.modelFamily && value.lod === configuration.lod).sort((a, b) => CompareGeometryCandidates(configuration, a, b));
    const geometry = candidates[0];
    if (!geometry) {
      continue;
    }
    bundles.push({
      requestedLod: null,
      resolvedLod: configuration.lod,
      configurationPath: configuration.path,
      geometryPath: geometry.path,
      modelFamily: configuration.modelFamily,
      fallbackReason: ""
    });
  }
  return bundles.sort(CompareBundles);
}
function NormalizePathList(values) {
  if (!Array.isArray(values)) {
    throw new TypeError("Character LOD resource paths must be arrays");
  }
  return [...new Set(values.map(value => String(value || "")).filter(Boolean))].sort(CompareStrings);
}
function ParseModelPath(value) {
  const path = String(value || "");
  const separator = path.lastIndexOf("/");
  const dot = path.lastIndexOf(".");
  const stem = path.slice(separator + 1, dot > separator ? dot : undefined).toLowerCase();
  const match = stem.match(/_lod(\d+)/u);
  const family = stem.replace(/_lod\d+.*$/u, "").replace(/_(?:nosim|wopockets)$/u, "").replace(/[^a-z0-9]/gu, "");
  return {
    path,
    directory: path.slice(0, Math.max(separator, 0)).toLowerCase(),
    stem,
    modelFamily: family,
    lod: match ? Number(match[1]) : null
  };
}
function CompareGeometryCandidates(configuration, a, b) {
  const directoryA = a.directory === configuration.directory ? 0 : 1;
  const directoryB = b.directory === configuration.directory ? 0 : 1;
  if (directoryA !== directoryB) {
    return directoryA - directoryB;
  }
  const stemA = a.stem === configuration.stem ? 0 : 1;
  const stemB = b.stem === configuration.stem ? 0 : 1;
  if (stemA !== stemB) {
    return stemA - stemB;
  }
  return CompareStrings(a.path, b.path);
}
function SelectNearestBundle(bundles, requestedLod) {
  if (requestedLod === null) {
    return bundles[0];
  }
  return bundles.slice().sort((a, b) => {
    const distanceA = Math.abs(a.resolvedLod - requestedLod);
    const distanceB = Math.abs(b.resolvedLod - requestedLod);

    // Native medium fallback prefers low before high. Generalize that
    // tie-break toward the larger LOD number (lower detail).
    return distanceA - distanceB || b.resolvedLod - a.resolvedLod || CompareBundles(a, b);
  })[0];
}
function NormalizeRequestedLod(value) {
  if (value === null || value === undefined) {
    return null;
  }
  const lod = Number(value);
  if (!Number.isInteger(lod) || lod < 0) {
    throw new TypeError(`Character LOD must be a non-negative integer or null, received ${value}`);
  }
  return lod;
}
function CompareBundles(a, b) {
  const lodA = a.resolvedLod === null ? -1 : a.resolvedLod;
  const lodB = b.resolvedLod === null ? -1 : b.resolvedLod;
  return lodA - lodB || CompareStrings(a.modelFamily, b.modelFamily) || CompareStrings(a.configurationPath, b.configurationPath) || CompareStrings(a.geometryPath, b.geometryPath);
}
function CompareStrings(a, b) {
  return String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0;
}

export { _CjsCharacterLodBundl as CjsCharacterLodBundle };
//# sourceMappingURL=CjsCharacterLodBundle.js.map
