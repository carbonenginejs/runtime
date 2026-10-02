// Source: trinity/trinity/Tr2Mesh.h
// Source: trinity/trinity/Tr2Mesh.cpp
// Source: trinity/trinity/Tr2Mesh_Blue.cpp
import { meta } from "#schema";
import { ResourceRequirement } from "#resource";
import { IsMatch, blue, IInitialize, INotify } from "#blue";
import { Tr2MeshBase } from "./Tr2MeshBase.js";
import { Tr2SerializedMorphAnimation } from "./Tr2SerializedMorphAnimation.js";


/**
 * A mesh backed by a geometry resource, adding the resource path plus the
 * morph-target weights and baked-morph state on top of Tr2MeshBase.
 */
@meta.define({ className: "Tr2Mesh", family: "trinityCore" })
@meta.blue.inherit(IInitialize, INotify)
export class Tr2Mesh extends Tr2MeshBase
{
  _bakedMorphTargets = [];

  _morphAnimations = new Map();

  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  geometryResPath = "";

  @meta.blue.persistOnly
  @meta.type.list("Tr2SerializedMorphAnimation")
  serializedMorphAnimations = [];

  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  deferGeometryLoad = false;

  @meta.blue.read
  @meta.type.objectRef("TriGeometryRes")
  geometry = null;

  /** m_lowResGeometryResource: the stand-in rendered while the authored mesh loads. */
  @meta.blue.read
  @meta.type.objectRef("TriGeometryRes")
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
  @meta.blue.method
  @meta.implemented
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
  @meta.blue.method
  @meta.adapted
  @meta.reason("Carbon's load fence (m_loadFence.Put) is unported; there is no prepare-phase fence here, so both requests are simply issued.")
  InitializeGeometryResource()
  {
    if (!this.geometryResPath)
    {
      // Carbon requests the empty path anyway and gets nothing back
      // (cpp:131-133); short-circuiting reaches the same two nulls without
      // asking the manager for "".
      this.SetLowResGeometryRes(null);
      this.SetGeometryRes(null);
      return;
    }

    const request = path => blue.resMan.GetResource(path, { requirement: ResourceRequirement.GEOMETRY });

    // Carbon cpp:113-127: when the authored file is NOT there but a
    // <base>_lowdetail<ext> sibling is, take the low-detail one to render with
    // now and request the authored one behind it. The same question, to the
    // same service Carbon asks - BePaths->FileExistsLocally is
    // blue.paths.FileExistsLocally.
    let lowRes = null;
    if (!blue.paths.FileExistsLocally(this.geometryResPath))
    {
      const lowResPath = Tr2Mesh._lowDetailPath(this.geometryResPath);
      if (lowResPath && blue.paths.FileExistsLocally(lowResPath)) lowRes = request(lowResPath);
    }

    this.SetLowResGeometryRes(lowRes);
    this.SetGeometryRes(request(this.geometryResPath));
  }

  /** Carbon cpp:115-118: the sibling path, inserting _lowdetail before the extension. */
  static _lowDetailPath(path)
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
  @meta.blue.method
  @meta.adapted
  @meta.reason("JS identifies Carbon's changed member address by its exposed property name.")
  OnModified(propertyName)
  {
    if (IsMatch(propertyName, "geometryResPath"))
    {
      this.InitializeGeometryResource();
    }
    else if (IsMatch(propertyName, "deferGeometryLoad"))
    {
      if (!this.deferGeometryLoad && !this.geometry) this.Initialize();
    }
    if (IsMatch(propertyName, "meshIndex"))
    {
      this.InitializeMorphTargets();
    }
    return true;
  }

  /**
   * Carbon SetMeshResPath (cpp:99-105): assign, then fire the notification by
   * hand - "this will automatically be triggered when set through python".
   */
  @meta.blue.method
  @meta.implemented
  SetMeshResPath(path)
  {
    this.geometryResPath = String(path ?? "");
    this.OnModified("geometryResPath");
  }

  /**
   * Carbon SetGeometryRes (cpp:60-74): detach from the old resource, bind the
   * new one, attach to it. Carbon's attachment is AddNotifyTarget, whose
   * contract is that an already-prepared resource calls back immediately
   * (BlueAsyncRes.cpp:274-276); OnCompleted has the same rule, so a resource
   * that is already good rebuilds here rather than on a later frame.
   */
  @meta.blue.method
  @meta.adapted
  @meta.reason("Carbon's IBlueAsyncResNotifyTarget pair becomes the resource's own completion event; a caller-supplied object with no lifecycle (tests, hand-composed graphs) is treated as already complete.")
  SetGeometryRes(resource)
  {
    const next = resource ?? null;
    const previous = this.geometry;
    if (previous === next) return;

    if (previous && typeof previous.OffEvent === "function")
    {
      previous.OffEvent("completed", this._geometryCompleted, this);
    }

    this.geometry = next;
    // Direct mutation bypasses SetValues, so schedule the declared consequence
    // explicitly; maintained class code may add declared rebuild tokens.


    if (!next) return;
    if (typeof next.OnCompleted === "function") next.OnCompleted(this._geometryCompleted, this);
    else this.RebuildCachedData(next);
  }

  /** Bound to this mesh so the resource can be unsubscribed by identity. */
  _geometryCompleted = (_event, resource) => this.RebuildCachedData(resource ?? this.geometry);

  /**
   * Carbon RebuildCachedData (cpp:185-196): the notify target's rebuild half -
   * re-cache the bounds and the morph targets when the resource that finished
   * is one of ours, and drop the low-detail stand-in once the real one arrives.
   */
  @meta.blue.method
  @meta.adapted
  @meta.reason("Bounds are computed on demand by Tr2MeshBase.GetBounds rather than cached, so Carbon's CacheBounds call has nothing to refresh.")
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
  @meta.blue.method
  @meta.adapted
  @meta.reason("Carbon's IBlueAsyncResNotifyTarget pair becomes the resource's own completion event, as in SetGeometryRes.")
  SetLowResGeometryRes(resource)
  {
    const next = resource ?? null;
    const previous = this.lowResGeometry;
    if (previous === next) return;

    if (previous && typeof previous.OffEvent === "function")
    {
      previous.OffEvent("completed", this._geometryCompleted, this);
    }

    this.lowResGeometry = next;
    if (!next) return;
    if (typeof next.OnCompleted === "function") next.OnCompleted(this._geometryCompleted, this);
    else this.RebuildCachedData(next);
  }

  /**
   * Carbon PySetGeometryRes (cpp:202-206): binding a resource by hand clears
   * the authored path first, so the next notification does not refetch it.
   */
  @meta.blue.method
  @meta.implemented
  PySetGeometryRes(resource)
  {
    this.SetMeshResPath("");
    this.SetGeometryRes(resource);
  }

  /** Checks primary liveness before selecting the low-detail stand-in (Tr2Mesh.cpp:213-219). */
  @meta.blue.method
  @meta.implemented
  GetGeometryResource()
  {
    if (this.geometry && this.geometry.IsGood()) return this.geometry;
    return this.lowResGeometry ?? this.geometry;
  }

  /** Returns the authored geometry resource path. */
  @meta.blue.method
  @meta.implemented
  GetMeshResPath()
  {
    return this.geometryResPath;
  }

  /**
   * The bound resource's own path when one is bound, otherwise the authored
   * path.
   */
  @meta.blue.method
  @meta.adapted
  GetGeometryResPath()
  {
    return this.geometry?.GetPath() ?? this.geometryResPath;
  }

  /** The fixed number of mesh-area lists a mesh carries (14). */
  @meta.blue.method
  @meta.implemented
  GetAreasCount()
  {
    return 14;
  }

  /** Rebuilds indexed morph state from LOD-0 target names while preserving matching serialized weights. */
  @meta.adapted
  InitializeMorphTargets()
  {
    if (!this.GetGeometryResource())
    {
      this._morphAnimations.clear();
      this._bakedMorphTargets = [];
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

    const previousBaked = new Map([ ...this._morphAnimations ]
      .map(([ name, value ]) => [ name, this._bakedMorphTargets[value.index] ?? false ]));
    const resourceBaked = GetMorphLod(this.GetGeometryResource(), this.meshIndex)?.isBakedMorphTarget;

    this._morphAnimations.clear();
    this._bakedMorphTargets = names.map((name, index) => Array.isArray(resourceBaked)
      ? !!resourceBaked[index]
      : previousBaked.get(name) ?? false);

    names.forEach((name, index) =>
    {
      const weight = Number(this.serializedMorphAnimations[index]?.weight);

      if (!Number.isFinite(weight))
      {
        throw new TypeError(`Tr2Mesh morph target "${name}" weight must be finite`);
      }

      this._morphAnimations.set(name, { index, weight });
    });

    return names.length;
  }

  /** Returns detached LOD-0 morph target names from the prepared geometry resource. */
  @meta.blue.method
  @meta.adapted
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
  @meta.implemented
  IsBakedMorph(index)
  {
    return Number.isInteger(index) && index >= 0 && index < this._bakedMorphTargets.length
      ? this._bakedMorphTargets[index]
      : false;
  }

  /** Sets one exact named morph target weight without clamping. */
  @meta.blue.method
  @meta.implemented
  SetMorphTargetWeight(name, value)
  {
    const key = String(name ?? "");
    const weight = Number(value);
    const animation = this._morphAnimations.get(key);

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
  @meta.blue.method
  @meta.implemented
  GetMorphTargetWeight(name)
  {
    return this._morphAnimations.get(String(name ?? ""))?.weight ?? 0;
  }

  /** Sets the baked flag for one exact named morph target. */
  @meta.blue.method
  @meta.adapted
  SetBakedMorphTarget(name, value)
  {
    const animation = this._morphAnimations.get(String(name ?? ""));

    if (!animation)
    {
      return false;
    }

    const baked = !!value;
    this._bakedMorphTargets[animation.index] = baked;

    const states = GetMorphLod(this.GetGeometryResource(), this.meshIndex)?.isBakedMorphTarget;
    if (Array.isArray(states) && animation.index < states.length)
    {
      states[animation.index] = baked;
    }

    return true;
  }

  /** Returns the baked flag for one exact named morph target. */
  @meta.blue.method
  @meta.implemented
  GetBakedMorphTarget(name)
  {
    const animation = this._morphAnimations.get(String(name ?? ""));
    return animation ? this._bakedMorphTargets[animation.index] : false;
  }

  /** Returns detached baked flags in morph-target index order. */
  @meta.adapted
  GetAllBakedMorphTargetStates()
  {
    return this._bakedMorphTargets.slice();
  }

  /** Returns detached indexed morph state in exact target-name order. */
  @meta.adapted
  GetMorphAnimations()
  {
    return new Map([ ...this._morphAnimations ].map(([ name, value ]) => [ name, { ...value } ]));
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

meta.blue.interfaceTable({ interfaces: [Tr2Mesh, IInitialize, INotify], chainTo: Tr2MeshBase })(Tr2Mesh, { kind: "class" });
