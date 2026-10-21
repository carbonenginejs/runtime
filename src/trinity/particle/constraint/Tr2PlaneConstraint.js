import { exposure as be } from "#be";
import { random as carbonRandom } from "#math/random";
// Source: trinity/trinity/Particle/Tr2PlaneConstraint.h
import { IsMatch, BlueList, IListNotify, INotify } from "#blue";
import { IInitialize } from "../../../global/blue/IInitialize.js";
// Hand-maintained from Carbon source, promoted out of generated intake.
import { CjsSchema, meta, type, blue } from "#schema";
import { BLUELISTEVENT } from "#consts/blue";
import { ITr2GenericEmitter } from "../ITr2GenericEmitter/ITr2GenericEmitter.js";
import { ITr2GenericParticleConstraint } from "./ITr2GenericParticleConstraint.js";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { mat4 } from "#math/mat4";
import { ITr2DebugRenderer2, Tr2DebugColor, Tr2DebugObjectReference } from "#interfaces";
import { Tr2ParticleElementDeclaration } from "../element/Tr2ParticleElementDeclaration.js";

// RenderDebugInfo scratch (debug drawing is single-threaded).
const DEBUG_AXIS = vec3.create();
const DEBUG_TRANSLATION = mat4.create();
const DEBUG_BASIS = mat4.create();
const DEBUG_LOCAL = mat4.create();
const DEBUG_INVERSE_LOCAL = mat4.create();
const DEBUG_WORLD = mat4.create();
const DEBUG_CENTER = vec3.create();
const DEBUG_P0 = vec3.create();
const DEBUG_P1 = vec3.create();

/** A collision constraint that keeps particles on one side of a plane, reflecting velocity with elasticity, friction and noise, and triggering generators and emitters on contact. */
@be.define("Tr2PlaneConstraint")
@blue.inherit(INotify, IInitialize, IListNotify)
@be.mapInterface(ITr2GenericParticleConstraint)
@be.mapInterface(INotify)
@be.mapInterface(IInitialize)
export class Tr2PlaneConstraint extends ITr2GenericParticleConstraint
{

  /** Installs the collision-emitter observer, as Tr2PlaneConstraint.cpp:39 does. */
  constructor()
  {
    super();
    this.onCollisionEmitters.SetNotify(this);
  }

  #normalizedPlane = vec4.fromValues(0, 1, 0, 0);

  #positionElement = null;

  #velocityElement = null;

  #radiusElement = null;

  /** m_affectPosition (bool) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.boolean
  affectPosition = true;

  /** m_affectVelocity (bool) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.boolean
  affectVelocity = true;

  /** m_plane (Vector4) [READWRITE, PERSIST, NOTIFY] */
  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.vec4
  plane = vec4.fromValues(0, 1, 0, 0);

  /** m_elasticity (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  elasticity = 1;

  /** m_friction (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  friction = 1;

  /** m_isValid (bool) [READ] */
  @blue.read
  @type.boolean
  isValid = false;

  /** m_onCollisionEmitters (PITr2GenericEmitterVector) [READ, PERSIST] */
  @blue.read
  @blue.persist
  @type.list("ITr2GenericEmitter")
  onCollisionEmitters = new BlueList(ITr2GenericEmitter);

  /** m_generators (PITr2AttributeGeneratorVector) [READ, PERSIST] */
  @blue.read
  @blue.persist
  @type.list("ITr2AttributeGenerator")
  generators = [];

  /** m_particleRadiusComponent (std::string) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.string
  particleRadiusComponent = "";

  /** m_reflectionNoise (float) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.float32
  reflectionNoise = 0;

  /** m_particleRadiusCoefficient (Vector4) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.vec4
  particleRadiusCoefficient = vec4.fromValues(1, 0, 0, 0);

  /**
   * Normalises the constraint plane and propagates the thread-safe flag to the on-collision emitters.
   */
  @blue.method
  @meta.implemented
  Initialize()
  {
    this.#normalizePlane();
    for (const emitter of this.onCollisionEmitters)
    {
      emitter.SetThreadSafeFlag();
    }
    return true;
  }

  /**
   * Renormalises the cached plane whenever the plane property changes.
   */
  @blue.method
  @meta.implemented
  OnModified(propertyName)
  {
    if (IsMatch(propertyName, "plane"))
    {
      this.#normalizePlane();
    }
    return true;
  }

  /** Disables multithreaded updates on emitters inserted outside loading. */
  @blue.method
  @meta.implemented
  OnListModified(event, _key, _key2, value, list)
  {
    if (!(event & BLUELISTEVENT.BELIST_LOADING)
      && (event & BLUELISTEVENT.BELIST_EVENTMASK) === BLUELISTEVENT.BELIST_INSERTED
      && list === this.onCollisionEmitters && value)
    {
      const emitter = CjsSchema.cast(value, ITr2GenericEmitter);
      if (emitter) emitter.SetThreadSafeFlag();
    }
  }

  /**
   * Resolves the position, velocity and radius elements and binds the attached generators, marking the constraint valid only when all of them resolve.
   */
  @blue.method
  @meta.adapted
  Bind(particleSystem)
  {
    this.isValid = false;
    this.#positionElement = particleSystem.GetElement(Tr2ParticleElementDeclaration.Type.POSITION);
    this.#velocityElement = particleSystem.GetElement(Tr2ParticleElementDeclaration.Type.VELOCITY);
    this.#radiusElement = this.particleRadiusComponent
      ? particleSystem.GetElement(this.particleRadiusComponent)
      : null;
    if (!this.#positionElement || (this.particleRadiusComponent && !this.#radiusElement))
    {
      return false;
    }
    const boundElements = new Set();
    for (const generator of this.generators)
    {
      if (generator.Bind(particleSystem, boundElements) === false)
      {
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
  @blue.method
  @meta.adapted
  ApplyConstraint(arguments_, _buffers, _strides, count, _dt)
  {
    if (!this.isValid)
    {
      return 0;
    }
    const normal = this.#normalizedPlane;
    let collisions = 0;
    for (let index = 0; index < count; index++)
    {
      const position = this.#view(this.#positionElement, index);
      const velocity = this.#velocityElement ? this.#view(this.#velocityElement, index) : null;
      const radius = this.#radiusElement
        ? this.#dotRadius(this.#view(this.#radiusElement, index))
        : 0;
      const distance = normal[0] * position[0] + normal[1] * position[1]
        + normal[2] * position[2] + normal[3] - radius;
      const velocityDot = velocity
        ? velocity[0] * normal[0] + velocity[1] * normal[1] + velocity[2] * normal[2]
        : -1;
      if (distance > 0 || velocityDot >= 0)
      {
        continue;
      }
      collisions++;
      if (this.affectPosition)
      {
        position[0] -= normal[0] * distance;
        position[1] -= normal[1] * distance;
        position[2] -= normal[2] * distance;
      }
      if (this.affectVelocity && velocity)
      {
        const bounceScale = -velocityDot * this.elasticity;
        const slideX = (velocity[0] - normal[0] * velocityDot) * this.friction;
        const slideY = (velocity[1] - normal[1] * velocityDot) * this.friction;
        const slideZ = (velocity[2] - normal[2] * velocityDot) * this.friction;
        velocity[0] = normal[0] * bounceScale + slideX;
        velocity[1] = normal[1] * bounceScale + slideY;
        velocity[2] = normal[2] * bounceScale + slideZ;
        this.#addReflectionNoise(velocity, normal);
      }
      for (const generator of this.generators)
      {
        generator.Generate(position, velocity, index);
      }
      for (const emitter of this.onCollisionEmitters)
      {
        emitter.SpawnParticles(arguments_, position, velocity);
      }
    }
    return collisions;
  }

  /**
   * Carbon Tr2PlaneConstraint::RenderDebugInfo (Particle/Tr2PlaneConstraint.cpp:257-280):
   * nothing while invalid; otherwise an 11 x 11 grid of lines in the plane,
   * centred on the system bounds' centre projected into plane space, half-size
   * max(10, |aabb size| / 4), in 0xffff4444.
   *
   * The bounds centre and size are taken straight from the packed min/max as
   * CcpMath::AxisAlignedBox::Center/Size do (AxisAlignedBox_inline.h:63-71),
   * not through box3.getCenter/getSize, which return zero for an inverted box
   * where Carbon does not check.
   * @param {ITr2DebugRenderer2} renderer The debug renderer.
   * @param {mat4} worldTransform The owning particle system's world transform.
   * @param {box3} aabb The particle system's bounds, packed min/max.
   */
  @blue.method
  @meta.implemented
  RenderDebugInfo(renderer, worldTransform, aabb)
  {
    if (!this.isValid)
    {
      return;
    }

    const f = Math.fround;
    const plane = this.#normalizedPlane;
    const translation = mat4.fromTranslation(DEBUG_TRANSLATION, vec3.set(DEBUG_AXIS, 0, 0, -plane[3]));
    const basis = mat4.orthoNormalBasisZ(DEBUG_BASIS, vec3.set(DEBUG_AXIS, plane[0], plane[1], plane[2]));
    // Carbon (row-vector): TranslationMatrix( 0, 0, -d ) * OrthoNormalBasisZ( a, b, c ).
    const local = mat4.multiply(DEBUG_LOCAL, basis, translation);
    // Carbon (row-vector): local * worldTransform.
    const world = mat4.multiply(DEBUG_WORLD, worldTransform, local);

    const center = vec3.set(
      DEBUG_CENTER,
      f(f(aabb[0] + aabb[3]) * 0.5),
      f(f(aabb[1] + aabb[4]) * 0.5),
      f(f(aabb[2] + aabb[5]) * 0.5));
    vec3.transformMat4(center, center, mat4.invert(DEBUG_INVERSE_LOCAL, local));
    center[2] = 0;

    const sx = f(aabb[3] - aabb[0]);
    const sy = f(aabb[4] - aabb[1]);
    const sz = f(aabb[5] - aabb[2]);
    const sizeLength = f(f(Math.sqrt(f(f(f(sx * sx) + f(sy * sy)) + f(sz * sz)))) * 0.25);
    // std::max( 10.f, x ) returns 10 unless 10 < x (a NaN length gives 10).
    const radius = 10 < sizeLength ? sizeLength : 10;
    const step = f(radius * f(0.2));

    const owner = Tr2DebugObjectReference.create__Object(this);
    const color = Tr2DebugColor.create__Uint32(0xffff4444);
    const p0 = DEBUG_P0;
    const p1 = DEBUG_P1;

    for (let i = -5; i <= 5; ++i)
    {
      vec3.add(p0, vec3.set(p0, f(i * step), -radius, 0), center);
      vec3.add(p1, vec3.set(p1, f(i * step), radius, 0), center);
      renderer.DrawLine(owner, vec3.transformMat4(p0, p0, world), vec3.transformMat4(p1, p1, world), color);
    }

    for (let i = -5; i <= 5; ++i)
    {
      vec3.add(p0, vec3.set(p0, -radius, f(i * step), 0), center);
      vec3.add(p1, vec3.set(p1, radius, f(i * step), 0), center);
      renderer.DrawLine(owner, vec3.transformMat4(p0, p0, world), vec3.transformMat4(p1, p1, world), color);
    }
  }

  /**
   * Recomputes the cached unit-normal plane, falling back to the default up plane when the normal is degenerate.
   */
  #normalizePlane()
  {
    const length = Math.hypot(this.plane[0], this.plane[1], this.plane[2]);
    if (length > 0)
    {
      vec4.scale(this.#normalizedPlane, this.plane, 1 / length);
    }
    else
    {
      vec4.set(this.#normalizedPlane, 0, 1, 0, 0);
    }
  }

  /**
   * A typed-array view onto one particle's slot within a bound element's buffer.
   */
  #view(element, index)
  {
    const offset = element.startOffset + index * element.instanceStride;
    return element.buffer.subarray(offset, offset + element.dimension);
  }

  /**
   * The effective particle radius, from the radius element dotted against the radius coefficient.
   */
  #dotRadius(value)
  {
    let result = 0;
    for (let component = 0; component < Math.min(4, value.length); component++)
    {
      result += value[component] * this.particleRadiusCoefficient[component];
    }
    return result;
  }

  /**
   * Carbon adds tangential noise scaled by the post-bounce speed to the
   * reflected velocity (Tr2PlaneConstraint.cpp:154-165).
   */
  #addReflectionNoise(velocity, normal)
  {
    if (this.reflectionNoise <= 0)
    {
      return;
    }
    const noise = Tr2PlaneConstraint.#noise;
    // MSVC evaluates the native vector-constructor arguments right to left.
    for (let axis = 2; axis >= 0; axis--)
    {
      noise[axis] = carbonRandom.particleRandFloat() * 2 - 1;
    }
    vec3.scale(noise, noise, this.reflectionNoise);
    vec3.scaleAndAdd(noise, noise, normal, -vec3.dot(noise, normal));
    vec3.scaleAndAdd(velocity, velocity, noise, vec3.length(velocity));
  }

  static #noise = vec3.create();

}
