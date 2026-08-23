import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { Tr2MeshBase as _Tr2MeshBase } from './Tr2MeshBase.js';
import { Tr2SerializedMorphAnimation as _Tr2SerializedMorphAn } from './Tr2SerializedMorphAnimation.js';

let _initProto, _initClass, _init_geometryResPath, _init_extra_geometryResPath, _init_serializedMorphAnimations, _init_extra_serializedMorphAnimations, _init_deferGeometryLoad, _init_extra_deferGeometryLoad, _init_geometry, _init_extra_geometry;

/**
 * A mesh backed by a geometry resource, adding the resource path plus the
 * morph-target weights and baked-morph state on top of Tr2MeshBase.
 */
let _Tr2Mesh;
class Tr2Mesh extends _Tr2MeshBase {
  static {
    ({
      e: [_init_geometryResPath, _init_extra_geometryResPath, _init_serializedMorphAnimations, _init_extra_serializedMorphAnimations, _init_deferGeometryLoad, _init_extra_deferGeometryLoad, _init_geometry, _init_extra_geometry, _initProto],
      c: [_Tr2Mesh, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2Mesh",
      family: "trinityCore"
    })], [[[void 0, io.rebuild("geometry"), io, io.notify, io, io.persist, type, type.string], 16, "geometryResPath"], [[io, io.persistOnly, void 0, type.list("Tr2SerializedMorphAnimation")], 16, "serializedMorphAnimations"], [[io, io.notify, io, io.persist, type, type.boolean], 16, "deferGeometryLoad"], [[void 0, io.rebuild("geometry"), io, io.read, void 0, type.objectRef("TriGeometryRes")], 16, "geometry"], [[carbon, carbon.method, impl, impl.adapted], 18, "Initialize"], [[carbon, carbon.method, impl, impl.adapted], 18, "OnModified"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetMeshResPath"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetGeometryRes"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetGeometryResource"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetGeometryResPath"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetAreasCount"], [[impl, impl.adapted], 18, "InitializeMorphTargets"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetMorphTargetNames"], [[impl, impl.implemented], 18, "IsBakedMorph"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetMorphTargetWeight"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetMorphTargetWeight"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetBakedMorphTarget"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetBakedMorphTarget"], [[impl, impl.adapted], 18, "GetAllBakedMorphTargetStates"], [[impl, impl.adapted], 18, "GetMorphAnimations"]], 0, void 0, _Tr2MeshBase));
  }
  constructor(...args) {
    super(...args);
    _init_extra_geometry(this);
  }
  #bakedMorphTargets = (_initProto(this), []);
  #morphAnimations = new Map();
  geometryResPath = _init_geometryResPath(this, "");
  serializedMorphAnimations = (_init_extra_geometryResPath(this), _init_serializedMorphAnimations(this, []));
  deferGeometryLoad = (_init_extra_serializedMorphAnimations(this), _init_deferGeometryLoad(this, false));
  geometry = (_init_extra_deferGeometryLoad(this), _init_geometry(this, null));

  /**
   * True while the bound geometry resource is still loading; false when no
   * resource is bound.
   */
  get isLoading() {
    return this.geometry?.IsLoading?.() ?? false;
  }

  /** Rebuilds the morph-target state once a geometry resource is present. */
  Initialize() {
    if (this.GetGeometryResource()) {
      this.InitializeMorphTargets();
    }
    return true;
  }

  /**
   * Rebuilds the morph-target state after a field change when a geometry
   * resource is present.
   */
  OnModified() {
    if (this.GetGeometryResource()) {
      this.InitializeMorphTargets();
    }
    return true;
  }

  /**
   * Sets the geometry resource path to load from; the currently bound resource
   * is left in place until the load resolves.
   */
  SetMeshResPath(path) {
    this.geometryResPath = String(path ?? "");
  }

  /**
   * Binds an already-resolved geometry resource, clears the authored path and
   * rebuilds morph targets; the geometry rebuild token is added explicitly
   * because direct mutation bypasses SetValues.
   */
  SetGeometryRes(resource) {
    this.geometryResPath = "";
    this.geometry = resource ?? null;
    // Direct mutation bypasses SetValues, so schedule the declared consequence
    // explicitly; maintained class code may add declared rebuild tokens.
    this.__state.rebuild.add("geometry");
    this.InitializeMorphTargets();
  }

  /** The bound geometry resource, or null until the resource layer supplies one. */
  GetGeometryResource() {
    return this.geometry;
  }

  /**
   * The bound resource's own path when one is bound, otherwise the authored
   * path.
   */
  GetGeometryResPath() {
    return this.geometry?.GetPath?.() ?? this.geometryResPath;
  }

  /** The fixed number of mesh-area lists a mesh carries (14). */
  GetAreasCount() {
    return 14;
  }

  /** Rebuilds indexed morph state from LOD-0 target names while preserving matching serialized weights. */
  InitializeMorphTargets() {
    if (!this.GetGeometryResource()) {
      this.#morphAnimations.clear();
      this.#bakedMorphTargets = [];
      return 0;
    }
    const names = this.GetMorphTargetNames();
    const nameSet = new Set();
    for (const name of names) {
      if (nameSet.has(name)) {
        throw new Error(`Tr2Mesh morph target names contain duplicate "${name}"`);
      }
      nameSet.add(name);
    }
    const serializedMatches = this.serializedMorphAnimations.length === names.length && names.every((name, index) => this.serializedMorphAnimations[index]?.name === name);
    if (!serializedMatches) {
      this.serializedMorphAnimations = names.map(name => {
        const value = new _Tr2SerializedMorphAn();
        value.name = name;
        value.weight = 0;
        return value;
      });
    }
    const previousBaked = new Map([...this.#morphAnimations].map(([name, value]) => [name, this.#bakedMorphTargets[value.index] ?? false]));
    const resourceBaked = GetMorphLod(this.GetGeometryResource(), this.meshIndex)?.isBakedMorphTarget;
    this.#morphAnimations.clear();
    this.#bakedMorphTargets = names.map((name, index) => Array.isArray(resourceBaked) ? !!resourceBaked[index] : previousBaked.get(name) ?? false);
    names.forEach((name, index) => {
      const weight = Number(this.serializedMorphAnimations[index]?.weight);
      if (!Number.isFinite(weight)) {
        throw new TypeError(`Tr2Mesh morph target "${name}" weight must be finite`);
      }
      this.#morphAnimations.set(name, {
        index,
        weight
      });
    });
    return names.length;
  }

  /** Returns detached LOD-0 morph target names from the prepared geometry resource. */
  GetMorphTargetNames() {
    const resource = this.GetGeometryResource();
    const mesh = GetMeshRecord(resource, this.meshIndex);
    const lod = GetMorphLod(resource, this.meshIndex);
    if (Array.isArray(lod?.morphTargetNames)) {
      return lod.morphTargetNames.map(String);
    }
    const targets = mesh?.morphTargets?.targets;
    if (Array.isArray(targets)) {
      return targets.map(value => String(value?.name ?? ""));
    }
    if (Array.isArray(lod?.morphTargets)) {
      return lod.morphTargets.map(value => String(value?.name ?? ""));
    }
    return [];
  }

  /** Returns whether one indexed morph target is currently marked as baked. */
  IsBakedMorph(index) {
    return Number.isInteger(index) && index >= 0 && index < this.#bakedMorphTargets.length ? this.#bakedMorphTargets[index] : false;
  }

  /** Sets one exact named morph target weight without clamping. */
  SetMorphTargetWeight(name, value) {
    const key = String(name ?? "");
    const weight = Number(value);
    const animation = this.#morphAnimations.get(key);
    if (!Number.isFinite(weight)) {
      throw new TypeError(`Tr2Mesh morph target "${key}" weight must be finite`);
    }
    if (!animation) {
      return false;
    }
    animation.weight = weight;
    this.serializedMorphAnimations[animation.index].weight = weight;
    return true;
  }

  /** Returns one exact named morph target weight, or the native zero fallback. */
  GetMorphTargetWeight(name) {
    return this.#morphAnimations.get(String(name ?? ""))?.weight ?? 0;
  }

  /** Sets the baked flag for one exact named morph target. */
  SetBakedMorphTarget(name, value) {
    const animation = this.#morphAnimations.get(String(name ?? ""));
    if (!animation) {
      return false;
    }
    const baked = !!value;
    this.#bakedMorphTargets[animation.index] = baked;
    const states = GetMorphLod(this.GetGeometryResource(), this.meshIndex)?.isBakedMorphTarget;
    if (Array.isArray(states) && animation.index < states.length) {
      states[animation.index] = baked;
    }
    return true;
  }

  /** Returns the baked flag for one exact named morph target. */
  GetBakedMorphTarget(name) {
    const animation = this.#morphAnimations.get(String(name ?? ""));
    return animation ? this.#bakedMorphTargets[animation.index] : false;
  }

  /** Returns detached baked flags in morph-target index order. */
  GetAllBakedMorphTargetStates() {
    return this.#bakedMorphTargets.slice();
  }

  /** Returns detached indexed morph state in exact target-name order. */
  GetMorphAnimations() {
    return new Map([...this.#morphAnimations].map(([name, value]) => [name, {
      ...value
    }]));
  }
  static {
    _initClass();
  }
}
function GetMeshRecord(resource, meshIndex) {
  const payload = resource?.GetPayload?.() ?? resource;
  return payload?.meshes?.[meshIndex] ?? null;
}
function GetMorphLod(resource, meshIndex) {
  return resource?.GetMeshLod?.(meshIndex, 0) ?? GetMeshRecord(resource, meshIndex)?.lods?.[0] ?? null;
}

export { _Tr2Mesh as Tr2Mesh };
//# sourceMappingURL=Tr2Mesh.js.map
