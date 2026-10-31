import { exposure as be } from "#be";
// Source: trinity/trinity/Tr2Mesh.h
// Source: trinity/trinity/Tr2Mesh.cpp
// Source: trinity/trinity/Tr2Mesh_Blue.cpp
import { type, blue as legacyBlue } from "#schema";
import { BlueAsyncRes, IsMatch, blue, IInitialize, INotify } from "#blue";
import { Tr2MeshBase } from "./Tr2MeshBase.js";
import { Tr2SerializedMorphAnimation } from "./Tr2SerializedMorphAnimation.js";


/**
 * A mesh backed by a geometry resource, adding the resource path plus the
 * morph-target weights and baked-morph state on top of Tr2MeshBase.
 * Carbon: PyGetAreas (trinity/trinity/Tr2Mesh_Blue.cpp:26-52)
 * Blue maps the inherited area-list query as GetAreas; JS already returns the list directly.
 */
@be.define("Tr2Mesh")
@be.inherit(IInitialize, INotify)
@be.mapInterface(IInitialize)
@be.mapInterface(INotify)
@be.exposureChainTo(Tr2MeshBase)
@be.mapMethod("GetAreas")
export class Tr2Mesh extends Tr2MeshBase
{
  _morphAnimations = new Map();

  /** Carbon: MAP_ATTRIBUTE_WITH_CHOOSER (trinity/trinity/Tr2Mesh_Blue.cpp:64); chooser TriGR2Chooser (trinity/trinity/TriConstants.cpp:87). */
  @be.mapAttributeWithChooser(be.READWRITE | be.NOTIFY | be.PERSIST, "blue.TriGR2Chooser")
  @type.path("TriGeometryRes")
  geometryResPath = "";

  @be.mapAttribute(be.PERSISTONLY)
  @type.list("Tr2SerializedMorphAnimation")
  serializedMorphAnimations = [];

  @be.mapAttribute(be.READWRITE | be.NOTIFY | be.PERSIST)


  @type.boolean
  deferGeometryLoad = false;

  @be.mapAttribute(be.READ)
  @type.object.ref("TriGeometryRes")
  geometry = null;

  /** m_lowResGeometryResource: the stand-in rendered while the authored mesh loads. */
  @legacyBlue.read
  /** Carbon: m_lowResGeometryResource (trinity/trinity/Tr2Mesh.h:93).
   */
  @type.object.ref("TriGeometryRes")
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
   * @adapted Carbon's fence covers all earlier manager jobs through preparation.
   *   JavaScript has no queue-wide fence; this owner observes completion of its
   *   selected request, including failure, and retains completion across purges.
   *   Low-detail fallback precedes the native fence; the primary request follows.
   */

  IsLoading()
  {
    return !this._loadFenceReached;
  }

  /**
   * Carbon Initialize (cpp:28-36): load the geometry unless the load is deferred.
   *
   * @implemented
   */

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
   *
   * @adapted
   */

  InitializeGeometryResource()
  {
    this._loadFenceGeneration += 1;
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

    const request = path => blue.resMan.GetResource(path);

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
    if (this._loadFenceResource)
    {
      const generation = this._loadFenceGeneration;
      const complete = () =>
      {
        if (generation !== this._loadFenceGeneration) return;
        this._loadFenceReached = true;
        this._loadFenceResource = null;
      };
      blue.resMan.Ready(this._loadFenceResource).then(complete, complete);
    }
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
   * @implemented
   */

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
   *
   * @implemented
   */

  SetMeshResPath(path)
  {
    this.geometryResPath = String(path ?? "");
    this.OnModified("geometryResPath");
  }

  /**
   * Carbon: SetGeometryRes (trinity/trinity/Tr2Mesh.cpp:60-74).
   * Detach from the old resource, bind the
   * new one, attach to it with AddNotifyTarget, whose contract is that an
   * already-prepared resource calls back immediately (BlueAsyncRes.cpp:274-276),
   * so a resource that is already good rebuilds here rather than on a later frame.
   *
   * @implemented
   */
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
   * @adapted Bounds are computed on demand by Tr2MeshBase.GetBounds rather than cached, so
   *   Carbon's CacheBounds call has nothing to refresh.
   */

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
   *
   * @implemented
   */

  SetLowResGeometryRes(resource)
  {
    const next = resource ?? null;
    const previous = this.lowResGeometry;
    if (previous === next) return;

    if (previous) previous.RemoveNotifyTarget(this);

    this.lowResGeometry = next;
    if (next) next.AddNotifyTarget(this);
  }

  /**
   * Carbon ReleaseCachedData (cpp:198-200): nothing cached to drop.
   *
   * @implemented
   */

  ReleaseCachedData(_resource)
  {
  }

  /**
   * Carbon: PySetGeometryRes (trinity/trinity/Tr2Mesh.cpp:202-206).
   * Binding a resource by hand clears
   * the authored path first, so the next notification does not refetch it.
   *
   * @implemented
   */
  @be.mapMethodAndWrap("SetGeometryRes")
  PySetGeometryRes(resource)
  {
    this.SetMeshResPath("");
    this.SetGeometryRes(resource);
  }

  /**
   * Checks primary liveness before selecting the low-detail stand-in
   * (Tr2Mesh.cpp:213-219).
   *
   * @adapted while the primary is pending or reviving from a purge, the mesh
   *   re-registers as its notify target, because the resource released it when it
   *   last completed (`BlueAsyncRes.AddNotifyTarget`). A failed primary is not
   *   re-registered, or it would call back every frame.
   */

  GetGeometryResource()
  {
    const geometry = this.geometry;
    if (geometry && geometry.IsGood()) return geometry;
    return this.lowResGeometry ?? geometry;
  }

  /**
   * Returns the authored geometry resource path.
   *
   * @implemented
   */

  GetMeshResPath()
  {
    return this.geometryResPath;
  }

  /**
   * Reads the selected geometry resource path, including the low-detail stand-in.
   * Source: trinity/trinity/Tr2MeshBase.cpp:425-434
   *
   * @implemented
   */
  GetGeometryResPath()
  {
    const resource = this.GetGeometryResource();
    if (!resource) return "";
    return resource.GetPath();
  }

  /**
   * The fixed number of mesh-area lists a mesh carries (14).
   *
   * @implemented
   */
  @be.mapMethodAndWrap()
  GetAreasCount()
  {
    return 14;
  }

  /**
   * Rebuilds indexed morph state from LOD-0 target names while preserving matching serialized weights.
   *
   * @adapted
   */
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
   * @adapted an empty list stands for Carbon's nullptr when there is no geometry or LOD.
   * @returns {string[]} the live list
   */

  GetMorphTargetNames()
  {
    const lod = this._GetMorphLod();
    return lod ? lod.morphTargetNames : [];
  }

  /**
   * Carbon IsBakedMorph (Tr2Mesh.cpp:244-259): LOD 0's baked flag for one morph target.
   *
   * @implemented
   * @param {number} index
   * @returns {boolean}
   */
  IsBakedMorph(index)
  {
    const lod = this._GetMorphLod();
    return lod ? lod.isBakedMorphTarget[index] : false;
  }

  /**
   * Sets one exact named morph target weight without clamping.
   *
   * @implemented
   */

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

  /**
   * Returns one exact named morph target weight, or the native zero fallback.
   *
   * @implemented
   */

  GetMorphTargetWeight(name)
  {
    return this._morphAnimations.get(String(name ?? ""))?.weight ?? 0;
  }

  /**
   * Carbon SetBakedMorphTarget (Tr2Mesh.cpp:291-312): sets LOD 0's baked flag for the target with this exact name.
   * The flag lives on the shared geometry, so every mesh drawing that LOD sees it.
   *
   * @implemented
   * @param {string} name
   * @param {boolean} isBaked
   */

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
   *
   * @implemented
   * @param {string} name
   * @returns {boolean}
   */

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
   *
   * @implemented
   * @returns {boolean[]|null} the live list, or null without geometry or LOD
   */
  GetAllBakedMorphTargetStates()
  {
    const lod = this._GetMorphLod();
    return lod ? lod.isBakedMorphTarget : null;
  }

  /** LOD 0 of this mesh, which Carbon's morph accessors read (GetMeshLod( GetMeshIndex(), 0 ), the lodIndex overload). */
  _GetMorphLod()
  {
    const geometry = this.GetGeometryResource();
    return geometry ? geometry.GetMeshLod__LodIndex(this.meshIndex, 0) : null;
  }

  /**
   * Returns detached indexed morph state in exact target-name order.
   *
   * @adapted
   */
  GetMorphAnimations()
  {
    return new Map([ ...this._morphAnimations ].map(([ name, value ]) => [ name, { ...value } ]));
  }

  /** Distinguishes an older one-shot wait when a mesh rebinds the same handle. */
  _loadFenceGeneration = 0;

  /**
   * Carbon destructor (Tr2Mesh.cpp:14-22): detach both geometry subscriptions.
   *
   * @adapted
   */
  Destruct()
  {
    this._loadFenceGeneration += 1;
    this._loadFenceResource = null;
    this._loadFenceReached = true;
    this.SetGeometryRes(null);
    this.SetLowResGeometryRes(null);
    BlueAsyncRes.markNotifyTargetDestructed(this);
  }
}

