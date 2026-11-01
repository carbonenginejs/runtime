import { BlueAsyncRes } from "#blue";
import { exposure as be } from "#be";
// Source: trinity/trinity/Eve/SpaceObject/Attachments/EveTrailsSet.h
// Source: trinity/trinity/Eve/SpaceObject/Attachments/EveTrailsSet.cpp
import { IInitialize } from "../../../../blue/blueexposure/IInitialize.js";
import { Tr2DeviceResource } from "../../../core/device/Tr2DeviceResource.js";
import { mat4 } from "#math/mat4";
import { IsMatch, blue } from "#blue";
import { TriStorageFlags } from "#consts/graphics";
import { INotify } from "#blue";
import { meta, type } from "#schema";
import { Tr2RenderBatch } from "../../../core/batch/TriRenderBatch/index.js";
import { Tr2RenderContext_GetMainThreadRenderContext } from "../../../core/context/Tr2RenderContext.js";
import { CreateLodAllocations, SharedGeometryBuffer } from "../../../core/mesh/TriGeometryResAllocations.js";
import { CarbonVertexElements } from "../../../core/vertex/vertexUsage.js";
import { Tr2VertexUsageCode } from "../../../core/vertex/usageCode.js";
import { Tr2EffectStateManager } from "../../../shader/Tr2EffectStateManager.js";
import { TriGeometryRes } from "#trinity/resources/geometry";
import { EveTrailsSetSingleTrailData } from "./EveTrailsSetSingleTrailData.js";
import { trinity } from "../../../CjsTrinity.js";

/** sizeof( InstanceVertex ): the booster's position and size as one float4. */
const INSTANCE_VERTEX_SIZE = 16;

/**
 * A booster set's trails: one trail mesh drawn once per booster, instanced,
 * its shape bent along each booster renderable's spline in the vertex shader.
 */
@be.define("EveTrailsSet")
@be.inherit(IInitialize, INotify, Tr2DeviceResource)
@be.mapInterface(INotify)
@be.mapInterface(IInitialize)
export class EveTrailsSet
{

  /** m_geometryResource (TriGeometryResPtr) [READ] */
  @be.mapAttribute(be.READ)
  @type.object.ref("TriGeometryRes")
  geometryResource = null;

  /** m_fadeSpeed (float) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  fadeSpeed = 1;

  /** m_effect (Tr2EffectPtr) [READWRITE, PERSIST] */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.object.ref("Tr2Effect")
  effect = null;

  /** m_geometryResPath (std::string) [READWRITE, PERSIST, NOTIFY] */
  @be.mapAttribute(be.READWRITE | be.PERSIST | be.NOTIFY)


  @type.path("TriGeometryRes")
  geometryResPath = "";

  /** m_display (bool) [READWRITE] */
  @be.mapAttribute(be.READWRITE)
  @type.boolean
  display = true;

  /**
   * m_trailData (h:121): one record per booster with a trail. Carbon does not
   * map it; it persists here so values carry which boosters have trails.
   */
  @meta.persistOnly
  @type.list("EveTrailsSet::SingleTrailData")
  _trailData = [];

  /** m_trailVertexDecl: the trail mesh's elements plus the instance float4. */
  _trailVertexDecl = [];

  /** m_trailVertexDeclElementCount: zero until the mesh has loaded. */
  _trailVertexDeclElementCount = 0;

  /** m_vertexDeclHandle */
  _vertexDeclHandle = Tr2EffectStateManager.Unknown;

  /** m_instanceBuffer: a shared-buffer allocation, null until built. */
  _instanceBuffer = null;

  /**
   * Carbon Initialize (cpp:38-43): load the trail mesh.
   *
   * @implemented
   */

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
   *
   * @implemented
   */

  InitializeGeometryResource()
  {
    this.geometryResource?.RemoveNotifyTarget(this);
    this.Cleanup();

    this.geometryResource = this.geometryResPath
      ? blue.resMan.GetResource(this.geometryResPath)
      : null;

    this.geometryResource?.AddNotifyTarget(this);
  }

  /**
   * Carbon Cleanup (cpp:78-82): the declaration elements are no longer valid.
   *
   * @implemented
   */

  Cleanup()
  {
    this._trailVertexDeclElementCount = 0;
  }

  /**
   * Sets the effect that draws the trails.
   *
   * @implemented
   */

  SetEffect(effect)
  {
    this.effect = effect ?? null;
  }

  /**
   * Carbon SetMeshResPath (cpp:96-101): set the path and fire its notification by hand.
   *
   * @implemented
   */

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
   * @adapted the decoded mesh keeps no declaration handle, so its elements
   *   are read directly, as EveSpaceObjectDecal does.
   */

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

  /**
   * Carbon ReleaseCachedData (cpp:144-148).
   *
   * @implemented
   */

  ReleaseCachedData(_resource)
  {
    this.Cleanup();
  }

  /**
   * Carbon OnModified (cpp:175-183): a new mesh path reloads.
   *
   * @implemented
   */

  OnModified(propertyName)
  {
    if (IsMatch(propertyName, "geometryResPath")) this.InitializeGeometryResource();
    return true;
  }

  /**
   * Carbon Update (cpp:169-171): nothing; the motion lives on the booster renderables' splines.
   *
   * @implemented
   */

  Update(_time)
  {
  }

  /**
   * Carbon Clear (cpp:177-184): drop the trails and the device half.
   *
   * @implemented
   */

  Clear()
  {
    this._trailData.length = 0;
    this.ReleaseResources(TriStorageFlags.TRISTORAGE_ALL);
  }

  /**
   * Carbon Add (cpp:198-206): one trail at a booster's transform, with its size.
   *
   * @implemented
   */

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
   * @adapted Tr2SuballocatedBuffer has no Free, so the allocation is dropped
   *   rather than returned.
   */

  ReleaseResources(_storage)
  {
    this._instanceBuffer = null;
    this._vertexDeclHandle = Tr2EffectStateManager.Unknown;
  }

  /**
   * Carbon OnPrepareResources (cpp:224-242): the declaration once the mesh is in, then the instances.
   *
   * Carbon's constructor registers with the device and prepares (cpp:13-20). Here
   * the set has no constructor: it registers and prepares on its first use (IsGood
   * at its use site), so a build that fails or is never drawn holds no device
   * objects (docs internal/decisions/device-resource-registration.md, Revised lifecycle § 2).
   *
   * @implemented
   */

  _OnPrepareResources()
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
   *
   * @implemented
   */

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
   * @adapted a decoded mesh makes its LOD allocations on first draw, as
   *   Tr2MeshBase.CreateGeometryBatch does, where Carbon's are made when the
   *   resource prepares; and its LOD primitive count is the sum over its areas,
   *   which is what Carbon's m_primitiveCount holds.
   * @param {object} accumulator The batches.
   * @param {object} perObjectData The booster renderable's per-object data.
   */

  GetBatches(accumulator, perObjectData)
  {
    if (!this.display) return;
    // Ask both before combining, so neither is left unrenewed while the other
    // loads. A pending geometry re-registers this set, because the resource
    // released it when it last completed; a failed one is not, or it would
    // call back every frame.
    const geometry = this.geometryResource;
    const geometryGood = geometry ? geometry.IsGood() : false;

    const effectGood = this.effect ? this.effect.IsGood() : false;
    // Registers with trinity on first use and renews it (Tr2DeviceResource.IsGood). Asked with the others, before the instance buffer preparing builds.
    const good = this.IsGood();
    if (!geometryGood || !effectGood || !good) return;
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

  /**
   * The authored rate at which a trail fades out behind its booster.
   *
   * @implemented
   */

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


  /**
   * Carbon destructor (EveTrailsSet.cpp:31-37): detach and discard cached declaration data.
   *
   * @adapted
   */
  Destruct()
  {
    this.Cleanup();
    if (this.geometryResource) this.geometryResource.RemoveNotifyTarget(this);
    this.geometryResource = null;
    BlueAsyncRes.markNotifyTargetDestructed(this);
  }
}
