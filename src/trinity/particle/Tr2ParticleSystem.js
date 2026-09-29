// Source: trinity/trinity/Particle/Tr2ParticleSystem.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { carbon, impl, edit, type } from "#schema";
import { Tr2CpuUsage, Tr2GpuUsage } from "#consts/render-context";
import { Tr2BufferDescriptionAL } from "../../trinityal/Tr2BufferAL/Tr2BufferDescriptionAL.js";
import { Tr2RenderContext_GetMainThreadRenderContext } from "../core/context/Tr2RenderContext.js";
import { Tr2EffectStateManager } from "../shader/Tr2EffectStateManager.js";
import { Tr2VertexDefinition } from "../core/vertex/Tr2VertexDefinition/Tr2VertexDefinition.js";
import { Tr2ParticleElementDeclarationName } from "./element/Tr2ParticleElementDeclarationName.js";
import { CjsModel } from "#model";
import { mat4 } from "#math/mat4";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { Tr2ParticleElementDeclaration } from "./element/Tr2ParticleElementDeclaration.js";
import { ITr2InstanceDataInstanceData, ITr2InstanceData } from "../core/mesh/ITr2InstanceData/index.js";
import { ITr2GenericEmitterUpdateArguments } from "./ITr2GenericEmitter/index.js";

/** Owns a particle system's element declaration, CPU-side attribute buffers, and per-frame simulation of aging, forces, movement, constraints and bounds. */
@type.define({ className: "Tr2ParticleSystem", family: "particle" })
@carbon.inherit(ITr2InstanceData)
export class Tr2ParticleSystem extends CjsModel
{

  #buffers = [null, null];

  #declarationHash = 0;

  #elementMap = new Map();

  #runtimeElements = [];

  #semanticElements = [null, null, null, null, null];

  #strides = [0, 0];

  #worldTransform = mat4.create();

  #shouldSortVisible = true;

  #updatePeriod = 1;

  #updatePeriodClock = 0;

  #lastUpdate = 0;

  #updateArguments = new ITr2GenericEmitterUpdateArguments();

  #instanceData = new ITr2InstanceDataInstanceData();

  #instanceBounds = { min: vec3.create(), max: vec3.create() };

  #declaration = Tr2EffectStateManager.Unknown;

  #vertexBuffer = null;

  #bufferDirty = true;

  #previousDataOutdated = true;

  /** m_elements (PTr2ParticleElementDeclarationVector) [READ, PERSIST] */
  @edit.read
  @edit.persist
  @type.list("Tr2ParticleElementDeclaration")
  elements = [];

  /** m_isValid (bool) [READ] */
  @edit.read
  @type.boolean
  isValid = false;

  /** m_name (std::string) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.string
  name = "";

  /** m_constraints (PITr2GenericParticleConstraintVector) [READ, PERSIST] */
  @edit.read
  @edit.persist
  @type.list("ITr2GenericParticleConstraint")
  constraints = [];

  /** m_forces (PITr2ParticleForceVector) [READ, PERSIST] */
  @edit.read
  @edit.persist
  @type.list("ITr2ParticleForce")
  forces = [];

  /** m_emissionOnDeathEmitter (ITr2GenericEmitterPtr) [READWRITE, NOTIFY, PERSIST] */
  @edit.notify
  @edit.readwrite
  @edit.persist
  @type.model("ITr2GenericEmitter")
  emitParticleOnDeathEmitter = null;

  /** m_emissionWhileAliveEmitter (ITr2GenericEmitterPtr) [READWRITE, NOTIFY, PERSIST] */
  @edit.notify
  @edit.readwrite
  @edit.persist
  @type.model("ITr2GenericEmitter")
  emitParticleDuringLifeEmitter = null;

  /** m_applyForce (bool) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.boolean
  applyForce = true;

  /** m_applyAging (bool) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.boolean
  applyAging = true;

  /** m_isGlobal (bool) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.boolean
  isGlobal = false;

  /** m_updateSimulation (bool) [READWRITE, PERSIST] */
  @edit.readwrite
  @edit.persist
  @type.boolean
  updateSimulation = true;

  /** m_requiresSorting (bool) [READWRITE, PERSIST, NOTIFY] */
  @edit.notify
  @edit.readwrite
  @edit.persist
  @type.boolean
  requiresSorting = false;

  /** m_AabbMax (Vector3) [READ] */
  @edit.read
  @type.vec3
  aabbMax = vec3.create();

  /** m_AabbMin (Vector3) [READ] */
  @edit.read
  @type.vec3
  aabbMin = vec3.create();

  /** m_peakAliveCount (unsigned) [READ] */
  @edit.read
  @type.uint32
  peakAliveCount = 0;

  /** m_useSimTimeRebase (bool) [READWRITE, NOTIFY, PERSIST] */
  @edit.notify
  @edit.readwrite
  @edit.persist
  @type.boolean
  useSimTimeRebase = false;

  /** m_maxParticleCount (unsigned) [PERSISTONLY] */
  @edit.readwrite
  @edit.persistOnly
  @type.uint32
  maxParticleCount = 0;

  /** m_aliveCount (unsigned) [READ] */
  @edit.read
  @type.uint32
  aliveCount = 0;

  /** m_originalMaxParticles (unsigned) [READ] */
  @edit.read
  @type.uint32
  originalMaxParticles = 0;

  /**
   * Rebuilds particle storage at Carbon's capped particle count, clearing live
   * particles. Typed arrays replace aligned CPU allocations; this retained
   * JS setter returns the new capacity and clears its cached empty bounds.
   */
  @impl.adapted
  SetMaxParticleCount(value)
  {
    this.#vertexBuffer?.Destroy();
    this.#vertexBuffer = null;
    this.maxParticleCount = Math.min(Number(value) >>> 0, Tr2ParticleSystem.MAX_PARTICLE_COUNT);
    this.aliveCount = 0;
    for (let index = 0; index < this.#buffers.length; index++)
    {
      const stride = this.#strides[index];
      this.#buffers[index] = stride && this.maxParticleCount
        ? new Float32Array(stride * this.maxParticleCount)
        : null;
    }
    for (const element of this.#runtimeElements)
    {
      element.buffer = this.#buffers[element.bufferIndex];
    }
    vec3.set(this.aabbMin, 0, 0, 0);
    vec3.set(this.aabbMax, 0, 0, 0);
    this.CreateVertexBuffer();
    return this.maxParticleCount;
  }

  /** Returns the currently active, possibly LOD-clamped particle budget. */
  @impl.implemented
  GetMaxParticleCount()
  {
    return this.maxParticleCount;
  }

  /** Returns the particle budget captured when the declaration was built. */
  @impl.implemented
  GetOriginalMaxParticles()
  {
    return this.originalMaxParticles;
  }

  /**
   * Carbon allocates an insertion mutex; JavaScript simulation is single
   * threaded, so the contract is an exact no-op at this layer.
   */
  @impl.noop
  SetThreadSafeFlag()
  {
  }

  /** Carbon method ClearParticles (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  ClearParticles()
  {
    this.aliveCount = 0;
    vec3.set(this.aabbMin, 0, 0, 0);
    vec3.set(this.aabbMax, 0, 0, 0);
  }

  /** Carbon method RebindConstraints (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.adapted
  @impl.reason("JavaScript has no particle-system pointer binding; constraints receive the owning model directly.")
  RebindConstraints()
  {
    for (const constraint of this.constraints)
    {
      constraint.Bind(this);
    }
  }

  /** Carbon method SaveToCMF (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.notImplemented
  SaveToCMF(...args)
  {
    throw new Error("Tr2ParticleSystem.SaveToCMF is not implemented in CarbonEngineJS.");
  }

  /** Carbon method SaveToGranny (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.notImplemented
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
  @carbon.method
  @impl.adapted
  UpdateElementDeclaration()
  {
    this.isValid = false;
    this.ReleaseResources();
    this.aliveCount = 0;
    this.#elementMap.clear();
    this.#runtimeElements.length = 0;
    this.#semanticElements.fill(null);
    this.#strides.fill(0);
    this.#buffers.fill(null);
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
        startOffset: this.#strides[bufferIndex],
        instanceStride: 0,
        buffer: null
      };
      this.#strides[bufferIndex] += dimension;
      this.#runtimeElements.push(element);
      this.#elementMap.set(key, element);
      if (elementType !== Tr2ParticleElementDeclaration.Type.CUSTOM)
      {
        this.#semanticElements[elementType] = element;
      }
    }

    this.EnsureAligned();
    for (let index = 0; index < this.#strides.length; index++)
    {
      const remainder = this.#strides[index] % 4;
      if (remainder)
      {
        this.#strides[index] += 4 - remainder;
      }
      if (index === 0) this.#strides[index] *= 2;
      if (this.#strides[index] && this.maxParticleCount)
      {
        this.#buffers[index] = new Float32Array(this.#strides[index] * this.maxParticleCount);
      }
    }
    for (const element of this.#runtimeElements)
    {
      element.instanceStride = this.#strides[element.bufferIndex];
      element.buffer = this.#buffers[element.bufferIndex];
    }
    this.originalMaxParticles = this.maxParticleCount;
    this.#declarationHash++;
    this.isValid = true;
    this.OnPrepareResources();
    this.RebindConstraints();
    return true;
  }

/**
   * Advances aging, forces, movement, emitters, constraints and bounds.
   * JS uses typed-array views in place of native particle pointers and takes
   * dt first for the existing script caller; dirty and previous-data flags
   * follow Tr2ParticleSystem.cpp:615,713-726.
   */
  @carbon.method
  @impl.adapted
  UpdateSimulation(dt, updateArguments = Tr2ParticleSystem.#defaultUpdateArguments)
  {
    if (!this.isValid)
    {
      return 0;
    }
    const deltaTime = Math.max(0, Number(dt) || 0);
    const lifetime = this.#semanticElements[Tr2ParticleElementDeclaration.Type.LIFETIME];
    const position = this.#semanticElements[Tr2ParticleElementDeclaration.Type.POSITION];
    const velocity = this.#semanticElements[Tr2ParticleElementDeclaration.Type.VELOCITY];
    const mass = this.#semanticElements[Tr2ParticleElementDeclaration.Type.MASS];

    if (this.applyAging && lifetime)
    {
      for (let index = 0; index < this.aliveCount; index++)
      {
        const offset = lifetime.startOffset + index * lifetime.instanceStride;
        lifetime.buffer[offset] += deltaTime / lifetime.buffer[offset + 1];
        if (lifetime.buffer[offset] >= 1)
        {
          this.#spawnEmitter(updateArguments, this.emitParticleOnDeathEmitter, position, velocity, index, 1);
          this.#removeParticle(index--);
        }
      }
      this.#bufferDirty = true;
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
        const positionValue = this.#getElementView(position, index);
        const velocityValue = this.#getElementView(velocity, index);
        const massValue = mass ? this.#getElementView(mass, index)[0] : 1;
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
            ) ?? forceContribution;
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
        this.#spawnEmitter(updateArguments, this.emitParticleDuringLifeEmitter, position, velocity, index, deltaTime);
      }
      this.#bufferDirty = true;
      this.#previousDataOutdated = true;
    }
    else if (this.emitParticleDuringLifeEmitter)
    {
      const activeCount = this.aliveCount;
      for (let index = 0; index < activeCount; index++)
      {
        this.#spawnEmitter(updateArguments, this.emitParticleDuringLifeEmitter, position, velocity, index, deltaTime);
      }
    }

    if (this.updateSimulation)
    {
      for (const constraint of this.constraints)
      {
        constraint.ApplyConstraint(this.#buffers, this.#strides, this.aliveCount, deltaTime);
      }
    }
    if (this.updateSimulation && this.constraints.length)
    {
      this.#bufferDirty = true;
      this.#previousDataOutdated = true;
    }
    this.#updateBounds(position);
    return this.aliveCount;
  }

  /**
   * Carbon's per-frame system update: stamps the system world transform into a
   * nominal emitter argument record, applies the visibility-driven update
   * cadence, preserves previous-frame data, and advances CPU particles.
   * JS timestamps are seconds; sorting hysteresis is ported with SortParticles.
   */
  @impl.adapted
  Update(globalArguments)
  {
    const argumentsValue = this.#updateArguments;
    argumentsValue.time = globalArguments.time;
    argumentsValue.system = globalArguments.system;
    mat4.copy(argumentsValue.parentTransform, this.#worldTransform);
    vec3.copy(argumentsValue.originShift, globalArguments.originShift);
    argumentsValue.emitCountFactor = globalArguments.emitCountFactor;

    if (this.#previousDataOutdated)
    {
      const buffer = this.#buffers[0];
      const stride = this.#strides[0];
      const half = stride >> 1;
      if (buffer)
      {
        for (let index = 0; index < this.aliveCount; index++)
        {
          const offset = index * stride;
          buffer.copyWithin(offset + half, offset, offset + half);
        }
      }
      this.#previousDataOutdated = false;
    }

    if (this.#updatePeriod > 1)
    {
      this.#updatePeriodClock = (this.#updatePeriodClock + 1) % this.#updatePeriod;
      if (this.#updatePeriodClock !== 0)
      {
        return this.aliveCount;
      }
    }

    const time = Number(argumentsValue.time) || 0;
    if (this.#lastUpdate === 0)
    {
      this.#lastUpdate = time;
    }
    const dt = Math.min(time - this.#lastUpdate, 1 / 3);
    this.#lastUpdate = time;
    return this.UpdateSimulation(dt, argumentsValue);
  }

  /** Whether the vertex declaration is initialized (independent of buffer validity). */
  @impl.implemented
  IsInstanceDataReady()
  {
    return this.#declaration !== Tr2EffectStateManager.Unknown;
  }

  /** Returns the borrowed AL buffer and native byte-stride/live-count record. */
  @impl.implemented
  GetInstanceData(_bufferIndex = 0, _screenSize = 0)
  {
    this.#instanceData.buffer = this.#vertexBuffer;
    this.#instanceData.offset = 0;
    this.#instanceData.stride = this.#strides[0] * 4;
    this.#instanceData.count = this.aliveCount;
    return this.#instanceData;
  }

  /** Returns Carbon's interned vertex declaration handle. */
  @impl.implemented
  GetInstanceBufferVertexDeclaration(_bufferIndex = 0)
  {
    return this.#declaration;
  }

  /** Returns the borrowed physical particle buffer (the index is unused). */
  @impl.implemented
  GetGpuBuffer(_bufferIndex = 0)
  {
    return this.#vertexBuffer;
  }

  /**
   * Releases the AL allocation and declaration while retaining CPU particles.
   * JS explicitly destroys the handle instead of replacing a C++ RAII value.
   */
  @impl.adapted
  ReleaseResources()
  {
    this.#declaration = Tr2EffectStateManager.Unknown;
    this.#vertexBuffer?.Destroy();
    this.#vertexBuffer = null;
    this.#bufferDirty = true;
  }

  /** Recreates the declaration and buffer; Carbon reports true even if allocation fails. */
  @impl.implemented
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
  @impl.adapted
  CreateVertexBuffer()
  {
    if (this.maxParticleCount > 0 && this.#strides[0] > 0)
    {
      const context = Tr2RenderContext_GetMainThreadRenderContext();
      this.#vertexBuffer?.Destroy();
      this.#vertexBuffer = context.CreateBuffer(Tr2BufferDescriptionAL.FromStride(
        this.#strides[0] * 4, this.maxParticleCount,
        Tr2GpuUsage.VERTEX_BUFFER, Tr2CpuUsage.WRITE_OFTEN
      ));
      if (!this.#vertexBuffer) return false;
      this.#bufferDirty = true;
    }
    return true;
  }

  /**
   * Interns current and previous semantic attributes, with one copy of CUSTOM.
   * JS sorts the element values because Map preserves insertion order rather
   * than Carbon's type/name key order, and uses the AL's named data types.
   */
  @impl.adapted
  RebuildDeclaration()
  {
    const definition = new Tr2VertexDefinition();
    const elements = Array.from(this.#elementMap.values());
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
        previous.offset += this.#strides[0] * 4 / 2;
        definition.items.push(previous);
        definition.nextOffset[0] = Math.max(definition.nextOffset[0], previous.offset + element.dimension * 4);
      }
    }
    this.#declaration = Tr2EffectStateManager.getVertexDeclarationHandle(definition);
  }

  /** Moves POSITION and VELOCITY to four-float slots at the front of their streams. */
  @impl.implemented
  EnsureAligned()
  {
    const position = this.#semanticElements[Tr2ParticleElementDeclaration.Type.POSITION];
    const velocity = this.#semanticElements[Tr2ParticleElementDeclaration.Type.VELOCITY];
    if (position)
    {
      this.ShiftOffsets(position.bufferIndex, position.startOffset, -position.dimension);
      this.ShiftOffsets(position.bufferIndex, 0, 4);
      position.startOffset = 0;
      this.#strides[position.bufferIndex]++;
    }
    if (velocity)
    {
      this.ShiftOffsets(velocity.bufferIndex, velocity.startOffset, -velocity.dimension);
      const offset = position && position.bufferIndex === velocity.bufferIndex ? 4 : 0;
      this.ShiftOffsets(velocity.bufferIndex, offset, 4);
      velocity.startOffset = offset;
      this.#strides[velocity.bufferIndex]++;
    }
  }

  /** Shifts offsets at or after start; semantic and map entries share the same JS record. */
  @impl.adapted
  ShiftOffsets(bufferType, start, shift)
  {
    for (const element of this.#runtimeElements)
    {
      if (element.bufferIndex === bufferType && element.startOffset >= start)
      {
        element.startOffset += shift;
      }
    }
  }

  /** Returns the current particle bounds, or Carbon's zero box when empty. */
  @impl.adapted
  GetInstanceBufferBoundingBox(_bufferIndex = 0)
  {
    if (this.aliveCount > 0)
    {
      vec3.copy(this.#instanceBounds.min, this.aabbMin);
      vec3.copy(this.#instanceBounds.max, this.aabbMax);
    }
    else
    {
      vec3.set(this.#instanceBounds.min, 0, 0, 0);
      vec3.set(this.#instanceBounds.max, 0, 0, 0);
    }
    return this.#instanceBounds;
  }

  /**
   * Builds particle storage and prepares AL resources. Carbon always returns
   * true; validity is queried separately. JS omits native rebase registration
   * and emitter insertion mutexes, which are not part of this render path.
   */
  @impl.adapted
  Initialize()
  {
    this.UpdateElementDeclaration();
    this.OnPrepareResources();
    this.originalMaxParticles = this.maxParticleCount;
    return true;
  }

  /**
   * The map of resolved runtime elements, keyed by semantic or custom name.
   */
  @impl.implemented
  GetElementDeclaration()
  {
    return this.#elementMap;
  }

  /**
   * A counter that increments each time the element declaration is rebuilt, so a consumer can detect a stale binding.
   */
  @impl.implemented
  GetElementDeclarationHash()
  {
    return this.#declarationHash;
  }

  /**
   * Whether an element of the given semantic type or name is present in the current declaration.
   */
  @impl.implemented
  HasElement(type)
  {
    return !!this.#resolveElement(type);
  }

  /**
   * Resolves the runtime element matching a semantic type index or element name.
   */
  @impl.adapted
  GetElement(type)
  {
    return this.#resolveElement(type);
  }

  /**
   * Reserves a slot for a new particle, returning null when the system is invalid or already full.
   */
  @impl.implemented
  BeginSpawnParticle()
  {
    if (!this.isValid || this.aliveCount >= this.maxParticleCount)
    {
      return null;
    }
    this.#bufferDirty = true;
    return this.aliveCount++;
  }

  /**
   * Updates the peak alive-particle count once a spawned particle has been fully written.
   */
  @impl.implemented
  EndSpawnParticle()
  {
    this.peakAliveCount = Math.max(this.peakAliveCount, this.aliveCount);
  }

  /**
   * Reserves a new particle slot and writes each supplied attribute into its matching element buffer.
   */
  @impl.adapted
  SpawnParticle(values = {})
  {
    const index = this.BeginSpawnParticle();
    if (index === null)
    {
      return null;
    }
    for (const element of this.#runtimeElements)
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
  @impl.adapted
  SetParticleElement(index, type, value)
  {
    const element = this.#resolveElement(type);
    if (!element || index < 0 || index >= this.maxParticleCount)
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
    this.#bufferDirty = true;
    this.#previousDataOutdated = true;
    return true;
  }

  /**
   * A view onto one particle's stored values for the resolved element, or null when unresolved or out of range.
   */
  @impl.adapted
  GetParticleElement(index, type)
  {
    const element = this.#resolveElement(type);
    return element && index >= 0 && index < this.aliveCount ? this.#getElementView(element, index) : null;
  }

  /**
   * Copies the tracked axis-aligned bounds into the caller's vectors, reporting false when no particles are alive.
   */
  @impl.implemented
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
   * sorting visibility state from the current CPU bounds.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Backend buffer validity and upload dirtiness stay engine-owned; Trinity preserves the world transform, bounds test, and update-period decision.")
  UpdateViewDependentData(frustum, worldTransform)
  {
    this.#shouldSortVisible = true;
    this.#updatePeriod = 1;
    mat4.copy(this.#worldTransform, worldTransform);

    if (!frustum || !this.GetBoundingBox(Tr2ParticleSystem.#boundsMin, Tr2ParticleSystem.#boundsMax))
    {
      return;
    }

    vec3.add(Tr2ParticleSystem.#center, Tr2ParticleSystem.#boundsMax, Tr2ParticleSystem.#boundsMin);
    vec3.scale(Tr2ParticleSystem.#center, Tr2ParticleSystem.#center, 0.5);
    vec3.subtract(Tr2ParticleSystem.#extent, Tr2ParticleSystem.#boundsMax, Tr2ParticleSystem.#boundsMin);
    vec3.scale(Tr2ParticleSystem.#extent, Tr2ParticleSystem.#extent, 0.5);

    const radius = Math.max(
      Math.abs(Tr2ParticleSystem.#extent[0]),
      Math.abs(Tr2ParticleSystem.#extent[1]),
      Math.abs(Tr2ParticleSystem.#extent[2])
    ) * Math.hypot(worldTransform[0], worldTransform[1], worldTransform[2]);
    vec3.transformMat4(Tr2ParticleSystem.#center, Tr2ParticleSystem.#center, worldTransform);
    vec4.set(
      Tr2ParticleSystem.#boundingSphere,
      Tr2ParticleSystem.#center[0],
      Tr2ParticleSystem.#center[1],
      Tr2ParticleSystem.#center[2],
      radius
    );

    if (!frustum.IsSphereVisible(Tr2ParticleSystem.#boundingSphere))
    {
      this.#shouldSortVisible = false;
      this.#updatePeriod = 4;
    }
  }

  /** Copies the owning world transform without evaluating view state. */
  @carbon.method
  @impl.implemented
  UpdateTransform(worldTransform)
  {
    mat4.copy(this.#worldTransform, worldTransform);
  }

  /**
   * A typed-array view onto one particle's slot within an element's buffer.
   */
  #getElementView(element, index)
  {
    const offset = element.startOffset + index * element.instanceStride;
    return element.buffer.subarray(offset, offset + element.dimension);
  }

  /**
   * Removes a dead particle by swapping the last alive particle into its slot across every element.
   */
  #removeParticle(index)
  {
    const last = --this.aliveCount;
    if (index === last)
    {
      return;
    }
    for (let bufferIndex = 0; bufferIndex < this.#buffers.length; bufferIndex++)
    {
      const buffer = this.#buffers[bufferIndex];
      const stride = this.#strides[bufferIndex];
      if (buffer && stride)
      {
        buffer.copyWithin(index * stride, last * stride, (last + 1) * stride);
      }
    }
  }

  /**
   * Resolves an element from a semantic type index or an element name.
   */
  #resolveElement(type)
  {
    if (typeof type === "number")
    {
      return this.#semanticElements[type] ?? null;
    }
    const name = String(type ?? "");
    const semanticName = Object.keys(Tr2ParticleElementDeclaration.Type)
      .find(key => key.toLowerCase() === name.toLowerCase());
    return this.#elementMap.get(name)
      ?? this.#elementMap.get(`custom:${name}`)
      ?? (semanticName ? this.#semanticElements[Tr2ParticleElementDeclaration.Type[semanticName]] : null)
      ?? null;
  }

  /**
   * Runs one emitter's spawn pass for the frame.
   */
  #spawnEmitter(updateArguments, emitter, position, velocity, index, rate)
  {
    if (!emitter)
    {
      return;
    }
    emitter.SpawnParticles(
      updateArguments,
      position ? this.#getElementView(position, index) : null,
      velocity ? this.#getElementView(velocity, index) : null,
      rate
    );
  }

  /**
   * Grows the tracked axis-aligned bounds to include one particle's position.
   */
  #updateBounds(position)
  {
    if (!position || this.aliveCount === 0)
    {
      vec3.set(this.aabbMin, 0, 0, 0);
      vec3.set(this.aabbMax, 0, 0, 0);
      return;
    }
    const first = this.#getElementView(position, 0);
    vec3.copy(this.aabbMin, first);
    vec3.copy(this.aabbMax, first);
    for (let index = 1; index < this.aliveCount; index++)
    {
      const value = this.#getElementView(position, index);
      vec3.min(this.aabbMin, this.aabbMin, value);
      vec3.max(this.aabbMax, this.aabbMax, value);
    }
  }

  static #boundsMin = vec3.create();

  static #boundsMax = vec3.create();

  static #center = vec3.create();

  static #extent = vec3.create();

  static #boundingSphere = vec4.create();

  static #defaultUpdateArguments = new ITr2GenericEmitterUpdateArguments();

  static MAX_PARTICLE_COUNT = 10000;

}
