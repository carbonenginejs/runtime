import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsParameter } from './CjsParameter.js';

let _initProto, _initClass, _init_value, _init_extra_value, _init_name, _init_extra_name, _init_usedByCurrentEffect, _init_extra_usedByCurrentEffect;

/**
 * Single float value for a named shader constant, with optional rerouting into
 * an external scalar destination.
 */
let _Tr2FloatParameter;
class Tr2FloatParameter extends CjsParameter {
  static {
    ({
      e: [_init_value, _init_extra_value, _init_name, _init_extra_name, _init_usedByCurrentEffect, _init_extra_usedByCurrentEffect, _initProto],
      c: [_Tr2FloatParameter, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2FloatParameter",
      family: "shader"
    })], [[[io, io.persistOnly, type, type.float32], 16, "value"], [[io, io.notify, io, io.persist, type, type.string], 16, "name"], [[io, io.read, type, type.boolean], 16, "usedByCurrentEffect"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetParameterName"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetHashValue"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetValue"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetValue"], [[carbon, carbon.method, impl, impl.implemented], 18, "IsRerouted"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetDestination"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetDestination"], [[carbon, carbon.method, impl, impl.adapted], 18, "RegisterBinding"], [[carbon, carbon.method, impl, impl.adapted], 18, "UnregisterBinding"], [[carbon, carbon.method, impl, impl.adapted], 18, "RebuildEffectHandles"], [[carbon, carbon.method, impl, impl.implemented], 18, "Initialize"], [[carbon, carbon.method, impl, impl.adapted], 18, "CopyValueToEffect"]], 0, void 0, CjsParameter));
  }
  value = (_initProto(this), _init_value(this, 1));
  name = (_init_extra_value(this), _init_name(this, ""));
  usedByCurrentEffect = (_init_extra_name(this), _init_usedByCurrentEffect(this, false));
  #bindings = (_init_extra_usedByCurrentEffect(this), []);
  #reroutedValue = null;
  #valueRef = {
    value: this.value
  };

  /** The shader constant name this value binds to; empty until authored. */
  GetParameterName() {
    return this.name;
  }

  /** Content hash: value bytes then name (Carbon hashes the interned name pointer). */
  GetHashValue(startingHash = CjsParameter.FNV1_INITIAL) {
    return CjsParameter.hashFnv1String(this.name, CjsParameter.hashFnv1Floats([this.value], startingHash));
  }

  /**
   * Reads back through the reroute destination when one is set, so the result
   * reflects writes made by whoever owns that destination.
   */
  GetValue() {
    if (this.#reroutedValue) {
      this.value = CjsParameter.readScalarDestination(this.#reroutedValue, this.value);
      this.#valueRef.value = this.value;
    }
    return this.value;
  }

  /**
   * Coerces to a number, refreshes the boxed reference GetDestination hands out,
   * and writes through to the reroute destination when one is set.
   */
  SetValue(value) {
    this.value = Number(value);
    this.#valueRef.value = this.value;
    if (this.#reroutedValue) {
      CjsParameter.writeScalarDestination(this.#reroutedValue, this.value);
    }
  }

  /** Whether reads and writes currently go through an external destination. */
  IsRerouted() {
    return this.#reroutedValue !== null;
  }

  /**
   * Points the parameter at an external scalar destination and seeds it with the current value; a target under 4 bytes or of an unusable shape clears the reroute instead. Bindings are notified of the effective destination either way.
   * @param size destination capacity in bytes
   */
  SetDestination(dest, size = 4) {
    if (size >= 4 && CjsParameter.isScalarDestination(dest)) {
      this.#reroutedValue = dest;
      CjsParameter.writeScalarDestination(dest, this.value);
    } else {
      this.#reroutedValue = null;
    }
    CjsParameter.notifyBindings(this.#bindings, this.GetDestination().dest);
  }

  /**
   * The scalar an upload should read - the reroute target, or the parameter's
   * own boxed `{ value }` holder - with its 4-byte size. The boxed holder is a
   * stable object that survives SetValue calls.
   */
  GetDestination() {
    return {
      dest: this.#reroutedValue ?? this.#valueRef,
      size: 4
    };
  }

  /**
   * Adds a binding to be notified whenever the destination is repointed;
   * duplicates are ignored.
   */
  RegisterBinding(binding) {
    CjsParameter.registerBinding(this.#bindings, binding);
  }

  /** Stops notifying a binding; unknown bindings are ignored. */
  UnregisterBinding(binding) {
    CjsParameter.unregisterBinding(this.#bindings, binding);
  }

  /**
   * Records whether the shader reflects a constant of this name and drops a
   * stale reroute when the shader is gone; reflection metadata only, no GPU
   * handle.
   */
  RebuildEffectHandles(effectRes) {
    if (!effectRes && this.#reroutedValue) {
      this.SetDestination(null, 0);
    }
    this.usedByCurrentEffect = !!this.name && CjsParameter.hasEffectConstant(effectRes, this.name);
  }

  /**
   * Syncs the boxed reference and any reroute destination with the current
   * value; always returns true.
   */
  Initialize() {
    this.#valueRef.value = this.value;
    if (this.#reroutedValue) {
      CjsParameter.writeScalarDestination(this.#reroutedValue, this.value);
    }
    return true;
  }

  /**
   * Writes the current value - read back through the reroute first when one is
   * active - into the caller's destination.
   */
  CopyValueToEffect(_inputType, out) {
    CjsParameter.writeScalarDestination(out, this.GetValue());
  }

  /** JS convenience: raw values this parameter class claims for map-form inference. */
  static isValue(value) {
    return typeof value === "number";
  }
  static {
    _initClass();
  }
}

export { _Tr2FloatParameter as Tr2FloatParameter };
//# sourceMappingURL=Tr2FloatParameter.js.map
