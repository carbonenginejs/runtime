import { random as carbonRandom } from "#math/random";
// Source: trinity/trinity/Eve/SpaceObject/Children/Behaviors/BehaviorGroup.h
import { IsMatch, BlueList } from "#blue";
import { IBehavior } from "./IBehavior.js";
import { IListNotify } from "../../../../global/blue/IListNotify.js";
import { INotify } from "../../../../global/blue/INotify.js";
import { IInitialize } from "../../../../global/blue/IInitialize.js";
//   trinity/trinity/Eve/SpaceObject/Children/Behaviors/BehaviorGroup.cpp
// Hand-maintained from Carbon source, promoted out of generated intake.
import { CjsSchema, meta, type, blue } from "#schema";
import { ITr2LightOwner } from "../../lights/ITr2LightOwner.js";
import { EveEntity } from "../../EveEntity.js";
import { mat4 } from "#math/mat4";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { color } from "#math/color";
import { ITr2DebugRenderer2, Tr2DebugColor, Tr2DebugObjectReference } from "#interfaces";
import { BLUELISTEVENT } from "#consts/blue";
import { ProcessPriority } from "./enums.js";
import { EveKDdroneManagementTree } from "../../../eve/child/behaviors/EveKDdroneManagementTree.js";
import { PlayFX } from "./PlayFX.js";
import { CarbonVertexElements } from "../../../core/vertex/vertexUsage.js";
import { Tr2VertexDefinition } from "../../../core/vertex/Tr2VertexDefinition/index.js";
import { Tr2EffectStateManager } from "../../../shader/Tr2EffectStateManager.js";
import { EveComponentType } from "../../EntityComponents.js";

// Module scratch for the per-agent integration and visibility loops (child
// updates run sequentially; non-reentrant by design).
const Z_AXIS = vec3.fromValues(0, 0, 1);
const INTEREST_POINT = vec3.create();
const ACTUAL_FACING = vec3.create();
const AGENT_SPHERE = vec4.create();
const EMPTY_SEARCH_TREE = [];
const INSTANCE_POSE = mat4.create();
const AGENT_WORLD = mat4.create();
const BOOSTER_POSITION = vec3.create();
const IDENTITY = mat4.create();

// Debug-draw scratch (debug drawing runs sequentially).
const DEBUG_TRANSFORM = mat4.create();
const DEBUG_ROTATION = quat.create();
const DEBUG_UNIT_SCALE = vec3.fromValues(1, 1, 1);
const DEBUG_AXIS_SCALE = vec3.fromValues(100, 100, 100);
const DEBUG_SCALE = vec3.create();
const DEBUG_POINT = vec3.create();
const DEBUG_POINT_END = vec3.create();
const DEBUG_SLOW_COLOR = color.fromARGB(color.create(), 0xff11ff11);
const DEBUG_FAST_COLOR = color.fromARGB(color.create(), 0xffff1111);
const DEBUG_COLOR = color.create();

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
@blue.define("BehaviorGroup")
@blue.inherit(IInitialize, INotify, IListNotify, ITr2LightOwner)
@blue.interface(IInitialize, INotify, IListNotify, EveEntity, ITr2LightOwner)
export class BehaviorGroup extends EveEntity
{

  _agents = [];

  _cachedVD = null;

  _vertexDeclarationHandle = Tr2EffectStateManager.Unknown;

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
  @blue.readwrite
  @blue.persist
  @type.boolean
  display = true;

  /** m_maxVelocity (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  maxVelocity = 100;

  /** m_scale (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  scale = 1;

  /** m_blendScreenSizeMax (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  blendScreenSizeMax = 15;

  /** m_blendScreenSizeMin (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  blendScreenSizeMin = 5;

  /** m_currentScreenSize (float) [READ] */
  @blue.read
  @type.float32
  currentScreenSize = 0;

  /** m_renderThreshold (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  renderThreshold = 1;

  /** m_debugIntensity (float) [READWRITE] */
  @blue.readwrite
  @type.float32
  debugIntensity = 0;

  /** m_debugLodLevel (float) [READWRITE] */
  @blue.readwrite
  @type.float32
  debugLodLevel = 0;

  /** m_actualCount (int32_t) [READ] */
  @blue.read
  @type.int32
  actualCount = 0;

  /** m_count (int32_t) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.int32
  count = 0;

  /** m_booster (BehaviorGroupBoosterPtr) [READWRITE, PERSIST, NOTIFY] */
  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.rootRef("BehaviorGroupBooster")
  boosters = null;

  /** m_mesh (Tr2MeshPtr) [READWRITE, PERSIST, NOTIFY] */
  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.rootRef("Tr2Mesh")
  mesh = null;

  /** m_behaviorGroupName (BlueSharedString) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.string
  name = "";

  /** m_boundingSphereRadius (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  boundingSphereRadius = 5;

  /** m_debugMode (bool) [READWRITE] */
  @blue.readwrite
  @type.boolean
  debugMode = false;

  /** m_update (bool) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.boolean
  update = true;

  /** m_behaviors (PIBehaviorVector) [READ, PERSIST] */
  @blue.read
  @blue.persist
  @type.list("IBehavior")
  behaviors = new BlueList(IBehavior, { className: null, listOps: 0 });

  /** m_spawnPosition (Vector3) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.vec3
  spawnPosition = vec3.create();

  /** m_collectForces (bool) - debug toggle read by the behaviors. */
  @type.boolean
  collectForces = false;

  /**
   * Carbon BehaviorGroup.cpp:40 registers the typed behavior list's observer.
   * Keeping IList storage lets bulk readers mute inserts and send LOADFINISHED;
   * treating authored loading as live edits accesses incomplete scratch slots.
   */
  constructor()
  {
    super();
    this.behaviors.SetNotify(this);
  }

  /**
   * Carbon BehaviorGroup::Initialize (cpp:45-57).
   *
   * Adapted: the vertex declaration comes through the effect-state manager, and the agent scratch and flare storage
   * are the group's own arrays.
   */
  @blue.method
  @meta.adapted
  Initialize()
  {
    this._EnsureScratchArrays();
    this.CreateVertexDeclaration();

    if (this.boosters)
    {
      this.boosters.RebuildFlareBuffer(this.count);
    }

    this.SetPlayFXBehavior();
    return true;
  }

  /**
   * Carbon BehaviorGroup::OnModified (cpp:59-71): a mesh change refreshes the vertex declaration and a booster change
   * re-syncs the flare count.
   */
  @blue.method
  @meta.implemented
  OnModified(value = null)
  {
    if (IsMatch(value, "mesh"))
    {
      this.CreateVertexDeclaration();
    }
    if ((IsMatch(value, "boosters")) && this.boosters !== null)
    {
      this.boosters.RebuildFlareBuffer(this.actualCount);
    }
    return true;
  }

  /**
   * Carbon BehaviorGroup.cpp:77-118: maintain behavior scratch slots, then
   * regenerate agents on every list notification, including load completion.
   * Adapted: per-agent records replace native scratch-memory byte buffers.
   */
  @blue.method
  @meta.adapted
  OnListModified(event, key = 0, key2 = 0, _value = null, list = null)
  {
    if (list === this.behaviors && (event & BLUELISTEVENT.BELIST_LOADING) === 0)
    {
      switch (event & BLUELISTEVENT.BELIST_EVENTMASK)
      {
        case BLUELISTEVENT.BELIST_INSERTED:
        {
          this._scratchData.splice(key, 0, null);
          if (this._agents.length && this.behaviors[key].GetScratchMemorySize() > 0)
          {
            this._scratchData[key] = this._agents.map(() => this.behaviors[key].InitializeScratch());
          }
          this.CreateAgentTree();
          break;
        }
        case BLUELISTEVENT.BELIST_REMOVED:
          this._scratchData.splice(key, 1);
          this.CreateAgentTree();
          break;
        case BLUELISTEVENT.BELIST_SWAPPED:
          [this._scratchData[key], this._scratchData[key2]] = [this._scratchData[key2], this._scratchData[key]];
          break;
        case BLUELISTEVENT.BELIST_UNLOADSTART:
          this._scratchData.length = 0;
          break;
      }
    }
    this.InitializeGeometryResource();
  }

  /**
   * Regenerates the agents from scratch: clears them, re-sorts the behavior
   * indexes, and re-adds m_count agents (Carbon InitializeGeometryResource,
   * cpp:126-140). Behaviors like SpawnDrones use this as a full reset.
   */
  @blue.method
  @meta.implemented
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
  @blue.method
  @meta.implemented
  SetVertexFunctionReferance(callback)
  {
    this._changeBufferVertexCount = callback;
  }

  /** Carbon BehaviorGroup::GetSize (cpp:151-154). */
  @blue.method
  @meta.implemented
  GetSize()
  {
    return this._agents.length;
  }

  /** Carbon BehaviorGroup::GetCount (cpp:160-163). */
  @blue.method
  @meta.implemented
  GetCount()
  {
    return this.actualCount;
  }

  /** Carbon method CreateAgentTree (cpp:169-177). */
  @blue.method
  @meta.implemented
  CreateAgentTree()
  {
    this._tree = new EveKDdroneManagementTree();
    this._tree.CreateTree(this._agents, this.behaviors.length);
    return this._tree;
  }

  /** Carbon BehaviorGroup::GetBehaviorByName (cpp:187-197). */
  @blue.method
  @meta.implemented
  GetBehaviorByName(name)
  {
    const target = String(name ?? "");
    for (const behavior of this.behaviors)
    {
      if (target === behavior.GetBehaviorName())
      {
        return behavior;
      }
    }
    return null;
  }

  /** Carbon BehaviorGroup::SortBehaviorIndexes (cpp:206-221). */
  @blue.method
  @meta.implemented
  SortBehaviorIndexes()
  {
    this._sortedBehaviorIndexes.length = 0;
    for (let priority = 0; priority < ProcessPriority.COUNT; priority++)
    {
      for (let index = 0; index < this.behaviors.length; index++)
      {
        if (this.behaviors[index].GetProcessPriority() === priority)
        {
          this._sortedBehaviorIndexes.push(index);
        }
      }
    }
  }

  /** Carbon BehaviorGroup::GetMesh (cpp:227-230). */
  @blue.method
  @meta.implemented
  GetMesh()
  {
    return this.mesh;
  }

  /** Carbon BehaviorGroup::GetMaxVelocity (cpp:236-239). */
  @blue.method
  @meta.implemented
  GetMaxVelocity()
  {
    return this.maxVelocity;
  }

  /** Carbon BehaviorGroup::SetGroupIndexIndicator (cpp:254-257). */
  @blue.method
  @meta.implemented
  SetGroupIndexIndicator(index)
  {
    this._groupIndex = Number(index) | 0;
  }

  /** Carbon BehaviorGroup::GetGroupIndexIndicator (cpp:263-266). */
  @blue.method
  @meta.implemented
  GetGroupIndexIndicator()
  {
    return this._groupIndex;
  }

  /** Carbon method AddAgent (cpp:272-278). */
  @blue.method
  @meta.implemented
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
  @blue.method
  @meta.implemented
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

  /**
   * Carbon method RemoveAgent (cpp:415-426).
   *
   * Random draws delegate to the matching generator in global/math/random.js.
   */
  @blue.method
  @meta.adapted
  RemoveAgent()
  {
    if (this._agents.length === 0)
    {
      return;
    }
    const index = carbonRandom.triRandInt(this._agents.length);
    this.RemoveSpecificAgent(index);
    this._OnAgentCountChanged();
  }

  /**
   * Swap-with-last removal that keeps every behavior's per-agent scratch
   * record aligned (Carbon RemoveSpecificAgent, cpp:432-452).
   * @param {Number} index
   */
  @blue.method
  @meta.implemented
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
  @blue.method
  @meta.implemented
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
  @blue.method
  @meta.implemented
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
          this.behaviors[index].CalculateBehavior(this._agents, this._scratchData[index], deltaTime, this, system, EMPTY_SEARCH_TREE);
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
      const searchRadius = behavior.GetBehaviorSearchRadius();
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
        const forces = this.behaviors[index].CalculateBehavior(this._agents, this._scratchData[index], deltaTime, this, system, dronesInRange[index] ?? EMPTY_SEARCH_TREE);
        for (const force of forces)
        {
          this._forces.push(force);
        }
      }
    }
    else
    {
      for (let i = 0; i < this.behaviors.length; i++)
      {
        const index = this._sortedBehaviorIndexes[i];
        this.behaviors[index].CalculateBehavior(this._agents, this._scratchData[index], deltaTime, this, system, dronesInRange[index] ?? EMPTY_SEARCH_TREE);
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
   * @param {EveUpdateContext} updateContext - frame context
   * @param {Float32Array} worldTransform - owning system's world transform
   */
  @blue.method
  @meta.implemented
  UpdateVisibility(updateContext, worldTransform)
  {
    this.currentScreenSize = 0;
    let worldRadius = 1;

    const frustum = updateContext.GetFrustum();
    const boundingRadius = this.boundingSphereRadius * this.scale;
    const blendModifier = this._GetBlendModifier();

    for (const agent of this._agents)
    {
      vec3.transformMat4(AGENT_SPHERE, agent.position, worldTransform);
      AGENT_SPHERE[3] = boundingRadius;
      if (frustum.IsSphereVisible(AGENT_SPHERE))
      {
        const pixelSize = frustum.GetPixelSizeAccross(AGENT_SPHERE);
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
    this.mesh.UseWithScreenSize(this.currentScreenSize, worldRadius);

    mat4.copy(this._parentTransform, worldTransform);
  }

  /** Carbon BehaviorGroup::IsGroupVisible (cpp:683-686). */
  @blue.method
  @meta.implemented
  IsGroupVisible()
  {
    return this.currentScreenSize >= this.renderThreshold;
  }

  /**
   * 1 if every agent lodded out to a sprite, 0 if every agent is a mesh,
   * -1 when mixed or empty (Carbon AllTheSame, cpp:397-409).
   */
  @blue.method
  @meta.implemented
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

  /**
   * Carbon GetShipInfoForBuffer: current and previous local poses, each packed
   * as three float4 rows. The optional float offset replaces a native pointer.
   * Parent placement is deliberately left to the per-object constants.
   */
  @blue.method
  @meta.adapted
  GetShipInfoForBuffer(data, _parentWorldLocation, offset = 0)
  {
    this._lightInfo.clear();
    data.fill(0, offset, offset + this._agents.length * 24);
    if (this.currentScreenSize === 0) return;
    for (const agent of this._agents)
    {
      const lod = this.debugMode ? this.debugLodLevel : agent.xfade;
      mat4.fromRotationTranslation(INSTANCE_POSE, agent.rotation, agent.position);
      if (agent.isVisible && this.display && lod < 0.75)
      {
        const scale = this.scale * (1 - lod) * (0.5 + (1 - lod) * 0.5);
        // Carbon Transpose(ScalingMatrix(scale) * pose): scale first;
        // gl-matrix's equivalent is pose * scale, packed column-stride.
        for (let row = 0; row < 3; row++)
        {
          for (let column = 0; column < 3; column++)
          {
            data[offset + row * 4 + column] = INSTANCE_POSE[column * 4 + row] * scale;
            data[offset + 12 + row * 4 + column] = agent.lastTransform[column * 4 + row] * scale;
          }
          data[offset + row * 4 + 3] = INSTANCE_POSE[12 + row];
          data[offset + 12 + row * 4 + 3] = agent.lastTransform[12 + row];
        }
      }
      mat4.copy(agent.lastTransform, INSTANCE_POSE);
      offset += 24;
    }
  }

  /**
   * Carbon GetBoosterInfoForBuffer packs position, rotation and intensity/phase/
   * atlas indices, and updates the group's lights and flares. The per-ID phase
   * uses Carbon's shared CRT stream and preserves srand's effect on later callers.
   * A float offset replaces native byte-pointer arithmetic.
   */
  @blue.method
  @meta.adapted
  GetBoosterInfoForBuffer(data, parentWorldLocation, offset = 0)
  {
    this._lightInfo.clear();
    data.fill(0, offset, offset + this._agents.length * 12);
    if (this.currentScreenSize === 0) return;
    for (let index = 0; index < this._agents.length; index++, offset += 12)
    {
      const agent = this._agents[index];
      if (!agent.isVisible || !this.display)
      {
        if (this.boosters && this.display) this.boosters.AddFlare(IDENTITY, 0, 0, index, 0, 0);
        continue;
      }
      // Carbon writes an identity quaternion even when no booster is authored.
      data[offset + 7] = 1;
      if (!this.boosters) continue;
      const lod = this.debugMode ? this.debugLodLevel : agent.xfade;
      mat4.fromRotationTranslation(INSTANCE_POSE, agent.rotation, agent.position);
      vec3.copy(BOOSTER_POSITION, agent.position);
      const intensity = this.debugMode ? this.debugIntensity : vec3.length(agent.velocity) / Math.max(1, this.maxVelocity);
      if (lod < 0.3)
      {
        vec3.scale(BOOSTER_POSITION, this.boosters.GetOffset(), this.scale);
        vec3.transformMat4(BOOSTER_POSITION, BOOSTER_POSITION, INSTANCE_POSE);
        data[offset + 8] = intensity;
        carbonRandom.crtSrand(agent.id);
        data[offset + 9] = carbonRandom.triFloatRandom01();
        data[offset + 10] = this.boosters.GetAtlasIndex0();
        data[offset + 11] = this.boosters.GetAtlasIndex1();
        if (lod < 0.25)
        {
          const lightScale = intensity * (1 - 4 * lod) * (2 * lod + 1) * this.scale;
          this._lightInfo.set(index, vec4.fromValues(...BOOSTER_POSITION, lightScale)); // alloc: native light-map value survives packing until light collection.
        }
      }
      data.set(BOOSTER_POSITION, offset);
      data[offset + 3] = this.scale;
      data.set(agent.rotation, offset + 4);
      // Carbon agentTransform * parentWorldLocation: agent first, reverse in gl.
      mat4.multiply(AGENT_WORLD, parentWorldLocation, INSTANCE_POSE);
      this.boosters.AddFlare(AGENT_WORLD, lod, intensity, index, this.boundingSphereRadius, this.scale);
    }
  }

  /**
   * Carbon CreateVertexDeclaration appends TEXCOORD8..13 in instance stream1.
   * Adapted: the resource's stable decoded elements identify the cached layout;
   * the existing CarbonVertexElements bridge translates its CMF vocabulary.
   */
  @blue.method
  @meta.adapted
  CreateVertexDeclaration()
  {
    const geometry = this.mesh ? this.mesh.GetGeometryResource() : null;
    if (this.mesh && !geometry) return;
    if (geometry && geometry.IsGood())
    {
      const elements = CarbonVertexElements(geometry.GetMeshVertexElements(this.mesh.GetMeshIndex()));
      if (elements !== this._cachedVD)
      {
        const instances = new Tr2VertexDefinition();
        for (let index = 8; index <= 13; index++) instances.Add("FLOAT32_4", "TEXCOORD", index, 1, 1);
        this._vertexDeclarationHandle = Tr2EffectStateManager.getVertexDeclarationHandle([...elements, ...instances.items]);
        this._cachedVD = elements;
      }
      return;
    }
    this._cachedVD = null;
    this._vertexDeclarationHandle = Tr2EffectStateManager.Unknown;
  }

  /** Carbon BehaviorGroup.h returns the merged vertex declaration handle. */
  @blue.method
  @meta.implemented
  GetVertexDeclarationHandle()
  {
    return this._vertexDeclarationHandle;
  }

  /** Carbon BehaviorGroup::GetRenderables (cpp:871-877): PlayFX effects only. */
  @blue.method
  @meta.implemented
  GetRenderables(renderables = [])
  {
    if (this._playFXBehavior !== null)
    {
      this._playFXBehavior.GetRenderables(renderables);
    }
    return renderables;
  }

  /** Carbon BehaviorGroup::UpdateAsyncronous (cpp:883-894): PlayFX fan-out. */
  @blue.method
  @meta.implemented
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
  @blue.method
  @meta.implemented
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
  @blue.method
  @meta.implemented
  GetParent()
  {
    return this._parent;
  }

  /**
   * Carbon BehaviorGroup::GetDebugOptions (cpp:934-951): the group's own
   * options, the booster ones when it has a booster, then every behavior's.
   * @param {Set<string>} options The caller-owned option set.
   */
  @blue.method
  @meta.implemented
  GetDebugOptions(options)
  {
    options.add("AgentsKDTree");
    options.add("Bounding Sphere");
    options.add("DebugBehaviors");
    options.add("AgentRotation");

    if (this.boosters !== null)
    {
      options.add("Boosters");
      options.add("Lights");
    }

    for (const group of this.behaviors)
    {
      group.GetDebugOptions(options);
    }
  }

  /** Carbon BehaviorGroup::GetBoundingSphereRadius (cpp:953-956). */
  @blue.method
  @meta.implemented
  GetBoundingSphereRadius()
  {
    return this.boundingSphereRadius * this.scale;
  }

  /** Carbon BehaviorGroup::GetKDTree (cpp:958-961). */
  @blue.method
  @meta.implemented
  GetKDTree()
  {
    return this._tree;
  }

  /** Carbon BehaviorGroup::GetBooster (cpp:963-966). */
  @blue.method
  @meta.implemented
  GetBooster()
  {
    return this.boosters;
  }

  /** Carbon BehaviorGroup::SetPlayFXBehavior (cpp:968-988): caches the PlayFX
   * behavior and swaps its component registration. The cast is Carbon's
   * dynamic_cast<PlayFX*> (cpp:973): the behaviors list is typed
   * IBehavior and resolved by string name, so a mis-named behavior of another
   * class must never land in the PlayFX slot. */
  @blue.method
  @meta.implemented
  SetPlayFXBehavior()
  {
    // PlayFX is an EveEntity, so Carbon's BlueCastPtr to one (cpp:977, 982) only tests for null.
    const behavior = CjsSchema.cast(this.GetBehaviorByName("PlayFX"), PlayFX);
    if (behavior)
    {
      const registry = this.GetComponentRegistry();
      if (registry && this._playFXBehavior)
      {
        this._playFXBehavior.UnRegister(registry);
      }
      this._playFXBehavior = behavior;
      if (registry)
      {
        behavior.Register(registry);
      }
    }
  }

  /**
   * Registers the booster light records with the light manager
   * (Carbon GetLights, cpp:990-1001). The #lightInfo map is populated by the
   * booster instance-buffer fill, which is a GPU seam - until that path runs
   * the map stays empty and no lights register.
   * @param {Object} lightManager
   */
  @blue.method
  @meta.implemented
  GetLights(lightManager)
  {
    if (this.boosters && this.boosters.GetDisplay())
    {
      for (const [agentIndex, info] of this._lightInfo)
      {
        this.boosters.AddLight(lightManager, info, info[3], agentIndex, this._parentTransform);
      }
    }
  }

  /** ITr2LightOwner::AddLight - intentionally empty in Carbon (h:116). */
  @blue.method
  @meta.noop
  AddLight(_light)
  {
  }

  /** ITr2LightOwner::ClearLights - intentionally empty in Carbon (h:117). */
  @blue.method
  @meta.noop
  ClearLights()
  {
  }

  /** Carbon BehaviorGroup::RegisterComponents (cpp:1003-1015): unconditional
   * LightOwner (Carbon's verbatim "LightOwner" component name,
   * Lights/ITr2LightOwner.h:18), then forwards the PlayFX behavior. */
  @blue.method
  @meta.implemented
  RegisterComponents()
  {
    const registry = this.GetComponentRegistry();
    if (registry)
    {
      registry.RegisterComponent(EveComponentType.LightOwner, this);
      if (this._playFXBehavior)
      {
        this._playFXBehavior.Register(registry);
      }
    }
  }

  /** Carbon BehaviorGroup::UnRegisterComponents (cpp:1017-1027). */
  @blue.method
  @meta.implemented
  UnRegisterComponents()
  {
    const registry = this.GetComponentRegistry();
    if (registry)
    {
      if (this._playFXBehavior)
      {
        this._playFXBehavior.UnRegister(registry);
      }
    }
  }

  /** Carbon BehaviorGroup::RegisterWithQuadRenderer (cpp:1029-1040): CPU
   * fan-out to the booster and PlayFX quad owners. */
  @blue.method
  @meta.implemented
  RegisterWithQuadRenderer(quadRenderer)
  {
    if (this.boosters)
    {
      this.boosters.RegisterWithQuadRenderer(quadRenderer);
    }

    if (this._playFXBehavior !== null)
    {
      this._playFXBehavior.RegisterWithQuadRenderer(quadRenderer);
    }
  }

  /** Carbon BehaviorGroup::AddQuadsToQuadRenderer (cpp:1043-1059): CPU
   * fan-out, gated on display and group visibility. */
  @blue.method
  @meta.implemented
  AddQuadsToQuadRenderer(frustum, quadRenderer)
  {
    if (this.display && this.IsGroupVisible())
    {
      if (this.boosters && this.boosters.GetDisplay())
      {
        this.boosters.AddQuadsToQuadRenderer(frustum, quadRenderer);
      }

      if (this._playFXBehavior !== null)
      {
        this._playFXBehavior.AddQuadsToQuadRenderer(frustum, quadRenderer);
      }
    }
  }

  /**
   * Carbon BehaviorGroup::RenderDebugInfo (cpp:1061-1154): every behavior's
   * debug geometry, then the group's own - the k-d tree, bounding spheres and
   * boosters per agent, the collected force lines, booster lights and agent
   * axes. Turning "DebugBehaviors" on starts force collection for the next
   * update; turning it off stops it.
   * @param {ITr2DebugRenderer2} renderer
   * @param {mat4} parentWorldLocation Places the agents in world space.
   */
  @blue.method
  @meta.implemented
  RenderDebugInfo(renderer, parentWorldLocation)
  {
    const { Wireframe } = ITr2DebugRenderer2.Effect;
    if (!this.display)
    {
      return;
    }
    for (const behavior of this.behaviors)
    {
      behavior.RenderDebugInfo(renderer, this._agents, parentWorldLocation);
    }

    if (renderer.HasOption(this, "AgentsKDTree"))
    {
      if (this._tree !== null)
      {
        this._tree.RenderDebugInfo(renderer, parentWorldLocation);
      }
      else
      {
        this.CreateAgentTree();
      }
    }

    const drawBS = renderer.HasOption(this, "Bounding Sphere");
    const drawBoosters = renderer.HasOption(this, "Boosters") && this.boosters !== null;

    if (drawBoosters || drawBS)
    {
      for (const agent of this._agents)
      {
        if (drawBS)
        {
          // Carbon (row-vector): TranslationMatrix( agent->position ) * parentWorldLocation.
          mat4.translate(DEBUG_TRANSFORM, parentWorldLocation, agent.position);
          renderer.DrawSphere__TransformRadius(Tr2DebugObjectReference.create__Object(this), DEBUG_TRANSFORM, this.boundingSphereRadius * this.scale, 8, Wireframe, Tr2DebugColor.create__Uint32(0xffff00ff));
        }
        if (drawBoosters)
        {
          // Carbon (row-vector): TransformationMatrix( Vector3( 1, 1, 1 ), agent->rotation, agent->position ) * parentWorldLocation.
          mat4.fromRotationTranslationScale(DEBUG_TRANSFORM, agent.rotation, agent.position, DEBUG_UNIT_SCALE);
          mat4.multiply(DEBUG_TRANSFORM, parentWorldLocation, DEBUG_TRANSFORM);
          this.boosters.RenderBoosterDebug(renderer, Tr2DebugObjectReference.create__Object(this), DEBUG_TRANSFORM);
        }
      }
    }

    if (renderer.HasOption(this, "DebugBehaviors"))
    {
      if (this.collectForces)
      {
        let loopToggle = true;
        const point = DEBUG_POINT;
        for (const force of this._forces)
        {
          if (loopToggle)
          {
            // Carbon ( *force ) + parentWorldLocation.GetTranslation().
            vec3.add(point, force, mat4.getTranslation(DEBUG_POINT_END, parentWorldLocation));
            loopToggle = false;
          }
          else
          {
            const lengthLerp = Math.min(1, Math.max(0, vec3.length(force) / this.maxVelocity));
            // Carbon Lerp( Color( 0xff11ff11 ), Color( 0xffff1111 ), lengthLerp ), componentwise.
            color.lerp(DEBUG_COLOR, DEBUG_SLOW_COLOR, DEBUG_FAST_COLOR, lengthLerp);
            renderer.DrawLine(Tr2DebugObjectReference.create__Object(this), point, vec3.add(DEBUG_POINT_END, point, force), Tr2DebugColor.create__Color(DEBUG_COLOR));
            loopToggle = true;
          }
        }
      }
      else
      {
        this.collectForces = true;
      }
    }
    else
    {
      this.collectForces = false;
    }

    if (renderer.HasOption(this, "Lights"))
    {
      const iq = quat.identity(DEBUG_ROTATION);
      const scale = DEBUG_UNIT_SCALE;

      for (const info of this._lightInfo.values())
      {
        // Carbon (row-vector): TransformationMatrix( info.w * scale, iq, info.GetXYZ() ) * parentWorldLocation.
        vec3.scale(DEBUG_SCALE, scale, info[3]);
        vec3.set(DEBUG_POINT, info[0], info[1], info[2]);
        mat4.fromRotationTranslationScale(DEBUG_TRANSFORM, iq, DEBUG_POINT, DEBUG_SCALE);
        mat4.multiply(DEBUG_TRANSFORM, parentWorldLocation, DEBUG_TRANSFORM);
        this.boosters.RenderLightDebug(renderer, Tr2DebugObjectReference.create__Object(this), DEBUG_TRANSFORM);
      }
    }

    if (renderer.HasOption(this, "AgentRotation"))
    {
      for (const it of this._agents)
      {
        const rot = it.rotation;
        // Carbon (row-vector): TransformationMatrix( Vector3( 100, 100, 100 ), rot, it->position ) * parentWorldLocation.
        mat4.fromRotationTranslationScale(DEBUG_TRANSFORM, rot, it.position, DEBUG_AXIS_SCALE);
        mat4.multiply(DEBUG_TRANSFORM, parentWorldLocation, DEBUG_TRANSFORM);
        renderer.DrawAxis(Tr2DebugObjectReference.create__Object(this), DEBUG_TRANSFORM, Wireframe);
      }
    }
  }

  /** Returns the portable DroneAgent records in stable instance order. */
  @meta.adapted
  GetAgents()
  {
    return this._agents;
  }

  /** Returns the collected debug force pairs (Carbon m_forces). */
  @meta.adapted
  GetForces()
  {
    return this._forces;
  }

  // Carbon GetBlendModifier (cpp:628-631).
  /**
   * The reciprocal of the mesh-to-sprite blend screen-size range, used to interpolate an agent's crossfade.
   */
  @blue.method
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
  // reconciliation for direct array changes between notifications. The native
  // list-notification path is implemented by OnListModified above.
  /**
   * Adds missing per-agent scratch records and trims stale ones for every behaviour that needs scratch storage.
   */
  _SyncScratchRecords()
  {
    for (let i = 0; i < this.behaviors.length; i++)
    {
      const behavior = this.behaviors[i];
      if (behavior.GetScratchMemorySize() > 0)
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
      if (behavior.GetScratchMemorySize() > 0)
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
  @blue.method
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
  @blue.method
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
  @blue.method
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
      id: carbonRandom.triRandInt(500),
      lifetime: 0,
      playFX: false,
      fxStartTime: -1,
      lastTransform: mat4.create(), // alloc: persistent motion history owned by this new agent.
      xfade: 0,
      isVisible: false,
      screenSize: 0
    };
  }

  // Carbon OnAgentCountChanged (cpp:376-388).
  /**
   * Flags the agent tree for rebuild, notifies the owner's buffer-resize callback, and resyncs the booster flare count.
   */
  @blue.method
  _OnAgentCountChanged()
  {
    this._createAgentTree = true;
    if (this._changeBufferVertexCount)
    {
      this._changeBufferVertexCount();
    }

    if (this.boosters)
    {
      this.boosters.RebuildFlareBuffer(this.actualCount);
    }
  }

}

// BehaviorGroup_Blue.cpp: native exposure; unported contracts: ITr2LightOwner.
