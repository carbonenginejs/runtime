// Source: trinity/trinity/Tr2Mesh.h
// Source: trinity/trinity/Tr2Mesh.cpp
// Source: trinity/trinity/Tr2Mesh_Blue.cpp
import { carbon, impl, io, type } from "#schema";
import { CjsResMan, ResourceRequirement } from "#resource";
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

  /** m_lowResGeometryResource: the stand-in rendered while the authored mesh loads. */
  @io.read
  @type.objectRef("TriGeometryRes")
  lowResGeometry = null;

  /**
   * True while the bound geometry resource is still loading; false when no
   * resource is bound.
   */
  get isLoading()
  {
    return this.geometry?.IsLoading?.() ?? false;
  }

  /** Carbon Initialize (cpp:28-36): load the geometry unless the load is deferred. */
  @carbon.method
  @impl.implemented
  Initialize()
  {
    if (!this.deferGeometryLoad)
    {
      this.InitializeGeometryResource();
    }
    return true;
  }

  /**
   * Carbon InitializeGeometryResource (cpp:107-138): fetch the authored path
   * through the resource manager and bind the result.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon's load fence (m_loadFence.Put) is unported; there is no prepare-phase fence here, so both requests are simply issued.")
  InitializeGeometryResource()
  {
    const manager = CjsResMan.GetGlobal();
    if (!manager || !this.geometryResPath)
    {
      this.SetLowResGeometryRes(null);
      this.SetGeometryRes(null);
      return;
    }

    const request = path => manager.GetResource(path, { requirement: ResourceRequirement.GEOMETRY });

    // Carbon cpp:113-127: when the authored file is NOT there but a
    // <base>_lowdetail<ext> sibling is, take the low-detail one to render with
    // now and request the authored one behind it. BePaths->FileExistsLocally
    // asks the file system; here the same question goes to the res file index
    // through CjsResMan.ResourceExists, which answers false when no index is
    // installed - so an uninstalled index leaves the authored path alone.
    let lowRes = null;
    if (CjsResMan.HasResourceExistsResolver() && !CjsResMan.ResourceExists(this.geometryResPath))
    {
      const lowResPath = Tr2Mesh.#lowDetailPath(this.geometryResPath);
      if (lowResPath && CjsResMan.ResourceExists(lowResPath)) lowRes = request(lowResPath);
    }

    this.SetLowResGeometryRes(lowRes);
    this.SetGeometryRes(request(this.geometryResPath));
  }

  /** Carbon cpp:115-118: the sibling path, inserting _lowdetail before the extension. */
  static #lowDetailPath(path)
  {
    const dot = String(path).lastIndexOf(".");
    if (dot === -1) return null;
    return `${path.slice(0, dot)}_lowdetail${path.slice(dot)}`;
  }

  /**
   * Carbon OnModified (cpp:38-58): three arms, dispatched on which member
   * changed - the path refetches, clearing the defer flag starts the load a
   * deferred mesh skipped, and the mesh index rebuilds the morph targets.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon identifies the changed member by Be::Var pointer and runs exactly one arm because it is notified per member. The settle here reports a whole write, so the arms are independent ifs over the changed names when a caller supplies them (options.property/properties), and all three run when it does not.")
  OnModified(options = {})
  {
    const changed = Tr2Mesh.#changedNames(options);
    const touched = name => changed === null || changed.has(name);

    if (touched("geometryResPath"))
    {
      this.InitializeGeometryResource();
    }
    if (touched("deferGeometryLoad") && !this.deferGeometryLoad && !this.geometry)
    {
      this.InitializeGeometryResource();
    }
    if (touched("meshIndex"))
    {
      this.InitializeMorphTargets();
    }
    return true;
  }

  /** The field names a caller named, or null when the write did not say. */
  static #changedNames(options)
  {
    const named = options?.changedFields ?? options?.properties ?? options?.property ?? null;
    if (named === null || named === undefined) return null;
    if (typeof named === "string") return new Set([ named ]);
    return named instanceof Set ? named : new Set(named);
  }

  /**
   * Carbon SetMeshResPath (cpp:99-105): assign, then fire the notification by
   * hand - "this will automatically be triggered when set through python".
   */
  @carbon.method
  @impl.implemented
  SetMeshResPath(path)
  {
    this.geometryResPath = String(path ?? "");
    this.OnModified({ property: "geometryResPath" });
  }

  /**
   * Carbon SetGeometryRes (cpp:60-74): detach from the old resource, bind the
   * new one, attach to it. Carbon's attachment is AddNotifyTarget, whose
   * contract is that an already-prepared resource calls back immediately
   * (BlueAsyncRes.cpp:274-276); OnCompleted has the same rule, so a resource
   * that is already good rebuilds here rather than on a later frame.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon's IBlueAsyncResNotifyTarget pair becomes the resource's own completion event; a caller-supplied object with no lifecycle (tests, hand-composed graphs) is treated as already complete.")
  SetGeometryRes(resource)
  {
    const next = resource ?? null;
    const previous = this.geometry;
    if (previous === next) return;

    if (previous && typeof previous.OffEvent === "function")
    {
      previous.OffEvent("completed", this.#geometryCompleted, this);
    }

    this.geometry = next;
    // Direct mutation bypasses SetValues, so schedule the declared consequence
    // explicitly; maintained class code may add declared rebuild tokens.
    this.__state.rebuild.add("geometry");

    if (!next) return;
    if (typeof next.OnCompleted === "function") next.OnCompleted(this.#geometryCompleted, this);
    else this.RebuildCachedData(next);
  }

  /** Bound to this mesh so the resource can be unsubscribed by identity. */
  #geometryCompleted = (_event, resource) => this.RebuildCachedData(resource ?? this.geometry);

  /**
   * Carbon RebuildCachedData (cpp:185-196): the notify target's rebuild half -
   * re-cache the bounds and the morph targets when the resource that finished
   * is one of ours, and drop the low-detail stand-in once the real one arrives.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Bounds are computed on demand by Tr2MeshBase.GetBounds rather than cached, so Carbon's CacheBounds call has nothing to refresh.")
  RebuildCachedData(resource)
  {
    // Two ifs, not an else: a low-detail resource finishing rebuilds the
    // targets and keeps its place; the authored one finishing also retires it.
    if (resource === this.geometry || resource === this.lowResGeometry)
    {
      this.InitializeMorphTargets();
    }
    if (resource === this.geometry)
    {
      this.SetLowResGeometryRes(null);
    }
  }

  /**
   * Carbon SetLowResGeometryRes (cpp:76-90): the same detach/bind/attach as
   * SetGeometryRes, for the stand-in shown while the authored mesh loads.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon's IBlueAsyncResNotifyTarget pair becomes the resource's own completion event, as in SetGeometryRes.")
  SetLowResGeometryRes(resource)
  {
    const next = resource ?? null;
    const previous = this.lowResGeometry;
    if (previous === next) return;

    if (previous && typeof previous.OffEvent === "function")
    {
      previous.OffEvent("completed", this.#geometryCompleted, this);
    }

    this.lowResGeometry = next;
    if (!next) return;
    if (typeof next.OnCompleted === "function") next.OnCompleted(this.#geometryCompleted, this);
    else this.RebuildCachedData(next);
  }

  /**
   * Carbon PySetGeometryRes (cpp:202-206): binding a resource by hand clears
   * the authored path first, so the next notification does not refetch it.
   */
  @carbon.method
  @impl.implemented
  PySetGeometryRes(resource)
  {
    this.SetMeshResPath("");
    this.SetGeometryRes(resource);
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
