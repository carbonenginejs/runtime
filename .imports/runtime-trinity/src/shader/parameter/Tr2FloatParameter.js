// Source: E:\carbonengine\trinity\trinity\Shader\Parameter\Tr2FloatParameter.h
// Source: E:\carbonengine\trinity\trinity\Shader\Parameter\Tr2FloatParameter.cpp
import { carbon, impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsParameter } from "./CjsParameter.js";


/**
 * Single float value for a named shader constant, with optional rerouting into
 * an external scalar destination.
 */
@type.define({className: "Tr2FloatParameter", family: "shader"})
export class Tr2FloatParameter extends CjsParameter
{
  @io.persistOnly
  @type.float32
  value = 1;

  @io.notify
  @io.persist
  @type.string
  name = "";

  @io.read
  @type.boolean
  usedByCurrentEffect = false;

  #bindings = [];
  #reroutedValue = null;
  #valueRef = {  value: this.value };

  /** The shader constant name this value binds to; empty until authored. */
  @carbon.method
  @impl.implemented
  GetParameterName()
  {
    return this.name;
  }

  /** Content hash: value bytes then name (Carbon hashes the interned name pointer). */
  @carbon.method
  @impl.adapted
  GetHashValue(startingHash = CjsParameter.FNV1_INITIAL)
  {
    return CjsParameter.hashFnv1String(this.name, CjsParameter.hashFnv1Floats([this.value], startingHash));
  }

  /**
   * Reads back through the reroute destination when one is set, so the result
   * reflects writes made by whoever owns that destination.
   */
  @carbon.method
  @impl.implemented
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
  @carbon.method
  @impl.implemented
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
  @carbon.method
  @impl.implemented
  IsRerouted()
  {
    return this.#reroutedValue !== null;
  }

  /**
   * Points the parameter at an external scalar destination and seeds it with the current value; a target under 4 bytes or of an unusable shape clears the reroute instead. Bindings are notified of the effective destination either way.
   * @param size destination capacity in bytes
   */
  @carbon.method
  @impl.adapted
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
  @carbon.method
  @impl.adapted
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
  @carbon.method
  @impl.adapted
  RegisterBinding(binding)
  {
    CjsParameter.registerBinding(this.#bindings, binding);
  }

  /** Stops notifying a binding; unknown bindings are ignored. */
  @carbon.method
  @impl.adapted
  UnregisterBinding(binding)
  {
    CjsParameter.unregisterBinding(this.#bindings, binding);
  }

  /**
   * Records whether the shader reflects a constant of this name and drops a
   * stale reroute when the shader is gone; reflection metadata only, no GPU
   * handle.
   */
  @carbon.method
  @impl.adapted
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
  @carbon.method
  @impl.implemented
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
  @carbon.method
  @impl.adapted
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
