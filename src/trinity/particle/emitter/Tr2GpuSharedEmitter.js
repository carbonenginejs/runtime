// Source: trinity/trinity/Particle/Tr2GpuSharedEmitter.h
// Source: trinity/trinity/Particle/Tr2GpuSharedEmitter.cpp
// Source: trinity/trinity/Particle/Tr2GpuSharedEmitter_Blue.cpp
// Source: trinity/trinity/Particle/Tr2GpuParticleSystem.h
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { CjsModel } from "#model";
import { carbon, impl, io, type } from "#schema";
import { withITr2GenericEmitter } from "../ITr2GenericEmitter.js";


/**
 * Authored parameters of a GPU particle emitter: emission cone and rate,
 * particle lifetime and speed range, size and colour ramp, and the drag,
 * turbulence and gravity terms the simulation applies.
 */
@type.define({ className: "Tr2GpuSharedEmitter", family: "particle" })
export class Tr2GpuSharedEmitter extends withITr2GenericEmitter(CjsModel)
{
  @io.persist
  @type.string
  name = "";

  @io.persist
  @type.boolean
  continuousEmitter = true;

  @io.persist
  @type.float32
  rate = 0;

  @io.persist
  @type.float32
  emissionDensity = 0;

  @io.persist
  @type.float32
  maxEmissionDensity = 10000;

  @io.persist
  @type.float32
  maxDisplacement = 1000;

  @io.persist
  @type.vec3
  position = vec3.create();

  @io.persist
  @type.vec3
  direction = vec3.fromValues(0, 1, 0);

  @io.persist
  @type.float32
  angle = 0;

  @io.persist
  @type.float32
  innerAngle = 0;

  @io.persist
  @type.float32
  radius = 0;

  @io.persist
  @type.float32
  inheritVelocity = 1;

  @io.persist
  @type.float32
  minSpeed = 0;

  @io.persist
  @type.float32
  maxSpeed = 0;

  @io.notify
  @io.persist
  @type.float32
  minLifeTime = 0;

  @io.notify
  @io.persist
  @type.float32
  maxLifeTime = 0;

  @io.notify
  @io.persist
  @type.vec3
  sizes = vec3.create();

  @io.notify
  @io.persist
  @type.float32
  sizeVariance = 0;

  @io.notify
  @io.persist
  @type.color
  color0 = vec4.createLinear();

  @io.notify
  @io.persist
  @type.color
  color1 = vec4.createLinear();

  @io.notify
  @io.persist
  @type.color
  color2 = vec4.createLinear();

  @io.notify
  @io.persist
  @type.color
  color3 = vec4.createLinear();

  @io.notify
  @io.persist
  @type.uint32
  textureIndex = 0;

  @io.notify
  @io.persist
  @type.float32
  colorMidpoint = 0.5;

  @io.notify
  @io.persist
  @type.float32
  velocityStretchRotation = 0;

  @io.notify
  @io.persist
  @type.float32
  drag = 0;

  @io.notify
  @io.persist
  @type.float32
  turbulenceAmplitude = 0;

  @io.notify
  @io.persist
  @type.uint32
  turbulenceFrequency = 1;

  @io.notify
  @io.persist
  @type.float32
  gravity = 0;

  #enabled = true;

  #previousTime = -1;

  #revision = 0;

  /**
   * Bumps the revision so a renderer holding this emitter rebuilds from it;
   * there are no GPU resources to create here.
   */
  @carbon.method
  @impl.adapted
  Initialize()
  {
    this.#revision++;
    return true;
  }

  /**
   * Bumps the revision so a renderer holding this emitter picks up the changed
   * parameters.
   */
  @carbon.method
  @impl.adapted
  OnModified()
  {
    this.#revision++;
    return true;
  }

  /**
   * Turns emission on or off; disabling also clears the spawn-time cursor so
   * re-enabling restarts timing instead of catching up on the idle interval.
   */
  @carbon.method
  @impl.adapted
  Enable(value)
  {
    this.#enabled = !!value;
    if (!this.#enabled) this.#previousTime = -1;
  }

  /** Reports whether this emitter is currently emitting. */
  @carbon.method
  @impl.adapted
  IsEnabled()
  {
    return this.#enabled;
  }

  /** Sets the emission cone axis in place, treating a missing value as zero. */
  @carbon.method
  @impl.adapted
  SetDirection(value)
  {
    vec3.copy(this.direction, value || Tr2GpuSharedEmitter.#zero3);
  }

  /** Sets the emitter origin in place, treating a missing value as zero. */
  @carbon.method
  @impl.adapted
  SetPosition(value)
  {
    vec3.copy(this.position, value || Tr2GpuSharedEmitter.#zero3);
  }

  /**
   * Projects Carbon's emitter and particle-parameter structs onto the schema-backed fields in one batched, event-free update followed by a single UpdateValues.
   * @param {object} emitterData emission shape and speed range; missing members fall back to the current values
   * @param {object} paramsData per-particle parameters; colors may be supplied either as a colors array or as color0..color3
   * attractorStrength is only forwarded on subclasses that declare it.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Projects Carbon's setup structs onto the schema-backed editor fields; renderer-only spawn history and transformed parameters remain adapter-owned.")
  Setup(rate, emitterData, paramsData)
  {
    const emitter = emitterData || {};
    const parameters = paramsData || {};
    const colors = parameters.colors || [];
    const values = {
      rate,
      radius: emitter.radius,
      angle: emitter.angle,
      innerAngle: emitter.innerAngle,
      minSpeed: emitter.minSpeed,
      maxSpeed: emitter.maxSpeed,
      minLifeTime: parameters.minLifeTime,
      maxLifeTime: parameters.maxLifeTime,
      textureIndex: parameters.textureIndex,
      colorMidpoint: parameters.colorMidpoint ?? 0.5,
      color0: colors[0] ?? parameters.color0,
      color1: colors[1] ?? parameters.color1,
      color2: colors[2] ?? parameters.color2,
      color3: colors[3] ?? parameters.color3,
      sizes: parameters.sizes,
      sizeVariance: parameters.sizeVariance,
      drag: parameters.drag,
      turbulenceAmplitude: parameters.turbulenceAmplitude,
      turbulenceFrequency: parameters.turbulenceFrequency ?? 1,
      gravity: parameters.gravity,
      velocityStretchRotation: parameters.velocityStretchRotation
    };
    if ("attractorStrength" in this)
    {
      values.attractorStrength = parameters.attractorStrength;
    }

    this.SetValues(values, { source: this, skipEvents: true, skipUpdate: true });
    this.UpdateValues({ source: this, skipEvents: true });
  }

  /**
   * Returns the counter bumped by Initialize and OnModified, which a renderer
   * compares against its own copy to detect parameter changes.
   */
  @carbon.method
  @impl.adapted
  GetRevision()
  {
    return this.#revision;
  }

  /** Carbon's GPU emitter thread-safety hook is intentionally empty. */
  @impl.noop
  SetThreadSafeFlag()
  {
  }

  static #zero3 = vec3.create();
}
