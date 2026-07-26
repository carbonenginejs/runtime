import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsVectorParameter } from './CjsVectorParameter.js';

let _initProto, _initClass, _init_value, _init_extra_value, _init_usedByCurrentTechnique, _init_extra_usedByCurrentTechnique, _init_usedByCurrentEffect, _init_extra_usedByCurrentEffect, _init_name, _init_extra_name;

/**
 * 4x4 matrix value for a named shader constant, with optional rerouting into an
 * external 64-byte destination.
 */
let _Tr2Matrix4Parameter;
class Tr2Matrix4Parameter extends CjsVectorParameter {
  static {
    ({
      e: [_init_value, _init_extra_value, _init_usedByCurrentTechnique, _init_extra_usedByCurrentTechnique, _init_usedByCurrentEffect, _init_extra_usedByCurrentEffect, _init_name, _init_extra_name, _initProto],
      c: [_Tr2Matrix4Parameter, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2Matrix4Parameter",
      family: "shader"
    })], [[[io, io.persistOnly, type, type.mat4], 16, "value"], [[io, io.read, type, type.boolean], 16, "usedByCurrentTechnique"], [[io, io.read, type, type.boolean], 16, "usedByCurrentEffect"], [[io, io.notify, io, io.persist, type, type.string], 16, "name"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetParameterName"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetHashValue"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetValue"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetValue"], [[carbon, carbon.method, impl, impl.implemented], 18, "IsRerouted"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetDestination"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetDestination"], [[carbon, carbon.method, impl, impl.adapted], 18, "RegisterBinding"], [[carbon, carbon.method, impl, impl.adapted], 18, "UnregisterBinding"], [[carbon, carbon.method, impl, impl.adapted], 18, "RebuildEffectHandles"], [[carbon, carbon.method, impl, impl.implemented], 18, "Initialize"], [[carbon, carbon.method, impl, impl.adapted], 18, "CopyValueToEffect"]], 0, void 0, CjsVectorParameter));
  }
  value = (_initProto(this), _init_value(this, mat4.create()));
  usedByCurrentTechnique = (_init_extra_value(this), _init_usedByCurrentTechnique(this, false));
  usedByCurrentEffect = (_init_extra_usedByCurrentTechnique(this), _init_usedByCurrentEffect(this, false));
  name = (_init_extra_usedByCurrentEffect(this), _init_name(this, ""));
  #bindings = (_init_extra_name(this), []);
  #reroutedValue = null;

  /** The shader constant name this matrix binds to; empty until authored. */
  GetParameterName() {
    return this.name;
  }

  /** Content hash: matrix bytes then name. */
  GetHashValue(startingHash = CjsVectorParameter.FNV1_INITIAL) {
    return CjsVectorParameter.hashFnv1String(this.name, CjsVectorParameter.hashFnv1Floats(this.value, startingHash));
  }

  /**
   * Refreshes from the reroute destination when one is set, then copies 16 components out.
   * @param out defaults to a freshly allocated matrix the caller owns
   */
  GetValue(out = mat4.create()) {
    if (this.#reroutedValue) {
      CjsVectorParameter.readVectorDestination(this.#reroutedValue, this.value, 16);
    }
    return CjsVectorParameter.copyNumberArray(out, this.value, 16);
  }

  /**
   * Copies 16 components in and writes through to the reroute destination when
   * one is set.
   */
  SetValue(value) {
    CjsVectorParameter.copyNumberArray(this.value, value, 16);
    if (this.#reroutedValue) {
      CjsVectorParameter.writeVectorDestination(this.#reroutedValue, this.value, 16);
    }
  }

  /** Whether reads and writes currently go through an external destination. */
  IsRerouted() {
    return this.#reroutedValue !== null;
  }

  /**
   * Points the parameter at an external destination and seeds it with the current matrix; a target under 64 bytes or not writable as 16 components clears the reroute instead. Bindings are notified of the effective destination either way.
   * @param size destination capacity in bytes, not components
   */
  SetDestination(dest, size = 64) {
    if (size >= 64 && CjsVectorParameter.isVectorDestination(dest, 16)) {
      this.#reroutedValue = dest;
      CjsVectorParameter.writeVectorDestination(dest, this.value, 16);
    } else {
      this.#reroutedValue = null;
    }
    CjsVectorParameter.notifyBindings(this.#bindings, this.GetDestination().dest);
  }

  /**
   * The array an upload should read - the reroute target when set, otherwise the
   * parameter's own matrix - paired with its 64-byte size. The array is
   * borrowed, not copied.
   */
  GetDestination() {
    return {
      dest: this.#reroutedValue ?? this.value,
      size: 64
    };
  }

  /**
   * Adds a binding to be notified whenever the destination is repointed;
   * duplicates are ignored.
   */
  RegisterBinding(binding) {
    CjsVectorParameter.registerBinding(this.#bindings, binding);
  }

  /** Stops notifying a binding; unknown bindings are ignored. */
  UnregisterBinding(binding) {
    CjsVectorParameter.unregisterBinding(this.#bindings, binding);
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
    const used = !!this.name && CjsVectorParameter.hasEffectConstant(effectRes, this.name);
    this.usedByCurrentEffect = used;
    this.usedByCurrentTechnique = used;
  }

  /**
   * Seeds an existing reroute destination with the current matrix; always
   * returns true.
   */
  Initialize() {
    if (this.#reroutedValue) {
      CjsVectorParameter.writeVectorDestination(this.#reroutedValue, this.value, 16);
    }
    return true;
  }

  /**
   * Writes the 16 components an upload should use into the caller's destination,
   * reading back through the reroute first; the stored element order is copied
   * as-is, with no transpose.
   */
  CopyValueToEffect(_inputType, out) {
    CjsVectorParameter.writeVectorDestination(out, this.GetValue(), 16);
  }

  /** JS convenience: raw values this parameter class claims for map-form inference. */
  static isValue(value) {
    return CjsVectorParameter.isNumberArrayValue(value, 16);
  }
  static {
    _initClass();
  }
}

export { _Tr2Matrix4Parameter as Tr2Matrix4Parameter };
//# sourceMappingURL=Tr2Matrix4Parameter.js.map
