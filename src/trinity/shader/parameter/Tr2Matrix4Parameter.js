import { exposure as be } from "#be";
// Source: trinity/trinity/Shader/Parameter/Tr2Matrix4Parameter.h
// Source: trinity/trinity/Shader/Parameter/Tr2Matrix4Parameter.cpp
import { ITriEffectParameter } from "./ITriEffectParameter.js";
import { ITriReroutable } from "../../core/ITriReroutable.js";
import { mat4 } from "#math/mat4";
import { meta, type, blue } from "#schema";
import { FNV1_INITIAL, hashFnv1Floats, hashFnv1String } from "#utils/hash";
import { copyNumberArray, isNumberArrayValue, isVectorDestination, readVectorDestination, writeVectorDestination } from "./parameterDestination.js";


/**
 * 4x4 matrix value for a named shader constant, with optional rerouting into an
 * external 64-byte destination.
 */
@be.define("Tr2Matrix4Parameter")
@blue.inherit(ITriReroutable)
@be.mapInterface(ITriEffectParameter)
@be.mapInterface(ITriReroutable)
export class Tr2Matrix4Parameter extends ITriEffectParameter
{
  @be.mapAttribute(be.PERSISTONLY)

  @type.mat4
  value = mat4.create();

  @be.mapAttribute(be.READ)
  @type.boolean
  usedByCurrentTechnique = false;

  @be.mapAttribute(be.READ)
  @type.boolean
  usedByCurrentEffect = false;

  @be.mapAttribute(be.READWRITE | be.NOTIFY | be.PERSIST)


  @type.string
  name = "";

  #bindings = [];

  #reroutedValue = null;

  /** The shader constant name this matrix binds to; empty until authored. */

  @meta.implemented
  GetParameterName()
  {
    return this.name;
  }

  /** Content hash: matrix bytes then name. */

  @meta.adapted
  GetHashValue(startingHash = FNV1_INITIAL)
  {
    return hashFnv1String(this.name, hashFnv1Floats(this.value, startingHash));
  }

  /**
   * Refreshes from the reroute destination when one is set, then copies 16 components out.
   * @param out defaults to a freshly allocated matrix the caller owns
   */

  @meta.implemented
  GetValue(out = mat4.create())
  {
    if (this.#reroutedValue)
    {
      readVectorDestination(this.#reroutedValue, this.value, 16);
    }
    return copyNumberArray(out, this.value, 16);
  }

  /**
   * Copies 16 components in and writes through to the reroute destination when
   * one is set.
   */

  @meta.implemented
  SetValue(value)
  {
    copyNumberArray(this.value, value, 16);
    if (this.#reroutedValue)
    {
      writeVectorDestination(this.#reroutedValue, this.value, 16);
    }
  }

  /** Whether reads and writes currently go through an external destination. */

  @meta.implemented
  IsRerouted()
  {
    return this.#reroutedValue !== null;
  }

  /**
   * Points the parameter at an external destination and seeds it with the current matrix; a target under 64 bytes or not writable as 16 components clears the reroute instead. Bindings are notified of the effective destination either way.
   * @param size destination capacity in bytes, not components
   */

  @meta.adapted
  SetDestination(dest, size = 64)
  {
    if (size >= 64 && isVectorDestination(dest, 16))
    {
      this.#reroutedValue = dest;
      writeVectorDestination(dest, this.value, 16);
    }
    else
    {
      this.#reroutedValue = null;
    }
    // Carbon notifies each binding of the effective destination (Tr2Matrix4Parameter.cpp:68).
    for (const binding of this.#bindings)
    {
      binding.RerouteDestination(this.GetDestination().dest);
    }
  }

  /**
   * The array an upload should read - the reroute target when set, otherwise the
   * parameter's own matrix - paired with its 64-byte size. The array is
   * borrowed, not copied.
   */

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

  @meta.adapted
  RegisterBinding(binding)
  {
    // Carbon push_back (Tr2Matrix4Parameter.cpp:105).
    this.#bindings.push(binding);
  }

  /** Stops notifying a binding; unknown bindings are ignored. */

  @meta.adapted
  UnregisterBinding(binding)
  {
    // Carbon erases the first match (Tr2Matrix4Parameter.cpp:114).
    const index = this.#bindings.indexOf(binding);
    if (index >= 0)
    {
      this.#bindings.splice(index, 1);
    }
  }

  /**
   * Records whether the shader reflects a constant of this name and drops a
   * stale reroute when the shader is gone; reflection metadata only, no GPU
   * handle.
   */

  @meta.adapted
  RebuildEffectHandles(effectRes)
  {
    if (!effectRes && this.#reroutedValue)
    {
      this.SetDestination(null, 0);
    }
    // Tr2Matrix4Parameter.cpp:136-150
    const used = !!this.name && !!effectRes && !!effectRes.GetConstant(this.name);
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
      writeVectorDestination(this.#reroutedValue, this.value, 16);
    }
    return true;
  }

  /**
   * Writes the 16 components an upload should use into the caller's destination,
   * reading back through the reroute first; the stored element order is copied
   * as-is, with no transpose.
   * Carbon declaration: Tr2Matrix4Parameter::CopyValueToEffect (trinity/trinity/Shader/Parameter/Tr2Matrix4Parameter.h:45).
   */
  @meta.adapted
  CopyValueToEffect(_inputType, out)
  {
    writeVectorDestination(out, this.GetValue(), 16);
  }

  /** JS convenience: raw values this parameter class claims for map-form inference. */
  static isValue(value)
  {
    return isNumberArrayValue(value, 16);
  }

}

// Exact identities from Tr2Matrix4Parameter_Blue.cpp; no exposure chain.
