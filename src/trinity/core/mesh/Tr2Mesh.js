// Source: trinity/trinity/Tr2Mesh.h
// Source: trinity/trinity/Tr2Mesh.cpp
// Source: trinity/trinity/Tr2Mesh_Blue.cpp
import { carbon, impl, io, type } from "#schema";
import { Tr2MeshBase } from "./Tr2MeshBase.js";
import { Tr2SerializedMorphAnimation } from "./Tr2SerializedMorphAnimation.js";


/**
 * A mesh backed by a geometry resource, adding the resource path plus the
 * morph-target weights and baked-morph state on top of Tr2MeshBase.
 */
@type.define({ className: "Tr2Mesh", family: "trinityCore" })
export class Tr2Mesh extends Tr2MeshBase
{
  #bakedMorphTargets = [];

  #morphAnimations = new Map();

  @io.rebuild("geometry")
  @io.notify
  @io.persist
  @type.string
  geometryResPath = "";

  @io.persistOnly
  @type.list("Tr2SerializedMorphAnimation")
  serializedMorphAnimations = [];

  @io.notify
  @io.persist
  @type.boolean
  deferGeometryLoad = false;

  @io.rebuild("geometry")
  @io.read
  @type.objectRef("TriGeometryRes")
  geometry = null;

  /**
   * True while the bound geometry resource is still loading; false when no
   * resource is bound.
   */
  get isLoading()
  {
    return this.geometry?.IsLoading?.() ?? false;
  }

  /** Rebuilds the morph-target state once a geometry resource is present. */
  @carbon.method
  @impl.adapted
  Initialize()
  {
    if (this.GetGeometryResource())
    {
      this.InitializeMorphTargets();
    }
    return true;
  }

  /**
   * Rebuilds the morph-target state after a field change when a geometry
   * resource is present.
   */
  @carbon.method
  @impl.adapted
  OnModified()
  {
    if (this.GetGeometryResource())
    {
      this.InitializeMorphTargets();
    }
    return true;
  }

  /**
   * Sets the geometry resource path to load from; the currently bound resource
   * is left in place until the load resolves.
   */
  @carbon.method
  @impl.adapted
  SetMeshResPath(path)
  {
    this.geometryResPath = String(path ?? "");
  }

  /**
   * Binds an already-resolved geometry resource, clears the authored path and
   * rebuilds morph targets; the geometry rebuild token is added explicitly
   * because direct mutation bypasses SetValues.
   */
  @carbon.method
  @impl.adapted
  SetGeometryRes(resource)
  {
    this.geometryResPath = "";
    this.geometry = resource ?? null;
    // Direct mutation bypasses SetValues, so schedule the declared consequence
    // explicitly; maintained class code may add declared rebuild tokens.
    this.__state.rebuild.add("geometry");
    this.InitializeMorphTargets();
  }

  /** The bound geometry resource, or null until the resource layer supplies one. */
  @carbon.method
  @impl.adapted
  GetGeometryResource()
  {
    return this.geometry;
  }

  /**
   * The bound resource's own path when one is bound, otherwise the authored
   * path.
   */
  @carbon.method
  @impl.adapted
  GetGeometryResPath()
  {
    return this.geometry?.GetPath() ?? this.geometryResPath;
  }

  /** The fixed number of mesh-area lists a mesh carries (14). */
  @carbon.method
  @impl.implemented
  GetAreasCount()
  {
    return 14;
  }

  /** Rebuilds indexed morph state from LOD-0 target names while preserving matching serialized weights. */
  @impl.adapted
  InitializeMorphTargets()
  {
    if (!this.GetGeometryResource())
    {
      this.#morphAnimations.clear();
      this.#bakedMorphTargets = [];
      return 0;
    }

    const names = this.GetMorphTargetNames();
    const nameSet = new Set();

    for (const name of names)
    {
      if (nameSet.has(name))
      {
        throw new Error(`Tr2Mesh morph target names contain duplicate "${name}"`);
      }
      nameSet.add(name);
    }

    const serializedMatches = this.serializedMorphAnimations.length === names.length
      && names.every((name, index) => this.serializedMorphAnimations[index]?.name === name);

    if (!serializedMatches)
    {
      this.serializedMorphAnimations = names.map(name =>
      {
        const value = new Tr2SerializedMorphAnimation();
        value.name = name;
        value.weight = 0;
        return value;
      });
    }

    const previousBaked = new Map([ ...this.#morphAnimations ]
      .map(([ name, value ]) => [ name, this.#bakedMorphTargets[value.index] ?? false ]));
    const resourceBaked = GetMorphLod(this.GetGeometryResource(), this.meshIndex)?.isBakedMorphTarget;

    this.#morphAnimations.clear();
    this.#bakedMorphTargets = names.map((name, index) => Array.isArray(resourceBaked)
      ? !!resourceBaked[index]
      : previousBaked.get(name) ?? false);

    names.forEach((name, index) =>
    {
      const weight = Number(this.serializedMorphAnimations[index]?.weight);

      if (!Number.isFinite(weight))
      {
        throw new TypeError(`Tr2Mesh morph target "${name}" weight must be finite`);
      }

      this.#morphAnimations.set(name, { index, weight });
    });

    return names.length;
  }

  /** Returns detached LOD-0 morph target names from the prepared geometry resource. */
  @carbon.method
  @impl.adapted
  GetMorphTargetNames()
  {
    const resource = this.GetGeometryResource();
    const mesh = GetMeshRecord(resource, this.meshIndex);
    const lod = GetMorphLod(resource, this.meshIndex);

    if (Array.isArray(lod?.morphTargetNames))
    {
      return lod.morphTargetNames.map(String);
    }

    const targets = mesh?.morphTargets?.targets;
    if (Array.isArray(targets))
    {
      return targets.map(value => String(value?.name ?? ""));
    }

    if (Array.isArray(lod?.morphTargets))
    {
      return lod.morphTargets.map(value => String(value?.name ?? ""));
    }

    return [];
  }

  /** Returns whether one indexed morph target is currently marked as baked. */
  @impl.implemented
  IsBakedMorph(index)
  {
    return Number.isInteger(index) && index >= 0 && index < this.#bakedMorphTargets.length
      ? this.#bakedMorphTargets[index]
      : false;
  }

  /** Sets one exact named morph target weight without clamping. */
  @carbon.method
  @impl.implemented
  SetMorphTargetWeight(name, value)
  {
    const key = String(name ?? "");
    const weight = Number(value);
    const animation = this.#morphAnimations.get(key);

    if (!Number.isFinite(weight))
    {
      throw new TypeError(`Tr2Mesh morph target "${key}" weight must be finite`);
    }

    if (!animation)
    {
      return false;
    }

    animation.weight = weight;
    this.serializedMorphAnimations[animation.index].weight = weight;
    return true;
  }

  /** Returns one exact named morph target weight, or the native zero fallback. */
  @carbon.method
  @impl.implemented
  GetMorphTargetWeight(name)
  {
    return this.#morphAnimations.get(String(name ?? ""))?.weight ?? 0;
  }

  /** Sets the baked flag for one exact named morph target. */
  @carbon.method
  @impl.adapted
  SetBakedMorphTarget(name, value)
  {
    const animation = this.#morphAnimations.get(String(name ?? ""));

    if (!animation)
    {
      return false;
    }

    const baked = !!value;
    this.#bakedMorphTargets[animation.index] = baked;

    const states = GetMorphLod(this.GetGeometryResource(), this.meshIndex)?.isBakedMorphTarget;
    if (Array.isArray(states) && animation.index < states.length)
    {
      states[animation.index] = baked;
    }

    return true;
  }

  /** Returns the baked flag for one exact named morph target. */
  @carbon.method
  @impl.implemented
  GetBakedMorphTarget(name)
  {
    const animation = this.#morphAnimations.get(String(name ?? ""));
    return animation ? this.#bakedMorphTargets[animation.index] : false;
  }

  /** Returns detached baked flags in morph-target index order. */
  @impl.adapted
  GetAllBakedMorphTargetStates()
  {
    return this.#bakedMorphTargets.slice();
  }

  /** Returns detached indexed morph state in exact target-name order. */
  @impl.adapted
  GetMorphAnimations()
  {
    return new Map([ ...this.#morphAnimations ].map(([ name, value ]) => [ name, { ...value } ]));
  }
}

function GetMeshRecord(resource, meshIndex)
{
  const payload = resource?.GetPayload?.() ?? resource;
  return payload?.meshes?.[meshIndex] ?? null;
}

function GetMorphLod(resource, meshIndex)
{
  return resource?.GetMeshLod?.(meshIndex, 0)
    ?? GetMeshRecord(resource, meshIndex)?.lods?.[0]
    ?? null;
}
