import { exposure as be } from "#be";
// Source: trinity/trinity/Shader/Parameter/Tr2FloatParameter.h
// Source: trinity/trinity/Shader/Parameter/Tr2FloatParameter.cpp
import { IInitialize } from "#blue";
import { ITriEffectParameter } from "./ITriEffectParameter.js";
import { ITriReroutable } from "../../core/ITriReroutable.js";
import { meta, type, blue } from "#schema";
import { FNV1_INITIAL, hashFnv1Floats, hashFnv1String } from "#utils/hash";
import { isScalarDestination, readScalarDestination, writeScalarDestination } from "./parameterDestination.js";


/**
 * Single float value for a named shader constant, with optional rerouting into
 * an external scalar destination.
 */
@be.define("Tr2FloatParameter")
@blue.inherit(ITriReroutable, IInitialize)
@be.mapInterface(ITriEffectParameter)
@be.mapInterface(ITriReroutable)
@be.mapInterface(IInitialize)
export class Tr2FloatParameter extends ITriEffectParameter
{
  /** m_value [PERSISTONLY]: Carbon's backing member; `value` is the property over GetValue / SetValue. */
  @be.mapAttribute(be.PERSISTONLY, "value")
  @meta.implemented
  @type.float32
  _value = 1;

  @be.mapAttribute(be.READWRITE | be.NOTIFY | be.PERSIST)


  @type.string
  name = "";

  @be.mapAttribute(be.READ)
  @type.boolean
  usedByCurrentEffect = false;

  #bindings = [];
  #reroutedValue = null;
  #valueRef = {  value: this._value };

  /** The shader constant name this value binds to; empty until authored. */

  @meta.implemented
  GetParameterName()
  {
    return this.name;
  }

  /** Content hash: value bytes then name (Carbon hashes the interned name pointer). */

  @meta.adapted
  GetHashValue(startingHash = FNV1_INITIAL)
  {
    return hashFnv1String(this.name, hashFnv1Floats([this._value], startingHash));
  }

  /**
   * Reads back through the reroute destination when one is set, so the result
   * reflects writes made by whoever owns that destination.
   */

  @meta.implemented
  GetValue()
  {
    if (this.#reroutedValue)
    {
      this._value = readScalarDestination(this.#reroutedValue, this._value);
      this.#valueRef.value = this._value;
    }
    return this._value;
  }

  /**
   * Coerces to a number, refreshes the boxed reference GetDestination hands out,
   * and writes through to the reroute destination when one is set.
   */

  @meta.implemented
  SetValue(value)
  {
    this._value = Number(value);
    this.#valueRef.value = this._value;
    if (this.#reroutedValue)
    {
      writeScalarDestination(this.#reroutedValue, this._value);
    }
  }

  /**
   * value (MAP_PROPERTY): Carbon's property over GetValue/SetValue, which the macro calls.
   * Carbon: MAP_PROPERTY (trinity/trinity/Shader/Parameter/Tr2FloatParameter_Blue.cpp:21).
   */
  @be.mapProperty()
  @meta.implemented
  get value()
  {
    return this.GetValue();
  }

  @meta.implemented
  set value(value)
  {
    this.SetValue(value);
  }

  /** Whether reads and writes currently go through an external destination. */

  @meta.implemented
  IsRerouted()
  {
    return this.#reroutedValue !== null;
  }

  /**
   * Points the parameter at an external scalar destination and seeds it with the current value; a target under 4 bytes or of an unusable shape clears the reroute instead. Bindings are notified of the effective destination either way.
   * @param size destination capacity in bytes
   */

  @meta.adapted
  SetDestination(dest, size = 4)
  {
    if (size >= 4 && isScalarDestination(dest))
    {
      this.#reroutedValue = dest;
      writeScalarDestination(dest, this._value);
    }
    else
    {
      this.#reroutedValue = null;
    }
    // Carbon notifies each binding of the effective destination (Tr2FloatParameter.cpp:72).
    for (const binding of this.#bindings)
    {
      binding.RerouteDestination(this.GetDestination().dest);
    }
  }

  /**
   * The scalar an upload should read - the reroute target, or the parameter's
   * own boxed `{ value }` holder - with its 4-byte size. The boxed holder is a
   * stable object that survives SetValue calls.
   */

  @meta.adapted
  GetDestination()
  {
    return {
      dest: this.#reroutedValue ?? this.#valueRef,
      size: 4
    };
  }

  /**
   * Adds a binding to be notified whenever the destination is repointed;
   * duplicates are ignored.
   */

  @meta.adapted
  RegisterBinding(binding)
  {
    // Carbon push_back (Tr2FloatParameter.cpp:108).
    this.#bindings.push(binding);
  }

  /** Stops notifying a binding; unknown bindings are ignored. */

  @meta.adapted
  UnregisterBinding(binding)
  {
    // Carbon erases the first match (Tr2FloatParameter.cpp:114).
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
    // Tr2FloatParameter.cpp:130
    this.usedByCurrentEffect = !!effectRes && !!this.name && !!effectRes.GetConstant(this.name);
  }

  /**
   * Syncs the boxed reference and any reroute destination with the current
   * value; always returns true.
   */

  @meta.implemented
  Initialize()
  {
    this.#valueRef.value = this._value;
    if (this.#reroutedValue)
    {
      writeScalarDestination(this.#reroutedValue, this._value);
    }
    return true;
  }

  /**
   * Writes the current value - read back through the reroute first when one is
   * active - into the caller's destination.
   * Carbon declaration: Tr2FloatParameter::CopyValueToEffect (trinity/trinity/Shader/Parameter/Tr2FloatParameter.h:31).
   */
  @meta.adapted
  CopyValueToEffect(_inputType, out)
  {
    writeScalarDestination(out, this.GetValue());
  }

  /** JS convenience: raw values this parameter class claims for map-form inference. */
  static isValue(value)
  {
    return typeof value === "number";
  }

}

// Exact identities from Tr2FloatParameter_Blue.cpp; no exposure chain.
