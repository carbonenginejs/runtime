import { IsMatch } from "#blue";
import { IListNotify } from "../../../global/blue/IListNotify.js";
import { IInitialize } from "../../../global/blue/IInitialize.js";
import { EveEntity } from "../EveEntity.js";
import { INotify } from "../../../global/blue/INotify.js";
import { IEveSpaceObjectChild } from "./IEveSpaceObjectChild.js";
import { EveSpaceObjectChild } from "./EveSpaceObjectChild.js";
// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildBehaviorSystem.h
// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildBehaviorSystem.cpp
import { meta } from "#schema";
import { vec3 } from "#math/vec3";
import { quat } from "#math/quat";
import { EveChildTransform } from "./EveChildTransform.js";
import { TriBatchType } from "#consts/graphics";
import { mat4 } from "#math/mat4";
import {
  createChildPerObjectRecords
} from "../perObjectData/childPerObjectRecords.js";
import { Tr2BufferAL } from "../../../trinityal/Tr2BufferAL/Tr2BufferAL.js";
import { Tr2BufferDescriptionAL } from "../../../trinityal/Tr2BufferAL/Tr2BufferDescriptionAL.js";
import { Failed } from "../../../trinityal/ALResult.js";
import { Tr2CpuUsage, Tr2GpuUsage } from "#consts/render-context";
import { Tr2RenderContext_GetMainThreadRenderContext } from "../../core/context/Tr2RenderContext.js";
import { Tr2Renderer } from "../../core/Tr2Renderer.js";
import { TriDevice } from "../../core/device/TriDevice.js";
import { Tr2RenderBatch } from "../../core/batch/TriRenderBatch/index.js";
import { CreateLodAllocations } from "../../core/mesh/TriGeometryResAllocations.js";
import { ITr2Renderable } from "../../core/ITr2Renderable.js";

/**
 * A child that drives behaviour groups - swarms, drones and the like - from its
 * own placement under the hull.
 */
@meta.define({ className: "EveChildBehaviorSystem", family: "eve/child" })
@meta.blue.inherit(ITr2Renderable)
@meta.blue.inherit(INotify, IInitialize, IListNotify)
export class EveChildBehaviorSystem extends EveChildTransform
{

  /** m_rotation (Quaternion) [READWRITE, PERSIST] - EveChildBehaviorSystem_Blue.cpp:18 */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.quat
  rotation = quat.create();

  /** m_translation (Vector3) [READWRITE, PERSIST] - EveChildBehaviorSystem_Blue.cpp:19 */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec3
  translation = vec3.create();

  /** m_scaling (Vector3) [READWRITE, PERSIST] - EveChildBehaviorSystem_Blue.cpp:20 */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec3
  scaling = vec3.fromValues(1, 1, 1);

  /** m_splineTunnels (PSplineTunnelGroupVector) [READ, PERSIST, NOTIFY] */
  @meta.blue.notify
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("SplineTunnelGroup")
  splineTunnels = [];

  /** m_behaviorGroups (PBehaviorGroupVector) [READ, PERSIST] */
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("BehaviorGroup")
  behaviorGroups = [];

  /** m_instanceCount (unsigned) [READ] */
  @meta.blue.read
  @meta.type.uint32
  instanceCount = 1;

  /** m_display (bool) [READWRITE, PERSIST, NOTIFY] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.boolean
  display = true;

  // System-wide flattened tunnel registry with reassigned IDs (Carbon m_tunnels).
  _tunnels = [];

  // Base-instance offsets per group (Carbon m_startInstanceValues).
  _startInstanceValues = [];

  // Carbon m_hasUpdated: until an update ran, the object cannot be rendered.
  _hasUpdated = false;

  /** m_vsData / m_psData - this system PERSISTENT per-object record pair. */
  _perObjectData = createChildPerObjectRecords();

  static _inverseScratch = mat4.create();

  // Carbon m_behaviorGroupLoaded/m_behaviorGroupLoadedForTunnel: one-shot
  // wiring flags for the callback pass-ins.
  _behaviorGroupLoaded = false;

  _behaviorGroupLoadedForTunnel = false;

  /** Carbon instance streams: six float4 rows per ship, three per booster. */
  _shipInstanceBuffer = new Tr2BufferAL();

  _boosterInstanceBuffer = new Tr2BufferAL();

  _shipStride = 96;

  _boosterStride = 48;

  /** Registers the inherited native device-resource lifetime. */
  constructor()
  {
    super();
    // Carbon's constructor memsets these records; child-mesh defaults differ.
    this._perObjectData.vs.Zero();
    this._perObjectData.ps.Zero();
    TriDevice.RegisterResource(this);
    this.PrepareResources();
  }

  /** Explicit final ownership release replaces Carbon's member destructors. */
  @meta.ours
  Destroy()
  {
    this._shipInstanceBuffer.Destroy();
    this._boosterInstanceBuffer.Destroy();
    for (const group of this.behaviorGroups) group.SetVertexFunctionReferance(null);
    TriDevice.UnregisterResource(this);
  }

  /** Carbon's device-release override is empty (EveChildBehaviorSystem.h). */
  @meta.blue.method
  @meta.noop
  ReleaseResources()
  {
  }

  /** Carbon Tr2DeviceResource::PrepareResources resource-creation guard. */
  @meta.blue.method
  @meta.implemented
  PrepareResources()
  {
    return !Tr2Renderer.IsResourceCreationAllowed() || this.OnPrepareResources();
  }

  /** Replaces the two native AL values, then allocates their current count. */
  @meta.blue.method
  @meta.adapted
  OnPrepareResources()
  {
    this._shipInstanceBuffer.Destroy();
    this._boosterInstanceBuffer.Destroy();
    this.ChangeBufferInstanceCount();
    return this._shipInstanceBuffer.IsValid() && this._boosterInstanceBuffer.IsValid();
  }

  /** Carbon EveChildBehaviorSystem::Initialize (cpp:67-77). */
  @meta.blue.method
  @meta.implemented
  Initialize()
  {
    if (this.staticTransform)
    {
      this.RebuildLocalTransform();
    }

    this.ChangeBufferInstanceCount();

    return true;
  }

  /** Carbon EveChildBehaviorSystem::OnModified (cpp:79-86); the value
   * argument follows the repo's OnModified duck (field name or field value). */
  @meta.blue.method
  @meta.adapted
  @meta.reason("Component-registry re-registration is limited to an optional duck-typed call, matching the repo's registry seam.")
  OnModified(value = null)
  {
    if (IsMatch(value, "display"))
    {
      this.ReRegister?.();
    }
    return true;
  }

  /**
   * Hands every behavior group its buffer-resize callback and regenerates its
   * agents (Carbon PassInVertexesToBehaviorGroups, cpp:233-242). Carbon also
   * runs this from the Blue list notify; the JS port runs it from the first
   * UpdateSyncronous, matching Carbon's deferred-initialization comment.
   */
  @meta.blue.method
  @meta.implemented
  PassInVertexesToBehaviorGroups()
  {
    for (const group of this.behaviorGroups)
    {
      group?.SetVertexFunctionReferance?.(() => this.ChangeBufferInstanceCount());
      group?.InitializeGeometryResource?.();
    }
    this._behaviorGroupLoaded = true;
  }

  /**
   * Hands every spline tunnel group the system tunnel-registry callback
   * (Carbon PassInTunnelFunctionsToBehaviorGroups, cpp:246-254).
   */
  @meta.blue.method
  @meta.implemented
  PassInTunnelFunctionsToBehaviorGroups()
  {
    for (const group of this.splineTunnels)
    {
      group?.SetSystemTunnelFunctionReferenceAndColor?.(() => this.UpdateTunnelRegistry(), 0xffffff00);
    }
    this._behaviorGroupLoadedForTunnel = true;
  }

  /**
   * Sync-side frame update (Carbon UpdateSyncronous, cpp:258-283): late
   * callback wiring, per-group vertex-declaration refresh,
   * group sync updates, then the agent simulation step.
   * @param {Object} updateContext - frame context (EveUpdateContext)
   * @param {Object} params - EveChildUpdateParams
   */
  @meta.blue.method
  @meta.implemented
  UpdateSyncronous(updateContext, params)
  {
    // might be a better way to get these initialized but IInitialize doesn't
    // work since these need to be called after children are initialized
    if (!this._behaviorGroupLoaded)
    {
      this.PassInVertexesToBehaviorGroups();
    }
    if (!this._behaviorGroupLoadedForTunnel)
    {
      this.PassInTunnelFunctionsToBehaviorGroups();
    }

    for (const group of this.behaviorGroups)
    {
      group?.CreateVertexDeclaration?.();
    }

    for (const group of this.behaviorGroups)
    {
      group?.UpdateSyncronous(updateContext, params);
    }

    const deltaTime = Number(updateContext?.GetDeltaT?.() ?? updateContext?.deltaT ?? 0) || 0;
    this._UpdateAgents(deltaTime);
  }

  /**
   * Per-frame async update (Carbon UpdateAsyncronous, cpp:582-616): rebuild
   * the world transform from the parent, refresh the persistent VS/PS records,
   * then fan out to the groups.
   * @param {Object} updateContext - frame context (EveUpdateContext)
   * @param {Object} params - EveChildUpdateParams (localToWorldTransform)
   */
  @meta.blue.method
  @meta.adapted
  UpdateAsyncronous(updateContext, params)
  {
    // Carbon chooses the immediate child parent first. Only a direct hull
    // parent supplies inherited per-object values as well as placement.
    const parent = params.childParent ?? params.spaceObjectParent;
    const parentTransform = parent ? parent.GetLocalToWorldTransform() : params.localToWorldTransform;
    if (!params.childParent && params.spaceObjectParent)
    {
      // Carbon copies the hull records only for a direct space-object parent;
      // unlike EveChildMesh it does not rebase clip data by child translation.
      params.spaceObjectParent.GetPerObjectStructs(this._perObjectData.vs, this._perObjectData.ps);
    }

    // cpp:599: the OUTGOING transform becomes worldTransformLast, before the
    // new one is built.
    this._perObjectData.vs.SetAndTranspose("worldTransformLast", this.worldTransform);
    this._perObjectData.ps.SetAndTranspose("worldTransformLast", this.worldTransform);

    if (parentTransform && parentTransform.length === 16)
    {
      this.UpdateTransform(parentTransform);
    }

    this._perObjectData.vs.SetAndTranspose("worldTransform", this.worldTransform);
    this._perObjectData.ps.SetAndTranspose("worldTransform", this.worldTransform);

    // CARBON QUIRK (cpp:604), reproduced deliberately. Every other filler of
    // this field inverts the ALREADY-TRANSPOSED matrix - EveChildMesh.cpp:949,
    // EveChildContainer.cpp:584, EveSpaceObject2.cpp:638 - which yields
    // Transpose(Inverse(W)). This class inverts the LOGICAL matrix instead and
    // stores Inverse(W) untransposed, the transpose of what the shader reads
    // everywhere else. It is invisible for a rotation-free placement and wrong
    // under a rotated one. Pre-transposing here cancels against the encoding
    // transpose, so the stored bytes match Carbon's exactly. Reported upstream;
    // do not "fix" it without a Carbon-side decision, because art and DNA were
    // authored against the shipped behaviour.
    const inverse = EveChildBehaviorSystem._inverseScratch;
    if (!mat4.invert(inverse, this.worldTransform))
    {
      mat4.identity(inverse);
    }
    mat4.transpose(inverse, inverse);
    this._perObjectData.vs.SetAndTranspose("invWorldTransform", inverse);

    // Carbon copies these stored matrices into PS unchanged. Encoding the same
    // logical inputs once preserves that; feeding GetTransposed back into the
    // encoder would transpose them a second time.
    this._perObjectData.ps.SetAndTranspose("invWorldTransform", inverse);

    for (const group of this.behaviorGroups)
    {
      group?.UpdateAsyncronous(updateContext);
    }

    this._hasUpdated = true;
    return this.worldTransform;
  }

  /** Carbon EveChildBehaviorSystem::UpdateVisibility (cpp:655-666). */
  @meta.blue.method
  @meta.implemented
  UpdateVisibility(updateContext, _parentTransform = null, _parentLod = null)
  {
    if (!this.display)
    {
      return;
    }

    for (const group of this.behaviorGroups)
    {
      group?.UpdateVisibility(updateContext, this.worldTransform);
    }
  }

  /**
   * Publishes the updated system, fills both AL streams, then its PlayFX
   * renderables (Carbon GetRenderables). Mapping remains on the render thread.
   */
  @meta.blue.method
  @meta.implemented
  GetRenderables(renderables = [])
  {
    if (!this.display || !this._hasUpdated)
    {
      return renderables;
    }

    if (!this._behaviorGroupLoaded)
    {
      return renderables;
    }

    renderables.push(this);

    this.UpdateBuffer(Tr2RenderContext_GetMainThreadRenderContext());

    for (const group of this.behaviorGroups)
    {
      group?.GetRenderables(renderables);
    }
    return renderables;
  }

  /** Carbon returns true without writing the sphere (cpp:668-671). */
  @meta.blue.method
  @meta.implemented
  GetBoundingSphere(_sphere = null, _query = 0)
  {
    return true;
  }

  /** Carbon's body is empty (cpp:678-680). */
  @meta.blue.method
  @meta.noop
  GetLocalToWorldTransform(_transform = null)
  {
  }

  /** Carbon's body is empty (cpp:682-684). */
  @meta.blue.method
  @meta.noop
  ChangeLOD(_lod)
  {
  }

  /** Forwards to the base transform setup (cpp:623-626). */
  @meta.blue.method
  @meta.implemented
  Setup(scale = null, rotation = null, translation = null, lowestLodVisible = null)
  {
    return super.Setup(scale, rotation, translation, lowestLodVisible);
  }

  /** Carbon EveChildBehaviorSystem::RegisterComponents (cpp:686-700). */
  @meta.blue.method
  @meta.adapted
  @meta.reason("Carbon multiple-inherits EveEntity per concrete child; the JS port hoists it to the child root instead, so this class INHERITS GetComponentRegistry rather than probing for it.")
  RegisterComponents()
  {
    if (!this.display)
    {
      return;
    }

    const registry = this.GetComponentRegistry() ?? null;
    if (!registry)
    {
      return;
    }
    for (const group of this.behaviorGroups)
    {
      group?.Register(registry);
    }
  }

  /** Carbon EveChildBehaviorSystem::UnRegisterComponents (cpp:702-711). */
  @meta.blue.method
  @meta.adapted
  @meta.reason("Carbon multiple-inherits EveEntity; the JS class reaches the registry through the optional GetComponentRegistry duck.")
  UnRegisterComponents()
  {
    const registry = this.GetComponentRegistry?.() ?? null;
    if (!registry)
    {
      return;
    }
    for (const group of this.behaviorGroups)
    {
      group?.UnRegister(registry);
    }
  }

  /** Carbon EveChildBehaviorSystem::RegisterWithQuadRenderer (cpp:713-719). */
  @meta.blue.method
  @meta.implemented
  RegisterWithQuadRenderer(quadRenderer)
  {
    for (const group of this.behaviorGroups)
    {
      group?.RegisterWithQuadRenderer?.(quadRenderer);
    }
  }

  /** Carbon EveChildBehaviorSystem::AddQuadsToQuadRenderer (cpp:721-732). */
  @meta.blue.method
  @meta.implemented
  AddQuadsToQuadRenderer(frustum, quadRenderer)
  {
    if (!this.display)
    {
      return;
    }

    for (const group of this.behaviorGroups)
    {
      group?.AddQuadsToQuadRenderer?.(frustum, quadRenderer);
    }
  }

  /** Carbon EveChildBehaviorSystem::GetWorldTransform (cpp:734-737). */
  @meta.blue.method
  @meta.implemented
  GetWorldTransform()
  {
    return this.worldTransform;
  }

  /**
   * Allocates the ship and booster streams after agent-count changes (Carbon
   * ChangeBufferInstanceCount). AL descriptions replace the native overload.
   * Before device creation the requested count is retained for prepare.
   */
  @meta.blue.method
  @meta.adapted
  ChangeBufferInstanceCount()
  {
    let count = 0;
    for (const group of this.behaviorGroups) count += group.GetSize();
    this.instanceCount = Math.max(1, count);
    if (!Tr2Renderer.IsResourceCreationAllowed()) return;
    const context = Tr2RenderContext_GetMainThreadRenderContext();
    if (Failed(this._shipInstanceBuffer.Create(Tr2BufferDescriptionAL.FromStride(
      this._shipStride, this.instanceCount, Tr2GpuUsage.VERTEX_BUFFER, Tr2CpuUsage.WRITE_OFTEN
    ), null, context))) return;
    this._boosterInstanceBuffer.Create(Tr2BufferDescriptionAL.FromStride(
      this._boosterStride, this.instanceCount, Tr2GpuUsage.VERTEX_BUFFER, Tr2CpuUsage.WRITE_OFTEN
    ), null, context);
  }

  /** Carbon EveChildBehaviorSystem::GetTunnels (cpp:498-501). */
  @meta.blue.method
  @meta.implemented
  GetTunnels()
  {
    return this._tunnels;
  }

  /** Carbon EveChildBehaviorSystem::GetSplineTunnels (cpp:503-506). */
  @meta.blue.method
  @meta.implemented
  GetSplineTunnels()
  {
    return this.splineTunnels;
  }

  /**
   * Flattens every tunnel group's tunnels into the system registry with
   * sequential IDs, then resets the behavior groups (Carbon
   * UpdateTunnelRegistry, cpp:508-527).
   */
  @meta.blue.method
  @meta.adapted
  @meta.reason("Carbon copies each SplineTunnel by value into m_tunnels; the JS port shares the tunnel records so the reassigned IDs stay visible to their groups.")
  UpdateTunnelRegistry()
  {
    this._tunnels.length = 0;
    let id = 0;
    for (const group of this.splineTunnels)
    {
      const tunnels = group?.GetTunnels?.() ?? group?.tunnels;
      if (!Array.isArray(tunnels))
      {
        continue;
      }
      for (const tunnel of tunnels)
      {
        tunnel.tunnelID = id;
        id++;
        this._tunnels.push(tunnel);
      }
    }

    for (const group of this.behaviorGroups)
    {
      group?.InitializeGeometryResource?.();
    }
  }

  /** Carbon EveChildBehaviorSystem::GetInstanceBufferCount (cpp:206-209). */
  @meta.blue.method
  @meta.implemented
  GetInstanceBufferCount()
  {
    return 1;
  }

  /** Carbon EveChildBehaviorSystem::GetInstanceBufferVertexCount (cpp:221-229). */
  @meta.blue.method
  @meta.implemented
  GetInstanceBufferVertexCount(_bufferIndex = 0)
  {
    let size = 0;
    for (const group of this.behaviorGroups)
    {
      size += Number(group?.GetSize?.() ?? 0);
    }
    return size;
  }

  /** Carbon EveChildBehaviorSystem::GetInstanceBufferBoundingBox (cpp:673-676). */
  @meta.blue.method
  @meta.implemented
  GetInstanceBufferBoundingBox(_bufferIndex, _minBounds, _maxBounds)
  {
    return false;
  }

  /** Carbon EveChildBehaviorSystem::HasTransparentBatches (cpp:424-441). */
  @meta.blue.method
  @meta.implemented
  HasTransparentBatches()
  {
    for (const group of this.behaviorGroups)
    {
      const mesh = group?.GetMesh?.() ?? group?.mesh;
      if (this.display && mesh)
      {
        if ((mesh.GetAreas(TriBatchType.TRIBATCHTYPE_TRANSPARENT)?.length ?? 0) > 0)
        {
          return true;
        }
      }
    }
    return false;
  }

  /** No transparency, no sorting (cpp:447-450). */
  @meta.blue.method
  @meta.implemented
  GetSortValue()
  {
    return 0;
  }

  /** Carbon GetBatches: hide unready systems and mesh groups fully at sprite LOD. */
  @meta.blue.method
  @meta.implemented
  GetBatches(batches, batchType, perObjectData, _reason = 0)
  {
    if (!this.display || !this._shipInstanceBuffer.IsValid() || !this._boosterInstanceBuffer.IsValid()) return;
    if (!this.behaviorGroups.some(group => group.IsGroupVisible())) return;
    for (const group of this.behaviorGroups)
    {
      if (group.AllTheSame() === 1) continue;
      this.GetGroupBatches(batches, batchType, perObjectData, group.GetMesh(), group);
      this.GetGroupBoosterBatches(batches, batchType, perObjectData, group);
    }
  }

  /**
   * Carbon GetGroupBatches binds the group's mesh and the shared ship stream.
   * Adapted: realize cold geometry through Trinity's existing allocation seam
   * before binding; a deferred geometry descriptor would overwrite instancing.
   */
  @meta.blue.method
  @meta.adapted
  GetGroupBatches(batches, batchType, perObjectData, mesh, group)
  {
    if (!group.display || !mesh) return;
    const geometry = mesh.GetGeometryResource();
    if (!geometry || !geometry.IsGood()) return;
    const lod = geometry.GetMeshLod(mesh.GetMeshIndex(), 0);
    if (!lod || !CreateLodAllocations(geometry, mesh.GetMeshIndex(), lod, Tr2RenderContext_GetMainThreadRenderContext())) return;
    group.CreateVertexDeclaration();
    for (const area of mesh.GetAreas(batchType))
    {
      if (!area.GetDisplay()) continue;
      const material = area.GetMaterialInterface();
      if (!material) continue;
      const reversed = area.GetReversed();
      if (reversed && !lod.reversedIndicesValid) continue;
      const draw = Tr2RenderBatch.resolveDrawArguments(lod, area.GetIndex(), area.GetCount(), reversed);
      if (!draw) continue;
      const batch = new Tr2RenderBatch();
      batch.SetMaterial(material);
      if (!batch.IsValid()) continue;
      batch.SetPerObjectData(perObjectData);
      batch.SetPickingData(mesh.GetMeshIndex(), area.GetIndex());
      batch.SetGeometryFromAllocations(group.GetVertexDeclarationHandle(), lod.vertexAllocation,
        reversed ? lod.reversedIndexAllocation : lod.indexAllocation);
      batch.SetStreamSource(1, this._shipInstanceBuffer, this._shipStride);
      batch.SetDrawIndexedInstanced(draw.indexCountPerInstance, group.GetSize(),
        draw.startIndexLocation, draw.baseVertexLocation, this._startInstanceValues[group.GetGroupIndexIndicator()]);
      batches.Commit(batch);
    }
  }

  /** Carbon GetGroupBoosterBatches submits boosters only to the additive pass. */
  @meta.blue.method
  @meta.implemented
  GetGroupBoosterBatches(batches, batchType, perObjectData, group)
  {
    if (batchType !== TriBatchType.TRIBATCHTYPE_ADDITIVE) return;
    const booster = group.GetBooster();
    if (!booster || !booster.GetDisplay()) return;
    const batch = booster.GetBatch(this._boosterInstanceBuffer,
      this._startInstanceValues[group.GetGroupIndexIndicator()], this._boosterStride, group.GetSize());
    batch.SetPerObjectData(perObjectData);
    batches.Commit(batch);
  }

  /**
   * Carbon EveChildBehaviorSystem::GetPerObjectData (cpp:456-468): a handle
   * over this system PERSISTENT record pair.
   */
  @meta.blue.method
  @meta.implemented
  GetPerObjectData(_accumulator = null)
  {
    return { vs: this._perObjectData.vs, ps: this._perObjectData.ps };
  }

  /** Carbon method GetVertexElementAddedThroughCode (MAP_METHOD_AND_WRAP). */
  @meta.blue.method
  @meta.adapted
  @meta.reason("Returns Carbon's numeric Tr2VertexDefinition usage/index pairs without owning a renderer declaration.")
  GetVertexElementAddedThroughCode()
  {
    return [[5, 8], [5, 9], [5, 10], [5, 11], [5, 12], [5, 13]];
  }

  /**
   * Advances every behaviour group's agents by one step (Carbon cpp:287-293).
   * @param {Number} dt - elapsed seconds
   */
  _UpdateAgents(dt)
  {
    for (const group of this.behaviorGroups)
    {
      group?.UpdateAgents?.(dt, this);
    }
  }

  /**
   * Carbon UpdateBuffer maps both streams and writes groups in instance order.
   * Float views and offsets replace native byte-pointer arithmetic; finally
   * blocks preserve the native scope-exit unmaps, including packing failures.
   */
  @meta.blue.method
  @meta.adapted
  UpdateBuffer(renderContext)
  {
    this._startInstanceValues.length = 0;
    const ships = this._shipInstanceBuffer.MapForWriting(renderContext);
    if (Failed(ships.result)) return;
    try
    {
      const boosters = this._boosterInstanceBuffer.MapForWriting(renderContext);
      if (Failed(boosters.result)) return;
      try
      {
        const shipData = new Float32Array(ships.data.buffer, ships.data.byteOffset, ships.data.byteLength / 4); // alloc: zero-copy view scoped to this AL mapping.
        const boosterData = new Float32Array(boosters.data.buffer, boosters.data.byteOffset, boosters.data.byteLength / 4); // alloc: zero-copy view scoped to this AL mapping.
        let start = 0;
        for (const group of this.behaviorGroups)
        {
          group.GetShipInfoForBuffer(shipData, this.worldTransform, start * 24);
          group.GetBoosterInfoForBuffer(boosterData, this.worldTransform, start * 12);
          group.SetGroupIndexIndicator(this._startInstanceValues.length);
          this._startInstanceValues.push(start);
          start += group.GetCount();
        }
      }
      finally { this._boosterInstanceBuffer.UnmapForWriting(renderContext); }
    }
    finally { this._shipInstanceBuffer.UnmapForWriting(renderContext); }
  }

}

// EveChildBehaviorSystem_Blue.cpp: native exposure.
meta.blue.interfaceTable({ interfaces: [EveChildBehaviorSystem, EveSpaceObjectChild, IEveSpaceObjectChild, ITr2Renderable, INotify, EveEntity], chainTo: null })(EveChildBehaviorSystem, { kind: "class" });
