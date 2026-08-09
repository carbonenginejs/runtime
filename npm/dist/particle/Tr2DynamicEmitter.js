import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { hasUnboundParticleElements } from './particleElementBinding.js';

let _initProto, _initClass, _init_name, _init_extra_name, _init_isValid, _init_extra_isValid, _init_generators, _init_extra_generators, _init_maxParticles, _init_extra_maxParticles, _init_rate, _init_extra_rate, _init_particleSystem, _init_extra_particleSystem;

/** A continuous-rate particle emitter that binds attribute generators to a particle system and spawns particles over time from an accumulated emission rate. */
let _Tr2DynamicEmitter;
new class extends _identity {
  static [class Tr2DynamicEmitter extends CjsModel {
    static {
      ({
        e: [_init_name, _init_extra_name, _init_isValid, _init_extra_isValid, _init_generators, _init_extra_generators, _init_maxParticles, _init_extra_maxParticles, _init_rate, _init_extra_rate, _init_particleSystem, _init_extra_particleSystem, _initProto],
        c: [_Tr2DynamicEmitter, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2DynamicEmitter",
        family: "particle"
      })], [[[io, io.persist, type, type.string], 16, "name"], [[io, io.read, type, type.boolean], 16, "isValid"], [[io, io.persist, void 0, type.list("ITr2AttributeGenerator")], 16, "generators"], [[io, io.persist, type, type.int32], 16, "maxParticles"], [[io, io.persist, type, type.float32], 16, "rate"], [[io, io.notify, io, io.persist, void 0, type.model("Tr2ParticleSystem")], 16, "particleSystem"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Browser attribute generators bind directly to the CPU particle-system adapter rather than native declaration pointers.")], 18, "Rebind"], [[carbon, carbon.method, impl, impl.adapted], 18, "UpdateSimulation"], [[impl, impl.adapted, void 0, impl.reason("Be::Time arrives as float seconds on the duck-typed update-arguments record instead of Carbon's native UpdateArguments struct.")], 18, "Update"], [[impl, impl.implemented], 18, "Initialize"], [[impl, impl.implemented], 18, "OnModified"], [[impl, impl.adapted, void 0, impl.reason("JavaScript updates are single-threaded; the flag is retained and propagated only for Carbon contract parity.")], 18, "SetThreadSafeFlag"], [[impl, impl.adapted, void 0, impl.reason("JavaScript cannot overload; Carbon's signatures are distinguished by duck-typing the leading update-arguments record and the argument count.")], 18, "SpawnParticles"], [[impl, impl.implemented], 18, "GetEmittedParticleCount"], [[impl, impl.implemented], 18, "ResetEmittedParticleCount"]], 0, void 0, CjsModel));
    }
    constructor(...args) {
      super(...args);
      _init_extra_particleSystem(this);
    }
    #accumulatedRate = (_initProto(this), 0);
    #declarationHash = 0;
    #emittedParticles = 0;
    #isThreadSafe = false;
    #lastUpdate = 0;

    /** m_name (std::string) [READWRITE, PERSIST] */
    name = _init_name(this, "");

    /** m_isValid (bool) [READ] */
    isValid = (_init_extra_name(this), _init_isValid(this, false));

    /** m_generators (PITr2AttributeGeneratorVector) [READ, PERSIST] */
    generators = (_init_extra_isValid(this), _init_generators(this, []));

    /** m_maxParticles (int32_t) [READWRITE, PERSIST] */
    maxParticles = (_init_extra_generators(this), _init_maxParticles(this, -1));

    /** m_rate (float) [READWRITE, PERSIST] */
    rate = (_init_extra_maxParticles(this), _init_rate(this, 0));

    /** m_particleSystem (Tr2ParticleSystemPtr) [READWRITE, PERSIST, NOTIFY] */
    particleSystem = (_init_extra_rate(this), _init_particleSystem(this, null));

    /** Carbon method Rebind (MAP_METHOD_AND_WRAP). */
    Rebind() {
      this.#emittedParticles = 0;
      this.#accumulatedRate = 0;
      this.isValid = false;
      if (!this.particleSystem?.isValid) {
        return false;
      }
      const boundElements = new Set();
      for (const generator of this.generators) {
        if (typeof generator?.Bind !== "function") {
          throw new TypeError("Particle generators must implement Carbon's Bind contract.");
        }
        if (generator.Bind(this.particleSystem, boundElements) === false) {
          return false;
        }
      }
      if (hasUnboundParticleElements(this.particleSystem, boundElements)) {
        return false;
      }
      this.#declarationHash = this.particleSystem.GetElementDeclarationHash();
      this.isValid = true;
      return true;
    }

    /** Carbon method UpdateSimulation (MAP_METHOD_AND_WRAP). */
    UpdateSimulation(dt) {
      return this.SpawnParticles(null, null, Math.max(0, Number(dt) || 0));
    }

    /**
     * ITr2GenericEmitter.Update (Tr2DynamicEmitter.cpp:109-123): clamp the frame
     * delta to 0.3s and spawn at the constant rate scaled by the LOD
     * emit-count factor.
     */
    Update(updateArguments) {
      if (!this.isValid || !this.particleSystem) {
        return;
      }
      const time = Number(updateArguments?.time) || 0;
      if (this.#lastUpdate === 0) {
        this.#lastUpdate = time;
      }
      const dt = Math.min(time - this.#lastUpdate, 0.3);
      this.#lastUpdate = time;
      const emitCountFactor = Number(updateArguments?.emitCountFactor ?? 1);
      this.UpdateSimulation(dt * emitCountFactor);
    }

    /**
     * Rebinds the attribute generators against the particle system, re-propagating the thread-safe flag when it was already set.
     */
    Initialize() {
      if (this.particleSystem) {
        this.Rebind();
        if (this.#isThreadSafe) {
          this.particleSystem.SetThreadSafeFlag?.();
        }
      }
      return true;
    }

    /** INotify.OnModified (Tr2DynamicEmitter.cpp:63-74): rebind on particle-system changes. */
    /**
     * Rebinds the attribute generators and re-propagates the thread-safe flag whenever the particle-system reference changes.
     */
    OnModified(propertyName) {
      if (!propertyName || propertyName === "particleSystem") {
        this.Rebind();
        if (this.#isThreadSafe && this.particleSystem) {
          this.particleSystem.SetThreadSafeFlag?.();
        }
      }
      return true;
    }

    /** ITr2GenericEmitter.SetThreadSafeFlag (Tr2DynamicEmitter.cpp:81-88). */
    SetThreadSafeFlag() {
      this.#isThreadSafe = true;
      this.particleSystem?.SetThreadSafeFlag?.();
    }

    /**
     * Both Carbon SpawnParticles overloads (Tr2DynamicEmitter.cpp:150-221)
     * collapse into one duck-typed entry point:
     * - (position, velocity, rateModifier) - the Tr2ParticleSystem CPU call shape;
     * - (updateArguments, position, velocity, rateModifier) - Carbon overload 1;
     * - (updateArguments, positionStart, positionEnd, velocityStart, velocityEnd,
     *   deltaTime) - Carbon overload 2, which forwards the end-of-frame values to
     *   overload 1 exactly as Tr2DynamicEmitter.cpp:213-221 does.
     * An update-arguments record is recognized as a leading non-array-like object.
     */
    SpawnParticles(a = null, b = null, c = undefined, d = undefined, e = undefined, f = undefined) {
      let position;
      let velocity;
      let rateModifier;
      if (a !== null && typeof a === "object" && typeof a.length !== "number") {
        // Carbon signature with the UpdateArguments record first.
        if (f !== undefined) {
          position = _Tr2DynamicEmitter.#asVector(c);
          velocity = _Tr2DynamicEmitter.#asVector(e);
          rateModifier = f;
        } else {
          position = _Tr2DynamicEmitter.#asVector(b);
          velocity = _Tr2DynamicEmitter.#asVector(c);
          rateModifier = d ?? 1;
        }
      } else {
        position = a ?? null;
        velocity = b ?? null;
        rateModifier = c ?? 1;
      }
      if (!this.isValid || !this.particleSystem) {
        return 0;
      }
      if ((this.particleSystem.GetElementDeclarationHash?.() ?? 0) !== this.#declarationHash) {
        this.isValid = false;
        return 0;
      }
      if (this.rate <= 0) {
        return 0;
      }
      this.#accumulatedRate += this.rate * Math.max(0, Number(rateModifier) || 0);
      let count = Math.floor(this.#accumulatedRate);
      this.#accumulatedRate -= count;
      // Carbon counts the whole batch against maxParticles before inserting
      // (Tr2DynamicEmitter.cpp:175-179), even when the system fills up mid-batch.
      if (this.maxParticles >= 0 && this.#emittedParticles + count > this.maxParticles) {
        count = Math.max(this.maxParticles - this.#emittedParticles, 0);
      }
      this.#emittedParticles += count;
      let spawned = 0;
      for (let index = 0; index < count; index++) {
        const particleIndex = this.particleSystem.BeginSpawnParticle?.();
        if (particleIndex === null || particleIndex === undefined) {
          break;
        }
        for (const generator of this.generators) {
          generator?.Generate?.(position, velocity, particleIndex);
        }
        this.particleSystem.EndSpawnParticle?.();
        spawned++;
      }
      return spawned;
    }

    /**
     * The running count of particles emitted since the last reset.
     */
    GetEmittedParticleCount() {
      return this.#emittedParticles;
    }

    /**
     * Resets the running emitted-particle count to zero.
     */
    ResetEmittedParticleCount() {
      this.#emittedParticles = 0;
    }

    /** Returns the value when it is an array-like vector, otherwise null. */
  }];
  #asVector(value) {
    return value !== null && value !== undefined && typeof value.length === "number" ? value : null;
  }
  constructor() {
    super(_Tr2DynamicEmitter), _initClass();
  }
}();

export { _Tr2DynamicEmitter as Tr2DynamicEmitter };
//# sourceMappingURL=Tr2DynamicEmitter.js.map
