// Source: trinity/trinity/Eve/SpaceObject/Children/Behaviors/BehaviorGroup.h
//   trinity/trinity/Eve/SpaceObject/Children/Behaviors/BehaviorGroup.cpp
// Hand-maintained from Carbon source, promoted out of generated intake.
import { carbon, impl, io, type } from "#schema";
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
const FACING_NORMALIZED = vec3.create();
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
export class BehaviorGroup extends EveEntity
{

  #agents = [];

  // Per-behavior scratch: #scratchData[behaviorIndex] is an array of plain
  // per-agent records (behavior.InitializeScratch()) or null when the
  // behavior reports no scratch (Carbon m_scratchData raw buffers).
  #scratchData = [];

  // Behavior indexes ordered by ProcessPriority (Carbon m_sortedBehaviorIndexes).
  #sortedBehaviorIndexes = [];

  // Spatial partitioning tree (Carbon m_tree).
  #tree = null;

  // Carbon m_updatedOnce/m_createAgentTree runtime frame state.
  #updatedOnce = false;

  #createAgentTree = false;

  // Cached PlayFX behavior (Carbon m_playFXBehavior).
  #playFXBehavior = null;

  // Owner-provided buffer resize callback (Carbon m_changeBufferVertexCount).
  #changeBufferVertexCount = null;

  // Debug force collection (Carbon m_forces; pairs of position/force vec3s).
  #forces = [];

  // Reused per-frame search radii (Carbon local `ranges`).
  #ranges = [];

  // agentIndex -> vec4(position.xyz, lightScale) (Carbon m_lightInfo);
  // filled by the GPU booster-buffer path, consumed by GetLights.
  #lightInfo = new Map();

  // World transform captured by UpdateVisibility (Carbon m_parentTransform).
  #parentTransform = mat4.create();

  // Owning space object (Carbon m_parent), captured in UpdateSyncronous.
  #parent = null;

  // Base-instance indicator assigned by the behavior system (Carbon m_groupIndex).
  #groupIndex = 0;

  /** m_display (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  display = true;

  /** m_maxVelocity (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  maxVelocity = 100;

  /** m_scale (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  scale = 1;

  /** m_blendScreenSizeMax (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  blendScreenSizeMax = 15;

  /** m_blendScreenSizeMin (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  blendScreenSizeMin = 5;

  /** m_currentScreenSize (float) [READ] */
  @io.read
  @type.float32
  currentScreenSize = 0;

  /** m_renderThreshold (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  renderThreshold = 1;

  /** m_debugIntensity (float) [READWRITE] */
  @io.readwrite
  @type.float32
  debugIntensity = 0;

  /** m_debugLodLevel (float) [READWRITE] */
  @io.readwrite
  @type.float32
  debugLodLevel = 0;

  /** m_actualCount (int32_t) [READ] */
  @io.read
  @type.int32
  actualCount = 0;

  /** m_count (int32_t) [READWRITE, PERSIST] */
  @io.persist
  @type.int32
  count = 0;

  /** m_booster (BehaviorGroupBoosterPtr) [READWRITE, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.model("BehaviorGroupBooster")
  boosters = null;

  /** m_mesh (Tr2MeshPtr) [READWRITE, PERSIST, NOTIFY] */
  @io.notify
  @io.persist
  @type.model("Tr2Mesh")
  mesh = null;

  /** m_behaviorGroupName (BlueSharedString) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  name = "";

  /** m_boundingSphereRadius (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  boundingSphereRadius = 5;

  /** m_debugMode (bool) [READWRITE] */
  @io.readwrite
  @type.boolean
  debugMode = false;

  /** m_update (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  update = true;

  /** m_behaviors (PIBehaviorVector) [READ, PERSIST] */
  @io.persist
  @type.list("IBehavior")
  behaviors = [];

  /** m_spawnPosition (Vector3) [READWRITE, PERSIST] */
  @io.persist
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
    this.#EnsureScratchArrays();
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
    if (value === "mesh" || (value !== null && value === this.mesh))
    {
      this.CreateVertexDeclaration();
    }
    if ((value === "boosters" || (value !== null && value === this.boosters)) && this.boosters !== null)
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
    this.#agents.length = 0;
    for (let i = 0; i < this.#scratchData.length; i++)
    {
      if (this.#scratchData[i])
      {
        this.#scratchData[i].length = 0;
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
    this.#changeBufferVertexCount = typeof callback === "function" ? callback : null;
  }

  /** Carbon BehaviorGroup::GetSize (cpp:151-154). */
  @carbon.method
  @impl.implemented
  GetSize()
  {
    return this.#agents.length;
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
    this.#tree = new EveKDdroneManagementTree();
    this.#tree.CreateTree(this.#agents, this.behaviors.length);
    return this.#tree;
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
    this.#sortedBehaviorIndexes.length = 0;
    for (let priority = 0; priority < ProcessPriority.COUNT; priority++)
    {
      for (let index = 0; index < this.behaviors.length; index++)
      {
        if ((this.behaviors[index]?.GetProcessPriority?.() ?? ProcessPriority.LEAST_PRIORITY) === priority)
        {
          this.#sortedBehaviorIndexes.push(index);
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
    this.#groupIndex = Number(index) | 0;
  }

  /** Carbon BehaviorGroup::GetGroupIndexIndicator (cpp:263-266). */
  @carbon.method
  @impl.implemented
  GetGroupIndexIndicator()
  {
    return this.#groupIndex;
  }

  /** Carbon method AddAgent (cpp:272-278). */
  @carbon.method
  @impl.implemented
  AddAgent()
  {
    this.#AddAgentPrivate();
    this.#OnAgentCountChanged();
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

    const firstNewIndex = this.#agents.length;
    for (const position of positions)
    {
      const agent = this.#createAgent();
      vec3.copy(agent.position, position);
      this.#agents.push(agent);
    }

    this.#EnsureScratchArrays();
    for (let agentIndex = firstNewIndex; agentIndex < this.#agents.length; agentIndex++)
    {
      this.#InitializeScratchForAgent(agentIndex);
    }

    this.actualCount += positions.length;
    this.#OnAgentCountChanged();
  }

  /** Carbon method RemoveAgent (cpp:415-426). */
  @carbon.method
  @impl.adapted
  @impl.reason("Math.random replaces Carbon's TriRandInt when selecting the removed agent.")
  RemoveAgent()
  {
    if (this.#agents.length === 0)
    {
      return;
    }
    const index = Math.floor(Math.random() * this.#agents.length);
    this.RemoveSpecificAgent(index);
    this.#OnAgentCountChanged();
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
    const lastIndex = this.#agents.length - 1;
    if (index < 0 || index > lastIndex)
    {
      return;
    }

    this.#agents[index] = this.#agents[lastIndex];
    this.#agents.pop();

    for (let i = 0; i < this.behaviors.length; i++)
    {
      const records = this.#scratchData[i];
      if (!records)
      {
        continue;
      }
      records[index] = records[lastIndex];
      records.length = this.#agents.length;
    }

    this.actualCount--;
    this.#OnAgentCountChanged();
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
      this.#AddAgentsByCount(desired);
    }
    else
    {
      this.#RemoveAgentsByCount(desired);
    }

    // Carbon updates only m_actualCount here; m_count stays the authored
    // spawn count that InitializeGeometryResource restores.
    this.actualCount = desired;
    this.#OnAgentCountChanged();
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
    if (this.#sortedBehaviorIndexes.length !== this.behaviors.length)
    {
      this.SortBehaviorIndexes();
    }
    this.#EnsureScratchArrays();
    this.#SyncScratchRecords();

    if (this.#updatedOnce)
    {
      if (!this.display || !this.update)
      {
        this.#tree = null;
        return;
      }
      if (this.#agents.length === 0)
      {
        for (let i = 0; i < this.behaviors.length; i++)
        {
          const index = this.#sortedBehaviorIndexes[i];
          this.behaviors[index]?.CalculateBehavior?.(this.#agents, this.#scratchData[index], deltaTime, this, system, EMPTY_SEARCH_TREE);
        }
        return;
      }
    }
    if (this.#tree === null)
    {
      this.CreateAgentTree();
    }

    const ranges = this.#ranges;
    ranges.length = 0;
    const boundingRadius = this.boundingSphereRadius * this.scale;
    for (const behavior of this.behaviors)
    {
      const searchRadius = behavior?.GetBehaviorSearchRadius?.() ?? -1;
      ranges.push(searchRadius === -1 ? -1 : searchRadius + boundingRadius);
    }

    const dronesInRange = this.#tree.FindDronesInRange(this.#agents, ranges, boundingRadius);

    // Calculate the behaviors
    if (this.collectForces)
    {
      this.#forces.length = 0;
      for (let i = 0; i < this.behaviors.length; i++)
      {
        const index = this.#sortedBehaviorIndexes[i];
        const forces = this.behaviors[index]?.CalculateBehavior?.(this.#agents, this.#scratchData[index], deltaTime, this, system, dronesInRange[index] ?? EMPTY_SEARCH_TREE);
        if (Array.isArray(forces))
        {
          for (const force of forces)
          {
            this.#forces.push(force);
          }
        }
      }
    }
    else
    {
      for (let i = 0; i < this.behaviors.length; i++)
      {
        const index = this.#sortedBehaviorIndexes[i];
        this.behaviors[index]?.CalculateBehavior?.(this.#agents, this.#scratchData[index], deltaTime, this, system, dronesInRange[index] ?? EMPTY_SEARCH_TREE);
      }
    }

    // Move the agents based on the behaviors
    const maxVelocitySq = Math.max(1, this.maxVelocity * this.maxVelocity);
    for (const agent of this.#agents)
    {
      agent.lifetime += deltaTime;

      vec3.scaleAndAdd(agent.velocity, agent.velocity, agent.acceleration, deltaTime);

      vec3.transformQuat(INTEREST_POINT, Z_AXIS, agent.rotation);
      vec3.lerp(ACTUAL_FACING, INTEREST_POINT, agent.velocity, vec3.squaredLength(agent.velocity) / maxVelocitySq);

      // Carbon TriQuaternionRotationArc(zAxis -> actualFacingDir); rotationTo
      // needs unit vectors, and a zero facing keeps the previous rotation.
      vec3.normalize(FACING_NORMALIZED, ACTUAL_FACING);
      if (vec3.squaredLength(FACING_NORMALIZED) > 0)
      {
        quat.rotationTo(agent.rotation, Z_AXIS, FACING_NORMALIZED);
      }
      vec3.copy(agent.targetDirection, ACTUAL_FACING);

      ClampLength(agent.velocity, this.maxVelocity);
      vec3.scaleAndAdd(agent.position, agent.position, agent.velocity, deltaTime);
      vec3.set(agent.acceleration, 0, 0, 0);
    }

    this.#tree.UpdateTree(deltaTime);

    // we always want to update the behaviors at least once, otherwise
    // behaviors like SpawnDrones won't get to spawn the drones
    this.#updatedOnce = true;
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
    const blendModifier = this.#GetBlendModifier();

    for (const agent of this.#agents)
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

    mat4.copy(this.#parentTransform, worldTransform);
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
    for (const agent of this.#agents)
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
    if (this.#playFXBehavior !== null)
    {
      this.#playFXBehavior.GetRenderables(renderables);
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

    if (this.#playFXBehavior !== null)
    {
      this.#playFXBehavior.UpdateAsyncronous(updateContext, this.#parentTransform);
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
    if (this.#createAgentTree === true)
    {
      this.CreateAgentTree();
      this.#createAgentTree = false;
    }

    if (this.#playFXBehavior !== null)
    {
      this.#playFXBehavior.UpdateSyncronous(updateContext);
    }

    if (this.#parent === null && params?.spaceObjectParent)
    {
      this.#parent = params.spaceObjectParent;
    }
  }

  /** Carbon BehaviorGroup::GetParent (cpp:927-930). */
  @carbon.method
  @impl.implemented
  GetParent()
  {
    return this.#parent;
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
    return this.#tree;
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
      if (registry && this.#playFXBehavior)
      {
        this.#playFXBehavior.UnRegister?.(registry);
      }
      this.#playFXBehavior = behavior;
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
      for (const [agentIndex, info] of this.#lightInfo)
      {
        this.boosters.AddLight?.(lightManager, info, info[3], agentIndex, this.#parentTransform);
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
      this.#playFXBehavior?.Register?.(registry);
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
      this.#playFXBehavior?.UnRegister?.(registry);
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

    if (this.#playFXBehavior !== null)
    {
      this.#playFXBehavior.RegisterWithQuadRenderer?.(quadRenderer);
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

      if (this.#playFXBehavior !== null)
      {
        this.#playFXBehavior.AddQuadsToQuadRenderer?.(frustum, quadRenderer);
      }
    }
  }

  /** Returns the portable DroneAgent records in stable instance order. */
  @impl.adapted
  GetAgents()
  {
    return this.#agents;
  }

  /** Returns the collected debug force pairs (Carbon m_forces). */
  @impl.adapted
  GetForces()
  {
    return this.#forces;
  }

  // Carbon GetBlendModifier (cpp:628-631).
  /**
   * The reciprocal of the mesh-to-sprite blend screen-size range, used to interpolate an agent's crossfade.
   */
  #GetBlendModifier()
  {
    return 1 / Math.max(0.0001, this.blendScreenSizeMax - this.blendScreenSizeMin);
  }

  // Grows the per-behavior scratch shells to the behavior count (Carbon
  // resizes m_scratchData wherever agents are added).
  /**
   * Grows the per-behaviour scratch array so it has one slot per behaviour in the group.
   */
  #EnsureScratchArrays()
  {
    while (this.#scratchData.length < this.behaviors.length)
    {
      this.#scratchData.push(null);
    }
  }

  // Fills any missing per-agent scratch records and trims removed ones -
  // the JS stand-in for Carbon's behavior-list OnListModified handler
  // (cpp:77-118), which resizes scratch when behaviors join or leave.
  /**
   * Adds missing per-agent scratch records and trims stale ones for every behaviour that needs scratch storage.
   */
  #SyncScratchRecords()
  {
    for (let i = 0; i < this.behaviors.length; i++)
    {
      const behavior = this.behaviors[i];
      if ((behavior?.GetScratchMemorySize?.() ?? 0) > 0)
      {
        let records = this.#scratchData[i];
        if (!records)
        {
          records = [];
          this.#scratchData[i] = records;
        }
        for (let j = records.length; j < this.#agents.length; j++)
        {
          records[j] = behavior.InitializeScratch();
        }
        records.length = this.#agents.length;
      }
    }
  }

  // Initializes every scratch-owning behavior's record for one agent index
  // (Carbon InitializeScratch over the raw buffer at size * agentIndex).
  /**
   * Initialises the scratch record for one agent index in every behaviour that uses scratch storage.
   */
  #InitializeScratchForAgent(agentIndex)
  {
    for (let i = 0; i < this.behaviors.length; i++)
    {
      const behavior = this.behaviors[i];
      if ((behavior?.GetScratchMemorySize?.() ?? 0) > 0)
      {
        let records = this.#scratchData[i];
        if (!records)
        {
          records = [];
          this.#scratchData[i] = records;
        }
        records[agentIndex] = behavior.InitializeScratch();
      }
    }
  }

  // Carbon AddAgentPrivate (cpp:316-343).
  /**
   * Creates and appends one agent, initialises its scratch records, and increments the live agent count.
   */
  #AddAgentPrivate()
  {
    const agent = this.#createAgent();
    this.#agents.push(agent);
    this.#EnsureScratchArrays();
    this.#InitializeScratchForAgent(this.#agents.length - 1);
    this.actualCount++;
  }

  // Carbon AddAgentsByCount (cpp:460-491).
  /**
   * Appends agents until the group reaches the requested count, initialising scratch records for each.
   */
  #AddAgentsByCount(count)
  {
    const sizeBeforeResize = this.#agents.length;
    while (this.#agents.length < count)
    {
      this.#agents.push(this.#createAgent());
    }

    this.#EnsureScratchArrays();
    for (let agentIndex = sizeBeforeResize; agentIndex < this.#agents.length; agentIndex++)
    {
      this.#InitializeScratchForAgent(agentIndex);
    }
  }

  // Carbon RemoveAgentsByCount (cpp:499-513).
  /**
   * Truncates the agent list and every behaviour's scratch array down to the requested count.
   */
  #RemoveAgentsByCount(count)
  {
    this.#agents.length = count;
    for (let i = 0; i < this.behaviors.length; i++)
    {
      const records = this.#scratchData[i];
      if (records)
      {
        records.length = count;
      }
    }
  }

  /**
   * Creates an agent with default motion, rendering and lifetime state at the group's current spawn position.
   */
  #createAgent()
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
  #OnAgentCountChanged()
  {
    this.#createAgentTree = true;
    if (this.#changeBufferVertexCount)
    {
      this.#changeBufferVertexCount();
    }

    if (this.boosters)
    {
      this.boosters.RebuildFlareBuffer?.(this.actualCount);
    }
  }

}
