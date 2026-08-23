import { applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { num } from '@carbonenginejs/runtime-utils/num';
import { vec2 } from '@carbonenginejs/runtime-utils/vec2';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsVectorParameter } from './CjsVectorParameter.js';

let _initProto, _initClass, _init_value, _init_extra_value, _init_usedByCurrentTechnique, _init_extra_usedByCurrentTechnique, _init_usedByCurrentEffect, _init_extra_usedByCurrentEffect, _init_name, _init_extra_name;

/**
 * Two-component float value for a named shader constant, with sRGB gamma
 * handling and optional rerouting into an external destination.
 */
let _Tr2Vector2Parameter;
class Tr2Vector2Parameter extends CjsVectorParameter {
  static {
    ({
      e: [_init_value, _init_extra_value, _init_usedByCurrentTechnique, _init_extra_usedByCurrentTechnique, _init_usedByCurrentEffect, _init_extra_usedByCurrentEffect, _init_name, _init_extra_name, _initProto],
      c: [_Tr2Vector2Parameter, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "Tr2Vector2Parameter",
      family: "shader"
    })], [[[io, io.persistOnly, type, type.vec2], 16, "value"], [[io, io.read, type, type.boolean], 16, "usedByCurrentTechnique"], [[io, io.read, type, type.boolean], 16, "usedByCurrentEffect"], [[io, io.notify, io, io.persist, type, type.string], 16, "name"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetParameterName"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetHashValue"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon returns a const reference to its own value; JavaScript cannot express that, so this copies rather than exposing internal state.")], 18, "GetValue"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetValue"], [[carbon, carbon.method, impl, impl.implemented], 18, "IsRerouted"], [[carbon, carbon.method, impl, impl.adapted], 18, "SetDestination"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetDestination"], [[carbon, carbon.method, impl, impl.adapted], 18, "RegisterBinding"], [[carbon, carbon.method, impl, impl.adapted], 18, "UnregisterBinding"], [[carbon, carbon.method, impl, impl.adapted], 18, "RebuildEffectHandles"], [[carbon, carbon.method, impl, impl.implemented], 18, "Initialize"], [[carbon, carbon.method, impl, impl.adapted], 18, "CopyValueToEffect"]], 0, void 0, CjsVectorParameter));
  }
  value = (_initProto(this), _init_value(this, vec2.fromValues(1, 1)));
  usedByCurrentTechnique = (_init_extra_value(this), _init_usedByCurrentTechnique(this, false));
  usedByCurrentEffect = (_init_extra_usedByCurrentTechnique(this), _init_usedByCurrentEffect(this, false));
  name = (_init_extra_usedByCurrentEffect(this), _init_name(this, ""));

  /** m_isSrgb - shader-annotation driven; not Blue-exposed on vec2 in Carbon. */
  isSrgb = (_init_extra_name(this), false);

  /** m_linearValue - gamma-to-linear mirror uploaded when isSrgb. */
  linearValue = vec2.fromValues(1, 1);
  #bindings = [];
  #reroutedValue = null;

  /** Blue MAP_PROPERTY "x"/"v1" - refreshes from the rerouted value on read. */
  get x() {
    this.#RefreshFromReroute();
    return this.value[0];
  }

  /**
   * Writes component 0 and marks the parameter dirty, so the next apply carries
   * the new value.
   */
  set x(component) {
    this.#setComponent(0, component);
  }

  /** Blue MAP_PROPERTY "y"/"v2". */
  get y() {
    this.#RefreshFromReroute();
    return this.value[1];
  }

  /**
   * Writes component 1 and marks the parameter dirty, so the next apply carries
   * the new value.
   */
  set y(component) {
    this.#setComponent(1, component);
  }

  /** Blue MAP_PROPERTY alias reading `x`. */
  get v1() {
    return this.x;
  }

  /** Blue MAP_PROPERTY alias writing `x`. */
  set v1(component) {
    this.x = component;
  }

  /** Blue MAP_PROPERTY alias reading `y`. */
  get v2() {
    return this.y;
  }

  /** Blue MAP_PROPERTY alias writing `y`. */
  set v2(component) {
    this.y = component;
  }

  /** The shader constant name this value binds to; empty until authored. */
  GetParameterName() {
    return this.name;
  }

  /** Content hash: authored value bytes then name. */
  GetHashValue(startingHash = CjsVectorParameter.FNV1_INITIAL) {
    return CjsVectorParameter.hashFnv1String(this.name, CjsVectorParameter.hashFnv1Floats(this.value, startingHash));
  }

  // Carbon returns `const Vector2&` - a reference the compiler forbids writing
  // through (Tr2Vector2Parameter.cpp). JavaScript has no const reference,
  // so returning this.value would hand a caller a live handle on the
  // parameter's own state, and a stray write would change the parameter
  // without marking it dirty or reaching the reroute destination. The caller
  // gets a copy: their own buffer when they supply one, a fresh one otherwise.

  /**
   * Refreshes from the reroute destination when one is set, then copies the
   * components into `out`, allocating only when the caller supplies nothing.
   */
  GetValue(out = vec2.create()) {
    this.#RefreshFromReroute();
    return CjsVectorParameter.copyNumberArray(out, this.value, 2);
  }

  /** Pulls the reroute destination into the stored value, without copying it out. */
  #RefreshFromReroute() {
    if (this.#reroutedValue) {
      CjsVectorParameter.readVectorDestination(this.#reroutedValue, this.value, 2);
    }
    return this.value;
  }

  /**
   * Copies two components in, refreshes the linear mirror and writes through to
   * the reroute destination when one is set.
   */
  SetValue(value) {
    CjsVectorParameter.copyNumberArray(this.value, value, 2);
    this.#updateLinearValue();
    if (this.#reroutedValue) {
      CjsVectorParameter.writeVectorDestination(this.#reroutedValue, this.value, 2);
    }
  }

  /**
   * Whether reads and writes go through an external destination; an sRGB
   * constant is never rerouted, because its value must be gamma-converted before
   * upload.
   */
  IsRerouted() {
    return !this.isSrgb && this.#reroutedValue !== null;
  }

  /**
   * Points the parameter at an external destination and seeds it with the current value; a target smaller than 8 bytes, not writable as two components, or belonging to an sRGB constant clears the reroute instead. Registered bindings are notified of the effective destination either way.
   * @param size destination capacity in bytes, not components
   */
  SetDestination(dest, size = 8) {
    if (size >= 8 && !this.isSrgb && CjsVectorParameter.isVectorDestination(dest, 2)) {
      this.#reroutedValue = dest;
      CjsVectorParameter.writeVectorDestination(dest, this.value, 2);
    } else {
      this.#reroutedValue = null;
      this.#updateLinearValue();
    }
    CjsVectorParameter.notifyBindings(this.#bindings, this.GetDestination().dest);
  }

  /**
   * The array an upload should read - the reroute target when set, otherwise the
   * parameter's own value - paired with its 8-byte size. The array is borrowed,
   * not copied.
   */
  GetDestination() {
    return {
      dest: this.#reroutedValue ?? this.value,
      size: 8
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
   * Re-resolves usage and the sRGB flag from the shader's reflected constant,
   * dropping the reroute when the shader is gone or the constant turns out to be
   * sRGB. Reads reflection metadata only; no GPU handle is bound.
   */
  RebuildEffectHandles(effectRes) {
    this.isSrgb = false;
    if (!effectRes && this.#reroutedValue) {
      this.SetDestination(null, 0);
    }
    const constant = this.name ? CjsVectorParameter.getEffectConstant(effectRes, this.name) : null;
    const used = !!constant;
    this.usedByCurrentEffect = used;
    this.usedByCurrentTechnique = used;
    this.isSrgb = CjsVectorParameter.getConstantIsSrgb(constant);
    if (this.isSrgb) {
      this.SetDestination(null, 0);
    }
    this.#updateLinearValue();
  }

  /**
   * Seeds an existing reroute destination with the current value and refreshes
   * the linear mirror; always returns true.
   */
  Initialize() {
    if (this.#reroutedValue) {
      CjsVectorParameter.writeVectorDestination(this.#reroutedValue, this.value, 2);
    }
    this.#updateLinearValue();
    return true;
  }

  /**
   * Writes the two components an upload should use into the caller's
   * destination: the authored value while rerouted, otherwise the
   * gamma-converted linear mirror for an sRGB constant.
   */
  CopyValueToEffect(_inputType, out) {
    if (this.#reroutedValue) {
      CjsVectorParameter.writeVectorDestination(out, this.value, 2);
      return;
    }
    CjsVectorParameter.writeVectorDestination(out, this.isSrgb ? this.linearValue : this.value, 2);
  }

  /**
   * Refreshes the linear mirror: a plain copy when not sRGB, otherwise
   * gamma-to-linear on both components.
   */
  #updateLinearValue() {
    if (!this.isSrgb) {
      CjsVectorParameter.copyNumberArray(this.linearValue, this.value, 2);
      return;
    }
    this.linearValue[0] = num.gammaToLinear(this.value[0]);
    this.linearValue[1] = num.gammaToLinear(this.value[1]);
  }

  /**
   * Assigns one component in place and re-runs SetValue so the linear mirror and
   * any reroute stay in sync.
   */
  #setComponent(index, component) {
    this.value[index] = Number(component);
    this.SetValue(this.value);
  }

  /** JS convenience: raw values this parameter class claims for map-form inference. */
  static isValue(value) {
    return CjsVectorParameter.isNumberArrayValue(value, 2);
  }
  static {
    _initClass();
  }
}

export { _Tr2Vector2Parameter as Tr2Vector2Parameter };
//# sourceMappingURL=Tr2Vector2Parameter.js.map
