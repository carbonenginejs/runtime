// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildParticleSphere.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { carbon, impl, io, type } from "#schema";
import { vec3 } from "#math/vec3";
import {
  bindParticleElement,
  hasUnboundParticleElements
} from "../../particle/element/particleElementBinding.js";
import { Tr2ParticleElementDeclaration } from "../../particle/element/Tr2ParticleElementDeclaration.js";
import { EveSpaceObjectChild } from "./EveSpaceObjectChild.js";


const BIND_PENDING = 0;
const BIND_VALID = 1;
const BIND_INVALID = 2;

/** A model that binds a particle system's position, velocity and lifetime elements and its attribute generators for a sphere-distributed ambient effect. */
@type.define({ className: "EveChildParticleSphere", family: "eve/child" })
export class EveChildParticleSphere extends EveSpaceObjectChild
{

  #bindStatus = BIND_PENDING;

  #lifetimeElement = null;

  #positionElement = null;

  #previousOrigin = vec3.create();

  #velocityElement = null;

  /** m_name (std::string) [READWRITE, PERSIST] */
  @io.persist
  @type.string
  name = "";

  /** m_particleSystem (Tr2ParticleSystemPtr) [READWRITE, PERSIST] */
  @io.persist
  @type.model("Tr2ParticleSystem")
  particleSystem = null;

  /** m_mesh (Tr2InstancedMeshPtr) [READWRITE, PERSIST] */
  @io.persist
  @type.model("Tr2InstancedMesh")
  mesh = null;

  /** m_useSpaceObjectData (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  useSpaceObjectData = true;

  /** m_maxSpeed (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  maxSpeed = 0;

  /** m_radius (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  radius = 500;

  /** m_egoSpeed (float) [READ] */
  @io.read
  @type.float32
  egoSpeed = 0;

  /** m_positionShiftDecreaseSpeed (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  positionShiftDecreaseSpeed = 1000;

  /** m_positionShiftIncreaseSpeed (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  positionShiftIncreaseSpeed = 1000;

  /** m_generators (PITr2AttributeGeneratorVector) [READ, PERSIST] */
  @io.persist
  @type.list("ITr2AttributeGenerator")
  generators = [];

  /** m_movementScale (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  movementScale = 1;

  /** m_positionShiftNormalized (float) [READ] */
  @io.read
  @type.float32
  positionShift = 0;

  /** m_display (bool) [READWRITE, PERSIST] */
  @io.persist
  @type.boolean
  display = true;

  /** m_positionShiftMin (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  positionShiftMin = 100;

  /** m_positionShiftMax (float) [READWRITE, PERSIST] */
  @io.persist
  @type.float32
  positionShiftMax = 0;

  /** Carbon method Refresh (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.adapted
  @impl.reason("Browser attribute generators bind to the CPU particle-system declaration while retaining Carbon's shared element-claim validation.")
  Refresh()
  {
    if (!this.particleSystem)
    {
      return false;
    }

    this.particleSystem.UpdateElementDeclaration();
    const boundElements = new Set();
    for (const generator of this.generators)
    {
      if (generator.Bind(this.particleSystem, boundElements) === false)
      {
        this.#bindStatus = BIND_INVALID;
        return false;
      }
    }

    this.#positionElement = bindParticleElement(
      this.particleSystem,
      Tr2ParticleElementDeclaration.Type.POSITION,
      boundElements
    );
    this.#velocityElement = bindParticleElement(
      this.particleSystem,
      Tr2ParticleElementDeclaration.Type.VELOCITY,
      boundElements
    );
    this.#lifetimeElement = bindParticleElement(
      this.particleSystem,
      Tr2ParticleElementDeclaration.Type.LIFETIME,
      boundElements
    );

    if (hasUnboundParticleElements(this.particleSystem, boundElements))
    {
      this.#bindStatus = BIND_INVALID;
      return false;
    }

    this.#bindStatus = BIND_VALID;
    vec3.set(this.#previousOrigin, this.radius, 0, 0);
    return true;
  }

}
