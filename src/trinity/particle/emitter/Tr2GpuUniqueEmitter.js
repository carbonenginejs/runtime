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
   * shared emission (cpp:18-53). Struct copies replace C++ value assignment;
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
   * Applies parent scaling to either native spawn overload (cpp:55-120).
   * As in Carbon, spawning does not update the attractor's world position.
   * The argument list is bounded by the two native forms (four or six).
   */
  @carbon.method
  @impl.adapted
  SpawnParticles(...args)
  {
    this._ReadParameters();
    const emitter = this._emitter;
    const params = this._params;
    if (this.scaledByParent)
    {
      this._ScaleParameters(args[0].parentTransform);
      this.UpdateHash();
    }
    try
    {
      this._Spawn(...args);
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
   * Shares the repeated native scaling body between Update and both spawn
   * forms. Copies model C++ stack temporaries without mutating authored fields.
   */
  @impl.custom
  _ScaleParameters(parentTransform)
  {
    // Carbon ignores XMMatrixDecompose failure and consumes its scale output.
    mat4.decomposeDirectX(parentTransform, DECOMPOSE_ROTATION, DECOMPOSE_TRANSLATION, DECOMPOSE_SCALE);
    const uniform = (DECOMPOSE_SCALE[0] + DECOMPOSE_SCALE[1] + DECOMPOSE_SCALE[2]) / 3;
    this._emitter = structuredClone(this._emitter);
    this._params = structuredClone(this._params);
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
