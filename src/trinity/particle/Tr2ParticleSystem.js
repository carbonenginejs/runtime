import { random as carbonRandom } from "#math/random";
import { BlueList, IListNotify } from "#blue";
import { BLUELISTEVENT } from "#consts/blue";
import { ITr2GenericParticleConstraint } from "./constraint/ITr2GenericParticleConstraint.js";
// Source: trinity/trinity/Particle/Tr2ParticleSystem.h
import { IInitialize, INotify, IsMatch, ISimTimeRebaseNotify, be, CcpTime } from "#blue";
// Hand-maintained from Carbon source, promoted out of generated intake.
import { CjsSchema, meta, type, blue } from "#schema";
import { Tr2CpuUsage, Tr2GpuUsage } from "#consts/render-context";
import { Failed } from "../../trinityal/ALResult.js";
import { Tr2BufferDescriptionAL } from "../../trinityal/Tr2BufferAL/Tr2BufferDescriptionAL.js";
import { Tr2RenderContext_GetMainThreadRenderContext } from "../core/context/Tr2RenderContext.js";
import { Tr2EffectStateManager } from "../shader/Tr2EffectStateManager.js";
import { Tr2VertexDefinition } from "../core/vertex/Tr2VertexDefinition/Tr2VertexDefinition.js";
import { Tr2ParticleElementDeclarationName } from "./element/Tr2ParticleElementDeclarationName.js";
import { TriDevice } from "../core/device/TriDevice.js";
import { Tr2DeviceResource } from "../core/device/Tr2DeviceResource.js";
import { Tr2Renderer } from "../core/Tr2Renderer.js";
import { mat4 } from "#math/mat4";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { Tr2ParticleElementDeclaration } from "./element/Tr2ParticleElementDeclaration.js";
import { ITr2InstanceDataInstanceData, ITr2InstanceData } from "../core/mesh/ITr2InstanceData/index.js";
import { ITr2GenericEmitterUpdateArguments } from "./ITr2GenericEmitter/index.js";
import { ITr2GpuBuffer } from "../core/ITr2GpuBuffer.js";
import { box3 } from "#math/box3";

// RenderDebugInfo scratch (debug drawing is single-threaded).
const DEBUG_AABB = box3.create();

/** Owns a particle system's element declaration, CPU-side attribute buffers, and per-frame simulation of aging, forces, movement, constraints and bounds. */
@blue.define("Tr2ParticleSystem")
@blue.inherit(IInitialize, INotify, IListNotify, ITr2InstanceData, ITr2GpuBuffer, ISimTimeRebaseNotify, Tr2DeviceResource)
@blue.interface(IInitialize, INotify, ITr2InstanceData, ITr2GpuBuffer)
export class Tr2ParticleSystem
{

  /** Carbon Tr2ParticleSystem.cpp:220-239 binds an inserted constraint. */
  @blue.method
  @meta.implemented
  OnListModified(event, _key = 0, _key2 = 0, value = null, list = null)
  {
    if (list === this.constraints && (event & BLUELISTEVENT.BELIST_EVENTMASK) === BLUELISTEVENT.BELIST_INSERTED && value)
    {
      const constraint = CjsSchema.cast(value, ITr2GenericParticleConstraint);
      if (constraint) constraint.Bind(this);
    }
  }


  /** Registers the inherited device-resource lifetime (Tr2DeviceResource.cpp:8-12). */
  constructor()
  {
    Tr2ParticleSystem.getAllSystems().add(this);
    this.constraints.SetNotify(this);
    TriDevice.RegisterResource(this);
  }

  /**
   * Ends the final owner's CPU-particle lifetime (Tr2ParticleSystem.cpp:89-101,
   * 350-378). Adapted: explicit JS teardown replaces native destructors and
   * clears views of the owned CPU buffers; device reset retains that data.
   */
  Destroy()
  {
    Tr2ParticleSystem.getAllSystems().delete(this);
    this._DestroyBuffers();
    if (this._rebaseOS) this._rebaseOS.UnregisterForSimTimeRebase(this);
    this._rebaseOS = null;
    this.ReleaseResources();
    for (const element of this._runtimeElements) element.buffer = null;
    this._buffers.fill(null);
    this._indexes.length = 0;
    this._elementMap.clear();
    this._runtimeElements.length = 0;
    this._semanticElements.fill(null);
    this._strides.fill(0);
    this.aliveCount = 0;
    this.isValid = false;
    this._instanceData.buffer = null;
    this._instanceData.count = 0;
    TriDevice.UnregisterResource(this);
  }

  _buffers = [null, null];

  _declarationHash = 0;

  _elementMap = new Map();

  _runtimeElements = [];

  _semanticElements = [null, null, null, null, null];

  _strides = [0, 0];

  _worldTransform = mat4.create();

  _shouldSortVisible = true;

  _updatePeriod = 1;

  _updatePeriodClock = 0;

  /** m_lastUpdate (Be::Time, Blue 100ns ticks): the update-arguments time of the last simulated frame. */
  _lastUpdate = 0;

  /** Retains the installed clock owner so replacement/teardown unregisters correctly. */
  _rebaseOS = null;

  _updateArguments = new ITr2GenericEmitterUpdateArguments();

  _instanceData = new ITr2InstanceDataInstanceData();

  _instanceBounds = { min: vec3.create(), max: vec3.create() };

  _declaration = Tr2EffectStateManager.Unknown;

  _vertexBuffer = null;

  _bufferDirty = true;

  _previousDataOutdated = true;

  _sortingAllowed = true;

  _sortingReferencePoint = vec3.create();

  _indexes = [];

  _mappedData = null;

  /** m_elements (PTr2ParticleElementDeclarationVector) [READ, PERSIST] */
  @blue.read
  @blue.persist
  @type.list("Tr2ParticleElementDeclaration")
  elements = [];

  /** m_isValid (bool) [READ] */
  @blue.read
  @type.boolean
  isValid = false;

  /** m_name (std::string) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.string
  name = "";

  /** m_constraints (PITr2GenericParticleConstraintVector) [READ, PERSIST] */
  @blue.read
  @blue.persist
  @type.list("ITr2GenericParticleConstraint")
  constraints = new BlueList(ITr2GenericParticleConstraint);

  /** m_forces (PITr2ParticleForceVector) [READ, PERSIST] */
  @blue.read
  @blue.persist
  @type.list("ITr2ParticleForce")
  forces = [];

  /** m_emissionOnDeathEmitter (ITr2GenericEmitterPtr) [READWRITE, NOTIFY, PERSIST] */
  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.rootRef("ITr2GenericEmitter")
  emitParticleOnDeathEmitter = null;

  /** m_emissionWhileAliveEmitter (ITr2GenericEmitterPtr) [READWRITE, NOTIFY, PERSIST] */
  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.rootRef("ITr2GenericEmitter")
  emitParticleDuringLifeEmitter = null;

  /** m_applyForce (bool) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.boolean
  applyForce = true;

  /** m_applyAging (bool) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.boolean
  applyAging = true;

  /** m_isGlobal (bool) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.boolean
  isGlobal = false;

  /** m_updateSimulation (bool) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.boolean
  updateSimulation = true;

  /** m_requiresSorting (bool) [READWRITE, PERSIST, NOTIFY] */
  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.boolean
  requiresSorting = false;

  /** m_AabbMax (Vector3) [READ] */
  @blue.read
  @type.vec3
  aabbMax = vec3.create();

  /** m_AabbMin (Vector3) [READ] */
  @blue.read
  @type.vec3
  aabbMin = vec3.create();

  /** m_peakAliveCount (unsigned) [READ] */
  @blue.read
  @type.uint32
  peakAliveCount = 0;

  /** m_useSimTimeRebase (bool) [READWRITE, NOTIFY, PERSIST] */
  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.boolean
  useSimTimeRebase = false;

  /**
   * m_maxParticleCount (unsigned, private, h:215), persisted under its exposed
   * name by MAP_ATTRIBUTE "maxParticleCount" PERSISTONLY
   * (Tr2ParticleSystem_Blue.cpp:97-101). Readers write it directly, bypassing
   * the setter; the declaration rebuild then sizes the buffers from it.
   */
  @blue.attribute("maxParticleCount")
  @blue.persistOnly
  @type.uint32
  _maxParticleCount = 0;

  /**
   * Carbon MAP_PROPERTY "maxParticleCount" over the private GetMaxParticleCount
   * and the public SetMaxParticleCount (Tr2ParticleSystem_Blue.cpp:109-113): setting it
   * rebuilds the buffers, which clears the particle system.
   */
  @blue.property()
  @type.uint32
  @meta.implemented
  get maxParticleCount()
  {
    return this._GetMaxParticleCount();
  }

  /** Rebuilds the particle buffers at the capped replacement capacity. */
  @meta.implemented
  set maxParticleCount(value)
  {
    this.SetMaxParticleCount(value);
  }

  /**
   * Carbon MAP_PROPERTY_READONLY "gpuStride" over GetGpuStride
   * (Tr2ParticleSystem_Blue.cpp:115-118): the size of one GPU buffer element
   * in bytes.
   */
  @blue.property()
  @type.uint32
  @meta.implemented
  get gpuStride()
  {
    return this.GetGpuStride();
  }

  /** m_aliveCount (unsigned) [READ] */
  @blue.read
  @type.uint32
  aliveCount = 0;

  /** m_originalMaxParticles (unsigned) [READ] */
  @blue.read
  @type.uint32
  originalMaxParticles = 0;

  /**
   * Rebuilds particle storage at Carbon's capped particle count, clearing live
   * particles. Typed arrays replace aligned CPU allocations; this retained
   * JS setter returns the new capacity and clears its cached empty bounds.
   */
  @blue.method
  @meta.adapted
  SetMaxParticleCount(value)
  {
    this._DestroyBuffers();
    this._maxParticleCount = Math.min(Number(value) >>> 0, Tr2ParticleSystem.MAX_PARTICLE_COUNT);
    this._BuildBuffers();
    vec3.set(this.aabbMin, 0, 0, 0);
    vec3.set(this.aabbMax, 0, 0, 0);
    return this._maxParticleCount;
  }

  /**
   * Carbon DestroyBuffers (cpp:350-379): frees the CPU buffers, the sort
   * indexes and the vertex buffer, empties the system, and returns its
   * capacity to the global count.
   *
   * Adapted: Carbon tests `m_buffers[0]`, which it always allocates; here a
   * buffer with no stride stays null, so either buffer marks a built set.
   * The CCP_STATS counters have no JavaScript counterpart and are omitted.
   */
  @meta.adapted
  _DestroyBuffers()
  {
    if (this._buffers[0] === null && this._buffers[1] === null)
    {
      return;
    }

    this._indexes = [];
    this._buffers.fill(null);
    for (const element of this._runtimeElements)
    {
      element.buffer = null;
    }

    // m_vertexBuffer = Tr2BufferAL().
    if (this._vertexBuffer) this._vertexBuffer.Destroy();
    this._vertexBuffer = null;
    this._mappedData = null;

    this.aliveCount = 0;
    Tr2ParticleSystem._totalParticleCount -= this._maxParticleCount;
  }

  /**
   * Carbon BuildBuffers (cpp:385-427): allocates the CPU buffers for a valid
   * system with capacity and claims that capacity from the global count. A
   * dynamic system that would take the total to cpuMaxParticleCount or more
   * gets no buffers and a zero capacity instead.
   *
   * Adapted: typed arrays replace aligned allocations, and a buffer with no
   * stride stays null. The CCP_STATS counter is omitted.
   */
  @meta.adapted
  _BuildBuffers()
  {
    if (!this._maxParticleCount)
    {
      return;
    }

    if (!this.isValid)
    {
      return;
    }

    const totalParticleCount = Tr2ParticleSystem._totalParticleCount + this._maxParticleCount;

    // only dynamic system are being capped!
    if (this.IsDynamic())
    {
      if (totalParticleCount >= Tr2ParticleSystem.cpuMaxParticleCount)
      {
        this._maxParticleCount = 0;
        return;
      }
    }

    if (this.requiresSorting)
    {
      this._indexes = new Array(this._maxParticleCount);
    }

    for (let index = 0; index < this._buffers.length; index++)
    {
      const stride = this._strides[index];
      this._buffers[index] = stride ? new Float32Array(stride * this._maxParticleCount) : null;
    }
    for (const element of this._runtimeElements)
    {
      element.buffer = this._buffers[element.bufferIndex];
    }

    if (this._strides[0] > 0 && Tr2Renderer.IsResourceCreationAllowed())
    {
      this.CreateVertexBuffer();
    }
    Tr2ParticleSystem._totalParticleCount = totalParticleCount;
  }

  /**
   * Carbon GetMaxParticleCount (private, cpp:202-205): the currently active,
   * possibly LOD-clamped particle budget.
   *
   * @returns {number} m_maxParticleCount.
   */
  @meta.implemented
  _GetMaxParticleCount()
  {
    return this._maxParticleCount;
  }

  /** Returns the particle budget captured when the declaration was built. */
  @blue.method
  @meta.implemented
  GetOriginalMaxParticles()
  {
    return this.originalMaxParticles;
  }

  /**
   * Carbon allocates an insertion mutex; JavaScript simulation is single
   * threaded, so the contract is an exact no-op at this layer.
   */
  @blue.method
  @meta.noop
  SetThreadSafeFlag()
  {
  }

  /**
   * Carbon Tr2ParticleSystem::GetDebugOptions (Particle/Tr2ParticleSystem.cpp:1664-1667).
   * @param {Set<string>} options The caller-owned option set.
   */
  @blue.method
  @meta.implemented
  GetDebugOptions(options)
  {
    options.add("Particle Systems");
  }

  /**
   * Carbon Tr2ParticleSystem::RenderDebugInfo (Particle/Tr2ParticleSystem.cpp:1669-1684):
   * under "Particle Systems", every force and then every constraint draws
   * itself against the system's current bounds.
   * @param {ITr2DebugRenderer2} renderer The debug renderer.
   * @param {mat4} worldTransform The owner's world transform.
   */
  @blue.method
  @meta.implemented
  RenderDebugInfo(renderer, worldTransform)
  {
    if (!renderer.HasOption(this, "Particle Systems"))
    {
      return;
    }

    const aabb = box3.fromBounds(DEBUG_AABB, this.aabbMin, this.aabbMax);
    for (const force of this.forces)
    {
      force.RenderDebugInfo(renderer, worldTransform, aabb);
    }
    for (const force of this.constraints)
    {
      force.RenderDebugInfo(renderer, worldTransform, aabb);
    }
  }

  /** Carbon IsValid (Tr2ParticleSystem.cpp:1339-1342): whether the element layout was built. */
  @blue.method
  @meta.implemented
  IsValid()
  {
    return this.isValid;
  }

  /** Carbon IsDynamic (cpp:1351-1354): a dynamic system runs its simulation, a static one does not. */
  @blue.method
  @meta.implemented
  IsDynamic()
  {
    return this.updateSimulation;
  }

  /**
   * Carbon GetGpuStride (cpp:1645-1648): the GPU buffer's per-particle size in
   * bytes, its float count times four. Carbon also exposes it to Blue as the
   * read-only property "gpuStride" (Tr2ParticleSystem_Blue.cpp:115-118).
   * @returns {number}
   */
  @blue.method
  @meta.implemented
  GetGpuStride()
  {
    return this._strides[0] * 4;
  }

  /** Carbon method ClearParticles (MAP_METHOD_AND_WRAP). */
  @blue.method
  @meta.implemented
  ClearParticles()
  {
    this.aliveCount = 0;
    vec3.set(this.aabbMin, 0, 0, 0);
    vec3.set(this.aabbMax, 0, 0, 0);
  }

  /**
   * Carbon Tr2ParticleSystem::ApplyConstraint (Tr2ParticleSystem.h:127-132): hands the element buffers, their strides
   * and the live count to a caller's constraint, then marks the buffers for upload.
   * @param {Function} constraint - (buffers, strides, count) => void
   */
  @blue.method
  @meta.implemented
  ApplyConstraint(constraint)
  {
    constraint(this._buffers, this._strides, this.aliveCount);
    this._bufferDirty = true;
  }

  /**
   * Carbon method RebindConstraints (MAP_METHOD_AND_WRAP).
   *
   * Adapted: JavaScript has no particle-system pointer binding; constraints receive the
   * owning model directly.
   */
  @blue.method
  @meta.adapted
  RebindConstraints()
  {
    for (const constraint of this.constraints)
    {
      constraint.Bind(this);
    }
  }

  /** Carbon method SaveToCMF (MAP_METHOD_AND_WRAP). */
  @blue.method
  @meta.notImplemented
  SaveToCMF(...args)
  {
    throw new Error("Tr2ParticleSystem.SaveToCMF is not implemented in CarbonEngineJS.");
  }

  /** Carbon method SaveToGranny (MAP_METHOD_AND_WRAP). */
  @blue.method
  @meta.notImplemented
  SaveToGranny(...args)
  {
    throw new Error("Tr2ParticleSystem.SaveToGranny is not implemented in CarbonEngineJS.");
  }

  /**
   * Rebuilds Carbon's aligned current/previous particle layout and AL resources.
   * JS retains typed-array element views, a boolean validation result and the
   * existing duplicate-name check; global dynamic-particle budgeting is not
   * ported. The AL owns the physical allocation, including in headless runs.
   */
  @blue.method
  @meta.adapted
  UpdateElementDeclaration()
  {
    this.isValid = false;
    this._DestroyBuffers();
    this.ReleaseResources();
    this.aliveCount = 0;
    this._elementMap.clear();
    this._runtimeElements.length = 0;
    this._semanticElements.fill(null);
    this._strides.fill(0);
    this._buffers.fill(null);
    if (this.elements.length === 0)
    {
      return false;
    }

    const semantics = new Set();
    const gpuUsages = new Set();
    for (const source of this.elements)
    {
      const elementType = Math.trunc(Number(source?.elementType));
      if (elementType < 0 || elementType > Tr2ParticleElementDeclaration.Type.CUSTOM)
      {
        return false;
      }
      const customName = String(source?.customName ?? "");
      const key = elementType === Tr2ParticleElementDeclaration.Type.CUSTOM ? `custom:${customName}` : `semantic:${elementType}`;
      if (semantics.has(key))
      {
        return false;
      }
      semantics.add(key);
      const usageIndex = Math.max(0, Math.trunc(Number(source?.usageIndex) || 0));
      if (elementType === Tr2ParticleElementDeclaration.Type.CUSTOM && source?.usedByGPU)
      {
        if (usageIndex >= 8 || gpuUsages.has(usageIndex))
        {
          return false;
        }
        gpuUsages.add(usageIndex);
      }
      const bufferIndex = source?.usedByGPU ? 0 : 1;
      const dimension = source.GetSize();
      const element = {
        key,
        elementType,
        customName,
        dimension,
        usageIndex,
        usedByGPU: !!source?.usedByGPU,
        bufferIndex,
        startOffset: this._strides[bufferIndex],
        instanceStride: 0,
        buffer: null
      };
      this._strides[bufferIndex] += dimension;
      this._runtimeElements.push(element);
      this._elementMap.set(key, element);
      if (elementType !== Tr2ParticleElementDeclaration.Type.CUSTOM)
      {
        this._semanticElements[elementType] = element;
      }
    }

    this.EnsureAligned();
    for (let index = 0; index < this._strides.length; index++)
    {
      const remainder = this._strides[index] % 4;
      if (remainder)
      {
        this._strides[index] += 4 - remainder;
      }
      if (index === 0) this._strides[index] *= 2;
    }
    for (const element of this._runtimeElements)
    {
      element.instanceStride = this._strides[element.bufferIndex];
    }
    this._declarationHash++;
    this.isValid = true;
    this._BuildBuffers();
    this.OnPrepareResources();
    this.RebindConstraints();
    return true;
  }

/**
   * Advances aging, forces, movement, emitters, constraints and bounds.
   * JS uses typed-array views in place of native particle pointers and takes
   * dt first for the existing script caller; dirty and previous-data flags
   * follow Tr2ParticleSystem.cpp:615,713-726. Retained scratch replaces native
   * stack copies of pre-integration position/velocity for segment emission.
   */
  @blue.method
  @meta.adapted
  UpdateSimulation(dt, updateArguments = Tr2ParticleSystem._defaultUpdateArguments)
  {
    if (!this.isValid)
    {
      return 0;
    }
    const deltaTime = dt;
    const lifetime = this._semanticElements[Tr2ParticleElementDeclaration.Type.LIFETIME];
    const position = this._semanticElements[Tr2ParticleElementDeclaration.Type.POSITION];
    const velocity = this._semanticElements[Tr2ParticleElementDeclaration.Type.VELOCITY];
    const mass = this._semanticElements[Tr2ParticleElementDeclaration.Type.MASS];

    if (this.applyAging && lifetime)
    {
      for (let index = 0; index < this.aliveCount; index++)
      {
        const offset = lifetime.startOffset + index * lifetime.instanceStride;
        lifetime.buffer[offset] += deltaTime / lifetime.buffer[offset + 1];
        if (lifetime.buffer[offset] >= 1)
        {
          this._SpawnEmitter(updateArguments, this.emitParticleOnDeathEmitter, position, velocity, index, 1);
          this._RemoveParticle(index--);
        }
      }
      this._bufferDirty = true;
      // Carbon Tr2ParticleSystem.cpp:623: aging changes the previous-data source
      // even when there is no position/velocity integration or constraint.
      this._previousDataOutdated = true;
    }

    if (this.updateSimulation && position && velocity)
    {
      for (const force of this.forces)
      {
        force.Update(deltaTime);
      }
      const forceValue = vec3.create();
      const forceContribution = vec3.create();
      const activeCount = this.aliveCount;
      for (let index = 0; index < activeCount; index++)
      {
        const positionValue = this._GetElementView(position, index);
        const velocityValue = this._GetElementView(velocity, index);
        // Carbon cpp:663-664 keeps both pre-integration values for the
        // six-argument during-life SpawnParticles overload (cpp:699-706).
        const vec3_1 = Tr2ParticleSystem.scratch.vec3_1;
        const vec3_2 = Tr2ParticleSystem.scratch.vec3_2;
        if (this.emitParticleDuringLifeEmitter)
        {
          vec3.copy(vec3_1, positionValue);
          vec3.copy(vec3_2, velocityValue);
        }
        const massValue = mass ? this._GetElementView(mass, index)[0] : 1;
        if (this.applyForce && this.forces.length)
        {
          vec3.set(forceValue, 0, 0, 0);
          for (const force of this.forces)
          {
            vec3.set(forceContribution, 0, 0, 0);
            const result = force.GetForce(
              positionValue,
              velocityValue,
              deltaTime,
              massValue,
              forceContribution
            );
            vec3.add(forceValue, forceValue, result);
          }
          const inverseMass = massValue ? 1 / massValue : 0;
          velocityValue[0] += forceValue[0] * deltaTime * inverseMass;
          velocityValue[1] += forceValue[1] * deltaTime * inverseMass;
          velocityValue[2] += forceValue[2] * deltaTime * inverseMass;
        }
        positionValue[0] += velocityValue[0] * deltaTime;
        positionValue[1] += velocityValue[1] * deltaTime;
        positionValue[2] += velocityValue[2] * deltaTime;
        if (this.emitParticleDuringLifeEmitter)
        {
          this.emitParticleDuringLifeEmitter.SpawnParticles__StartEnd(updateArguments,
            vec3_1, positionValue, vec3_2, velocityValue, deltaTime);
        }
      }
      this._bufferDirty = true;
      this._previousDataOutdated = true;
    }
    else if (this.emitParticleDuringLifeEmitter)
    {
      const activeCount = this.aliveCount;
      for (let index = 0; index < activeCount; index++)
      {
        this._SpawnEmitter(updateArguments, this.emitParticleDuringLifeEmitter, position, velocity, index, deltaTime);
      }
    }

    if (this.updateSimulation)
    {
      for (const constraint of this.constraints)
      {
        constraint.ApplyConstraint(updateArguments, this._buffers, this._strides, this.aliveCount, deltaTime);
      }
    }
    if (this.updateSimulation && this.constraints.length)
    {
      this._bufferDirty = true;
      this._previousDataOutdated = true;
    }
    this._UpdateBounds(position);
    return this.aliveCount;
  }

  /**
   * Carbon's per-frame system update: stamps the system world transform into a
   * nominal emitter argument record, applies the visibility-driven update
   * cadence, preserves previous-frame data, and advances CPU particles by
   * TimeAsFloat of the tick delta, capped at a third of a second
   * (Tr2ParticleSystem.cpp:485-545).
   *
   * Adapted: the per-system argument record is a reused member rather than
   * Carbon's stack copy.
   */
  @blue.method
  @meta.adapted
  Update(globalArguments)
  {
    const argumentsValue = this._updateArguments;
    argumentsValue.time = globalArguments.time;
    argumentsValue.system = globalArguments.system;
    mat4.copy(argumentsValue.parentTransform, this._worldTransform);
    vec3.copy(argumentsValue.originShift, globalArguments.originShift);
    argumentsValue.emitCountFactor = globalArguments.emitCountFactor;

    if (this._previousDataOutdated)
    {
      const buffer = this._buffers[0];
      const stride = this._strides[0];
      const half = stride >> 1;
      if (buffer)
      {
        for (let index = 0; index < this.aliveCount; index++)
        {
          const offset = index * stride;
          buffer.copyWithin(offset + half, offset, offset + half);
        }
      }
      this._previousDataOutdated = false;
    }

    if (this._updatePeriod > 1)
    {
      this._updatePeriodClock = (this._updatePeriodClock + 1) % this._updatePeriod;
      if (this._updatePeriodClock !== 0)
      {
        return this.aliveCount;
      }
    }

    if (this._lastUpdate === 0)
    {
      this._lastUpdate = argumentsValue.time;
    }
    const dt = Math.min(CcpTime.timeAsFloat(argumentsValue.time - this._lastUpdate), Math.fround(1 / 3));
    this._lastUpdate = argumentsValue.time;
    // Carbon compares the float dt with float literals (Tr2ParticleSystem.cpp:534-541).
    if (dt > Math.fround(0.035) && this._sortingAllowed) this._sortingAllowed = false;
    else if (!this._sortingAllowed && dt < Math.fround(0.02)) this._sortingAllowed = true;
    return this.UpdateSimulation(dt, argumentsValue);
  }

  /** Whether the vertex declaration is initialized (independent of buffer validity). */
  @blue.method
  @meta.implemented
  IsInstanceDataReady()
  {
    return this._declaration !== Tr2EffectStateManager.Unknown;
  }

  /**
   * Returns the borrowed AL buffer and byte-stride/live-count record.
   * Adapted: JS reuses a mutable record; Carbon returns InstanceData by value
   * (Tr2ParticleSystem.cpp:306-309). Copy fields before retaining a snapshot.
   */
  @blue.method
  @meta.adapted
  GetInstanceData(_bufferIndex = 0, _screenSize = 0)
  {
    this._instanceData.buffer = this._vertexBuffer;
    this._instanceData.offset = 0;
    this._instanceData.stride = this._strides[0] * 4;
    this._instanceData.count = this.aliveCount;
    return this._instanceData;
  }

  /** Returns Carbon's interned vertex declaration handle. */
  @blue.method
  @meta.implemented
  GetInstanceBufferVertexDeclaration(_bufferIndex = 0)
  {
    return this._declaration;
  }

  /** Returns the borrowed physical particle buffer (the index is unused). */
  @blue.method
  @meta.implemented
  GetGpuBuffer(_bufferIndex = 0)
  {
    return this._vertexBuffer;
  }

  /**
   * Releases the AL allocation and declaration while retaining CPU particles.
   * JS explicitly destroys the handle instead of replacing a C++ RAII value.
   */
  @blue.method
  @meta.adapted
  ReleaseResources()
  {
    this._declaration = Tr2EffectStateManager.Unknown;
    this._vertexBuffer?.Destroy();
    this._vertexBuffer = null;
    this._mappedData = null;
    this._bufferDirty = true;
  }

  /** Recreates the declaration and buffer; Carbon reports true even if allocation fails. */
  @blue.method
  @meta.implemented
  OnPrepareResources()
  {
    this.RebuildDeclaration();
    this.CreateVertexBuffer();
    return true;
  }

  /**
   * Allocates Carbon's WRITE_OFTEN vertex buffer through the ambient AL.
   * JS uses the context factory and explicitly releases the prior handle;
   * null represents the AL's failed/default buffer value.
   */
  @blue.method
  @meta.adapted
  CreateVertexBuffer()
  {
    if (this._maxParticleCount > 0 && this._strides[0] > 0)
    {
      const context = Tr2RenderContext_GetMainThreadRenderContext();
      this._vertexBuffer?.Destroy();
      this._mappedData = null;
      this._vertexBuffer = context.CreateBuffer(Tr2BufferDescriptionAL.create__Stride(
        this._strides[0] * 4, this._maxParticleCount,
        Tr2GpuUsage.VERTEX_BUFFER, Tr2CpuUsage.WRITE_OFTEN
      ));
      if (!this._vertexBuffer) return false;
      this._bufferDirty = true;
    }
    return true;
  }

  /**
   * Interns current and previous semantic attributes, with one copy of CUSTOM.
   * JS sorts the element values because Map preserves insertion order rather
   * than Carbon's type/name key order, and uses the AL's named data types.
   */
  @blue.method
  @meta.adapted
  RebuildDeclaration()
  {
    const definition = new Tr2VertexDefinition();
    const elements = Array.from(this._elementMap.values());
    elements.sort((a, b) => a.elementType - b.elementType ||
      (a.customName < b.customName ? -1 : a.customName > b.customName ? 1 : 0));
    const name = new Tr2ParticleElementDeclarationName();
    for (const element of elements)
    {
      if (!element.usedByGPU) continue;
      name.type = element.elementType;
      const custom = name.type === Tr2ParticleElementDeclaration.Type.CUSTOM;
      const item = new Tr2VertexDefinition.Item();
      item.stream = 0;
      item.offset = element.startOffset * 4;
      item.type = "FLOAT32_" + element.dimension;
      item.usage = name.GetD3DUsage();
      item.usageIndex = custom ? element.usageIndex : 0;
      definition.items.push(item);
      definition.nextOffset[0] = Math.max(definition.nextOffset[0], item.offset + element.dimension * 4);
      if (!custom)
      {
        const previous = Object.assign(new Tr2VertexDefinition.Item(), item);
        previous.usageIndex = 1;
        previous.offset += this._strides[0] * 4 / 2;
        definition.items.push(previous);
        definition.nextOffset[0] = Math.max(definition.nextOffset[0], previous.offset + element.dimension * 4);
      }
    }
    this._declaration = Tr2EffectStateManager.getVertexDeclarationHandle(definition);
  }

  /** Moves POSITION and VELOCITY to four-float slots at the front of their streams. */
  @blue.method
  @meta.implemented
  EnsureAligned()
  {
    const position = this._semanticElements[Tr2ParticleElementDeclaration.Type.POSITION];
    const velocity = this._semanticElements[Tr2ParticleElementDeclaration.Type.VELOCITY];
    if (position)
    {
      this.ShiftOffsets(position.bufferIndex, position.startOffset, -position.dimension);
      this.ShiftOffsets(position.bufferIndex, 0, 4);
      position.startOffset = 0;
      this._strides[position.bufferIndex]++;
    }
    if (velocity)
    {
      this.ShiftOffsets(velocity.bufferIndex, velocity.startOffset, -velocity.dimension);
      const offset = position && position.bufferIndex === velocity.bufferIndex ? 4 : 0;
      this.ShiftOffsets(velocity.bufferIndex, offset, 4);
      velocity.startOffset = offset;
      this._strides[velocity.bufferIndex]++;
    }
  }

  /** Shifts offsets at or after start; semantic and map entries share the same JS record. */
  @blue.method
  @meta.adapted
  ShiftOffsets(bufferType, start, shift)
  {
    for (const element of this._runtimeElements)
    {
      if (element.bufferIndex === bufferType && element.startOffset >= start)
      {
        element.startOffset += shift;
      }
    }
  }

  /** Returns the current particle bounds, or Carbon's zero box when empty. */
  @blue.method
  @meta.adapted
  GetInstanceBufferBoundingBox(_bufferIndex = 0)
  {
    if (this.aliveCount > 0)
    {
      vec3.copy(this._instanceBounds.min, this.aabbMin);
      vec3.copy(this._instanceBounds.max, this.aabbMax);
    }
    else
    {
      vec3.set(this._instanceBounds.min, 0, 0, 0);
      vec3.set(this._instanceBounds.max, 0, 0, 0);
    }
    return this._instanceBounds;
  }

  /**
   * Builds particle storage and prepares AL resources. Carbon always returns
   * true; validity is queried separately. Registers clock rebasing and tells
   * child emitters to use their thread-safe insertion contract.
   */
  @blue.method
  @meta.adapted
  Initialize()
  {
    this.UpdateElementDeclaration();
    this.OnPrepareResources();
    if (this.useSimTimeRebase) this.#UpdateRebaseRegistration();
    if (this.emitParticleOnDeathEmitter) this.emitParticleOnDeathEmitter.SetThreadSafeFlag();
    if (this.emitParticleDuringLifeEmitter) this.emitParticleDuringLifeEmitter.SetThreadSafeFlag();
    this.originalMaxParticles = this._maxParticleCount;
    return true;
  }

  /** Carbon Tr2ParticleSystem.cpp:141; batched edits apply each independent branch. */
  @blue.method
  @meta.implemented
  OnModified(names)
  {
    if (IsMatch(names, "requiresSorting"))
      this._indexes = this.requiresSorting && this._maxParticleCount ? new Array(this._maxParticleCount) : [];
    if (IsMatch(names, "useSimTimeRebase")) this.#UpdateRebaseRegistration();
    if (IsMatch(names, "emitParticleOnDeathEmitter") && this.emitParticleOnDeathEmitter)
      this.emitParticleOnDeathEmitter.SetThreadSafeFlag();
    if (IsMatch(names, "emitParticleDuringLifeEmitter") && this.emitParticleDuringLifeEmitter)
      this.emitParticleDuringLifeEmitter.SetThreadSafeFlag();
    return true;
  }

  /** Carbon OnSimClockRebase (Tr2ParticleSystem.cpp:474-477): moves the last-update tick time by the rebase. */
  @blue.method
  @meta.implemented
  OnSimClockRebase(oldTime, newTime)
  {
    this._lastUpdate += newTime - oldTime;
  }

  /** Registers with the active clock and releases any previous installed owner. */
  #UpdateRebaseRegistration()
  {
    const os = this.useSimTimeRebase ? be.os : null;
    if (this._rebaseOS === os) return;
    if (this._rebaseOS) this._rebaseOS.UnregisterForSimTimeRebase(this);
    this._rebaseOS = null;
    if (os)
    {
      os.RegisterForSimTimeRebase(this);
      this._rebaseOS = os;
    }
  }

  /**
   * The map of resolved runtime elements, keyed by semantic or custom name.
   */
  @blue.method
  @meta.implemented
  GetElementDeclaration()
  {
    return this._elementMap;
  }

  /**
   * A counter that increments each time the element declaration is rebuilt, so a consumer can detect a stale binding.
   */
  @blue.method
  @meta.implemented
  GetElementDeclarationHash()
  {
    return this._declarationHash;
  }

  /**
   * Whether an element of the given semantic type or name is present in the current declaration.
   */
  @blue.method
  @meta.implemented
  HasElement(type)
  {
    return !!this._ResolveElement(type);
  }

  /**
   * Resolves the runtime element matching a semantic type index or element name.
   */
  @meta.adapted
  GetElement(type)
  {
    return this._ResolveElement(type);
  }

  /**
   * Carbon GetElementStream (Tr2ParticleSystem.cpp:440-451): the semantic element's stream - the first particle's
   * value in its buffer - and that buffer's per-particle stride, or null and 0 with false when the declaration has
   * no such element.
   *
   * Adapted: Carbon's `float*& element, unsigned& stride` outputs become `out.element`, a typed-array view starting
   * at the element's offset (the same view idiom UpdateSimulation uses for native particle pointers), and
   * `out.stride`, counted in floats as Carbon's m_vertexSizes are.
   * @param {number} type Tr2ParticleElementDeclaration.Type semantic index.
   * @param {{ element: Float32Array|null, stride: number }} out
   * @returns {boolean} Whether the element exists.
   */
  @blue.method
  @meta.adapted
  GetElementStream(type, out)
  {
    const element = this._semanticElements[type];
    if (!element)
    {
      out.element = null;
      out.stride = 0;
      return false;
    }
    out.element = this._buffers[element.bufferIndex].subarray(element.startOffset);
    out.stride = this._strides[element.bufferIndex];
    return true;
  }

  /**
   * Carbon InsertParticle (Tr2ParticleSystem.cpp:1293-1316): when the system is not full, points `particle[i]` at
   * the new particle's slot in each buffer, counts it alive, raises the peak and marks the buffers dirty.
   *
   * Adapted: each `particle[i]` is a typed-array view starting at the slot in place of Carbon's float pointer, and
   * null for a buffer the declaration does not use (Carbon's null buffer plus offset). Carbon acquires the
   * insertion mutex here and holds it until DoneInsertingParticle; SetThreadSafeFlag never creates one in JS.
   * Unlike BeginSpawnParticle, this does not reject an invalid system - Carbon does not check.
   * @param {Array<Float32Array|null>} particle Filled with one view per Tr2ParticleElementData buffer.
   * @returns {boolean} true if inserted; false if the system is full.
   */
  @blue.method
  @meta.adapted
  InsertParticle(particle)
  {
    if (this.aliveCount < this._maxParticleCount)
    {
      for (let index = 0; index < this._buffers.length; index++)
      {
        const buffer = this._buffers[index];
        particle[index] = buffer ? buffer.subarray(this.aliveCount * this._strides[index]) : null;
      }
      this.aliveCount++;
      this.peakAliveCount = Math.max(this.peakAliveCount, this.aliveCount);
      this._bufferDirty = true;
      return true;
    }
    return false;
  }

  /**
   * Carbon DoneInsertingParticle (Tr2ParticleSystem.cpp:1323-1329) releases the insertion mutex taken by
   * InsertParticle. JS never creates that mutex (see SetThreadSafeFlag), so there is nothing to release.
   */
  @blue.method
  @meta.noop
  DoneInsertingParticle()
  {
  }

  /**
   * Reserves a slot for a new particle, returning null when the system is invalid or already full.
   * Adapted from InsertParticle (Tr2ParticleSystem.cpp:1293): JS splits slot
   * reservation and element writes, retaining the existing BeginSpawnParticle
   * name and index/null return; typed-array element access replaces native
   * output pointers. The retained name and return convention are API adaptations.
   * Unlike the donor, this JS entry also rejects an invalid system and defers
   * the peak-count update until EndSpawnParticle; these existing API behaviors
   * are preserved rather than claimed as native insertion parity.
   */
  @meta.adapted
  BeginSpawnParticle()
  {
    if (!this.isValid || this.aliveCount >= this._maxParticleCount)
    {
      return null;
    }
    this._bufferDirty = true;
    return this.aliveCount++;
  }

  /**
   * Updates the peak alive-particle count once a spawned particle has been fully written.
   * This existing JS counterpart of DoneInsertingParticle retains its
   * EndSpawnParticle name and the peak update deferred from InsertParticle.
   * Carbon updates the peak in InsertParticle (cpp:1293-1316); its
   * DoneInsertingParticle (cpp:1323) releases the insertion mutex instead.
   * JS performs these writes synchronously without that native mutex.
   */
  @meta.adapted
  EndSpawnParticle()
  {
    this.peakAliveCount = Math.max(this.peakAliveCount, this.aliveCount);
  }

  /**
   * Reserves a new particle slot and writes each supplied attribute into its matching element buffer.
   */
  @meta.adapted
  SpawnParticle(values = {})
  {
    const index = this.BeginSpawnParticle();
    if (index === null)
    {
      return null;
    }
    for (const element of this._runtimeElements)
    {
      const name = element.elementType === Tr2ParticleElementDeclaration.Type.CUSTOM
        ? element.customName
        : Object.keys(Tr2ParticleElementDeclaration.Type).find(key => Tr2ParticleElementDeclaration.Type[key] === element.elementType)?.toLowerCase();
      const value = values[element.key] ?? values[name];
      if (value !== undefined)
      {
        this.SetParticleElement(index, element.key, value);
      }
    }
    this.EndSpawnParticle();
    return index;
  }

  /**
   * Writes a scalar or vector into a resolved element. This existing JS
   * script setter marks data dirty like Carbon's constraint-write path.
   */
  @meta.adapted
  SetParticleElement(index, type, value)
  {
    const element = this._ResolveElement(type);
    if (!element || index < 0 || index >= this._maxParticleCount)
    {
      return false;
    }
    const offset = element.startOffset + index * element.instanceStride;
    if (typeof value === "number")
    {
      element.buffer[offset] = value;
    }
    else
    {
      for (let component = 0; component < element.dimension; component++)
      {
        element.buffer[offset + component] = Number(value?.[component]) || 0;
      }
    }
    this._bufferDirty = true;
    this._previousDataOutdated = true;
    return true;
  }

  /**
   * A view onto one particle's stored values for the resolved element, or null when unresolved or out of range.
   */
  @meta.adapted
  GetParticleElement(index, type)
  {
    const element = this._ResolveElement(type);
    return element && index >= 0 && index < this.aliveCount ? this._GetElementView(element, index) : null;
  }

  /**
   * Copies the tracked axis-aligned bounds into the caller's vectors, reporting false when no particles are alive.
   */
  @blue.method
  @meta.implemented
  GetBoundingBox(outMin = vec3.create(), outMax = vec3.create())
  {
    if (this.aliveCount === 0)
    {
      return false;
    }
    vec3.copy(outMin, this.aabbMin);
    vec3.copy(outMax, this.aabbMax);
    return { min: outMin, max: outMax };
  }

  /**
   * Copies the owning transform and derives Carbon's conservative particle
   * sorting visibility state from the current CPU bounds. JS uses gl-matrix
   * vectors with Carbon-identical single-transform layout.
   */
  @blue.method
  @meta.adapted
  UpdateViewDependentData(frustum, worldTransform)
  {
    this._shouldSortVisible = false;
    mat4.copy(this._worldTransform, worldTransform);
    if (!this._bufferDirty && !this.requiresSorting) return;
    if (!this._vertexBuffer || !this._vertexBuffer.IsValid()) return;
    this._shouldSortVisible = true;
    this._updatePeriod = 1;

    if (!frustum || !this.GetBoundingBox(Tr2ParticleSystem._boundsMin, Tr2ParticleSystem._boundsMax))
    {
      return;
    }

    vec3.add(Tr2ParticleSystem._center, Tr2ParticleSystem._boundsMax, Tr2ParticleSystem._boundsMin);
    vec3.scale(Tr2ParticleSystem._center, Tr2ParticleSystem._center, 0.5);
    vec3.subtract(Tr2ParticleSystem._extent, Tr2ParticleSystem._boundsMax, Tr2ParticleSystem._boundsMin);
    vec3.scale(Tr2ParticleSystem._extent, Tr2ParticleSystem._extent, 0.5);

    const radius = Math.max(
      Math.abs(Tr2ParticleSystem._extent[0]),
      Math.abs(Tr2ParticleSystem._extent[1]),
      Math.abs(Tr2ParticleSystem._extent[2])
    ) * Math.hypot(worldTransform[0], worldTransform[1], worldTransform[2]);
    vec3.transformMat4(Tr2ParticleSystem._center, Tr2ParticleSystem._center, worldTransform);
    vec4.set(
      Tr2ParticleSystem._boundingSphere,
      Tr2ParticleSystem._center[0],
      Tr2ParticleSystem._center[1],
      Tr2ParticleSystem._center[2],
      radius
    );

    if (!frustum.IsSphereVisible(Tr2ParticleSystem._boundingSphere))
    {
      this._shouldSortVisible = false;
      this._updatePeriod = 4;
    }
  }

  /**
   * Sorts live indices far-to-near and uploads full current/previous records.
   * Carbon's parallel sort becomes synchronous JS Array.sort over a reused
   * index array (resized to the live prefix, instead of native capacity).
   * Mapped bytes
   * receive a Float32Array view; finally replaces native ON_BLOCK_EXIT.
   * gl-matrix returns null for a singular inverse, so NaNs explicitly retain
   * invalid coordinates instead of reusing a stale inverse.
   */
  @blue.method
  @meta.adapted
  SortParticles()
  {
    if (!this._bufferDirty && !this.requiresSorting) return;
    if (!this._vertexBuffer || !this._vertexBuffer.IsValid()) return;
    const context = Tr2RenderContext_GetMainThreadRenderContext();
    const { mat4_0, vec3_0 } = Tr2ParticleSystem.scratch;
    if (!mat4.invert(mat4_0, this._worldTransform)) mat4_0.fill(NaN);
    vec3.transformMat4(vec3_0, Tr2Renderer.GetViewPosition(), mat4_0);
    if (!this._bufferDirty && vec3.squaredDistance(vec3_0, this._sortingReferencePoint) < 0.001) return;
    vec3.copy(this._sortingReferencePoint, vec3_0);

    if (this.aliveCount > 0)
    {
      const sorted = this._shouldSortVisible && this._sortingAllowed && this.requiresSorting &&
        this.HasElement(Tr2ParticleElementDeclaration.Type.POSITION);
      if (sorted)
      {
        this._indexes.length = this.aliveCount;
        for (let index = 0; index < this.aliveCount; index++) this._indexes[index] = index;
        this._indexes.sort((a, b) => this.CompareParticles(a, b) ? -1 : this.CompareParticles(b, a) ? 1 : 0);
      }
      const mapping = this._vertexBuffer.MapForWriting(context);
      if (Failed(mapping.result)) return;
      try
      {
        if (!this._mappedData || this._mappedData.buffer !== mapping.data.buffer ||
          this._mappedData.byteOffset !== mapping.data.byteOffset || this._mappedData.byteLength !== mapping.data.byteLength)
        {
          this._mappedData = new Float32Array(mapping.data.buffer, mapping.data.byteOffset, mapping.data.byteLength / 4); // alloc: retained variable-length view of the AL mapping, reused until its backing range changes
        }
        const data = this._mappedData;
        const source = this._buffers[0];
        const stride = this._strides[0];
        if (sorted)
        {
          for (let index = 0; index < this.aliveCount; index++)
          {
            const offset = this._indexes[index] * stride;
            data.set(source.subarray(offset, offset + stride), index * stride);
          }
        }
        else
        {
          data.set(source.subarray(0, this.aliveCount * stride));
        }
      }
      finally
      {
        this._vertexBuffer.UnmapForWriting(context);
      }
    }
    this._bufferDirty = false;
    this._shouldSortVisible = false;
  }

  /** Compares squared local-space xyz distances, with Carbon's farther-first boolean result. */
  @blue.method
  @meta.implemented
  CompareParticles(particle1, particle2)
  {
    const position = this._semanticElements[Tr2ParticleElementDeclaration.Type.POSITION];
    const buffer = position.buffer;
    const offset1 = position.startOffset + position.instanceStride * particle1;
    const offset2 = position.startOffset + position.instanceStride * particle2;
    const point = this._sortingReferencePoint;
    const x1 = buffer[offset1] - point[0], y1 = buffer[offset1 + 1] - point[1], z1 = buffer[offset1 + 2] - point[2];
    const x2 = buffer[offset2] - point[0], y2 = buffer[offset2 + 1] - point[1], z2 = buffer[offset2 + 2] - point[2];
    return x2 * x2 + y2 * y2 + z2 * z2 < x1 * x1 + y1 * y1 + z1 * z1;
  }

  /** Copies the owning world transform without evaluating view state. */
  @blue.method
  @meta.implemented
  UpdateTransform(worldTransform)
  {
    mat4.copy(this._worldTransform, worldTransform);
  }

  /**
   * A typed-array view onto one particle's slot within an element's buffer.
   */
  _GetElementView(element, index)
  {
    const offset = element.startOffset + index * element.instanceStride;
    return element.buffer.subarray(offset, offset + element.dimension);
  }

  /**
   * Removes a dead particle by swapping the last alive particle into its slot across every element.
   */
  _RemoveParticle(index)
  {
    const last = --this.aliveCount;
    if (index === last)
    {
      return;
    }
    for (let bufferIndex = 0; bufferIndex < this._buffers.length; bufferIndex++)
    {
      const buffer = this._buffers[bufferIndex];
      const stride = this._strides[bufferIndex];
      if (buffer && stride)
      {
        buffer.copyWithin(index * stride, last * stride, (last + 1) * stride);
      }
    }
  }

  /**
   * Resolves an element from a semantic type index or an element name.
   */
  _ResolveElement(type)
  {
    if (typeof type === "number")
    {
      return this._semanticElements[type] ?? null;
    }
    const name = String(type ?? "");
    const semanticName = Object.keys(Tr2ParticleElementDeclaration.Type)
      .find(key => key.toLowerCase() === name.toLowerCase());
    return this._elementMap.get(name)
      ?? this._elementMap.get(`custom:${name}`)
      ?? (semanticName ? this._semanticElements[Tr2ParticleElementDeclaration.Type[semanticName]] : null)
      ?? null;
  }

  /**
   * Runs one emitter's spawn pass for the frame.
   */
  _SpawnEmitter(updateArguments, emitter, position, velocity, index, rate)
  {
    if (!emitter)
    {
      return;
    }
    emitter.SpawnParticles(
      updateArguments,
      position ? this._GetElementView(position, index) : null,
      velocity ? this._GetElementView(velocity, index) : null,
      rate
    );
  }

  /**
   * Grows the tracked axis-aligned bounds to include one particle's position.
   */
  _UpdateBounds(position)
  {
    if (!position || this.aliveCount === 0)
    {
      vec3.set(this.aabbMin, 0, 0, 0);
      vec3.set(this.aabbMax, 0, 0, 0);
      return;
    }
    const first = this._GetElementView(position, 0);
    vec3.copy(this.aabbMin, first);
    vec3.copy(this.aabbMax, first);
    for (let index = 1; index < this.aliveCount; index++)
    {
      const value = this._GetElementView(position, index);
      vec3.min(this.aabbMin, this.aabbMin, value);
      vec3.max(this.aabbMax, this.aabbMax, value);
    }
  }

  /**
   * Carbon GetAllSystems (cpp:874-878): every live particle system. The
   * constructor adds a system and Destroy, which stands in for Carbon's
   * destructor (cpp:91), removes it.
   *
   * Carbon's std::set<Tr2ParticleSystem*> is ordered by address, so its
   * order means nothing; this Set's insertion order serves.
   * @returns {Set<Tr2ParticleSystem>}
   */
  @meta.renamed("GetAllSystems")
  static getAllSystems()
  {
    return Tr2ParticleSystem._allSystems;
  }

  /**
   * Carbon UpdateAllSystems (cpp:844-866): updates every live system with
   * the same arguments.
   *
   * Carbon quirk, kept: `previousUpdateTime` starts at -1 and is never
   * assigned, so the same-time early return never fires (cpp:848-856).
   *
   * Adapted: Tr2ParallelDo becomes a loop, and the CCP_STATS counters it
   * resets and publishes are omitted. Nothing in Carbon calls it.
   * @param {ITr2GenericEmitterUpdateArguments} updateArguments
   */
  @meta.adapted
  @meta.renamed("UpdateAllSystems")
  static updateAllSystems(updateArguments)
  {
    if (Tr2ParticleSystem._previousUpdateTime !== -1 && Tr2ParticleSystem._previousUpdateTime === updateArguments.time)
    {
      return;
    }

    for (const system of Tr2ParticleSystem.getAllSystems())
    {
      system.Update(updateArguments);
    }
  }

  /** Carbon s_allSystems, the function-local set of GetAllSystems (cpp:876). */
  static _allSystems = new Set();

  /** Carbon UpdateAllSystems' function-local previousUpdateTime (cpp:848); never assigned. */
  static _previousUpdateTime = -1;

  /** Carbon s_totalParticleCount (h:221, cpp:16): capacity held by every system's buffers. */
  static _totalParticleCount = 0;

  /**
   * Carbon s_maxParticleCount (cpp:20-21), the "cpuMaxParticleCount"
   * setting: the global capacity above which dynamic systems get no buffers.
   */
  @meta.setting("cpuMaxParticleCount")
  static cpuMaxParticleCount = 1024 * 512;

  /** Carbon Tr2ParticleSystem::RandCheap (Tr2ParticleSystem.h:145). */
  static randCheap()
  {
    return carbonRandom.particleRandCheap();
  }

  /** Carbon Tr2ParticleSystem::RandFloat (Tr2ParticleSystem.h:170). */
  static randFloat()
  {
    return carbonRandom.particleRandFloat();
  }

  static scratch = { mat4_0: mat4.create(), vec3_0: vec3.create(), vec3_1: vec3.create(), vec3_2: vec3.create() };

  static _boundsMin = vec3.create();

  static _boundsMax = vec3.create();

  static _center = vec3.create();

  static _extent = vec3.create();

  static _boundingSphere = vec4.create();

  static _defaultUpdateArguments = new ITr2GenericEmitterUpdateArguments();

  static MAX_PARTICLE_COUNT = 10000;


}
