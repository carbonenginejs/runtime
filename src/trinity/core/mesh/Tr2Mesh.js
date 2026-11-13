// Source: trinity/trinity/Tr2Mesh.h
// Source: trinity/trinity/Tr2Mesh.cpp
// Source: trinity/trinity/Tr2Mesh_Blue.cpp
import { exposure as be } from "#be";
import { type } from "#schema";
import { IsMatch, blue, BlueList, IInitialize, INotify } from "#blue";
import { Tr2MeshBase } from "./Tr2MeshBase.js";
import { Tr2SerializedMorphAnimation } from "./Tr2SerializedMorphAnimation.js";


/**
 * A mesh backed by a geometry resource, adding the resource path plus the
 * morph-target weights and baked-morph state on top of Tr2MeshBase.
 * Carbon: Tr2Mesh (trinity/trinity/Tr2Mesh.h:31-104)
 * Blue maps the inherited area-list query as GetAreas (Tr2MeshBase.GetAreas).
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
  serializedMorphAnimations = new BlueList(Tr2SerializedMorphAnimation, { className: "Tr2SerializedMorphAnimation" });

  @be.mapAttribute(be.READWRITE | be.NOTIFY | be.PERSIST)


  @type.boolean
  deferGeometryLoad = false;

  /**
   * m_geometryResource (TriGeometryResPtr) [READ]: the primary geometry.
   * Carbon: MAP_ATTRIBUTE (trinity/trinity/Tr2Mesh_Blue.cpp:63).
   */
  @be.mapAttribute(be.READ)
  @type.object.ref("TriGeometryRes")
  geometry = null;

  /**
   * m_lowResGeometryResource (TriGeometryResPtr): the stand-in rendered while the
   * authored mesh loads. Not exposed to Blue.
   * Carbon: m_lowResGeometryResource (trinity/trinity/Tr2Mesh.h:93).
   */
  @type.object.ref("TriGeometryRes")
  lowResGeometry = null;

  /** @cjs Prevents a destroyed mesh from reacquiring expired resources. */
  _destroyed = false;

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

  /**
   * The low-detail sibling of a mesh path, `_lowdetail` inserted before the extension, as SetMeshResPath
   * builds it inline (Tr2Mesh.cpp:115-119).
   *
   * @cjs Carbon has no method for it; factored out of SetMeshResPath, its one caller.
   * @param {string} path The authored mesh path.
   * @returns {string|null} The sibling path, or null for a path without an extension.
   */
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
   * Carbon: SetGeometryRes (trinity/trinity/Tr2Mesh.cpp:60-74). Binds the new
   * resource. Carbon also attaches with AddNotifyTarget, which rebuilds at once
   * when the resource is already prepared.
   *
   * @adapted Expiring manager links replace native per-resource target lists.
   */
  SetGeometryRes(resource)
  {
    const previous = this.geometry;
    if (previous) blue.resMan.notify.Remove(this, previous);
    this.geometry = resource ?? null;
    if (previous && this.lowResGeometry === previous)
      blue.resMan.notify.Add(this, previous, this, "lowResGeometry");
    if (this.geometry) blue.resMan.notify.Add(this, this.geometry, this, "geometry");
  }

  /**
   * Carbon RebuildCachedData (cpp:185-196): the dependency callback -
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
   * Carbon SetLowResGeometryRes (cpp:76-90): binds the stand-in shown while the
   * authored mesh loads, as SetGeometryRes does.
   *
   * @adapted As SetGeometryRes, notification links belong to the manager.
   */

  SetLowResGeometryRes(resource)
  {
    const previous = this.lowResGeometry;
    if (previous) blue.resMan.notify.Remove(this, previous);
    this.lowResGeometry = resource ?? null;
    if (previous && this.geometry === previous)
      blue.resMan.notify.Add(this, previous, this, "geometry");
    if (this.lowResGeometry) blue.resMan.notify.Add(this, this.lowResGeometry, this, "lowResGeometry");
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
   * Lets go of an expired geometry in every slot that holds it.
   * @cjs Carbon never expires a resource, so it has no such callback. resMan calls
   *   this when the link expires, and GetGeometryResource reacquires from geometryResPath.
   * @param {TriGeometryRes} resource The expired geometry.
   * @returns {void}
   */
  RemoveCachedData(resource)
  {
    this.ReleaseCachedData(resource);
    if (this.geometry === resource) this.geometry = null;
    if (this.lowResGeometry === resource) this.lowResGeometry = null;
    // The link goes with the data, so a holder releases a resource in one place (Destruct and expiry alike).
    blue.resMan.notify.Remove(this, resource);
  }

  /**
   * Removes both geometry notification links, the complete native destructor body.
   * Carbon: trinity/trinity/Tr2Mesh.cpp:14-24.
   * @adapted Manager-owned links replace Carbon's per-resource notify targets.
   * @returns {void}
   * @adapted Preserves the prior explicit Destruct fences and cached-slot clearing; graph dispatch owns base cleanup.
   */
  _Destructor()
  {
    this._destroyed = true;
    this._loadFenceGeneration += 1;
    this._loadFenceResource = null;
    this._loadFenceReached = true;
    // Carbon ~Tr2Mesh (Tr2Mesh.cpp:14-24): RemoveNotifyTarget on both geometries.
    if (this.geometry) this.RemoveCachedData(this.geometry);
    if (this.lowResGeometry) this.RemoveCachedData(this.lowResGeometry);
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
   * @adapted Both slots renew their manager links independently. An expired
   *   path-owned geometry is reacquired on use unless loading is deferred.
   */

  GetGeometryResource()
  {
    if (this._destroyed) return null;
    if (!this.geometry && this.geometryResPath && !this._loadFenceResource && !this.deferGeometryLoad)
      this.InitializeGeometryResource();
    const geometry = this.geometry;
    const good = geometry ? geometry.IsGood(this) : false;
    if (this.lowResGeometry) this.lowResGeometry.IsGood(this);
    if (good) return geometry;
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
    const serializedMatches = this.serializedMorphAnimations.length === names.length
      && names.every((name, index) => this.serializedMorphAnimations[index]?.name === name);

    if (!serializedMatches)
    {
      this.serializedMorphAnimations.Clear();
      for (const name of names)
      {
        const value = new Tr2SerializedMorphAnimation();
        value.name = name;
        value.weight = 0;
        this.serializedMorphAnimations.Append(value);
      }
    }

    this._morphAnimations.clear();

    // Carbon Tr2Mesh.cpp:178-181 assigns by name in source order: the last duplicate wins.
    // Keep every serialized slot and geometry index; authored names need not be unique.
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

  /**
   * LOD 0 of this mesh, which Carbon's morph accessors each read inline (`GetMeshLod( GetMeshIndex(), 0 )`, the
   * lodIndex overload).
   *
   * @cjs Carbon has no method for it; factored out of the morph accessors that repeat the lookup.
   * @returns {object|null} The LOD, or null without a geometry resource.
   */
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


}

