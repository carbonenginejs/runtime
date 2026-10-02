// Source: trinity/trinity/Particle/Tr2GpuUniqueEmitter.h
// Source: trinity/trinity/Particle/Tr2GpuUniqueEmitter.cpp
// Source: trinity/trinity/Particle/Tr2GpuUniqueEmitter_Blue.cpp
import { mat4 } from "#math/mat4";
import { vec3 } from "#math/vec3";
import { carbon, impl, edit, type } from "#schema";
import { Tr2GpuSharedEmitter } from "./Tr2GpuSharedEmitter.js";


const DECOMPOSE_ROTATION = new Float32Array(4);
const DECOMPOSE_TRANSLATION = vec3.create();
const DECOMPOSE_SCALE = vec3.create();
// Kept separate from Shared's spawn scratch: scaled structs remain live while
// a shared spawn makes its own value copy, then Emit synchronously copies it.
const SCALED_EMITTER = Tr2GpuSharedEmitter._createEmitter();
const SCALED_PARAMS = Tr2GpuSharedEmitter._createParams();


/**
 * GPU emitter owned by a single instance, adding parent scaling and a
 * per-instance attractor on top of the shared emitter parameters.
 */
@type.define({ className: "Tr2GpuUniqueEmitter", family: "particle" })
export class Tr2GpuUniqueEmitter extends Tr2GpuSharedEmitter
{
  @edit.readwrite
  @edit.persist
  @type.boolean
  scaledByParent = false;

  @edit.notify
  @edit.readwrite
  @edit.persist
  @type.vec3
  attractorPosition = vec3.create();

  @edit.notify
  @edit.readwrite
  @edit.persist
  @type.float32
  attractorStrength = 0;

  /**
   * JavaScript has no native address/timestamp identity. A monotonic instance
   * key above the uint32 hash range preserves uniqueness and the native bit-7
   * marker without colliding with shared emitters (cpp:6-11).
   */
  constructor()
  {
    super();
    this._id = 0x100000000 + Tr2GpuUniqueEmitter._nextID++ * 256 + 128;
  }

  /** Retains the constructor's unique identity when parameters change. */
  @carbon.method
  @impl.noop
  GenerateID()
  {
  }

  /** Copies the subclass's authored strength into the CPU parameter struct. */
  @impl.custom
  _ReadParameters()
  {
    super._ReadParameters();
    this._params.attractorStrength = this.attractorStrength;
  }

  /**
   * Updates the world attractor, temporarily scales native structs, and runs
   * shared emission (cpp:18-53). Module scratch replaces C++ stack copies;
   * the schema's local attractor and other authored values remain unchanged.
   */
  @carbon.method
  @impl.adapted
  Update(arguments_)
  {
    this._ReadParameters();
    if (this._params.attractorStrength !== 0)
    {
      vec3.transformMat4(this._params.attractorPosition, this.attractorPosition, arguments_.parentTransform);
      vec3.subtract(this._params.attractorPosition, this._params.attractorPosition, arguments_.originShift);
    }
    const emitter = this._emitter;
    const params = this._params;
    if (this.scaledByParent) this._ScaleParameters(arguments_.parentTransform);
    if (this.attractorStrength !== 0 || this.scaledByParent) this.UpdateHash();
    try
    {
      this._Update(arguments_);
    }
    finally
    {
      if (this.scaledByParent)
      {
        this._emitter = emitter;
        this._params = params;
      }
    }
  }

  /**
   * Dispatches both native SpawnParticles overloads (cpp:55-120) by arity,
   * since JavaScript cannot overload; scaling uses reusable value copies.
   * As in Carbon, spawning does not update the attractor's world position.
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
    const emitter = this._emitter;
    const params = this._params;
    if (this.scaledByParent)
    {
      this._ScaleParameters(arguments_.parentTransform);
      this.UpdateHash();
    }
    try
    {
      this._SpawnPoint(arguments_, position, velocity, rateModifier);
    }
    finally
    {
      this._emitter = emitter;
      this._params = params;
    }
  }

  /**
   * Scales Carbon's segment overload (cpp:88-120) with separate scratch from
   * shared spawning. The renamed entry remains available to existing callers.
   */
  @carbon.renamed("SpawnParticles")
  @impl.adapted
  SpawnParticlesSegment(arguments_, positionStart, positionEnd, velocityStart, velocityEnd, deltaTime)
  {
    this._ReadParameters();
    const emitter = this._emitter;
    const params = this._params;
    if (this.scaledByParent)
    {
      this._ScaleParameters(arguments_.parentTransform);
      this.UpdateHash();
    }
    try
    {
      this._SpawnSegment(arguments_, positionStart, positionEnd, velocityStart, velocityEnd, deltaTime);
    }
    finally
    {
      this._emitter = emitter;
      this._params = params;
    }
  }

  /**
   * Shares the repeated native scaling body between Update and both spawn
   * forms. Module scratch models C++ stack temporaries without allocating
   * per call or mutating authored fields. Emit must copy before returning.
   */
  @impl.custom
  _ScaleParameters(parentTransform)
  {
    // Carbon ignores XMMatrixDecompose failure and consumes its scale output.
    mat4.decomposeDirectX(parentTransform, DECOMPOSE_ROTATION, DECOMPOSE_TRANSLATION, DECOMPOSE_SCALE);
    const uniform = (DECOMPOSE_SCALE[0] + DECOMPOSE_SCALE[1] + DECOMPOSE_SCALE[2]) / 3;
    this._emitter = Tr2GpuSharedEmitter._copyEmitter(SCALED_EMITTER, this._emitter);
    this._params = Tr2GpuSharedEmitter._copyParams(SCALED_PARAMS, this._params);
    vec3.scale(this._params.sizes, this._params.sizes, uniform);
    this._params.gravity *= uniform;
    this._params.turbulenceAmplitude *= uniform;
    this._params.attractorStrength *= uniform;
    this._emitter.radius *= uniform;
    this._emitter.maxSpeed *= uniform;
    this._emitter.minSpeed *= uniform;
  }

  static _nextID = 0;
}

carbon.interfaceTable({ interfaces: [Tr2GpuUniqueEmitter], chainTo: Tr2GpuSharedEmitter })(Tr2GpuUniqueEmitter, { kind: "class" });
