import { exposure as be } from "#be";
// Source: trinity/trinity/Shader/Parameter/Tr2FloatParameter.h
// Source: trinity/trinity/Shader/Parameter/Tr2FloatParameter.cpp
import { IInitialize } from "#blue";
import { ITriEffectParameter } from "./ITriEffectParameter.js";
import { ITriReroutable } from "../../core/ITriReroutable.js";
import { meta, type, blue } from "#schema";
import { CjsParameter } from "./CjsParameter.js";


/**
 * Single float value for a named shader constant, with optional rerouting into
 * an external scalar destination.
 */
@be.define("Tr2FloatParameter")
@blue.inherit(ITriReroutable, IInitialize)
@be.mapInterface(ITriEffectParameter)
@be.mapInterface(ITriReroutable)
@be.mapInterface(IInitialize)
export class Tr2FloatParameter extends CjsParameter
{
  @be.mapAttribute(be.PERSISTONLY)

  @type.float32
  value = 1;

  @be.mapAttribute(be.READWRITE | be.NOTIFY | be.PERSIST)


  @type.string
  name = "";

  @be.mapAttribute(be.READ)
  @type.boolean
  usedByCurrentEffect = false;

  #bindings = [];
  #reroutedValue = null;
  #valueRef = {  value: this.value };

  /** The shader constant name this value binds to; empty until authored. */
  @blue.method
  @meta.implemented
  GetParameterName()
  {
    return this.name;
  }

  /** Content hash: value bytes then name (Carbon hashes the interned name pointer). */
  @blue.method
  @meta.adapted
  GetHashValue(startingHash = CjsParameter.FNV1_INITIAL)
  {
    return CjsParameter.hashFnv1String(this.name, CjsParameter.hashFnv1Floats([this.value], startingHash));
  }

  /**
   * Reads back through the reroute destination when one is set, so the result
   * reflects writes made by whoever owns that destination.
   */
  @blue.method
  @meta.implemented
  GetValue()
  {
    if (this.#reroutedValue)
    {
      this.value = CjsParameter.readScalarDestination(this.#reroutedValue, this.value);
      this.#valueRef.value = this.value;
    }
    return this.value;
  }

  /**
   * Coerces to a number, refreshes the boxed reference GetDestination hands out,
   * and writes through to the reroute destination when one is set.
   */
  @blue.method
  @meta.implemented
  SetValue(value)
  {
    this.value = Number(value);
    this.#valueRef.value = this.value;
    if (this.#reroutedValue)
    {
      CjsParameter.writeScalarDestination(this.#reroutedValue, this.value);
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
   * Points the parameter at an external scalar destination and seeds it with the current value; a target under 4 bytes or of an unusable shape clears the reroute instead. Bindings are notified of the effective destination either way.
   * @param size destination capacity in bytes
   */
  @blue.method
  @meta.adapted
  SetDestination(dest, size = 4)
  {
    if (size >= 4 && CjsParameter.isScalarDestination(dest))
    {
      this.#reroutedValue = dest;
      CjsParameter.writeScalarDestination(dest, this.value);
    }
    else
    {
      this.#reroutedValue = null;
    }
    CjsParameter.notifyBindings(this.#bindings, this.GetDestination().dest);
  }

  /**
   * The scalar an upload should read - the reroute target, or the parameter's
   * own boxed `{ value }` holder - with its 4-byte size. The boxed holder is a
   * stable object that survives SetValue calls.
   */
  @blue.method
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
  @blue.method
  @meta.adapted
  RegisterBinding(binding)
  {
    CjsParameter.registerBinding(this.#bindings, binding);
  }

  /** Stops notifying a binding; unknown bindings are ignored. */
  @blue.method
  @meta.adapted
  UnregisterBinding(binding)
  {
    CjsParameter.unregisterBinding(this.#bindings, binding);
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
    this.usedByCurrentEffect = !!this.name && CjsParameter.hasEffectConstant(effectRes, this.name);
  }

  /**
   * Syncs the boxed reference and any reroute destination with the current
   * value; always returns true.
   */
  @blue.method
  @meta.implemented
  Initialize()
  {
    this.#valueRef.value = this.value;
    if (this.#reroutedValue)
    {
      CjsParameter.writeScalarDestination(this.#reroutedValue, this.value);
    }
    return true;
  }

  /**
   * Writes the current value - read back through the reroute first when one is
   * active - into the caller's destination.
   */
  @blue.method
  @meta.adapted
  CopyValueToEffect(_inputType, out)
  {
    CjsParameter.writeScalarDestination(out, this.GetValue());
  }

  /** JS convenience: raw values this parameter class claims for map-form inference. */
  static isValue(value)
  {
    return typeof value === "number";
  }

}

// Exact identities from Tr2FloatParameter_Blue.cpp; no exposure chain.
