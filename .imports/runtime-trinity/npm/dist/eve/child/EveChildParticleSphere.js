import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { bindParticleElement, hasUnboundParticleElements } from '../../particle/element/particleElementBinding.js';
import { Tr2ParticleElementDeclaration as _Tr2ParticleElementDe } from '../../particle/element/Tr2ParticleElementDeclaration.js';
import { EveSpaceObjectChild as _EveSpaceObjectChild } from './EveSpaceObjectChild.js';

let _initProto, _initClass, _init_name, _init_extra_name, _init_particleSystem, _init_extra_particleSystem, _init_mesh, _init_extra_mesh, _init_useSpaceObjectData, _init_extra_useSpaceObjectData, _init_maxSpeed, _init_extra_maxSpeed, _init_radius, _init_extra_radius, _init_egoSpeed, _init_extra_egoSpeed, _init_positionShiftDecreaseSpeed, _init_extra_positionShiftDecreaseSpeed, _init_positionShiftIncreaseSpeed, _init_extra_positionShiftIncreaseSpeed, _init_generators, _init_extra_generators, _init_movementScale, _init_extra_movementScale, _init_positionShift, _init_extra_positionShift, _init_display, _init_extra_display, _init_positionShiftMin, _init_extra_positionShiftMin, _init_positionShiftMax, _init_extra_positionShiftMax;
const BIND_PENDING = 0;
const BIND_VALID = 1;
const BIND_INVALID = 2;

/** A model that binds a particle system's position, velocity and lifetime elements and its attribute generators for a sphere-distributed ambient effect. */
let _EveChildParticleSphe;
class EveChildParticleSphere extends _EveSpaceObjectChild {
  static {
    ({
      e: [_init_name, _init_extra_name, _init_particleSystem, _init_extra_particleSystem, _init_mesh, _init_extra_mesh, _init_useSpaceObjectData, _init_extra_useSpaceObjectData, _init_maxSpeed, _init_extra_maxSpeed, _init_radius, _init_extra_radius, _init_egoSpeed, _init_extra_egoSpeed, _init_positionShiftDecreaseSpeed, _init_extra_positionShiftDecreaseSpeed, _init_positionShiftIncreaseSpeed, _init_extra_positionShiftIncreaseSpeed, _init_generators, _init_extra_generators, _init_movementScale, _init_extra_movementScale, _init_positionShift, _init_extra_positionShift, _init_display, _init_extra_display, _init_positionShiftMin, _init_extra_positionShiftMin, _init_positionShiftMax, _init_extra_positionShiftMax, _initProto],
      c: [_EveChildParticleSphe, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveChildParticleSphere",
      family: "eve/child"
    })], [[[io, io.persist, type, type.string], 16, "name"], [[io, io.persist, void 0, type.model("Tr2ParticleSystem")], 16, "particleSystem"], [[io, io.persist, void 0, type.model("Tr2InstancedMesh")], 16, "mesh"], [[io, io.persist, type, type.boolean], 16, "useSpaceObjectData"], [[io, io.persist, type, type.float32], 16, "maxSpeed"], [[io, io.persist, type, type.float32], 16, "radius"], [[io, io.read, type, type.float32], 16, "egoSpeed"], [[io, io.persist, type, type.float32], 16, "positionShiftDecreaseSpeed"], [[io, io.persist, type, type.float32], 16, "positionShiftIncreaseSpeed"], [[io, io.persist, void 0, type.list("ITr2AttributeGenerator")], 16, "generators"], [[io, io.persist, type, type.float32], 16, "movementScale"], [[io, io.read, type, type.float32], 16, "positionShift"], [[io, io.persist, type, type.boolean], 16, "display"], [[io, io.persist, type, type.float32], 16, "positionShiftMin"], [[io, io.persist, type, type.float32], 16, "positionShiftMax"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Browser attribute generators bind to the CPU particle-system declaration while retaining Carbon's shared element-claim validation.")], 18, "Refresh"]], 0, void 0, _EveSpaceObjectChild));
  }
  constructor(...args) {
    super(...args);
    _init_extra_positionShiftMax(this);
  }
  #bindStatus = (_initProto(this), BIND_PENDING);
  #lifetimeElement = null;
  #positionElement = null;
  #previousOrigin = vec3.create();
  #velocityElement = null;

  /** m_name (std::string) [READWRITE, PERSIST] */
  name = _init_name(this, "");

  /** m_particleSystem (Tr2ParticleSystemPtr) [READWRITE, PERSIST] */
  particleSystem = (_init_extra_name(this), _init_particleSystem(this, null));

  /** m_mesh (Tr2InstancedMeshPtr) [READWRITE, PERSIST] */
  mesh = (_init_extra_particleSystem(this), _init_mesh(this, null));

  /** m_useSpaceObjectData (bool) [READWRITE, PERSIST] */
  useSpaceObjectData = (_init_extra_mesh(this), _init_useSpaceObjectData(this, true));

  /** m_maxSpeed (float) [READWRITE, PERSIST] */
  maxSpeed = (_init_extra_useSpaceObjectData(this), _init_maxSpeed(this, 0));

  /** m_radius (float) [READWRITE, PERSIST] */
  radius = (_init_extra_maxSpeed(this), _init_radius(this, 500));

  /** m_egoSpeed (float) [READ] */
  egoSpeed = (_init_extra_radius(this), _init_egoSpeed(this, 0));

  /** m_positionShiftDecreaseSpeed (float) [READWRITE, PERSIST] */
  positionShiftDecreaseSpeed = (_init_extra_egoSpeed(this), _init_positionShiftDecreaseSpeed(this, 1000));

  /** m_positionShiftIncreaseSpeed (float) [READWRITE, PERSIST] */
  positionShiftIncreaseSpeed = (_init_extra_positionShiftDecreaseSpeed(this), _init_positionShiftIncreaseSpeed(this, 1000));

  /** m_generators (PITr2AttributeGeneratorVector) [READ, PERSIST] */
  generators = (_init_extra_positionShiftIncreaseSpeed(this), _init_generators(this, []));

  /** m_movementScale (float) [READWRITE, PERSIST] */
  movementScale = (_init_extra_generators(this), _init_movementScale(this, 1));

  /** m_positionShiftNormalized (float) [READ] */
  positionShift = (_init_extra_movementScale(this), _init_positionShift(this, 0));

  /** m_display (bool) [READWRITE, PERSIST] */
  display = (_init_extra_positionShift(this), _init_display(this, true));

  /** m_positionShiftMin (float) [READWRITE, PERSIST] */
  positionShiftMin = (_init_extra_display(this), _init_positionShiftMin(this, 100));

  /** m_positionShiftMax (float) [READWRITE, PERSIST] */
  positionShiftMax = (_init_extra_positionShiftMin(this), _init_positionShiftMax(this, 0));

  /** Carbon method Refresh (MAP_METHOD_AND_WRAP). */
  Refresh() {
    if (!this.particleSystem) {
      return false;
    }
    this.particleSystem.UpdateElementDeclaration();
    const boundElements = new Set();
    for (const generator of this.generators) {
      if (typeof generator?.Bind !== "function") {
        this.#bindStatus = BIND_INVALID;
        throw new TypeError("Particle generators must implement Carbon's Bind contract.");
      }
      if (generator.Bind(this.particleSystem, boundElements) === false) {
        this.#bindStatus = BIND_INVALID;
        return false;
      }
    }
    this.#positionElement = bindParticleElement(this.particleSystem, _Tr2ParticleElementDe.Type.POSITION, boundElements);
    this.#velocityElement = bindParticleElement(this.particleSystem, _Tr2ParticleElementDe.Type.VELOCITY, boundElements);
    this.#lifetimeElement = bindParticleElement(this.particleSystem, _Tr2ParticleElementDe.Type.LIFETIME, boundElements);
    if (hasUnboundParticleElements(this.particleSystem, boundElements)) {
      this.#bindStatus = BIND_INVALID;
      return false;
    }
    this.#bindStatus = BIND_VALID;
    vec3.set(this.#previousOrigin, this.radius, 0, 0);
    return true;
  }
  static {
    _initClass();
  }
}

export { _EveChildParticleSphe as EveChildParticleSphere };
//# sourceMappingURL=EveChildParticleSphere.js.map
