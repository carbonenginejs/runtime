import { applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { Tr2ParticleElementDeclaration as _Tr2ParticleElementDe } from './element/Tr2ParticleElementDeclaration.js';

let _initProto, _initClass, _init_elements, _init_extra_elements, _init_isValid, _init_extra_isValid, _init_name, _init_extra_name, _init_constraints, _init_extra_constraints, _init_forces, _init_extra_forces, _init_emitParticleOnDeathEmitter, _init_extra_emitParticleOnDeathEmitter, _init_emitParticleDuringLifeEmitter, _init_extra_emitParticleDuringLifeEmitter, _init_applyForce, _init_extra_applyForce, _init_applyAging, _init_extra_applyAging, _init_isGlobal, _init_extra_isGlobal, _init_updateSimulation, _init_extra_updateSimulation, _init_requiresSorting, _init_extra_requiresSorting, _init_aabbMax, _init_extra_aabbMax, _init_aabbMin, _init_extra_aabbMin, _init_peakAliveCount, _init_extra_peakAliveCount, _init_useSimTimeRebase, _init_extra_useSimTimeRebase, _init_maxParticleCount, _init_extra_maxParticleCount, _init_aliveCount, _init_extra_aliveCount, _init_originalMaxParticles, _init_extra_originalMaxParticles;

/** Owns a particle system's element declaration, CPU-side attribute buffers, and per-frame simulation of aging, forces, movement, constraints and bounds. */
let _Tr2ParticleSystem;
class Tr2ParticleSystem extends CjsModel {
  static {
    ({
      e: [_init_elements, _init_extra_elements, _init_isValid, _init_extra_isValid, _init_name, _init_extra_name, _init_constraints, _init_extra_constraints, _init_forces, _init_extra_forces, _init_emitParticleOnDeathEmitter, _init_extra_emitParticleOnDeathEmitter, _init_emitParticleDuringLifeEmitter, _init_extra_emitParticleDuringLifeEmitter, _init_applyForce, _init_extra_applyForce, _init_applyAging, _init_extra_applyAging, _init_isGlobal, _init_extra_isGlobal, _init_updateSimulation, _init_extra_updateSimulation, _init_requiresSorting, _init_extra_requiresSorting, _init_aabbMax, _init_extra_aabbMax, _init_aabbMin, _init_extra_aabbMin, _init_peakAliveCount, _init_extra_peakAliveCount, _init_useSimTimeRebase, _init_extra_useSimTimeRebase, _init_maxParticleCount, _init_extra_maxParticleCount, _init_aliveCount, _init_extra_aliveCount, _init_originalMaxParticles, _init_extra_originalMaxParticles, _initProto],
      c: [_Tr2ParticleSystem, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2ParticleSystem",
      family: "particle"
    })], [[[io, io.persist, void 0, type.list("Tr2ParticleElementDeclaration")], 16, "elements"], [[io, io.read, type, type.boolean], 16, "isValid"], [[io, io.persist, type, type.string], 16, "name"], [[io, io.persist, void 0, type.list("ITr2GenericParticleConstraint")], 16, "constraints"], [[io, io.persist, void 0, type.list("ITr2ParticleForce")], 16, "forces"], [[io, io.notify, io, io.persist, void 0, type.model("ITr2GenericEmitter")], 16, "emitParticleOnDeathEmitter"], [[io, io.notify, io, io.persist, void 0, type.model("ITr2GenericEmitter")], 16, "emitParticleDuringLifeEmitter"], [[io, io.persist, type, type.boolean], 16, "applyForce"], [[io, io.persist, type, type.boolean], 16, "applyAging"], [[io, io.persist, type, type.boolean], 16, "isGlobal"], [[io, io.persist, type, type.boolean], 16, "updateSimulation"], [[io, io.notify, io, io.persist, type, type.boolean], 16, "requiresSorting"], [[io, io.read, type, type.vec3], 16, "aabbMax"], [[io, io.read, type, type.vec3], 16, "aabbMin"], [[io, io.read, type, type.uint32], 16, "peakAliveCount"], [[io, io.notify, io, io.persist, type, type.boolean], 16, "useSimTimeRebase"], [[io, io.persistOnly, type, type.uint32], 16, "maxParticleCount"], [[io, io.read, type, type.uint32], 16, "aliveCount"], [[io, io.read, type, type.uint32], 16, "originalMaxParticles"], [[carbon, carbon.method, impl, impl.implemented], 18, "ClearParticles"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("JavaScript has no particle-system pointer binding; constraints receive the owning model directly.")], 18, "RebindConstraints"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "SaveToCMF"], [[carbon, carbon.method, impl, impl.notImplemented], 18, "SaveToGranny"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Builds Carbon's particle declaration and CPU mirrors without allocating a backend GPU vertex buffer.")], 18, "UpdateElementDeclaration"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Runs Carbon's aging, force, movement, emitter, constraint, and bounds stages against CPU particle mirrors.")], 18, "UpdateSimulation"], [[impl, impl.implemented], 18, "Initialize"], [[impl, impl.implemented], 18, "GetElementDeclaration"], [[impl, impl.implemented], 18, "GetElementDeclarationHash"], [[impl, impl.implemented], 18, "HasElement"], [[impl, impl.adapted], 18, "GetElement"], [[impl, impl.implemented], 18, "BeginSpawnParticle"], [[impl, impl.implemented], 18, "EndSpawnParticle"], [[impl, impl.adapted], 18, "SpawnParticle"], [[impl, impl.adapted], 18, "SetParticleElement"], [[impl, impl.adapted], 18, "GetParticleElement"], [[impl, impl.implemented], 18, "GetBoundingBox"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_originalMaxParticles(this);
  }
  #buffers = (_initProto(this), [null, null]);
  #declarationHash = 0;
  #elementMap = new Map();
  #runtimeElements = [];
  #semanticElements = [null, null, null, null, null];
  #strides = [0, 0];

  /** m_elements (PTr2ParticleElementDeclarationVector) [READ, PERSIST] */
  elements = _init_elements(this, []);

  /** m_isValid (bool) [READ] */
  isValid = (_init_extra_elements(this), _init_isValid(this, false));

  /** m_name (std::string) [READWRITE, PERSIST] */
  name = (_init_extra_isValid(this), _init_name(this, ""));

  /** m_constraints (PITr2GenericParticleConstraintVector) [READ, PERSIST] */
  constraints = (_init_extra_name(this), _init_constraints(this, []));

  /** m_forces (PITr2ParticleForceVector) [READ, PERSIST] */
  forces = (_init_extra_constraints(this), _init_forces(this, []));

  /** m_emissionOnDeathEmitter (ITr2GenericEmitterPtr) [READWRITE, NOTIFY, PERSIST] */
  emitParticleOnDeathEmitter = (_init_extra_forces(this), _init_emitParticleOnDeathEmitter(this, null));

  /** m_emissionWhileAliveEmitter (ITr2GenericEmitterPtr) [READWRITE, NOTIFY, PERSIST] */
  emitParticleDuringLifeEmitter = (_init_extra_emitParticleOnDeathEmitter(this), _init_emitParticleDuringLifeEmitter(this, null));

  /** m_applyForce (bool) [READWRITE, PERSIST] */
  applyForce = (_init_extra_emitParticleDuringLifeEmitter(this), _init_applyForce(this, true));

  /** m_applyAging (bool) [READWRITE, PERSIST] */
  applyAging = (_init_extra_applyForce(this), _init_applyAging(this, true));

  /** m_isGlobal (bool) [READWRITE, PERSIST] */
  isGlobal = (_init_extra_applyAging(this), _init_isGlobal(this, false));

  /** m_updateSimulation (bool) [READWRITE, PERSIST] */
  updateSimulation = (_init_extra_isGlobal(this), _init_updateSimulation(this, true));

  /** m_requiresSorting (bool) [READWRITE, PERSIST, NOTIFY] */
  requiresSorting = (_init_extra_updateSimulation(this), _init_requiresSorting(this, false));

  /** m_AabbMax (Vector3) [READ] */
  aabbMax = (_init_extra_requiresSorting(this), _init_aabbMax(this, vec3.create()));

  /** m_AabbMin (Vector3) [READ] */
  aabbMin = (_init_extra_aabbMax(this), _init_aabbMin(this, vec3.create()));

  /** m_peakAliveCount (unsigned) [READ] */
  peakAliveCount = (_init_extra_aabbMin(this), _init_peakAliveCount(this, 0));

  /** m_useSimTimeRebase (bool) [READWRITE, NOTIFY, PERSIST] */
  useSimTimeRebase = (_init_extra_peakAliveCount(this), _init_useSimTimeRebase(this, false));

  /** m_maxParticleCount (unsigned) [PERSISTONLY] */
  maxParticleCount = (_init_extra_useSimTimeRebase(this), _init_maxParticleCount(this, 0));

  /** m_aliveCount (unsigned) [READ] */
  aliveCount = (_init_extra_maxParticleCount(this), _init_aliveCount(this, 0));

  /** m_originalMaxParticles (unsigned) [READ] */
  originalMaxParticles = (_init_extra_aliveCount(this), _init_originalMaxParticles(this, 0));

  /** Carbon method ClearParticles (MAP_METHOD_AND_WRAP). */
  ClearParticles() {
    this.aliveCount = 0;
    vec3.set(this.aabbMin, 0, 0, 0);
    vec3.set(this.aabbMax, 0, 0, 0);
  }

  /** Carbon method RebindConstraints (MAP_METHOD_AND_WRAP). */
  RebindConstraints() {
    for (const constraint of this.constraints) {
      constraint?.Bind?.(this);
    }
  }

  /** Carbon method SaveToCMF (MAP_METHOD_AND_WRAP). */
  SaveToCMF(...args) {
    throw new Error("Tr2ParticleSystem.SaveToCMF is not implemented in CarbonEngineJS.");
  }

  /** Carbon method SaveToGranny (MAP_METHOD_AND_WRAP). */
  SaveToGranny(...args) {
    throw new Error("Tr2ParticleSystem.SaveToGranny is not implemented in CarbonEngineJS.");
  }

  /** Carbon method UpdateElementDeclaration (MAP_METHOD_AND_WRAP). */
  UpdateElementDeclaration() {
    this.isValid = false;
    this.aliveCount = 0;
    this.#elementMap.clear();
    this.#runtimeElements.length = 0;
    this.#semanticElements.fill(null);
    this.#strides.fill(0);
    this.#buffers.fill(null);
    if (this.elements.length === 0) {
      return false;
    }
    const semantics = new Set();
    const gpuUsages = new Set();
    for (const source of this.elements) {
      const elementType = Math.trunc(Number(source?.elementType));
      if (elementType < 0 || elementType > _Tr2ParticleElementDe.Type.CUSTOM) {
        return false;
      }
      const customName = String(source?.customName ?? "");
      const key = elementType === _Tr2ParticleElementDe.Type.CUSTOM ? `custom:${customName}` : `semantic:${elementType}`;
      if (semantics.has(key)) {
        return false;
      }
      semantics.add(key);
      const usageIndex = Math.max(0, Math.trunc(Number(source?.usageIndex) || 0));
      if (elementType === _Tr2ParticleElementDe.Type.CUSTOM && source?.usedByGPU) {
        if (usageIndex >= 8 || gpuUsages.has(usageIndex)) {
          return false;
        }
        gpuUsages.add(usageIndex);
      }
      const bufferIndex = source?.usedByGPU ? 0 : 1;
      const dimension = source?.GetDimension?.() ?? Math.max(1, Math.min(4, Math.trunc(Number(source?.dimension)) || 1));
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
      if (elementType !== _Tr2ParticleElementDe.Type.CUSTOM) {
        this.#semanticElements[elementType] = element;
      }
    }
    for (let index = 0; index < this.#strides.length; index++) {
      const remainder = this.#strides[index] % 4;
      if (remainder) {
        this.#strides[index] += 4 - remainder;
      }
      if (this.#strides[index] && this.maxParticleCount) {
        this.#buffers[index] = new Float32Array(this.#strides[index] * this.maxParticleCount);
      }
    }
    for (const element of this.#runtimeElements) {
      element.instanceStride = this.#strides[element.bufferIndex];
      element.buffer = this.#buffers[element.bufferIndex];
    }
    this.originalMaxParticles = this.maxParticleCount;
    this.#declarationHash++;
    this.isValid = true;
    this.RebindConstraints();
    return true;
  }

  /** Carbon method UpdateSimulation -> UpdateSimulationScript (MAP_METHOD_AND_WRAP). */
  UpdateSimulation(dt) {
    if (!this.isValid) {
      return 0;
    }
    const deltaTime = Math.max(0, Number(dt) || 0);
    const lifetime = this.#semanticElements[_Tr2ParticleElementDe.Type.LIFETIME];
    const position = this.#semanticElements[_Tr2ParticleElementDe.Type.POSITION];
    const velocity = this.#semanticElements[_Tr2ParticleElementDe.Type.VELOCITY];
    const mass = this.#semanticElements[_Tr2ParticleElementDe.Type.MASS];
    if (this.applyAging && lifetime) {
      for (let index = 0; index < this.aliveCount; index++) {
        const offset = lifetime.startOffset + index * lifetime.instanceStride;
        lifetime.buffer[offset] += deltaTime / lifetime.buffer[offset + 1];
        if (lifetime.buffer[offset] >= 1) {
          this.#spawnEmitter(this.emitParticleOnDeathEmitter, position, velocity, index, 1);
          this.#removeParticle(index--);
        }
      }
    }
    if (this.updateSimulation && position && velocity) {
      for (const force of this.forces) {
        force?.Update?.(deltaTime);
      }
      const forceValue = vec3.create();
      const forceContribution = vec3.create();
      const activeCount = this.aliveCount;
      for (let index = 0; index < activeCount; index++) {
        const positionValue = this.#getElementView(position, index);
        const velocityValue = this.#getElementView(velocity, index);
        const massValue = mass ? this.#getElementView(mass, index)[0] : 1;
        if (this.applyForce && this.forces.length) {
          vec3.set(forceValue, 0, 0, 0);
          for (const force of this.forces) {
            if (typeof force?.GetForce !== "function") {
              throw new TypeError("Particle forces must implement Carbon's GetForce contract.");
            }
            vec3.set(forceContribution, 0, 0, 0);
            const result = force.GetForce(positionValue, velocityValue, deltaTime, massValue, forceContribution) ?? forceContribution;
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
        this.#spawnEmitter(this.emitParticleDuringLifeEmitter, position, velocity, index, deltaTime);
      }
    } else if (this.emitParticleDuringLifeEmitter) {
      const activeCount = this.aliveCount;
      for (let index = 0; index < activeCount; index++) {
        this.#spawnEmitter(this.emitParticleDuringLifeEmitter, position, velocity, index, deltaTime);
      }
    }
    if (this.updateSimulation) {
      for (const constraint of this.constraints) {
        constraint?.ApplyConstraint?.(this.#buffers, this.#strides, this.aliveCount, deltaTime);
      }
    }
    this.#updateBounds(position);
    return this.aliveCount;
  }

  /**
   * Builds the particle-element declaration and CPU buffers, reporting whether the resulting layout is valid.
   */
  Initialize() {
    return this.UpdateElementDeclaration();
  }

  /**
   * The map of resolved runtime elements, keyed by semantic or custom name.
   */
  GetElementDeclaration() {
    return this.#elementMap;
  }

  /**
   * A counter that increments each time the element declaration is rebuilt, so a consumer can detect a stale binding.
   */
  GetElementDeclarationHash() {
    return this.#declarationHash;
  }

  /**
   * Whether an element of the given semantic type or name is present in the current declaration.
   */
  HasElement(type) {
    return !!this.#resolveElement(type);
  }

  /**
   * Resolves the runtime element matching a semantic type index or element name.
   */
  GetElement(type) {
    return this.#resolveElement(type);
  }

  /**
   * Reserves a slot for a new particle, returning null when the system is invalid or already full.
   */
  BeginSpawnParticle() {
    if (!this.isValid || this.aliveCount >= this.maxParticleCount) {
      return null;
    }
    return this.aliveCount++;
  }

  /**
   * Updates the peak alive-particle count once a spawned particle has been fully written.
   */
  EndSpawnParticle() {
    this.peakAliveCount = Math.max(this.peakAliveCount, this.aliveCount);
  }

  /**
   * Reserves a new particle slot and writes each supplied attribute into its matching element buffer.
   */
  SpawnParticle(values = {}) {
    const index = this.BeginSpawnParticle();
    if (index === null) {
      return null;
    }
    for (const element of this.#runtimeElements) {
      const name = element.elementType === _Tr2ParticleElementDe.Type.CUSTOM ? element.customName : Object.keys(_Tr2ParticleElementDe.Type).find(key => _Tr2ParticleElementDe.Type[key] === element.elementType)?.toLowerCase();
      const value = values[element.key] ?? values[name];
      if (value !== undefined) {
        this.SetParticleElement(index, element.key, value);
      }
    }
    this.EndSpawnParticle();
    return index;
  }

  /**
   * Writes a scalar or vector value into one particle's slot for the resolved element.
   */
  SetParticleElement(index, type, value) {
    const element = this.#resolveElement(type);
    if (!element || index < 0 || index >= this.maxParticleCount) {
      return false;
    }
    const offset = element.startOffset + index * element.instanceStride;
    if (typeof value === "number") {
      element.buffer[offset] = value;
    } else {
      for (let component = 0; component < element.dimension; component++) {
        element.buffer[offset + component] = Number(value?.[component]) || 0;
      }
    }
    return true;
  }

  /**
   * A view onto one particle's stored values for the resolved element, or null when unresolved or out of range.
   */
  GetParticleElement(index, type) {
    const element = this.#resolveElement(type);
    return element && index >= 0 && index < this.aliveCount ? this.#getElementView(element, index) : null;
  }

  /**
   * Copies the tracked axis-aligned bounds into the caller's vectors, reporting false when no particles are alive.
   */
  GetBoundingBox(outMin = vec3.create(), outMax = vec3.create()) {
    if (this.aliveCount === 0) {
      return false;
    }
    vec3.copy(outMin, this.aabbMin);
    vec3.copy(outMax, this.aabbMax);
    return {
      min: outMin,
      max: outMax
    };
  }

  /**
   * A typed-array view onto one particle's slot within an element's buffer.
   */
  #getElementView(element, index) {
    const offset = element.startOffset + index * element.instanceStride;
    return element.buffer.subarray(offset, offset + element.dimension);
  }

  /**
   * Removes a dead particle by swapping the last alive particle into its slot across every element.
   */
  #removeParticle(index) {
    const last = --this.aliveCount;
    if (index === last) {
      return;
    }
    for (let bufferIndex = 0; bufferIndex < this.#buffers.length; bufferIndex++) {
      const buffer = this.#buffers[bufferIndex];
      const stride = this.#strides[bufferIndex];
      if (buffer && stride) {
        buffer.copyWithin(index * stride, last * stride, (last + 1) * stride);
      }
    }
  }

  /**
   * Resolves an element from a semantic type index or an element name.
   */
  #resolveElement(type) {
    if (typeof type === "number") {
      return this.#semanticElements[type] ?? null;
    }
    const name = String(type ?? "");
    const semanticName = Object.keys(_Tr2ParticleElementDe.Type).find(key => key.toLowerCase() === name.toLowerCase());
    return this.#elementMap.get(name) ?? this.#elementMap.get(`custom:${name}`) ?? (semanticName ? this.#semanticElements[_Tr2ParticleElementDe.Type[semanticName]] : null) ?? null;
  }

  /**
   * Runs one emitter's spawn pass for the frame.
   */
  #spawnEmitter(emitter, position, velocity, index, rate) {
    if (!emitter?.SpawnParticles) {
      return;
    }
    emitter.SpawnParticles(position ? this.#getElementView(position, index) : null, velocity ? this.#getElementView(velocity, index) : null, rate);
  }

  /**
   * Grows the tracked axis-aligned bounds to include one particle's position.
   */
  #updateBounds(position) {
    if (!position || this.aliveCount === 0) {
      vec3.set(this.aabbMin, 0, 0, 0);
      vec3.set(this.aabbMax, 0, 0, 0);
      return;
    }
    const first = this.#getElementView(position, 0);
    vec3.copy(this.aabbMin, first);
    vec3.copy(this.aabbMax, first);
    for (let index = 1; index < this.aliveCount; index++) {
      const value = this.#getElementView(position, index);
      vec3.min(this.aabbMin, this.aabbMin, value);
      vec3.max(this.aabbMax, this.aabbMax, value);
    }
  }
  static {
    _initClass();
  }
}

export { _Tr2ParticleSystem as Tr2ParticleSystem };
//# sourceMappingURL=Tr2ParticleSystem.js.map
