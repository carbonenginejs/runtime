// Source: trinity/trinity/Eve/SpaceObject/Attachments/EveTrailsSet.h
// Source: trinity/trinity/Eve/SpaceObject/Attachments/EveTrailsSet.cpp
import { mat4 } from "#math/mat4";
import { CjsModel } from "#model";
import { blue } from "#blue";
import { ResourceRequirement } from "#resource";
import { TriStorageFlags } from "#consts/graphics";
import { carbon, edit, impl, type } from "#schema";
import { Tr2Renderer } from "../../../core/Tr2Renderer.js";
import { Tr2RenderBatch } from "../../../core/batch/TriRenderBatch/index.js";
import { Tr2RenderContext_GetMainThreadRenderContext } from "../../../core/context/Tr2RenderContext.js";
import { TriDevice } from "../../../core/device/TriDevice.js";
import { CreateLodAllocations, SharedGeometryBuffer } from "../../../core/mesh/TriGeometryResAllocations.js";
import { CarbonVertexElements } from "../../../core/vertex/vertexUsage.js";
import { Tr2VertexUsageCode } from "../../../core/vertex/usageCode.js";
import { Tr2EffectStateManager } from "../../../shader/Tr2EffectStateManager.js";
import { TriGeometryRes } from "#resource/geometry";

/** sizeof( InstanceVertex ): the booster's position and size as one float4. */
const INSTANCE_VERTEX_SIZE = 16;

/**
 * A booster set's trails: one trail mesh drawn once per booster, instanced,
 * its shape bent along each booster renderable's spline in the vertex shader.
 */
@type.define({ className: "EveTrailsSet", family: "eve/attachment/boosters" })
export class EveTrailsSet extends CjsModel
{

  /** m_geometryResource (TriGeometryResPtr) [READ] */
  @edit.read
  @type.objectRef("TriGeometryRes")
  geometryResource = null;

  /** m_fadeSpeed (float) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.float32
  fadeSpeed = 1;

  /** m_effect (Tr2EffectPtr) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.objectRef("Tr2Effect")
  effect = null;

  /** m_geometryResPath (std::string) [READWRITE, PERSIST, NOTIFY] */
  @edit.notify
  @edit.readwrite
  @edit.persist
  @type.string
  geometryResPath = "";

  /** m_display (bool) [READWRITE] */
  @edit.readwrite
  @type.boolean
  display = true;

  /** m_trailData: { transform, size } per booster. */
  _trailData = [];

  /** m_trailVertexDecl: the trail mesh's elements plus the instance float4. */
  _trailVertexDecl = [];

  /** m_trailVertexDeclElementCount: zero until the mesh has loaded. */
  _trailVertexDeclElementCount = 0;

  /** m_vertexDeclHandle */
  _vertexDeclHandle = Tr2EffectStateManager.Unknown;

  /** m_instanceBuffer: a shared-buffer allocation, null until built. */
  _instanceBuffer = null;

  _revision = 0;

  /** Carbon's constructor (cpp:13-20): a Tr2DeviceResource, prepared now and whenever the device can. */
  constructor()
  {
    super();
    TriDevice.RegisterResource(this);
    this.PrepareResources();
  }

  /** Carbon Initialize (cpp:38-43): load the trail mesh. */
  @carbon.method
  @impl.implemented
  Initialize()
  {
    this.InitializeGeometryResource();
    return true;
  }

  /**
   * Carbon InitializeGeometryResource (cpp:50-72): detach from the old mesh,
   * forget its declaration, request the new one and rebuild when it has loaded.
   *
   * Adapted: Carbon's IBlueAsyncResNotifyTarget becomes the resource's own
   * completion event, as Tr2Mesh does.
   */
  @carbon.method
  @impl.adapted
  InitializeGeometryResource()
  {
    this.geometryResource?.OffEvent("completed", this._geometryCompleted, this);
    this.Cleanup();

    this.geometryResource = this.geometryResPath
      ? blue.resMan.GetResource(this.geometryResPath, { requirement: ResourceRequirement.GEOMETRY })
      : null;

    this.geometryResource?.OnCompleted(this._geometryCompleted, this);
    this._revision++;
  }

  /** Bound to this set so the resource can be unsubscribed by identity. */
  _geometryCompleted = (_event, resource) => this.RebuildCachedData(resource ?? this.geometryResource);

  /** Carbon Cleanup (cpp:78-82): the declaration elements are no longer valid. */
  @carbon.method
  @impl.implemented
  Cleanup()
  {
    this._trailVertexDeclElementCount = 0;
  }

  /** Sets the effect that draws the trails. */
  @carbon.method
  @impl.implemented
  SetEffect(effect)
  {
    this.effect = effect ?? null;
  }

  /** Carbon SetMeshResPath (cpp:96-101): set the path and fire its notification by hand. */
  @carbon.method
  @impl.implemented
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
  @carbon.method
  @impl.adapted
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
    this._revision++;
  }

  /** Carbon ReleaseCachedData (cpp:144-148). */
  @carbon.method
  @impl.implemented
  ReleaseCachedData(_resource)
  {
    this.Cleanup();
  }

  /** Carbon OnModified (cpp:154-163): a new mesh path reloads. */
  @carbon.method
  @impl.adapted
  OnModified(propertyName)
  {
    if (propertyName === "geometryResPath") this.InitializeGeometryResource();
    return true;
  }

  /** Carbon Update (cpp:169-171): nothing; the motion lives on the booster renderables' splines. */
  @carbon.method
  @impl.implemented
  Update(_time)
  {
  }

  /** Carbon Clear (cpp:177-184): drop the trails and the device half. */
  @carbon.method
  @impl.implemented
  Clear()
  {
    this._trailData.length = 0;
    this.ReleaseResources(TriStorageFlags.TRISTORAGE_ALL);
    this._revision++;
  }

  /** Carbon Add (cpp:198-206): one trail at a booster's transform, with its size. */
  @carbon.method
  @impl.implemented
  Add(localMatrix, size)
  {
    if (!localMatrix || localMatrix.length !== 16)
    {
      throw new TypeError("EveTrailsSet transforms must contain 16 values");
    }
    this._trailData.push({ transform: mat4.clone(localMatrix), size: Number(size) || 0 });
    this._revision++;
  }

  /**
   * Carbon ReleaseResources (cpp:213-217).
   *
   * Adapted: Tr2SuballocatedBuffer has no Free, so the allocation is dropped
   * rather than returned.
   */
  @carbon.method
  @impl.adapted
  ReleaseResources(_storage)
  {
    this._instanceBuffer = null;
    this._vertexDeclHandle = Tr2EffectStateManager.Unknown;
  }

  /** Carbon Tr2DeviceResource::PrepareResources: creation only when the device allows it. */
  @carbon.method
  @impl.implemented
  PrepareResources()
  {
    return Tr2Renderer.IsResourceCreationAllowed() ? this.OnPrepareResources() : true;
  }

  /** Carbon OnPrepareResources (cpp:224-242): the declaration once the mesh is in, then the instances. */
  @carbon.method
  @impl.implemented
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
  @carbon.method
  @impl.implemented
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
  @carbon.method
  @impl.adapted
  GetBatches(accumulator, perObjectData)
  {
    if (!this.display) return;
    if (!this.geometryResource || !this.geometryResource.IsGood()) return;
    if (!this._instanceBuffer) return;
    if (this._vertexDeclHandle === Tr2EffectStateManager.Unknown) return;
    if (!this.geometryResource.GetMeshCount()) return;

    const lod = this.geometryResource.GetMeshLodByIndex(0, 0);
    if (!lod) return;
    if (!lod.allocationsValid && !CreateLodAllocations(this.geometryResource, 0, lod, Tr2RenderContext_GetMainThreadRenderContext())) return;

    const vertices = lod.vertexAllocation;
    const instances = this._instanceBuffer;
    const batch = new Tr2RenderBatch();
    batch.SetMaterial(this.effect);
    batch.SetPerObjectData(perObjectData);
    batch.SetGeometryFromAllocations2(this._vertexDeclHandle, vertices, instances, lod.indexAllocation);
    batch.SetDrawIndexedInstanced(
      TriGeometryRes.getPrimitiveCount(lod, 0, lod.areas?.length ?? 0) * 3,
      this._trailData.length,
      lod.indexAllocation.GetStartIndex(),
      vertices.GetOffset() / vertices.GetStride(),
      instances.GetOffset() / instances.GetStride());
    accumulator.Commit(batch);
  }

  /** The authored rate at which a trail fades out behind its booster. */
  @carbon.method
  @impl.implemented
  GetFadeSpeed()
  {
    return this.fadeSpeed;
  }

  /**
   * Binds a resolved trail geometry resource directly, rebuilding when it has
   * loaded; for hosts that resolve the mesh themselves.
   */
  @impl.custom
  SetGeometryResource(resource)
  {
    if (this.geometryResource === resource) return;
    this.geometryResource?.OffEvent("completed", this._geometryCompleted, this);
    this.Cleanup();
    this.geometryResource = resource ?? null;
    this.geometryResource?.OnCompleted(this._geometryCompleted, this);
    this._revision++;
  }

  /** The trail placements as copies, for diagnostics. */
  @impl.custom
  GetTrailData()
  {
    return this._trailData.map(trail => ({ transform: mat4.clone(trail.transform), size: trail.size }));
  }

  /** A counter bumped whenever the placements, mesh or declaration change. */
  @impl.custom
  GetRevision()
  {
    return this._revision;
  }

}
