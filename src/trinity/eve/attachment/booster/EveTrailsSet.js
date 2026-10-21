// Source: trinity/trinity/Eve/SpaceObject/Attachments/EveTrailsSet.h
// Source: trinity/trinity/Eve/SpaceObject/Attachments/EveTrailsSet.cpp
import { IInitialize } from "../../../../global/blue/IInitialize.js";
import { Tr2DeviceResource } from "../../../core/device/Tr2DeviceResource.js";
import { mat4 } from "#math/mat4";
import { IsMatch, blue as be } from "#blue";
import { ResourceRequirement } from "#resource";
import { TriStorageFlags } from "#consts/graphics";
import { INotify } from "#blue";
import { meta, type, blue } from "#schema";
import { Tr2RenderBatch } from "../../../core/batch/TriRenderBatch/index.js";
import { Tr2RenderContext_GetMainThreadRenderContext } from "../../../core/context/Tr2RenderContext.js";
import { TriDevice } from "../../../core/device/TriDevice.js";
import { CreateLodAllocations, SharedGeometryBuffer } from "../../../core/mesh/TriGeometryResAllocations.js";
import { CarbonVertexElements } from "../../../core/vertex/vertexUsage.js";
import { Tr2VertexUsageCode } from "../../../core/vertex/usageCode.js";
import { Tr2EffectStateManager } from "../../../shader/Tr2EffectStateManager.js";
import { TriGeometryRes } from "#resource/geometry";
import { EveTrailsSetSingleTrailData } from "./EveTrailsSetSingleTrailData.js";

/** sizeof( InstanceVertex ): the booster's position and size as one float4. */
const INSTANCE_VERTEX_SIZE = 16;

/**
 * A booster set's trails: one trail mesh drawn once per booster, instanced,
 * its shape bent along each booster renderable's spline in the vertex shader.
 */
@blue.define("EveTrailsSet")
@blue.inherit(IInitialize, INotify, Tr2DeviceResource)
@blue.interface(INotify, IInitialize)
export class EveTrailsSet
{

  /** m_geometryResource (TriGeometryResPtr) [READ] */
  @blue.read
  @type.rootRef("TriGeometryRes")
  geometryResource = null;

  /** m_fadeSpeed (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  fadeSpeed = 1;

  /** m_effect (Tr2EffectPtr) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.rootRef("Tr2Effect")
  effect = null;

  /** m_geometryResPath (std::string) [READWRITE, PERSIST, NOTIFY] */
  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.path("TriGeometryRes")
  geometryResPath = "";

  /** m_display (bool) [READWRITE] */
  @blue.readwrite
  @type.boolean
  display = true;

  /**
   * m_trailData (h:121): one record per booster with a trail. Carbon does not
   * map it; it persists here so values carry which boosters have trails.
   */
  @meta.persistOnly
  @type.list("EveTrailsSetSingleTrailData")
  _trailData = [];

  /** m_trailVertexDecl: the trail mesh's elements plus the instance float4. */
  _trailVertexDecl = [];

  /** m_trailVertexDeclElementCount: zero until the mesh has loaded. */
  _trailVertexDeclElementCount = 0;

  /** m_vertexDeclHandle */
  _vertexDeclHandle = Tr2EffectStateManager.Unknown;

  /** m_instanceBuffer: a shared-buffer allocation, null until built. */
  _instanceBuffer = null;

  /** Carbon's constructor (cpp:13-20): a Tr2DeviceResource, prepared now and whenever the device can. */
  constructor()
  {
    TriDevice.RegisterResource(this);
    this.PrepareResources();
  }

  /** Carbon Initialize (cpp:38-43): load the trail mesh. */
  @blue.method
  @meta.implemented
  Initialize()
  {
    this.InitializeGeometryResource();
    return true;
  }

  /**
   * Carbon InitializeGeometryResource (cpp:50-72): detach from the old mesh,
   * forget its declaration, request the new one and rebuild when it has loaded.
   *
   * The set is the resource's notify target (AddNotifyTarget), as in Carbon.
   */
  @blue.method
  @meta.implemented
  InitializeGeometryResource()
  {
    this.geometryResource?.RemoveNotifyTarget(this);
    this.Cleanup();

    this.geometryResource = this.geometryResPath
      ? be.resMan.GetResource(this.geometryResPath, { requirement: ResourceRequirement.GEOMETRY })
      : null;

    this.geometryResource?.AddNotifyTarget(this);
  }

  /** Carbon Cleanup (cpp:78-82): the declaration elements are no longer valid. */
  @blue.method
  @meta.implemented
  Cleanup()
  {
    this._trailVertexDeclElementCount = 0;
  }

  /** Sets the effect that draws the trails. */
  @blue.method
  @meta.implemented
  SetEffect(effect)
  {
    this.effect = effect ?? null;
  }

  /** Carbon SetMeshResPath (cpp:96-101): set the path and fire its notification by hand. */
  @blue.method
  @meta.implemented
  SetMeshResPath(path)
  {
    this.geometryResPath = String(path ?? "");
    this.OnModified("geometryResPath");
  }

  /**
   * Carbon RebuildCachedData (cpp:112-136): once the trail mesh has loaded,
   * its declaration gains the instance float4 (TEXCOORD1 on stream 1 at
   * offset 0, one step per instance) and is interned.
   *
   * Adapted: the decoded mesh keeps no declaration handle, so its elements
   * are read directly, as EveSpaceObjectDecal does.
   */
  @blue.method
  @meta.adapted
  RebuildCachedData(resource)
  {
    // Carbon's notify target is told only of a successful load.
    if (resource !== this.geometryResource || !resource?.IsGood() || !resource.GetMeshCount()) return;

    const elements = CarbonVertexElements(resource.GetMeshVertexElements(0));
    if (!elements.length) return;

    this._trailVertexDecl = [
      ...elements,
      { usage: Tr2VertexUsageCode.TEXCOORD, usageIndex: 1, type: "FLOAT32_4", offset: 0, stream: 1, instanceStepRate: 1 }
    ];
    this._vertexDeclHandle = Tr2EffectStateManager.getVertexDeclarationHandle(this._trailVertexDecl);
    this._trailVertexDeclElementCount = this._trailVertexDecl.length;
  }

  /** Carbon ReleaseCachedData (cpp:144-148). */
  @blue.method
  @meta.implemented
  ReleaseCachedData(_resource)
  {
    this.Cleanup();
  }

  /** Carbon OnModified (cpp:175-183): a new mesh path reloads. */
  @blue.method
  @meta.implemented
  OnModified(propertyName)
  {
    if (IsMatch(propertyName, "geometryResPath")) this.InitializeGeometryResource();
    return true;
  }

  /** Carbon Update (cpp:169-171): nothing; the motion lives on the booster renderables' splines. */
  @blue.method
  @meta.implemented
  Update(_time)
  {
  }

  /** Carbon Clear (cpp:177-184): drop the trails and the device half. */
  @blue.method
  @meta.implemented
  Clear()
  {
    this._trailData.length = 0;
    this.ReleaseResources(TriStorageFlags.TRISTORAGE_ALL);
  }

  /** Carbon Add (cpp:198-206): one trail at a booster's transform, with its size. */
  @blue.method
  @meta.implemented
  Add(localMatrix, size)
  {
    if (!localMatrix || localMatrix.length !== 16)
    {
      throw new TypeError("EveTrailsSet transforms must contain 16 values");
    }
    const data = new EveTrailsSetSingleTrailData();
    mat4.copy(data.transform, localMatrix);
    data.size = Number(size) || 0;
    this._trailData.push(data);
  }

  /**
   * Carbon ReleaseResources (cpp:213-217).
   *
   * Adapted: Tr2SuballocatedBuffer has no Free, so the allocation is dropped
   * rather than returned.
   */
  @blue.method
  @meta.adapted
  ReleaseResources(_storage)
  {
    this._instanceBuffer = null;
    this._vertexDeclHandle = Tr2EffectStateManager.Unknown;
  }

  /** Carbon OnPrepareResources (cpp:224-242): the declaration once the mesh is in, then the instances. */
  @blue.method
  @meta.implemented
  OnPrepareResources()
  {
    if (this._trailVertexDeclElementCount && this._vertexDeclHandle === Tr2EffectStateManager.Unknown)
    {
      this._vertexDeclHandle = Tr2EffectStateManager.getVertexDeclarationHandle(this._trailVertexDecl);
      if (this._vertexDeclHandle === Tr2EffectStateManager.Unknown) return false;
    }
    this.InitializeInstanceBuffer();
    return true;
  }

  /**
   * Carbon InitializeInstanceBuffer (cpp:249-272): each trail's position
   * (_41, _42, _43 of its transform) and size as one float4.
   */
  @blue.method
  @meta.implemented
  InitializeInstanceBuffer()
  {
    this._instanceBuffer = null;
    if (!this._trailData.length) return;

    const vertices = new Float32Array(this._trailData.length * 4);
    this._trailData.forEach((trail, i) =>
    {
      vertices.set([ trail.transform[12], trail.transform[13], trail.transform[14], trail.size ], i * 4);
    });

    const renderContext = Tr2RenderContext_GetMainThreadRenderContext();
    this._instanceBuffer = SharedGeometryBuffer(renderContext).Allocate(INSTANCE_VERTEX_SIZE, this._trailData.length, vertices, renderContext);
  }

  /**
   * Carbon GetBatches (cpp:280-331): the trail mesh's first LOD, instanced once
   * per booster, with the booster renderable's per-object data.
   *
   * Adapted: a decoded mesh makes its LOD allocations on first draw, as
   * Tr2MeshBase.CreateGeometryBatch does, where Carbon's are made when the
   * resource prepares; and its LOD primitive count is the sum over its areas,
   * which is what Carbon's m_primitiveCount holds.
   *
   * @param {object} accumulator The batches.
   * @param {object} perObjectData The booster renderable's per-object data.
   */
  @blue.method
  @meta.adapted
  GetBatches(accumulator, perObjectData)
  {
    if (!this.display) return;
    // Ask both before combining, so neither is left unrenewed while the other
    // loads. A pending geometry re-registers this set, because the resource
    // released it when it last completed; a failed one is not, or it would
    // call back every frame.
    const geometry = this.geometryResource;
    const geometryGood = geometry ? geometry.IsGood() : false;
    if (geometry && !geometryGood && !geometry.IsFailed()) geometry.AddNotifyTarget(this);
    const effectGood = this.effect ? this.effect.IsGood() : false;
    if (!geometryGood || !effectGood) return;
    if (!this._instanceBuffer) return;
    if (this._vertexDeclHandle === Tr2EffectStateManager.Unknown) return;
    if (!this.geometryResource.GetMeshCount()) return;

    const lod = this.geometryResource.GetMeshLod__LodIndex(0, 0);
    if (!lod) return;
    if (!lod.allocationsValid && !CreateLodAllocations(this.geometryResource, 0, lod, Tr2RenderContext_GetMainThreadRenderContext())) return;

    const vertices = lod.vertexAllocation;
    const instances = this._instanceBuffer;
    const batch = new Tr2RenderBatch();
    batch.SetMaterial(this.effect);
    batch.SetPerObjectData(perObjectData);
    batch.SetGeometry__AllocationSecondStream(this._vertexDeclHandle, vertices, instances, lod.indexAllocation);
    batch.SetDrawIndexedInstanced(
      TriGeometryRes.getPrimitiveCount(lod, 0, lod.areas?.length ?? 0) * 3,
      this._trailData.length,
      lod.indexAllocation.GetStartIndex(),
      vertices.GetOffset() / vertices.GetStride(),
      instances.GetOffset() / instances.GetStride());
    accumulator.Commit(batch);
  }

  /** The authored rate at which a trail fades out behind its booster. */
  @blue.method
  @meta.implemented
  GetFadeSpeed()
  {
    return this.fadeSpeed;
  }

  /**
   * Binds a resolved trail geometry resource directly, rebuilding when it has
   * loaded; for hosts that resolve the mesh themselves.
   */
  SetGeometryResource(resource)
  {
    if (this.geometryResource === resource) return;
    this.geometryResource?.RemoveNotifyTarget(this);
    this.Cleanup();
    this.geometryResource = resource ?? null;
    this.geometryResource?.AddNotifyTarget(this);
  }

  /** The trail placements as copies, for diagnostics. */
  GetTrailData()
  {
    return this._trailData.map(trail => ({ transform: mat4.clone(trail.transform), size: trail.size }));
  }

  /** Carbon EveTrailsSet::SingleTrailData (private, EveTrailsSet.h:88-94). */
  static SingleTrailData = EveTrailsSetSingleTrailData;

}
