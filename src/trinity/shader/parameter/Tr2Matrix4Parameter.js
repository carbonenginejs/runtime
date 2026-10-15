// Source: trinity/trinity/Shader/Parameter/Tr2Matrix4Parameter.h
// Source: trinity/trinity/Shader/Parameter/Tr2Matrix4Parameter.cpp
import { ITriEffectParameter } from "./ITriEffectParameter.js";
import { ITriReroutable } from "../../core/ITriReroutable.js";
import { mat4 } from "#math/mat4";
import { meta, type, blue } from "#schema";
import { CjsVectorParameter } from "./CjsVectorParameter.js";


/**
 * 4x4 matrix value for a named shader constant, with optional rerouting into an
 * external 64-byte destination.
 */
@blue.define("Tr2Matrix4Parameter")
@blue.inherit(ITriReroutable)
@blue.interface(ITriEffectParameter, ITriReroutable)
export class Tr2Matrix4Parameter extends CjsVectorParameter
{
  @blue.readwrite
  @blue.persistOnly
  @type.mat4
  value = mat4.create();

  @blue.read
  @type.boolean
  usedByCurrentTechnique = false;

  @blue.read
  @type.boolean
  usedByCurrentEffect = false;

  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.string
  name = "";

  #bindings = [];

  #reroutedValue = null;

  /** The shader constant name this matrix binds to; empty until authored. */
  @blue.method
  @meta.implemented
  GetParameterName()
  {
    return this.name;
  }

  /** Content hash: matrix bytes then name. */
  @blue.method
  @meta.adapted
  GetHashValue(startingHash = CjsVectorParameter.FNV1_INITIAL)
  {
    return CjsVectorParameter.hashFnv1String(this.name, CjsVectorParameter.hashFnv1Floats(this.value, startingHash));
  }

  /**
   * Refreshes from the reroute destination when one is set, then copies 16 components out.
   * @param out defaults to a freshly allocated matrix the caller owns
   */
  @blue.method
  @meta.implemented
  GetValue(out = mat4.create())
  {
    if (this.#reroutedValue)
    {
      CjsVectorParameter.readVectorDestination(this.#reroutedValue, this.value, 16);
    }
    return CjsVectorParameter.copyNumberArray(out, this.value, 16);
  }

  /**
   * Copies 16 components in and writes through to the reroute destination when
   * one is set.
   */
  @blue.method
  @meta.implemented
  SetValue(value)
  {
    CjsVectorParameter.copyNumberArray(this.value, value, 16);
    if (this.#reroutedValue)
    {
      CjsVectorParameter.writeVectorDestination(this.#reroutedValue, this.value, 16);
    }
  }

  /** Whether reads and writes currently go through an external destination. */
  @blue.method
  @meta.implemented
  IsRerouted()
  {
    return this.#reroutedValue !== null;
  }

  /**
   * Points the parameter at an external destination and seeds it with the current matrix; a target under 64 bytes or not writable as 16 components clears the reroute instead. Bindings are notified of the effective destination either way.
   * @param size destination capacity in bytes, not components
   */
  @blue.method
  @meta.adapted
  SetDestination(dest, size = 64)
  {
    if (size >= 64 && CjsVectorParameter.isVectorDestination(dest, 16))
    {
      this.#reroutedValue = dest;
      CjsVectorParameter.writeVectorDestination(dest, this.value, 16);
    }
    else
    {
      this.#reroutedValue = null;
    }
    CjsVectorParameter.notifyBindings(this.#bindings, this.GetDestination().dest);
  }

  /**
   * The array an upload should read - the reroute target when set, otherwise the
   * parameter's own matrix - paired with its 64-byte size. The array is
   * borrowed, not copied.
   */
  @blue.method
  @meta.adapted
  GetDestination()
  {
    return {
      dest: this.#reroutedValue ?? this.value,
      size: 64
    };
  }

  /**
   * Adds a binding to be notified whenever the destination is repointed;
   * duplicates are ignored.
   */
  @blue.method
  @meta.adapted
  RegisterBinding(binding)
  {
    CjsVectorParameter.registerBinding(this.#bindings, binding);
  }

  /** Stops notifying a binding; unknown bindings are ignored. */
  @blue.method
  @meta.adapted
  UnregisterBinding(binding)
  {
    CjsVectorParameter.unregisterBinding(this.#bindings, binding);
  }

  /**
   * Records whether the shader reflects a constant of this name and drops a
   * stale reroute when the shader is gone; reflection metadata only, no GPU
   * handle.
   */
  @blue.method
  @meta.adapted
  RebuildEffectHandles(effectRes)
  {
    if (!effectRes && this.#reroutedValue)
    {
      this.SetDestination(null, 0);
    }
    const used = !!this.name && CjsVectorParameter.hasEffectConstant(effectRes, this.name);
    this.usedByCurrentEffect = used;
    this.usedByCurrentTechnique = used;
  }

  /**
   * Seeds an existing reroute destination with the current matrix; always
   * returns true.
   */
  @blue.method
  @meta.implemented
  Initialize()
  {
    if (this.#reroutedValue)
    {
      CjsVectorParameter.writeVectorDestination(this.#reroutedValue, this.value, 16);
    }
    return true;
  }

  /**
   * Writes the 16 components an upload should use into the caller's destination,
   * reading back through the reroute first; the stored element order is copied
   * as-is, with no transpose.
   */
  @blue.method
  @meta.adapted
  CopyValueToEffect(_inputType, out)
  {
    CjsVectorParameter.writeVectorDestination(out, this.GetValue(), 16);
  }

  /** JS convenience: raw values this parameter class claims for map-form inference. */
  static isValue(value)
  {
    return CjsVectorParameter.isNumberArrayValue(value, 16);
  }

}

// Exact identities from Tr2Matrix4Parameter_Blue.cpp; no exposure chain.
