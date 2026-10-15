// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildParticleSphere.h
// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildParticleSphere.cpp
// Hand-maintained from Carbon source, promoted out of generated intake.
import { meta, type, blue } from "#schema";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { mat4 } from "#math/mat4";
import { sph3 } from "#math/sph3";
import { TriBatchType } from "#consts/graphics";
import { Tr2RenderReason } from "../../generated/trinityCore/enums.js";
import { ITr2GenericEmitterUpdateArguments } from "../../particle/ITr2GenericEmitter/index.js";
import { CcpTime } from "../../../global/blue/CcpTime.js";
import {
  bindParticleElement,
  hasUnboundParticleElements
} from "../../particle/element/particleElementBinding.js";
import { Tr2ParticleElementDeclaration } from "../../particle/element/Tr2ParticleElementDeclaration.js";
import { IEveSpaceObjectChild } from "./IEveSpaceObjectChild.js";
import { EveSpaceObjectChild } from "./EveSpaceObjectChild.js";
import { ITr2Renderable } from "../../core/ITr2Renderable.js";


const BIND_PENDING = 0;
const BIND_VALID = 1;
const BIND_INVALID = 2;

/** A model that binds a particle system's position, velocity and lifetime elements and its attribute generators for a sphere-distributed ambient effect. */
@blue.define("EveChildParticleSphere")
@blue.inherit(ITr2Renderable)
@blue.interface(EveSpaceObjectChild, IEveSpaceObjectChild, ITr2Renderable)
export class EveChildParticleSphere extends EveSpaceObjectChild
{

  _bindStatus = BIND_PENDING;

  _lifetimeElement = null;

  _positionElement = null;

  _previousOrigin = vec3.fromValues(500, 0, 0);

  _worldTransform = mat4.create();

  _boundingSphere = vec4.fromValues(0, 0, 0, 500);

  _egoVelocity = vec3.create();

  /** m_positionShift: the raw shift length; the Blue "positionShift" attribute is the normalized value. */
  _positionShift = 0;

  /** Until an update has run the object cannot be rendered (m_hasUpdated). */
  _hasUpdated = false;

  _velocityElement = null;

  /** m_name (std::string) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.string
  name = "";

  /** m_particleSystem (Tr2ParticleSystemPtr) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.rootRef("Tr2ParticleSystem")
  particleSystem = null;

  /** m_mesh (Tr2InstancedMeshPtr) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.rootRef("Tr2InstancedMesh")
  mesh = null;

  /** m_useSpaceObjectData (bool) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.boolean
  useSpaceObjectData = true;

  /** m_maxSpeed (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  maxSpeed = 0;

  /** m_radius (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  radius = 500;

  /** m_egoSpeed (float) [READ] */
  @blue.read
  @type.float32
  egoSpeed = 0;

  /** m_positionShiftDecreaseSpeed (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  positionShiftDecreaseSpeed = 1000;

  /** m_positionShiftIncreaseSpeed (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  positionShiftIncreaseSpeed = 1000;

  /** m_generators (PITr2AttributeGeneratorVector) [READ, PERSIST] */
  @blue.read
  @blue.persist
  @type.list("ITr2AttributeGenerator")
  generators = [];

  /** m_movementScale (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  movementScale = 1;

  /** m_positionShiftNormalized (float) [READ] */
  @blue.read
  @type.float32
  positionShift = 0;

  /** m_display (bool) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.boolean
  display = true;

  /** m_positionShiftMin (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  positionShiftMin = 100;

  /** m_positionShiftMax (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  positionShiftMax = 0;

  /**
   * Carbon method Refresh (MAP_METHOD_AND_WRAP).
   *
   * Adapted: Browser attribute generators bind to the CPU particle-system declaration while
   * retaining Carbon's shared element-claim validation.
   */
  @blue.method
  @meta.adapted
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
        this._bindStatus = BIND_INVALID;
        return false;
      }
    }

    this._positionElement = bindParticleElement(
      this.particleSystem,
      Tr2ParticleElementDeclaration.Type.POSITION,
      boundElements
    );
    this._velocityElement = bindParticleElement(
      this.particleSystem,
      Tr2ParticleElementDeclaration.Type.VELOCITY,
      boundElements
    );
    this._lifetimeElement = bindParticleElement(
      this.particleSystem,
      Tr2ParticleElementDeclaration.Type.LIFETIME,
      boundElements
    );

    if (hasUnboundParticleElements(this.particleSystem, boundElements))
    {
      this._bindStatus = BIND_INVALID;
      return false;
    }

    this._bindStatus = BIND_VALID;
    vec3.set(this._previousOrigin, this.radius, 0, 0);
    return true;
  }

  /** Carbon EveChildParticleSphere::CheckBinding (cpp:233-240): binds on first use. */
  @blue.method
  @meta.implemented
  CheckBinding()
  {
    if (this._bindStatus === BIND_PENDING) this.Refresh();
    return this._bindStatus === BIND_VALID;
  }

  /**
   * Carbon EveChildParticleSphere::GetRenderables (cpp:72-79): sorts and publishes once updated; no frustum gate.
   * Adapted: returns the caller-owned array, as the sibling EveChildParticleSystem does.
   */
  @blue.method
  @meta.adapted
  GetRenderables(renderables = [])
  {
    if (this.mesh && this.particleSystem && this.display && this._hasUpdated)
    {
      this.particleSystem.SortParticles();
      renderables.push(this);
    }
    return renderables;
  }

  /** Carbon EveChildParticleSphere::UpdateVisibility (cpp:82-90): view-dependent particle data only while the sphere is in view. */
  @blue.method
  @meta.implemented
  UpdateVisibility(updateContext, _parentTransform, _parentLod)
  {
    const frustum = updateContext.GetFrustum();
    if (this.display && frustum.IsSphereVisible(this._boundingSphere) && this.particleSystem)
    {
      this.particleSystem.UpdateViewDependentData(frustum, this._worldTransform);
    }
  }

  /** Carbon EveChildParticleSphere::GetBoundingSphere (cpp:93-97). */
  @blue.method
  @meta.implemented
  GetBoundingSphere(out, _query = 0)
  {
    vec4.copy(out, this._boundingSphere);
    return true;
  }

  /** Carbon EveChildParticleSphere::UpdateSyncronous (cpp:100-112): binds, then reads the ego velocity from the ballpark. */
  @blue.method
  @meta.implemented
  UpdateSyncronous(updateContext, _params)
  {
    this.CheckBinding();
    vec3.set(this._egoVelocity, 0, 0, 0);
    const ballpark = updateContext.GetBallpark();
    if (ballpark) ballpark.DeltaVel(updateContext.GetTime(), this._egoVelocity);
    this.egoSpeed = vec3.length(this._egoVelocity);
  }

  /**
   * Carbon EveChildParticleSphere::UpdateAsyncronous (cpp:115-127): the sphere follows the parent's translation only,
   * never its rotation or scale.
   */
  @blue.method
  @meta.implemented
  UpdateAsyncronous(updateContext, params)
  {
    const parent = params.localToWorldTransform;
    mat4.fromTranslation(this._worldTransform, [ parent[12], parent[13], parent[14] ]);
    vec4.set(this._boundingSphere, 0, 0, 0, this.radius);
    sph3.transformMat4(this._boundingSphere, this._boundingSphere, this._worldTransform);
    this._Update(updateContext);
    this._hasUpdated = true;
  }

  /**
   * Carbon GetLocalToWorldTransform( Matrix& ) (EveChildParticleSphere.cpp:130-133): copies the world transform into out, and returns out.
   * @param {mat4} out - receives the transform
   * @returns {mat4} out
   */
  @blue.method
  @meta.implemented
  GetLocalToWorldTransform(out)
  {
    return mat4.copy(out, this._worldTransform);
  }

  /** Carbon EveChildParticleSphere::Setup (cpp:136-138) is empty. */
  @blue.method
  @meta.noop
  Setup(_scale = null, _rotation = null, _translation = null, _lowestLodVisible = null)
  {
  }

  /** Carbon EveChildParticleSphere::GetBatches (cpp:141-152). */
  @blue.method
  @meta.implemented
  GetBatches(batches, batchType, perObjectData, _reason = Tr2RenderReason.TR2RENDERREASON_NORMAL)
  {
    if (!this.display || !this.mesh || !this.mesh.GetDisplay()) return;
    const areas = this.mesh.GetAreas(batchType);
    if (areas) this.mesh.GetBatches(batches, areas, perObjectData);
  }

  /** Carbon EveChildParticleSphere::HasTransparentBatches (cpp:155-163). */
  @blue.method
  @meta.implemented
  HasTransparentBatches()
  {
    if (!this.mesh || !this.particleSystem) return false;
    return this.mesh.GetAreas(TriBatchType.TRIBATCHTYPE_TRANSPARENT).length > 0;
  }

  /** Carbon EveChildParticleSphere::GetSortValue (cpp:166-169). */
  @blue.method
  @meta.implemented
  GetSortValue()
  {
    return 0;
  }

  /**
   * Carbon EveChildParticleSphere::GetPerObjectData (cpp:172-186): the vertex record holds the transposed world matrix
   * and the untransposed inverse, which the shader's row-major read sees as the inverse transpose.
   */
  @blue.method
  @meta.implemented
  GetPerObjectData(accumulator)
  {
    const data = accumulator.Alloc("EveChildParticleSpherePerObjectData");
    const { mat4_0 } = EveChildParticleSphere.scratch;
    data.SetAndTranspose("world", this._worldTransform);
    data.SetWithoutTransposing("worldInverseTranspose", mat4.invert(mat4_0, this._worldTransform));
    return data;
  }

  /**
   * Carbon EveChildParticleSphere::Update (cpp:189-230): moves the particles against the clamped, scaled origin shift,
   * tracks the normalized position shift, refills particles that left the sphere and tops it up, then steps the system.
   */
  @blue.method
  _Update(updateContext)
  {
    const { vec3_0, vec3_1, vec3_2, vec3_3, mat4_0 } = EveChildParticleSphere.scratch;
    const delta = updateContext.GetDeltaT();

    const originShift = vec3.copy(vec3_0, updateContext.GetOriginShift());
    if (this.maxSpeed > 0 && vec3.length(originShift) > this.maxSpeed * delta)
    {
      vec3.scale(originShift, vec3.normalize(originShift, originShift), this.maxSpeed * delta);
    }
    vec3.scale(originShift, originShift, this.movementScale);

    if (this._bindStatus === BIND_VALID)
    {
      const worldInverse = mat4.invert(mat4_0, this._worldTransform);
      const previousReferencePosition = vec3.transformMat4(vec3_1, vec3.add(vec3_1, this._previousOrigin, originShift), worldInverse);

      this._positionShift = vec3.length(vec3.transformMat4(vec3_2, this._previousOrigin, worldInverse));
      const normalized = Math.min(Math.max((this._positionShift - this.positionShiftMin) / (this.positionShiftMax - this.positionShiftMin), 0), 1);
      if (normalized < this.positionShift)
      {
        this.positionShift = Math.max(normalized, this.positionShift - Math.max(0, delta * this.positionShiftDecreaseSpeed));
      }
      else
      {
        this.positionShift = Math.min(normalized, this.positionShift + Math.max(0, delta * this.positionShiftIncreaseSpeed));
      }

      const velocityDirection = vec3.normalize(vec3_3, this._egoVelocity);
      this._ApplyConstraint(previousReferencePosition, velocityDirection);
      this._AddParticles(previousReferencePosition, velocityDirection);
    }

    vec3.set(this._previousOrigin, this._worldTransform[12], this._worldTransform[13], this._worldTransform[14]);

    if (this.particleSystem)
    {
      const args = EveChildParticleSphere._systemArgs;
      args.time = CcpTime.timeAsDouble(updateContext.GetTime());
      args.system = updateContext.GetGpuParticleSystem();
      mat4.identity(args.parentTransform);
      vec3.copy(args.originShift, updateContext.GetOriginShift());
      args.emitCountFactor = 1;
      this.particleSystem.Update(args);
    }
  }

  /**
   * Carbon EveChildParticleSphere::ApplyConstraint (cpp:298-338): every live particle moves by the reference shift,
   * takes its squared distance over the squared radius as its age and the ego direction as its velocity, and is
   * regenerated once it reaches the sphere's edge. Adapted: an element the system does not declare is skipped.
   */
  @blue.method
  _ApplyConstraint(previousReferencePosition, velocityDirection)
  {
    if (!this.particleSystem) return;
    const position = this._positionElement, velocity = this._velocityElement, lifetime = this._lifetimeElement;
    const oneOverRadius2 = 1 / (this.radius * this.radius);
    this.particleSystem.ApplyConstraint((buffers, strides, count) => {
      for (let index = 0; index < count; index++)
      {
        let age = 0;
        if (position)
        {
          const buffer = buffers[position.bufferIndex];
          const offset = position.startOffset + index * strides[position.bufferIndex];
          const x = buffer[offset] + previousReferencePosition[0];
          const y = buffer[offset + 1] + previousReferencePosition[1];
          const z = buffer[offset + 2] + previousReferencePosition[2];
          buffer[offset] = x;
          buffer[offset + 1] = y;
          buffer[offset + 2] = z;
          age = (x * x + y * y + z * z) * oneOverRadius2;
        }
        if (lifetime) buffers[lifetime.bufferIndex][lifetime.startOffset + index * strides[lifetime.bufferIndex]] = age;
        if (velocity)
        {
          const buffer = buffers[velocity.bufferIndex];
          const offset = velocity.startOffset + index * strides[velocity.bufferIndex];
          buffer[offset] = velocityDirection[0];
          buffer[offset + 1] = velocityDirection[1];
          buffer[offset + 2] = velocityDirection[2];
        }
        if (age >= 1) this._FillParticleData(index, previousReferencePosition, velocityDirection);
      }
    });
  }

  /**
   * Carbon EveChildParticleSphere::FillParticleData (cpp:341-399): a new particle at a random point in the sphere,
   * kept out of the volume the previous frame's sphere already covered when it can be (ten tries).
   * Adapted: Math.random stands in for the C runtime rand().
   */
  @blue.method
  _FillParticleData(index, previousReferencePosition, velocityDirection)
  {
    const { vec3_4 } = EveChildParticleSphere.scratch;
    const position = this._positionElement, velocity = this._velocityElement, lifetime = this._lifetimeElement;
    if (position)
    {
      const localPosition = vec3_4;
      const atOrigin = previousReferencePosition[0] === 0 && previousReferencePosition[1] === 0 && previousReferencePosition[2] === 0;
      let distance = 0;
      for (let attempt = 0; attempt < 10; attempt++)
      {
        vec3.normalize(localPosition, vec3.set(localPosition, Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5));
        if (attempt === 9 || atOrigin)
        {
          distance = this.radius * Math.pow(Math.random(), 0.5);
          vec3.scale(localPosition, localPosition, distance);
        }
        else
        {
          const minDistance = Math.max(0, this.radius - vec3.length(previousReferencePosition));
          distance = minDistance + Math.pow(Math.random(), 0.5) * (this.radius - minDistance);
          vec3.scale(localPosition, localPosition, distance);
          if (vec3.distance(localPosition, previousReferencePosition) < this.radius) continue;
        }
        break;
      }
      const offset = position.startOffset + index * position.instanceStride;
      position.buffer[offset] = localPosition[0];
      position.buffer[offset + 1] = localPosition[1];
      position.buffer[offset + 2] = localPosition[2];
      if (lifetime)
      {
        const lifetimeOffset = lifetime.startOffset + index * lifetime.instanceStride;
        lifetime.buffer[lifetimeOffset] = Math.min(1, distance * distance / this.radius / this.radius);
        lifetime.buffer[lifetimeOffset + 1] = EveChildParticleSphere.LIFESPAN;
      }
    }
    else if (lifetime)
    {
      lifetime.buffer[lifetime.startOffset + index * lifetime.instanceStride] = 1;
    }
    if (velocity)
    {
      const offset = velocity.startOffset + index * velocity.instanceStride;
      velocity.buffer[offset] = velocityDirection[0];
      velocity.buffer[offset + 1] = velocityDirection[1];
      velocity.buffer[offset + 2] = velocityDirection[2];
    }
    for (const generator of this.generators) generator.Generate(null, null, index);
  }

  /** Carbon EveChildParticleSphere::AddParticles (cpp:402-421): fills every free slot. */
  @blue.method
  _AddParticles(previousReferencePosition, velocityDirection)
  {
    if (!this.particleSystem) return;
    for (let index = this.particleSystem.BeginSpawnParticle(); index !== null; index = this.particleSystem.BeginSpawnParticle())
    {
      this._FillParticleData(index, previousReferencePosition, velocityDirection);
      this.particleSystem.EndSpawnParticle();
    }
  }

  /** Carbon writes std::numeric_limits<float>::max() / 10 as the lifespan: the sphere, not aging, retires particles. */
  static LIFESPAN = 3.4028234663852886e38 / 10;

  static _systemArgs = new ITr2GenericEmitterUpdateArguments();

  static scratch = {
    vec3_0: vec3.create(),
    vec3_1: vec3.create(),
    vec3_2: vec3.create(),
    vec3_3: vec3.create(),
    vec3_4: vec3.create(),
    mat4_0: mat4.create()
  };

}
