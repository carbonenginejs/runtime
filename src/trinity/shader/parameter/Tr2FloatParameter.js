import { exposure as be } from "#be";
// Source: trinity/trinity/Shader/Parameter/Tr2FloatParameter.h
// Source: trinity/trinity/Shader/Parameter/Tr2FloatParameter.cpp
import { IInitialize } from "#blue";
import { ITriEffectParameter } from "./ITriEffectParameter.js";
import { ITriReroutable } from "../../core/ITriReroutable.js";
import { type, blue } from "#schema";
import { FNV1_INITIAL, hashFnv1Floats, hashFnv1String } from "#utils/hash";


/**
 * Single float value for a named shader constant, with optional rerouting into
 * an external scalar destination.
 */
@be.define("Tr2FloatParameter")
@be.inherit(ITriReroutable, IInitialize)
@be.mapInterface(ITriEffectParameter)
@be.mapInterface(ITriReroutable)
@be.mapInterface(IInitialize)
export class Tr2FloatParameter extends ITriEffectParameter
{
  /** m_value: Carbon's float. A one-element typed array so GetDestination can hand out its address (&m_value). */
  #valueRef = new Float32Array([ 1 ]);

  /**
   * m_value [PERSISTONLY]: the persisted row reads and writes the scalar in `#valueRef[0]`; `value` is the property over GetValue / SetValue.
   *
   * @implemented
   */
  @be.mapAttribute(be.PERSISTONLY, "value")
  @type.float32
  get _value()
  {
    return this.#valueRef[0];
  }

  /** @implemented */
  set _value(value)
  {
    this.#valueRef[0] = Number(value);
  }

  @be.mapAttribute(be.READWRITE | be.NOTIFY | be.PERSIST)


  @type.string
  name = "";

  @be.mapAttribute(be.READ)
  @type.boolean
  usedByCurrentEffect = false;

  #bindings = [];
  #reroutedValue = null;

  /**
   * The shader constant name this value binds to; empty until authored.
   *
   * @implemented
   */

  GetParameterName()
  {
    return this.name;
  }

  /**
   * Content hash: value bytes then name (Carbon hashes the interned name pointer).
   *
   * @adapted
   */

  GetHashValue(startingHash = FNV1_INITIAL)
  {
    return hashFnv1String(this.name, hashFnv1Floats(this.#valueRef, startingHash));
  }

  /**
   * Reads back through the reroute destination when one is set, so the result
   * reflects writes made by whoever owns that destination.
   *
   * @implemented
   */

  GetValue()
  {
    if (this.#reroutedValue)
    {
      this.#valueRef[0] = this.#reroutedValue[0];
    }
    return this.#valueRef[0];
  }

  /**
   * Coerces to a number and writes through to the reroute destination when one is set.
   *
   * @implemented
   */

  SetValue(value)
  {
    this.#valueRef[0] = Number(value);
    if (this.#reroutedValue)
    {
      this.#reroutedValue[0] = this.#valueRef[0];
    }
  }

  /**
   * value (MAP_PROPERTY): Carbon's property over GetValue/SetValue, which the macro calls.
   * Carbon: MAP_PROPERTY (trinity/trinity/Shader/Parameter/Tr2FloatParameter_Blue.cpp:21).
   *
   * @implemented
   */
  @be.mapProperty()
  get value()
  {
    return this.GetValue();
  }

  /** @implemented */
  set value(value)
  {
    this.SetValue(value);
  }

  /**
   * Whether reads and writes currently go through an external destination.
   *
   * @implemented
   */

  IsRerouted()
  {
    return this.#reroutedValue !== null;
  }

  /**
   * Points the parameter at an external float view and seeds it with the current value; a target under 4 bytes clears the reroute instead. Bindings are notified of the effective destination either way.
   *
   * @adapted
   * @param size destination capacity in bytes
   */

  SetDestination(dest, size = 4)
  {
    if (size >= 4)
    {
      this.#reroutedValue = dest;
      this.#reroutedValue[0] = this.#valueRef[0];
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
   * The float view an upload should read - the reroute target, or the parameter's
   * own storage (Carbon's &m_value) - with its 4-byte size.
   *
   * @adapted
   */

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
   *
   * @adapted
   */

  RegisterBinding(binding)
  {
    // Carbon push_back (Tr2FloatParameter.cpp:108).
    this.#bindings.push(binding);
  }

  /**
   * Stops notifying a binding; unknown bindings are ignored.
   *
   * @adapted
   */

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
   *
   * @adapted
   */

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
   * Syncs any reroute destination with the current value; always returns true.
   *
   * @implemented
   */

  Initialize()
  {
    if (this.#reroutedValue)
    {
      this.#reroutedValue[0] = this.#valueRef[0];
    }
    return true;
  }

  /**
   * Writes the reroute destination's value, or the parameter's own, into the caller's float view
   * (Tr2FloatParameter.cpp:35-46).
   * Carbon declaration: Tr2FloatParameter::CopyValueToEffect (trinity/trinity/Shader/Parameter/Tr2FloatParameter.h:31).
   *
   * @adapted
   */
  CopyValueToEffect(_inputType, out)
  {
    out[0] = (this.#reroutedValue ?? this.#valueRef)[0];
  }

  /** JS convenience: raw values this parameter class claims for map-form inference. */
  static isValue(value)
  {
    return typeof value === "number";
  }

}

// Exact identities from Tr2FloatParameter_Blue.cpp; no exposure chain.
