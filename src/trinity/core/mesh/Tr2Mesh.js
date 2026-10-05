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
  _morphAnimations = new Map();

  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.path("TriGeometryRes")
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
   * Reads the mesh load fence through its native property target.
   * Source: trinity/trinity/Tr2Mesh_Blue.cpp:71-74; Tr2Mesh.cpp:222-225
   */
  get isLoading()
  {
    return this.IsLoading();
  }

  /** Selected request tracked in place of the native queue-wide prepare fence. */
  _loadFenceResource = null;
  _loadFenceReached = true;

  /**
   * Notify target for the load fence. It records completion once; the resource
   * releases it on completion, so a later purge and reload does not reopen the
   * fence.
   */
  _loadFenceTarget = {
    RebuildCachedData: resource =>
    {
      if (resource !== this._loadFenceResource) return;
      this._loadFenceReached = true;
      this._loadFenceResource = null;
    },
    ReleaseCachedData: () => {}
  };

  /**
   * Adapted: Carbon's fence covers all earlier manager jobs through preparation.
   * JavaScript has no queue-wide fence; this owner observes completion of its
   * selected request, including failure, and retains completion across purges.
   * Low-detail fallback precedes the native fence; the primary request follows.
   */
  @meta.blue.method
  @meta.adapted
  IsLoading()
  {
    return !this._loadFenceReached;
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
   * through the resource manager and bind the result. Adapted: resource-local
   * completion substitutes for Carbon's queue-wide load/prepare fence.
   */
  @meta.blue.method
  @meta.adapted
  InitializeGeometryResource()
  {
    if (this._loadFenceResource) this._loadFenceResource.RemoveNotifyTarget(this._loadFenceTarget);
    this._loadFenceResource = null;
    this._loadFenceReached = true;
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

    const geometry = request(this.geometryResPath);
    // Tr2Mesh.cpp:123 puts the fence before requesting the primary when the
    // low-detail sibling exists. Capture that request even if it is later unbound.
    this._loadFenceResource = lowRes ?? geometry;
    this._loadFenceReached = !this._loadFenceResource;
    if (this._loadFenceResource) this._loadFenceResource.AddNotifyTarget(this._loadFenceTarget);
    this.SetLowResGeometryRes(lowRes);
    this.SetGeometryRes(geometry);
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
   *
   * Adapted: JS identifies Carbon's changed member address by its exposed property name.
   */
  @meta.blue.method
  @meta.adapted
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
   * new one, attach to it with AddNotifyTarget, whose contract is that an
   * already-prepared resource calls back immediately (BlueAsyncRes.cpp:274-276),
   * so a resource that is already good rebuilds here rather than on a later frame.
   */
  @meta.blue.method
  @meta.implemented
  SetGeometryRes(resource)
  {
    const next = resource ?? null;
    const previous = this.geometry;
    if (previous === next) return;

    if (previous) previous.RemoveNotifyTarget(this);

    this.geometry = next;
    // Direct mutation bypasses SetValues, so schedule the declared consequence
    // explicitly; maintained class code may add declared rebuild tokens.


    if (next) next.AddNotifyTarget(this);
  }

  /**
   * Carbon RebuildCachedData (cpp:185-196): the notify target's rebuild half -
   * re-cache the bounds and the morph targets when the resource that finished
   * is one of ours, and drop the low-detail stand-in once the real one arrives.
   *
   * Adapted: Bounds are computed on demand by Tr2MeshBase.GetBounds rather than cached, so
   * Carbon's CacheBounds call has nothing to refresh.
   */
  @meta.blue.method
  @meta.adapted
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
  @meta.implemented
  SetLowResGeometryRes(resource)
  {
    const next = resource ?? null;
    const previous = this.lowResGeometry;
    if (previous === next) return;

    if (previous) previous.RemoveNotifyTarget(this);

    this.lowResGeometry = next;
    if (next) next.AddNotifyTarget(this);
  }

  /** Carbon ReleaseCachedData (cpp:198-200): nothing cached to drop. */
  @meta.blue.method
  @meta.implemented
  ReleaseCachedData(_resource)
  {
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

  /**
   * Checks primary liveness before selecting the low-detail stand-in
   * (Tr2Mesh.cpp:213-219).
   *
   * Adapted: while the primary is pending or reviving from a purge, the mesh
   * re-registers as its notify target, because the resource released it when it
   * last completed (`CjsResource.AddNotifyTarget`). A failed primary is not
   * re-registered, or it would call back every frame.
   */
  @meta.blue.method
  @meta.adapted
  GetGeometryResource()
  {
    const geometry = this.geometry;
    if (geometry && geometry.IsGood()) return geometry;
    if (geometry && !geometry.IsFailed()) geometry.AddNotifyTarget(this);
    return this.lowResGeometry ?? geometry;
  }

  /** Returns the authored geometry resource path. */
  @meta.blue.method
  @meta.implemented
  GetMeshResPath()
  {
    return this.geometryResPath;
  }

  /**
   * Reads the selected geometry resource path, including the low-detail stand-in.
   * Source: trinity/trinity/Tr2MeshBase.cpp:425-434
   */
  @meta.blue.method
  @meta.implemented
  GetGeometryResPath()
  {
    const resource = this.GetGeometryResource();
    if (!resource) return "";
    return resource.GetPath();
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

    this._morphAnimations.clear();

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

  /**
   * Carbon GetMorphTargetNames (Tr2Mesh.cpp:225-242): LOD 0's morph target names, as the geometry resource stored
   * them at load (less the exporter's "Shape" suffix).
   *
   * Adapted: an empty list stands for Carbon's nullptr when there is no geometry or LOD.
   * @returns {string[]} the live list
   */
  @meta.blue.method
  @meta.adapted
  GetMorphTargetNames()
  {
    const lod = this._GetMorphLod();
    return lod ? lod.morphTargetNames : [];
  }

  /**
   * Carbon IsBakedMorph (Tr2Mesh.cpp:244-259): LOD 0's baked flag for one morph target.
   * @param {number} index
   * @returns {boolean}
   */
  @meta.implemented
  IsBakedMorph(index)
  {
    const lod = this._GetMorphLod();
    return lod ? lod.isBakedMorphTarget[index] : false;
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

  /**
   * Carbon SetBakedMorphTarget (Tr2Mesh.cpp:291-312): sets LOD 0's baked flag for the target with this exact name.
   * The flag lives on the shared geometry, so every mesh drawing that LOD sees it.
   * @param {string} name
   * @param {boolean} isBaked
   */
  @meta.blue.method
  @meta.implemented
  SetBakedMorphTarget(name, isBaked)
  {
    const lod = this._GetMorphLod();
    if (!lod)
    {
      return;
    }

    const index = lod.morphTargetNames.indexOf(name);
    if (index !== -1)
    {
      lod.isBakedMorphTarget[index] = isBaked;
    }
  }

  /**
   * Carbon GetBakedMorphTarget (Tr2Mesh.cpp:314-335): LOD 0's baked flag for the target with this exact name.
   * @param {string} name
   * @returns {boolean}
   */
  @meta.blue.method
  @meta.implemented
  GetBakedMorphTarget(name)
  {
    const lod = this._GetMorphLod();
    if (!lod)
    {
      return false;
    }

    const index = lod.morphTargetNames.indexOf(name);
    return index !== -1 ? lod.isBakedMorphTarget[index] : false;
  }

  /**
   * Carbon GetAllBakedMorphTargetStates (Tr2Mesh.cpp:337-352): LOD 0's baked flags.
   * @returns {boolean[]|null} the live list, or null without geometry or LOD
   */
  @meta.implemented
  GetAllBakedMorphTargetStates()
  {
    const lod = this._GetMorphLod();
    return lod ? lod.isBakedMorphTarget : null;
  }

  /** LOD 0 of this mesh, which Carbon's morph accessors read (GetMeshLod( GetMeshIndex(), 0 ), the lodIndex overload). */
  _GetMorphLod()
  {
    const geometry = this.GetGeometryResource();
    return geometry ? geometry.GetMeshLod_LodIndex(this.meshIndex, 0) : null;
  }

  /** Returns detached indexed morph state in exact target-name order. */
  @meta.adapted
  GetMorphAnimations()
  {
    return new Map([ ...this._morphAnimations ].map(([ name, value ]) => [ name, { ...value } ]));
  }
}

meta.blue.interfaceTable({ interfaces: [Tr2Mesh, IInitialize, INotify], chainTo: Tr2MeshBase })(Tr2Mesh, { kind: "class" });
