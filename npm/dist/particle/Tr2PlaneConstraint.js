import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';
import { Tr2ParticleElementDeclaration as _Tr2ParticleElementDe } from './Tr2ParticleElementDeclaration.js';

let _initProto, _initClass, _init_affectPosition, _init_extra_affectPosition, _init_affectVelocity, _init_extra_affectVelocity, _init_plane, _init_extra_plane, _init_elasticity, _init_extra_elasticity, _init_friction, _init_extra_friction, _init_isValid, _init_extra_isValid, _init_onCollisionEmitters, _init_extra_onCollisionEmitters, _init_generators, _init_extra_generators, _init_particleRadiusComponent, _init_extra_particleRadiusComponent, _init_reflectionNoise, _init_extra_reflectionNoise, _init_particleRadiusCoefficient, _init_extra_particleRadiusCoefficient;

/** A collision constraint that keeps particles on one side of a plane, reflecting velocity with elasticity, friction and noise, and triggering generators and emitters on contact. */
let _Tr2PlaneConstraint;
new class extends _identity {
  static [class Tr2PlaneConstraint extends CjsModel {
    static {
      ({
        e: [_init_affectPosition, _init_extra_affectPosition, _init_affectVelocity, _init_extra_affectVelocity, _init_plane, _init_extra_plane, _init_elasticity, _init_extra_elasticity, _init_friction, _init_extra_friction, _init_isValid, _init_extra_isValid, _init_onCollisionEmitters, _init_extra_onCollisionEmitters, _init_generators, _init_extra_generators, _init_particleRadiusComponent, _init_extra_particleRadiusComponent, _init_reflectionNoise, _init_extra_reflectionNoise, _init_particleRadiusCoefficient, _init_extra_particleRadiusCoefficient, _initProto],
        c: [_Tr2PlaneConstraint, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2PlaneConstraint",
        family: "particle"
      })], [[[io, io.persist, type, type.boolean], 16, "affectPosition"], [[io, io.persist, type, type.boolean], 16, "affectVelocity"], [[io, io.notify, io, io.persist, type, type.vec4], 16, "plane"], [[io, io.persist, type, type.float32], 16, "elasticity"], [[io, io.persist, type, type.float32], 16, "friction"], [[io, io.read, type, type.boolean], 16, "isValid"], [[io, io.persist, void 0, type.list("ITr2GenericEmitter")], 16, "onCollisionEmitters"], [[io, io.persist, void 0, type.list("ITr2AttributeGenerator")], 16, "generators"], [[io, io.persist, type, type.string], 16, "particleRadiusComponent"], [[io, io.persist, type, type.float32], 16, "reflectionNoise"], [[io, io.persist, type, type.vec4], 16, "particleRadiusCoefficient"], [[impl, impl.implemented], 18, "Initialize"], [[impl, impl.implemented], 18, "OnModified"], [[impl, impl.adapted], 18, "Bind"], [[impl, impl.adapted], 18, "ApplyConstraint"]], 0, void 0, CjsModel));
    }
    constructor(...args) {
      super(...args);
      _init_extra_particleRadiusCoefficient(this);
    }
    #normalizedPlane = (_initProto(this), vec4.fromValues(0, 1, 0, 0));
    #positionElement = null;
    #velocityElement = null;
    #radiusElement = null;

    /** m_affectPosition (bool) [READWRITE, PERSIST] */
    affectPosition = _init_affectPosition(this, true);

    /** m_affectVelocity (bool) [READWRITE, PERSIST] */
    affectVelocity = (_init_extra_affectPosition(this), _init_affectVelocity(this, true));

    /** m_plane (Vector4) [READWRITE, PERSIST, NOTIFY] */
    plane = (_init_extra_affectVelocity(this), _init_plane(this, vec4.fromValues(0, 1, 0, 0)));

    /** m_elasticity (float) [READWRITE, PERSIST] */
    elasticity = (_init_extra_plane(this), _init_elasticity(this, 1));

    /** m_friction (float) [READWRITE, PERSIST] */
    friction = (_init_extra_elasticity(this), _init_friction(this, 1));

    /** m_isValid (bool) [READ] */
    isValid = (_init_extra_friction(this), _init_isValid(this, false));

    /** m_onCollisionEmitters (PITr2GenericEmitterVector) [READ, PERSIST] */
    onCollisionEmitters = (_init_extra_isValid(this), _init_onCollisionEmitters(this, []));

    /** m_generators (PITr2AttributeGeneratorVector) [READ, PERSIST] */
    generators = (_init_extra_onCollisionEmitters(this), _init_generators(this, []));

    /** m_particleRadiusComponent (std::string) [READWRITE, PERSIST] */
    particleRadiusComponent = (_init_extra_generators(this), _init_particleRadiusComponent(this, ""));

    /** m_reflectionNoise (float) [READWRITE, PERSIST] */
    reflectionNoise = (_init_extra_particleRadiusComponent(this), _init_reflectionNoise(this, 0));

    /** m_particleRadiusCoefficient (Vector4) [READWRITE, PERSIST] */
    particleRadiusCoefficient = (_init_extra_reflectionNoise(this), _init_particleRadiusCoefficient(this, vec4.fromValues(1, 0, 0, 0)));

    /**
     * Normalises the constraint plane and propagates the thread-safe flag to the on-collision emitters.
     */
    Initialize() {
      this.#normalizePlane();
      for (const emitter of this.onCollisionEmitters) {
        emitter?.SetThreadSafeFlag?.();
      }
      return true;
    }

    /**
     * Renormalises the cached plane whenever the plane property changes.
     */
    OnModified(propertyName) {
      if (!propertyName || propertyName === "plane") {
        this.#normalizePlane();
      }
      return true;
    }

    /**
     * Resolves the position, velocity and radius elements and binds the attached generators, marking the constraint valid only when all of them resolve.
     */
    Bind(particleSystem) {
      this.isValid = false;
      this.#positionElement = particleSystem?.GetElement?.(_Tr2ParticleElementDe.Type.POSITION) ?? null;
      this.#velocityElement = particleSystem?.GetElement?.(_Tr2ParticleElementDe.Type.VELOCITY) ?? null;
      this.#radiusElement = this.particleRadiusComponent ? particleSystem?.GetElement?.(this.particleRadiusComponent) ?? null : null;
      if (!this.#positionElement || this.particleRadiusComponent && !this.#radiusElement) {
        return false;
      }
      const boundElements = new Set();
      for (const generator of this.generators) {
        if (typeof generator?.Bind !== "function") {
          throw new TypeError("Particle generators must implement Carbon's Bind contract.");
        }
        if (generator.Bind(particleSystem, boundElements) === false) {
          return false;
        }
      }
      this.#normalizePlane();
      this.isValid = true;
      return true;
    }

    /**
     * Pushes particles that crossed the plane back to its surface, reflects their velocity with elasticity, friction and noise, and fires the generators and on-collision emitters.
     */
    ApplyConstraint(_buffers, _strides, count) {
      if (!this.isValid) {
        return 0;
      }
      const normal = this.#normalizedPlane;
      let collisions = 0;
      for (let index = 0; index < count; index++) {
        const position = this.#view(this.#positionElement, index);
        const velocity = this.#velocityElement ? this.#view(this.#velocityElement, index) : null;
        const radius = this.#radiusElement ? this.#dotRadius(this.#view(this.#radiusElement, index)) : 0;
        const distance = normal[0] * position[0] + normal[1] * position[1] + normal[2] * position[2] + normal[3] - radius;
        const velocityDot = velocity ? velocity[0] * normal[0] + velocity[1] * normal[1] + velocity[2] * normal[2] : -1;
        if (distance > 0 || velocityDot >= 0) {
          continue;
        }
        collisions++;
        if (this.affectPosition) {
          position[0] -= normal[0] * distance;
          position[1] -= normal[1] * distance;
          position[2] -= normal[2] * distance;
        }
        if (this.affectVelocity && velocity) {
          const bounceScale = -velocityDot * this.elasticity;
          const slideX = (velocity[0] - normal[0] * velocityDot) * this.friction;
          const slideY = (velocity[1] - normal[1] * velocityDot) * this.friction;
          const slideZ = (velocity[2] - normal[2] * velocityDot) * this.friction;
          velocity[0] = normal[0] * bounceScale + slideX;
          velocity[1] = normal[1] * bounceScale + slideY;
          velocity[2] = normal[2] * bounceScale + slideZ;
          this.#addReflectionNoise(velocity, normal);
        }
        for (const generator of this.generators) {
          generator?.Generate?.(position, velocity, index);
        }
        for (const emitter of this.onCollisionEmitters) {
          emitter?.SpawnParticles?.(position, velocity, 1);
        }
      }
      return collisions;
    }

    /**
     * Recomputes the cached unit-normal plane, falling back to the default up plane when the normal is degenerate.
     */
    #normalizePlane() {
      const length = Math.hypot(this.plane[0], this.plane[1], this.plane[2]);
      if (length > 0) {
        vec4.scale(this.#normalizedPlane, this.plane, 1 / length);
      } else {
        vec4.set(this.#normalizedPlane, 0, 1, 0, 0);
      }
    }

    /**
     * A typed-array view onto one particle's slot within a bound element's buffer.
     */
    #view(element, index) {
      const offset = element.startOffset + index * element.instanceStride;
      return element.buffer.subarray(offset, offset + element.dimension);
    }

    /**
     * The effective particle radius, from the radius element dotted against the radius coefficient.
     */
    #dotRadius(value) {
      let result = 0;
      for (let component = 0; component < Math.min(4, value.length); component++) {
        result += value[component] * this.particleRadiusCoefficient[component];
      }
      return result;
    }

    /**
     * Carbon adds tangential noise scaled by the post-bounce speed to the
     * reflected velocity (Tr2PlaneConstraint.cpp:154-165).
     */
    #addReflectionNoise(velocity, normal) {
      if (this.reflectionNoise <= 0) {
        return;
      }
      const noise = _Tr2PlaneConstraint.#noise;
      vec3.set(noise, Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1);
      vec3.scale(noise, noise, this.reflectionNoise);
      vec3.scaleAndAdd(noise, noise, normal, -vec3.dot(noise, normal));
      vec3.scaleAndAdd(velocity, velocity, noise, vec3.length(velocity));
    }
  }];
  #noise = vec3.create();
  constructor() {
    super(_Tr2PlaneConstraint), _initClass();
  }
}();

export { _Tr2PlaneConstraint as Tr2PlaneConstraint };
//# sourceMappingURL=Tr2PlaneConstraint.js.map
