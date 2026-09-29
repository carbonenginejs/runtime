// Source: trinity/trinity/Particle/Tr2GpuSharedEmitter.h
// Source: trinity/trinity/Particle/Tr2GpuSharedEmitter.cpp
// Source: trinity/trinity/Particle/Tr2GpuSharedEmitter_Blue.cpp
// Source: trinity/trinity/Particle/Tr2GpuParticleSystem.h
import { ccpHashFnv1 } from "#utils/hash";
import { color } from "#math/color";
import { vec3 } from "#math/vec3";
import { CjsModel } from "#model";
import { carbon, impl, edit, type } from "#schema";
import { ITr2GenericEmitter } from "../ITr2GenericEmitter/index.js";


/**
 * Authored parameters of a GPU particle emitter: emission cone and rate,
 * particle lifetime and speed range, size and colour ramp, and the drag,
 * turbulence and gravity terms the simulation applies.
 */
@type.define({ className: "Tr2GpuSharedEmitter", family: "particle" })
@carbon.inherit(ITr2GenericEmitter)
export class Tr2GpuSharedEmitter extends CjsModel
{
  @edit.readwrite
  @edit.persist
  @type.string
  name = "";

  @edit.readwrite
  @edit.persist
  @type.boolean
  continuousEmitter = true;

  @edit.readwrite
  @edit.persist
  @type.float32
  rate = 0;

  @edit.readwrite
  @edit.persist
  @type.float32
  emissionDensity = 0;

  @edit.readwrite
  @edit.persist
  @type.float32
  maxEmissionDensity = 10000;

  @edit.readwrite
  @edit.persist
  @type.float32
  maxDisplacement = 1000;

  @edit.readwrite
  @edit.persist
  @type.vec3
  position = vec3.create();

  @edit.readwrite
  @edit.persist
  @type.vec3
  direction = vec3.fromValues(0, 1, 0);

  @edit.readwrite
  @edit.persist
  @type.float32
  angle = 0;

  @edit.readwrite
  @edit.persist
  @type.float32
  innerAngle = 0;

  @edit.readwrite
  @edit.persist
  @type.float32
  radius = 0;

  @edit.readwrite
  @edit.persist
  @type.float32
  inheritVelocity = 1;

  @edit.readwrite
  @edit.persist
  @type.float32
  minSpeed = 0;

  @edit.readwrite
  @edit.persist
  @type.float32
  maxSpeed = 0;

  @edit.notify
  @edit.readwrite
  @edit.persist
  @type.float32
  minLifeTime = 0;

  @edit.notify
  @edit.readwrite
  @edit.persist
  @type.float32
  maxLifeTime = 0;

  @edit.notify
  @edit.readwrite
  @edit.persist
  @type.vec3
  sizes = vec3.create();

  @edit.notify
  @edit.readwrite
  @edit.persist
  @type.float32
  sizeVariance = 0;

  @edit.notify
  @edit.readwrite
  @edit.persist
  @type.color
  color0 = color.create();

  @edit.notify
  @edit.readwrite
  @edit.persist
  @type.color
  color1 = color.create();

  @edit.notify
  @edit.readwrite
  @edit.persist
  @type.color
  color2 = color.create();

  @edit.notify
  @edit.readwrite
  @edit.persist
  @type.color
  color3 = color.create();

  @edit.notify
  @edit.readwrite
  @edit.persist
  @type.uint32
  textureIndex = 0;

  @edit.notify
  @edit.readwrite
  @edit.persist
  @type.float32
  colorMidpoint = 0.5;

  @edit.notify
  @edit.readwrite
  @edit.persist
  @type.float32
  velocityStretchRotation = 0;

  @edit.notify
  @edit.readwrite
  @edit.persist
  @type.float32
  drag = 0;

  @edit.notify
  @edit.readwrite
  @edit.persist
  @type.float32
  turbulenceAmplitude = 0;

  @edit.notify
  @edit.readwrite
  @edit.persist
  @type.uint32
  turbulenceFrequency = 1;

  @edit.notify
  @edit.readwrite
  @edit.persist
  @type.float32
  gravity = 0;

  _id = 0;

  _paramsHash = 0;

  _carryOver = 0;

  _prevPosition = vec3.create();

  _prevVelocity = vec3.create();

  // Persistent native value structs; temporary copies use module scratch.
  _emitter = Tr2GpuSharedEmitter._createEmitter();

  _params = Tr2GpuSharedEmitter._createParams();

  _enabled = true;

  _previousTime = -1;

  _revision = 0;

  /**
   * Hashes the native parameter bytes and selects the shared parameter ID.
   * The revision counter is retained for existing JavaScript consumers.
   */
  @carbon.method
  @impl.adapted
  Initialize()
  {
    this._ReadParameters();
    this.UpdateHash();
    this.GenerateID();
    this._revision++;
    return true;
  }

  /**
   * Rehashes changed parameters and regenerates the shared ID, retaining the
   * JavaScript revision counter for existing consumers.
   */
  @carbon.method
  @impl.adapted
  OnModified()
  {
    this._ReadParameters();
    this.UpdateHash();
    this.GenerateID();
    this._revision++;
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
    this._enabled = !!value;
    if (!this._enabled) this._previousTime = -1;
  }

  /** Reports whether this emitter is currently emitting. */
  @carbon.method
  @impl.adapted
  IsEnabled()
  {
    return this._enabled;
  }

  /** Sets the emission cone axis in place, treating a missing value as zero. */
  @carbon.method
  @impl.adapted
  SetDirection(value)
  {
    vec3.copy(this.direction, value || Tr2GpuSharedEmitter._zero3);
  }

  /** Sets the emitter origin in place, treating a missing value as zero. */
  @carbon.method
  @impl.adapted
  SetPosition(value)
  {
    vec3.copy(this.position, value || Tr2GpuSharedEmitter._zero3);
  }

  /**
   * Advances the emitter's clock and motion history (cpp:110-147).
   * JavaScript update arguments carry seconds instead of native Be::Time ticks.
   * Authored schema fields are projected onto the native structs at entry.
   */
  @carbon.method
  @impl.adapted
  Update(arguments_)
  {
    this._ReadParameters();
    this._Update(arguments_);
  }

  /** Shared Update body after schema projection or unique-emitter scaling. */
  @impl.custom
  _Update(arguments_)
  {
    if (!arguments_.system)
    {
      this._previousTime = -1;
      return;
    }
    if (!this._enabled) return;
    const firstUpdate = this._previousTime === -1;
    const dt = firstUpdate ? 0 : arguments_.time - this._previousTime;
    this._previousTime = arguments_.time;
    if (dt <= 0 && !firstUpdate) return;

    const position = vec3.transformMat4(UPDATE_POSITION, this.position, arguments_.parentTransform);
    const velocity = vec3.set(UPDATE_VELOCITY, 0, 0, 0);
    if (!firstUpdate)
    {
      vec3.subtract(velocity, position, this._prevPosition);
      vec3.subtract(velocity, velocity, arguments_.originShift);
      vec3.scale(velocity, velocity, 1 / dt);
    }
    else
    {
      vec3.subtract(this._prevPosition, position, arguments_.originShift);
    }
    if (this.continuousEmitter)
    {
      const start = vec3.add(UPDATE_START, this._prevPosition, arguments_.originShift);
      this._carryOver = this._SpawnParticles(this._emitter, arguments_, start, position,
        this._prevVelocity, velocity, this._carryOver, Math.min(dt, 1 / 15));
    }
    vec3.copy(this._prevPosition, position);
    vec3.copy(this._prevVelocity, velocity);
  }

  /**
   * Dispatches Carbon's point/segment overloads (cpp:149-191). JavaScript
   * cannot overload methods, so six arguments select SpawnParticlesSegment
   * while the ordinary four-argument call retains point emission.
   * A reusable value copy preserves the continuous emitter's direction history.
   */
  @carbon.method
  @impl.adapted
  SpawnParticles(arguments_, position = null, velocity = null, rateModifier = 1, velocityEnd, deltaTime)
  {
    // ITr2GenericEmitter.h:75/93 uses one name for the two native overloads.
    // JS dispatches by their unambiguous four/six-argument call shapes.
    if (arguments.length === 6)
    {
      return this.SpawnParticlesSegment(arguments_, position, velocity, rateModifier, velocityEnd, deltaTime);
    }
    this._ReadParameters();
    this._SpawnPoint(arguments_, position, velocity, rateModifier);
  }

  /**
   * Emits along a segment (Tr2GpuSharedEmitter.cpp:165-191). The distinct name
   * also exposes Carbon's second overload explicitly for existing JS callers.
   */
  @carbon.renamed("SpawnParticles")
  @impl.adapted
  SpawnParticlesSegment(arguments_, positionStart, positionEnd, velocityStart, velocityEnd, deltaTime)
  {
    this._ReadParameters();
    this._SpawnSegment(arguments_, positionStart, positionEnd, velocityStart, velocityEnd, deltaTime);
  }

  /** Point overload body shared with the subclass after parameter scaling. */
  @impl.custom
  _SpawnPoint(arguments_, position, velocity, rateModifier)
  {
    if (!arguments_.system || !this._enabled) return;
    const transform = arguments_.parentTransform;
    const emitter = Tr2GpuSharedEmitter._copyEmitter(SPAWN_EMITTER, this._emitter);
    const worldPosition = vec3.transformMat4(SPAWN_END, position ?? this.position, transform);
    const worldVelocity = velocity
      ? this._TransformNormal(SPAWN_VELOCITY_END, velocity, transform)
      : vec3.set(SPAWN_VELOCITY_END, 0, 0, 0);
    this._SpawnParticles(emitter, arguments_, worldPosition, worldPosition,
      worldVelocity, worldVelocity, 0, rateModifier);
  }

  /** Segment overload body shared with the subclass after parameter scaling. */
  @impl.custom
  _SpawnSegment(arguments_, positionStart, positionEnd, velocityStart, velocityEnd, deltaTime)
  {
    if (!arguments_.system || !this._enabled) return;
    const transform = arguments_.parentTransform;
    const emitter = Tr2GpuSharedEmitter._copyEmitter(SPAWN_EMITTER, this._emitter);
    const end = vec3.transformMat4(SPAWN_END, positionEnd ?? this.position, transform);
    const start = positionStart
      ? vec3.transformMat4(SPAWN_START, positionStart, transform)
      : vec3.copy(SPAWN_START, end);
    if (positionStart) vec3.subtract(start, start, arguments_.originShift);
    const startVelocity = vec3.set(SPAWN_VELOCITY_START, 0, 0, 0);
    const endVelocity = vec3.set(SPAWN_VELOCITY_END, 0, 0, 0);
    if (velocityStart && velocityEnd)
    {
      this._TransformNormal(startVelocity, velocityStart, transform);
      this._TransformNormal(endVelocity, velocityEnd, transform);
      // Carbon quirk: an origin displacement is subtracted from velocity too.
      // Source: trinity/trinity/Particle/Tr2GpuSharedEmitter.cpp:183.
      vec3.subtract(endVelocity, endVelocity, arguments_.originShift);
    }
    this._carryOver = this._SpawnParticles(emitter, arguments_, start, end,
      startVelocity, endVelocity, this._carryOver, Math.min(deltaTime, 1 / 15));
  }

  /** Carbon's protected SpawnParticles overload, with a distinct JS name. */
  @carbon.renamed("SpawnParticles")
  @impl.adapted
  _SpawnParticles(emitter, arguments_, positionStart, positionEnd, velocityStart, velocityEnd, carryOverCount, deltaTime)
  {
    vec3.copy(emitter.position, positionEnd);
    let total = carryOverCount + deltaTime * this.rate * arguments_.emitCountFactor;
    const moveLength = vec3.distance(positionEnd, positionStart);
    if (moveLength > this.maxDisplacement) return 0;
    if (this.emissionDensity > 0) total += Math.min(this.maxEmissionDensity, moveLength * this.emissionDensity);
    carryOverCount = total - Math.floor(total);
    emitter.count = Math.max(Math.trunc(total), 0);
    if (emitter.count)
    {
      vec3.copy(emitter.positionPrevious, positionStart);
      vec3.scale(emitter.velocity, velocityEnd, this.inheritVelocity);
      vec3.scale(emitter.velocityPrevious, velocityStart, this.inheritVelocity);
      vec3.copy(emitter.directionPrevious, emitter.direction);
      this._TransformNormal(emitter.direction, this.direction, arguments_.parentTransform);
      arguments_.system.Emit(emitter, this._id, this._paramsHash, this._params);
    }
    return carryOverCount;
  }

  /**
   * Emits one scaled burst (cpp:236-276). Reusable scratch replaces native
   * stack value copies; the supplied velocity is already in world coordinates.
   */
  @carbon.method
  @impl.adapted
  SpawnOnce(arguments_, velocity, scale = 1, rateModifier = 1)
  {
    if (!arguments_.system || !this._enabled) return;
    this._ReadParameters();
    const emitter = Tr2GpuSharedEmitter._copyEmitter(SPAWN_EMITTER, this._emitter);
    // Carbon quirk: cpp:244 assigns signed int to the uint32 count field.
    emitter.count = Math.trunc(this.rate * rateModifier) >>> 0;
    if (!emitter.count) return;
    emitter.radius *= scale;
    emitter.minSpeed *= scale;
    emitter.maxSpeed *= scale;
    vec3.transformMat4(emitter.position, this.position, arguments_.parentTransform);
    vec3.copy(emitter.positionPrevious, emitter.position);
    vec3.copy(emitter.velocity, velocity);
    vec3.copy(emitter.velocityPrevious, velocity);
    this._TransformNormal(emitter.direction, this.direction, arguments_.parentTransform);
    vec3.copy(emitter.directionPrevious, emitter.direction);
    let id = this._id;
    let hash = this._paramsHash;
    const params = Tr2GpuSharedEmitter._copyParams(SPAWN_PARAMS, this._params);
    if (scale !== 1)
    {
      vec3.scale(params.sizes, params.sizes, scale);
      params.turbulenceAmplitude *= scale;
      params.turbulenceFrequency = Math.trunc(params.turbulenceFrequency / scale) >>> 0;
      hash = this.GetHash(params);
      id = this.GetID(hash);
    }
    arguments_.system.Emit(emitter, id, hash, params);
  }

  /** Selects the parameter-sharing ID from the current native-byte hash. */
  @carbon.method
  @impl.implemented
  GenerateID()
  {
    this._id = this.GetID(this._paramsHash);
  }

  /**
   * Carbon's 64-bit-host mask, including its byte-count shift quirk:
   * cpp:74 uses sizeof(uintptr_t)-1, so the cleared bit is 7, not 63.
   * JS hashes are uint32; the unused high native bits are zero.
   */
  @carbon.method
  @impl.adapted
  GetID(hash)
  {
    return (hash & ~128) >>> 0;
  }

  /** Hashes the current CPU parameters without changing the stable ID. */
  @carbon.method
  @impl.implemented
  UpdateHash()
  {
    this._paramsHash = this.GetHash(this._params);
  }

  /**
   * Packs EmitterParams (Tr2GpuParticleSystem.h:45-63) into its 132 native
   * little-endian bytes before Carbon's signed-byte FNV-1. JavaScript has no
   * native struct memory to hash; integer fields retain their uint32 bit patterns.
   * All bytes in the module scratch buffer are overwritten before each hash.
   */
  @carbon.method
  @impl.adapted
  GetHash(params)
  {
    const data = HASH_DATA;
    data.setFloat32(0, params.minLifeTime, true);
    data.setFloat32(4, params.maxLifeTime, true);
    data.setUint32(8, params.textureIndex, true);
    data.setFloat32(12, params.colorMidpoint, true);
    for (let i = 0; i < 4; i++)
    {
      for (let j = 0; j < 4; j++) data.setFloat32(16 + i * 16 + j * 4, params.colors[i][j], true);
    }
    for (let i = 0; i < 3; i++) data.setFloat32(80 + i * 4, params.sizes[i], true);
    data.setFloat32(92, params.sizeVariance, true);
    data.setFloat32(96, params.drag, true);
    data.setFloat32(100, params.turbulenceAmplitude, true);
    data.setUint32(104, params.turbulenceFrequency, true);
    data.setFloat32(108, params.gravity, true);
    for (let i = 0; i < 3; i++) data.setFloat32(112 + i * 4, params.attractorPosition[i], true);
    data.setFloat32(124, params.attractorStrength, true);
    data.setFloat32(128, params.velocityStretchRotation, true);
    return ccpHashFnv1(HASH_BYTES);
  }

  /**
   * Projects flat schema fields onto Carbon's structs without allocating.
   * Deliberate divergence: native Blue properties address struct members,
   * whereas JS direct writes and vector mutations bypass OnModified. In
   * particular, TriValueBinding animates the non-notifying shape fields, so
   * projection must run at call entry, not just on notifications. It does not
   * rehash or replace native motion history and the transformed world attractor.
   */
  @impl.custom
  _ReadParameters()
  {
    const emitter = this._emitter;
    emitter.radius = this.radius;
    emitter.angle = this.angle;
    emitter.innerAngle = this.innerAngle;
    emitter.minSpeed = this.minSpeed;
    emitter.maxSpeed = this.maxSpeed;
    const params = this._params;
    params.minLifeTime = this.minLifeTime;
    params.maxLifeTime = this.maxLifeTime;
    params.textureIndex = this.textureIndex;
    params.colorMidpoint = this.colorMidpoint;
    params.sizeVariance = this.sizeVariance;
    params.drag = this.drag;
    params.turbulenceAmplitude = this.turbulenceAmplitude;
    params.turbulenceFrequency = this.turbulenceFrequency;
    params.gravity = this.gravity;
    params.velocityStretchRotation = this.velocityStretchRotation;
    vec3.copy(params.sizes, this.sizes);
    color.copy(params.colors[0], this.color0);
    color.copy(params.colors[1], this.color1);
    color.copy(params.colors[2], this.color2);
    color.copy(params.colors[3], this.color3);
  }

  /** Native XMVector3TransformNormal, writing into caller-owned storage. */
  @impl.custom
  _TransformNormal(out, value, matrix)
  {
    const x = value[0], y = value[1], z = value[2];
    return vec3.set(out,
      matrix[0] * x + matrix[4] * y + matrix[8] * z,
      matrix[1] * x + matrix[5] * y + matrix[9] * z,
      matrix[2] * x + matrix[6] * y + matrix[10] * z);
  }

  /**
   * Projects Carbon's emitter and particle-parameter structs onto the schema-backed fields in one batched, event-free update followed by a single UpdateValues.
   * @param {object} emitterData emission shape and speed range; missing members fall back to the current values
   * @param {object} paramsData per-particle parameters; colors may be supplied either as a colors array or as color0..color3
   * attractorStrength is only forwarded on subclasses that declare it.
   */
  @carbon.method
  @impl.adapted
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
    this._ReadParameters();
    for (const name of ["position", "positionPrevious", "direction", "directionPrevious", "velocity", "velocityPrevious", "unused"])
    {
      if (emitter[name]) vec3.copy(this._emitter[name], emitter[name]);
    }
    for (const name of ["count", "emitterSeed"])
    {
      if (emitter[name] !== undefined) this._emitter[name] = emitter[name];
    }
    if (parameters.attractorPosition) vec3.copy(this._params.attractorPosition, parameters.attractorPosition);
    if (parameters.attractorStrength !== undefined) this._params.attractorStrength = parameters.attractorStrength;
    this.UpdateHash();
    this.GenerateID();
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
    return this._revision;
  }

  /** Carbon's GPU emitter thread-safety hook is intentionally empty. */
  @impl.noop
  SetThreadSafeFlag()
  {
  }

  /** Allocates a native emitter record once for instance state or module scratch. */
  @impl.custom
  static _createEmitter()
  {
    return {
      position: vec3.create(), count: 0, positionPrevious: vec3.create(), radius: 0,
      direction: vec3.create(), angle: 0, directionPrevious: vec3.create(), emitterSeed: 0,
      velocity: vec3.create(), minSpeed: 0, velocityPrevious: vec3.create(), maxSpeed: 0,
      innerAngle: 0, unused: vec3.create()
    };
  }

  /** Allocates native parameter defaults once for instance state or module scratch. */
  @impl.custom
  static _createParams()
  {
    return {
      minLifeTime: 0, maxLifeTime: 0, textureIndex: 0, colorMidpoint: 0.5,
      colors: [color.create(), color.create(), color.create(), color.create()],
      sizes: vec3.create(), sizeVariance: 0, drag: 0, turbulenceAmplitude: 0,
      turbulenceFrequency: 1, gravity: 0, attractorPosition: vec3.create(),
      attractorStrength: 0, velocityStretchRotation: 0
    };
  }

  /** Models native Emitter value assignment without allocating JS storage. */
  @impl.custom
  static _copyEmitter(out, value)
  {
    vec3.copy(out.position, value.position);
    out.count = value.count;
    vec3.copy(out.positionPrevious, value.positionPrevious);
    out.radius = value.radius;
    vec3.copy(out.direction, value.direction);
    out.angle = value.angle;
    vec3.copy(out.directionPrevious, value.directionPrevious);
    out.emitterSeed = value.emitterSeed;
    vec3.copy(out.velocity, value.velocity);
    out.minSpeed = value.minSpeed;
    vec3.copy(out.velocityPrevious, value.velocityPrevious);
    out.maxSpeed = value.maxSpeed;
    out.innerAngle = value.innerAngle;
    vec3.copy(out.unused, value.unused);
    return out;
  }

  /** Models native EmitterParams value assignment without allocating JS storage. */
  @impl.custom
  static _copyParams(out, value)
  {
    out.minLifeTime = value.minLifeTime;
    out.maxLifeTime = value.maxLifeTime;
    out.textureIndex = value.textureIndex;
    out.colorMidpoint = value.colorMidpoint;
    for (let i = 0; i < 4; i++) color.copy(out.colors[i], value.colors[i]);
    vec3.copy(out.sizes, value.sizes);
    out.sizeVariance = value.sizeVariance;
    out.drag = value.drag;
    out.turbulenceAmplitude = value.turbulenceAmplitude;
    out.turbulenceFrequency = value.turbulenceFrequency;
    out.gravity = value.gravity;
    vec3.copy(out.attractorPosition, value.attractorPosition);
    out.attractorStrength = value.attractorStrength;
    out.velocityStretchRotation = value.velocityStretchRotation;
    return out;
  }

  static _zero3 = vec3.create();
}

// Native Emit copies its inputs synchronously (Tr2GpuParticleSystem.cpp:716-729).
// These buffers model stack temporaries for that non-reentrant call chain;
// systems must own their queued request data, not retain these input records.
// Unique scaling uses separate scratch because it surrounds shared spawning.
const SPAWN_EMITTER = Tr2GpuSharedEmitter._createEmitter();
const SPAWN_PARAMS = Tr2GpuSharedEmitter._createParams();
const UPDATE_POSITION = vec3.create();
const UPDATE_VELOCITY = vec3.create();
const UPDATE_START = vec3.create();
const SPAWN_START = vec3.create();
const SPAWN_END = vec3.create();
const SPAWN_VELOCITY_START = vec3.create();
const SPAWN_VELOCITY_END = vec3.create();
const HASH_BYTES = new Uint8Array(132);
const HASH_DATA = new DataView(HASH_BYTES.buffer);
