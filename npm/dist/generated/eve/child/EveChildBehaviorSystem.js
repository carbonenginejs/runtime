import { applyDecs2311 as _applyDecs2311 } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { EveChildTransform as _EveChildTransform } from '../../../eve/child/EveChildTransform.js';
import { Tr2PerObjectData } from '../../../trinityCore/Tr2PerObjectData.js';
import { TriBatchType } from '@carbonenginejs/runtime-utils/graphics';

let _initProto, _initClass, _init_splineTunnels, _init_extra_splineTunnels, _init_behaviorGroups, _init_extra_behaviorGroups, _init_instanceCount, _init_extra_instanceCount, _init_display, _init_extra_display;

/** EveChildBehaviorSystem (eve/child) - generated from schema shapeHash f2944d57.... */
let _EveChildBehaviorSyst;
class EveChildBehaviorSystem extends _EveChildTransform {
  static {
    ({
      e: [_init_splineTunnels, _init_extra_splineTunnels, _init_behaviorGroups, _init_extra_behaviorGroups, _init_instanceCount, _init_extra_instanceCount, _init_display, _init_extra_display, _initProto],
      c: [_EveChildBehaviorSyst, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveChildBehaviorSystem",
      family: "eve/child"
    })], [[[io, io.notify, io, io.persist, void 0, type.list("SplineTunnelGroup")], 16, "splineTunnels"], [[io, io.persist, void 0, type.list("BehaviorGroup")], 16, "behaviorGroups"], [[io, io.read, type, type.uint32], 16, "instanceCount"], [[io, io.notify, io, io.persist, type, type.boolean], 16, "display"], [[carbon, carbon.method, impl, impl.implemented], 18, "Initialize"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Component-registry re-registration is limited to an optional duck-typed call, matching the repo's registry seam.")], 18, "OnModified"], [[carbon, carbon.method, impl, impl.implemented], 18, "PassInVertexesToBehaviorGroups"], [[carbon, carbon.method, impl, impl.implemented], 18, "PassInTunnelFunctionsToBehaviorGroups"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateSyncronous"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("The parent transform arrives via params.localToWorldTransform per repo convention; the per-object VS/PS struct refresh is a GPU constant-buffer seam.")], 18, "UpdateAsyncronous"], [[carbon, carbon.method, impl, impl.implemented], 18, "UpdateVisibility"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("UpdateBuffer's instance-buffer writes are a GPU seam; the group-index/base-instance bookkeeping it also performs is ported.")], 18, "GetRenderables"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetBoundingSphere"], [[carbon, carbon.method, impl, impl.noop], 18, "GetLocalToWorldTransform"], [[carbon, carbon.method, impl, impl.noop], 18, "ChangeLOD"], [[carbon, carbon.method, impl, impl.implemented], 18, "Setup"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon multiple-inherits EveEntity; the JS class reaches the registry through the optional GetComponentRegistry duck.")], 18, "RegisterComponents"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon multiple-inherits EveEntity; the JS class reaches the registry through the optional GetComponentRegistry duck.")], 18, "UnRegisterComponents"], [[carbon, carbon.method, impl, impl.implemented], 18, "RegisterWithQuadRenderer"], [[carbon, carbon.method, impl, impl.implemented], 18, "AddQuadsToQuadRenderer"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetWorldTransform"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Instance vertex-buffer creation is a GPU seam; the CPU instance-count bookkeeping is ported.")], 18, "ChangeBufferInstanceCount"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetTunnels"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetSplineTunnels"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon copies each SplineTunnel by value into m_tunnels; the JS port shares the tunnel records so the reassigned IDs stay visible to their groups.")], 18, "UpdateTunnelRegistry"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetInstanceBufferCount"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetInstanceBufferVertexCount"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetInstanceBufferBoundingBox"], [[carbon, carbon.method, impl, impl.implemented], 18, "HasTransparentBatches"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetSortValue"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "GetBatches"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon carries m_vsData/m_psData pointers (cpp:465-466); the persistent VS/PS buffers are engine-owned, so the GPU-free record carries the object reference the engine serializer consumes (EveChildMesh precedent).")], 18, "GetPerObjectData"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Returns Carbon's numeric Tr2VertexDefinition usage/index pairs without owning a renderer declaration.")], 18, "GetVertexElementAddedThroughCode"]], 0, void 0, _EveChildTransform));
  }
  /** m_splineTunnels (PSplineTunnelGroupVector) [READ, PERSIST, NOTIFY] */
  splineTunnels = (_initProto(this), _init_splineTunnels(this, []));

  /** m_behaviorGroups (PBehaviorGroupVector) [READ, PERSIST] */
  behaviorGroups = (_init_extra_splineTunnels(this), _init_behaviorGroups(this, []));

  /** m_instanceCount (unsigned) [READ] */
  instanceCount = (_init_extra_behaviorGroups(this), _init_instanceCount(this, 1));

  /** m_display (bool) [READWRITE, PERSIST, NOTIFY] */
  display = (_init_extra_instanceCount(this), _init_display(this, true));

  // System-wide flattened tunnel registry with reassigned IDs (Carbon m_tunnels).
  #tunnels = (_init_extra_display(this), []);

  // Base-instance offsets per group (Carbon m_startInstanceValues); the JS
  // port keeps only the CPU bookkeeping the batch path reads.
  #startInstanceValues = [];

  // Carbon m_hasUpdated: until an update ran, the object cannot be rendered.
  #hasUpdated = false;

  // Carbon m_behaviorGroupLoaded/m_behaviorGroupLoadedForTunnel: one-shot
  // wiring flags for the callback pass-ins.
  #behaviorGroupLoaded = false;
  #behaviorGroupLoadedForTunnel = false;

  /** Carbon EveChildBehaviorSystem::Initialize (cpp:67-77). */
  Initialize() {
    if (this.staticTransform) {
      this.RebuildLocalTransform();
    }
    this.ChangeBufferInstanceCount();
    return true;
  }

  /** Carbon EveChildBehaviorSystem::OnModified (cpp:79-86); the value
   * argument follows the repo's OnModified duck (field name or field value). */
  OnModified(value = null) {
    if (value === "display" || value !== null && value === this.display) {
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
  PassInVertexesToBehaviorGroups() {
    for (const group of this.behaviorGroups) {
      group?.SetVertexFunctionReferance?.(() => this.ChangeBufferInstanceCount());
      group?.InitializeGeometryResource?.();
    }
    this.#behaviorGroupLoaded = true;
  }

  /**
   * Hands every spline tunnel group the system tunnel-registry callback
   * (Carbon PassInTunnelFunctionsToBehaviorGroups, cpp:246-254).
   */
  PassInTunnelFunctionsToBehaviorGroups() {
    for (const group of this.splineTunnels) {
      group?.SetSystemTunnelFunctionReferenceAndColor?.(() => this.UpdateTunnelRegistry(), 0xffffff00);
    }
    this.#behaviorGroupLoadedForTunnel = true;
  }

  /**
   * Sync-side frame update (Carbon UpdateSyncronous, cpp:258-283): late
   * callback wiring, per-group vertex-declaration refresh (stubbed GPU-side),
   * group sync updates, then the agent simulation step.
   * @param {Object} updateContext - frame context (EveUpdateContext)
   * @param {Object} params - EveChildUpdateParams
   */
  UpdateSyncronous(updateContext, params) {
    // might be a better way to get these initialized but IInitialize doesn't
    // work since these need to be called after children are initialized
    if (!this.#behaviorGroupLoaded) {
      this.PassInVertexesToBehaviorGroups();
    }
    if (!this.#behaviorGroupLoadedForTunnel) {
      this.PassInTunnelFunctionsToBehaviorGroups();
    }
    for (const group of this.behaviorGroups) {
      group?.CreateVertexDeclaration?.();
    }
    for (const group of this.behaviorGroups) {
      group?.UpdateSyncronous?.(updateContext, params);
    }
    const deltaTime = Number(updateContext?.GetDeltaT?.() ?? updateContext?.deltaT ?? 0) || 0;
    this.#UpdateAgents(deltaTime);
  }

  /**
   * Per-frame async update (Carbon UpdateAsyncronous, cpp:582-616): rebuild
   * the world transform from the parent, then fan out to the groups. The
   * per-object VS/PS constant structs Carbon refreshes here are a GPU
   * constant-buffer seam.
   * @param {Object} updateContext - frame context (EveUpdateContext)
   * @param {Object} params - EveChildUpdateParams (localToWorldTransform)
   */
  UpdateAsyncronous(updateContext, params) {
    const parentTransform = params?.localToWorldTransform;
    if (parentTransform && parentTransform.length === 16) {
      this.UpdateTransform(parentTransform);
    }
    for (const group of this.behaviorGroups) {
      group?.UpdateAsyncronous?.(updateContext);
    }
    this.#hasUpdated = true;
    return this.worldTransform;
  }

  /** Carbon EveChildBehaviorSystem::UpdateVisibility (cpp:655-666). */
  UpdateVisibility(updateContext, _parentTransform = null, _parentLod = null) {
    if (!this.display) {
      return;
    }
    for (const group of this.behaviorGroups) {
      group?.UpdateVisibility?.(updateContext, this.worldTransform);
    }
  }

  /**
   * Publishes the system and its groups' PlayFX effects (Carbon
   * GetRenderables, cpp:628-649). Carbon maps and fills the ship/booster
   * instance buffers here (UpdateBuffer) - the GPU writes are a device seam;
   * the CPU bookkeeping (group index indicators + base instance offsets) is
   * kept.
   */
  GetRenderables(renderables = []) {
    if (!this.display || !this.#hasUpdated) {
      return renderables;
    }
    if (!this.#behaviorGroupLoaded) {
      return renderables;
    }
    renderables.push(this);
    this.#UpdateInstanceBookkeeping();
    for (const group of this.behaviorGroups) {
      group?.GetRenderables?.(renderables);
    }
    return renderables;
  }

  /** Carbon returns true without writing the sphere (cpp:668-671). */
  GetBoundingSphere(_sphere = null, _query = 0) {
    return true;
  }

  /** Carbon's body is empty (cpp:678-680). */
  GetLocalToWorldTransform(_transform = null) {}

  /** Carbon's body is empty (cpp:682-684). */
  ChangeLOD(_lod) {}

  /** Forwards to the base transform setup (cpp:623-626). */
  Setup(scale = null, rotation = null, translation = null, lowestLodVisible = null) {
    return super.Setup(scale, rotation, translation, lowestLodVisible);
  }

  /** Carbon EveChildBehaviorSystem::RegisterComponents (cpp:686-700). */
  RegisterComponents() {
    if (!this.display) {
      return;
    }
    const registry = this.GetComponentRegistry?.() ?? null;
    if (!registry) {
      return;
    }
    for (const group of this.behaviorGroups) {
      group?.Register?.(registry);
    }
  }

  /** Carbon EveChildBehaviorSystem::UnRegisterComponents (cpp:702-711). */
  UnRegisterComponents() {
    const registry = this.GetComponentRegistry?.() ?? null;
    if (!registry) {
      return;
    }
    for (const group of this.behaviorGroups) {
      group?.UnRegister?.(registry);
    }
  }

  /** Carbon EveChildBehaviorSystem::RegisterWithQuadRenderer (cpp:713-719). */
  RegisterWithQuadRenderer(quadRenderer) {
    for (const group of this.behaviorGroups) {
      group?.RegisterWithQuadRenderer?.(quadRenderer);
    }
  }

  /** Carbon EveChildBehaviorSystem::AddQuadsToQuadRenderer (cpp:721-732). */
  AddQuadsToQuadRenderer(frustum, quadRenderer) {
    if (!this.display) {
      return;
    }
    for (const group of this.behaviorGroups) {
      group?.AddQuadsToQuadRenderer?.(frustum, quadRenderer);
    }
  }

  /** Carbon EveChildBehaviorSystem::GetWorldTransform (cpp:734-737). */
  GetWorldTransform() {
    return this.worldTransform;
  }

  /**
   * Recomputes the instance count from the live agents (Carbon
   * ChangeBufferInstanceCount, cpp:529-564). The Tr2Buffer creation is a GPU
   * seam; the never-zero count rule is kept.
   */
  ChangeBufferInstanceCount() {
    let numAgents = 0;
    for (const group of this.behaviorGroups) {
      numAgents += Number(group?.GetSize?.() ?? 0);
    }

    // Prevent the count from being 0 (Carbon keeps the buffers non-empty).
    this.instanceCount = numAgents === 0 ? 1 : numAgents;
  }

  /** Carbon EveChildBehaviorSystem::GetTunnels (cpp:498-501). */
  GetTunnels() {
    return this.#tunnels;
  }

  /** Carbon EveChildBehaviorSystem::GetSplineTunnels (cpp:503-506). */
  GetSplineTunnels() {
    return this.splineTunnels;
  }

  /**
   * Flattens every tunnel group's tunnels into the system registry with
   * sequential IDs, then resets the behavior groups (Carbon
   * UpdateTunnelRegistry, cpp:508-527).
   */
  UpdateTunnelRegistry() {
    this.#tunnels.length = 0;
    let id = 0;
    for (const group of this.splineTunnels) {
      const tunnels = group?.GetTunnels?.() ?? group?.tunnels;
      if (!Array.isArray(tunnels)) {
        continue;
      }
      for (const tunnel of tunnels) {
        tunnel.tunnelID = id;
        id++;
        this.#tunnels.push(tunnel);
      }
    }
    for (const group of this.behaviorGroups) {
      group?.InitializeGeometryResource?.();
    }
  }

  /** Carbon EveChildBehaviorSystem::GetInstanceBufferCount (cpp:206-209). */
  GetInstanceBufferCount() {
    return 1;
  }

  /** Carbon EveChildBehaviorSystem::GetInstanceBufferVertexCount (cpp:221-229). */
  GetInstanceBufferVertexCount(_bufferIndex = 0) {
    let size = 0;
    for (const group of this.behaviorGroups) {
      size += Number(group?.GetSize?.() ?? 0);
    }
    return size;
  }

  /** Carbon EveChildBehaviorSystem::GetInstanceBufferBoundingBox (cpp:673-676). */
  GetInstanceBufferBoundingBox(_bufferIndex, _minBounds, _maxBounds) {
    return false;
  }

  /** Carbon EveChildBehaviorSystem::HasTransparentBatches (cpp:424-441). */
  HasTransparentBatches() {
    for (const group of this.behaviorGroups) {
      const mesh = group?.GetMesh?.() ?? group?.mesh;
      if (this.display && mesh) {
        if ((mesh.GetAreas?.(TriBatchType.TRIBATCHTYPE_TRANSPARENT)?.length ?? 0) > 0) {
          return true;
        }
      }
    }
    return false;
  }

  /** No transparency, no sorting (cpp:447-450). */
  GetSortValue() {
    return 0;
  }

  /** Carbon method GetBatches (cpp:387-421) - render-batch accumulation. */
  GetBatches(..._args) {
    throw new Error("EveChildBehaviorSystem.GetBatches is not implemented in CarbonEngineJS.");
  }

  /** Carbon method GetPerObjectData (cpp:456-468) - per-object GPU constants. */
  GetPerObjectData(accumulator = null) {
    const data = typeof accumulator?.Allocate === "function" ? accumulator.Allocate(Tr2PerObjectData) : new Tr2PerObjectData();
    data.object = this;
    return data;
  }

  /** Carbon method GetVertexElementAddedThroughCode (MAP_METHOD_AND_WRAP). */
  GetVertexElementAddedThroughCode() {
    return [[5, 8], [5, 9], [5, 10], [5, 11], [5, 12], [5, 13]];
  }

  // Carbon UpdateAgents (cpp:287-293).
  #UpdateAgents(dt) {
    for (const group of this.behaviorGroups) {
      group?.UpdateAgents?.(dt, this);
    }
  }

  // The CPU half of Carbon UpdateBuffer (cpp:295-329): assigns each group its
  // index indicator and records the running base-instance offsets.
  #UpdateInstanceBookkeeping() {
    this.#startInstanceValues.length = 0;
    let totalShipsSoFar = 0;
    for (const group of this.behaviorGroups) {
      const count = Number(group?.GetCount?.() ?? 0);
      group?.SetGroupIndexIndicator?.(this.#startInstanceValues.length);
      this.#startInstanceValues.push(totalShipsSoFar);
      totalShipsSoFar += count;
    }
  }
  static {
    _initClass();
  }
}

export { _EveChildBehaviorSyst as EveChildBehaviorSystem };
//# sourceMappingURL=EveChildBehaviorSystem.js.map
