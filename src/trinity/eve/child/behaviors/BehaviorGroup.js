import { IListNotify } from "../../../../global/blue/IListNotify.js";
import { INotify } from "../../../../global/blue/INotify.js";
import { IInitialize } from "../../../../global/blue/IInitialize.js";
// Source: trinity/trinity/Eve/SpaceObject/Children/Behaviors/BehaviorGroup.h
//   trinity/trinity/Eve/SpaceObject/Children/Behaviors/BehaviorGroup.cpp
// Hand-maintained from Carbon source, promoted out of generated intake.
import { carbon, impl, edit, type } from "#schema";
import { EveEntity } from "../../EveEntity.js";
import { mat4 } from "#math/mat4";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { ProcessPriority } from "./enums.js";
import { EveKDdroneManagementTree } from "../../../eve/child/behaviors/EveKDdroneManagementTree.js";
import { PlayFX } from "./PlayFX.js";
import { EveComponentType } from "../../EveComponentTypes.js";

// Module scratch for the per-agent integration and visibility loops (child
// updates run sequentially; non-reentrant by design).
const Z_AXIS = vec3.fromValues(0, 0, 1);
const INTEREST_POINT = vec3.create();
const ACTUAL_FACING = vec3.create();
const AGENT_SPHERE = vec4.create();
const EMPTY_SEARCH_TREE = [];

// Carbon ClampLength: in-place clamp of a vec3 to a maximum length.
function ClampLength(value, maxLength)
{
  const lengthSq = vec3.squaredLength(value);
  if (lengthSq > maxLength * maxLength && lengthSq > 0)
  {
    vec3.scale(value, value, maxLength / Math.sqrt(lengthSq));
  }
  return value;
}

/** Owns a group of drone agents, running its priority-ordered behaviours each frame to integrate their acceleration, velocity, orientation and position, and managing their count, visibility, lighting and rendering. */
@type.define({ className: "BehaviorGroup", family: "eve/child/behaviors" })
@carbon.inherit(IInitialize, INotify, IListNotify)
export class BehaviorGroup extends EveEntity
{

  _agents = [];

  // Per-behavior scratch: #scratchData[behaviorIndex] is an array of plain
  // per-agent records (behavior.InitializeScratch()) or null when the
  // behavior reports no scratch (Carbon m_scratchData raw buffers).
  _scratchData = [];

  // Behavior indexes ordered by ProcessPriority (Carbon m_sortedBehaviorIndexes).
  _sortedBehaviorIndexes = [];

  // Spatial partitioning tree (Carbon m_tree).
  _tree = null;

  // Carbon m_updatedOnce/m_createAgentTree runtime frame state.
  _updatedOnce = false;

  _createAgentTree = false;

  // Cached PlayFX behavior (Carbon m_playFXBehavior).
  _playFXBehavior = null;

  // Owner-provided buffer resize callback (Carbon m_changeBufferVertexCount).
  _changeBufferVertexCount = null;

  // Debug force collection (Carbon m_forces; pairs of position/force vec3s).
  _forces = [];

  // Reused per-frame search radii (Carbon local `ranges`).
  _ranges = [];

  // agentIndex -> vec4(position.xyz, lightScale) (Carbon m_lightInfo);
  // filled by the GPU booster-buffer path, consumed by GetLights.
  _lightInfo = new Map();

  // World transform captured by UpdateVisibility (Carbon m_parentTransform).
  _parentTransform = mat4.create();

  // Owning space object (Carbon m_parent), captured in UpdateSyncronous.
  _parent = null;

  // Base-instance indicator assigned by the behavior system (Carbon m_groupIndex).
  _groupIndex = 0;

  /** m_display (bool) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.boolean
  display = true;

  /** m_maxVelocity (float) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.float32
  maxVelocity = 100;

  /** m_scale (float) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.float32
  scale = 1;

  /** m_blendScreenSizeMax (float) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.float32
  blendScreenSizeMax = 15;

  /** m_blendScreenSizeMin (float) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.float32
  blendScreenSizeMin = 5;

  /** m_currentScreenSize (float) [READ] */
  @edit.read
  @type.float32
  currentScreenSize = 0;

  /** m_renderThreshold (float) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.float32
  renderThreshold = 1;

  /** m_debugIntensity (float) [READWRITE] */
  @edit.readwrite
  @type.float32
  debugIntensity = 0;

  /** m_debugLodLevel (float) [READWRITE] */
  @edit.readwrite
  @type.float32
  debugLodLevel = 0;

  /** m_actualCount (int32_t) [READ] */
  @edit.read
  @type.int32
  actualCount = 0;

  /** m_count (int32_t) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.int32
  count = 0;

  /** m_booster (BehaviorGroupBoosterPtr) [READWRITE, PERSIST, NOTIFY] */
  @edit.notify
  @edit.readwrite
  @edit.persist
  @type.model("BehaviorGroupBooster")
  boosters = null;

  /** m_mesh (Tr2MeshPtr) [READWRITE, PERSIST, NOTIFY] */
  @edit.notify
  @edit.readwrite
  @edit.persist
  @type.model("Tr2Mesh")
  mesh = null;

  /** m_behaviorGroupName (BlueSharedString) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.string
  name = "";

  /** m_boundingSphereRadius (float) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.float32
  boundingSphereRadius = 5;

  /** m_debugMode (bool) [READWRITE] */
  @edit.readwrite
  @type.boolean
  debugMode = false;

  /** m_update (bool) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.boolean
  update = true;

  /** m_behaviors (PIBehaviorVector) [READ, PERSIST] */
  @edit.read
  @edit.persist
  @type.list("IBehavior")
  behaviors = [];

  /** m_spawnPosition (Vector3) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.vec3
  spawnPosition = vec3.create();

  /** m_collectForces (bool) - debug toggle read by the behaviors. */
  @type.boolean
  collectForces = false;

  /** Carbon BehaviorGroup::Initialize (cpp:45-57). */
  @carbon.method
  @impl.adapted
  @impl.reason("Vertex-declaration creation is a GPU seam; scratch sizing, booster flare-count sync, and the PlayFX cache are ported.")
  Initialize()
  {
    this._EnsureScratchArrays();
    this.CreateVertexDeclaration();

    if (this.boosters)
    {
      this.boosters.RebuildFlareBuffer?.(this.count);
    }

    this.SetPlayFXBehavior();
    return true;
  }

  /** Carbon BehaviorGroup::OnModified (cpp:59-71); the value argument follows
   * the repo's OnModified duck (field name or field value). */
  @carbon.method
  @impl.adapted
  @impl.reason("Blue Var matching maps to the repo's OnModified duck; a mesh change refreshes the (stubbed) vertex declaration and a booster change re-syncs the flare count.")
  OnModified(value = null)
  {
    if (value === "mesh")
    {
      this.CreateVertexDeclaration();
    }
    if ((value === "boosters") && this.boosters !== null)
    {
      this.boosters.RebuildFlareBuffer?.(this.actualCount);
    }
    return true;
  }

  /**
   * Regenerates the agents from scratch: clears them, re-sorts the behavior
   * indexes, and re-adds m_count agents (Carbon InitializeGeometryResource,
   * cpp:126-140). Behaviors like SpawnDrones use this as a full reset.
   */
  @carbon.method
  @impl.implemented
  InitializeGeometryResource()
  {
    this._agents.length = 0;
    for (let i = 0; i < this._scratchData.length; i++)
    {
      if (this._scratchData[i])
      {
        this._scratchData[i].length = 0;
      }
    }

    this.SortBehaviorIndexes();

    const t = this.count;
    this.actualCount = 0;
    this.SetCount(t);
  }

  /** Carbon BehaviorGroup::SetVertexFunctionReferance (cpp:142-145). */
  @carbon.method
  @impl.implemented
  SetVertexFunctionReferance(callback)
  {
    this._changeBufferVertexCount = typeof callback === "function" ? callback : null;
  }

  /** Carbon BehaviorGroup::GetSize (cpp:151-154). */
  @carbon.method
  @impl.implemented
  GetSize()
  {
    return this._agents.length;
  }

  /** Carbon BehaviorGroup::GetCount (cpp:160-163). */
  @carbon.method
  @impl.implemented
  GetCount()
  {
    return this.actualCount;
  }

  /** Carbon method CreateAgentTree (cpp:169-177). */
  @carbon.method
  @impl.implemented
  CreateAgentTree()
  {
    this._tree = new EveKDdroneManagementTree();
    this._tree.CreateTree(this._agents, this.behaviors.length);
    return this._tree;
  }

  /** Carbon BehaviorGroup::GetBehaviorByName (cpp:187-197). */
  @carbon.method
  @impl.implemented
  GetBehaviorByName(name)
  {
    const target = String(name ?? "");
    for (const behavior of this.behaviors)
    {
      if (target === (behavior?.GetBehaviorName?.() ?? "unnamed"))
      {
        return behavior;
      }
    }
    return null;
  }

  /** Carbon BehaviorGroup::SortBehaviorIndexes (cpp:206-221). */
  @carbon.method
  @impl.implemented
  SortBehaviorIndexes()
  {
    this._sortedBehaviorIndexes.length = 0;
    for (let priority = 0; priority < ProcessPriority.COUNT; priority++)
    {
      for (let index = 0; index < this.behaviors.length; index++)
      {
        if ((this.behaviors[index]?.GetProcessPriority?.() ?? ProcessPriority.LEAST_PRIORITY) === priority)
        {
          this._sortedBehaviorIndexes.push(index);
        }
      }
    }
  }

  /** Carbon BehaviorGroup::GetMesh (cpp:227-230). */
  @carbon.method
  @impl.implemented
  GetMesh()
  {
    return this.mesh;
  }

  /** Carbon BehaviorGroup::GetMaxVelocity (cpp:236-239). */
  @carbon.method
  @impl.implemented
  GetMaxVelocity()
  {
    return this.maxVelocity;
  }

  /** Carbon BehaviorGroup::SetGroupIndexIndicator (cpp:254-257). */
  @carbon.method
  @impl.implemented
  SetGroupIndexIndicator(index)
  {
    this._groupIndex = Number(index) | 0;
  }

  /** Carbon BehaviorGroup::GetGroupIndexIndicator (cpp:263-266). */
  @carbon.method
  @impl.implemented
  GetGroupIndexIndicator()
  {
    return this._groupIndex;
  }

  /** Carbon method AddAgent (cpp:272-278). */
  @carbon.method
  @impl.implemented
  AddAgent()
  {
    this._AddAgentPrivate();
    this._OnAgentCountChanged();
  }

  /**
   * Adds one agent per position and initializes the newcomers' scratch
   * records (Carbon AddAgents, cpp:280-310).
   * @param {Array<Float32Array>} positions
   */
  @carbon.method
  @impl.implemented
  AddAgents(positions)
  {
    if (!Array.isArray(positions))
    {
      return;
    }

    const firstNewIndex = this._agents.length;
    for (const position of positions)
    {
      const agent = this._createAgent();
      vec3.copy(agent.position, position);
      this._agents.push(agent);
    }

    this._EnsureScratchArrays();
    for (let agentIndex = firstNewIndex; agentIndex < this._agents.length; agentIndex++)
    {
      this._InitializeScratchForAgent(agentIndex);
    }

    this.actualCount += positions.length;
    this._OnAgentCountChanged();
  }

  /** Carbon method RemoveAgent (cpp:415-426). */
  @carbon.method
  @impl.adapted
  @impl.reason("Math.random replaces Carbon's TriRandInt when selecting the removed agent.")
  RemoveAgent()
  {
    if (this._agents.length === 0)
    {
      return;
    }
    const index = Math.floor(Math.random() * this._agents.length);
    this.RemoveSpecificAgent(index);
    this._OnAgentCountChanged();
  }

  /**
   * Swap-with-last removal that keeps every behavior's per-agent scratch
   * record aligned (Carbon RemoveSpecificAgent, cpp:432-452).
   * @param {Number} index
   */
  @carbon.method
  @impl.implemented
  RemoveSpecificAgent(index)
  {
    const lastIndex = this._agents.length - 1;
    if (index < 0 || index > lastIndex)
    {
      return;
    }

    this._agents[index] = this._agents[lastIndex];
    this._agents.pop();

    for (let i = 0; i < this.behaviors.length; i++)
    {
      const records = this._scratchData[i];
      if (!records)
      {
        continue;
      }
      records[index] = records[lastIndex];
      records.length = this._agents.length;
    }

    this.actualCount--;
    this._OnAgentCountChanged();
  }

  /** Carbon method SetCount (cpp:350-368). */
  @carbon.method
  @impl.implemented
  SetCount(count)
  {
    const value = Number(count);
    const desired = Number.isFinite(value) ? Math.trunc(value) : -1;
    if (desired === this.actualCount || desired < 0)
    {
      return;
    }

    if (this.actualCount < desired)
    {
      this._AddAgentsByCount(desired);
    }
    else
    {
      this._RemoveAgentsByCount(desired);
    }

    // Carbon updates only m_actualCount here; m_count stays the authored
    // spawn count that InitializeGeometryResource restores.
    this.actualCount = desired;
    this._OnAgentCountChanged();
  }

  /**
   * Runs the priority-sorted behaviors against the shared range query, then
   * integrates every agent's acceleration, velocity, facing, and position
   * (Carbon UpdateAgents, cpp:521-626).
   * @param {Number} dt - delta time in seconds
   * @param {Object} system - owning EveChildBehaviorSystem
   */
  @carbon.method
  @impl.implemented
  UpdateAgents(dt, system)
  {
    // make sure the update isn't too big when e.g. a player resizes his window
    const deltaTime = Math.min(Math.max(Number(dt) || 0, 0), 0.1);

    // JS has no Blue list notify: keep the priority order and scratch shells
    // in sync with the behavior list before the frame body runs (Carbon's
    // OnListModified seam).
    if (this._sortedBehaviorIndexes.length !== this.behaviors.length)
    {
      this.SortBehaviorIndexes();
    }
    this._EnsureScratchArrays();
    this._SyncScratchRecords();

    if (this._updatedOnce)
    {
      if (!this.display || !this.update)
      {
        this._tree = null;
        return;
      }
      if (this._agents.length === 0)
      {
        for (let i = 0; i < this.behaviors.length; i++)
        {
          const index = this._sortedBehaviorIndexes[i];
          this.behaviors[index]?.CalculateBehavior?.(this._agents, this._scratchData[index], deltaTime, this, system, EMPTY_SEARCH_TREE);
        }
        return;
      }
    }
    if (this._tree === null)
    {
      this.CreateAgentTree();
    }

    const ranges = this._ranges;
    ranges.length = 0;
    const boundingRadius = this.boundingSphereRadius * this.scale;
    for (const behavior of this.behaviors)
    {
      const searchRadius = behavior?.GetBehaviorSearchRadius?.() ?? -1;
      ranges.push(searchRadius === -1 ? -1 : searchRadius + boundingRadius);
    }

    const dronesInRange = this._tree.FindDronesInRange(this._agents, ranges, boundingRadius);

    // Calculate the behaviors
    if (this.collectForces)
    {
      this._forces.length = 0;
      for (let i = 0; i < this.behaviors.length; i++)
      {
        const index = this._sortedBehaviorIndexes[i];
        const forces = this.behaviors[index]?.CalculateBehavior?.(this._agents, this._scratchData[index], deltaTime, this, system, dronesInRange[index] ?? EMPTY_SEARCH_TREE);
        if (Array.isArray(forces))
        {
          for (const force of forces)
          {
            this._forces.push(force);
          }
        }
      }
    }
    else
    {
      for (let i = 0; i < this.behaviors.length; i++)
      {
        const index = this._sortedBehaviorIndexes[i];
        this.behaviors[index]?.CalculateBehavior?.(this._agents, this._scratchData[index], deltaTime, this, system, dronesInRange[index] ?? EMPTY_SEARCH_TREE);
      }
    }

    // Move the agents based on the behaviors
    const maxVelocitySq = Math.max(1, this.maxVelocity * this.maxVelocity);
    for (const agent of this._agents)
    {
      agent.lifetime += deltaTime;

      vec3.scaleAndAdd(agent.velocity, agent.velocity, agent.acceleration, deltaTime);

      vec3.transformQuat(INTEREST_POINT, Z_AXIS, agent.rotation);
      vec3.lerp(ACTUAL_FACING, INTEREST_POINT, agent.velocity, vec3.squaredLength(agent.velocity) / maxVelocitySq);

      // Carbon TriQuaternionRotationArc(&rotation, &zAxis, &actualFacingDir)
      // (BehaviorGroup.cpp:611); it normalizes internally, and a zero facing
      // yields identity as in Carbon.
      quat.rotationArc(agent.rotation, Z_AXIS, ACTUAL_FACING);
      vec3.copy(agent.targetDirection, ACTUAL_FACING);

      ClampLength(agent.velocity, this.maxVelocity);
      vec3.scaleAndAdd(agent.position, agent.position, agent.velocity, deltaTime);
      vec3.set(agent.acceleration, 0, 0, 0);
    }

    this._tree.UpdateTree(deltaTime);

    // we always want to update the behaviors at least once, otherwise
    // behaviors like SpawnDrones won't get to spawn the drones
    this._updatedOnce = true;
  }

  /**
   * Per-agent frustum visibility and mesh/sprite crossfade (Carbon
   * UpdateVisibility, cpp:637-677).
   * @param {Object} updateContext - frame context (frustum ducks)
   * @param {Float32Array} worldTransform - owning system's world transform
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Frustum ducks take a packed vec4 sphere per repo convention; a missing frustum treats agents as visible at infinite pixel size.")
  UpdateVisibility(updateContext, worldTransform)
  {
    this.currentScreenSize = 0;
    let worldRadius = 1;

    const frustum = updateContext?.GetFrustum?.() ?? updateContext?.frustum;
    const boundingRadius = this.boundingSphereRadius * this.scale;
    const blendModifier = this._GetBlendModifier();

    for (const agent of this._agents)
    {
      vec3.transformMat4(AGENT_SPHERE, agent.position, worldTransform);
      AGENT_SPHERE[3] = boundingRadius;
      if (frustum?.IsSphereVisible(AGENT_SPHERE) !== false)
      {
        const pixelSize = Number(frustum?.GetPixelSizeAccross?.(AGENT_SPHERE) ?? Infinity);
        agent.screenSize = pixelSize;
        this.currentScreenSize = Math.max(this.currentScreenSize, pixelSize);
        worldRadius = Math.max(worldRadius, boundingRadius);
        if (pixelSize >= this.blendScreenSizeMax)
        {
          agent.xfade = 0; // Render as mesh
        }
        else if (pixelSize <= this.blendScreenSizeMin)
        {
          agent.xfade = 1; // Render as sprite
        }
        else
        {
          agent.xfade = 1 - (pixelSize - this.blendScreenSizeMin) * blendModifier;
        }
        agent.isVisible = agent.screenSize >= this.renderThreshold;
      }
      else
      {
        agent.isVisible = false;
      }
    }
    this.mesh?.UseWithScreenSize?.(this.currentScreenSize, worldRadius);

    mat4.copy(this._parentTransform, worldTransform);
  }

  /** Carbon BehaviorGroup::IsGroupVisible (cpp:683-686). */
  @carbon.method
  @impl.implemented
  IsGroupVisible()
  {
    return this.currentScreenSize >= this.renderThreshold;
  }

  /**
   * 1 if every agent lodded out to a sprite, 0 if every agent is a mesh,
   * -1 when mixed or empty (Carbon AllTheSame, cpp:397-409).
   */
  @carbon.method
  @impl.implemented
  AllTheSame()
  {
    let same = -1;
    for (const agent of this._agents)
    {
      if (same === -1)
      {
        same = agent.xfade;
      }
      if (same !== agent.xfade)
      {
        return -1;
      }
    }
    return same;
  }

  /** Carbon method GetShipInfoForBuffer (cpp:692-742) - GPU instance-buffer fill. */
  @carbon.method
  @impl.notImplemented
  GetShipInfoForBuffer(..._args)
  {
    throw new Error("BehaviorGroup.GetShipInfoForBuffer is not implemented in CarbonEngineJS (GPU instance-buffer fill).");
  }

  /** Carbon method GetBoosterInfoForBuffer (cpp:748-821) - GPU instance-buffer fill. */
  @carbon.method
  @impl.notImplemented
  GetBoosterInfoForBuffer(..._args)
  {
    throw new Error("BehaviorGroup.GetBoosterInfoForBuffer is not implemented in CarbonEngineJS (GPU instance-buffer fill).");
  }

  /** Carbon method CreateVertexDeclaration (cpp:828-865) - renderer vertex
   * declaration bookkeeping; safe frame-loop no-op in JS. */
  @carbon.method
  @impl.noop
  CreateVertexDeclaration()
  {
  }

  /** Carbon BehaviorGroup::GetRenderables (cpp:871-877): PlayFX effects only. */
  @carbon.method
  @impl.implemented
  GetRenderables(renderables = [])
  {
    if (this._playFXBehavior !== null)
    {
      this._playFXBehavior.GetRenderables(renderables);
    }
    return renderables;
  }

  /** Carbon BehaviorGroup::UpdateAsyncronous (cpp:883-894): PlayFX fan-out. */
  @carbon.method
  @impl.implemented
  UpdateAsyncronous(updateContext)
  {
    if (!this.update)
    {
      return;
    }

    if (this._playFXBehavior !== null)
    {
      this._playFXBehavior.UpdateAsyncronous(updateContext, this._parentTransform);
    }
  }

  /** Carbon BehaviorGroup::UpdateSyncronous (cpp:901-925): deferred tree
   * rebuild, PlayFX sync update, and parent capture. */
  @carbon.method
  @impl.implemented
  UpdateSyncronous(updateContext, params)
  {
    if (!this.update)
    {
      return;
    }
    if (this._createAgentTree === true)
    {
      this.CreateAgentTree();
      this._createAgentTree = false;
    }

    if (this._playFXBehavior !== null)
    {
      this._playFXBehavior.UpdateSyncronous(updateContext);
    }

    if (this._parent === null && params?.spaceObjectParent)
    {
      this._parent = params.spaceObjectParent;
    }
  }

  /** Carbon BehaviorGroup::GetParent (cpp:927-930). */
  @carbon.method
  @impl.implemented
  GetParent()
  {
    return this._parent;
  }

  /** Carbon BehaviorGroup::GetBoundingSphereRadius (cpp:953-956). */
  @carbon.method
  @impl.implemented
  GetBoundingSphereRadius()
  {
    return this.boundingSphereRadius * this.scale;
  }

  /** Carbon BehaviorGroup::GetKDTree (cpp:958-961). */
  @carbon.method
  @impl.implemented
  GetKDTree()
  {
    return this._tree;
  }

  /** Carbon BehaviorGroup::GetBooster (cpp:963-966). */
  @carbon.method
  @impl.implemented
  GetBooster()
  {
    return this.boosters;
  }

  /** Carbon BehaviorGroup::SetPlayFXBehavior (cpp:968-988): caches the PlayFX
   * behavior and swaps its component registration. The instanceof gate is
   * Carbon's dynamic_cast<PlayFX*> (cpp:973): the behaviors list is typed
   * IBehavior and resolved by string name, so a mis-named behavior of another
   * class must never land in the PlayFX slot. */
  @carbon.method
  @impl.implemented
  SetPlayFXBehavior()
  {
    const behavior = this.GetBehaviorByName("PlayFX");
    if (behavior instanceof PlayFX)
    {
      const registry = this.GetComponentRegistry();
      if (registry && this._playFXBehavior)
      {
        this._playFXBehavior.UnRegister?.(registry);
      }
      this._playFXBehavior = behavior;
      if (registry)
      {
        behavior.Register?.(registry);
      }
    }
  }

  /**
   * Registers the booster light records with the duck-typed light manager
   * (Carbon GetLights, cpp:990-1001). The #lightInfo map is populated by the
   * booster instance-buffer fill, which is a GPU seam - until that path runs
   * the map stays empty and no lights register.
   * @param {Object} lightManager
   */
  @carbon.method
  @impl.implemented
  GetLights(lightManager)
  {
    if (this.boosters && this.boosters.GetDisplay?.())
    {
      for (const [agentIndex, info] of this._lightInfo)
      {
        this.boosters.AddLight(lightManager, info, info[3], agentIndex, this._parentTransform);
      }
    }
  }

  /** ITr2LightOwner::AddLight - intentionally empty in Carbon (h:116). */
  @carbon.method
  @impl.noop
  AddLight(_light)
  {
  }

  /** ITr2LightOwner::ClearLights - intentionally empty in Carbon (h:117). */
  @carbon.method
  @impl.noop
  ClearLights()
  {
  }

  /** Carbon BehaviorGroup::RegisterComponents (cpp:1003-1015): unconditional
   * LightOwner (Carbon's verbatim "LightOwner" component name,
   * Lights/ITr2LightOwner.h:18), then forwards the PlayFX behavior. */
  @carbon.method
  @impl.implemented
  RegisterComponents()
  {
    const registry = this.GetComponentRegistry();
    if (registry)
    {
      registry.RegisterComponent(EveComponentType.LightOwner, this);
      this._playFXBehavior?.Register?.(registry);
    }
  }

  /** Carbon BehaviorGroup::UnRegisterComponents (cpp:1017-1027). */
  @carbon.method
  @impl.implemented
  UnRegisterComponents()
  {
    const registry = this.GetComponentRegistry();
    if (registry)
    {
      this._playFXBehavior?.UnRegister?.(registry);
    }
  }

  /** Carbon BehaviorGroup::RegisterWithQuadRenderer (cpp:1029-1040): CPU
   * fan-out to the booster and PlayFX quad owners. */
  @carbon.method
  @impl.implemented
  RegisterWithQuadRenderer(quadRenderer)
  {
    if (this.boosters)
    {
      this.boosters.RegisterWithQuadRenderer?.(quadRenderer);
    }

    if (this._playFXBehavior !== null)
    {
      this._playFXBehavior.RegisterWithQuadRenderer?.(quadRenderer);
    }
  }

  /** Carbon BehaviorGroup::AddQuadsToQuadRenderer (cpp:1043-1059): CPU
   * fan-out, gated on display and group visibility. */
  @carbon.method
  @impl.implemented
  AddQuadsToQuadRenderer(frustum, quadRenderer)
  {
    if (this.display && this.IsGroupVisible())
    {
      if (this.boosters && this.boosters.GetDisplay?.())
      {
        this.boosters.AddQuadsToQuadRenderer?.(frustum, quadRenderer);
      }

      if (this._playFXBehavior !== null)
      {
        this._playFXBehavior.AddQuadsToQuadRenderer?.(frustum, quadRenderer);
      }
    }
  }

  /** Returns the portable DroneAgent records in stable instance order. */
  @impl.adapted
  GetAgents()
  {
    return this._agents;
  }

  /** Returns the collected debug force pairs (Carbon m_forces). */
  @impl.adapted
  GetForces()
  {
    return this._forces;
  }

  // Carbon GetBlendModifier (cpp:628-631).
  /**
   * The reciprocal of the mesh-to-sprite blend screen-size range, used to interpolate an agent's crossfade.
   */
  _GetBlendModifier()
  {
    return 1 / Math.max(0.0001, this.blendScreenSizeMax - this.blendScreenSizeMin);
  }

  // Grows the per-behavior scratch shells to the behavior count (Carbon
  // resizes m_scratchData wherever agents are added).
  /**
   * Grows the per-behaviour scratch array so it has one slot per behaviour in the group.
   */
  _EnsureScratchArrays()
  {
    while (this._scratchData.length < this.behaviors.length)
    {
      this._scratchData.push(null);
    }
  }

  // Fills any missing per-agent scratch records and trims removed ones -
  // the JS stand-in for Carbon's behavior-list OnListModified handler
  // (cpp:77-118), which resizes scratch when behaviors join or leave.
  /**
   * Adds missing per-agent scratch records and trims stale ones for every behaviour that needs scratch storage.
   */
  _SyncScratchRecords()
  {
    for (let i = 0; i < this.behaviors.length; i++)
    {
      const behavior = this.behaviors[i];
      if ((behavior?.GetScratchMemorySize?.() ?? 0) > 0)
      {
        let records = this._scratchData[i];
        if (!records)
        {
          records = [];
          this._scratchData[i] = records;
        }
        for (let j = records.length; j < this._agents.length; j++)
        {
          records[j] = behavior.InitializeScratch();
        }
        records.length = this._agents.length;
      }
    }
  }

  // Initializes every scratch-owning behavior's record for one agent index
  // (Carbon InitializeScratch over the raw buffer at size * agentIndex).
  /**
   * Initialises the scratch record for one agent index in every behaviour that uses scratch storage.
   */
  _InitializeScratchForAgent(agentIndex)
  {
    for (let i = 0; i < this.behaviors.length; i++)
    {
      const behavior = this.behaviors[i];
      if ((behavior?.GetScratchMemorySize?.() ?? 0) > 0)
      {
        let records = this._scratchData[i];
        if (!records)
        {
          records = [];
          this._scratchData[i] = records;
        }
        records[agentIndex] = behavior.InitializeScratch();
      }
    }
  }

  // Carbon AddAgentPrivate (cpp:316-343).
  /**
   * Creates and appends one agent, initialises its scratch records, and increments the live agent count.
   */
  _AddAgentPrivate()
  {
    const agent = this._createAgent();
    this._agents.push(agent);
    this._EnsureScratchArrays();
    this._InitializeScratchForAgent(this._agents.length - 1);
    this.actualCount++;
  }

  // Carbon AddAgentsByCount (cpp:460-491).
  /**
   * Appends agents until the group reaches the requested count, initialising scratch records for each.
   */
  _AddAgentsByCount(count)
  {
    const sizeBeforeResize = this._agents.length;
    while (this._agents.length < count)
    {
      this._agents.push(this._createAgent());
    }

    this._EnsureScratchArrays();
    for (let agentIndex = sizeBeforeResize; agentIndex < this._agents.length; agentIndex++)
    {
      this._InitializeScratchForAgent(agentIndex);
    }
  }

  // Carbon RemoveAgentsByCount (cpp:499-513).
  /**
   * Truncates the agent list and every behaviour's scratch array down to the requested count.
   */
  _RemoveAgentsByCount(count)
  {
    this._agents.length = count;
    for (let i = 0; i < this.behaviors.length; i++)
    {
      const records = this._scratchData[i];
      if (records)
      {
        records.length = count;
      }
    }
  }

  /**
   * Creates an agent with default motion, rendering and lifetime state at the group's current spawn position.
   */
  _createAgent()
  {
    return {
      closestAgentInGroup: null,
      rotation: quat.create(),
      // This is because the process priority behavior can also affect where
      // drones spawn (Carbon AddAgentPrivate, cpp:318-323).
      position: vec3.clone(this.spawnPosition),
      acceleration: vec3.create(),
      velocity: vec3.create(),
      accelerationLength: 0,
      velocityLength: 0,
      target: vec3.create(),
      targetDirection: vec3.create(),
      id: Math.floor(Math.random() * 500),
      lifetime: 0,
      playFX: false,
      fxStartTime: -1,
      xfade: 0,
      isVisible: false,
      screenSize: 0
    };
  }

  // Carbon OnAgentCountChanged (cpp:376-388).
  /**
   * Flags the agent tree for rebuild, notifies the owner's buffer-resize callback, and resyncs the booster flare count.
   */
  _OnAgentCountChanged()
  {
    this._createAgentTree = true;
    if (this._changeBufferVertexCount)
    {
      this._changeBufferVertexCount();
    }

    if (this.boosters)
    {
      this.boosters.RebuildFlareBuffer?.(this.actualCount);
    }
  }

}

// BehaviorGroup_Blue.cpp: native exposure; unported contracts: ITr2LightOwner.
carbon.interfaceTable({ interfaces: [BehaviorGroup, IInitialize, INotify, IListNotify, EveEntity], chainTo: null })(BehaviorGroup, { kind: "class" });
